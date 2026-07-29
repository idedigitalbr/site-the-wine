# Changelog

## 2026-07-29

- **Padronização Global Estrita de Headlines e Textos de Apoio**:
  - Padronizadas todas as headlines/títulos principais de seções para **`41px !important`** (`font-weight: 600`, `letter-spacing: 0.04em`, *Cormorant Garamond*).
  - Padronizados todos os textos de apoio e descrições para **`17px !important`** (`font-weight: 400`, `line-height: 1.7`, *Albert Sans*).
  - Atualizada a tag de versão do arquivo CSS no `index.html` para `href="style.css?v=20260729_v41"` forçando a limpeza instantânea de cache nos navegadores.
  - Commit `a93938da3db470087b99ab5d642da2f0a78d6371` enviado para o GitHub e deploy automático disparado via GitHub Actions para a VPS.

## 2026-07-20

- **Correção da Responsividade Mobile & Gaveta de Navegação**:
  - Eliminado o overflow horizontal (barra preta na direita) forçando `overflow-x: hidden !important` em `html` e `body` e usando `transform: translateX(100%)` na gaveta `.mobile-nav`.
  - Reestruturado o drawer do menu mobile com `z-index: 200`, botão fechar (**✕**) visível e toque otimizado no botão hamburger.
  - Corrigidas sobreposições com `!important` no mockup da seção de cardápio no celular.

- **Reformulação Completa do Rodapé no Mobile**:
  - Reescritas as regras CSS do rodapé para dispositivos móveis (`max-width: 992px`) convertendo o grid em `display: flex !important; flex-direction: column !important`.
  - Desativado o `white-space: nowrap` em todos os elementos (links, endereços, horários e telefone) para impedir quebra ou corte de conteúdo.
  - Alinhadas centralizadamente as 6 colunas, com mapa emoldurado, ícones e botões centralizados e espaçamento inferior adequado para não cobrir pela barra flutuante do WhatsApp.

- **SEO & Rich Metadata (Open Graph, Twitter Cards, Schema.org JSON-LD)**:
  - Adicionadas meta tags Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) para previews ricos no WhatsApp/Instagram/Facebook.
  - Adicionadas Twitter Card meta tags para compartilhamento.
  - Implementado Schema.org JSON-LD `@type: Restaurant` com endereço, coordenadas GPS, telefone, horário de funcionamento e redes sociais.
  - Adicionados `<meta name="theme-color">` e `<link rel="canonical">`.

- **Widget Flutuante do WhatsApp (CRO)**:
  - Adicionado botão flutuante fixo no canto inferior direito com gradiente verde WhatsApp, animação de pulso e tooltip "Reservar Mesa".

- **Correção Crítica do Motor Parallax 3D**:
  - Identificado e removido `})();` (fechamento de IIFE órfão) que causava `SyntaxError` fatal, matando todo o segundo bloco `<script>` (parallax, scroll spy, navbar).
  - Removido conflito de `transform` entre `@keyframes heroFadeIn` e o motor de inércia Lerp.
  - Implementada atribuição direta de `style.transform = translate3d(...)` no loop de animação 60fps para garantir movimento visível.

- **Limpeza de Arquivos Obsoletos**:
  - Removidos `footer.html` e `secao-accordion-expanding.html` (componentes já integrados ao `index.html`).

- **Remoção de Parallax do Mockup do Cardápio & Refinamentos Visuais**:
  - Removido o movimento parallax da imagem flutuante do cardápio (`MENU-THE-WINE-MOCKUP.webp`), fixando-a no centro da divisão 66/34.
  - Atualizada a tag da seção de cardápio para `-- MENU --` e aplicada a fonte cursiva de destaque na palavra *Cardápio*.
  - Adicionado botão sólido `VER CARDÁPIO` em tom escuro com efeito hover dourado.

- **Implementação do Novo Rodapé Premium de 6 Colunas e Substituição no `index.html`**:
  - Reestruturado o rodapé no `index.html` em um layout premium de 6 colunas alinhado com a referência `REF-RODAPE-FINAL.png`.
  - Adicionada logo oficial com divisor decorativo e links de redes sociais (Instagram, Facebook, TikTok, YouTube).
  - Criada lista de links rápidos com ícone de diamante (`✦`), seção de contato e endereço detalhado com mapa em destaque centralizado e emoldurado.
  - Ajustada a coluna "Horário de Funcionamento" com título em duas linhas e a coluna "Fale Conosco" com tipografia moderna sans-serif no número do WhatsApp e botão "Chamar no WhatsApp".
  - Integrado o Banner de Reserva (CTA) e a Galeria em Carrossel Infinito de Fotografias com navegação por drag/touch e modal Lightbox para tela cheia.

- **Remoção de Parallax e Filtro Escuro na Seção Nossa História**:
  - Removido o efeito parallax da imagem de fundo da seção `#sobre` (Nossa História) mantendo a imagem estática de fundo.
  - Removidos os filtros e camadas de escurecimento sobre a imagem de fundo para exibir as cores naturais da fotografia.

- **Ajuste Fino de Centralização e Parallax na Seção Harmonizações (Sem Corte / Sem Vão Preto)**:
  - Corrigida a regra CSS da classe `.parallax-img-h` utilizando `left: 50%` e `transform: translate3d(calc(-50% + var(--parallax-x, 0px)), 0, 0)` para manter a imagem `S3 Harmonizacoes-FotoHorizontal.webp` (1774x887) perfeitamente centralizada no repouso (scroll center).
  - Ajustada a altura para 110% (`height: 110% !important; top: -5% !important`) com `width: auto !important` e `min-width: 220% !important`, eliminando o aspecto quadrado/cortado forçado e garantindo margem horizontal suficiente para translação suave via parallax sem a geração de vãos pretos ("vão preto") nas bordas.
  - Ajustada a velocidade do parallax horizontal no `index.html` para `0.35`.

- **Parallax Horizontal e Ajustes da Seção Harmonizações**:
  - Implementado Parallax Horizontal (`--parallax-x`) para deslizar a foto da adega (`S3 Harmonizacoes-FotoHorizontal.webp`) da esquerda para a direita durante a rolagem.
  - Aplicada a propriedade `max-width: none !important` e expansão de largura de 150% para eliminar vãos pretos e permitir translação irrestrita.
  - Restaurada a imagem da taça de vinho (`S3-TACA-VINHO.webp`) na coluna direita em 3 colunas (`1.15fr 1.4fr 0.45fr`), alinhada no topo direito com altura original de 1080px e fundo preto sólido.
  - Ajustada a headline principal em 2 linhas equilibradas com `<br>`.
  - Invertido o sentido do Parallax do Card 2 ("Carta de Vinhos") para flutuar para cima (`-0.25`), em sentido oposto aos cards das pontas.
- **Implementação do Efeito Parallax Ultrassuave 3D (Calibrado em Força 3.7)**:
  - Desenvolvido motor de física de inércia em 60fps usando `requestAnimationFrame` + Lerp (`currentY += (targetY - currentY) * 0.085`) via variável CSS `--parallax-y`.
  - Aplicados movimentos opostos e em velocidades calibradas (nível 3.7) em todas as seções do site (Hero, História, 3 Cards de Experiência, Harmonizações, Cardápio Split, Eventos, Banner Reserva e Localização).
  - Resolvidos conflitos com animações CSS `.reveal-up`, preservando opacidade e liberando a aceleração de hardware sem travamentos.
  - Ajustadas regras de centralização `translateY(calc(-50% + var(--parallax-y)))` para manter o menu flutuante e pratos laterais perfeitamente alinhados durante o movimento.
- **Resolução de Cache e Ajustes Locais de Estilo (VPS Sync)**:
  - Corrigido problema de cache do navegador/Cloudflare incrementando o parâmetro de versão do arquivo CSS no `index.html` para `?v=20260720_v2`.
  - Sincronizados os ajustes locais da folha de estilos (`style.css`) que não haviam sido comitados no pipeline anterior (altura e opacidade do gradiente de topo `.header`, redução do overlay escuro do hero `.hero-overlay-dark`, e remoção do overlay cinza `.historia-overlay` da seção de História).
- **Redesenho Completo da Seção Cardápio**:
  - Reestruturado o layout em formato Split Screen com 66% de área creme no lado esquerdo e 34% de vídeo em loop de fundo (`video-cardapio.mp4`) no lado direito.
  - Ajustada a altura da seção para ocupar 100% da primeira dobra no desktop (`calc(100vh - 96px)`).
  - Posicionada a imagem do mockup do cardápio (`MENU-THE-WINE-MOCKUP.webp`) em modo flutuante na linha de transição/divisão (66% left) com altura proporcional (`72%`), sobrepondo o fundo creme e avançando sutilmente sobre o vídeo.
  - Atualizada a tipografia para o texto da tag (`CONFIRA O NOSSO MENU`) e o título principal em linha única (`Confira o nosso Cardápio`).
  - Removidos controles, overlays e botões de navegação sobre o vídeo de fundo.
  - Ajustada a responsividade para empilhamento vertical suave em telas menores.
- **Conversão e Organização de Imagens para Web**:
  - Comprimidas e convertidas 18 imagens originais da pasta `noavsfotos-origniais-wine` para o formato `.webp` otimizado para web (qualidade 82).
  - Identificados os conteúdos das imagens e organizados em 4 pastas específicas sob `assets/`: `Gastronomia` (6 fotos), `Vinhos` (5 fotos), `Ambiente` (4 fotos) e `Experiencias` (3 fotos).
  - Renomeados todos os arquivos para nomes limpos e amigáveis para SEO (ex: `garrafas-vinho-cartuxa-tapada.webp`, `prato-camarao-cremoso.webp`, etc.).
- **Vídeo de Fundo no Topo (Hero)**:
  - Substituída a imagem de fundo estática no Hero pelo vídeo `thwine-video-topo.mp4` configurado para reprodução automática (`autoplay loop muted playsinline`).
  - Removido o filtro global de brilho (`brightness(0.35)`) do vídeo, mantendo o vídeo claro.
  - Ajustado o gradiente escuro (`.hero-overlay-dark`) para cobrir apenas os 20% superiores da tela para garantir a leitura do menu, deixando o restante do vídeo sem escurecimento.
- **Animações de Carregamento (Intro)**:
  - Adicionado efeito de fade-in com deslocamento suave para os elementos centrais e base do Hero.
  - A logo central e sua linha divisória aparecem após 1 segundo de delay (`1s`), e o indicador de rolagem ("Role para saber mais") aparece após 1.5 segundos (`1.5s`).
- **Modularização de Estilos**:
  - Extraído o bloco interno `<style>` de `index.html` (~2.000 linhas) para o arquivo externo `style.css` na raiz do projeto.
  - Atualizado o `<head>` do `index.html` com o respectivo link.
- **Atualização de Imagens Oficiais**:
  - Removidas imagens rejeitadas das pastas e substituídas no código HTML por fotos atualizadas das respectivas pastas.
  - Substituída a imagem da seção "Cardápio à la carte" pelo mockup visual `MENU-THE-WINE-MOCKUP.webp`.

## 2026-07-16

- **Limpeza de Repositório**:
  - Removidos assets não utilizados na pasta `assets/S1 TOPO HERO/` (`hero-restaurant-oficial.webp` e `wine_pouring_hero_1920x1080-internet.webp`).

## 2026-07-15

- **Efeito Parallax Fluido de Alta Performance**:
  - Desenvolvida a classe JavaScript `FluidParallax` com `IntersectionObserver` + `requestAnimationFrame` para atualização a 60fps com aceleração de GPU via `translate3d`.
  - Efeito aplicado exclusivamente nas imagens de fundo das seções **Hero** (`#home`) e **Nossa História** (`#sobre`), alinhando com o padrão visual de referência (Restaurante Sapporo).
  - Desativado automaticamente em telas menores que 992px (mobile/tablet) para preservar desempenho e legibilidade.
  - Removida a transição CSS `transform 0.15s` da classe `.parallax-img` para eliminar qualquer atraso elástico (lag) durante a rolagem.
- **Alinhamento Total de Imagens Oficiais**:
  - Hero: substituído por `hero-restaurant-oficial.webp` (foto real do salão).
  - Seção Harmonizações: substituído por `IMG_3986-oficial.webp` (prato autoral).
  - Seção Cardápio: substituído por `IMG_7386-oficial.webp` (vinho premium).
  - Seção Eventos: slideshow de 3 slides com fotos `Sessão The Wine 15032023 - 162, 166, 172-oficial.webp`.
  - Seção Reserva: substituídos por `foto_sobremesa_harmonizacao-oficial.webp` (esq.) e `IMG_7386-oficial.webp` (dir.).
- **Limpeza de Arquivos**:
  - Removido o arquivo standalone não utilizado `secao-missao-visao-valores.html`.
- **Deploy**:
  - Commit `a214557` enviado ao GitHub e implantado com sucesso na VPS (`thewine.suporteide.digital`).

## 2026-07-14

- **Redesenho da Seção de Experiência**:
  - Implementado novo layout de grade em 3 colunas independentes (Gastronomia, Carta de Vinhos e Ambiente) ocupando 100% da largura e altura da dobra (edge-to-edge viewport).
  - Adicionado script interativo para controle dinâmico de desfoque (backdrop-filter de 1.5px a 5px) e escurecimento do fundo (opacidade de 6% a 68% e opacidade da borda dourada de 8% a 75%) baseado na distância do cursor do mouse ao centro do card.
  - Ajustada a visibilidade combinada da imagem de fundo para iniciar em 40% de escurecimento (overlay de 0.4 de opacidade) e atingir 100% de visibilidade potente no hover (overlay de 0 de opacidade).
  - Substituídos os placeholders/imagens temporárias da internet pelos assets oficiais reais (`IAG_6967-oficial.webp` para prato com comida na Gastronomia, `IAG_6530-oficial.webp` para Carta de Vinhos, e `Sessão The Wine 15032023 - 156-oficial.webp` para o salão físico no card Ambiente).
  - Restaurada a integridade visual da seção "Nossa História" (Section 2) após reajuste do código.
- **Deploy na VPS e Integração Contínua**:
  - Configurado o subdomínio `thewine.suporteide.digital` no Cloudflare apontando para o IP da VPS.
  - Criadas chaves SSH exclusivas para o deploy seguro deste projeto.
  - Cadastrados segredos de repositório e deploy key no GitHub.
  - Criados os arquivos de conteinerização (`Dockerfile`, `docker-compose.yml`, `.dockerignore`) e workflow do GitHub Actions (`deploy-vps.yml`).
  - Realizado o clone inicial e deploy do container `thewine-web` via Docker Compose e Traefik na VPS.
  - Validação realizada com sucesso via HTTPS.

## 2026-07-13

- **Identificação de Origem dos Assets (Nomes)**:
  - Adicionado o sufixo `-oficial` no final das fotos reais do local e do ensaio fotográfico (ex: `hero-restaurant-oficial.webp`, `IAG_*-oficial.webp`, `IMG_*-oficial.webp`, `Sessão The Wine*-oficial.webp`).
  - Adicionado o sufixo `-internet` no final de todas as fotos baixadas da internet (ex: `wine_pouring_hero_1920x1080-internet.webp`, `experiencia-internet.webp`, `shrimp_plate-internet.webp`).
  - Atualizadas as referências nos arquivos HTML para refletir os novos nomes de arquivos.
  - Sincronizado e enviado para o GitHub.
- **Otimização e Reorganização de Assets**:
  - Reduzidas imagens pesadas (fotos de 5-7MB convertidas e otimizadas para `.webp` com largura máxima de 1920px).
  - Organizados os assets em subpastas correspondentes às seções do site (`Logos`, `S1 TOPO HERO`, `S2 Sobre Nossa Historia`, `S3 Experiencia`, `S4 Gastronomia`, `S5 Vinhos`, `S6 Eventos`). A pasta `MISC` foi eliminada.
  - Distribuídas as fotos gerais da sessão fotográfica e o vídeo nos respectivos diretórios de seção (ex: vídeo e foto hero no `S1 TOPO HERO`, carta e garrafas no `S5 Vinhos`, fotos da sessão no `S6 Eventos`, etc.).
  - Atualizadas todas as referências aos caminhos em `index.html`, `secao-missao-visao-valores.html` e `secao-nossa-historia.html`.
  - Pushed de todas as modificações para o repositório no GitHub.
- **Publicação no GitHub e Reorganização**:
  - Movido o projeto de `Offline/test-wine` para `Online/site-the-wine`.
  - Inicializado o repositório Git local, configurada a branch `main` e realizado o primeiro commit.
  - Criado o repositório privado `idedigitalbr/site-the-wine` no GitHub e realizado o push dos arquivos.
  - Atualizada a pasta de documentação no Obsidian para `online/site-the-wine`.
- **Correção de Informações da Marca**:
  - Correção do endereço de Nazaré (Av. Alcindo Cacela, 1848 - Mezanino do +B Supermercados) no rodapé e no botão de localização.
  - Atualização do link e iframe do mapa do Google para as coordenadas exatas de Nazaré.
  - Correção dos horários de funcionamento (Quarta a Sábado das 18:30 às 23:30, segundas e terças fechadas para eventos privados).
  - Correção de telefone/WhatsApp para o número real (91) 98404-0710 nas ações do site (botão flutuante, rodapé, modal de reserva).

## 2026-07-08

- Sincronização inicial automática e mapeamento da estrutura do projeto.
