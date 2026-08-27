# The Wine — Reservas V2 — Design Técnico

## Objetivo

Evoluir o sistema atual de `appointments` para um módulo profissional de reservas de restaurante, mantendo o projeto sustentável, testável e fácil de manter.

O desenvolvimento será incremental e isolado na branch `feature/reservas-the-wine`.

## Status de implementação

A Fase 0 — Fundação e quality gates — foi concluída em 2026-08-26 na branch
`feature/reservas-the-wine`. Dependências, Tailwind v4, utilitários, providers,
lint, guardrails, typecheck, testes, paridade legacy e build foram validados
localmente. Deploy, GitHub Actions, `main` e `.github/workflows/` permanecem
intocados.

## Restrições operacionais obrigatórias

- Não alterar a branch `main` durante o desenvolvimento.
- Não executar deploy.
- Não acionar manualmente GitHub Actions.
- Não modificar `.github/workflows/` durante este trabalho sem solicitação explícita.
- Cada fase deve ser validada antes da próxima.

## Arquitetura base

O projeto permanece em Next.js 16 + React 19 + TypeScript + MySQL 8 + Docker + Traefik.

O roteamento permanece no Next.js App Router. React Router v7 não será adicionado dentro do mesmo app, pois criaria dois sistemas de roteamento concorrentes. Caso o painel seja extraído futuramente para uma SPA independente, React Router poderá ser adotado nesse app separado.

### Bibliotecas planejadas

- Tailwind CSS v4
- primitivas shadcn/ui
- lucide-react
- TanStack React Query v5
- Zustand somente para estado global estritamente necessário
- React Hook Form + Zod
- TanStack React Table
- Recharts
- Motion (`motion/react`)

## Princípios de manutenção

1. UI não acessa SQL diretamente.
2. Route handlers não concentram regra de negócio.
3. Domínio não conhece React, Next.js, MySQL ou gateways externos.
4. Server state fica no React Query; Zustand não duplica cache de servidor.
5. Validação ocorre no cliente e novamente no servidor.
6. Regras críticas são testadas isoladamente.
7. Operações críticas usam idempotência e transação quando necessário.
8. Cada módulo possui uma responsabilidade clara.
9. Nenhuma abstração é criada sem necessidade da fase atual.
10. Arquivos e funções grandes acionam refatoração antes de continuar.

# Guardrails de complexidade

## Complexidade ciclomática

Meta por função:

- 1–5: ideal.
- 6–7: aceitável quando a função permanece coesa e bem testada.
- 8: teto padrão.
- > 8: bloqueia a fase até refatoração.

A Fase 0 deve configurar análise automática local com `complexity: 8` como erro.

## Complexidade cognitiva

Além da métrica ciclomática, o código deve evitar lógica difícil de seguir. A Fase 0 pode usar `eslint-plugin-sonarjs` para sinalizar funções com complexidade cognitiva excessiva.

Meta recomendada:

- <= 10 por função.
- > 10 exige revisão e normalmente extração de policies/funções menores.

## Profundidade

- `max-depth`: 3.
- Preferir guard clauses.
- Evitar condicionais aninhadas extensas.

## Tamanho

Metas de revisão, não números cegos:

- função de domínio/aplicação: preferencialmente <= 40 linhas úteis;
- route handler: adaptador curto;
- componente React: preferencialmente <= 80 linhas úteis antes de extrair responsabilidade;
- arquivo de domínio acima de ~250–300 linhas exige revisão de coesão.

## Parâmetros

Preferir no máximo 3 parâmetros posicionais. Operações maiores usam objetos de entrada tipados.

## Regras condicionais

Quando uma função começar a acumular muitos `if/else`, preferir:

- guard clauses;
- policies;
- tabelas de decisão;
- mapas de estratégia;
- máquina de estados simples;
- funções pequenas nomeadas.

# Organização por domínio

A estrutura será criada progressivamente, sem pastas vazias antecipadas:

```text
next-app/src/
├── app/
├── components/
│   ├── ui/
│   ├── reservation/
│   └── admin/
├── modules/
│   ├── reservations/
│   ├── availability/
│   ├── customers/
│   ├── tables/
│   ├── payments/
│   ├── notifications/
│   └── waitlist/
├── hooks/
├── lib/
├── providers/
└── types/
```

Dentro de cada domínio, separar apenas quando necessário:

```text
domain/
application/
infrastructure/
schemas/
components/
```

## Fluxo de dependência permitido

```text
UI / Route Handler
        ↓
Application Use Case
        ↓
Domain
        ↓
Ports
        ↓
Infrastructure
```

Fluxos proibidos:

```text
React Component -> SQL
React Component -> Mercado Pago
Route Handler -> SQL + regra de negócio + e-mail
Domain -> Next.js
Domain -> mysql2
```

# Entidades principais

- customers
- dining_areas
- table_types
- restaurant_tables
- table_combinations
- service_shifts
- business_hours
- blocked_periods
- experiences
- reservations
- reservation_tables
- reservation_special_needs
- reservation_holds
- waitlist
- payments
- payment_events
- refunds
- notification_outbox
- notification_logs
- audit_logs
- settings
- webhook_events

A tabela `appointments` atual permanece inicialmente como legado e não será removida na fundação.

# Status de reserva

Estados previstos:

```text
draft
hold
payment_pending
pending
confirmed
seated
completed
cancelled
no_show
expired
```

Transições devem ficar centralizadas em policy/máquina de estados simples, nunca espalhadas pelo frontend e pelos route handlers.

# Disponibilidade

O motor de disponibilidade deve calcular inventário real de mesas usando:

- data;
- turno;
- horário;
- quantidade de pessoas;
- capacidade mínima/máxima;
- duração da experiência;
- reservas existentes;
- bloqueios;
- mesas combináveis;
- holds temporários.

A disponibilidade retornada ao browser é informativa. A confirmação deve revalidar tudo no servidor em transação para evitar dupla reserva.

# Jornada pública

Fluxo planejado:

1. data e quantidade de pessoas (1–20);
2. horários disponíveis;
3. preferência de mesa;
4. mesa específica opcional / mapa visual;
5. nome, telefone e e-mail;
6. necessidades especiais e observações;
7. checkout quando aplicável;
8. confirmação;
9. link seguro de `Minha Reserva`.

O cliente não será obrigado a criar senha para reservar.

# Painel administrativo

Áreas planejadas:

- Dashboard
- Agenda
- Reservas
- Mapa do salão
- Lista de espera
- Clientes
- Pagamentos
- Experiências
- Horários
- Mesas
- Notificações
- Relatórios
- Configurações
- Usuários
- Auditoria

# Design System

Preservar a identidade existente do The Wine:

- `#000000`
- `#050505`
- `#0B0A08`
- `#11100D`
- `#D3B97B`
- `#A98445`
- `#F1D093`
- `#FFFFFF`
- `#F1E6D5`

Tipografia existente:

- Cormorant Garamond: display/público;
- Albert Sans: interface e corpo;
- Pinyon Script: detalhe institucional, nunca interface operacional.

Criar tokens semânticos em Tailwind v4, evitando cores hex diretamente nos componentes.

Site público: luxury dark.

Painel administrativo: superfície operacional clara, com sidebar escura e destaque dourado para manter legibilidade sem perder identidade.

# Pagamentos

Criar uma interface `PaymentGateway`, sem acoplar o domínio a um fornecedor.

Primeira integração planejada: Mercado Pago.

Suportar progressivamente:

- reserva gratuita;
- sinal fixo;
- sinal por pessoa;
- pagamento integral;
- Pix;
- cartão;
- reembolso.

Webhook deve ser validado, idempotente e auditável.

# Notificações

Criar `EmailProvider` e notification outbox.

Primeiro provedor planejado: Resend.

Eventos previstos:

- cadastro/primeiro relacionamento;
- reserva criada;
- reserva confirmada;
- pagamento aprovado;
- alteração;
- cancelamento;
- lembrete;
- disponibilidade de lista de espera.

Falha de e-mail não pode desfazer uma reserva válida.

# Segurança e LGPD

Obrigatório:

- Zod no servidor;
- SQL parametrizado;
- autenticação administrativa;
- RBAC;
- cookies seguros;
- rate limiting em endpoints públicos críticos;
- validação de webhooks;
- idempotência;
- audit log;
- consentimento operacional separado de marketing.

# Fases de implementação

## Fase 0 — Fundação e quality gates

- instalar/configurar Tailwind v4;
- configurar shadcn/ui;
- adicionar React Query, RHF, Zod, Zustand, TanStack Table, Recharts e Motion;
- configurar ESLint e métricas de complexidade;
- adicionar scripts `lint` e `verify:complexity`;
- criar providers fundamentais;
- definir tokens semânticos;
- manter visual existente sem regressão.

## Fase 1 — Domínio e banco V2 mínimo

- customers;
- dining_areas;
- table_types;
- restaurant_tables;
- service_shifts;
- experiences;
- reservations;
- reservation_tables;
- schemas Zod;
- repositories pequenos;
- status/policies de reserva;
- testes unitários.

## Fase 2 — Motor de disponibilidade

- capacidade;
- intervalos de horário;
- duração;
- conflitos;
- bloqueios;
- combinações simples de mesas;
- testes de concorrência lógica;
- endpoint de disponibilidade.

## Fase 3 — Reserva pública MVP

- `/reservas`;
- wizard;
- data/pessoas;
- horários;
- preferência;
- dados do cliente;
- necessidades especiais;
- observações;
- confirmação sem pagamento;
- criação/atualização automática de cliente.

## Fase 4 — Painel administrativo MVP

- autenticação;
- RBAC inicial;
- dashboard operacional;
- tabela de reservas;
- detalhe/edição;
- clientes;
- cadastro de mesas/áreas/horários;
- agenda diária.

## Fase 5 — Mapa do salão

- mapa visual;
- estados das mesas;
- seleção opcional no público;
- floor manager no admin;
- editor simples de posicionamento;
- combinações de mesas.

## Fase 6 — Holds e concorrência

- reservation holds com expiração;
- revalidação transacional;
- proteção contra dupla reserva;
- testes concorrentes obrigatórios.

## Fase 7 — Pagamentos

- `PaymentGateway`;
- Mercado Pago;
- Pix;
- cartão;
- sinal configurável;
- pagamento integral;
- webhook idempotente;
- reembolso.

## Fase 8 — Notificações

- `EmailProvider`;
- Resend;
- outbox;
- confirmação;
- alteração;
- cancelamento;
- lembretes;
- logs e retry controlado.

## Fase 9 — Operação avançada

- walk-in;
- check-in;
- seated;
- completed;
- no-show;
- lista de espera;
- timeline operacional.

## Fase 10 — Analytics e CRM operacional

- Recharts;
- ocupação;
- covers;
- horários de pico;
- cancelamentos;
- no-show;
- receita de reservas;
- origem;
- recorrência;
- tags de cliente.

# Quality gate obrigatório por fase

Quando aplicável, nenhuma fase avança sem:

```bash
npm run typecheck
npm run lint
npm run test
npm run verify:complexity
npm run build
```

Fluxos de browser também exigem Playwright.

## Definition of Done

- typecheck verde;
- lint verde;
- complexidade dentro do teto;
- testes da fase verdes;
- testes existentes sem regressão;
- migrations reproduzíveis;
- sem segredo versionado;
- documentação atualizada;
- sem deploy;
- sem alteração/acionamento de GitHub Actions.
