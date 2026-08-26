# Auditoria do frontend estático para migração Next.js

## Objetivo

Registrar o estado arquitetural do site estático antes da migração para Next.js, identificando responsabilidades, acoplamentos e pontos que precisam ser preservados para uma reprodução 1:1.

## Estado atual

O site é uma aplicação estática composta principalmente por:

- `index.html` — markup, conteúdo, SEO e parte importante da lógica JavaScript inline.
- `style.css` — design system, estilos globais, estilos de seções, responsividade e efeitos.
- `assets/css/menu-flipbook.css` — estilos específicos do leitor do cardápio.
- `assets/js/menu-flipbook.js` — estado e comportamento do leitor do cardápio.
- `assets/js/page-flip.browser.js` — biblioteca de page flip usada pelo cardápio.
- `assets/` — imagens, vídeos, PDF, páginas do cardápio, logos e demais recursos visuais.
- `tests/` — testes de regressão pontuais do comportamento atual.

## Diagnóstico arquitetural

### 1. `index.html` está sobrecarregado

O arquivo concentra quatro categorias de responsabilidade:

1. **Documento e SEO**
   - `<title>` e description.
   - canonical.
   - Open Graph.
   - Twitter Cards.
   - Schema.org JSON-LD.
   - carregamento de Google Fonts.

2. **Composição visual**
   - header e navegação.
   - drawer mobile.
   - hero.
   - seções de conteúdo.
   - cardápio.
   - eventos.
   - CTA.
   - galeria.
   - lightbox.
   - footer.

3. **Interações locais**
   - accordion mobile de Eventos & Experiências.
   - galeria infinita.
   - drag/touch da galeria.
   - lightbox.
   - drawer mobile.
   - smooth scroll.
   - scroll spy.
   - reveal on scroll.
   - atualização automática do ano do footer.

4. **Efeitos de página**
   - motor de parallax.
   - requestAnimationFrame.
   - controle de transforms em elementos visuais.

Em Next.js essas responsabilidades não devem permanecer em `page.tsx`.

### 2. Há JavaScript global dependente diretamente do DOM

O legado usa padrões como:

- `document.querySelector` / `querySelectorAll`.
- listeners globais em `document` e `window`.
- manipulação direta de `style.transform`.
- classes `active` como estado visual.
- `window.openMenuModal` e `window.closeMenuModal`.
- `window.matchMedia` para comportamento responsivo.

Esses comportamentos deverão virar componentes client-side e hooks isolados no Next, sem alterar a lógica perceptível pelo usuário.

### 3. O cardápio é um subsistema próprio

`assets/js/menu-flipbook.js` contém estado suficiente para ser tratado como um módulo independente:

- página atual;
- total de páginas;
- zoom;
- modal aberto/fechado;
- loading e erro;
- fullscreen;
- resize;
- touch/pinch;
- navegação por teclado;
- focus trap;
- restauração de foco;
- scroll lock;
- pausa/restauração dos vídeos de fundo;
- ajuste de resolução do canvas;
- centralização específica da capa;
- modo responsivo desktop/mobile.

Na migração, esse código não deve ser simplesmente colado em `useEffect` de `page.tsx`. Deve virar um conjunto fechado de componentes e hooks.

### 4. O CSS possui tokens, mas ainda mistura níveis de abstração

Já existem variáveis globais úteis, incluindo:

- `--wine-black`
- `--wine-ink`
- `--wine-panel`
- `--wine-panel-2`
- `--wine-gold`
- `--wine-gold-dark`
- `--wine-gold-soft`
- `--wine-white`
- `--wine-cream`
- `--wine-muted`
- `--wine-border`
- `--wine-glow`
- `--font-display`
- `--font-body`
- `--font-script`
- `--container`
- `--transition-premium`

Isso já funciona como início de design system e deve ser migrado primeiro, antes das seções.

Por outro lado, ainda há:

- estilos inline no HTML;
- valores de breakpoint repetidos;
- regras com `!important` usadas como correções incrementais;
- CSS de componente e CSS de layout no mesmo arquivo;
- estilos específicos do flipbook separados parcialmente.

A migração deve organizar isso sem reinterpretar o design.

### 5. Os assets são parte do contrato visual

A migração precisa preservar inicialmente os mesmos arquivos e enquadramentos. Trocar imagem, recomprimir, recortar ou usar `next/image` com dimensões diferentes pode alterar o resultado visual.

Recomendação para a primeira versão Next:

- copiar os assets para `public/assets/` mantendo a mesma estrutura relativa;
- manter os mesmos caminhos lógicos;
- migrar para `next/image` apenas após a validação 1:1, quando fizer sentido;
- manter vídeos como `<video>` nativo na primeira etapa;
- manter as páginas renderizadas do cardápio como imagens locais;
- preservar a biblioteca PageFlip até existir uma substituição testada visualmente.

## Principais riscos da migração

### Risco alto

- diferença de parallax causada por ciclo de vida React;
- diferença de altura/layout antes da hidratação;
- flipbook inicializando duas vezes em desenvolvimento por React Strict Mode;
- scroll lock diferente no modal;
- mudança de scroll position ao fechar o cardápio;
- diferença de breakpoints entre CSS legado e componentes React;
- alteração do object-fit/object-position das imagens;
- comportamento diferente da galeria infinita ao duplicar elementos via React.

### Risco médio

- scroll spy selecionar seção diferente;
- reveal animation disparar em momento diferente;
- autoplay de vídeos variar por navegador;
- fontes carregarem em momento diferente e causarem layout shift;
- foco e teclado do modal sofrerem regressão.

### Risco baixo

- conversão de markup estático para JSX;
- centralização de URLs e copies em objetos de configuração;
- migração de metadata para `metadata`/JSON-LD no App Router.

## Dívidas encontradas que não devem ser confundidas com a migração

A migração 1:1 não é o momento de redesenhar o projeto. Problemas existentes devem ser catalogados, mas mudanças visuais ou funcionais só devem acontecer depois da paridade.

Exemplos:

- estilos inline;
- CSS muito extenso;
- dependência de seletores globais;
- comentários e nomes históricos de seções;
- duplicações de arquivos de cardápio/PDF;
- IDs/classes legados que poderiam ser renomeados.

Primeiro reproduzir. Depois refatorar internamente.

## Conclusão

O projeto é totalmente migrável para Next.js sem reconstrução visual, desde que a migração seja feita por **extração de responsabilidades** e não por redesign.

A unidade de migração deve ser cada seção/recurso, sempre comparada contra o legado estático.
