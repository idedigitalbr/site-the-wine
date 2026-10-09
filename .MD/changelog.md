# Changelog

## 2026-10-09

- **Otimização e Expansão Visual da Seção Eventos & Experiências no Mobile**:
  - Abertura padrão de todos os cards da seção no mobile (Jantar Harmonizado, Evento Corporativo e Máquinas de Vinho), removendo caixas colapsadas.
  - Aumento expressivo da tipografia (títulos para 1.85rem, subtítulos para 1.1rem, descrições para 1.05rem).
  - Ícones ampliados para 42px com destaque dourado e sombras de profundidade.
  - Boxes ampliados com altura mínima de 440px, cantos arredondados (14px), bordas douradas e respiro de 20px entre eles.
  - Botão de reserva com toque otimizado (48px) e redirecionamento direto ao WhatsApp sem travas.
- **Remoção do Botão de Download do Cardápio**:
  - Removido o botão de download de PDF da barra de ferramentas do leitor do cardápio (`MenuModal`), mantendo apenas os controles de navegação e tela cheia.
  - Removido o link de download no fallback de erro, garantindo que o PDF não fique exposto para download direto.

## 2026-09-04

- **Desativação Temporária do Cookiebot**:
  - Script do Cookiebot CMP comentado e desativado temporariamente no `layout.tsx` a pedido do cliente/gestão, mantendo a estrutura pronta para reativação futura.

## 2026-09-03

- **Configuração e Apontamento do Domínio Oficial (`thewineexperience.com.br`)**:
  - Adicionado roteamento no Traefik (`docker-compose.yml`) com suporte a múltiplos domínios e certificados SSL Let's Encrypt independentes:
    - `thewineexperience.com.br` (domínio oficial)
    - `www.thewineexperience.com.br` (domínio oficial com www)
    - `thewine.suporteide.digital` (subdomínio técnico mantido ativo para paridade e redundância)
  - Atualizada a URL canônica oficial para `https://thewineexperience.com.br/` em `next-app/src/config/site.ts`.
  - Atualizados metadados OpenGraph, Twitter Cards, Schema.org Restaurant (`url` e `image`) e fallback de `PUBLIC_APP_URL`.
  - Atualizadas rotas de fallback de disponibilidade e referências administrativas para o domínio oficial.
  - Configurado na VPS Contabo (`161.97.108.92`), validando resolução DNS via Cloudflare e teste de conectividade HTTPS com resposta `200 OK`.

## 2026-09-02 (Commit 38b05da)

- **Otimização e Refatoração da Página de Reservas (/reservas)**:
  - Centralização horizontal de todos os elementos (título, stepper, formulário) com regras de alta especificidade para evitar sobrescrita por resets legados.
  - Ajuste no espaçamento superior (155px) para descolar completamente do cabeçalho fixo sem encavalar textos.
  - Ajuste no espaçamento inferior (120px) antes do rodapé institucional.
  - Remoção da coluna lateral de informações redundantes a pedido do cliente, deixando o formulário em coluna única elegante e focado (max-width: 760px).
  - Remoção do subtítulo redundante abaixo do título principal.
  - Resiliência na API de reservas em ambiente local: conexão com API online da VPS em caso de banco local desligado, garantindo fluxo completo 100% testável.
  - Adição da página institucional de Termos e Privacidade (/termos-e-privacidade).
  - Atualização do crédito da agência no rodapé com logo oficial IDE Digital e links diretos.

## 2026-09-02

- **Implementação do Cookiebot CMP (LGPD / Consentimento de Cookies)**:
  - Integrado o script oficial do Cookiebot CMP (https://consent.cookiebot.com/uc.js) em 
ext-app/src/app/layout.tsx.
  - Configurado Domain Group ID / CBID: 812919e-de18-41f1-824c-bb88bba1a892.
  - Ativado o modo de bloqueio automático (data-blockingmode="auto").
  - Estratégia de carregamento via 
ext/script com strategy="beforeInteractive" no <body>, carregando globalmente para todo o site sem falhas de hidratação.
  - Varredura de integridade: sem trackers/cookies de terceiros conflitantes.
  - Documentação completa e checklist para migração futura de domínio registrados em .MD/cookiebot.md.

## 2026-09-02

- **Ajuste na Barra Inferior do Rodapé**:
  - Removido o ícone de diamante (ooter-bottom__center) da barra inferior de copyright e termos de uso.
## 2026-09-02

- **Ajuste na Linha Divisória do Rodapé**:
  - Mantida a linha dourada contínua com gradiente suave (ooter-logo-divider__line) abaixo da logo, removendo apenas o ícone de diamante central.
## 2026-09-02

- **Ajuste Visual no Rodapé (Coluna da Logo)**:
  - Removido o divisor com ícone de diamante (ooter-logo-divider) que ficava entre a logo e os ícones de redes sociais.
  - O visual agora apresenta um espaçamento limpo e elegante diretamente entre a logo e os ícones sociais.
## 2026-09-02

- **Ajuste Visual no Ícone do WhatsApp do Rodapé**:
  - Removidos o preenchimento amarelo espesso e o efeito de brilho/drop-shadow da classe .footer-whatsapp-icon svg.
  - Aplicado traço limpo em outline dourado (stroke: currentColor, stroke-width: 1.5, ill: none), padronizado com a identidade visual do projeto.
## 2026-09-02

- **Restauração dos Ícones Oficiais das Redes Sociais**:
  - Restaurados os SVGs autênticos de marca para Facebook, Instagram e WhatsApp no Header e Menu Mobile.
  - Restaurados os SVGs autênticos de Instagram, Facebook, TikTok, YouTube e WhatsApp no Rodapé.
  - Removidas as substituições genéricas de bibliotecas de ícones.
## 2026-09-02

- **Ajuste no Card Máquinas de Vinho**:
  - Removida a linha de pergunta 'Qual seria a sua escolha hoje?' da descrição.
  - Botão do card 'Jantar Harmonizado' atualizado para: Fazer reserva
  - Botão do card 'Evento Corporativo' atualizado para: Fazer reserva
  - Tag superior da seção Harmonizações atualizada para: THE WINE - XPERIENCE
  - Tag superior da seção Accordion atualizada para: O que você encontrará
  - Título principal da seção Accordion atualizado para: Eventos & Experiências
## 2026-09-02

- **Ajuste de Botões nos Cards de Experiências**:
  - Botão do card 'Jantar Harmonizado' atualizado para: Fazer reserva
  - Botão do card 'Evento Corporativo' atualizado para: Fazer reserva
  - Tag superior da seção Harmonizações atualizada para: THE WINE - XPERIENCE
  - Tag superior da seção Accordion atualizada para: O que você encontrará
  - Título principal da seção Accordion atualizado para: Eventos & Experiências
## 2026-09-02

- **Ajuste de Copy nas Seções**:
  - Tag superior da seção Harmonizações/Gastronomia atualizada para: THE WINE - XPERIENCE
  - Tag superior da seção Accordion atualizada para: O que você encontrará
  - Título principal da seção Accordion atualizado para: Eventos & Experiências
## 2026-09-02

- **Ajuste de Copy no Accordion de Experiências**:
  - Tag superior atualizada para: O que você encontrará
  - Título principal atualizado para: Eventos & Experiências (removido 'Nossos')
## 2026-08-28

- **Aprimoramento da Planta Operacional de Mesas (/admin)**:
  - Finalização do layout interativo de salão e visualização de capacidade de mesas.
  - Commit no GitHub: [`8298dc5`](https://github.com/idedigitalbr/site-the-wine/commit/8298dc547fd30046df53a0338ac69e5db905085a) - Deploy VPS com sucesso.

- **Configurações de E-mail do Sistema & Notificações**:
  - Implementado painel de configuração SMTP no admin com tratamento e logs de teste em ambiente de desenvolvimento.
  - Commits no GitHub: [`b25b832`](https://github.com/idedigitalbr/site-the-wine/commit/b25b832), [`913f92e`](https://github.com/idedigitalbr/site-the-wine/commit/913f92e), [`e2ad1c7`](https://github.com/idedigitalbr/site-the-wine/commit/e2ad1c7).

## 2026-08-27

- **Sistema Completo de Reservas Online (/reservas)**:
  - **Wizard Público**: Criação do fluxo em 4 etapas para seleção de data, horário, quantidade de pessoas e confirmação.
  - **Motor de Disponibilidade**: Validação transacional de disponibilidade por turno e bloqueio automático de overbooking.
  - **Admin Operacional**: Módulo de gerenciamento de reservas, bloqueios de mesas e exceções de agenda.
  - **Banco de Dados**: Migrations automáticas do MySQL integradas ao pipeline de deploy contínuo.
  - Commits no GitHub: [`9b98309`](https://github.com/idedigitalbr/site-the-wine/commit/9b98309), [`98d37b7`](https://github.com/idedigitalbr/site-the-wine/commit/98d37b7), [`ce4bcb2`](https://github.com/idedigitalbr/site-the-wine/commit/ce4bcb2), [`63e815e`](https://github.com/idedigitalbr/site-the-wine/commit/63e815e), [`36e64a1`](https://github.com/idedigitalbr/site-the-wine/commit/36e64a1), [`96c0f97`](https://github.com/idedigitalbr/site-the-wine/commit/96c0f97), [`eb97c0d`](https://github.com/idedigitalbr/site-the-wine/commit/eb97c0d), [`dda26e7`](https://github.com/idedigitalbr/site-the-wine/commit/dda26e7).

## 2026-08-26

- **Migração para Next.js 15+ (App Router) & Paridade 1:1**:
  - Migração de toda a arquitetura estática para Next.js App Router com Server Components e Client Wrappers.
  - Validação estrita de paridade visual e funcional via Playwright.
  - Configuração do runtime standalone no Docker com suporte a MySQL.
  - Commits no GitHub: [`17668e7`](https://github.com/idedigitalbr/site-the-wine/commit/17668e7), [`417a64b`](https://github.com/idedigitalbr/site-the-wine/commit/417a64b).

## 2026-08-24

- **Ajustes de Copy e Seções**:
  - Removido o bloco 'NOSSA HISTÓRIA' e palavra 'SOBRE' da Seção 2, deixando o título como 'THE WINE EXPERIENCE'.
  - Tag superior da seção Harmonizações atualizada para 'O que você encontrará no The Wine'.
  - Removido 'Reserve sua experiência' do topo da Seção 7 e atualizado o botão de reserva para 'RESERVE SUA EXPERIÊNCIA'.

- **Direcionamento Geral para WhatsApp**:
  - Todos os botões de CTA e reservas (Header, Mobile Menu, Seção 4, Accordion de Eventos e Seção Final) direcionados com links diretos para o WhatsApp de atendimento oficial.

- **Correção Visual do Ícone do YouTube**:
  - Corrigido o triângulo interno de play com preenchimento em dourado no rodapé.










