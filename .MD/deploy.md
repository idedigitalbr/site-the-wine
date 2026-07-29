# Deploy

atualizado: 2026-07-14

## Ambiente

- **Local**: Desenvolvimento
- **GitHub**: Repositório `idedigitalbr/site-the-wine`
- **Produção (VPS)**:
  - **URL**: `https://thewine.suporteide.digital`
  - **IP Servidor**: `161.97.108.92`
  - **Diretório na VPS**: `/opt/thewine-site/app`
  - **Container Docker**: `thewine-web` (Nginx Alpine)
  - **Proxy Reverso**: Traefik com SSL automático da Let's Encrypt

## Processo de Deploy Contínuo (CI/CD)

- Qualquer commit e push para a branch `main` no GitHub ativa o workflow `.github/workflows/deploy-vps.yml`.
- O GitHub Actions conecta-se à VPS via SSH usando segredos criptografados, atualiza os arquivos locais (`git fetch && git reset --hard`) e reinicia o container Docker Compose.

## Cuidados

- A chave SSH privada gerada para o deploy deste projeto está salva localmente em `C:\Users\ide-probook-i5\.ssh\id_ed25519_thewine` e na VPS em `/root/.ssh/id_ed25519_thewine`.
- Certificar-se de que arquivos de backup, dados sensíveis ou arquivos `.env` não sejam enviados ao repositório (verificar `.gitignore`).

