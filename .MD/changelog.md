# Changelog

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



