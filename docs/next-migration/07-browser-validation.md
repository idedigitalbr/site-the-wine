# Fase 9 — Validação visual e funcional em browser

Este documento define como validar a migração Next.js do The Wine contra o site estático congelado.

A validação é **local**. Ela não faz deploy, não altera o workflow de produção e não depende do domínio publicado.

## Objetivo

Comparar dois runtimes executados ao mesmo tempo:

- legado estático: `http://127.0.0.1:4173`;
- Next.js: `http://127.0.0.1:4174`.

O Playwright inicia os dois servidores automaticamente usando `next-app/playwright.config.ts`.

## Pré-requisitos

Dentro de `next-app/`:

```bash
npm install
npm run browser:install
```

O Chromium do Playwright é usado para reduzir variações de engine entre máquinas.

## Validação estrutural antes do browser

Executar primeiro:

```bash
npm run typecheck
npm test
npm run verify:legacy
npm run build
```

Não avançar para aprovação visual caso algum desses comandos falhe.

## Teste funcional

```bash
npm run test:functional
```

O contrato funcional é executado tanto contra o legado quanto contra o Next.

Ele cobre, no mínimo:

- atributos e fontes dos vídeos do Hero e Cardápio;
- Header após scroll;
- drawer mobile;
- accordion mobile de Eventos;
- Galeria e Lightbox;
- modal do Cardápio;
- total de 12 páginas do flipbook;
- fechamento com Escape;
- parallax desktop.

A intenção desse teste não é validar apenas se o Next funciona. Ele exige que **legado e Next continuem obedecendo ao mesmo contrato**.

## Teste visual

```bash
npm run test:visual
```

O teste `tests/browser/visual-parity.spec.ts` captura diretamente os dois runtimes e compara os PNGs com `pixelmatch`.

### Viewports obrigatórias

- 1440 × 900
- 1366 × 768
- 1024 × 768
- 820 × 1180
- 768 × 1024
- 430 × 932
- 390 × 844
- 360 × 800

Esses tamanhos são os mesmos definidos no contrato de comportamento da migração.

### Estados visuais adicionais automatizados

Além da página completa, são comparados:

- drawer mobile aberto;
- segundo painel de Eventos ativo em mobile;
- Lightbox aberto;
- modal do Cardápio aberto.

## Estabilização visual

Antes de capturar o screenshot, o harness estabiliza fatores que não representam diferença de layout:

- animations e transitions são desativadas;
- caret é ocultado;
- smooth scroll é desativado;
- vídeos são pausados e visualmente ocultados;
- imagens lazy são solicitadas como eager e aguardadas;
- fontes são aguardadas;
- deslocamento automático da Galeria é neutralizado;
- elementos `reveal-*` são forçados ao estado visível.

Os vídeos são ocultados **somente no teste de pixel diff**, porque dois frames diferentes do mesmo MP4 produziriam milhares de pixels divergentes sem indicar regressão de layout.

O contrato funcional continua verificando os atributos e arquivos dos vídeos separadamente.

## Tolerância do pixel diff

O harness usa:

- `pixelmatch` com `threshold: 0.12`;
- anti-aliasing ignorado na contagem (`includeAA: false`);
- diferença máxima global: **1% dos pixels**.

O limite de 1% é uma guarda automática, não autorização para aceitar diferenças visuais perceptíveis.

Mesmo abaixo do limite, a inspeção humana continua necessária para áreas críticas como tipografia, cortes de imagem, alinhamento, modal, flipbook e responsividade.

## Artefatos em caso de falha

Quando a diferença ultrapassa a tolerância, o teste anexa:

- screenshot do legado;
- screenshot do Next;
- imagem de diff.

Os diretórios de resultado do Playwright são ignorados pelo Git:

- `test-results/`;
- `playwright-report/`;
- `blob-report/`.

## Ordem recomendada para corrigir diferenças

1. confirmar se a diferença existe no mesmo viewport nos dois runtimes;
2. identificar a primeira seção onde a geometria diverge;
3. verificar DOM, classe, ID e atributo antes de alterar CSS;
4. preservar o CSS legado sempre que possível;
5. corrigir o JSX/estrutura que divergiu do HTML de referência;
6. executar novamente apenas o teste afetado;
7. executar a suíte visual completa após a correção;
8. executar também a suíte funcional.

## O que não fazer durante a Fase 9

- não redesenhar;
- não melhorar copy;
- não trocar assets;
- não reorganizar o CSS por preferência arquitetural;
- não alterar breakpoints para "ficar melhor";
- não simplificar animações antes de provar paridade;
- não usar o site publicado como alvo de teste da branch;
- não fazer deploy da branch;
- não alterar `.github/workflows/deploy-vps.yml`.

## Critério para declarar paridade 1:1

A Fase 9 só pode ser considerada concluída quando houver evidência fresca de:

```bash
npm run typecheck
npm test
npm run verify:legacy
npm run build
npm run test:functional
npm run test:visual
```

com saída bem-sucedida e inspeção manual das diferenças relevantes nos 8 viewports.

Enquanto esses comandos não forem efetivamente executados em ambiente com Node/npm/Chromium disponíveis, o status correto é **harness implementado, validação pendente**.
