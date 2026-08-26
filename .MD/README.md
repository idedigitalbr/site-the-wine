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

## Estado atual

- Site publicado em `https://thewine.suporteide.digital`.
- Branch de produção: `main`.
- Testes automatizados disponíveis em `tests/*.test.mjs` usando o test runner nativo do Node.js.
- Nesta branch de hardening, testes e build devem ser executados localmente, sem GitHub Actions e sem deploy.
- A imagem Nginx publica apenas `index.html`, `style.css`, `eventos-accordion-standalone.html` e `assets/`.
- Materiais internos, documentação, testes e dependências locais não são enviados para a raiz pública do Nginx.
- `node_modules/` não deve permanecer versionado no repositório.

## Verificação local

Para executar a suíte de testes:

```bash
node --test tests/*.test.mjs
```

Para validar a imagem localmente:

```bash
docker build -t thewine-site:local .
```

## Próximos cuidados

- Não executar deploy desta branch de hardening.
- Manter alterações isoladas em branch antes de qualquer merge em `main`.
- Continuar evitando arquivos gerados, dependências e dados sensíveis no repositório.
