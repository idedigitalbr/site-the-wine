# SPEC DE EXECUÇÃO — `/lista-de-reservas` — Luna

**Revisão:** 19/10/2026. **Executor:** Luna, esforço extra alto (`xhigh`).
**Estado:** implementação autorizada; esta revisão documental deve ser apresentada antes de retomar a implementação.
**Projeto:** `C:/Users/Windows/Desktop/The Wine`; aplicação `next-app/`.
**Baseline conferida:** checkout `main`, HEAD `a3a11ca`, 319 commits; alterações locais preexistentes. O disco atual prevalece sobre esta baseline.
**Substitui integralmente:** `2026-10-19-lista-de-reservas-spec-gemini-3-8.md`.

## 0. Contrato, limites e decisões fechadas

Entregar a página de consulta das reservas da conta autenticada em `/lista-de-reservas`, substituindo o hub de `/area-de-reservas`. Os campos devem vir das reservas persistidas, e o visual deve acompanhar o Anexo 2. Reutilizar a navbar compartilhada. O botão Reservas do menu da conta passa a abrir a lista. O card Adicionar reserva leva a `/reservas`.

**Acesso restrito:** somente usuários com sessão válida podem acessar a página. Cada usuário pode consultar exclusivamente as reservas feitas em sua própria conta. Proteger tanto a rota da página quanto cada chamada da API no servidor; ocultar o link no menu não é controle de acesso.

Esta tarefa é de **consulta e navegação**. Não implementar edição, cancelamento, pagamento, detalhes ao clicar no card, filtros, abas, cadastro de reserva alternativo ou migração de dados históricos. Os botões Editar do Anexo 1 pertencem à confirmação do wizard; não aparecem nos cards da lista.

### 0.1 Regras de execução

1. Usar o checkout existente. Não criar/trocar branch, worktree ou clone. Não fazer commit, push, PR, deploy ou migration sem outra ordem explícita.
2. Registrar `git status --short --branch` antes e depois. Preservar staged, unstaged, untracked, `.env*`, configurações de conta e alterações do wizard. Não restaurar arquivos inteiros a partir de HEAD. Não executar reset/clean.
3. Não instalar dependências. Reutilizar Next, React, Lucide, MySQL, Better Auth e a infraestrutura de testes existentes.
4. Sincronizar CodeGraph e consultar os símbolos envolvidos antes das alterações. Ler `next-app/AGENTS.md`, `.agents/AGENTS.md` e os guias relevantes da versão instalada de Next em `node_modules/next/dist/docs/`.
5. Usar `ui-from-image` para comparação visual e `screenshot-to-modular-code` para execução modular, alimentadas por esta UI Spec única. Não produzir duas implementações.
6. Não despachar subagentes apenas porque o documento menciona Luna. O executor desta spec é o Luna responsável pelo chat.
7. Não modificar o schema, a política de senha, os tokens de autenticação, a criação de reservas, os holds, a alocação, a idempotência, a preparação de flow ou a política de confirmação.
8. API de reservas não importa `mysql2`, `@/server/db` ou `/infrastructure/`. As dependências concretas ficam em `src/server/`. Funções novas/alteradas mantêm complexidade máxima 8 e profundidade máxima 3.
9. Os contratos de dados, segurança, rotas, estados e ordenação são normativos. Valores visuais são ponto inicial para calibração no navegador: ajustar somente o CSS local quando a comparação mostrar divergência. Não tratar números estimados do raster como medições da implementação.
10. Executar por lotes. Não alterar controles de qualidade para fazer um erro desaparecer. Registrar falhas anteriores e novas separadamente, sem ampliar a tarefa para corrigir todo o projeto.

### 0.2 Autenticação existente e independência das páginas futuras

**Correção de escopo do usuário:** `/acesso` e `/cadastro` serão implementadas posteriormente e **não são pré-requisitos desta lista**. O fluxo atual já permite criar conta, fazer login e manter sessão ativa. Reutilizar essa sessão e sua validação no servidor para consultar as reservas.

Antes de implementar, conferir os contratos atuais de sessão, vínculo da conta ao cliente e consulta autorizada. A ausência das páginas dedicadas não interrompe o lote 0. A lista deve funcionar para uma sessão válida obtida pelo fluxo atual, independentemente de onde o usuário fez login.

- Não implementar nem refatorar login/cadastro nesta tarefa. Preservar o fluxo atual e o provedor de sessão existente.
- Sem sessão na página ou em 401 da API, negar acesso conforme §1.2 e encaminhar ao fluxo atual em `/reservas`. Não redirecionar para páginas ainda ausentes nem interpretar 401 como lista vazia.
- A integração futura com `/acesso`, `/cadastro` e `returnTo` está documentada em §1.4; fica fora dos lotes e do aceite desta execução.
- Não adicionar login embutido, armazenamento de destino em localStorage, middleware ou outro provedor de sessão.

### 0.3 Escopo verificado e limites de conhecimento

- O POST de reserva existente já deriva `customer.id` e `userId` da sessão/flow, e persiste `reservations.customer_id`. A lista não deve reenviar os dados do wizard nem consultar seu store.
- `customers.auth_user_id` é único. Buscar o cliente da conta é suficiente para consultar suas reservas vinculadas.
- Clientes históricos com `auth_user_id IS NULL` não pertencem automaticamente à conta atual. Não buscar por nome, e-mail, telefone ou CPF para preencher a lista.
- `authJson` já envia `Cache-Control: no-store, max-age=0` e `Pragma: no-cache`. Reutilizar em sucesso e erro.
- As imagens foram inspecionadas na revisão documental. A página proposta não foi renderizada; não há fidelidade de implementação comprovada.

## 1. Fluxos e comportamento

### 1.1 Fluxo principal

```text
Menu da conta → /lista-de-reservas
  → validar sessão no servidor antes de renderizar a lista
     sem sessão → redirect('/reservas') → fluxo atual de autenticação
     sessão válida → renderizar lista → GET /api/reservations/my?offset=0
     200 → lista da conta + Adicionar reserva [+ Carregar mais se houver]
     401 → limpar cards/offset, invalidar respostas pendentes e replace('/reservas')
     erro HTTP/rede/JSON → erro com Tentar novamente, sem tratar como anonimato

Usuário faz login pelo fluxo atual → retorna à lista → consulta com sessão existente

/area-de-reservas → redirect('/lista-de-reservas')
Adicionar reserva → /reservas → fluxo existente
Voltar → / (destino explícito; não router.back())
```

### 1.2 Proteção da página e isolamento da conta — contrato desta execução

- A page server deve ser assíncrona e validar a sessão usando o serviço existente antes de renderizar `ReservationsListView`. Sem sessão ou com user.id vazio, executar `redirect('/reservas')`, onde o fluxo atual permite autenticar. Não renderizar a lista para visitantes anônimos, inclusive por URL direta ou recarga.
- Consultar a sessão da requisição atual; não armazenar decisão de acesso nem dados por usuário em cache compartilhado ou geração estática. Validar também navegação interna e retorno pelo histórico. A proteção da page não substitui a autorização do endpoint em cada GET.
- Em 401 inicial, de paginação ou revalidação, invalidar a geração, abortar requisições pendentes, limpar cards, offset e erros e executar `router.replace('/reservas')`. Durante a saída, mostrar somente feedback neutro de redirecionamento, sem cards ou controles da lista. Não oferecer estado público com Verificar acesso novamente.
- Falha técnica ao verificar sessão não equivale a anonimato: não renderizar a lista nem redirecionar como se fosse logout; apresentar erro controlado com possibilidade de repetir a verificação. Manter `redirect` fora do catch que trata indisponibilidade, pois Next implementa redirecionamento por exceção de controle.
- A identidade vem exclusivamente da sessão validada: `session.user.id → customers.auth_user_id → customers.id → reservations.customer_id`. Não aceitar userId/customerId fornecidos pelo navegador nem buscar reservas por CPF/e-mail/telefone. Conta A nunca recebe reservas da conta B, mesmo manipulando a URL ou a chamada direta da API.
- Conta autenticada sem reservas recebe lista vazia; conta sem customer vinculado também recebe lista vazia. Não provisionar cliente nem associar reservas históricas automaticamente nesta consulta.
- O guard da página e a API não fazem login nem criam flow, hold ou reserva. O destino `/reservas` mantém seu fluxo existente, acionado depois da navegação. Não adicionar retorno automático à lista nem alterar o wizard nesta tarefa.

### 1.3 Estados da lista e revalidação

| Estado | Conteúdo e ações |
|---|---|
| Primeira carga/revalidação | Navbar, Voltar, região `role=status` com Carregando suas reservas…; não manter cards antigos visíveis |
| Pronto, zero itens | Mensagem Você ainda não tem reservas. + card Adicionar reserva |
| Pronto, um ou mais itens | Cards recebidos na ordem da API; Adicionar reserva é o último item da grade |
| Mais itens disponíveis | Botão Carregar mais abaixo da grade, fora dela, somente se `nextOffset !== null` |
| Carregando mais | Preservar os cards atuais, desabilitar botão, texto Carregando… e impedir duplo envio |
| Falha inicial | Alerta Não foi possível carregar suas reservas agora. Tente novamente. + Tentar novamente |
| Falha em carregar mais | Preservar lista, alerta local e botão Tentar carregar mais; não perder offset |
| Sessão inválida (401) | Apagar cards/offset, invalidar respostas e encaminhar a /reservas conforme §1.2 |

Implementar no hook `useCustomerReservations`:

1. Uma única chamada ao endpoint da lista na carga do hook; não chamar separadamente `/api/customer-auth/session` no cliente. O guard da page valida acesso no servidor antes de renderizar; o endpoint autoriza independentemente cada GET.
2. Fetch com `cache:'no-store'`, `credentials:'same-origin'`, `Accept: application/json` e AbortSignal.
3. Estado inicial loading. Ler/classificar HTTP antes de JSON; erro HTTP não pode virar lista vazia. JSON inválido é erro controlado.
4. Validar o envelope e **cada item** com o schema de §3, não apenas `Array.isArray`.
5. Usar `useRef` para lock síncrono de requisição e número de geração. Ao iniciar uma nova carga da primeira página, abortar a anterior e incrementar a geração. Uma resposta só altera estado se pertence à geração vigente. Cleanup aborta e invalida respostas, incluindo Strict Mode.
6. Separar funções curtas: `fetchPage`, `classifyResponse`, `replaceFirstPage`, `appendNextPage`, `handleUnauthorized` e instalação dos eventos. Não juntar todos os ramos num efeito gigante.
7. Retry inicial e revalidação reiniciam em offset 0, sem acumular dados antigos. Carregar mais usa somente `nextOffset` retornado; a resposta deve ter nextOffset nulo ou maior que o offset pedido.
8. Ao anexar, deduplicar por id preservando ordem da API. Offset não é snapshot de banco: inserções/remoções entre páginas podem mudar posições; revalidação reinicia a consulta. Não prometer consistência de snapshot.
9. Ao voltar o foco para a janela ou tornar o documento visível, descartar os cards e revalidar a primeira página. Coalescer eventos enquanto uma revalidação já estiver pendente. Em falha, exibir erro sem os dados anteriores. Não iniciar polling.
10. A expiração/logout em outra aba será percebida na próxima revalidação ou chamada. Não afirmar revogação instantânea de conteúdo já exibido numa aba inativa. O servidor sempre verifica sessão em cada GET.
11. `AbortError` e respostas invalidadas não geram mensagem de erro. Erro de rede/503 não redireciona.

### 1.4 Integração futura com login/cadastro — fora desta execução

Quando a spec `2026-10-17-autenticacao-dedicada-login-cadastro-luna.md` for implementada, ela integrará o retorno à lista. Esta seção preserva o contrato futuro; não autoriza criar essas telas ou seu helper nesta tarefa e não bloqueia o aceite da lista.

- Criar/reutilizar `src/lib/customer-auth-destination.ts` naquela execução, com destino restrito a `/reservas` ou `/lista-de-reservas`.
- Somente o valor literal único `/lista-de-reservas` é aceito em `returnTo`. Ausência, array, parâmetro duplicado, URL externa, `//host`, query/hash/barra final e outros valores resultam em `/reservas`.
- As pages server aguardam `searchParams`, validam o destino e o passam ao `CustomerAccessScreen`. Links Entrar/Criar conta preservam somente o destino validado; login/cadastro e acesso já autenticado usam `router.replace(destination)`.
- Após as duas páginas e o retorno estarem funcionais e verificados, trocar o destino anônimo do guard e do handler de 401 de `/reservas` para `/acesso?returnTo=/lista-de-reservas`, mantendo proteção no servidor e limpeza dos dados antes de navegar. Não selecionar o comportamento por tentativa de fetch/404 nem introduzir flag ou detecção de rotas no runtime.
- Sem `returnTo`, o destino continua `/reservas`. Login/cadastro dedicados não preparam flow, hold ou reserva. Credenciais não vão à URL; recuperação de senha e parâmetros informativos continuam regidos pela spec própria.
- Os testes de retorno entre telas e à lista pertencem à futura execução de autenticação, incluindo regressão do comportamento sem `returnTo`.

## 2. UI Spec única

Referências mantidas em `docs/superpowers/specs/assets/lista-de-reservas-2026-10-19/`:

- `01-campos-dados-reserva.png`: **492 × 273**, confirmação do wizard; referência de significado dos dados.
- `02-referencia-visual-lista-de-reservas.png`: **1024 × 640**, referência de composição da nova página.

### 2.1 Overall layout

- Fundo preto, navbar compartilhada fixa, botão Voltar acima da grade, duas colunas no desktop, uma abaixo de 860px. Sem footer ou menu flutuante adicional nesta página.
- `Header`, `MobileNavigation` e `SiteBehaviorController` existentes. Importar `../../../public/style.css` na page, como as páginas públicas atuais.
- **A navbar compartilhada prevalece sobre os pixels do mockup.** Não alterar seu logo, escala, altura, breakpoint, CTA ou CSS para aproximar a referência. Única correção compartilhada desta tarefa: Localização → `/#localizacao` em `src/config/navigation.ts`.
- Main: caixa externa até 936px, padding horizontal 24px. Em 1024px, conteúdo aproximado x=68..956, largura 888; grade com gap 22px, cards de 433px. Padding superior 114px e Voltar de 30px com margem inferior 20px dão primeiro card aproximadamente y=164 (referência y=163).
- Cards de reserva no fluxo natural, sem height/max-height que corte texto. A primeira linha da referência ocupa aproximadamente y=163..348; segunda inicia y=369.
- CTA Adicionar reserva é mais baixo que a reserva vizinha: referência aproximadamente x=525..955, y=381..523. Usar altura inicial 142px e `align-self:center`; **não** `height:100%` nem min-height 186px.
- Não centralizar verticalmente toda a lista em `100vh`. Rolagem vertical natural, inclusive com dezenas de cards e em janelas baixas.
- Desktop maior: conservar largura legível máxima; não ampliar tipografia/cards proporcionalmente à tela nem usar zoom/transform de wrapper.

### 2.2 Color palette

Estimativas visuais iniciais; calibrar pelo Anexo 2 e manter tokens locais quando diferirem dos existentes.

| Papel | Valor inicial | Uso |
|---|---|---|
| Canvas | `#000000` | página |
| Superfície | `#050503` | reserva |
| Dourado | `#E5C158` | ícones e controles |
| Texto principal | `#F2EFE9` | valores |
| Texto secundário | `#6E859B` | labels |
| Borda | `rgba(211,185,123,.42)` | card |
| Divisor | `rgba(211,185,123,.16)` | linhas internas |
| Foco | `#F1D093` | outline 2px, offset 3px |

### 2.3 Typography scale

Reutilizar Albert Sans e Cormorant Garamond já carregadas. Definir line-height, peso e tracking locais para não herdar `body` 300/1.7/0.04em inadvertidamente.

| Grupo | Fonte | Tamanho/linha inicial | Peso |
|---|---|---|---|
| Título Reserva | Cormorant Garamond | 16/18px | 500 |
| Label de campo | Albert Sans | 9/11px | 500 |
| Valor de campo | Albert Sans | 10/13px | 500 |
| Badge | Albert Sans | 9/11px | 500 |
| Voltar | Albert Sans | 11/14px | 500 |
| Adicionar reserva | Cormorant Garamond | 20/23px | 500 |
| Feedback/erro | Albert Sans | 14/20px | 400 |

A referência desktop é compacta. Os tamanhos acima são estimativas, não fonte comprovada do desenho. Em mobile até 560px usar labels 12/16 e valores 14/20, com fluxo vertical para leitura. Não reduzir a página inteira para forçar fidelidade. Inspecionar contraste e texto real antes do aceite.

### 2.4 Spacing system

- Grade: gap horizontal 22px, vertical 21px.
- Card: padding horizontal 15px; borda 1px; raio inicial 6px, acompanhando o raster.
- Cabeçalho: altura mínima 42px; ícone 19px, gap 14px para título; badge à direita.
- Linha Data/Horário/Duração: padding vertical 9px; três colunas em desktop. Pessoas/Preferências: padding vertical 9px, duas colunas. Observações: padding vertical 9px.
- Ícones de campo: 18px, stroke 1.6; ícone e cópia separados por 14px. Nas colunas estreitas, gap 10px e divisor com padding esquerdo 16px.
- Não forçar todos os cards à mesma altura com texto cortado. Dentro de cada linha da grade o stretch é permitido, preservando o CTA com altura própria.

### 2.5 Component inventory e módulos

| Módulo | Responsabilidade/entrada | Arquivo |
|---|---|---|
| Header existente | Navegação compartilhada; não duplicar | `src/components/layout/Header.tsx` |
| ReservationsListPage | Guard de sessão no servidor, metadata, CSS legado, Header, View e behaviors | `src/app/lista-de-reservas/page.tsx` |
| ReservationsListView | Main, H1 acessível, Voltar, estados, grade e paginação | `src/components/account/reservations-list/ReservationsListView.tsx` |
| ReservationCard | `reservation: CustomerReservationItem`; somente leitura | `.../ReservationCard.tsx` |
| ReservationField | Ícone Lucide, label e value; sem lógica de banco | `.../ReservationField.tsx` |
| ReservationStatusBadge | `status: ReservationStatus`; texto e ícones conforme §3 | `.../ReservationStatusBadge.tsx` |
| AddReservationCard | Link integral /reservas, círculo e Plus | `.../AddReservationCard.tsx` |
| useCustomerReservations | Fetch, paginação, retry, cancelamento e revalidação | `.../useCustomerReservations.ts` |
| Formatadores | Funções puras de data, quantidade, preferências e observações | `.../reservationCardFormatters.ts` |
| CSS Module | Todos os estilos novos isolados | `.../ReservationsList.module.css` |

### 2.6 Interaction hints

- Cards de reserva não são clicáveis; não adicionar cursor pointer, botões de edição ou links de detalhes.
- Voltar, Adicionar reserva, Carregar mais e retry são as únicas ações novas da lista autenticada.
- Foco visível, links com nome acessível, ícones decorativos `aria-hidden`. H1 Lista de reservas pode ser sr-only para preservar o mockup.
- `article` com aria-label `Reserva em {data} às {hora}`; header com H2 Reserva; labels/valores podem usar `dl/dt/dd` com reset de margens.
- Loading com `role=status`, erros com `role=alert`, mensagem vazia explícita. Não usar aria-live na grade inteira durante paginação.
- Hover discreto somente nos controles habilitados e sob `(hover:hover) and (pointer:fine)`; reduzir animações com `prefers-reduced-motion`.

### 2.7 Uncertainties e autoridade

- Só existe referência desktop. Mobile é adaptação decidida aqui: uma coluna da grade abaixo de 860px; campos empilhados até 560px; sem ocultar valores ou mostrar reticências.
- Alturas, fonte e cor de pixels são estimadas; geometria final deve ser calibrada por screenshot. Divergência da navbar compartilhada deve ser registrada como exceção aceita, sem override local.
- Preferências/observações longas expandem o card; `overflow-wrap:anywhere`, sem line-clamp. Nunca usar texto fictício para preencher registros ausentes.

## 3. Contrato de dados

### 3.1 Mapeamento persistido → card

| Fonte | Payload | Apresentação |
|---|---|---|
| Sessão → customers.auth_user_id → customers.id | Identidade somente no servidor | Escopo da consulta; nome/CPF/e-mail não aparecem no card |
| reservations.id | id | Chave React e deduplicação |
| reservations.reservation_date | reservationDate, YYYY-MM-DD | Data extensa pt-BR |
| reservations.start_time | startTime, HH:mm | Horário |
| end_time - start_time | durationMinutes | Duração real em minutos |
| reservations.guest_count | guestCount | 1 pessoa / N pessoas |
| reservation_special_needs.need_code | specialNeeds | Preferências traduzidas |
| reservations.notes | notes, string | Observações; não internal_notes nem dados de customers |
| reservations.status | status | Badge real conforme tabela abaixo |

Não expor hashes, token privado do portal, CPF, e-mail, telefone, notas internas ou replay. `publicCode` e `endTime` são usados internamente quando necessário, mas não precisam sair na resposta desta lista.

### 3.2 Status — única tabela normativa

| Status persistido | Texto | Variante | Ícone topo / badge |
|---|---|---|---|
| confirmed | Confirmada | confirmed | CalendarDays / CircleCheck |
| seated | Em atendimento | confirmed | CalendarDays / CircleCheck |
| completed | Concluída | confirmed | CalendarDays / CircleCheck |
| pending, payment_pending, hold, draft | Pendente | pending | FileText / Clock3 |
| cancelled | Cancelada | muted | FileText / Clock3 |
| no_show | Não compareceu | muted | FileText / Clock3 |
| expired | Expirada | muted | FileText / Clock3 |

Mostrar todos os status válidos e todas as datas da conta, inclusive passadas. Não criar filtro implícito de próximas reservas. A presença de Pendente no mockup não altera a criação atual, que confirma a reserva no fluxo existente. Holds temporários em `reservation_holds` não são reservas da lista; não unir tabelas de holds/attempts/waitlist.

### 3.3 Tipos e validação

Criar `src/types/customer-reservations.ts`:

```ts
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';

export interface CustomerReservationItem {
  id: number;
  reservationDate: string;
  startTime: string;
  durationMinutes: number | null;
  guestCount: number;
  status: ReservationStatus;
  specialNeeds: string[];
  notes: string;
}

export interface CustomerReservationsResponse {
  reservations: CustomerReservationItem[];
  nextOffset: number | null;
}
```

Criar `src/lib/customer-reservations-schema.ts`, com Zod existente. Exportar `customerReservationItemSchema` e `customerReservationsResponseSchema`. Usar `reservationStatuses` do domínio no enum. Campos: id inteiro positivo seguro; reservationDate data ISO de calendário real (`z.iso.date()` da versão instalada, verificar API local); startTime regex `^(?:[01]\d|2[0-3]):[0-5]\d$`; durationMinutes inteiro 1..1439 ou null; guestCount inteiro positivo; specialNeeds array de strings não vazias, até 40 caracteres cada; notes string até 500; nextOffset inteiro não negativo seguro ou null; reservations array de no máximo 20 itens. Não aceitar campos requeridos ausentes ou null em notes. Zod pode descartar chaves extras do envelope; não renderizá-las.

No servidor, mapear dados e validar a resposta antes de retorná-la. Status desconhecido ou dados inválidos → erro controlado 503, não cast silencioso nem status Pendente inventado. No cliente, payload inválido → erro recuperável. Não lançar erro durante render.

### 3.4 Duração, data e preferências

Criar `src/modules/reservations/domain/customer-reservation-duration.ts`:

```ts
function parseClock(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function calculateCustomerReservationDuration(
  startTime: string,
  endTime: string,
): number | null {
  const start = parseClock(startTime);
  const end = parseClock(endTime);
  if (start === null || end === null) return null;
  if (end <= start) return null;
  return end - start;
}
```

O schema atual exige `start_time < end_time`, sem janela noturna atravessando a data. Não inventar suporte à virada de dia. Dado inválido/zero/invertido → null e texto Duração não informada, nunca 120 arbitrário. Formatar `1 minuto` e `N minutos`.

Formatadores da UI:

- Data: validar formato/calendário antes de formatar; usar `Intl.DateTimeFormat('pt-BR', {day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'})` com data construída por `Date.UTC`. Comparar ano/mês/dia após construção para rejeitar normalizações como 31/02. Inválida → Data não informada. Não converter a data da reserva por timezone do navegador.
- Pessoas: 1 pessoa / N pessoas. O schema impede zero/negativo.
- Preferências: deduplicar, remover none, usar ordem fixa `accessibility`, `dietary_restriction`, `food_allergy`, `high_chair`, `reduced_mobility`, `other`, depois códigos desconhecidos em ordem lexicográfica. Esta ordem reproduz o exemplo dietary_restriction/high_chair/other. Usar o mesmo resultado independentemente da ordem do SQL.
- Traduções: accessibility=Acessibilidade; dietary_restriction=Restrição alimentar; food_allergy=Alergia alimentar; high_chair=Cadeira infantil; reduced_mobility=Mobilidade reduzida; other=Outra necessidade.
- Código desconhecido: Preferência não identificada, sem exibir código técnico; deduplicar esse rótulo. Sem códigos úteis: Nenhuma preferência informada.
- Observações: trim e fallback Sem observações adicionais. Renderizar como texto React, nunca HTML.

## 4. Arquitetura e backend

### 4.1 Inventário de arquivos

Todos os caminhos abaixo são relativos a `next-app/`.

| Ação | Caminho | Responsabilidade |
|---|---|---|
| Modificar | src/components/account/FloatingAccountMenu.tsx | Somente RESERVATIONS_PATH → /lista-de-reservas |
| Modificar | src/config/navigation.ts | Somente Localização → /#localizacao |
| Criar | src/types/customer-reservations.ts | Contrato JSON |
| Criar | src/lib/customer-reservations-schema.ts | Validação compartilhada |
| Modificar | src/modules/reservations/application/ports.ts | Interface própria CustomerReservationQueryRepository e record |
| Criar | src/modules/reservations/domain/customer-reservation-duration.ts | Cálculo puro |
| Criar | src/modules/reservations/application/list-customer-reservations.ts | Caso de uso com dependências injetadas |
| Criar | src/modules/reservations/infrastructure/mysql-customer-reservation-query.ts | Consulta parametrizada e mapeamento |
| Modificar | src/server/customer-auth/repository.ts | findCustomerIdByAuthUserId, somente SELECT |
| Criar | src/server/reservations/list-customer-reservations.ts | Composição das dependências concretas |
| Criar | src/server/reservations/customer-reservations-handler.ts | Factory GET testável com dependências injetadas |
| Criar | src/app/api/reservations/my/route.ts | GET e runtime Node; composição sem infraestrutura direta |
| Substituir composição atual | src/app/lista-de-reservas/page.tsx | Página server com metadata e navbar; substituir o hub já movido para esta rota pela lista definitiva |
| Modificar | src/app/area-de-reservas/page.tsx | redirect para rota canônica |
| Criar | src/components/account/reservations-list/* | Módulos de §2.5 |
| Criar | tests/customer-reservations-list.test.mjs | Domínio, formatação e caso de uso |
| Criar | tests/customer-reservations-api.test.mjs | Executar handler e repository com fakes controlados |
| Criar | tests/support/load-customer-reservations-module.mjs | Loader restrito de TS para testes Node sem resolver aliases de produção |
| Criar | scripts/test-customer-reservations-query.mjs | Integração SQL opt-in em schema descartável |
| Criar | tests/browser/fixtures/customer-reservations.ts | Fixture única de referência |
| Criar | tests/browser/lista-de-reservas.spec.ts | UI e estados com APIs simuladas |
| Modificar | tests/browser/floating-account-menu.spec.ts | Expectativas do menu vigente |
| Criar | playwright.customer-reservations.config.ts | Config executável desta entrega |
| Modificar | package.json; scripts/check-architecture.mjs | Abrangência de guardrails para novos caminhos |

As páginas `/acesso` e `/cadastro`, os formulários e `src/lib/customer-auth-destination.ts` ficam fora deste inventário. Sua integração será executada depois conforme §1.4. A migração de rota já realizada não conclui a entrega: substituir a composição atual do hub pela lista com dados reais. Preservar o redirect antigo e o destino atualizado do menu.

**Não adicionar método obrigatório ao ReservationPortalRepository e não modificar MysqlReservationRepository.** A consulta da conta tem interface e adapter próprios, evitando acoplar portal por token ao histórico autenticado.

### 4.2 Ports e identidade

Acrescentar a `application/ports.ts`:

```ts
export type CustomerReservationRecord = {
  id: ReservationId;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: ReservationStatus;
  specialNeeds: string[];
  notes: string;
};

export interface CustomerReservationQueryRepository {
  listByCustomerId(
    customerId: number,
    page: { offset: number; limit: number },
  ): Promise<CustomerReservationRecord[]>;
}
```

Acrescentar em `src/server/customer-auth/repository.ts`, reutilizando imports existentes:

```ts
type CustomerIdRow = RowDataPacket & { id: number };

export async function findCustomerIdByAuthUserId(userId: string): Promise<number | null> {
  const [rows] = await getDatabasePool().execute<CustomerIdRow[]>(
    'SELECT id FROM customers WHERE auth_user_id = ? LIMIT 1',
    [userId],
  );
  return rows[0] ? Number(rows[0].id) : null;
}
```

Não chamar `ensureCustomerForAuthUser` neste GET: consultar uma lista não provisiona cliente nem faz escrita.

### 4.3 Consulta MySQL

Em `mysql-customer-reservation-query.ts`, criar `MysqlCustomerReservationQueryRepository` implementando a interface nova. Importar `RowDataPacket`, `getDatabasePool`, tipos da port e `isReservationStatus`. Injetar pool opcional no construtor (`Pick<Pool,'execute'>` ou interface mínima equivalente) e obter pool real **apenas ao executar**, se nenhum foi fornecido. Não inicializar banco no import.

Usar esta consulta e estes parâmetros; `limit` é sempre 21 na composição de produção:

```sql
SELECT r.id,
       DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
       TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
       TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
       r.guest_count AS guestCount,
       r.status, r.notes,
       (SELECT GROUP_CONCAT(n.need_code ORDER BY n.need_code SEPARATOR ',')
        FROM reservation_special_needs n
        WHERE n.reservation_id = r.id) AS specialNeedsCsv
FROM reservations r
WHERE r.customer_id = ?
ORDER BY r.reservation_date ASC, r.start_time ASC, r.id ASC
LIMIT ? OFFSET ?
```

Parâmetros: `[customerId, page.limit, page.offset]`, nunca interpolados. Os valores devem ser inteiros seguros, com customerId>0, offset>=0 e limit=21 no fluxo da lista. Se o driver de teste local rejeitar placeholders de LIMIT, investigar binding/tipos do driver; não substituir por concatenação de dados externos.

Esta é uma única execução SQL para a página, sem ida ao banco por card. A subconsulta correlacionada usa a chave existente `reservation_special_needs(reservation_id,need_code)` e evita GROUP BY com colunas externas. Não alegar desempenho medido; em volume maior, uma evolução pode usar paginação por chave.

Mapeamento: converter id/guestCount para number seguro; validar status com `isReservationStatus`; notes null → ''; dividir CSV por vírgula, trim, remover entradas vazias/none. Preferências finais são ordenadas no formatador. Não buscar `details` para substituir notes: o fluxo vigente já persiste as observações em reservations.notes.

### 4.4 Caso de uso e paginação

`application/list-customer-reservations.ts` recebe `userId`, `offset` e dependências `{findCustomerIdByAuthUserId, reservations, calculateDuration}`. A função de cálculo deve ser a de §3.4, injetada pela composição para manter o módulo facilmente testável.

Algoritmo obrigatório:

1. Resolver customerId **somente** a partir de userId fornecido pelo handler autenticado.
2. Se não houver customerId, retornar `{reservations:[],nextOffset:null}` e não consultar reservas.
3. Chamar repository com `{offset,limit:21}`.
4. Se vierem 21 registros, mostrar os primeiros 20 e nextOffset=offset+20. Se vierem 0..20, nextOffset=null.
5. Mapear campos e calcular durationMinutes. Não devolver endTime ou outros campos extras.
6. Não filtrar/ordenar novamente no cliente. A consulta define ordem cronológica crescente de todas as reservas; ids desempatam datas/horários iguais.

`src/server/reservations/list-customer-reservations.ts` importa `server-only`, compõe adapter MySQL + busca de cliente + cálculo, chama o caso de uso e valida a resposta com `customerReservationsResponseSchema.parse`. Exportar `listReservationsForAuthUser(userId:string, offset:number)`.

### 4.5 Handler GET e rota

Factory `createCustomerReservationsHandler(deps)` em `src/server/reservations/customer-reservations-handler.ts` com dependências explícitas:

```ts
type HandlerDependencies = {
  getSession: (request: Request) => Promise<{ user: { id: string } } | null>;
  list: (userId: string, offset: number) => Promise<CustomerReservationsResponse>;
  json: (body: unknown, status?: number) => Response;
  reportError: (error: unknown) => void;
};
```

Factory contém somente import type, helpers puros e a função GET retornada. Não importar Better Auth, NextResponse, mysql ou composição concreta nela. Isto permite executar o handler real nos testes Node sem banco/cookies reais. Não reimplementar a regra de autorização num teste paralelo.

Ordem e resultados:

1. Dentro de try, chamar getSession(request). Sem sessão ou user.id vazio → json de erro `unauthorized`, mensagem Acesse sua conta para consultar suas reservas., status 401. Não chamar list.
2. Ler query de `new URL(request.url)`. Aceitar apenas `offset`, zero ou uma ocorrência; ausência equivale a 0. Demais chaves (inclusive customerId/userId), duplicação, vazio, sinal, decimal, notação exponencial, não dígitos ou inteiro inseguro → 400 `{error:'invalid_pagination',message:'Não foi possível ler esta página de reservas.'}`. Não passar estes parâmetros para list.
3. Chamar list(session.user.id, offset), retornar json(payload,200).
4. Qualquer exceção → reportError sem imprimir request/cookies/payload do cliente, json `{error:'reservations_unavailable',message:'Não foi possível carregar suas reservas agora.'}`,503. Não expor SQL/stack ao cliente.

Rota `src/app/api/reservations/my/route.ts`:

```ts
import { authJson } from '@/server/customer-auth/http';
import { getCustomerSession } from '@/server/customer-auth/service';
import { createCustomerReservationsHandler } from '@/server/reservations/customer-reservations-handler';
import { listReservationsForAuthUser } from '@/server/reservations/list-customer-reservations';

export const runtime = 'nodejs';

export const GET = createCustomerReservationsHandler({
  getSession: getCustomerSession,
  list: listReservationsForAuthUser,
  json: authJson,
  reportError: () => console.error('Customer reservation listing unavailable'),
});
```

Usar a sessão existente que já desabilita cookie cache. Não introduzir nova sessão nem aceitar identidade por query/body. Todas as respostas, inclusive 400/401/503, usam authJson no caminho de produção. GET não altera dados.

## 5. Frontend — composição e CSS inicial

### 5.1 Página server e legado

`src/app/lista-de-reservas/page.tsx`, sem use client. A função default será assíncrona e implementará obrigatoriamente o guard de §1.2 usando o serviço de sessão existente com os cookies/headers da requisição atual. Adaptar a assinatura real encontrada no projeto; não simular autenticação pela presença de cookie. Só após a validação retornar a composição abaixo. Este trecho ilustra a composição, não substitui o guard:

```tsx
import type { Metadata } from 'next';
import '../../../public/style.css';
import { Header } from '@/components/layout/Header';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { ReservationsListView } from '@/components/account/reservations-list/ReservationsListView';
import styles from '@/components/account/reservations-list/ReservationsList.module.css';

export const metadata: Metadata = {
  title: 'Lista de reservas | The Wine Experience',
  description: 'Consulte suas reservas no The Wine Experience.',
  alternates: { canonical: '/lista-de-reservas' },
  robots: { index: false, follow: false },
};

function AuthenticatedReservationsListContent() {
  return <div className={styles.pageWrapper}>
    <Header />
    <ReservationsListView />
    <SiteBehaviorController />
  </div>;
}
```

Em `/area-de-reservas/page.tsx`, substituir apenas o conteúdo da page por import de redirect de next/navigation e uma função default que chama `redirect('/lista-de-reservas')`. Usar redirecionamento temporário padrão; não manter a composição antiga nem duplicar Header.

### 5.2 Composição dos cards

`ReservationsListView` é client; renderiza main com H1 sr-only, topBar/Link Voltar e conteúdo de estado. No estado pronto: mensagem vazia se necessário, grade com `ReservationCard` para cada item e `AddReservationCard` por último; controles de paginação fora da grade.

`ReservationCard` recebe item validado. Montar:

```text
article.reservationCard
  header.cardHeader
    .cardTitleGroup → ícone do status + h2 Reserva
    ReservationStatusBadge
  .rowThreeCols
    ReservationField Data/CalendarDays (colFirst)
    ReservationField Horário/Clock3 (colDivider)
    ReservationField Duração/Hourglass (colDivider)
  .rowTwoCols
    ReservationField Pessoas/Users (colFirst)
    ReservationField Preferências/SlidersHorizontal (colDivider)
  .rowFullCol
    ReservationField Observações/MessageSquareMore
```

Primitiva de campo: grid ícone/cópia, label e valor em duas linhas, min-width:0. Usar `LucideIcon` para tipo do ícone e `aria-hidden=true`. Badge aplica tabela de §3.2 por mapa Record<ReservationStatus,...>; não switch extenso com vários ternários.

CTA: Link href=/reservas, aria-label=Adicionar reserva, span círculo com Plus size26/stroke1.3, texto Adicionar reserva. Não botão com onClick para navegação.

### 5.3 CSS Module inicial único

Aplicar o CSS abaixo aos componentes. Valores sujeitos apenas à calibração visual prevista em §8; não existe uma segunda tabela de medidas conflitante.

```css
.pageWrapper { min-height:100svh; background:#000; color:#f2efe9; display:flex; flex-direction:column; }
.mainContainer { flex:1; width:100%; max-width:936px; margin:0 auto; padding:114px 24px 64px; font-family:var(--font-body),sans-serif; letter-spacing:normal; line-height:1.4; }
.srOnly { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; border:0; }
.topBar { display:flex; margin-bottom:20px; }
.backButton { display:inline-flex; align-items:center; gap:7px; min-height:30px; padding:5px 16px; border:1px solid rgba(211,185,123,.65); border-radius:999px; background:#070604; color:#e5c158; font-size:11px; font-weight:500; line-height:14px; text-decoration:none; }
.cardsGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:21px 22px; align-items:stretch; }
.reservationCard { min-width:0; background:#050503; border:1px solid rgba(211,185,123,.42); border-radius:6px; padding:0 15px; display:flex; flex-direction:column; }
.cardHeader { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:42px; padding:9px 0; border-bottom:1px solid rgba(211,185,123,.16); }
.cardTitleGroup { display:flex; align-items:center; gap:14px; min-width:0; }
.cardHeaderIcon,.fieldIcon { color:#e5c158; flex-shrink:0; }
.cardTitle { margin:0; font-family:var(--font-display),serif; font-size:16px; line-height:18px; font-weight:500; letter-spacing:normal; }
.statusBadge { display:inline-flex; align-items:center; gap:5px; padding:3px 7px; border-radius:999px; white-space:nowrap; flex-shrink:0; font-size:9px; line-height:11px; font-weight:500; }
.statusBadgeConfirmed { border:1px solid rgba(211,185,123,.52); background:rgba(211,185,123,.06); color:#e2c275; }
.statusBadgePending { border:1px solid rgba(211,185,123,.45); background:rgba(211,185,123,.04); color:#d5c59b; }
.statusBadgeMuted { border:1px solid rgba(160,175,192,.35); background:rgba(160,175,192,.05); color:#9ba8b4; }
.statusBadge svg { color:currentColor; flex-shrink:0; }
.rowThreeCols { display:grid; grid-template-columns:minmax(0,1.42fr) minmax(0,1fr) minmax(0,1.06fr); align-items:center; padding:9px 0; border-bottom:1px solid rgba(211,185,123,.16); }
.rowTwoCols { display:grid; grid-template-columns:minmax(0,.39fr) minmax(0,.61fr); align-items:start; padding:9px 0; border-bottom:1px solid rgba(211,185,123,.16); }
.rowFullCol { padding:9px 0 11px; }
.colFirst { padding-right:10px; }
.colDivider { border-left:1px solid rgba(211,185,123,.16); padding-left:16px; padding-right:6px; }
.colDivider:last-child { padding-right:0; }
.fieldCell { display:grid; grid-template-columns:18px minmax(0,1fr); column-gap:14px; align-items:start; min-width:0; margin:0; }
.colDivider.fieldCell { column-gap:10px; }
.fieldIcon { margin-top:2px; }
.fieldCopy { min-width:0; display:flex; flex-direction:column; gap:2px; }
.fieldLabel { margin:0; color:#6e859b; font-size:9px; line-height:11px; font-weight:500; }
.fieldValue { margin:0; color:#f2efe9; font-size:10px; line-height:13px; font-weight:500; overflow-wrap:anywhere; }
.addReservationCard { align-self:center; width:100%; height:142px; border:1px solid rgba(226,191,102,.7); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:16px; text-decoration:none; background:radial-gradient(ellipse 85% 90% at 50% 18%,rgba(164,131,60,.46),rgba(92,74,34,.38) 48%,rgba(24,19,9,.92)),linear-gradient(180deg,#3d3116,#161108); box-shadow:inset 0 1px 0 rgba(255,224,138,.22); }
.addIconCircle { width:56px; height:56px; flex-shrink:0; border:1px solid rgba(229,193,88,.65); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#e8c971; }
.addLabel { font-family:var(--font-display),serif; font-size:20px; line-height:23px; font-weight:500; color:#f5f3ee; text-align:center; }
.feedbackBox { min-height:150px; padding:24px; border:1px solid rgba(211,185,123,.32); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:#c2bdb4; font-size:14px; line-height:20px; text-align:center; }
.emptyMessage { margin:0 0 18px; color:#c2bdb4; font-size:14px; line-height:20px; }
.pagination { margin-top:20px; display:flex; flex-direction:column; align-items:center; gap:10px; }
.actionButton { min-height:44px; padding:8px 18px; border:1px solid rgba(211,185,123,.65); border-radius:999px; background:#0b0a08; color:#e5c158; font:500 13px/18px var(--font-body),sans-serif; cursor:pointer; }
.actionButton:disabled { opacity:.6; cursor:wait; }
.feedbackText { margin:0; color:#e2b8a8; }
.backButton:focus-visible,.addReservationCard:focus-visible,.actionButton:focus-visible { outline:2px solid #f1d093; outline-offset:3px; }
.spinner { color:#e5c158; animation:listSpin 1s linear infinite; }
@keyframes listSpin { to { transform:rotate(360deg); } }
@media (hover:hover) and (pointer:fine) {
  .backButton:hover,.actionButton:enabled:hover { border-color:#f1d093; background:rgba(211,185,123,.12); }
  .addReservationCard:hover { border-color:#f1d093; filter:brightness(1.06); }
}
@media (max-width:992px) { .mainContainer { padding-top:96px; } }
@media (max-width:859px) { .cardsGrid { grid-template-columns:minmax(0,1fr); gap:18px; } }
@media (max-width:560px) {
  .mainContainer { padding:92px 16px 48px; }
  .backButton { min-height:44px; font-size:13px; }
  .reservationCard { padding:0 14px; }
  .cardTitle { font-size:20px; line-height:24px; }
  .statusBadge { font-size:11px; line-height:14px; }
  .rowThreeCols,.rowTwoCols { grid-template-columns:minmax(0,1fr); gap:10px; }
  .colFirst { padding-right:0; }
  .colDivider { border-left:0; border-top:1px solid rgba(211,185,123,.12); padding:8px 0 0; }
  .fieldLabel { font-size:12px; line-height:16px; }
  .fieldValue { font-size:14px; line-height:20px; }
}
@media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
```

### 5.4 Limpeza segura

Depois de testar a rota canônica e o redirect, procurar referências a `reservations-hub` e ao tipo antigo por CodeGraph e busca textual quando necessário. Somente se não houver consumidor ativo, remover os quatro arquivos do hub antigo: ReservationsHub.module.css, ReservationsHubView.tsx, useReservationsHub.ts e src/types/reservations-hub.ts.

Eles são trabalho local não rastreado: antes da remoção, criar cópia recuperável somente desses arquivos em `%LOCALAPPDATA%/TheWineLocalBackups/lista-de-reservas-<timestamp>/`, verificar a presença das cópias e informar o caminho. Não copiar `.env`, bancos ou diretórios pessoais. Esta recuperação não é outro checkout. Não excluir por wildcard diretórios que possam ter recebido arquivos novos.

## 6. Testes — executar comportamento real, sem dados pessoais

### 6.1 Unitários de domínio, formatação e caso de uso

Usar `node:test`, `assert` e o padrão de `ts.transpileModule` + import data URL existente em `tests/reservation-time-policy.test.mjs`. Módulos puros com somente import type são simples de carregar. Dependências de runtime do caso de uso devem ser injetadas, sem substituir suas regras por uma cópia no teste.

Casos obrigatórios em `customer-reservations-list.test.mjs`:

| Função/contrato | Entradas e resultado esperado |
|---|---|
| Duração | 20:00→22:00=120; 21:00→22:30=90; 20:00→20:01=1 |
| Duração inválida | inválido, 25:00, minuto 99, iguais e fim anterior → null |
| Duração visual | 120 minutos; 1 minuto; null → Duração não informada |
| Data | 2026-10-23 → 23 de outubro de 2026; 2026-02-31/2026-13-01/inválido → Data não informada; bissexto válido |
| Pessoas | 1 pessoa, 2 pessoas |
| Preferências | dietary_restriction/high_chair/other em qualquer ordem → Restrição alimentar, Cadeira infantil, Outra necessidade |
| Preferências vazias | [], none, repetidos e unknown conforme §3.4 |
| Observações | trim, vazio, texto longo sem virar HTML |
| Status | os dez status e textos de §3.2, inclusive seated=Em atendimento |
| Identidade | user A resolve customer 11 e repository recebe só 11; B resolve 22; ausência de cliente não chama repository |
| Paginação | 0/20 registros→nextOffset null; 21→20 itens e offset+20; offset 20→próxima página correta |

Pode manter um teste estático adicional para import Header/rota do menu, mas ele não substitui asserções funcionais.

### 6.2 Handler e adapter em Node

Em `customer-reservations-api.test.mjs`, carregar a factory real e injetar fakes getSession/list/json/reportError. `json` de teste usa `Response.json` com os headers de no-store; isto testa o fluxo do handler. A presença dos headers do **authJson real** deve ser testada separadamente por harness de imports com NextResponse fake ou por request anônimo ao Next local, sem interceptar esse GET. Não alegar que o fake comprovou o helper real.

Para carregar módulos com imports de runtime em Node, usar um loader restrito em `tests/support/load-customer-reservations-module.mjs`, compartilhado com o teste SQL opt-in. Não modificar os imports do produto para acomodar os testes. Estrutura do loader:

```js
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export function loadCustomerReservationsModule(sourceUrl, imports = {}) {
  const source = readFileSync(sourceUrl, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: sourceUrl.pathname,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  const restrictedRequire = (name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    throw new Error(`Import de teste não fornecido: ${name}`);
  };
  new Function('require', 'module', 'exports', compiled.outputText)(
    restrictedRequire, module, module.exports,
  );
  return module.exports;
}
```

No teste do adapter, fornecer por nome exato somente os imports de runtime presentes: `@/server/db` com getDatabasePool que lança se chamado (o pool de teste é injetado), o módulo real puro reservation-status carregado pelo mesmo helper, e `server-only` vazio apenas se o arquivo efetivamente o importar. Imports type são removidos. O helper transpila a fonte atual, não uma cópia. Para testar authJson real, fornecer `next/server` com NextResponse.json que cria Response com headers e o módulo real de errors; conferir os headers que a própria função adiciona. Não usar isto para alegar cobertura de internals do Better Auth/Next.

Obrigatório:

- Sessão null→401, list nunca chamado; sessão vazia→401; sessão throws→503.
- Sessão A/user-a→list recebe user-a e offset solicitado; sessão B/user-b→list recebe user-b. O teste do caso de uso verifica a resolução de cada customer.
- customerId/userId externos, offset duplicado, vazio, negativo, decimal, notação exponencial e inseguro→400; nenhuma chamada list. Ausência de offset→0.
- Falha de list→503 sem stack/SQL no JSON; sucesso→200 e envelope esperado.
- Cliente sem perfil→200 vazio, não erro de login nem provisionamento.
- Executar o **adapter MySQL real** com pool fake via injeção, usando loader controlado quando necessário. O fake registra execute(sql,params) e devolve linhas sintéticas. Verificar parâmetros `[11,21,0]`, depois `[22,21,20]`; predicado `WHERE r.customer_id = ?`; ordem ASC e desempate id; uma execução por página; null notes/CSV; status inválido rejeitado. Não copiar a query para o teste e testar apenas a cópia.
- Teste de isolamento combinado handler→caso de uso→adapter com pool fake cuja base sintética tenha reservas de A e B: A não recebe B; B não recebe A. Explicitamente registrar que valida composição/binding, não execução do SQL no MySQL.

**Teste de SQL real necessário para aceite de integração:** criar teste opt-in em `scripts/test-customer-reservations-query.mjs` que cria schema descartável com tabelas mínimas customers/reservations/reservation_special_needs, duas identidades e registros sintéticos, executa o adapter real com pool desse schema e comprova isolamento, ordem, paginação e preferências. Exigir `CUSTOMER_RESERVATIONS_TEST_DATABASE` com prefixo `thewine_test_customer_reservations_`; recusar nomes sem esse prefixo, `DATABASE_NAME` da aplicação e schemas existentes. Credenciais apenas em variáveis transitórias, sem registro no relatório. Em finally, remover só o schema criado pela execução após validar nome e identidade. Não aplicar migrations, seed ou writes no banco pessoal. Falta de credencial/permissão → reportar pendência de integração, não marcar como aprovado nem mudar de banco automaticamente.

O runner usa mysql2 já instalado e o loader restrito acima para executar a fonte real do adapter com um pool injetado apontando para o schema descartável. Não importar composição de produção ou usar getDatabasePool do app. Variáveis exclusivas: CUSTOMER_RESERVATIONS_TEST_HOST, _PORT, _USER, _PASSWORD e CUSTOMER_RESERVATIONS_TEST_DATABASE; sem fallback de credenciais para .env.local. Validar nome por regex `^thewine_test_customer_reservations_[a-z0-9_]+$` e comprimento máximo 64 antes de interpolar o identificador; placeholders SQL não substituem identificadores. Criar sem IF NOT EXISTS e registrar um flag de criação própria somente após sucesso. Se a criação falhar por schema existente, não apagar nada. Fechar pool e conexão administrativa em finally; DROP somente com flag própria e nome revalidado.

### 6.3 Fixture única e testes de navegador

Criar a fixture sintética uma única vez em `tests/browser/fixtures/customer-reservations.ts` e compartilhá-la entre testes funcionais/visuais. IDs 101/102/103; notes do exemplo são texto sintético da referência, não dados buscados em produção.

| id | data | hora | duração | pessoas | status | specialNeeds | notes |
|---|---|---|---:|---:|---|---|---|
| 101 | 2026-10-23 | 20:00 | 120 | 2 | confirmed | dietary_restriction, high_chair, other | Frieira no pé |
| 102 | 2026-10-25 | 19:30 | 120 | 4 | confirmed | food_allergy | Alergia a castanhas |
| 103 | 2026-10-31 | 21:00 | 90 | 2 | pending | accessibility | Acesso com mobilidade reduzida |

Resposta inicial `{reservations:[...],nextOffset:null}`. Interceptar `/api/reservations/my*` antes de page.goto; não usar sessão real, contas reais ou chamadas de criação. Se houver verificadores globais de sessão, interceptar também `/api/customer-auth/session` com os shapes vigentes; não introduzir esta chamada no hook só para o teste.

**Guard server nos testes:** interceptações Playwright não simulam chamadas de sessão internas ao servidor. Exercitar a decisão real do guard com dependências de sessão injetadas em testes Node (sessão válida, null, user.id vazio e indisponibilidade). Para navegador autenticado, usar ambiente de testes isolado com provedor de sessão sintético na fronteira de autenticação do servidor, compartilhando a composição real da página. Não adicionar flag, cookie especial, bypass ou sessão fictícia ao código de produção; não remover o guard para fazer a fixture abrir. Se esse ambiente não puder ser preparado, registrar a verificação autenticada de navegador como pendente. Acesso anônimo e redirect podem ser verificados no Next local sem conta real. Os cenários de isolamento com adapter e SQL de §6.2 continuam obrigatórios; simulação da UI não comprova autorização.

Testar no navegador:

1. Navbar #navbar única e compartilhada, campos exatos da fixture, ordem 101/102/103 e textos corretos.
2. Voltar href=/, Adicionar reserva href=/reservas, menu conta href=/lista-de-reservas e redirecionamento da rota antiga para a canônica.
3. Empty, loading atrasado, 503/rede/HTML/payload malformado, retry e cancelamento/resposta atrasada após desmontagem.
4. 21+ registros em páginas de 20; Carregar mais busca nextOffset, não duplica ids, não reordena; duplo clique não duplica requisição; falha de segunda página preserva a primeira e permite retry.
5. Sem sessão: acesso direto, recarga e navegação interna à rota canônica não renderizam `ReservationsListView` e encaminham a `/reservas`. Com sessão válida na page e 401 inicial/durante paginação no GET: apaga cards/offset e executa replace para `/reservas`. Resposta atrasada anterior não restaura cards. Falha técnica da sessão server não renderiza a lista nem é confundida com usuário anônimo.
6. Com sessão já válida na primeira visita, a lista carrega diretamente. Executar cenários A/B e conferir que cada conta recebe somente suas reservas, inclusive chamadas diretas e tentativas de enviar identidade externa à API. Guard/GET não disparam POST login/cadastro/flow/hold/reserva; qualquer comportamento do wizard após navegar pertence ao fluxo existente. Não depender das futuras páginas para executar estes testes.
7. Revalidação por foco/visibility: trocar resposta de A para anônima/B; não manter cards antigos durante a carga nem aceitar resposta atrasada da geração anterior. Coalescer eventos.
8. Teclado nos links e botões, foco visível, loading/alert, mobile sem overflow/corte e notas até 500 caracteres.
9. Localização href=/#localizacao; navegação chega à homepage na seção; menu mobile abre/fecha com Escape; desktop compartilhado preservado.

### 6.4 Config e comandos efetivos

Criar `playwright.customer-reservations.config.ts` com base na config account-menu existente:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['lista-de-reservas.spec.ts', 'floating-account-menu.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.CUSTOMER_RESERVATIONS_TEST_BASE_URL ?? 'http://127.0.0.1:3001',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    locale: 'pt-BR',
    viewport: { width: 1024, height: 640 },
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: 'reduce' },
  },
});
```

Reutilizar o Next local já em execução. Se ausente, iniciar somente o projeto na porta livre apropriada e fornecer baseURL transitória. Não encerrar outros projetos. Config não inicia servidor legado nem depende de arquivos arquivados.

No teste do menu, atualizar expectativas desatualizadas Conta/Reservas para Configurações da conta, href `/configuracoes?tab=dados`, Reservas href `/lista-de-reservas`, inclusive teste de foco; não reescrever cenários de logout.

## 7. Lotes de implementação — ordem obrigatória para Luna

| Lote | Trabalho | Condição para avançar |
|---|---|---|
| 0 | Confirmar checkout, preservar working tree, ler regras, sincronizar índice e conferir sessão atual e vínculo conta→cliente | Contratos existentes identificados; ausência de /acesso e /cadastro não bloqueia a execução |
| 1 | Tipos/schema, duração, port, busca read-only de cliente, adapter, caso de uso, composição e factory GET | Unitários de dados/identidade e handler/adapter passando; diff sem alterações no wizard/schema |
| 2 | Guard server de sessão, navbar Localização, composição da rota canônica, menu e redirect antigo | Acesso anônimo negado antes da View; sessão válida abre a lista; nenhum destino para página ausente |
| 3 | Formatadores, primitivas, hook e View; CSS inicial | Fixture correta, loading/empty/erro/401/paginação funcionando |
| 4 | Config Playwright, testes de navegação/sessão válida/401/revalidação, cobertura de guardrails | Comandos realmente abrangem os arquivos novos; nenhuma chamada real de criação |
| 5 | Calibração visual pelo §8; só ajustes locais necessários | Capturas e crops inspecionados, divergências materiais corrigidas |
| 6 | Teste SQL descartável, verificações finais, backup e limpeza do hub se seguro | Relatório factual com evidência e pendências, sem publicação |

Em `package.json`, adicionar `src/components/account/reservations-list`, `src/app/lista-de-reservas` e arquivos novos de `src/server/reservations` aos alvos de lint/complexidade quando ainda não cobertos. Não remover alvos existentes; `verify:complexity:all` já cobre src. Em check-architecture.mjs, adicionar `src/components/account/reservations-list` e `src/app/lista-de-reservas` aos targets de UI, preservando as proibições existentes. Não criar exceção para a nova rota API.

Preservar os alvos de verificação existentes. Não incluir telas futuras de autenticação nesta entrega nem fazer lint da área inteira de configurações de conta por iniciativa própria.

## 8. Verificação visual obrigatória

1. Usar a fixture de três registros, fontes carregadas (`document.fonts.ready`), scroll zero, DPR1 e viewport CSS **1024×640**. Estabilizar animações. Capturar screenshot do viewport e comparar com o Anexo 2.
2. Inspecionar crops do primeiro card (preferências em duas linhas), do badge Pendente, do CTA Adicionar reserva e da navbar. Conferir alinhamento, ícones, raios, divisores, gradiente, texto e altura própria do CTA. Captura integral sozinha não substitui esses crops.
3. Capturar/resolver desktop 1440×900 e 1900×1080; limites 860/859 e 561/560; mobile 390×844 e 320×740. Testar texto longo e mais de uma página de resultados, com scroll até o último controle. Ausência de mobile no mockup não dispensa responsividade.
4. Comparar navbar da homepage e da lista em 1024×640 e 390×844. Mesmos componentes, dimensões, estilos e comportamento; sem overrides da lista.
5. Verificar falta de overflow também dentro de cada card. `overflow-x:hidden` global não é evidência suficiente de layout correto. Conferir bounding boxes dos filhos e captura, sem mascarar cortes.
6. Foco de teclado, estados habilitado/desabilitado, retry, loading, empty e reduced-motion devem continuar legíveis. Tela baixa/condição equivalente a zoom200% não pode tornar o último controle inacessível.
7. Ajustar somente diferenças observadas no CSS local; repetir as capturas afetadas. Não usar CSS zoom, transform de wrapper, dados diferentes da fixture ou redução artificial da fonte global.
8. Salvar capturas/crops em diretório temporário identificado no relatório; não versionar resultados de execução ou dados pessoais. Não exigir igualdade pixel a pixel integral quando a navbar compartilhada difere da arte; comparar área de conteúdo e registrar a exceção.

Aceite visual: composição, hierarquia, campos, ordem e semântica da referência preservados, sem cortes/overflow, CTA proporcionalmente mais baixo que a reserva vizinha e nenhuma divergência visual relevante restante. Medidas iniciais podem ser refinadas por evidência; não refazer layout inteiro quando um ajuste local basta.

## 9. Checklist final e entrega

No diretório `next-app/`, depois da implementação autorizada:

```powershell
npm run typecheck
npm run verify:architecture
npm run verify:complexity:all
npm run lint
npm test
npx playwright test --config=playwright.customer-reservations.config.ts
npx playwright test --config=playwright.reservation-navigation.config.ts
git diff --check
```

Executar também `node scripts/test-customer-reservations-query.mjs` com schema descartável explicitamente configurado, conforme §6.2. Não colocar credenciais na linha de comando registrada. Os testes de navegação de reservas são regressão por possível compartilhamento da autenticação; não reescrever expectativas para esconder mudança do fluxo existente.

Se o ambiente impedir navegador/SQL, informar a verificação pendente e sua causa; não marcar a entrega completa. Falhas preexistentes fora dos caminhos alterados devem ser demonstradas e relatadas, sem editar módulos de outros trabalhos para produzir saída verde. Revisar diff antes/depois incluindo arquivos não rastreados, pois `git diff` sozinho não os mostra.

Entrega do Luna deve listar:

- Arquivos de produto/documentação alterados e breve propósito.
- Confirmação da proteção da página no servidor, uso da sessão existente, isolamento das reservas por conta e encaminhamento em 401; integração futura de §1.4 explicitamente fora do aceite atual.
- Testes executados, resultados reais e eventuais falhas anteriores.
- Evidência de isolamento: testes de composição com fakes e SQL real em banco descartável identificados separadamente.
- Screenshots completos, crops e estados/viewports efetivamente inspecionados; diferenças restantes e exceção da navbar.
- Caminho de recuperação dos arquivos antigos, se removidos; checkout/working tree preservados; nenhum commit/push/deploy sem pedido.

**Não declarar pronto apenas porque typecheck e testes de strings passaram. Não afirmar comparação visual, isolamento SQL ou integração com login que não foram realmente executados.**
