# Flipbook do Cardápio — Design

## Objetivo

Substituir o visualizador nativo de PDF usado pelo modal do cardápio por uma experiência de flipbook local, inspirada no exemplo do Elfsight, mantendo o PDF existente como fonte e preservando a identidade visual The Wine.

## Escopo aprovado

- Abrir o flipbook pelo botão `VER CARDÁPIO` e pelo mockup do cardápio.
- Usar o PDF local como fonte do cardápio, sem usar `<iframe>` como visualizador principal.
- Exibir a capa isoladamente e centralizada; a partir da página 2, usar spreads de duas páginas no desktop.
- Virar uma folha por vez com o motor StPageFlip, evitando uma rotação conjunta das duas páginas visíveis.
- Oferecer setas anterior/próxima, contador e campo para ir diretamente a uma página.
- Permitir teclado (`ArrowLeft`, `ArrowRight`, `Home`, `End`, `Escape`) e gestos horizontais de toque.
- Oferecer zoom, ajuste à janela e tela cheia.
- Manter uma apresentação de página única em telas estreitas para preservar legibilidade.

## Arquitetura

O modal existente (`#menuModal`) continuará sendo a camada de abertura, fechamento e bloqueio de rolagem. Seu conteúdo será substituído por um palco de flipbook com uma área de página, navegação lateral e barra de controles.

A lógica do flipbook ficará em `assets/js/menu-flipbook.js`, carregada como script clássico para funcionar também quando o `index.html` for aberto por `file://`. O controlador instancia a biblioteca local StPageFlip, gerencia estado, controles e acessibilidade. As funções puras de paginação ficarão em `assets/js/menu-flipbook-state.mjs` e serão exportadas para teste em Node.

O PDF original permanece em `assets/CardapioMenu/CARDAPIO_THE_WINE.pdf` para download. As 12 imagens locais em `assets/CardapioMenu/pages/`, geradas a partir desse mesmo PDF, são carregadas pelo StPageFlip; isso evita o XHR bloqueado pelo Chrome quando o `index.html` é aberto diretamente por `file://` e mantém o conteúdo sincronizado com o PDF versionado.

## Estado e paginação

- `currentPage` é um índice 1-based.
- A página 1 é a capa e aparece sozinha.
- A partir da página 2, páginas pares iniciam um spread: 2–3, 4–5, 6–7 etc.
- `next` avança de 1 para 2 e depois em passos de 2.
- `previous` retorna de um spread para o anterior e de 2 para a capa.
- O contador mostra `página atual / total` e o campo aceita qualquer página válida.

## Interação e visual

- Fundo do modal: preto translúcido com blur, borda dourada e fechamento circular.
- Palco: fundo escuro, páginas com sombra e leve perspectiva 3D.
- Virada: animação de aproximadamente 720 ms controlada pelo StPageFlip, com sombra e perspectiva por folha; o estado visual é atualizado pelo evento de flip.
- Desktop: capa centralizada; spreads centralizados e setas fora das páginas.
- Mobile: uma página por vez, controles compactos e botão de tela cheia ocultado quando não suportado.
- O foco inicial vai para o botão fechar; o foco permanece no modal enquanto ele está aberto.

## Critérios de aceite

1. Clicar em `VER CARDÁPIO` abre o modal sem mostrar a toolbar do Chrome.
2. O primeiro carregamento mostra a capa e o total correto de páginas.
3. Próxima/anterior, campo de página, teclado e toque alteram a página correta.
4. A troca de página apresenta uma animação de flip de uma única folha, sem girar as duas páginas do spread como um bloco.
5. Zoom e tela cheia não quebram o layout nem liberam a rolagem da página de fundo.
6. Fechar por X, overlay ou Escape restaura a rolagem da página.
7. Em caso de erro de carregamento, o usuário recebe uma ação compreensível para tentar novamente ou baixar o PDF.
8. O layout continua utilizável em viewport desktop e mobile.

## Verificação

- Testes unitários com `node --test` para normalização, avanço, retorno e cálculo dos spreads.
- Teste de contrato estático para confirmar que o modal contém os controles e que o iframe antigo não é mais usado.
- Servir o projeto por HTTP local e validar o fluxo visual no navegador, incluindo abertura, troca de páginas, fechamento e responsividade.
