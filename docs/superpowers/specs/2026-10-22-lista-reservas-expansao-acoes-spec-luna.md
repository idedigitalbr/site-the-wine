# Spec de implementação para Luna — tickets de reservas e ações

Data: 2026-10-22. Projeto: site-the-wine. Rota principal: `/lista-de-reservas`.
Status: especificação para execução; implementação ainda não realizada.

## 0. Instruções de execução

Execute esta spec por etapas, no checkout existente e na branch `main`. Não criar branch, worktree, clone, commit, push ou PR. O usuário corrigiu expressamente “PR” para “spec”. Preserve todas as alterações locais preexistentes, inclusive nos arquivos desta funcionalidade e do checkout. Não substituir arquivos inteiros por versões antigas.

As decisões abaixo são o contrato de implementação. Não redesenhar o produto, trocar stack, adicionar dependências, criar gateway, persistir simulações ou inventar uma arquitetura alternativa. Se o código tiver mudado, adapte os pontos de integração à versão atual mantendo o contrato. Se não houver fonte confiável para algum dado, implemente o fallback especificado; não fabrique o dado.

Antes de editar: leia AGENTS.md, sincronize o CodeGraph conforme as instruções globais, consulte o índice e a memória do projeto. Use `ui-from-image` para fidelidade visual e `screenshot-to-modular-code` para os módulos definidos aqui. Esta spec já é a UI Spec unificada: não criar uma segunda especificação concorrente.

## 1. Resultado esperado e escopo

Na lista ativa, cada reserva passa a ter resumo compacto e detalhes expansíveis em desktop, tablet e mobile. A primeira reserva visível inicia expandida em cada entrada/carregamento da página. Expandir uma não fecha outras; o usuário pode fechar inclusive a primeira. Não persistir expansão entre navegações ou recargas.

Os detalhes contêm preferências e observações completas e uma faixa de ações: `Imprimir recibo` ou `Efetuar compra`, conforme a regra abaixo, e `Adicionar ao calendário`.

Desktop segue os anexos. Mobile conserva o desenho próprio existente, com as novas ações integradas. Cabeçalho, Voltar, Histórico, adicionar reserva, autenticação, paginação e filtros atuais continuam funcionando. O histórico compartilha componentes: preservar seu aspecto atenuado e comportamento existente; não acrescentar compra ou calendário ao histórico nesta entrega.

## 2. Evidências locais e pontos de atenção

- Next.js App Router, React, TypeScript, CSS Modules e `lucide-react` já instalados.
- `next-app/src/components/account/reservations-list/ReservationCard.tsx` tem `TicketDateStub`, `DesktopTicketBody`, `MobileTicketBody` e estado `isMobileExpanded`. Desktop hoje sempre mostra detalhes; mobile já expande individualmente.
- `ReservationsListView.tsx`, em `ReadyReservations`, passa `defaultMobileExpanded={index === 0}`. A lista usa IDs estáveis, paginação e filtra ativos/histórico.
- `useCustomerReservations.ts` consulta `/api/reservations/my` e revalida ao retornar foco/visibilidade. Hoje a revalidação limpa a lista; isso pode remontar cards. A expansão deve sobreviver a essas revalidações dentro da mesma visita.
- `CustomerReservationItem` e o schema atual têm data, início, duração nullable, pessoas, status da reserva, preferências e observações. Não têm status do pagamento, código público ou timezone.
- `MysqlCustomerReservationQueryRepository` já restringe por `customer_id` e ordena por data, horário, ID, todos ascendentes. Manter a ordem; “primeira” significa primeira reserva após o filtro ativo, nunca o card de adicionar reserva.
- Existem statuses de pagamento `pending`, `processing`, `paid`, `failed`, `cancelled`, `refunded`, `partially_refunded`, distintos dos statuses de reserva.
- `CheckoutSuccess.tsx` exporta `SuccessScreen`; o botão atual chama `window.print()`. O recibo do checkout é DEMONSTRATIVO, com aviso de ausência de comprovação de pagamento. O adaptador demo guarda resultados apenas em memória do navegador.
- O endpoint de checkout devolve contexto e preço ilustrativo, não prova pagamento. Não usar sua resposta para marcar reserva paga nem para inventar um pagamento.
- Timezone do estabelecimento: configuração `RESERVATION_ESTABLISHMENT_TIMEZONE`, fallback já utilizado no servidor `America/Sao_Paulo`. Não usar timezone do dispositivo como origem da reserva.

## 3. UI Spec

### 3.1 Overall layout

Referências: anexo 1 (confirmada) e anexo 2 (em andamento), fornecidos pelo usuário. Anexo 1 mede 1448 × 1086 pixels. Use esse viewport na primeira comparação; registre separadamente as dimensões do anexo 2 antes de comparar. Os textos solicitados pelo usuário prevalecem sobre diferenças do mockup.

Cópias permanentes para o executor, relativas à pasta desta spec:
- `assets/2026-10-22-lista-reservas/referencia-confirmada.png`
- `assets/2026-10-22-lista-reservas/referencia-em-andamento.png`

Layout misto Grid/Flex em fluxo normal: cabeçalho existente, barra de navegação da lista, coluna de tickets. Ticket horizontal no desktop, canhoto de data à esquerda, resumo e detalhes ao centro, status e controle de expansão à direita. Conservar recortes, borda dourada, fundo preto com brilho dourado discreto, separador pontilhado e marca d'água da taça. Não converter o layout mobile em uma miniatura do desktop.

Recolhido: data completa/dia da semana, horário, duração, pessoas, status e `Expandir`. Ocultar preferências, observações e ações inferiores. Expandido: conservar resumo, aumentar naturalmente a altura e mostrar detalhes e ações; controle passa a `Fechar`.

No expandido desktop, a data ganha a composição vertical maior do anexo. Preferências e observações ficam em duas caixas lado a lado; ações ficam abaixo de um divisor e centralizadas. Não fixar altura que corte textos longos.

### 3.2 Color palette

Reutilizar os tokens/classes existentes. Valores da referência são aproximados, não substituem globalmente a identidade do site:

| Papel | HEX | Uso |
|---|---|---|
| Fundo | `#000000` | Página |
| Superfície | `#120e07` a `#050503` | Gradiente do ticket existente |
| Primária | `#e5c158` | Bordas, ações, ícones dourados |
| Secundária | `#359bd3` aprox. | Rótulos desktop dos campos |
| Texto primário | `#f2efe9` | Valores |
| Texto secundário | `#c5beb0` | Auxiliares |
| Divisor | `#d3b97b` com baixa opacidade | Separações |

### 3.3 Typography scale

Usar `--font-body` e `--font-display`, já presentes na lista. Não importar fontes novas.

| Nível | Desktop aproximado | Peso | Uso |
|---|---:|---:|---|
| Dia expandido | 44–48 px | 600–700 | Data em fonte display |
| Dia compacto | 30–36 px | 600–700 | Data recolhida |
| Valor | 18–20 px | 500–600 | Hora, duração, pessoas |
| Corpo | 14–16 px | 400–500 | Preferências/observações |
| Caption | 12–14 px | 500–600 | Labels, status, botões |

Mobile mantém escala própria atual; aumentar área clicável por padding, sem reduzir fontes para acomodar botões.

### 3.4 Spacing system

Base de 4/8 px. Desktop: margens externas próximas de 52 px no viewport de referência, gap vertical entre tickets de aproximadamente 16 px, canhoto próximo de 260 px, padding principal de 20–24 px, gap entre caixas de detalhes de 12–16 px. São alvos de comparação, não larguras rígidas em todos os dispositivos. Reutilizar o container atual e ajustar apenas diferenças constatadas.

### 3.5 Component inventory

1. Header existente; sem reconstrução.
2. Barra Voltar/Histórico existente.
3. `ReservationCard`: moldura e estado controlado.
4. `TicketDateStub`: variantes compacta/expandida.
5. `DesktopTicketBody` e `MobileTicketBody`: mesma reserva e mesmo estado.
6. `ReservationStatusBadge`: status visual, com suporte ao aviso de pagamento.
7. Controle semântico `Expandir`/`Fechar`.
8. Campos de preferências e observações existentes.
9. `ReservationCardActions`: recibo/compra e calendário.
10. `AddToCalendarButton`: escolha Google Agenda ou arquivo ICS.
11. `ReservationReceipt`: conteúdo imprimível compartilhado com checkout.

### 3.6 Interaction hints

Botões operáveis por clique, toque, Enter e Espaço. Toggle com `aria-expanded` e `aria-controls` para painel com ID único por reserva. Conteúdo fechado deve ficar fora da navegação por teclado. Não criar botões aninhados no resumo clicável mobile. Status é informativo, não confirma pagamento ao clicar. Ícones decorativos com `aria-hidden`.

### 3.7 Uncertainties resolvidas por esta spec

- Anexo mostra `Baixar recibo`; rótulo final será `Imprimir recibo`.
- Anexo mostra check no status em andamento; exigência textual prevalece: `Em andamento` seguido à DIREITA por exclamação destacada (`CircleAlert` de lucide), em dourado legível.
- Ausência de duração não autoriza assumir 120 minutos.
- Android não tem garantia universal de importar ICS ao tocar no arquivo. Oferecer Google Agenda além de ICS, sem prometer abertura obrigatória do aplicativo nativo.

## 4. Contrato de dados e status — implementar exatamente

Adicionar aos itens da listagem, em tipo, schema Zod, port/record, SELECT/mapeamento e application mapper:

```ts
publicCode: string;
paymentStatus: PaymentStatus | null;
timeZone: string;
```

`publicCode` vem de `reservations.public_code`. `timeZone` é preenchido no composition root do servidor com a configuração do estabelecimento, passando uma dependência `timeZone: string` a `listCustomerReservations`. Não ler `process.env` no domínio ou cliente. Validar timezone no servidor com `Intl.DateTimeFormat`.

`paymentStatus` vem de um único pagamento selecionado por reserva: LEFT JOIN de `payments` pelo ID de uma subconsulta correlacionada à reserva. Priorizar pagamentos em `paid`/`partially_refunded`; dentro dessa prioridade escolher maior `id`; sem eles escolher o maior `id` geral. Pagamento inexistente vira null. Retornar somente status, sem dados do pagador, códigos Pix ou URLs privadas. Não fazer fetch de pagamento por card e não criar migração. Validar com `isPaymentStatus`, rejeitando valor desconhecido.

Criar `reservationCardPresentation.ts` com função pura `getReservationCardPresentation(reservation)` usada por desktop e mobile. Regras, na ordem:

1. Reserva `cancelled`, `expired`, `no_show` ou variante histórica: conservar status existente; sem compra/calendário novos. A reserva terminal prevalece sobre pagamento pendente.
2. `paymentStatus` em `pending` ou `processing`, OU status da reserva `payment_pending` sem pagamento liquidado: exibir `Em andamento` + `CircleAlert` à direita; ação `Efetuar compra`.
3. Status de reserva `pending`, `draft` ou `hold`, sem pagamento liquidado: mesma apresentação em andamento. Trata o estado pré-pagamento atual sem alegar que há cobrança iniciada.
4. Demais casos: conservar rótulo de reserva existente (confirmada permanece `Confirmada`), ação `Imprimir recibo` nas reservas ativas confirmadas. Não deduzir que `confirmed` significa pagamento real.

`failed`, `cancelled`, `refunded` não devem ser rotulados como pagamentos confirmados. Se a reserva estiver confirmada, manter sua confirmação como reserva e emitir somente recibo de reserva, sem comprovação financeira. `partially_refunded` é liquidado para fins de apresentação da reserva, mas não autoriza inventar valores líquidos.

Não alterar transições ou statuses persistidos. Simulação do checkout não deve ser gravada em `payments`, localStorage ou sessão para produzir falsa liquidação. Não criar sincronização de pagamento demo nesta tarefa.

## 5. Estado de expansão e revalidação

Mover o controle da lista ativa para `ReservationsListView` (não para contexto global): conjunto de IDs abertos e flag de inicialização por visita, com `useState`/`useRef`. `ReservationCard` recebe `isExpanded` e `onToggle`; ambos os bodies recebem esses mesmos valores. Preservar o modo histórico separadamente, sem aplicar ações novas.

Na primeira resposta bem-sucedida com reservas ativas visíveis, abrir só o ID da primeira. Lista vazia não marca a inicialização como concluída até existir uma reserva visível. Após inicializar, nunca reabrir automaticamente uma reserva fechada pelo usuário por causa de rerender, troca de viewport, paginação ou retorno de foco. Novos cards de paginação iniciam fechados. Remover do conjunto IDs que deixarem de existir somente após resposta completa adequada, nunca durante loading temporário ou com base apenas na página incremental.

O estado deve residir num componente que não seja desmontado pelo `phase='loading'`; o `ReservationsListView` permanece montado e deve ser o dono. Passe callbacks/estado através das funções de conteúdo existentes. Uma navegação nova ou reload reinicia a regra da primeira reserva. Não usar índice como key.

## 6. Ações

### 6.1 Efetuar compra

Botão normal, visual habilitado, hover/foco e ícone `ShoppingCart`. `type='button'`; sem navegação, requisição, popup, toast, alteração de status ou abertura de checkout. Um clique não deve acionar o toggle do card. Manter um ponto explícito de futura integração no componente, sem implementar compra.

### 6.2 Imprimir recibo

Usar o diálogo de impressão do navegador, como no checkout, permitindo salvar PDF pelo próprio navegador. Não criar download de PDF nem imprimir toda a lista.

Extrair de `CheckoutSuccess.tsx` a apresentação do recibo para `next-app/src/components/reservation/receipt/ReservationReceipt.tsx` e estilos `ReservationReceipt.module.css`. Receber dados de reserva (publicCode, data, hora, pessoas, duração quando conhecida) e `paymentEvidence` opcional. Checkout fornece o contexto e o pagamento que já possui; lista fornece apenas os dados reais que recebeu.

Quando `paymentEvidence` estiver ausente, imprimir `Recibo da reserva` e o aviso `SEM VALOR FISCAL E SEM COMPROVAÇÃO DE PAGAMENTO`. Não mostrar método, valor, “pago em”, “compra concluída” ou “Parabéns” presumidos. Checkout demo conserva método/total/horário simulado e os avisos demonstrativos atuais, sem virar comprovante real. O markup dos dados e o estilo de impressão devem ser compartilhados, não copiados.

Na lista, montar uma única área de impressão com a reserva selecionada fora da grade; atualizar a seleção e só então chamar `window.print()` após commit do React. A impressão deve conter exclusivamente essa área, mesmo com vários cards abertos. Usar CSS de impressão global mínimo, restrito a um atributo temporário `data-reservation-print` no body, com cleanup em `afterprint` e desmontagem. Não esconder um ancestral da área selecionada com `display:none`. A seleção não fecha cards. Não buscar dados via rede para imprimir os campos já disponíveis.

No checkout, preservar tela e comportamento atuais ao reutilizar o conteúdo extraído. Verificar que as regras de print da lista não afetem impressão do checkout fora do atributo temporário.

### 6.3 Adicionar ao calendário

Clique abre um pequeno popover acessível com duas opções: `Google Agenda` e `Baixar arquivo .ics`. No mobile, usar o mesmo controle em largura disponível, sem nova biblioteca. Escape e clique fora fecham; foco volta ao acionador.

Google Agenda abre formulário de novo evento com título, descrição e intervalo preenchidos usando URL `https://calendar.google.com/calendar/render` e parâmetros `action=TEMPLATE`, `text`, `details`, `dates` e `ctz`. Construir com `URL`/`URLSearchParams`, nunca interpolar texto cru. Abrir por link direto em nova aba com `rel='noopener noreferrer'`; o usuário confirma Salvar. Não integrar OAuth ou escrever silenciosamente na conta. Esta é a opção para facilitar Android; abertura em app ou navegador depende do aparelho.

Evento: título `Reserva — The Wine`; descrição `Reserva no The Wine para N pessoa(s). Duração: D minutos.`; início = data + horário da reserva no timezone do estabelecimento; fim = início + duração real, incluindo virada de dia/mês/ano. Não incluir observações pessoais, preferências, tokens ou dados do cliente. Local pode ser omitido; não inventar endereço.

Criar `next-app/src/lib/reservation-calendar.ts` com funções puras para gerar dados Google e ICS a partir de reserva/data/hora/duração/timezone. Para Google, usar datas locais `YYYYMMDDTHHmmss/YYYYMMDDTHHmmss` e `ctz=timeZone`; somar minutos usando aritmética de componentes de calendário com UTC como ferramenta aritmética, nunca como conversão implícita do horário local. A configuração atual usa fuso sem DST; se o timezone configurado passar a ter transição DST no intervalo, não alegar suporte sem validar o intervalo.

ICS: `VCALENDAR`, `VERSION:2.0`, `PRODID`, `CALSCALE:GREGORIAN`, `VEVENT`, UID estável da reserva, `DTSTAMP` UTC, `DTSTART;TZID=...`, `DTEND;TZID=...`, `SUMMARY`, `DESCRIPTION`. Incluir `VTIMEZONE` válido para o timezone e período do evento; para o fuso atual, gerar bloco de offset constante apenas depois de confirmar via `Intl` que os offsets do período são constantes. Se detectar mudança de offset, usar UTC calculado e validado por round-trip `Intl` para início/fim, em vez de gerar um VTIMEZONE incorreto. Escapar barras, vírgulas, ponto e vírgula e quebras, CRLF, folding a 75 octetos sem cortar UTF-8. MIME `text/calendar;charset=utf-8`, arquivo `reserva-{publicCode}.ics` com nome sanitizado; liberar object URL após download.

Duração null/inválida: manter o botão visível desabilitado com explicação `Duração indisponível para adicionar ao calendário.`. Não criar evento sem fim nem assumir 120 minutos. Timezone inválido: feedback local de indisponibilidade, sem arquivo ou link incorreto. Ambos os provedores devem usar o mesmo intervalo calculado.

Fonte da ressalva Android: https://support.google.com/calendar/answer/37118 — a importação de ICS no Google Calendar é documentada para computador. Por isso ICS sozinho não é o contrato de suporte Android desta entrega.

## 7. Mobile e tablet — layout prescrito

Manter breakpoint mobile atual de 767 px e o canhoto vertical, título `Reserva`, métricas compactas e paleta existentes. O resumo mobile pode continuar alternando expansão; adicionar também controle textual claro `Expandir`/`Fechar` em linha própria, sem colidir com status. Ambos acionam o mesmo handler; sem duplicação de evento por bubbling.

Expandido: preferências, observações, ação principal e calendário, nessa ordem. Ações em coluna, largura disponível, altura de toque mínima 44 px, gap 8–12 px, texto integral. Não colocar ações na linha estreita das três métricas. O popover do calendário não pode ser cortado pela moldura: posicionar fora do ancestral com clip, usando portal React se necessário. Preservar rolagem vertical natural.

Tablet acima de 767 px usa desktop enquanto couber; se o resumo e controles começarem a colidir, reflow de controles dentro do ticket via CSS Grid, sem reduzir fonte nem provocar scroll horizontal. Proteger observações longas com `overflow-wrap:anywhere`, sem truncar informação no painel aberto.

## 8. Módulos e ordem de implementação

Todos os caminhos abaixo são relativos à raiz do repositório.

| Ordem / módulo | Arquivos | Responsabilidade e entrada |
|---|---|---|
| 1. Contrato da lista | `next-app/src/types/customer-reservations.ts`, `src/lib/customer-reservations-schema.ts`, `src/modules/reservations/application/ports.ts`, `application/list-customer-reservations.ts`, `infrastructure/mysql-customer-reservation-query.ts`, `src/server/reservations/list-customer-reservations.ts` (demais caminhos sob next-app/src) | Acrescentar código/status pagamento/timezone sem mudar paginação/ownership |
| 2. Apresentação | `next-app/src/components/account/reservations-list/reservationCardPresentation.ts`, `ReservationStatusBadge.tsx` | Função pura e badge, sem acesso a rede |
| 3. Expansão | `ReservationsListView.tsx`, `ReservationCard.tsx` na mesma pasta | Estado por ID na view e props controladas, compartilhadas entre breakpoints |
| 4. Calendário | `next-app/src/lib/reservation-calendar.ts`, `next-app/src/components/account/reservations-list/AddToCalendarButton.tsx` | Intervalo único, Google/ICS, feedback local |
| 5. Recibo | `next-app/src/components/reservation/receipt/ReservationReceipt.tsx`, `ReservationReceipt.module.css`, `next-app/src/components/reservation/v2/CheckoutSuccess.tsx`, `ReservationCheckout.module.css` | Apresentação compartilhada e print isolado |
| 6. Ações | `next-app/src/components/account/reservations-list/ReservationCardActions.tsx`, `ReservationsList.module.css` | Compra inerte, seleção para print, calendário e responsividade |
| 7. Composição e verificação | Mesma rota existente; testes abaixo | Integrar módulos, comparar referências e corrigir divergências localizadas |

Não criar nova rota de página/recibo, endpoint de cobrança, store global ou biblioteca de calendário. Reutilizar ícones lucide e componentes de campos/moldura existentes. Cada módulo deve ter funções pequenas e passar os limites de complexidade atuais; não desativar regras para aprovar o código.

## 9. Verificação e critérios de aceite

Atualizar testes existentes afetados, principalmente `next-app/tests/customer-reservations-list.test.mjs` e `customer-reservations-api.test.mjs`, e acrescentar casos funcionais necessários nos locais convencionais do projeto. Não criar Storybook nem testes que apenas procuram strings de implementação.

Casos obrigatórios:

1. Primeiro card visível abre após carregamento; demais fechados. Fechar primeiro é permitido; expandir segundo não fecha primeiro/terceiro.
2. Foco, revalidação, mudança de viewport e Carregar mais preservam as escolhas; reload reinicia primeiro aberto. Erro de paginação não apaga estado.
3. Confirmada, pagamento pending/processing, payment_pending sem payment, reserva cancelada com payment pendente, confirmada sem payment, failed/refunded e pagamento liquidado anterior a tentativa falha posterior obedecem à precedência especificada.
4. SQL mantém ownership por cliente, uma linha por reserva e paginação 20+1, inclusive com múltiplas tentativas de pagamento. Cliente não recebe dados de outro cliente nem detalhes financeiros privados.
5. Compra permanece habilitada visualmente; clique não altera URL, card, rede ou pagamento.
6. Impressão com vários cards abertos contém só a reserva selecionada; código/data/hora/pessoas corretos. Sem valores ou pagamento fictício. Cancelar impressão devolve tela normal. Checkout mantém impressão demonstrativa correta.
7. Calendário: 14/10/2026 às 20:30 + 120 minutos termina 22:30; 31/12/2026 às 23:30 + 120 termina 01/01/2027 às 01:30. Testar navegador em timezone diferente, duração null e texto com acentos. Interpretar o ICS com parser independente disponível e conferir início/fim/timezone; não considerar apenas download como prova.
8. Navegação por teclado, foco visível, painéis fechados sem links focáveis, Escape no calendário e toque sem botões aninhados.

Executar em `next-app`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run verify:complexity`, `npm run verify:architecture`, `npm run verify:lockfile` e `npm run build`. Executar casos relevantes de browser com a configuração Playwright existente. Não iniciar outro projeto/porta ocupada nem criar dados reais de cobrança. Reportar falhas preexistentes separadamente com evidência; não alterá-las fora de escopo.

Comparação visual obrigatória na implementação: viewport 1448×1086; desktop largo próximo de 1900 px; desktop limitado 1280×800; tablet 768×1024; mobile 390×844 e 320×740. Usar fixtures sem dados pessoais para reproduzir cards confirmados/em andamento. Capturar lista no contexto e crops de ticket recolhido, expandido, status de aviso, ações mobile, popover e junções entre tickets. Conferir observações longas, vários cards abertos, fonte ampliada/zoom aproximado, ausência de overflow horizontal e botões não cortados pelo clip.

Teste Android real do Google Agenda, se disponível: confirmar formulário com dados preenchidos e salvamento pelo usuário. Emulação mobile sozinha não comprova abertura do app Android; relatar essa limitação se não houver aparelho. Conferir ICS em cliente compatível disponível. Não declarar compatibilidade testada sem teste.

## 10. Entrega esperada do executor

Informar arquivos alterados, comportamento implementado, comandos e resultados reais, screenshots/crops efetivamente vistos e limitações restantes. Atualizar memória curada com fatos verificados. Não afirmar teste visual/Android concluído com base em typecheck, build ou emulação apenas.

Esta entrega da spec foi preparada por inspeção de código, referências anexadas e notas do Obsidian. CodeGraph foi sincronizado. A memória consultada contém decisões anteriores e trabalho recente no checkout; prevalece o código local. Ferramentas explícitas de ai-memory não estavam expostas na sessão de preparação. Nenhuma implementação ou validação de UI nova é alegada nesta especificação.
