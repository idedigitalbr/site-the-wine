# Arquitetura

atualizado: 2026-07-20

## Estrutura principal

- **index.html**: Ponto de entrada do site, contendo a estrutura semântica HTML5 e os scripts de interatividade (Parallax, Scroll Spy e efeito de proximidade do cursor).
- **style.css**: Folha de estilos unificada contendo o design system, variáveis de marca (dourado, creme, tons de cinza/preto), e estilos responsivos.
- **assets/**: Subpastas organizadas por seção contendo imagens otimizadas em formato `.webp`.
- **Infos e Contexto/**: Documentos de referência e guias da marca.

## Fluxos importantes

- **Reservas**: Modal de reserva coleta informações e valida no frontend. 
- **Deploy**: Pipeline automático via GitHub Actions e Docker Compose na VPS.

## Decisoes tecnicas

- **Separação de CSS (2026-07-20)**: Extração do bloco `<style>` interno de 2.000 linhas de `index.html` para `style.css` visando melhor performance (caching de recursos), modularização de código e otimização do SEO (redução do tamanho do HTML).
