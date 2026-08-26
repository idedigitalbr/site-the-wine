# The Wine — preparação para migração Next.js

Este arquivo é o ponto de entrada para a migração do site estático atual para Next.js.

## Regra principal

A migração deve preservar **1:1 o visual e os recursos existentes** antes de qualquer melhoria visual, alteração de copy, troca de animação ou modernização de UX.

A versão estática atual é a referência visual e comportamental.

## Status de execução

Branch de implementação:

`chore/hardening-deploy-ci-20260825`

Implementado até aqui:

- app Next.js criado em `next-app/` sem substituir o legado da raiz;
- Next.js 16.3.3 + React 19.2.8 + TypeScript;
- App Router;
- metadata, canonical, Open Graph, Twitter Card e JSON-LD migrados;
- HTML legado congelado em `next-app/legacy/index.html`;
- CSS legado congelado em `next-app/public/style.css`;
- árvore de `assets/` reutilizada integralmente em `next-app/public/assets/`;
- parser server-side remove scripts inline e preserva o markup visual;
- shell Next permanece Server Component;
- flipbook continua usando PageFlip e o módulo legado na primeira etapa de paridade;
- comportamentos globais estão sendo separados em módulos client-side com cleanup explícito;
- nenhum deploy desta branch é permitido durante a migração.

## O que não deve mudar durante a migração

- Ordem e composição visual das seções.
- Identidade visual, cores, tipografias, espaçamentos e proporções.
- Header desktop e drawer mobile.
- Hero em vídeo.
- Seção institucional.
- Cards de Gastronomia, Carta de Vinhos e Ambiente.
- Harmonizações com parallax horizontal/vertical.
- Seção de cardápio split com vídeo e mockup flutuante.
- Modal do cardápio e comportamento de flipbook.
- Eventos & Experiências em accordion.
- CTA de reserva.
- Galeria infinita, drag/touch e lightbox.
- Footer, mapa, horários e redes sociais.
- Links e mensagens de WhatsApp.
- SEO, Open Graph, Twitter Cards e JSON-LD.
- Comportamento responsivo atual.
- Preferência `prefers-reduced-motion` já respeitada pelo site.

## Documentação da migração

1. [`docs/next-migration/01-static-audit.md`](docs/next-migration/01-static-audit.md) — auditoria do código legado.
2. [`docs/next-migration/02-component-map.md`](docs/next-migration/02-component-map.md) — decomposição exata em componentes Next/React.
3. [`docs/next-migration/03-behavior-contract.md`](docs/next-migration/03-behavior-contract.md) — contrato dos recursos interativos.
4. [`docs/next-migration/04-design-system-and-assets.md`](docs/next-migration/04-design-system-and-assets.md) — tokens, CSS, breakpoints e assets.
5. [`docs/next-migration/05-migration-plan.md`](docs/next-migration/05-migration-plan.md) — ordem segura de implementação.
6. [`docs/next-migration/legacy-contract.json`](docs/next-migration/legacy-contract.json) — mapa legível por agentes/automação.

## Estratégia adotada

A implementação está seguindo uma abordagem **parity-first**:

1. manter o DOM e os assets atuais como baseline;
2. executar o HTML dentro do shell Next sem os scripts inline;
3. substituir o JavaScript global por módulos de comportamento isolados;
4. manter o flipbook legado até a paridade do restante estar estabilizada;
5. só depois substituir os blocos de markup por JSX puro seção a seção;
6. só depois da aprovação visual 1:1 fazer limpeza de CSS e modernizações.

## Estrutura atual

```text
next-app/
├── legacy/
│   └── index.html
├── public/
│   ├── assets/
│   └── style.css
├── scripts/
├── src/
│   ├── app/
│   ├── behaviors/
│   ├── components/
│   ├── config/
│   ├── lib/
│   └── types/
└── tests/
```

## Estrutura alvo final

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── MobileNavigation.tsx
│   │   └── Footer.tsx
│   ├── sections/
│   │   ├── HeroSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── ExperiencePillarsSection.tsx
│   │   ├── PairingsSection.tsx
│   │   ├── MenuSection.tsx
│   │   ├── EventsSection.tsx
│   │   ├── ReservationSection.tsx
│   │   └── GallerySection.tsx
│   ├── menu/
│   │   ├── MenuModal.tsx
│   │   ├── MenuFlipbook.tsx
│   │   └── MenuToolbar.tsx
│   ├── gallery/
│   │   └── Lightbox.tsx
│   └── effects/
│       ├── RevealOnScroll.tsx
│       ├── ScrollSpy.tsx
│       └── ParallaxController.tsx
├── config/
│   ├── site.ts
│   ├── navigation.ts
│   ├── social.ts
│   └── content.ts
├── hooks/
│   ├── useParallax.ts
│   ├── useScrollSpy.ts
│   ├── useReducedMotion.ts
│   └── useBodyScrollLock.ts
└── styles/
    ├── tokens.css
    ├── base.css
    ├── components.css
    └── sections.css
```

## Regras de segurança da migração

- não executar deploy desta branch;
- não alterar `.github/workflows/deploy-vps.yml` como parte da migração;
- não remover o site estático da raiz;
- não trocar assets enquanto a paridade não estiver concluída;
- não redesenhar seções durante a conversão;
- não transformar `page.tsx` inteiro em Client Component;
- cada comportamento browser deve possuir cleanup explícito para funcionar corretamente com React Strict Mode.
