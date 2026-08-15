# Ajuste dos controles e da leitura mobile do flipbook

## Objetivo

Deixar o modal do cardápio mais compacto e adequado ao uso em telas pequenas,
removendo controles pouco úteis e melhorando a leitura das páginas no mobile.

## Escopo aprovado

- Substituir os botões textuais “Tela cheia” e “Baixar PDF” por botões com SVGs
  inline, leves, acessíveis por teclado e com `aria-label`/tooltip.
- Remover do HTML, JavaScript e CSS os controles “+”, “−” e “Ajustar”.
- Manter o zoom por gesto de pinça já existente.
- Usar uma variante mobile de páginas do cardápio com maior densidade visual,
  preservando o carregamento local e evitando requisições ao PDF no navegador.
- Ajustar o enquadramento mobile para aproveitar a largura disponível sem
  distorcer ou cortar a página.

## Implementação

O modal continuará usando o motor local StPageFlip. Os ícones serão elementos
SVG embutidos no próprio HTML, sem dependência externa. O download continuará
apontando para o PDF local, enquanto a leitura usará as imagens locais
otimizadas por viewport. A seleção de assets mobile e o cálculo de resolução
do canvas serão ajustados de forma independente para evitar impacto no desktop.

## Acessibilidade e interação

- Cada ícone terá nome acessível e texto de apoio via `title`.
- A navegação por teclado, setas, paginação e pinça será preservada.
- A remoção dos controles de zoom não removerá o zoom por pinça.

## Validação

- Testes automatizados devem confirmar a presença dos ícones, a remoção dos
  controles antigos, a seleção dos assets mobile e a configuração responsiva.
- Executar a suíte existente com `node --test tests/menu-flipbook.test.mjs`.
- Validar o carregamento local no navegador e confirmar que não há erros de
  console nem requisições CORS ao PDF durante a leitura.
