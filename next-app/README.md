# The Wine — Next.js parity migration

Aplicação Next.js criada ao lado do site estático para migrar o The Wine Experience sem alterar o visual ou os recursos.

## Regra de ouro

O arquivo `legacy/index.html` e os assets copiados por referência do legado são a baseline. A migração é considerada correta somente quando a versão Next reproduzir o comportamento do site estático.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Verificações

```bash
npm run typecheck
npm test
npm run verify:legacy
npm run build
```

## Importante

- Não usar esta pasta para deploy enquanto a paridade visual não estiver aprovada.
- Não alterar `legacy/index.html` para corrigir diferenças da versão Next.
- Não trocar imagens, vídeos, fontes, copy, breakpoints ou animações durante a fase de paridade.
- O CSS legado é servido como `/style.css`.
- Os assets legados são servidos em `/assets/`.

## Estratégia atual

A primeira implementação usa o markup do legado sem scripts inline e substitui a lógica global por módulos de comportamento isolados. O flipbook mantém a biblioteca e o módulo legado nesta primeira etapa, porque ele é o recurso de maior risco visual/funcional.
