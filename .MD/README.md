# site-the-wine (THE WINE Experience)

atualizado: 2026-08-25

## Resumo

Site institucional e landing page da THE WINE Experience, publicado em produção e mantido como aplicação estática.

## Stack principal

- HTML5
- CSS3
- Vanilla JavaScript
- Docker + Nginx Alpine
- Traefik na VPS
- GitHub Actions para validação e deploy

## Estado atual

- Site publicado em `https://thewine.suporteide.digital`.
- Branch de produção: `main`.
- Testes automatizados em `tests/*.test.mjs` usando o test runner nativo do Node.js.
- Pipeline valida os testes e o build da imagem Docker antes de permitir deploy.
- Deploy de produção é permitido somente a partir da branch `main`.
- A imagem Nginx publica apenas `index.html`, `style.css`, `eventos-accordion-standalone.html` e `assets/`.
- Materiais internos, documentação, testes e dependências locais não são enviados para a raiz pública do Nginx.

## Desenvolvimento

Para executar a suíte de testes:

```bash
node --test tests/*.test.mjs
```

Para validar a imagem localmente:

```bash
docker build -t thewine-site:local .
```

## Próximos cuidados

- Manter alterações de produção passando por branch e Pull Request antes do merge em `main`.
- Ativar proteção da branch `main` nas configurações do GitHub, exigindo o workflow de validação antes do merge.
- Continuar evitando arquivos gerados, dependências e dados sensíveis no repositório.
