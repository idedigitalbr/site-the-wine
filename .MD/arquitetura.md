# Arquitetura

atualizado: 2026-08-25

## Estrutura principal atual

- **index.html**: ponto de entrada do site. Contém markup semântico, metadata/SEO, composição das seções e parte da lógica JavaScript de navegação, galeria, lightbox, reveal, scroll spy e parallax.
- **style.css**: folha de estilos principal. Contém tokens de design, estilos globais, seções, responsividade e efeitos.
- **assets/css/menu-flipbook.css**: estilos específicos do modal/leitor do cardápio.
- **assets/js/menu-flipbook.js**: comportamento do modal e leitor do cardápio, incluindo navegação, zoom, teclado, fullscreen, foco, scroll lock e integração PageFlip.
- **assets/js/page-flip.browser.js**: biblioteca utilizada pelo flipbook.
- **assets/**: imagens, vídeos, logos, cardápio, páginas renderizadas do cardápio e demais recursos visuais.
- **tests/**: testes de regressão do comportamento estático atual.

## Módulos funcionais do frontend

1. Header e navegação desktop.
2. Drawer de navegação mobile.
3. Hero em vídeo.
4. Sobre / The Wine Experience.
5. Pilares: Gastronomia, Carta de Vinhos e Ambiente.
6. Harmonizações.
7. Cardápio split.
8. Modal e flipbook do cardápio.
9. Eventos & Experiências em accordion.
10. CTA de reserva.
11. Galeria infinita.
12. Lightbox.
13. Footer, localização, horários e contato.
14. Efeitos globais: smooth scroll, scroll spy, reveal e parallax.

## Fluxos importantes

### Reservas

Os CTAs atuais direcionam diretamente para WhatsApp com mensagens específicas por contexto.

### Cardápio

O cardápio é tratado como subsistema independente e usa imagens locais de páginas + PageFlip. Existem comportamentos específicos para desktop e mobile.

### Galeria

A galeria usa conjunto duplicado de imagens para criar loop visual contínuo e abre lightbox próprio.

### Motion

O parallax é controlado por JavaScript com `requestAnimationFrame` e velocidades definidas por atributos `data-parallax-*`.

## Design system existente

O `style.css` já possui tokens globais de:

- cores;
- tipografia;
- container;
- transições.

Esses tokens são a base que deve ser preservada durante a futura migração.

## Preparação para Next.js

A documentação completa da migração está disponível em:

- `NEXT_MIGRATION.md`
- `docs/next-migration/`

A estratégia definida é migrar para Next.js com App Router + TypeScript por componentes e responsabilidades, mantendo o legado como referência visual/funcional 1:1.

## Regra de segurança

A preparação para Next.js nesta branch não autoriza deploy e não deve alterar o visual existente. Mudanças de framework e mudanças de design devem ser tratadas como etapas separadas.
