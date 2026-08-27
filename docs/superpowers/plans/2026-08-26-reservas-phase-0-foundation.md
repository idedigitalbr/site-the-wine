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

---

### Task 1: Guardrail local de complexidade

**Files:**
- Create: `next-app/scripts/check-complexity.mjs`
- Create: `next-app/tests/complexity-guard.test.mjs`
- Modify: `next-app/package.json`

**Interfaces:**
- Produces: `npm run verify:complexity`, que analisa `src/**/*.ts` e `src/**/*.tsx` e falha quando uma função ultrapassa complexidade 8 ou profundidade 3.

- [ ] Escrever teste que exige o script e os thresholds 8/3.
- [ ] Executar o teste e confirmar falha porque o script ainda não existe.
- [ ] Implementar scanner AST com TypeScript, mantendo helpers pequenos.
- [ ] Adicionar script `verify:complexity` ao `package.json`.
- [ ] Executar o teste e confirmar sucesso.
- [ ] Executar o checker no `src` existente e registrar baseline.
- [ ] Commitar isoladamente.

### Task 2: ESLint para manutenção

**Files:**
- Create: `next-app/eslint.config.mjs`
- Modify: `next-app/package.json`
- Modify: `next-app/package-lock.json`

**Interfaces:**
- Produces: `npm run lint`.

- [ ] Adicionar ESLint compatível com Next/TypeScript.
- [ ] Configurar `complexity: ["error", 8]` e `max-depth: ["error", 3]` para código novo.
- [ ] Configurar complexidade cognitiva <= 10 quando o plugin SonarJS estiver instalado.
- [ ] Validar lint sem tentar corrigir automaticamente o legado fora do escopo.
- [ ] Commitar isoladamente.

### Task 3: Tailwind CSS v4 e tokens semânticos

**Files:**
- Create: `next-app/postcss.config.mjs`
- Modify: `next-app/src/app/globals.css`
- Create: `next-app/components.json`
- Create: `next-app/src/lib/utils.ts`
- Modify: `next-app/package.json`
- Modify: `next-app/package-lock.json`

**Interfaces:**
- Produces: tokens `background`, `foreground`, `surface`, `primary`, `border` e estados de reserva/mesa para componentes novos.

- [ ] Instalar Tailwind v4 e PostCSS sem substituir o CSS legado.
- [ ] Importar Tailwind em `globals.css`.
- [ ] Mapear a paleta existente do The Wine para tokens semânticos.
- [ ] Configurar shadcn/ui para `src/components/ui` e alias `@/*` existente.
- [ ] Criar utilitário `cn`.
- [ ] Confirmar que a homepage atual não muda visualmente.
- [ ] Commitar isoladamente.

### Task 4: Bibliotecas de aplicação e providers

**Files:**
- Create: `next-app/src/providers/QueryProvider.tsx`
- Create: `next-app/src/providers/AppProviders.tsx`
- Modify: `next-app/src/app/layout.tsx`
- Modify: `next-app/package.json`
- Modify: `next-app/package-lock.json`

**Interfaces:**
- Produces: contexto React Query único para futuras telas de reserva e admin.

- [ ] Adicionar React Query v5, RHF, Zod, Zustand, TanStack Table, Recharts e Motion.
- [ ] Criar `QueryProvider` com `QueryClient` estável por montagem.
- [ ] Criar `AppProviders` como composição pequena.
- [ ] Integrar ao root layout sem adicionar regra de domínio.
- [ ] Executar typecheck e build.
- [ ] Commitar isoladamente.

### Task 5: Quality gate da Fase 0

**Files:**
- Modify: `next-app/package.json`
- Modify: `docs/superpowers/specs/2026-08-26-reservas-the-wine-design.md` somente para registrar status da fase.

**Interfaces:**
- Produces: `npm run verify:foundation`.

- [ ] Compor `typecheck`, `lint`, `test`, `verify:complexity`, `verify:legacy` e `build` no gate local.
- [ ] Rodar todos os checks disponíveis sem GitHub Actions.
- [ ] Rodar Playwright visual/funcional quando o ambiente tiver browser instalado.
- [ ] Corrigir qualquer regressão causada pela Fase 0.
- [ ] Registrar Fase 0 como concluída somente após os gates verdes.

## Definition of Done

- Guardrail ciclomático ativo com teto 8.
- Profundidade máxima 3.
- Tailwind v4 coexistindo com CSS legado.
- shadcn preparado para componentes novos.
- React Query provider isolado.
- Bibliotecas-base disponíveis sem duplicar responsabilidades.
- Nenhuma alteração em workflow/deploy.
- `main` intacta.
