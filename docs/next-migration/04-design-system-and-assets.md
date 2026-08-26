# Design system, CSS e assets — regras para migração 1:1

## Objetivo

Evitar que a migração para Next.js altere o visual por mudanças prematuras em tokens, tipografia, breakpoints, imagens ou estratégia de carregamento.

## Tokens existentes

O `style.css` já contém uma base de design system em `:root`.

### Cores

```css
--wine-black: #000000;
--wine-ink: #050505;
--wine-panel: #0B0A08;
--wine-panel-2: #11100D;
--wine-gold: #D3B97B;
--wine-gold-dark: #A98445;
--wine-gold-soft: #F1D093;
--wine-white: #FFFFFF;
--wine-cream: #F1E6D5;
--wine-muted: rgba(255, 255, 255, 0.7);
--wine-border: rgba(211, 185, 123, 0.35);
--wine-glow: 0 0 30px rgba(211, 185, 123, 0.22);
```

### Tipografia

```css
--font-display: 'Cormorant Garamond', serif;
--font-body: 'Albert Sans', sans-serif;
--font-script: 'Pinyon Script', cursive;
```

### Layout e motion

```css
--container: 1100px;
--transition-premium: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
```

## Estratégia CSS recomendada para a primeira versão Next

A primeira versão Next **não deve reescrever todo o CSS**.

### Fase de paridade

1. Mover o CSS legado para `src/app/globals.css` ou importá-lo como stylesheet global.
2. Manter os seletores/classes originais usados pelo markup migrado.
3. Extrair apenas os tokens para `src/styles/tokens.css` se isso não alterar cascade/especificidade.
4. Manter `assets/css/menu-flipbook.css` separado até o componente do cardápio estar estabilizado.
5. Não converter tudo para CSS Modules, Tailwind ou CSS-in-JS durante a fase 1:1.

### Fase posterior de refatoração

Somente depois da paridade validada:

- reduzir `!important`;
- remover estilos inline;
- dividir CSS por seção;
- criar primitives reutilizáveis;
- consolidar breakpoints;
- renomear classes antigas;
- avaliar CSS Modules ou outra estratégia.

## Breakpoints comportamentais identificados

### `768px`

Usado pelo motor de parallax como limite para desligar o efeito no mobile.

### `820px`

Usado pelo flipbook para alternar comportamento e assets desktop/mobile.

### `860px`

Usado pelo accordion de eventos para interação mobile.

### `992px`

Há regras históricas de responsividade global/rodapé no CSS legado.

Não unificar esses valores na primeira migração. Eles têm responsabilidades diferentes.

## Fontes

O legado carrega Google Fonts diretamente:

- Albert Sans — 300, 400, 500, 600, 700;
- Cormorant Garamond — pesos 300 a 700, normal e italic;
- Pinyon Script — regular.

### Recomendação no Next

Na primeira migração há duas opções seguras:

1. manter o `<link>` atual para eliminar diferenças de renderização;
2. usar `next/font/google`, mas somente depois de comparar métricas e layout.

A opção de menor risco para paridade é manter o carregamento equivalente primeiro.

## Regras para assets

### Estrutura inicial no Next

Copiar `assets/` para:

```text
public/assets/
```

mantendo a hierarquia.

Isso permite transformar:

```html
assets/Ambiente/mesa-reservada-adega.webp
```

em:

```text
/assets/Ambiente/mesa-reservada-adega.webp
```

sem reorganizar o catálogo durante a migração.

## Categorias de assets existentes

A árvore atual contém, entre outras, categorias como:

- `assets/Ambiente/`
- `assets/CardapioMenu/`
- `assets/Experiencias/`
- `assets/Gastronomia/`
- `assets/Logos/`
- `assets/Rodape/`
- `assets/S1 TOPO HERO/`
- `assets/S2 Sobre Nossa Historia/`
- `assets/S3 Harmonizacoes/`
- `assets/Vinhos/`
- `assets/css/`
- `assets/js/`

A migração não deve renomear essas pastas no mesmo passo da mudança de framework.

## Imagens

### Primeira versão

Preferir `<img>` quando for necessário reproduzir exatamente:

- tamanho intrínseco;
- comportamento de `object-fit`;
- `object-position`;
- transformações do parallax;
- canvas/flipbook;
- duplicação da galeria.

`next/image` pode ser introduzido depois de validar que não altera:

- dimensões calculadas;
- crop;
- carregamento;
- layout shift;
- DOM esperado pelos efeitos.

## Vídeos

Manter `<video>` nativo.

### Hero

Arquivo atual em `assets/S1 TOPO HERO/`.

### Cardápio

`assets/CardapioMenu/video-cardapio.mp4`.

Preservar autoplay, muted, loop e playsInline.

## Cardápio

O módulo utiliza:

- PDF principal;
- imagens PNG desktop de páginas;
- imagens WebP mobile de páginas;
- mockup WebP;
- vídeo MP4;
- `page-flip.browser.js`.

Existe duplicidade histórica de nome de PDF dentro de `assets/CardapioMenu/`. Não remover durante a etapa de migração sem confirmar qual arquivo é referenciado por código/documentação externa.

## SVGs

Grande parte dos ícones está inline no HTML.

Na primeira migração:

- converter o markup SVG diretamente para JSX;
- manter `viewBox`, paths, stroke width e fill;
- não trocar automaticamente por biblioteca de ícones.

Trocar SVGs por Lucide/FontAwesome/etc. mudaria geometria e não atende paridade 1:1.

## Classes e especificidade

A migração deve respeitar a cascade existente.

Ordem inicial sugerida:

```tsx
import './globals.css';
import '@/styles/menu-flipbook.css';
```

Se o CSS for dividido, a ordem final precisa reproduzir a precedência atual entre `style.css` e `assets/css/menu-flipbook.css`.

## Estilos inline

Existem estilos inline no legado para detalhes como:

- delay de reveal;
- cores/tamanhos de SVG;
- pequenos alinhamentos;
- cursor;
- textos auxiliares.

Na primeira migração, convertê-los literalmente para `style={{ ... }}` é aceitável.

A remoção desses inline styles deve ser uma tarefa posterior, não parte da paridade.

## Design system alvo após a paridade

Depois que o Next reproduzir o legado, o sistema pode evoluir para:

```text
styles/
├── tokens.css
├── reset.css
├── typography.css
├── utilities.css
├── motion.css
└── components/
    ├── buttons.css
    ├── navigation.css
    ├── modal.css
    └── section-heading.css
```

Mas essa reorganização deve ser feita com screenshots/regressão visual para evitar mudanças acidentais.
