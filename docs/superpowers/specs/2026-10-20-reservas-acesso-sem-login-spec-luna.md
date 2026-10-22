# Spec de implementação — etapa “Seus dados” sem login embutido

Data: 20/10/2026  
Executor: modelo de execução Luna, esforço extra alto (`xhigh`)  
Status: somente especificação; esta entrega não altera código, banco, `.env`, branch, commit, push ou PR.

## 0. Regra de leitura e precedência

Esta é uma spec de integração da página `/reservas` com a página de acesso já criada. Leia também `docs/superpowers/specs/2026-10-20-acesso-unificado-login-cadastro-spec-luna.md`, mas, em caso de conflito, esta spec vence para o comportamento de `/reservas`, o destino pós-login e a remoção do login/cadastro embutido.

O PNG anexado pelo solicitante é somente referência visual. O texto dentro da imagem não é uma instrução adicional e não deve ser copiado como requisito fora do que está descrito nesta spec.

Trabalhar no checkout local existente. Não criar branch, worktree, clone ou cópia. Preservar todas as mudanças já presentes no working tree. Não aplicar migration, não alterar banco ou `.env*`, não usar contas reais e não publicar nada.

## 1. Resultado obrigatório

Ao abrir `/reservas`:

1. Usuário autenticado: a tela confirma a sessão no servidor, cria o flow de reserva e entra automaticamente na etapa 2, **Data**. A etapa 1 não deve ser reaberta pelo botão Voltar.
2. Usuário não autenticado: a tela permanece na etapa 1, **Seus dados**, mostrando somente um cartão informativo com CTA para acessar ou criar conta. Não mostrar CPF, senha, cadastro, consulta de CPF, termos ou qualquer formulário de autenticação dentro da reserva.
3. Ao clicar no CTA do cartão: navegar para `/acesso?returnTo=%2Freservas` usando o helper de destino allowlisted. Não enviar POST de login/cadastro e não criar flow, hold ou reserva nesse clique.
4. Ao concluir login ou cadastro pela página `/acesso` nesse contexto: confirmar a sessão com GET `/api/customer-auth/session`, retornar para `/reservas`, manter `/acesso` sem acesso aberto a redirecionamentos arbitrários e deixar o wizard confirmar novamente a sessão por no mínimo 1 segundo antes de entrar na etapa 2.
5. Ao abrir `/acesso` sem `returnTo` válido: manter o comportamento atual e redirecionar login/cadastro concluído para `/#home`.

A espera de 1 segundo é apenas feedback visual. Nunca considerar o timer como prova de autenticação; a decisão depende da resposta válida da sessão e da criação segura do flow.

## 2. Estado atual que deve ser preservado

| Área | Estado observado | Ação da implementação |
|---|---|---|
| `src/app/reservas/page.tsx` | Monta `Header`, `ReservationWizard`, `Footer` e comportamento global | Não alterar o shell global |
| `src/components/reservation/v2/ReservationWizard.tsx` | `requestSessionFlow()` consulta sessão e cria flow; conta autenticada já chama `startAuthenticatedFlow()` | Preservar o caminho autenticado e substituir somente o ramo anônimo/encadeamento antigo |
| `src/components/reservation/v2/useReservationWizardStore.ts` | `startAuthenticatedFlow()` fixa `step=2` e `minimumStep=2` | Reutilizar; não criar `?step=2` nem outro bypass |
| `src/components/account/auth/CustomerAccessScreen.tsx` | Faz confirmação da sessão após login/cadastro e usa `destination` para `router.replace` | Reutilizar. Só ajustar se os testes demonstrarem quebra do contrato de destino |
| `src/app/acesso/page.tsx` | Lê `returnTo` e passa destino sanitizado ao screen | Não trocar o destino padrão `/#home` |
| `src/lib/customer-auth-destination.ts` | Allowlist atual inclui `/#home`, `/lista-de-reservas` e `/reservas`; `/reservas` gera `returnTo` | Manter ou completar exatamente o contrato do §4 |
| `/api/customer-auth/sign-in` e `sign-up` | Fachadas usadas pela página de acesso, com origem confiável, cookies e rate limit | Manter; não mover lógica de volta para reservas |
| `/api/customer-auth/session` | GET sem cache que representa a sessão real | Manter e usar nos dois checkpoints |
| `/api/reservations/flow` e `/api/reservations` | Exigem sessão Better Auth, vínculo do flow e cliente autenticado | Não afrouxar autorização |

O checkout está sujo com trabalho local de autenticação/recuperação. Não desfazer, reformatar ou substituir essas mudanças por conveniência.

## 3. Fluxo funcional detalhado

### 3.1 Inicialização do wizard

Em `ReservationWizard.tsx`, mantenha a função `requestSessionFlow()` como fonte do estado real:

- GET `/api/customer-auth/session` com `cache: 'no-store'`.
- Se `authenticated` com usuário válido, POST `/api/reservations/flow`; o servidor continua vinculando o flow à sessão e ao cliente autenticado.
- Se `anonymous`, não chamar `/api/reservations/flow`.
- Erro de rede, 503, JSON inválido ou resposta sem formato não pode ser tratado como usuário anônimo; exibir o estado de erro/retry existente.

Adicione uma espera mínima de apresentação no ciclo de inicialização:

```text
inicio = performance.now()
resultado = requestSessionFlow()
timer = delay(1000ms)
aguardar resultado e timer
renderizar somente depois dos dois concluírem
```

Use um helper local simples ou uma função interna; não adicionar dependência. O efeito deve ignorar respostas depois do unmount e limpar o timer. A mesma regra vale para o botão de retry da inicialização. Não criar um timer global, não usar `sleep` bloqueante e não atrasar POSTs de hold/reserva.

Estados finais:

- `authenticated`: chamar `acceptAuthenticatedFlow`, que preenche `flowId`, `attemptId`, `expectedRevision`, define o usuário e chama `startAuthenticatedFlow`. Renderizar Data/step 2.
- `anonymous`: limpar `user`, `attemptId`, `attemptRevision`, hold e dados transitórios; definir a etapa 1 e renderizar o gate do §3.2.
- erro técnico: renderizar a tela de erro existente com retry. Não redirecionar automaticamente para `/acesso`.

Se a página for aberta novamente após o acesso, esse mesmo ciclo ocorrerá de novo. O login não deve preparar flow, hold ou reserva dentro de `/acesso`.

### 3.2 Gate visual de usuário não autenticado

Criar `src/components/reservation/v2/ReservationAccessGate.tsx` como componente presentacional, sem fetch, sem sessão, sem estado de autenticação e sem dependência de `CustomerAuthStep`.

Interface obrigatória:

```tsx
export function ReservationAccessGate(): JSX.Element
```

O componente deve usar `Link` de `next/link` com `href={customerAuthHref('/reservas')}`. Não usar `window.location`, `router.push` nem construir query manualmente no JSX.

Conteúdo semântico recomendado, alinhado à referência:

- ícone de usuário em traço dourado, preferencialmente `UserRound` de `lucide-react`, com `aria-hidden="true"`;
- título: `Acesse sua conta para continuar`;
- texto: `Para fazer sua reserva, é necessário estar logado em sua conta. Se você já é cliente, faça seu login. Se ainda não tem uma conta, crie seu cadastro em poucos passos e continue sua reserva.`;
- CTA: `Entrar ou criar conta`, acompanhado de seta `ArrowRight` decorativa;
- CTA deve ser um link acessível, com foco visível e área de toque adequada.

O gate não deve exibir CPF, senha, email, data de nascimento, aceite de termos, senha fraca, `Esqueci minha senha`, consulta de existência de CPF ou mensagens de login/cadastro.

### 3.3 Integração do gate ao wizard

Em `ReservationWizard.tsx`:

1. Remover o import de `CustomerAuthStep`.
2. No mapa de conteúdo da etapa 1, montar somente `<ReservationAccessGate />`.
3. Remover `onAuthenticated` da cadeia de props `WizardContentProps`, `WizardContent`, `WizardStepContent`, `ReservationForm` e `ReservationShell`, pois a etapa 1 não autentica mais.
4. Remover o callback local `onAuthenticated` se ele ficar sem consumidor. A autenticação inicial continua sendo responsabilidade do efeito de inicialização; o acesso retorna por navegação para montar o wizard novamente.
5. Preservar `acceptAuthenticatedFlow`, checkpoints, holds, confirmação, replay, idempotência e a ação Voltar das etapas 2–5.
6. Para perda de sessão durante o wizard, preservar todos os resets atuais e trocar apenas o destino final para `customerAuthHref('/reservas', reason)`, com `reason` `expired` ou `changed`.

Não renderizar o gate antes da conclusão do estado `checking`; durante o carregamento, manter uma mensagem clara como `Confirmando seu acesso…`. Isso evita que o usuário veja o cartão anônimo por um instante quando já está autenticado.

## 4. Contrato de navegação e segurança de destino

`src/lib/customer-auth-destination.ts` deve permanecer sem React, sem acesso a banco e sem leitura de cookies.

Contrato exato:

```ts
export type CustomerAuthDestination = '/#home' | '/lista-de-reservas' | '/reservas';

export function resolveCustomerAuthDestination(value: unknown): CustomerAuthDestination;

export function customerAuthHref(
  destination: CustomerAuthDestination,
  reason?: 'expired' | 'changed',
): string;
```

Regras:

- sem `returnTo` ou com valor inválido, destino é `/#home`;
- somente o literal `/reservas` pode retornar ao wizard;
- somente o literal `/lista-de-reservas` pode retornar à lista;
- `customerAuthHref('/reservas')` deve produzir `/acesso?returnTo=%2Freservas`;
- com motivo, acrescentar `auth=expired` ou `auth=changed` com `URLSearchParams`;
- rejeitar arrays, valores duplicados, URLs absolutas, `//host`, `javascript:`, barras invertidas, query/hash embutidos, barra final, variantes de caixa e valores codificados duas vezes;
- não aceitar `next`, `redirect`, `callbackURL`, `flowId`, `userId`, CPF, email ou qualquer parâmetro não allowlisted;
- usar `router.replace(destination)` somente depois da confirmação da sessão no `CustomerAccessScreen`.

Casos obrigatórios:

| Entrada | Resultado após autenticar |
|---|---|
| `/acesso` | `/#home` |
| `/acesso?modo=cadastro` | `/#home` |
| `/acesso?returnTo=%2Freservas` | `/reservas` |
| `/acesso?returnTo=%2Flista-de-reservas` | `/lista-de-reservas` |
| `/acesso?returnTo=https://exemplo.invalid` | `/#home` |
| `/acesso?returnTo=%2Freservas&returnTo=%2Flista-de-reservas` | `/#home` |
| `/acesso?returnTo=%2Freservas&auth=expired` | `/reservas` após mostrar a mensagem permitida |

Não alterar o comportamento normal do menu da conta nem fazer o menu começar a enviar para `/reservas`. O contexto de reserva existe somente no link do gate, no redirect de perda de sessão e nos testes correspondentes.

## 5. UI Spec da referência anexada

### 5.1 Overall layout

- Referência: 1672×941 px, desktop, captura de página inteira.
- Fundo preto contínuo e Header global no topo.
- Conteúdo de reserva centralizado abaixo do Header: eyebrow, título, stepper de cinco etapas e cartão da etapa atual.
- O cartão do gate ocupa a largura do cartão de reserva existente, com borda dourada fina, fundo escuro e cantos arredondados; não criar uma segunda página ou um modal.
- No mobile, manter a ordem Header → título → stepper → gate, com padding lateral seguro e CTA em largura total.

### 5.2 Color palette aproximada

| Papel | Valor aproximado | Uso |
|---|---|---|
| Fundo | `#000000` | Canvas da reserva |
| Superfície | `#080806` / `#0B0A08` | Cartão do gate |
| Dourado principal | `#D3B97B` | Bordas, ícone, stepper ativo |
| Dourado claro | `#F1D093` / `#FFD66B` | Foco e CTA habilitado |
| Texto principal | `#FFFFFF` | Título e CTA contrastante |
| Texto de apoio | `rgba(255,255,255,.70)` | Parágrafo e labels futuros |
| Azul acinzentado | `#B7C7D2` aproximado | Linguagem de apoio observada na referência |

Reutilizar `reservation-tokens.css` e as classes existentes do wizard. Não criar novos tokens globais nem alterar a paleta da Home para atingir a referência.

### 5.3 Typography scale aproximada

| Grupo | Família | Alvo visual |
|---|---|---|
| Eyebrow | Albert Sans | caixa alta, pequeno, tracking amplo |
| Título | Cormorant Garamond | display grande, peso regular |
| Stepper | Albert Sans | labels compactos, caixa alta |
| Título do gate | Cormorant Garamond | cerca de 38–44 px no desktop, reduzir no mobile |
| Texto do gate | Albert Sans | cerca de 18–22 px na referência, com line-height confortável |
| CTA | Albert Sans | semibold, alto contraste e seta alinhada |

Os valores são referência, não autorização para alterar a escala das outras etapas. Conferir fontes realmente carregadas e ajustar somente o componente do gate se houver quebra.

### 5.4 Spacing e componentes

- Espaçamento do conteúdo deve seguir o wizard atual; não usar posicionamento absoluto para alinhar o cartão.
- Ícone central em círculo com borda dourada, aproximadamente 96–104 px na referência; em mobile reduzir sem perder a área visual.
- Título centralizado abaixo do ícone; texto com no máximo três linhas no desktop e fluxo natural no mobile.
- CTA ocupa quase toda a largura interna do cartão, com altura confortável, fundo/gradiente dourado e texto escuro.
- O cartão deve crescer com o conteúdo; não usar altura fixa.
- Estados de hover, active, focus-visible e reduced-motion devem respeitar os padrões existentes do site.
- Todos os links e ícones devem ter nome acessível; não depender somente da cor para indicar foco ou ação.

## 6. Remoção segura do fluxo antigo

Depois que a nova integração estiver montada e os consumidores forem atualizados:

1. Remover `CustomerAuthStep.tsx` se `rg` confirmar que não há consumidor em `src` ou testes ativos.
2. Remover `TermsModal.tsx` da pasta de reserva somente se o mesmo scan confirmar que ele era usado exclusivamente pelo `CustomerAuthStep`. O modal de termos da página `/acesso` (`CustomerTermsModal`) permanece.
3. Remover do teste de navegação da reserva os mocks e cenários de `/api/customer-auth/lookup`, sign-in e sign-up embutidos na reserva. Substituir por asserts de que esses endpoints não foram chamados.
4. Manter `/api/customer-auth/lookup/route.ts` como resposta explícita `410 endpoint_retired` enquanto houver contrato/teste de compatibilidade. Ele não deve ler body, consultar banco ou enumerar CPF. Não recriar lookup para “facilitar” o gate.
5. Não remover `signInCustomer`, `signUpCustomer`, `findCustomerAccountByCpf`, `getCustomerSession`, schemas, rate limits, Better Auth ou recuperação de senha: todos continuam sendo usados pela página `/acesso`, lista, menu ou recuperação.
6. Não mover autenticação para `localStorage`, não criar JWT manual, não aceitar `userId/customerId` do browser e não expor serviço Better Auth genérico.
7. Não alterar a autorização server de `/api/reservations`, `/api/reservations/flow`, `/api/reservations/hold`, `/api/reservations/my` ou da lista. O redirect é UX; o servidor continua decidindo acesso.

Ao final da limpeza, estes textos não podem existir em componentes ativos de `/reservas`: `reservation-cpf`, `reservation-password`, `Acessar conta`, `Criar conta e continuar`, `customer-auth/lookup`, `customer-auth/sign-in` ou `customer-auth/sign-up`.

## 7. Arquivos e lotes de implementação

### Lote 0 — preflight

- Sincronizar CodeGraph e confirmar `git status`.
- Ler os consumidores atuais com CodeGraph antes de buscas amplas.
- Conferir o contrato da página `/acesso` e do helper de destino.
- Confirmar que a referência tem 1672×941 e que ela será usada apenas para aparência.
- Rodar baseline dos testes direcionados sem alterar arquivos.

### Lote 1 — contrato de destino e gate

- Completar/verificar `customer-auth-destination.ts` conforme §4.
- Criar `ReservationAccessGate.tsx` conforme §3.2.
- Adicionar estilos somente no escopo do wizard, reutilizando tokens e classes de reserva.
- Ainda não deletar componentes antigos antes de trocar o consumidor.

### Lote 2 — wizard e espera mínima

- Alterar `ReservationWizard.tsx` conforme §3.1 e §3.3.
- Remover o encadeamento `onAuthenticated` que ficou sem função.
- Garantir que o ramo anonymous renderiza o gate e não redireciona.
- Garantir que o ramo authenticated continua entrando em Data com `minimumStep=2`.
- Implementar timer cancelável de 1000 ms junto da verificação real.

### Lote 3 — limpeza e testes

- Remover o componente antigo e o modal antigo somente após scan de consumidores.
- Atualizar testes de reserva para não mockar autenticação embutida.
- Criar/atualizar testes de destino, gate, retorno contextual, espera mínima e ausência de chamadas auth na reserva.
- Manter testes de Data, Pessoas, Preferências, Confirmação, hold, replay, idempotência e perda de sessão.

### Lote 4 — revisão de segurança e visual

- Auditar `rg` de endpoints antigos e props removidas.
- Auditar headers/origem/cookies/rate-limit sem ampliar permissões.
- Capturar referência de implementação e crops do gate; comparar desktop e mobile.
- Só depois executar a suíte proporcional e o build.

## 8. Testes e critérios de aceite

### 8.1 Navegação e estado

| ID | Cenário | Aceite |
|---|---|---|
| R01 | `/reservas` com sessão anônima | Após a inicialização, etapa 1 visível, gate visível, nenhum formulário de auth |
| R02 | Gate anônimo | CTA tem href `/acesso?returnTo=%2Freservas`; clique não chama flow/hold/reserva |
| R03 | `/reservas` autenticado | GET sessão + flow; etapa 2 visível; Voltar não retorna à etapa 1 |
| R04 | Login pelo gate | Acesso recebe `returnTo=/reservas`; sucesso retorna `/reservas`; wizard aguarda pelo menos 1000 ms e confirma sessão antes de Data |
| R05 | Cadastro pelo gate | Mesmo comportamento de R04; não há POST de login duplicado pelo cliente |
| R06 | Login normal | `/acesso` sem contexto continua retornando para `/#home` |
| R07 | Acesso já autenticado | `/acesso?returnTo=/reservas` substitui pela reserva; `/acesso` simples mantém destino Home |
| R08 | Sessão indisponível | Não vira anonymous, não abre gate e mostra retry de erro |
| R09 | Perda no meio da reserva | Mantém reset atual e vai para acesso contextual com `auth=expired|changed` |
| R10 | Regressão | Data/Pessoas/Preferências/Confirmação, holds e submissão continuam funcionando com identidade server-side |

### 8.2 Limpeza e segurança

| ID | Cenário | Aceite |
|---|---|---|
| S01 | Scan de componentes | Nenhum import ativo de `CustomerAuthStep`; nenhum formulário de login/cadastro em `/reservas` |
| S02 | Endpoint lookup | POST continua 410 sem repository/DB e não é chamado pelo browser da reserva |
| S03 | Destino malicioso | URL absoluta, host, `javascript:`, arrays, duplicados, query/hash e valores codificados duas vezes caem em `/#home` |
| S04 | APIs de reserva | Flow/hold/submissão continuam exigindo sessão e vínculo do flow; nenhum ID de identidade vem do payload do cliente |
| S05 | Auth existente | Login/cadastro/recuperação continuam usando cookies, origem confiável, rate limit e mensagens genéricas |
| S06 | Dados sensíveis | CPF, senha, email, cookies e tokens não aparecem em URL, logs, analytics ou `localStorage` |

### 8.3 Verificação visual

Capturar e inspecionar de verdade, não apenas gerar:

- `/reservas` anônimo em 1672×941, incluindo viewport completo e crop do cartão;
- `/reservas` autenticado em viewport comparável, confirmando stepper na etapa 2;
- gate em 390×844 e 320×740;
- foco de teclado no CTA, hover desktop e estado de carregamento;
- uma largura intermediária/constrangida, por exemplo 768×650, para verificar quebra e ausência de overflow.

Conferir: Header inalterado, cartão dentro da borda, ícone e CTA alinhados, texto sem clipping, stepper sem sobreposição, botão com área de toque, scroll natural e ausência de campos antigos. Não declarar fidelidade pixel-perfect; a imagem é referência de linguagem visual e composição.

## 9. Comandos mínimos após implementação

Executar a partir de `next-app/`, sem alterar configuração para esconder falhas:

```text
node --test tests/customer-auth-destination.test.mjs tests/customer-auth-schema.test.mjs
npm run typecheck
npm run lint
npm run verify:complexity
npm run verify:architecture
npm run verify:lockfile
npm test
npm run build
git diff --check
```

Executar os testes Playwright direcionados existentes e os novos com mocks que abortem endpoints desconhecidos. Se a integração real de cookies/SQL não puder ser feita em base descartável, marcar como pendente; nunca usar o banco pessoal para provar o fluxo.

## 10. Definition of done

- Usuário anônimo vê o gate na etapa 1 e só vai para `/acesso` ao clicar.
- `/acesso` mantém `/#home` como padrão e só retorna a `/reservas` com `returnTo` allowlisted.
- Login/cadastro não são renderizados nem chamados dentro da reserva.
- Retorno autenticado aguarda no mínimo 1 segundo de forma cancelável e confirma sessão real antes de Data.
- Usuário autenticado que abre `/reservas` entra em Data e não volta para Seus dados.
- Autorizações server-side, cookies, origem, rate limits, flow, holds e submissão permanecem protegidos.
- Componentes antigos são removidos somente após confirmação de que não têm consumidores; o endpoint lookup aposentado não é reativado.
- Testes de fluxo, limpeza, segurança e screenshots/crops listados foram realmente executados e reportados com limitações honestas.

Ao entregar, relatar arquivos alterados/removidos, testes e comandos executados, screenshots/crops realmente inspecionados e qualquer pendência. Atualizar a memória Obsidian com fatos duráveis; a ferramenta `ai-memory` não está exposta nesta sessão e não deve ser simulada.
