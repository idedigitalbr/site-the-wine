# Status de execução da migração Next.js

Atualizado em: 2026-08-25

Branch: `chore/hardening-deploy-ci-20260825`

## Resumo

A migração está sendo executada em modo **parity-first**. O site estático da raiz continua sendo a referência e não foi substituído.

Nenhum deploy desta branch faz parte deste trabalho e o workflow de produção não deve ser alterado durante a migração.

## Fase 0 — baseline e contrato

**Status: concluída para estrutura/código.**

- HTML legado congelado no app Next.
- CSS legado congelado no app Next.
- árvore de assets reutilizada pelo mesmo objeto Git.
- contratos de comportamento documentados.
- mapa de componentes documentado.
- regras para agentes documentadas.

## Fase 1 — scaffold Next.js

**Status: implementada.**

Criado `next-app/` com:

- Next.js App Router;
- TypeScript;
- Server Components por padrão;
- metadata/canonical/Open Graph/Twitter Card;
- JSON-LD do restaurante;
- configurações de site, navegação, redes sociais, conteúdo e cardápio;
- scripts/testes de contrato.

O site estático da raiz permanece intacto como baseline.

## Fase 2 — composição visual em JSX

**Status: implementação concluída; validação visual pendente.**

As fronteiras visuais principais não usam mais `LegacyFragment`:

- `Header`
- `MobileNavigation`
- `HeroSection`
- `AboutSection`
- `ExperiencePillarsSection`
- `PairingsSection`
- `MenuSection`
- `EventsSection`
- `ReservationSection`
- `GallerySection`
- `Footer`
- `BookingModal`
- `MenuModal`
- `ReservationToast`

O `page.tsx` continua sendo Server Component e apenas compõe essas unidades.

Foram retirados do runtime:

- `LegacyFragment`;
- `LegacyHome`;
- `LegacyModals`;
- `LegacyMenuScripts`;
- `legacyMarkup.ts`.

O arquivo `next-app/legacy/index.html` permanece propositalmente como **baseline de comparação**, não como fonte de renderização.

## Fase 3 — comportamentos globais

**Status: implementação TypeScript concluída; validação em browser pendente.**

Os comportamentos são inicializados pelo `SiteBehaviorController` e possuem cleanup explícito:

- loop/animação do Hero;
- estado/autohide do Header;
- drawer mobile;
- Booking Modal;
- reveal on scroll;
- smooth scroll;
- scroll spy;
- parallax;
- accordion mobile de Eventos;
- galeria infinita + lightbox;
- ano automático do Footer.

Contratos preservados:

- Header scrolled após 60 px;
- autohide após 120 px;
- scroll spy com offset 160 px;
- reveal threshold `0.05` e rootMargin `0px 0px -40px 0px`;
- parallax desativado em `<= 768px` e interpolação `0.08`;
- eventos mobile em `<= 860px`;
- galeria com velocidade `0.5`, hover `0.25` e retomada após 3000 ms;
- `prefers-reduced-motion`.

## Fase 4 — Eventos & Experiências

**Status: markup migrado para JSX; comportamento preservado por módulo TypeScript.**

Continuam preservados:

- primeiro painel ativo;
- três experiências existentes;
- CTAs e mensagens de WhatsApp;
- comportamento especial em mobile;
- centralização do painel selecionado.

## Fase 5 — Galeria e Lightbox

**Status: markup migrado para JSX; comportamento preservado por módulo TypeScript.**

- 12 itens originais agora vêm de `config/content.ts`;
- IDs e classes do legado continuam iguais;
- clonagem para loop infinito, drag/touch, setas, pause/resume e lightbox continuam no behavior isolado.

## Fase 6 — Cardápio / Flipbook

**Status: lógica de integração portada para TypeScript; biblioteca PageFlip mantida.**

O markup do modal está em `MenuModal.tsx`.

A aplicação Next não precisa mais carregar `/assets/js/menu-flipbook.js` em runtime. A lógica foi portada para:

`src/behaviors/menuFlipbook.ts`

O `MenuFlipbookController` carrega somente:

`/assets/js/page-flip.browser.js`

A biblioteca PageFlip continua sendo usada para preservar o mesmo motor visual de páginas.

O behavior TypeScript preserva:

- páginas desktop/mobile;
- configurações de PageFlip;
- navegação anterior/próxima;
- input de página;
- Home/End/ArrowLeft/ArrowRight/Escape;
- focus trap;
- scroll lock/restauração;
- foco anterior;
- pausa/restauração dos vídeos da página;
- fullscreen;
- pinch zoom;
- DPI/resolução do canvas;
- centralização da capa;
- opções responsivas desktop/mobile;
- cleanup para React Strict Mode.

O arquivo legado `menu-flipbook.js` continua presente dentro da árvore congelada de assets para comparação histórica/paridade, mas não é mais o controlador usado pelo app Next.

## Fase 7 — configuração

**Status: parcialmente concluída.**

Já existem configurações para:

- site/SEO;
- navegação;
- sociais/WhatsApp;
- galeria;
- páginas do cardápio;
- eventos.

Não houve alteração de copy durante a extração.

## Fase 8 — testes de regressão

**Status: contratos ampliados; validação final ainda necessária em ambiente completo.**

Foram adicionados testes para:

- composição dos componentes Next;
- remoção dos adaptadores runtime legados;
- JSX nativo das seções;
- preservação de IDs/classes/assets críticos;
- overlays/modais;
- contrato do flipbook TypeScript;
- contratos dos behaviors globais;
- identidade dos arquivos congelados.

## Fase 9 — validação visual 1:1

**Status: pendente.**

Ainda é obrigatória comparação em browser real nos tamanhos:

- 1440 × 900
- 1366 × 768
- 1024 × 768
- 820 × 1180
- 768 × 1024
- 430 × 932
- 390 × 844
- 360 × 800

Além da página parada, devem ser comparados:

- Header antes/depois de scroll;
- drawer mobile;
- reveals;
- parallax;
- accordion de eventos;
- cardápio aberto;
- capa e páginas internas do flipbook;
- fullscreen e pinch;
- galeria/drag/touch;
- lightbox;
- Footer.

## Fase 10 — refatoração pós-paridade

**Status: não iniciada.**

Não dividir/reinterpretar o CSS legado antes da validação visual.

## Validações ainda obrigatórias

### Ambiente Node completo

A instalação npm não pôde ser concluída no ambiente de execução anterior por limitação de rede. Portanto, ainda não considerar `next build` validado.

Em ambiente com acesso normal ao npm, executar em `next-app/`:

```bash
npm install
npm run typecheck
npm test
npm run verify:legacy
npm run build
```

### Browser real

Depois do build/dev local, executar a comparação visual e funcional definida em `03-behavior-contract.md`.

## Restrições

- não fazer deploy desta branch;
- não alterar o workflow de produção;
- não fazer merge em `main` antes da validação visual;
- não remover o legado estático da raiz;
- não trocar assets, copy, fontes ou animações durante a migração 1:1;
- não iniciar redesign/refatoração visual antes da paridade.
