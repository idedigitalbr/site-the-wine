# Deploy & Infraestrutura

atualizado: 2026-09-02

## Ambientes

- **Local**: Desenvolvimento (`next-app`)
- **GitHub**: Repositório `idedigitalbr/site-the-wine` (Branch `main`)
- **Produção (VPS)**:
  - **URL Pública**: `https://thewine.suporteide.digital`
  - **IP do Servidor**: `161.97.108.92` (Contabo VPS)
  - **Diretório na VPS**: `/opt/thewine-site/app`
  - **Containers Docker**:
    - `thewine-web`: Next.js 15+ Standalone Runtime (porta interna mapeada para Traefik)
    - `thewine-mysql`: MySQL 8.0 com volume persistente para banco de dados
  - **Proxy Reverso**: Traefik com terminação SSL/TLS automática (Let's Encrypt)
  - **DNS & CDN**: Cloudflare

## Pipeline de CI/CD (GitHub Actions)

O workflow `.github/workflows/deploy-vps.yml` executa as seguintes etapas a cada push na branch `main`:

1. Checkout do repositório no runner do GitHub.
2. Execução de testes automatizados e validações de qualidade.
3. Conexão SSH segura na VPS (`161.97.108.92`) usando segredos (`DEPLOY_HOST`, `DEPLOY_KEY`, `DEPLOY_USER`, `DEPLOY_PORT`).
4. Atualização dos arquivos locais via Git (`git fetch && git reset --hard origin/main`).
5. Execução do script de migrations do MySQL (`node scripts/migrate.mjs`).
6. Build e reinício dos containers Docker (`docker compose up -d --build`).

## Chaves e Credenciais

- **Chave SSH de Deploy**: Configurada nos secrets do GitHub Actions e autorizada na VPS (`/root/.ssh/id_ed25519_thewine`).
- **Variáveis de Ambiente**: Arquivo `.env` protegido na VPS contendo strings de conexão do MySQL, credenciais de admin e configurações SMTP.
