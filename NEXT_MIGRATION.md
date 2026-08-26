# The Wine — migração 1:1 para Next.js

Este arquivo é o ponto de entrada da migração do site estático atual para Next.js.

## Regra principal

A migração deve preservar **1:1 o visual e os recursos existentes** antes de qualquer melhoria visual, alteração de copy, troca de animação ou modernização de UX.

A versão estática da raiz continua sendo a referência visual e comportamental.

## Branch de implementação

`chore/hardening-deploy-ci-20260825`

## Status atual

Implementado na branch:

- app Next.js isolado em `next-app/`, sem substituir o site estático da raiz;
- Next.js 16.3.3 + React 19.2.8 + TypeScript;
- App Router e Server Components por padrão;
- metadata, canonical, Open Graph, Twitter Card e JSON-LD migrados;
- HTML de referência congelado em `next-app/legacy/index.html`;
- CSS de referência preservado em `next-app/public/style.css`;
- árvore de `assets/` reutilizada integralmente em `next-app/public/assets/`;
- Header, navegação mobile e todas as seções visíveis da Home convertidas para JSX nativo;
- Booking Modal, Menu Modal, lightbox e toast convertidos para JSX nativo;
- parser HTML e adaptadores `LegacyFragment`, `LegacyHome`, `LegacyModals` e `LegacyMenuScripts` retirados do runtime;
- comportamentos browser separados em módulos TypeScript com cleanup explícito;
- PageFlip continua como biblioteca visual externa, mas a lógica `menu-flipbook.js` foi portada para `src/behaviors/menuFlipbook.ts`;
- configurações repetidas de navegação, sociais, WhatsApp, galeria e cardápio centralizadas em `src/config/`;
- `page.tsx` permanece Server Component;
- harness Playwright local criado para comparar legado e Next funcionalmente e por pixel diff;
- nenhum deploy desta branch faz parte da migração.

## O que continua congelado

- ordem e composição das seções;
- identidade visual, cores, tipografias, espaçamentos e proporções;
- Header desktop e drawer mobile;
- Hero em vídeo;
- seção institucional;
- cards de Gastronomia, Carta de Vinhos e Ambiente;
- Harmonizações e seus movimentos de parallax;
- seção visual do cardápio;
- modal/flipbook do cardápio;
- Eventos & Experiências;
- CTA de reserva;
- galeria infinita, drag/touch e lightbox;
- Footer, mapa, horários e redes sociais;
- links e mensagens de WhatsApp;
- SEO, Open Graph, Twitter Cards e JSON-LD;
- breakpoints e comportamento responsivo;
- `prefers-reduced-motion`.

## Documentação

1. [`docs/next-migration/01-static-audit.md`](docs/next-migration/01-static-audit.md) — auditoria do legado.
2. [`docs/next-migration/02-component-map.md`](docs/next-migration/02-component-map.md) — mapa de componentes.
3. [`docs/next-migration/03-behavior-contract.md`](docs/next-migration/03-behavior-contract.md) — contrato comportamental 1:1.
4. [`docs/next-migration/04-design-system-and-assets.md`](docs/next-migration/04-design-system-and-assets.md) — tokens, CSS, breakpoints e assets.
5. [`docs/next-migration/05-migration-plan.md`](docs/next-migration/05-migration-plan.md) — plano por fases.
6. [`docs/next-migration/06-execution-status.md`](docs/next-migration/06-execution-status.md) — estado real da execução.
7. [`docs/next-migration/07-browser-validation.md`](docs/next-migration/07-browser-validation.md) — execução da paridade funcional/visual com Playwright.
8. [`docs/next-migration/legacy-contract.json`](docs/next-migration/legacy-contract.json) — contrato estruturado para agentes.

## Estratégia atual

A abordagem continua sendo **parity-first**, mas o runtime já ultrapassou a fase de adaptação por HTML:

1. preservar o legado estático como baseline;
2. manter os mesmos assets, classes, IDs, conteúdo e CSS;
3. renderizar a Home em JSX nativo por componentes;
4. manter browser-only behavior em controladores client-side pequenos;
5. manter somente a biblioteca PageFlip externa para o efeito de livro;
6. centralizar apenas dados repetidos/estáveis sem alterar copy ou destino;
7. executar contratos estruturais e funcionais;
8. comparar legado × Next por pixel diff nas viewports oficiais;
9. somente após a aprovação 1:1 modularizar/modernizar o CSS e otimizar assets.

## Estrutura atual do app

```text
next-app/
├── legacy/
│   └── index.html                 # baseline, não runtime
├── public/
│   ├── assets/                    # mesmos assets do legado
│   └── style.css                  # CSS legado preservado
├── scripts/
│   ├── serve-legacy.mjs           # servidor local da raiz estática
│   └── verify-legacy-parity.mjs
├── src/
│   ├── app/
│   ├── behaviors/
│   │   ├── header.ts
│   │   ├── mobileNavigation.ts
│   │   ├── reveal.ts
│   │   ├── scrollSpy.ts
│   │   ├── parallax.ts
│   │   ├── eventsAccordion.ts
│   │   ├── galleryLightbox.ts
│   │   └── menuFlipbook.ts
│   ├── components/
│   │   ├── behaviors/
│   │   ├── layout/
│   │   ├── menu/
│   │   ├── reservation/
│   │   └── sections/
│   ├── config/
│   └── types/
├── tests/
│   ├── browser/
│   │   ├── functional-parity.spec.ts
│   │   └── visual-parity.spec.ts
│   └── *.test.mjs
└── playwright.config.ts
```

## Harness de paridade

O Playwright inicia automaticamente:

- legado da raiz em `http://127.0.0.1:4173`;
- Next.js em `http://127.0.0.1:4174`.

Comandos:

```bash
npm run browser:install
npm run test:functional
npm run test:visual
```

O visual é comparado nas 8 viewports do contrato, com screenshots anexados quando o diff ultrapassa a tolerância automática.

O harness estar presente no repositório **não significa que a paridade já foi aprovada**. Os testes precisam ser efetivamente executados em ambiente com npm e Chromium disponíveis.

## Pendências antes de considerar a migração 1:1 pronta

- instalar dependências em ambiente com acesso normal ao npm;
- executar `npm run typecheck` com dependências reais;
- executar `npm test`;
- executar `npm run verify:legacy`;
- executar `npm run build`;
- instalar Chromium com `npm run browser:install`;
- executar `npm run test:functional`;
- executar `npm run test:visual`;
- inspecionar os diffs nas 8 viewports;
- validar manualmente hover/focus, transições, fullscreen, pinch e drag/touch quando aplicável;
- corrigir somente diferenças de paridade encontradas;
- manter o legado da raiz até a aprovação final.

## Regras de segurança

- não executar deploy desta branch;
- não alterar `.github/workflows/deploy-vps.yml` como parte desta migração;
- não fazer merge em `main` antes da validação 1:1;
- não remover o site estático da raiz;
- não trocar assets enquanto a paridade não estiver concluída;
- não redesenhar seções durante a conversão;
- não transformar `page.tsx` inteiro em Client Component;
- cada comportamento browser deve possuir cleanup explícito para React Strict Mode.
