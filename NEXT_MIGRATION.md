# The Wine — preparação para migração Next.js

Este arquivo é o ponto de entrada para uma futura migração do site estático atual para Next.js.

## Regra principal

A migração deve preservar **1:1 o visual e os recursos existentes** antes de qualquer melhoria visual, alteração de copy, troca de animação ou modernização de UX.

A versão estática atual é a referência visual e comportamental.

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

## Estratégia recomendada

Não migrar tudo de uma vez.

A futura aplicação Next deve nascer ao lado do legado e substituir as seções progressivamente. Cada seção só é considerada migrada depois de validar:

- desktop;
- tablet;
- mobile;
- visual;
- conteúdo;
- interação;
- acessibilidade já existente;
- assets;
- links externos;
- performance funcional;
- ausência de regressão nas seções vizinhas.

## Estrutura alvo sugerida

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

Essa estrutura é um **destino de migração**, não uma autorização para alterar o legado imediatamente.

## Branch desta preparação

Todo o trabalho descrito aqui pertence à branch:

`chore/hardening-deploy-ci-20260825`

Não realizar deploy desta branch durante a preparação da migração.
