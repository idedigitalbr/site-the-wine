# Status de execução da migração Next.js

Atualizado em: 2026-08-25

Branch: `chore/hardening-deploy-ci-20260825`

## Resumo

A migração está sendo executada em modo **parity-first**. O site estático da raiz continua sendo a referência e não foi substituído.

Nenhum deploy desta branch faz parte deste trabalho e o workflow de produção não deve ser alterado durante a migração.

## Fases executadas

### Fase 0 — baseline e contrato

**Status: concluída para estrutura/código.**

- HTML legado congelado no app Next.
- CSS legado congelado no app Next.
- árvore de assets reutilizada pelo mesmo objeto Git.
- contratos de comportamento documentados.
- mapa de componentes documentado.
- regras para agentes documentadas.

### Fase 1 — scaffold Next.js

**Status: concluída.**

Criado `next-app/` com:

- Next.js App Router;
- TypeScript;
- Server Components por padrão;
- metadata/canonical/Open Graph/Twitter Card;
- JSON-LD do restaurante;
- configuração central do site;
- configuração de links sociais e WhatsApp;
- configuração de conteúdo e páginas do cardápio;
- `.gitignore` próprio;
- scripts de verificação local.

O `main` não foi substituído e a aplicação estática da raiz permanece intacta como baseline.

### Fase 2 — composição visual por componentes

**Status: concluída em modo de paridade.**

`page.tsx` não contém o HTML completo e não é Client Component.

A página foi dividida nas seguintes fronteiras:

- `Header`
- `HeroSection`
- `AboutSection`
- `ExperiencePillarsSection`
- `PairingsSection`
- `MenuSection`
- `EventsSection`
- `ReservationSection`
- `GallerySection`
- `Footer`
- `LegacyModals`

Nesta etapa os componentes extraem fragmentos do HTML congelado usando marcadores do legado. Isso é intencional: cria fronteiras arquiteturais sem reescrever o markup e sem introduzir diferenças visuais prematuramente.

A conversão interna desses fragmentos para JSX puro deve ocorrer somente seção por seção, acompanhada de comparação visual.

### Fase 3 — comportamentos globais

**Status: primeira implementação concluída; validação visual ainda pendente.**

Foram separados em módulos com cleanup explícito:

- loop/animação do hero;
- estado/autohide do header;
- drawer mobile;
- modal legado de reserva;
- reveal on scroll;
- smooth scroll;
- scroll spy;
- parallax;
- accordion mobile de eventos;
- galeria infinita + lightbox;
- ano automático do footer.

Os valores relevantes do legado foram preservados, incluindo:

- header scrolled após 60 px;
- autohide após 120 px;
- scroll spy com offset de 160 px;
- reveal threshold `0.05` e rootMargin `0px 0px -40px 0px`;
- parallax desativado em `<= 768px` e interpolação `0.08`;
- eventos mobile em `<= 860px`;
- galeria com velocidade base `0.5`, hover `0.25` e retomada em 3000 ms;
- respeito a `prefers-reduced-motion`.

## Cardápio / Flipbook

**Status: preservado pelo módulo legado nesta etapa.**

A primeira versão Next carrega os mesmos arquivos:

- `/assets/js/page-flip.browser.js`
- `/assets/js/menu-flipbook.js`
- `/assets/css/menu-flipbook.css`

Essa decisão reduz o risco de regressão do componente mais complexo do site. A conversão completa do flipbook para um Client Component React próprio deve ser feita em uma etapa isolada, com teste visual e funcional específico.

## Validações realizadas

### Testes locais de contrato

Os testes de fonte/comportamento executados localmente validaram:

- scaffold e módulos obrigatórios;
- `page.tsx` como Server Component;
- decomposição da página em componentes nomeados;
- parser do HTML legado;
- composição dos controladores client-side;
- breakpoint/interpolação do parallax;
- offset do scroll spy;
- contrato do IntersectionObserver;
- comportamento mobile dos eventos;
- velocidades/reduced-motion da galeria.

Resultado mais recente da suíte estrutural/comportamental: **10/10 testes aprovados**.

### Identidade dos arquivos congelados no Git

A baseline Next reutiliza os próprios objetos Git do legado para:

- `next-app/legacy/index.html`;
- `next-app/public/style.css`;
- `next-app/public/assets/`.

Dessa forma, HTML, CSS e assets de referência não são cópias reinterpretadas: apontam para o mesmo conteúdo versionado do legado no commit da migração.

### TypeScript

Foi realizada checagem estática local com o compilador TypeScript disponível no ambiente e stubs locais apenas para módulos externos não instalados. Os arquivos fonte da migração passaram sem erros nessa checagem.

## Validações que ainda faltam

### `npm install` / `next build`

Não foi possível concluir a instalação das dependências no ambiente de execução atual por limitação de rede/timeout. Portanto, **não considerar `next build` validado ainda**.

Quando o projeto for aberto em um ambiente local com acesso ao npm, executar dentro de `next-app/`:

```bash
npm install
npm run typecheck
npm test
npm run verify:legacy
npm run build
```

### Paridade visual

Ainda é obrigatória comparação visual nos tamanhos definidos em `03-behavior-contract.md` antes de declarar a migração 1:1 concluída.

Validar pelo menos:

- 1440 × 900
- 1366 × 768
- 1024 × 768
- 820 × 1180
- 768 × 1024
- 430 × 932
- 390 × 844
- 360 × 800

## Próxima etapa recomendada

1. rodar o app Next localmente;
2. comparar o resultado com o site estático seção por seção;
3. corrigir apenas diferenças de paridade;
4. converter cada `LegacyFragment` para JSX puro começando por Header, Hero e Sobre;
5. deixar Gallery e Flipbook para o final;
6. não fazer redesign durante essa etapa.

## Restrições

- não fazer deploy desta branch;
- não alterar o workflow de produção;
- não fazer merge em `main` antes da validação visual;
- não remover o legado estático enquanto o Next não atingir paridade;
- não trocar assets, copy, fontes ou animações durante a migração 1:1.
