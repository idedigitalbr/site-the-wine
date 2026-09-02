# Stack Tecnológica

atualizado: 2026-09-02

## Frontend

- **Framework**: Next.js 15+ (App Router) & React 19
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v3 / CSS Modules / Vanilla tokens globais
- **Ícones**: Lucide React
- **Componentes & UI**: Radix UI / Shadcn UI
- **Efeitos & Visualizadores**: PageFlip (Flipbook interativo do cardápio), Parallax e Lightbox

## Backend & Domínio

- **Runtime**: Node.js (Next.js Route Handlers & Server Actions)
- **Arquitetura**: Camadas desacopladas (Domain, Application, Infrastructure)
- **Motor de Reservas**: Algoritmo de disponibilidade por turno/lotação com travas transacionais e bloqueio de mesas

## Banco de Dados

- **SGBD**: MySQL 8.0
- **Driver**: `mysql2/promise`
- **Controle de Esquema**: Scripts de migrations SQL versionados (`next-app/scripts/migrate.mjs`) e seeders de dados operacionais

## Infraestrutura & DevOps

- **Containerização**: Docker & Docker Compose (modo standalone otimizado)
- **Proxy Reverso**: Traefik com SSL/TLS automático (Let's Encrypt)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy-vps.yml`) com deploy automático por push na `main`
- **Servidor de Produção**: VPS Contabo (`161.97.108.92`), path `/opt/thewine-site/app`
- **DNS & CDN**: Cloudflare

## Serviços Externos & Integrações

- **E-mail / Notificações**: SMTP / Mock Mailer para confirmações de reserva e alertas
- **WhatsApp API**: Links contextuais e disparo de atendimento direto
- **Google Maps Embed**: Localização e rotas do restaurante em Belém
