# Deploy

atualizado: 2026-08-25

## Ambiente

- **Produção**: `https://thewine.suporteide.digital`
- **Diretório na VPS**: `/opt/thewine-site/app`
- **Container Docker**: `thewine-web` (Nginx Alpine)
- **Proxy reverso**: Traefik com TLS/SSL
- **Branch de produção**: `main`

## Processo de CI/CD

O workflow `.github/workflows/deploy-vps.yml` possui duas etapas separadas:

1. **Validate site**
   - Checkout do repositório.
   - Node.js 22.
   - Execução de `node --test tests/*.test.mjs`.
   - Build de validação da imagem Docker.

2. **Deploy production**
   - Executado somente quando o ref é `refs/heads/main` e o evento não é Pull Request.
   - Depende obrigatoriamente da etapa de validação.
   - Conecta à VPS via SSH usando GitHub Secrets.
   - Sincroniza `/opt/thewine-site/app` com `origin/main`.
   - Recria o serviço com `docker compose up -d --build --remove-orphans`.

Pushes em outras branches executam a validação, mas não fazem deploy na VPS.

## Arquivos publicados no container

O Dockerfile usa uma allowlist explícita. Somente estes recursos são copiados para a raiz pública do Nginx:

- `index.html`
- `style.css`
- `eventos-accordion-standalone.html`
- `assets/`

Diretórios como `.MD/`, `.agents/`, `docs/`, `tests/`, `.github/` e `node_modules/` não fazem parte da imagem publicada.

## Segredos usados pelo GitHub Actions

- `VPS_SSH_KEY`
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_PORT`

Não registrar chaves privadas, senhas, tokens ou caminhos pessoais de credenciais na documentação do repositório.

## Cuidados

- Usar branch + Pull Request para alterações antes do merge em `main`.
- Exigir a validação automatizada antes do merge assim que a proteção da branch `main` estiver habilitada.
- Manter `.gitignore` e `.dockerignore` atualizados quando novos artefatos locais forem introduzidos.
