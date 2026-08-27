# Reservas The Wine — Fase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação técnica do módulo de Reservas V2 sem alterar o comportamento visual atual do site, com quality gates que mantenham a complexidade controlada desde o primeiro código novo.

**Architecture:** A fundação será incremental. Primeiro entram guardrails locais sem dependências novas; depois Tailwind v4/shadcn e bibliotecas de aplicação são adicionados preservando Next.js 16, React 19, App Router e o CSS legado. Providers serão pequenos e isolados, sem regras de negócio.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react, TanStack React Query v5, React Hook Form, Zod, Zustand, TanStack React Table, Recharts, Motion.

**Spec:** `docs/superpowers/specs/2026-08-26-reservas-the-wine-design.md`

## Global Constraints

- Trabalhar somente em `feature/reservas-the-wine`.
- Não alterar `main`.
- Não executar deploy.
- Não acionar GitHub Actions.
- Não modificar `.github/workflows/`.
- Complexidade ciclomática por função: teto 8.
- Profundidade máxima de controle: 3.
- Preferir funções com complexidade 1–5.
- Preservar o CSS/visual legado durante a fundação.
- React Router não será adicionado ao app Next.js.

## Status do checkpoint

Fase 0 concluída em 2026-08-26 na branch `feature/reservas-the-wine`:

- guardrails AST de complexidade, profundidade e fronteiras arquiteturais;
- verificação de sincronização `package.json` x `package-lock.json`;
- dependências da fundação instaladas pelo npm e lockfile sincronizado;
- Tailwind CSS v4 integrado sem preflight global sobre o CSS legado;
- tokens semânticos isolados em `src/styles/reservation-tokens.css`;
- `components.json` do shadcn preparado para Tailwind v4/App Router;
- `cn()` criado com `clsx` e `tailwind-merge`;
- `QueryProvider` e `AppProviders` integrados sem transformar o layout em Client Component;
- lint escopado ao código novo e gate final `verify:foundation` disponível;
- Home validada localmente com vídeo de fundo e mapa real preservados.

---

### Task 1: Guardrail local de complexidade

**Files:**
- Create: `next-app/scripts/check-complexity.mjs`
- Create: `next-app/tests/complexity-guard.test.mjs`
- Modify: `next-app/package.json`

**Interfaces:**
- Produces: `npm run verify:complexity`, que analisa o código novo de Reservas/Admin e falha quando uma função ultrapassa complexidade 8 ou profundidade 3. `verify:complexity:all` permanece disponível como diagnóstico do `src` inteiro.

- [x] Escrever teste que exige o script e os thresholds 8/3.
- [x] Executar ciclo inicial de falha antes da implementação.
- [x] Implementar scanner AST com TypeScript, mantendo helpers pequenos.
- [x] Adicionar script `verify:complexity` ao `package.json`.
- [x] Validar o contrato do checker.
- [x] Separar gate de código novo e diagnóstico global para não acoplar a feature à refatoração do legado.
- [x] Commitar isoladamente.

### Task 2: ESLint para manutenção

**Files:**
- Create: `next-app/eslint.config.mjs`
- Modify: `next-app/package.json`
- Modify: `next-app/package-lock.json`

**Interfaces:**
- Produces: `npm run lint`.

- [x] Instalar ESLint compatível com Next/TypeScript e atualizar lockfile via npm.
- [x] Configurar `complexity: ["error", 8]` e `max-depth: ["error", 3]` para código novo.
- [x] Configurar complexidade cognitiva <= 10 com SonarJS.
- [x] Escopar `lint` ao módulo novo durante a fase de paridade para não transformar a feature em refatoração do legado.
- [x] Executar o ESLint real após instalação das dependências.
- [x] Commitar package/lock/config juntos após instalação.

### Task 3: Tailwind CSS v4 e tokens semânticos

**Files:**
- Create: `next-app/postcss.config.mjs`
- Modify: `next-app/src/app/globals.css`
- Create: `next-app/components.json`
- Create: `next-app/src/lib/utils.ts`
- Create: `next-app/src/styles/reservation-tokens.css`
- Modify: `next-app/package.json`
- Modify: `next-app/package-lock.json`

**Interfaces:**
- Produces: tokens `background`, `foreground`, `surface`, `primary`, `border` e estados de reserva/mesa para componentes novos.

- [x] Instalar Tailwind v4 e PostCSS sem substituir o CSS legado.
- [x] Importar Tailwind em `globals.css` somente após a dependência existir.
- [x] Mapear a paleta existente do The Wine para tokens semânticos.
- [x] Isolar tokens em stylesheet próprio sem alterar o escopo da Home.
- [x] Configurar shadcn/ui para `src/components/ui` e alias `@/*` existente.
- [x] Criar utilitário `cn` após `clsx` e `tailwind-merge` existirem no lockfile.
- [x] Confirmar por build/browser smoke que a homepage atual não muda visualmente.
- [x] Commitar integração Tailwind/package-lock de forma atômica.

### Task 4: Bibliotecas de aplicação e providers

**Files:**
- Create: `next-app/src/providers/QueryProvider.tsx`
- Create: `next-app/src/providers/AppProviders.tsx`
- Modify: `next-app/src/app/layout.tsx`
- Modify: `next-app/package.json`
- Modify: `next-app/package-lock.json`

**Interfaces:**
- Produces: contexto React Query único para futuras telas de reserva e admin.

- [x] Definir manifest controlado para React Query v5, RHF, resolvers, Zod, Zustand, TanStack Table, Recharts e Motion.
- [x] Instalar bibliotecas e gerar lockfile com npm.
- [x] Criar `QueryProvider` com `QueryClient` estável por montagem.
- [x] Criar `AppProviders` como composição pequena.
- [x] Integrar ao root layout sem adicionar regra de domínio.
- [x] Executar typecheck e build.
- [x] Commitar isoladamente.

### Task 5: Quality gate da Fase 0

**Files:**
- Modify: `next-app/package.json`
- Modify: `docs/superpowers/specs/2026-08-26-reservas-the-wine-design.md` somente para registrar status da fase.

**Interfaces:**
- Produces: `npm run verify:foundation`.

- [x] Criar `verify:foundation:preflight` com os checks disponíveis antes das dependências novas.
- [x] Compor `typecheck`, `lint`, `test`, `verify:complexity`, `verify:architecture`, `verify:legacy` e `build` no gate final.
- [x] Rodar todos os checks finais sem GitHub Actions.
- [x] Rodar validação visual/funcional local disponível no ambiente.
- [x] Corrigir qualquer regressão causada pela Fase 0.
- [x] Registrar Fase 0 como concluída somente após os gates verdes.

## Definition of Done

- Guardrail ciclomático ativo com teto 8.
- Profundidade máxima 3.
- Tailwind v4 coexistindo com CSS legado.
- shadcn preparado para componentes novos.
- React Query provider isolado.
- Bibliotecas-base disponíveis sem duplicar responsabilidades.
- Nenhuma alteração em workflow/deploy.
- `main` intacta.
