# Contrato de comportamento 1:1

## Objetivo

Este documento define os comportamentos que a versão Next.js deve reproduzir antes de qualquer modernização interna.

Uma seção não está migrada apenas porque “parece parecida”. Ela só está migrada quando os comportamentos abaixo também forem preservados.

## Navegação principal

### Desktop

- Logo leva ao topo `#home`.
- Links navegam suavemente para suas âncoras.
- Link ativo muda conforme a seção visível.
- CTA principal abre WhatsApp em nova aba.
- Redes sociais permanecem externas.

### Mobile

- Hamburger abre drawer.
- Overlay fecha drawer.
- Botão fechar fecha drawer.
- Clicar em item interno fecha drawer e navega para a seção.
- Estado visual do hamburger/drawer deve acompanhar exatamente o legado.

## Smooth scroll

Âncoras internas com `href` iniciando por `#` usam rolagem suave, exceto `href="#"`.

Na migração não adicionar router navigation para essas âncoras; elas pertencem à mesma página.

## Scroll spy

O legado calcula seções relevantes por:

- `section[id]`;
- `footer[id]`;
- `div[id].tw-acc-header`.

O offset efetivo usado no cálculo é aproximadamente `scrollY + 160`.

A versão Next deve reproduzir a percepção atual do item ativo, mesmo que internamente use `IntersectionObserver`.

## Reveal on scroll

Elementos `.reveal-up` são observados uma única vez.

Parâmetros atuais:

- threshold: `0.05`;
- rootMargin: `0px 0px -40px 0px`;
- após ativar, o observer deixa de observar o elemento.

## Parallax

### Condições

- Desativado em viewport `<= 768px`.
- Elementos são encontrados pelas classes `.parallax-img`, `.parallax-img-h` e `.parallax-element`.
- Velocidade pode vir do próprio elemento ou do container.
- Direção pode ser vertical ou horizontal.

### Interpolação

O legado usa interpolação via `requestAnimationFrame`, aproximando o valor atual do alvo com fator `0.08`.

O visual depende disso. Não substituir por uma biblioteca de animação antes de confirmar equivalência.

### Transformações

Vertical:

```text
translate3d(0, Ypx, 0)
```

Horizontal:

```text
translate3d(calc(-50% + Xpx), 0, 0)
```

A versão Next deve preservar a posição-base de cada imagem antes de aplicar o deslocamento.

## Eventos & Experiências

### Desktop

O comportamento visual principal é controlado pelas classes do accordion e pelo CSS existente.

### Mobile

Breakpoint funcional: `max-width: 860px`.

Ao tocar em painel:

1. se o clique for no CTA de um painel já ativo, o link pode seguir normalmente;
2. caso contrário, o clique padrão é interrompido;
3. todos os painéis perdem `.tw-acc__panel--active`;
4. o painel escolhido recebe a classe;
5. após duas frames de `requestAnimationFrame`, o painel é centralizado com `scrollIntoView`;
6. `behavior: smooth`, `block: center`, `inline: nearest`.

Esse detalhe deve ser preservado na migração React.

## Galeria infinita

### Estado inicial

- O conjunto original possui 12 itens.
- O legado cria duas cópias adicionais do conjunto original.
- A posição inicial começa no equivalente a uma largura completa do conjunto.

### Auto-scroll

- velocidade normal aproximada: `0.5` pixel/frame;
- hover reduz para aproximadamente `0.25`;
- usa `requestAnimationFrame`;
- ao atingir o fim lógico, a posição é normalizada sem salto visual.

### Reduced motion

Se `prefers-reduced-motion: reduce` estiver ativo, o auto-scroll não deve iniciar.

### Interação

Preservar:

- drag por mouse;
- touch;
- setas esquerda/direita;
- pausa temporária do movimento automático após interação;
- retomada posterior;
- clique em item abre lightbox correspondente.

## Lightbox

Preservar:

- imagem selecionada;
- texto alternativo correspondente;
- contador;
- anterior/próxima;
- botão fechar;
- fechamento apropriado por teclado/overlay conforme legado;
- navegação circular quando aplicável no código atual.

## Cardápio / Menu Modal

Este é o recurso de maior risco da migração.

### Abertura

Qualquer elemento `.trigger-menu-modal` abre o mesmo modal.

Ao abrir:

- registrar `window.scrollY`;
- guardar elemento focado;
- marcar modal como aberto;
- pausar vídeos de fundo;
- mostrar modal;
- `aria-hidden=false`;
- bloquear scroll de `html` e `body`;
- focar stage sem deslocar a página;
- inicializar flipbook apenas se ainda não existir.

### Fechamento

Ao fechar:

- marcar fechado;
- cancelar estado de animação/pinch;
- ocultar modal;
- `aria-hidden=true`;
- liberar scroll;
- restaurar vídeos que estavam rodando;
- sair de fullscreen se necessário;
- devolver foco ao elemento anterior;
- restaurar posição vertical de scroll.

### Inicialização PageFlip

Configurações atuais essenciais:

- width: `595`;
- height: `842`;
- size: `stretch`;
- minWidth: `220`;
- maxWidth: `980`;
- minHeight: `260`;
- maxHeight: `1385`;
- drawShadow: `true` no desktop;
- maxShadowOpacity: `0.48` desktop;
- flippingTime: `720` desktop;
- usePortrait: `true`;
- showCover: `true`;
- autoSize: `false`;
- mobileScrollSupport: `false`;
- swipeDistance: `30`;
- useMouseEvents: `true`;
- showPageCorners: `true`;
- disableFlipByClick: `false`.

### Mobile flipbook

Breakpoint: `max-width: 820px`.

Diferenças atuais:

- páginas WebP específicas para mobile;
- shadow reduzida;
- animação mais rápida;
- pinch zoom;
- resolução de canvas ajustada a devicePixelRatio.

### Desktop flipbook

- páginas desktop são imagens PNG locais;
- capa é centralizada por cálculo de canvas/bounds;
- canvas usa pixel ratio mínimo maior para manter nitidez.

### Teclado

Preservar:

- Escape: fechar;
- ArrowRight: próxima página;
- ArrowLeft: página anterior;
- Home: primeira página;
- End: última página;
- Tab/Shift+Tab: focus trap dentro do modal.

### Fullscreen

Usar Fullscreen API quando disponível e manter rótulo acessível sincronizado com o estado.

### Vídeos de fundo

Ao abrir o menu:

- todos os vídeos fora do modal são pausados;
- handlers impedem reinício acidental durante o modal;
- somente vídeos que estavam tocando antes devem ser retomados no fechamento.

## Vídeos da página

### Hero

- autoplay;
- loop;
- muted;
- playsInline.

### Cardápio

- autoplay;
- muted;
- loop;
- playsInline.

Não introduzir controles nativos visíveis na primeira migração.

## WhatsApp

Não substituir os links durante a migração.

O telefone base utilizado pelo site é `5591984040710` e existem mensagens distintas por contexto:

- reserva geral;
- jantar harmonizado;
- eventos corporativos;
- máquinas de vinho;
- demais CTAs específicos existentes.

Centralizar as URLs em configuração é permitido, desde que o texto final codificado permaneça equivalente.

## SEO e metadata

Preservar:

- idioma `pt-BR`;
- title;
- description;
- canonical;
- theme-color;
- Open Graph;
- Twitter Card;
- JSON-LD `Restaurant`;
- endereço;
- coordenadas;
- telefone;
- culinária;
- priceRange;
- horários;
- redes sociais.

No App Router, pode ser implementado usando `metadata` + script JSON-LD, mas o conteúdo deve continuar equivalente.

## Critério de aceite de paridade

Cada recurso deve passar por comparação nos seguintes tamanhos, no mínimo:

- 1440 × 900;
- 1366 × 768;
- 1024 × 768;
- 820 × 1180;
- 768 × 1024;
- 430 × 932;
- 390 × 844;
- 360 × 800.

A comparação deve avaliar:

- posição;
- escala;
- tipografia;
- corte de imagens;
- espaçamento;
- estado de hover/focus;
- transições;
- scroll;
- modal;
- teclado;
- touch;
- parallax;
- galeria;
- cardápio.
