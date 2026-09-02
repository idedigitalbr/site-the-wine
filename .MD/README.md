# site-the-wine (THE WINE Experience)

atualizado: 2026-09-02

## Resumo

Site institucional, plataforma enogastronômica e sistema completo de reservas online e gestão operacional da **THE WINE Experience** (Belém - PA).

## Repositório & Ambientes

- **Caminho Local**: `G:\Meu Drive\.PROJETOS\Sites Institucionais\site-the-wine`
- **Branch Atual**: `main`
- **Git Remote**: `https://github.com/idedigitalbr/site-the-wine.git`
- **Produção (VPS)**: `https://thewine.suporteide.digital`
- **Stack Principal**: Next.js 15+ / React 19 / TypeScript / Tailwind CSS / MySQL 8.0 / Docker Compose / Traefik

## Estado Atual

- **Frontend & Institucional**: Migrado para Next.js App Router com paridade visual 1:1, menu interativo (flipbook), galeria e seções autorais.
- **Sistema de Reservas (`/reservas`)**: Wizard público de reservas em etapas com motor de disponibilidade e bloqueio de mesas em tempo real.
- **Painel Administrativo (`/admin`)**: Planta de mesas operacional interativa, controle de capacidade, bloqueios manuais e configurações de sistema/notificações.
- **CI/CD & Deploy**: Pipeline automático via GitHub Actions integrado à VPS com container standalone e banco de dados MySQL conteinerizado.
