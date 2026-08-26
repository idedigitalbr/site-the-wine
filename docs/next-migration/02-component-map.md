# Mapa de componentes para Next.js

## Objetivo

Definir como o HTML estático atual deve ser dividido em componentes React/Next sem alterar a composição visual ou o comportamento.

## Regra de decomposição

A decomposição deve seguir a responsabilidade visual e comportamental existente. Não criar componentes genéricos apenas por reutilização teórica.

## Árvore de componentes alvo

```text
HomePage
├── Header
│   ├── DesktopNavigation
│   ├── HeaderSocialLinks
│   └── MobileNavigation
├── HeroSection
├── AboutSection
├── ExperiencePillarsSection
│   └── ExperiencePillarCard x3
├── PairingsSection
├── MenuSection
├── MenuModal
│   ├── MenuToolbar
│   └── MenuFlipbook
├── EventsSection
│   └── EventAccordionItem xN
├── ReservationSection
├── GallerySection
│   └── GalleryLightbox
└── Footer
    ├── FooterBrand
    ├── FooterLocation
    ├── FooterMap
    ├── FooterHours
    ├── FooterContact
    └── FooterBottom
```

## Mapeamento 1:1 do legado

### `Header`

**Origem:** `index.html` — `.header`, `.header-container`, `.nav-menu`, `.header-right-side`.

**Responsabilidades:**

- logo;
- navegação por âncoras;
- botão de reserva;
- redes sociais;
- estado visual de link ativo via scroll spy.

**Next:** Server Component para estrutura estática + subcomponente client-side para estado de navegação, se necessário.

### `MobileNavigation`

**Origem:** `.mobile-overlay`, `.mobile-nav`, `#hamburgerBtn`, `#mobileNavClose`.

**Responsabilidades:**

- abrir/fechar drawer;
- overlay;
- fechar ao clicar nos links;
- preservar aparência e animações do hamburger atual.

**Next:** Client Component.

### `HeroSection`

**Origem:** `#home.hero`.

**Responsabilidades:**

- vídeo autoplay/loop/muted/playsInline;
- overlay;
- logo central;
- indicador de scroll;
- parallax.

**Next:** markup pode ser server-side; parallax deve ser anexado por hook/client wrapper.

### `AboutSection`

**Origem:** `#sobre.historia-section`.

**Responsabilidades:**

- background atual;
- headline;
- copy institucional;
- elementos gráficos;
- reveal on scroll.

**Next:** Server Component + wrapper de reveal se necessário.

### `ExperiencePillarsSection`

**Origem:** bloco de três colunas com Gastronomia, Carta de Vinhos e Ambiente.

**Responsabilidades:**

- três imagens independentes;
- overlays;
- ícones SVG;
- conteúdo;
- velocidades de parallax diferentes por coluna.

**Next:** dados podem ser extraídos para array `experiencePillars`, preservando classes e parâmetros de velocidade.

### `PairingsSection`

**Origem:** `#gastronomia.split-section-v2`.

**Responsabilidades:**

- imagem horizontal à esquerda;
- conteúdo central;
- imagem da taça à direita;
- parallax horizontal e vertical;
- CTA para WhatsApp.

**Next:** três regiões devem manter a mesma estrutura de grid e transforms.

### `MenuSection`

**Origem:** `#cardapio.cardapio-split-section`.

**Responsabilidades:**

- fundo creme;
- copy;
- botão `VER CARDÁPIO`;
- vídeo à direita;
- mockup flutuante clicável;
- ambos os gatilhos abrem o mesmo modal.

**Next:** Server Component com callback/contexto para abrir `MenuModal`.

### `MenuModal`

**Origem:** markup de `#menuModal`, `assets/js/menu-flipbook.js` e `assets/css/menu-flipbook.css`.

**Responsabilidades:**

- estado aberto/fechado;
- scroll lock;
- restauração da posição de scroll;
- restauração de foco;
- fullscreen;
- pausa de vídeos de fundo;
- fechamento por overlay e Escape;
- focus trap.

**Next:** Client Component. Deve existir uma única instância no DOM da página.

### `MenuFlipbook`

**Origem:** `assets/js/menu-flipbook.js` + `assets/js/page-flip.browser.js`.

**Responsabilidades:**

- inicializar `St.PageFlip` uma única vez;
- carregar páginas desktop/mobile;
- navegação anterior/próxima;
- input de página;
- zoom por pinch;
- resolução de canvas;
- adaptação por viewport;
- centralização da capa;
- teclado Home/End/ArrowLeft/ArrowRight.

**Next:** Client Component com `useRef` para instância PageFlip e cleanup explícito no unmount.

### `EventsSection`

**Origem:** `#eventos.tw-acc-header` + `.tw-acc`.

**Responsabilidades:**

- accordion de eventos;
- primeiro item ativo;
- comportamento específico no mobile;
- scroll do item escolhido para o centro;
- CTA de cada evento para WhatsApp.

**Next:** Client Component apenas para o estado do accordion. Conteúdo deve ser extraído para configuração tipada.

### `ReservationSection`

**Origem:** `#reserva.cta-reservation`.

**Responsabilidades:**

- fundo;
- headline com script font;
- copy;
- CTA WhatsApp.

**Next:** Server Component.

### `GallerySection`

**Origem:** `#galeria.gallery` + script inline da galeria.

**Responsabilidades:**

- conjunto original de 12 imagens;
- clonagem para loop visual infinito;
- auto-scroll;
- velocidade reduzida no hover;
- drag/touch;
- setas;
- `requestAnimationFrame`;
- pausa temporária após interação;
- respeito a `prefers-reduced-motion`.

**Next:** Client Component. A duplicação dos itens deve ser determinística para evitar mismatch de hidratação.

### `GalleryLightbox`

**Origem:** `#lightbox` e lógica inline associada.

**Responsabilidades:**

- abrir imagem clicada;
- anterior/próxima;
- contador;
- Escape;
- overlay;
- navegação por teclado;
- manter alt da imagem correspondente.

**Next:** Client Component controlado pelo `GallerySection`.

### `Footer`

**Origem:** `#localizacao.footer-premium`.

**Responsabilidades:**

- logo;
- redes sociais;
- endereço;
- mapa;
- horários;
- WhatsApp;
- política/termos;
- ano atual.

**Next:** Server Component; o ano pode ser calculado na renderização ou em pequeno componente sem reidratar o footer inteiro.

## Configurações a extrair do HTML

### `src/config/site.ts`

Deve concentrar:

- nome do estabelecimento;
- telefone;
- WhatsApp base;
- endereço;
- coordenadas;
- horários;
- domínio/canonical;
- SEO base.

### `src/config/navigation.ts`

```ts
export const navigation = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Cardápio', href: '#cardapio' },
  { label: 'Eventos & Experiências', href: '#eventos' },
  { label: 'Localização', href: '#localizacao' },
] as const;
```

### `src/config/social.ts`

Centralizar Instagram, Facebook, TikTok, YouTube e WhatsApp.

### `src/config/content.ts`

Centralizar somente conteúdo repetitivo/estruturado:

- pilares;
- eventos;
- galeria;
- páginas do cardápio.

Não mover textos singulares para objetos apenas por abstração.

## IDs que devem permanecer iguais na primeira migração

- `home`
- `sobre`
- `gastronomia`
- `cardapio`
- `eventos`
- `reserva`
- `galeria`
- `localizacao`
- `menuModal`
- `menuFlipbookStage`
- `menuFlipbookPages`
- `menuPdfLoading`
- `menuPdfError`
- `menuRetryBtn`
- `menuModalCloseBtn`
- `menuPrevBtn`
- `menuNextBtn`
- `menuPageInput`
- `menuPageTotal`
- `menuFullscreenBtn`

Manter esses IDs inicialmente reduz o risco durante a migração do comportamento.

## Classes críticas a preservar durante a primeira versão

Não é necessário preservar todas as classes para sempre, mas a primeira versão Next deve reaproveitar o CSS legado sempre que possível.

Famílias críticas:

- `.header*`
- `.mobile-*`
- `.hero*`
- `.historia-*`
- `.mvv-*`
- `.split-*`
- `.cardapio-*`
- `.tw-acc*`
- `.cta-reservation*`
- `.gallery*`
- `.lightbox*`
- `.footer-*`
- `.menu-*`
- `.flipbook-*`
- `.parallax-*`
- `.reveal-up`

## Princípio de Server vs Client Components

Usar Client Components somente onde existe interação ou acesso ao browser.

**Server por padrão:** conteúdo, layout, SEO e seções estáticas.

**Client somente para:**

- mobile navigation;
- scroll spy;
- reveal/parallax;
- menu modal/flipbook;
- events accordion;
- gallery/lightbox.

Isso evita transformar a página inteira em `use client` e mantém o Next organizado desde a primeira migração.
