# Plano de migração 1:1 para Next.js

## Objetivo

Migrar o site estático atual para Next.js preservando primeiro a paridade visual e funcional. Melhorias internas e modernizações entram somente depois da equivalência.

## Princípios

- O legado é a referência de verdade.
- Não redesenhar durante a migração.
- Não trocar assets durante a migração.
- Não reescrever animações sem necessidade.
- Não transformar toda a página em Client Component.
- Migrar por blocos independentes.
- Validar cada bloco antes de avançar.
- Manter o site estático disponível como referência durante todo o processo.

---

## Fase 0 — congelar a referência

### Resultado esperado

Ter uma baseline explícita antes de criar o Next.

### Ações

1. Registrar commit/tag de referência do legado.
2. Registrar screenshots desktop/tablet/mobile da página completa e estados interativos.
3. Registrar vídeos curtos de:
   - parallax;
   - mobile drawer;
   - accordion de eventos;
   - galeria infinita;
   - drag/touch;
   - lightbox;
   - abertura/fechamento do cardápio;
   - page flip;
   - zoom;
   - fullscreen;
   - navegação por teclado.
4. Executar os testes existentes localmente.
5. Não fazer deploy a partir da branch de preparação.

---

## Fase 1 — scaffold Next sem substituir o legado

### Stack alvo

- Next.js com App Router.
- TypeScript.
- React.
- CSS global legado na fase inicial.

### Estrutura inicial

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
├── config/
├── hooks/
└── styles/
public/
└── assets/
```

### Regras

- Criar em diretório/projeto separado durante a migração ou em branch exclusiva de implementação.
- Copiar `assets/` para `public/assets/` sem renomear.
- Importar o CSS legado antes de tentar modularizar.
- Reproduzir metadata/JSON-LD.

---

## Fase 2 — shell da página

Migrar primeiro o que tem menor risco.

### Ordem

1. `Header` estático desktop.
2. `HeroSection` sem parallax.
3. `AboutSection` sem reveal.
4. `ExperiencePillarsSection` sem parallax.
5. `PairingsSection` sem parallax.
6. `MenuSection` sem modal.
7. `ReservationSection`.
8. `Footer`.

### Validação

Comparar visual sem adicionar ainda as interações complexas.

Quando o HTML/JSX estiver equivalente, avançar.

---

## Fase 3 — navegação e efeitos globais

Implementar componentes/hooks isolados:

### `MobileNavigation`

- drawer;
- overlay;
- hamburger;
- fechamento por link.

### `useScrollSpy`

- preservar offset visual atual;
- atualizar header desktop/mobile.

### `RevealOnScroll`

- mesmos thresholds;
- executar uma vez.

### `ParallaxController`

- mesmas classes/dados de velocidade;
- desligar em `<= 768px`;
- mesma interpolação perceptível;
- cleanup de listeners e animation frames.

Validar a página inteira novamente antes da próxima fase.

---

## Fase 4 — Eventos & Experiências

Criar configuração tipada de eventos e `EventsSection` client-side.

### Preservar

- markup visual;
- ícones SVG;
- item inicialmente ativo;
- expansão desktop;
- interação mobile em `<= 860px`;
- centralização por scroll;
- CTAs específicos de WhatsApp.

---

## Fase 5 — Galeria e Lightbox

### `GallerySection`

Implementar:

- 12 itens originais em configuração;
- conjuntos duplicados para loop;
- auto-scroll;
- hover speed;
- drag mouse;
- touch;
- arrows;
- pause/resume;
- reduced motion.

### `GalleryLightbox`

Implementar:

- índice selecionado;
- imagem/alt;
- contador;
- navegação;
- teclado;
- fechamento.

### Atenção React

A lista duplicada deve gerar keys determinísticas, por exemplo:

```text
set-0-item-0
set-1-item-0
set-2-item-0
```

para impedir comportamento inconsistente de reconciliação.

---

## Fase 6 — Cardápio Flipbook

Esta fase deve ser isolada das demais.

### Estrutura

```text
components/menu/
├── MenuModal.tsx
├── MenuToolbar.tsx
└── MenuFlipbook.tsx
```

### Requisitos de implementação

1. `MenuModal` controla visibilidade, foco e scroll lock.
2. `MenuFlipbook` inicializa PageFlip em `useEffect`.
3. Guardar instância em `useRef`.
4. Destruir instância no cleanup quando apropriado.
5. Proteger contra inicialização duplicada.
6. Preservar assets desktop/mobile.
7. Preservar opções atuais do PageFlip.
8. Preservar keyboard shortcuts.
9. Preservar pinch zoom.
10. Preservar fullscreen.
11. Preservar canvas resolution logic.
12. Preservar centralização da capa.
13. Preservar pausa/retomada dos vídeos externos.
14. Preservar scroll position ao fechar.

### Strict Mode

Durante desenvolvimento, efeitos React podem executar montagem/cleanup extra. A integração PageFlip precisa ser idempotente para não criar canvas/listeners duplicados.

---

## Fase 7 — centralização de configuração

Depois da paridade funcional, extrair strings repetidas para:

- `site.ts`;
- `navigation.ts`;
- `social.ts`;
- `content.ts`.

Não alterar copy durante a extração.

---

## Fase 8 — testes de regressão

Migrar/adaptar os testes legados para cobrir pelo menos:

- copy institucional;
- hero video;
- footer year;
- events accordion;
- reservation links;
- menu modal layout;
- menu modal navigation;
- menu modal scroll;
- modal background video pause;
- cover centering;
- flipbook behavior.

Adicionar testes de componentes somente depois que o comportamento estiver reproduzido.

---

## Fase 9 — validação visual 1:1

Executar comparação nos tamanhos definidos em `03-behavior-contract.md`.

### Estados que precisam de comparação

- topo sem scroll;
- header após scroll;
- drawer mobile aberto;
- seção Sobre;
- pilares;
- Harmonizações em diferentes posições de scroll;
- cardápio split;
- modal do cardápio aberto;
- capa do flipbook;
- spread interno;
- fullscreen;
- evento ativo desktop;
- evento ativo mobile;
- CTA;
- galeria;
- lightbox;
- footer.

### Critério

Não aprovar a migração por impressão geral. Corrigir diferenças de layout antes de fazer limpeza de CSS.

---

## Fase 10 — refatoração interna pós-paridade

Somente após aprovação 1:1:

1. dividir CSS por responsabilidade;
2. remover estilos inline;
3. reduzir `!important`;
4. consolidar tokens;
5. avaliar `next/font`;
6. avaliar `next/image` seção a seção;
7. remover IDs/classes estritamente legados quando não forem mais necessários;
8. substituir acesso global a `window` por APIs internas React;
9. eliminar dependências/arquivos duplicados confirmadamente obsoletos;
10. medir performance e otimizar.

## Definição de pronto

A migração Next está pronta quando:

- visual é equivalente nas viewports de referência;
- todos os recursos existentes funcionam;
- cardápio mantém navegação/touch/teclado/fullscreen;
- galeria e lightbox mantêm comportamento;
- parallax mantém percepção equivalente;
- mobile mantém interação equivalente;
- SEO e structured data permanecem equivalentes;
- links externos são os mesmos;
- nenhuma feature do legado foi perdida;
- a página não depende de um script monolítico global;
- Client Components ficam restritos às áreas interativas.
