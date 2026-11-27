# Configurações da conta — reduzir chamadas e carregar transações sob demanda

Siga o escopo e as decisões deste documento. Se encontrar contradição real com o código atual, pare no ponto afetado, apresente a evidência e peça esclarecimento. Não redesenhe a solução por conta própria.

## Executor e objetivo

Executor: modelo executor. Objetivo: abrir `/configuracoes` com um único GET de dados da conta, eliminar o GET separado da sessão usado por esse provider e consultar transações somente quando a aba `dados-bancarios` for aberta. Preservar autorização no servidor e comportamento de edição da conta.

Esta spec é independente da spec de deduplicação da lista de reservas. Base inspecionada: checkout local `main`, HEAD `5d6b7b1`, em 2026-10-23. A preparação criou apenas documentação e não executou testes.

## Escopo

- Alterar contratos e carregamento da área de configurações; criar um endpoint autenticado de transações.
- Preservar layout, filtros, paginação local de 10 itens, limite SQL atual de 100 transações, mensagens existentes e operações de perfil, senha e notificações.
- Não alterar painel admin, wizard de reserva, disponibilidade, pagamentos, regras de mapeamento dos status financeiros, banco, migrations, dependências ou `.env*`.
- Trabalhar no checkout local `main`, preservando arquivos alheios. Não criar branch/worktree, commit, push ou PR.

## Base existente confirmada

- `next-app/src/components/account/settings/AccountSettingsContext.tsx`: `hydrateSettings` chama `fetchAccountSettings` e `fetchCustomerSessionId` em paralelo. O segundo pedido serve para obter o ID usado na chave local das preferências. O provider armazena `transactions` junto com perfil e notificações.
- `next-app/src/lib/account-settings-client.ts`: `AccountSettingsPayload` contém `profile`, `notifications` e `transactions`; `requestJson` trata 401 e erros e usa `no-store` e credenciais da mesma origem.
- `next-app/src/server/account-settings/service.ts`: `getAccountSettingsForRequest` já chama `requireAuthenticatedSession`, consulta o perfil e chama `listCustomerAccountTransactions` incondicionalmente.
- `next-app/src/server/account-settings/repository.ts`: `listCustomerTransactionsByUserId` filtra pelo usuário autenticado e retorna até 100 transações. Reutilizar essa consulta sem alterar seus filtros/mapeamentos.
- `next-app/src/app/api/account/settings/route.ts`: usa `authJson` e `customerAuthErrorResponse`.
- `next-app/src/components/account/settings/AccountSettingsView.tsx`: somente a aba ativa é renderizada. O valor inicial do provider é `dados`, salvo quando há `tab` válida na URL.
- `next-app/src/components/account/settings/tabs/BankingDataTab.tsx`: tabela usa `filteredTransactions` e `isProfileLoading`; paginação e filtro acontecem no navegador.
- `next-app/src/types/account-settings.ts`: define `AccountSettingsContextValue` e `AccountTransaction`.

## Decisões fechadas e contratos

1. `GET /api/account/settings` continuará autenticado por `requireAuthenticatedSession(request)`. A resposta passará a `{ userId: string, profile: UserProfile, notifications: NotificationPreferences }`. `userId` vem de `session.user.id`. Remover `transactions` dessa resposta e remover a consulta de transações dessa função. Atualizar os consumidores e testes existentes no mesmo trabalho.
2. Criar `GET /api/account/transactions`, com resposta `{ userId: string, transactions: AccountTransaction[] }`. Implementar no serviço a função `getAccountTransactionsForRequest(request)`: exigir sessão, chamar `listCustomerAccountTransactions(session.user.id)` e devolver o ID da mesma sessão. Não aceitar ID do cliente, CPF ou ID do usuário pela URL/corpo. Não usar estado do navegador como autorização.
3. A nova rota deve copiar o padrão de tratamento do endpoint de configurações: `authJson(data, 200)` no sucesso e `customerAuthErrorResponse(error)` no catch. Preservar os cabeçalhos de privacidade de `authJson`.
4. No cliente, `AccountSettingsPayload` refletirá o novo contrato. Adicionar `AccountTransactionsPayload` e `fetchAccountTransactions(signal?: AbortSignal)` usando `requestJson` e o novo endpoint.
5. O provider consultará apenas `fetchAccountSettings` na hidratação. Usará `settings.userId` para `accountUserId` e para `readStoredPreferences`. Excluir `fetchCustomerSessionId` desse arquivo; não remover o endpoint global da sessão, pois possui outros consumidores.
6. Adicionar ao contexto `transactionsStatus: 'idle' | 'loading' | 'ready' | 'error'` e `retryTransactions: () => void`. Manter `transactions` e `filteredTransactions` existentes. `isProfileLoading` continuará exclusivo dos dados básicos da conta.
7. Após a hidratação básica bem-sucedida, quando `activeTab === 'dados-bancarios'` e o histórico estiver `idle`, iniciar um único pedido de transações. Isso vale também para acesso direto a `?tab=dados-bancarios`. Não iniciar enquanto `accountUserId` estiver ausente ou a hidratação básica tiver falhado.
8. Usar um ref de pedido ativo com `AbortController` e contador de geração para impedir pedidos concorrentes e aplicação de respostas antigas. Marcar `loading` antes de aguardar a rede. Só iniciar automaticamente a partir de `idle`; `error` exige retry explícito. A função de carregamento também deve verificar o ref antes de iniciar.
9. Trocar de aba não abortará o pedido já iniciado: ele pode concluir e ficar disponível no provider. O cache será somente na memória desse provider e valerá até seu unmount; voltar à aba depois de `ready`, inclusive com resultado vazio, não fará outra consulta. Não persistir histórico em localStorage, cookie ou cache global.
10. No unmount, invalidar a geração e abortar a consulta. Não registrar cleanup que aborte o pedido a cada mudança de `transactionsStatus`; o cleanup de cancelamento deve acompanhar o ciclo de vida do provider.
11. Antes de aplicar a resposta, comparar `payload.userId` com o `accountUserId` da geração que iniciou o pedido. Em divergência ou 401: não exibir as transações recebidas, limpar o histórico e redirecionar para `/acesso?auth=expired`, como já faz a hidratação. Não mostrar dados de outra conta nem permitir retry enquanto redireciona.

## Alterações por arquivo

1. `next-app/src/server/account-settings/service.ts`: separar leitura básica e leitura do histórico nas duas funções autenticadas acima.
2. `next-app/src/app/api/account/transactions/route.ts` (novo): expor somente o GET descrito.
3. `next-app/src/lib/account-settings-client.ts`: atualizar tipos e adicionar o cliente de transações. Preservar `requestJson`, o tratamento de 401 e as demais operações.
4. `next-app/src/types/account-settings.ts`: adicionar `transactionsStatus` e `retryTransactions` à interface do contexto.
5. `next-app/src/components/account/settings/AccountSettingsContext.tsx`: aplicar a hidratação única, o carregamento sob demanda e as proteções de concorrência. Expor os novos campos no value e nas dependências do memo. Preservar as chaves de armazenamento das preferências por usuário.
6. `next-app/src/components/account/settings/tabs/BankingDataTab.tsx`: usar `transactionsStatus` em vez de `isProfileLoading` para o histórico. Em `idle/loading`, exibir a mensagem atual de carregamento; em `ready` vazio, exibir a mensagem atual de vazio. Em `error`, exibir na região da tabela uma mensagem com `role="alert"`: “Não foi possível carregar seu histórico de transações.” e um botão “Tentar novamente” que chama `retryTransactions`. Não exibir vazio como se fosse um sucesso após falha. Manter o filtro, as colunas e a paginação atuais.
7. `next-app/tests/account-settings-service.test.mjs`: atualizar o contrato de configurações e cobrir o novo serviço autenticado, seguindo o loader/mocks já utilizados no arquivo.

## Sequência de implementação

1. Conferir as instruções locais e a documentação de Route Handlers da versão instalada do Next em `next-app/node_modules/next/dist/docs/` antes de criar a rota. Sincronizar CodeGraph conforme as regras globais.
2. Separar os serviços e criar a rota; pronto quando os dois GETs autenticarem individualmente e a leitura básica não consultar transações.
3. Atualizar os contratos e o cliente; pronto quando nenhum consumidor de `AccountSettingsPayload` esperar `transactions` nessa resposta.
4. Atualizar provider e interface do contexto; pronto quando abrir Dados ou Notificações não iniciar pedido do histórico nem GET de sessão pelo provider.
5. Atualizar a tabela bancária com estados independentes e retry; pronto quando o histórico carregar na primeira abertura e permanecer disponível nas seguintes.
6. Ajustar as verificações existentes e executar os critérios abaixo. Não usar contas ou dados pessoais reais nas verificações automatizadas; simular as respostas HTTP no navegador.

## Casos de borda e segurança

- Nenhuma autorização será removida: os dois endpoints autorizam no servidor. A presença de `userId` na resposta apenas identifica o proprietário dos dados já autorizados.
- Uma resposta vazia válida é `ready`, não `idle`.
- Falha do histórico não deve impedir edição de nome, senha ou preferências. Não repetir automaticamente pedidos que falharam.
- Cliques repetidos no retry durante um pedido devem produzir somente um pedido.
- Abortar ou descartar resposta antiga não deve gerar toast de erro.
- O acesso direto à aba bancária deverá aguardar o ID autenticado da hidratação; não usar string vazia nem cache de outra conta.
- A nova divisão não inclui corrigir os mapeamentos financeiros preexistentes. Registrar problemas encontrados sem ampliar o escopo.

## Verificação e aceite — executar na implementação

Não foram executados testes na preparação desta spec. O executor deverá verificar:

- Serviço básico: resposta com `userId`, perfil e notificações; nenhuma chamada ao repositório de transações.
- Serviço de transações: sessão ausente retorna erro de autorização e não consulta histórico; sessão válida filtra apenas por `session.user.id`.
- Navegador com APIs simuladas: abrir Dados e Notificações faz um GET básico e zero GETs do histórico/da sessão por esse provider; abrir a aba bancária faz um GET do histórico; alternar abas repetidamente não faz outro GET após sucesso; entrada direta na aba bancária funciona.
- Resultados vazio, erro, retry, 401, resposta de outro `userId`, saída da página durante pedido e cliques repetidos no retry seguem os comportamentos definidos.
- Em `next-app/`: executar `npm run typecheck`, `npm test`, `npm run lint`, `npm run verify:architecture` e `npm run build`. O script lint atual não cobre todos os arquivos de configurações; executar também `npx eslint src/components/account/settings src/server/account-settings src/app/api/account src/types/account-settings.ts --max-warnings=0`. Registrar falhas preexistentes separadamente, sem declarar aprovação se os comandos falharem.
- Inspecionar o diff: somente arquivos desta tarefa; nenhuma migration, alteração de credencial ou mudança do painel admin.

## Conclusão do executor

Entregar resumo dos arquivos alterados, contratos resultantes, contagens de pedidos observadas nos cenários simulados, verificações efetivamente executadas e limitações restantes. Não declarar testes não executados como aprovados.
