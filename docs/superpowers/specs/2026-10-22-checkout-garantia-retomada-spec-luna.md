# Checkout: retomada persistente, garantia de vaga e prazo de pagamento

Data: 2026-10-22. Executor: Luna. Estado: especificação aprovada quanto às regras de produto; implementação pendente.

## 1. Ordem de execução e limites

Implementar este documento no checkout local existente, na branch `main`, preservando todas as alterações staged, unstaged e não rastreadas. Não criar branch/worktree, fazer commit/push/PR, habilitar gateway ou alterar credenciais. Primeiro levantar os pontos citados abaixo; depois executar os lotes da seção 12 em ordem. Não substituir os fluxos atuais por uma implementação paralela.

O usuário confirmou expressamente: pagamento permitido **até duas horas depois do início da reserva**. A frase anterior sobre pagar antes do início foi substituída por essa decisão. Exemplo: início 20:00, limite 22:00; às 22:00:00 já bloquear. Reserva pode ser paga às 21:00 se ainda houver capacidade no intervalo reservado. Não mover seu início para a hora do pagamento.

Escopo inclui persistência, criação, disponibilidade, concorrência, retomada por URL, contrato de impedimentos, aviso discreto de garantia e adaptação do fluxo demonstrativo. O novo botão da lista para retornar ao pagamento e os novos avisos visuais de impedimento ficam fora desta entrega; o servidor e os contratos devem estar prontos para ambos. Não transformar `Efetuar compra` em link nesta tarefa.

## 2. Evidência do projeto e pontos obrigatórios de alteração

Raiz dos caminhos de código abaixo: `next-app/`.

- `src/server/reservations/create-public-reservation.ts`: hoje os dois caminhos, manual e automático, produzem `confirmed`; o automático usa `confirmReservationAttempt`, fingerprint, revisão e replay criptografado. Preservar esses mecanismos e a autorização do proprietário.
- `src/modules/reservations/application/create-public-reservation.ts` e `application/ports.ts`: ajustar o contrato de criação para devolver `payment_pending`, sem um cast que finja `confirmed`.
- `src/modules/reservations/infrastructure/mysql-reservation-repository.ts`: `confirmWithHold`, `confirmReservationAttempt`, `insertReservation`, `assertNoConflicts` e eventos devem participar da mudança. O hold anterior do wizard deve ser consumido na mesma transação que cria a reserva pendente.
- `src/modules/reservations/infrastructure/mysql-availability-repository.ts`: consulta reservas e holds; atualizar o predicado de ocupação e manter a semântica de intervalos e combinações.
- `src/modules/reservations/domain/reservation-status.ts`: `payment_pending` já existe. Não criar outro sinônimo. Permitir a transição de criação necessária, mantendo estados terminais protegidos.
- `src/server/reservations/reservation-checkout.ts` e `infrastructure/mysql-reservation-checkout-query.ts`: contexto autenticado atual; expandir conforme seção 8.
- `src/components/reservation/v2/ReservationWizard.tsx`, `ReservationCheckout.tsx`, `CheckoutPixPanel.tsx`, `CheckoutSuccess.tsx`: hoje o resultado demo fica em React; migrar a decisão e a persistência para o servidor.
- `src/modules/payments/checkout/checkout-contract.ts`, `checkout-adapter.ts`, `demo-checkout-adapter.ts` e cliente de checkout: adaptar contratos, sem enviar PAN/CVV para a API.
- `src/modules/reservations/infrastructure/mysql-customer-reservation-query.ts` e apresentação da lista: manter `Em andamento` coerente mesmo sem registro na tabela `payments`.
- `src/modules/payments/application/process-webhook.ts`, `infrastructure/mysql-payment-repository.ts`, `server/payments/composition.ts`: documentar e proteger a fronteira real, conforme seção 10. Gateway permanece desativado.

As migrations atuais vão até `016_reconcile_reservation_hold_indexes.sql` na inspeção desta spec. Criar `017_reservation_checkout_guarantee.sql` se esse número ainda estiver livre; caso tenha sido usado, usar o próximo número, preservando o nome descritivo. Não editar migrations aplicadas.

## 3. Regras de produto, sem decisões adicionais

1. O clique em Confirmar/Concluir reserva só inicia o estado pendente quando o servidor confirma a gravação. Não mostrar garantia antes de sucesso dessa transação.
2. A mesma reserva passa a `payment_pending`, com pagamento exibido como `Em andamento`. Não criar uma segunda reserva para cada tentativa de pagamento.
3. A partir da criação aceita pelo servidor, a alocação ocupa capacidade por 30 minutos. Esse prazo é fixo, persistido e nunca reiniciado por reload, acesso ao checkout, troca de método, nova tentativa ou geração de Pix.
4. Após 30 minutos, a reserva permanece pendente e retomável, mas sua alocação deixa de bloquear capacidade. Não cancelar nem marcar a reserva como `expired` só porque a garantia terminou.
5. Ao pagar após a garantia, revalidar capacidade e adquirir alocação elegível atomicamente. Só concluir se houver vaga. Antes da expiração, converter a própria alocação em definitiva, sem duplicação.
6. Pagamento aceito torna a reserva `confirmed` e mantém ocupação até cancelamento ou transição operacional aplicável. Duplicatas da mesma confirmação não somam ocupação nem geram outra reserva.
7. Bloquear pagamento quando `now >= paymentDeadlineAt`, inclusive com garantia ainda ativa. A garantia efetiva termina no menor instante entre o prazo de 30 minutos e o limite de pagamento.
8. Se prazo e lotação impedirem juntos, retornar apenas `reservation_payment_deadline_passed` como impedimento principal. Ordem: propriedade/estado terminal, já concluído idempotente, prazo, capacidade.
9. Recarregar ou fechar página não cancela reserva nem muda esses prazos. Novo login do mesmo cliente permite retomada; não depender do cookie do hold anônimo nem do replay de criação ainda existir.

## 4. Persistência e relógio

Na tabela `reservations`, adicionar colunas nullable `checkout_started_at DATETIME(3)`, `seat_guarantee_expires_at DATETIME(3)`, `payment_deadline_at DATETIME(3)` e `checkout_mode VARCHAR(8)` com valores `demo`/`live`/NULL e constraint correspondente. Datas são instantes UTC. `checkout_mode=NULL` identifica legado fora desta política. Índice composto `(status, seat_guarantee_expires_at)`.

Criar tabela `reservation_checkout_sessions`, uma linha por reserva (PK/FK `reservation_id`), com `mode`, `state` (`pending`, `pix_pending`, `demo_completed`, `paid`), `method` nullable (`pix`, `credit`, `debit`), `version` inteiro inicial 1, `pix_expires_at` nullable, `demo_completed_at` nullable, `created_at`, `updated_at`. Somente IDs/códigos Pix demonstrativos e metadados permitidos: não persistir nome/CPF recebidos do formulário nesta tabela, PAN, validade, CVV, token secreto de sessão ou payload arbitrário do navegador. Dados reais de Pix continuam sendo responsabilidade do repositório real de pagamentos quando habilitado.

Criar `reservation_checkout_operations` com PK numérica, FK de reserva, `operation_key` (UUID), `request_fingerprint` SHA-256, `kind` (`start`, `confirm_demo_pix`), `result_json` sanitizado e timestamps; unique `(reservation_id, operation_key)`. Mesmo key + mesmo fingerprint devolve o mesmo resultado; mesmo key + conteúdo diferente retorna 409 `checkout_idempotency_conflict`. Serializar operações da mesma reserva pelo lock da própria reserva e checar sessão concluída antes de criar operação nova. Resultado JSON nunca contém PAN/CVV/CPF.

Não criar linha fake `paid` em `payments` para demonstração. A confirmação demo persiste em `reservation_checkout_sessions`, explicitamente `demo_completed`; pode confirmar a reserva operacional para exercitar a alocação, mas recibo/UI devem continuar dizendo demonstração, sem pagamento realizado. O contrato deve distinguir `paymentStatus` financeiro de `checkoutProgress`; nunca converter `demo_completed` em pagamento financeiro `paid`.

Para reservas novas: usar um único instante UTC obtido do banco na transação; `checkout_started_at=now`, `seat_guarantee_expires_at=now+30min`, `payment_deadline_at=início no timezone do restaurante+2h`. Reutilizar o timezone configurado do estabelecimento, com fallback já adotado pelo projeto; nunca usar o timezone do navegador nem concatenar `Z` a um horário local para calcular esses instantes. Testar virada de dia. Preservar a representação civil existente das datas/horários do restaurante.

Não aplicar backfill destrutivo. Reservas antigas `confirmed` ficam confirmadas e ocupando como antes; não inferir dívida pela ausência de `payments`. Reservas legadas com metadados NULL mantêm política anterior. Aplicar a migration pelo runner oficial somente em banco local/de teste autorizado, após preservar recuperação; não aplicar em produção nesta tarefa.

## 5. Ocupação: um único predicado em todos os caminhos

Manter `reservation_tables` como associação da reserva às mesas; a existência dessa associação sozinha não significa ocupação ativa. Não criar uma tabela paralela de vagas.

Para cada reserva que sobrepõe o intervalo pedido, conta como ocupante quando:

- É legado (`checkout_mode IS NULL`) e satisfaz o predicado ativo anterior; ou
- É da nova política e status `confirmed`/`seated`; ou
- É da nova política e status `payment_pending` e `now < seat_guarantee_expires_at` e `now < payment_deadline_at`.

Estados cancelados/terminais continuam seguindo a política existente. Intervalos são semiabertos `[início, fim)`; horário adjacente não conflita. Bloqueios, áreas inativas, capacidade mínima/máxima e combinações de mesas continuam sendo respeitados.

Aplicar o MESMO predicado no inventário público, holds, confirmação manual/automática, consultas de conflitos e finalização. Extrair helper SQL server-side compartilhado em `infrastructure/checkout-occupancy-sql.ts`, com alias controlado pelo código e parâmetros `now`/`excludeReservationId`. Não interpolar parâmetros do cliente. O domínio puro recebe somente as ocupações ativas; não criar regras conflitantes em SQL e TypeScript.

Holds do wizard continuam com sua duração anterior até a confirmação. Na confirmação, inserir reserva/mesas/metadados/sessão e consumir o hold atomicamente: não pode haver janela contando hold e reserva separadamente. Pagamento ignora apenas a própria reserva (`excludeReservationId` owner-scoped), nunca todas as reservas/holds do cliente.

Expiração libera capacidade por predicado temporal, sem depender de cron. Não apagar `reservation_tables` ao vencer a garantia. Isso preserva a preferência histórica sem tratá-la como bloqueio.

## 6. Transação e concorrência obrigatórias

Criar `src/modules/reservations/application/finalize-checkout.ts` com porta transacional; implementar em `infrastructure/mysql-checkout-repository.ts`, usando `withTransaction`/pool já existente. Não usar o `findInventory` com pool separado dentro da transação: consultas decisivas usam a MESMA conexão e leituras atuais (`FOR UPDATE`), não snapshot obsoleto.

Ordem de locks de mesas consistente em todos os escritores: IDs crescentes. Preservar locks de tentativa/operação atuais; não criar um caminho que bloqueie mesas em ordem inversa. Finalização trava a reserva, sessão, operação e depois o conjunto de mesas candidatas em ordem crescente. Criação/hold não pode travar uma reserva alheia depois das mesas; consultas de conflitos não devem inverter esse grafo de locks. Reavaliar o algoritmo com testes de concorrência, e tratar deadlock com retry limitado de até 3 transações idempotentes, sem repetir efeito externo.

Dentro da finalização: validar dono e estado; retornar sucesso anterior se a sessão já concluiu; ler `now`; bloquear primeiro pelo prazo; adquirir locks; consultar bloqueios e ocupações atuais excluindo a própria reserva; obter uma alocação; atualizar associações, status, sessão e evento; gravar replay sanitizado; commit. Falha faz rollback integral.

Garantia ativa: usar as mesas atuais e validar que continuam aptas (cancelamento/bloqueio administrativo continua válido). Garantia encerrada: manter a combinação antiga se livre; senão usar `selectBestAvailableOption` existente para a mesma data, intervalo e quantidade de pessoas. O cliente escolhe horário/capacidade, não a identidade de uma mesa nesta retomada. Não trocar data/horário/duração/quantidade automaticamente. Nenhuma opção válida: 409 `reservation_capacity_unavailable`.

Evitar corrida da última vaga: todas as criações/holds/finalizações que disputem mesas precisam obedecer aos mesmos locks e predicado. Uma transação deve ganhar; a outra recebe indisponibilidade. Não basta checar capacidade em GET e fazer UPDATE fora da transação.

## 7. Criação e notificações

Alterar ambos os caminhos de confirmação para inserir `payment_pending` com a sessão de checkout na MESMA transação. Ajustar tipos de retorno, replay criptografado novo e evento `created` para o status real. Replay de confirmação devolve a mesma reserva e o prazo original. `reservation_attempts.state='confirmed'` pode continuar significando tentativa consumida; não confundir esse estado técnico com reserva paga.

Não enviar e-mail de reserva definitivamente confirmada ao apenas iniciar checkout. Adicionar mensagem/template de reserva recebida aguardando pagamento; confirmação definitiva usa a transição concluída. Reutilizar outbox e dedupe existentes. Demo nunca envia e-mail afirmando pagamento real. Não disparar novamente notificações em replay/reload. Tratar os consumidores administrativos, portal e lembretes que assumem `confirmed` na criação.

## 8. Contrato HTTP e retomada

Adicionar tipos em `checkout-contract.ts` e domínio puro em `src/modules/reservations/domain/checkout-policy.ts`. Um resultado de elegibilidade deve ser união discriminada, sem mensagens soltas como fonte de regra:

```ts
type CheckoutBlockReason = 'reservation_payment_deadline_passed'
  | 'reservation_capacity_unavailable' | 'reservation_not_payable';
type CheckoutEligibility = { allowed: true; reason: null }
  | { allowed: false; reason: CheckoutBlockReason };
```

Expandir `GET /api/reservations/[id]/checkout` autenticado com `serverNow`, `checkoutStartedAt`, `seatGuaranteeExpiresAt`, `paymentDeadlineAt` (ISO UTC), `timeZone`, `guaranteeActive`, `checkoutProgress`, `mode`, `eligibility` e `resume` (método/estado Pix demo sem dados sensíveis). Preservar resumo/cotação/capabilities atuais. GET não renova prazo, não readquire mesas e não grava pagamento. Capacidade no GET é informativa; POST sempre repete a checagem decisiva. Responder `Cache-Control: private, no-store`.

Criar `POST /api/reservations/[id]/checkout/start` e `POST /api/reservations/[id]/checkout/demo-confirm-pix`. Autenticação cliente, origem confiável/CSRF e limites de payload seguem os helpers atuais; nunca aceitar `customerId`, preço, status aprovado, prazos ou disponibilidade do navegador como autoridade. Não expor operações admin como alternativa pública.

Start aceita `operationKey`, método e `quoteId`. Valores pessoais são validados localmente; no demo enviar apenas o necessário ao contrato, sem cartão bruto. Validar quote vigente no servidor; divergência retorna 409 `checkout_quote_changed`. Cartão demo conclui na transação da seção 6 e retorna sucesso marcado demonstrativo. Pix demo cria/retoma estado `pix_pending`, mas não renova garantia. `demo-confirm-pix` usa chave idempotente e a mesma finalização transacional; exige modo demo e Pix ainda válido. Pix vencido retorna `checkout_pix_expired` e permite criar novo código, sujeito ao prazo/capacidade.

Modo live permanece indisponível com `payment_gateway_unavailable`, sem sucesso fabricado. Pagamento financeiro já existente/confirmado deve ser retomado como concluído, sem abrir uma segunda cobrança. Um estado terminal/cancelado não pode ser ressuscitado por esses endpoints.

Retomada pronta por URL `GET /reservas?checkoutReservationId=<id>`. Integrar na rota/wizard atual: parâmetro inteiro positivo leva ao `ReservationCheckout` da reserva indicada, antes de inicializar nova tentativa/hold. A API autoriza o dono. Sem sessão, usar acesso com `returnTo` local validado que preserve a URL. Sem permissão responder de forma que não enumere reservas (404). Remover o parâmetro não deve revelar informação protegida. Não persistir dados de cartão no storage.

Reload recupera contexto e tela Pix/sucesso do servidor. A URL deve ser atualizada com `history.replaceState`/router existente assim que a criação for aceita. Não reexecutar o POST de reserva ao recarregar. Não exigir o token seguro do portal para retomar reserva autenticada.

## 9. Frontend mínimo desta entrega

Na etapa principal do checkout e na tela Pix, incluir aviso discreto perto do título ou acima do painel, sem deslocar o CTA para fora do desktop compacto:

> Conclua o pagamento até HH:MM:SS para garantir sua vaga. Após esse horário, o pagamento dependerá da disponibilidade.

Exibir o menor instante entre garantia e limite, no timezone do estabelecimento; se for outro dia, acrescentar data curta. Após expiração trocar por “O prazo de garantia terminou. Você ainda pode pagar, sujeito à disponibilidade.”. Usar `serverNow` para compensar relógio local e revalidar ao focar a aba e antes de submeter; o relógio do cliente só controla apresentação. Não renovar garantia ao revalidar. Evitar polling agressivo e limpar timers.

`canSubmit` também exige `eligibility.allowed`; ao receber bloqueio no POST, persistir o reason no estado tipado e impedir sucesso/tela Pix indevida. Avisos visuais novos de prazo/lotação ficam para a tarefa futura; por ora usar o mecanismo genérico de erro existente, preservando o reason para a interface futura. Em prazo+lotação, o reason exposto é sempre prazo.

Lista: reserva nova `payment_pending` aparece `Em andamento` mesmo sem `payments`; não depender exclusivamente de JOIN financeiro. Não modificar a ação inerte `Efetuar compra`. Demo concluído usa apresentação explicitamente demonstrativa, nunca badge financeiro pago. Preservar histórico e recibo demonstrativo existentes.

## 10. Fronteira para gateway futuro: requisito explícito

Não ligar Mercado Pago nesta implementação. Preparar uma porta única de finalização que aceite um pagamento VERIFICADO pelo servidor (`paymentId`, provider, reserva, moeda/valor verificados, `paidAt`), nunca um booleano `approved` do browser. O futuro webhook deve gravar confirmação financeira e aquisição definitiva atomicamente, com idempotência por evento/pagamento e validação do prazo/capacidade. Marcar como pendente a integração dessa porta no gateway desativado, com teste de contrato.

Pix real é assíncrono: emissão de QR não significa pagamento nem renova a garantia inicial. Uma aprovação externa pode chegar depois da perda de capacidade ou do limite. Nunca descartar esse fato financeiro nem confirmar reserva sem vaga: persistir o pagamento real como fato e registrar necessidade de compensação/reembolso em outbox transacional, sem atribuir mesas; processar webhook como reconciliado, sem loop de rejeição. Adicionar contrato `reconciliationRequired`/motivo para esse resultado. Implementar o resultado de domínio e teste com fake nesta entrega; chamada de refund ao provedor, expiração/cancelamento remoto e worker real ficam como pendências explícitas antes de habilitar gateway. Não alegar que o gateway está pronto para produção.

Para a regra de prazo, usar o instante de pagamento verificado do provedor, não apenas chegada do webhook: pago exatamente no limite ou depois não confirma; pago antes com webhook atrasado revalida capacidade atual. Confirmar duas vezes não ocupa duas vezes. Cancelamento concorrente impede confirmação; pagamento externo já capturado exige compensação. Nunca manter lock SQL enquanto chama rede externa.

## 11. Testes obrigatórios e critérios de aceite

Criar testes puros de política com relógio injetável e integração MySQL em banco descartável separado do banco pessoal/local. Usar o padrão de testes atual; fake de repositório sozinho não comprova concorrência. Nunca alterar datas ou status de reservas reais para simular o tempo.

- Criação manual e automática grava reserva/sessão, consome hold uma vez e devolve prazo de 30 minutos; falha faz rollback.
- Replay de criação/chave duplicada não altera prazos e mantém uma reserva; fingerprint diferente retorna conflito.
- Garantia ativa ocupa capacidade; instante exato da expiração libera capacidade sem cron e mantém pendência.
- Pagamento antes da expiração converte ocupação sem duplicar associações/contagem; replay retorna sucesso.
- Depois da expiração, opção antiga livre é readquirida; ocupada permite alternativa elegível; sem alternativa bloqueia.
- Duas reservas pendentes disputando a última combinação: só uma conclui; holds/criação concorrentes também não sobrelotam.
- Limite: início 20:00, 21:59:59.999 permite se houver capacidade, 22:00:00 bloqueia. Testar virada de dia e navegador com timezone diferente.
- Confirmação criada a menos de 30 minutos do limite não estende prazo de pagamento. Prazo+lotação retorna prazo.
- Sem dono/sessão, ID inválido, cancelamento e estado terminal bloqueiam; trocar URL não acessa reserva alheia.
- GET/reload/retorno após login não recriam reserva/hold nem renovam garantia; retomam Pix pendente ou sucesso demo persistido.
- Pix expira independentemente da garantia; novo Pix não estende garantia. Demo não grava `payments.paid` nem dados de cartão.
- Legado `confirmed` sem pagamentos continua confirmado e ocupante; não é convertido em pendência pela migration.
- Fake de webhook duplicado/atrasado, prazo vencido, falta de vagas e cancelamento não confirma indevidamente; resultado exige compensação quando capturado.
- Browser com APIs simuladas: aviso HH:MM:SS, mudança de estado ao expirar, CTA, reload e URL retomável. Validar desktop 1440x740 e mobile 390x844; preservar resumo oculto somente no Pix mobile.

Executar typecheck, testes pertinentes, suíte padrão, lint, verificação de arquitetura/complexidade e build. Não criar snapshots que apenas espelham texto de implementação. Relatar separadamente checks existentes com falha e checks não executados; sem inventar validação MySQL/browser.

## 12. Lotes fechados para Luna

1. Migration, política pura e contratos. Testar fronteiras temporais. Não ligar a UI antes do servidor.
2. Criação manual/automática transacional com metadados, replay e consumo de hold; ajustar eventos e notificações.
3. Predicado único de ocupação em todas as leituras e conflitos; testar expiração e legado.
4. Repository/casos de uso de checkout, idempotência e finalização atômica. Testar concorrência MySQL de verdade.
5. GET expandido, POSTs demo e porta de resultado real/compensação com fakes; manter gateway desativado.
6. URL autenticada retomável, recarga, adaptador HTTP demo, aviso discreto e status da lista. Manter o botão futuro inerte.
7. Testes de regressão e inspeção visual. Atualizar README do banco com migration e documentação do limite/demo/gateway.

Ao entregar, informar arquivos alterados, migration criada/aplicada ou pendente, URLs de retomada, evidências dos testes e pendências concretas do gateway. Se não conseguir aplicar a migration no ambiente, preservar os arquivos e informar que o runtime depende dela; não esconder falha com fallback que ignora garantia. Não declarar concluída a funcionalidade se só o frontend ou mocks tiverem sido alterados.
