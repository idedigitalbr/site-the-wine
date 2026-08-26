# Deploy

atualizado: 2026-08-25

## Ambiente

- **Produção**: `https://thewine.suporteide.digital`
- **Diretório na VPS**: `/opt/thewine-site/app`
- **Container Docker**: `thewine-web` (Nginx Alpine)
- **Proxy reverso**: Traefik com TLS/SSL
- **Branch de produção**: `main`

## Processo de Deploy

O workflow `.github/workflows/deploy-vps.yml` permanece restrito à branch `main`.

Nesta branch de hardening não devem ser executados deploys nem validações via GitHub Actions. As verificações devem ser feitas localmente antes de qualquer merge futuro.

## Arquivos publicados no container

O Dockerfile usa uma allowlist explícita. Somente estes recursos são copiados para a raiz pública do Nginx:

- `index.html`
- `style.css`
- `eventos-accordion-standalone.html`
- `assets/`

Diretórios como `.MD/`, `.agents/`, `docs/`, `tests/`, `.github/` e `node_modules/` não fazem parte da imagem publicada.

## Verificação local

Executar localmente, sem GitHub Actions:

```bash
node --test tests/*.test.mjs
```

```bash
docker build -t thewine-site:local .
```

## Cuidados

- Não executar deploy a partir desta branch de hardening.
- Manter `main` como única branch de produção.
- Não registrar chaves privadas, senhas, tokens ou caminhos pessoais de credenciais na documentação.
- Manter `.gitignore` e `.dockerignore` atualizados quando novos artefatos locais forem introduzidos.
