# The Wine — Next.js parity migration

Aplicação Next.js criada ao lado do site estático para migrar o The Wine Experience sem alterar o visual ou os recursos.

## Regra de ouro

O arquivo `legacy/index.html`, o CSS e os assets congelados são a baseline. A migração é considerada correta somente quando a versão Next reproduzir o visual e o comportamento do site estático.

O runtime Next atual já usa JSX/React nativo para as seções e modais. O HTML legado permanece apenas como referência de comparação.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Verificações de código

```bash
npm run typecheck
npm test
npm run verify:legacy
npm run build
```

## Validação em browser

Instale o Chromium usado pelo Playwright:

```bash
npm run browser:install
```

Depois execute:

```bash
npm run test:functional
npm run test:visual
```

Ou toda a suíte de browser:

```bash
npm run test:browser
```

O Playwright inicia automaticamente:

- legado estático em `http://127.0.0.1:4173`;
- Next.js em `http://127.0.0.1:4174`.

O teste visual compara legado × Next nas 8 viewports oficiais e também em estados críticos como drawer mobile, Eventos, Lightbox e modal do Cardápio.

Detalhes: [`../docs/next-migration/07-browser-validation.md`](../docs/next-migration/07-browser-validation.md).

## Arquitetura atual

- `src/app/page.tsx`: composição Server Component;
- `src/components/`: JSX das seções, layout e modais;
- `src/behaviors/`: comportamentos browser com cleanup explícito;
- `src/config/`: navegação, links, SEO, conteúdo e cardápio;
- `src/behaviors/menuFlipbook.ts`: integração TypeScript do flipbook;
- `/assets/js/page-flip.browser.js`: biblioteca PageFlip preservada como motor visual;
- `legacy/index.html`: baseline congelada, não usada para renderização do Next.

## Importante

- Não usar esta pasta para deploy enquanto a paridade visual não estiver aprovada.
- Não alterar `legacy/index.html` para corrigir diferenças da versão Next.
- Não trocar imagens, vídeos, fontes, copy, breakpoints ou animações durante a fase de paridade.
- Não refatorar o CSS legado antes da validação 1:1.
- O CSS legado é servido como `/style.css`.
- Os assets legados são servidos em `/assets/`.
- O workflow de produção não faz parte da migração.

## Status correto neste momento

O harness de validação está implementado no repositório, mas `next build` e os testes reais em Chromium ainda precisam ser executados em um ambiente com as dependências npm instaladas antes de declarar paridade 1:1.
