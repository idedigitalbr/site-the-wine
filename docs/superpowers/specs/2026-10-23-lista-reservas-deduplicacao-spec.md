# Lista de reservas — deduplicar revalidação ao retornar à aba

Siga o escopo e as decisões deste documento. Se encontrar contradição real com o código atual, pare no ponto afetado, apresente a evidência e peça esclarecimento. Não redesenhe a solução por conta própria.

## Executor e objetivo

Executor: modelo executor. Objetivo: reduzir consultas automáticas repetidas de `/lista-de-reservas` e seu histórico ao retornar à aba, mantendo carregamento inicial, paginação, retry e autorização atual.

Spec independente da otimização de configurações. Base inspecionada: `main`, HEAD `5d6b7b1`, em 2026-10-23. Esta preparação não implementou alterações nem executou testes.

## Escopo e base confirmada

- Alterar principalmente `next-app/src/components/account/reservations-list/useCustomerReservations.ts`.
- O hook usa `fetchPage`, com `no-store`, credenciais da mesma origem, `AbortSignal` e validação por `customerReservationsResponseSchema`.
- `replaceFirstPage` aborta um pedido anterior, incrementa geração, limpa a lista e pede offset zero. `appendNextPage` carrega a próxima página e deduplica IDs. Respostas de gerações antigas são descartadas.
- O efeito atual registra `window.focus` e `document.visibilitychange`. A coalescência atual só cobre um pedido de primeira página ainda em andamento.
- `ReservationsListView.tsx` consome o hook nas modalidades ativa e histórico; preservar essa interface pública: `reservations`, `nextOffset`, `phase`, `isLoadingMore`, `moreError`, `retry`, `loadMore`.
- Não alterar endpoints, banco, regras de sessão, filtros ativo/histórico, apresentação dos tickets, CSS, configurações da conta ou painel admin. Não adicionar dependências nem migrar para outra biblioteca de dados.
- Trabalhar em `main`, preservando arquivos alheios; não criar branch/worktree, commit, push ou PR.

## Decisões fechadas

1. Usar somente `document.visibilitychange` para a revalidação automática. Remover o listener de `window.focus`. Consultar apenas quando `document.visibilityState === 'visible'`.
2. Fixar a janela em `30_000` ms, com constante `AUTO_REVALIDATE_INTERVAL_MS` no arquivo do hook. Não adicionar polling, timer periódico ou timeout que dispare uma consulta após os 30 segundos. A passagem do tempo só permite uma futura consulta quando outro evento de visibilidade ocorrer.
3. Criar refs `lastFirstPageSuccessAtRef: number | null` e `lastAutomaticAttemptAtRef: number | null`. Usar `performance.now()` para medir intervalos dentro da montagem atual; `null` significa que ainda não aconteceu. Não persistir relógios ou dados em armazenamento global/localStorage.
4. Após uma primeira página ser validada e aplicada à geração atual, atualizar `lastFirstPageSuccessAtRef`. Não atualizar ao carregar páginas adicionais, em falhas, abortos ou respostas descartadas.
5. O callback automático deverá seguir esta ordem: ignorar se desmontado/redirecionando; ignorar se a página não estiver visível; ignorar se existir qualquer pedido ativo, inclusive paginação; calcular a idade a partir do maior timestamp não nulo entre sucesso da primeira página e última tentativa automática; ignorar se a idade for menor que 30.000 ms; registrar o timestamp da tentativa automática antes de iniciar o pedido; então pedir a primeira página.
6. Se ambos os timestamps forem `null`, o callback automático não deve disputar com o carregamento inicial: o início da montagem é responsabilidade exclusiva do efeito inicial. Só revalidar automaticamente depois de ter ocorrido um sucesso de primeira página ou uma tentativa automática registrada. Uma falha inicial continuará oferecendo o retry atual.
7. A trava por última tentativa automática vale também após erros, evitando chamadas automáticas repetidas durante indisponibilidade. Uma primeira página bem-sucedida reinicia a janela a partir do sucesso. No limite exato de 30.000 ms, uma consulta já é permitida.
8. Se um evento ocorrer durante `loadMore`, ignorá-lo sem abortar a paginação e sem programar consulta posterior. O próximo evento de retorno à aba poderá revalidar. Não alterar a geração ou a lista apenas por causa do evento ignorado.
9. `retry` manual e carga inicial ignoram a janela temporal. Retry manual deve coalescer com primeira página ativa; se houver paginação ativa, pode abortá-la e substituir a primeira página como no fluxo atual. Manter a API `retry` adequada aos usos atuais da view; não tratar o evento React de clique como um booleano de controle.
10. A consulta automática permitida usará a substituição de primeira página existente: mantém o estado de loading e a política atual de limpar/resetar lista e paginação. Não introduzir atualização silenciosa nesta tarefa.
11. Preservar a resposta 401: abortar/invalidar pedidos, limpar dados e redirecionar por `customerAuthHref('/lista-de-reservas')`. O cooldown não é uma autorização nem altera a proteção do endpoint. Ao redirecionar, eventos de visibilidade não podem iniciar novos pedidos.
12. Preservar AbortController, validação do JSON, deduplicação por ID e proteção de geração. Adicionar um ref de montagem para proteger o callback automático e as microtasks iniciais. No efeito inicial, a microtask deverá ter uma flag local de cancelamento própria daquele setup; o cleanup cancela essa microtask, marca desmontado, invalida a geração e aborta o pedido ativo. Uma microtask agendada por setup já encerrado não pode iniciar rede depois de um novo setup do Strict Mode.

## Alterações por arquivo

1. `next-app/src/components/account/reservations-list/useCustomerReservations.ts`: constante, refs de tempo/montagem, callback automático com as regras acima, listener único, wrapper explícito de retry manual e proteção das microtasks. Preservar callbacks existentes de aplicação/erro e interface pública do hook.
2. `next-app/src/components/account/reservations-list/ReservationsListView.tsx`: alterar somente se necessário para passar um callback sem argumentos ao botão de retry; não alterar apresentação.
3. Verificações existentes: `next-app/tests/customer-reservations-list.test.mjs` e `next-app/tests/customer-reservations-api.test.mjs` são referências de contratos/dados, não testes diretos do ciclo de vida React. Não adicionar asserções que só procurem texto no código para fingir que o comportamento foi validado. Conferir os cenários de eventos/pedidos no navegador com a API interceptada e dados fictícios.

## Sequência de implementação

1. Ler instruções locais e sincronizar CodeGraph. Conferir os usos de `retry` e `loadMore` antes de alterar os callbacks.
2. Acrescentar os refs e registrar sucesso somente após aplicação válida da primeira página atual.
3. Implementar a função de revalidação automática com as travas e o intervalo fixado. Reconhecer conclusão verificando que eventos ignorados não modificam lista, timestamps de tentativa ou pedidos ativos.
4. Substituir os dois listeners pelo listener único de visibilidade; remover ambos corretamente no cleanup conforme a nova implementação.
5. Proteger montagem/microtasks e manter retry manual independente da janela. Conferir que a deduplicação temporal não se aplica ao botão “Carregar mais”.
6. Executar os cenários de aceite abaixo com API simulada e os comandos confirmados.

## Verificação e critérios de aceite — executar na implementação

Não foram executados testes nesta preparação. O executor deverá conferir pedidos reais interceptados, não somente estados visuais:

| Cenário | Resultado esperado |
| --- | --- |
| Abrir a lista | Uma primeira página; zero pedidos provocados por foco isolado |
| Voltar à aba antes de 30 s do sucesso | Zero pedidos adicionais |
| Evento visible aos 30 s ou depois | Um GET com offset zero |
| Repetir visible imediatamente, inclusive após resposta rápida | Zero GETs adicionais na janela |
| Disparar focus junto com visible | Mesmo resultado do evento visible sozinho |
| Evento enquanto primeira página está ativa | Não duplicar nem abortar |
| Evento enquanto próxima página está ativa | Não abortar paginação nem disparar primeira página |
| Falha automática e retorno antes de 30 s da tentativa | Não repetir automaticamente |
| Falha inicial | Retry manual disponível; retorno à aba sozinho não cria loop de tentativas |
| Retry manual dentro da janela | Consultar imediatamente, coalescendo primeira página já ativa |
| Carregar mais dentro da janela | Paginação continua funcionando, sem restrição temporal nova |
| 401 | Limpar dados e redirecionar; eventos posteriores não consultam |
| Desmontar antes da microtask ou durante GET | Nenhuma nova rede/estado depois do cleanup; resposta antiga ignorada |
| Ativa e Histórico | Ambas continuam filtrando os mesmos registros como antes |

Em `next-app/`, executar `npm run typecheck`, `npm run lint`, `npm test`, `npm run verify:complexity` e `npm run verify:architecture`. Registrar falhas preexistentes separadamente. Não usar contas/reservas reais nem gravar no banco para validar eventos de leitura.

Critério final: em uma montagem com dados carregados, uma sequência de alternâncias rápidas da aba não gera outra consulta até a janela vencer; o primeiro retorno elegível gera somente uma consulta. Nenhum GET terá cache público ou autorização relaxada.

## Conclusão do executor

Relatar arquivos alterados, contagem de pedidos observada em cada grupo de cenários, comandos realmente executados e limitações. Não declarar aprovação de testes ou cenários que não tenham sido executados.
