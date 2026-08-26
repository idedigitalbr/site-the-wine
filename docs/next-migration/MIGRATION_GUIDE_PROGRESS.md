# The Wine — Guia Mestre de Migração para Next.js + Status e Timeline

Atualizado em: **2026-08-26**

Branch de trabalho: `chore/hardening-deploy-ci-20260825`

Projeto: `idedigitalbr/site-the-wine`

---

## 1. Objetivo deste documento

Este é o documento mestre para orientar a migração do site estático do **The Wine Experience** para **Next.js**, preservando o projeto atual com paridade visual e funcional **1:1** antes de qualquer modernização visual ou refatoração profunda.

Ele deve ser utilizado por desenvolvedores, Codex, agentes de IA e revisores como ponto de entrada para entender:

- o objetivo da migração;
- as regras que não podem ser quebradas;
- a arquitetura atual e a arquitetura alvo;
- o que já foi executado;
- o que ainda está pendente;
- como validar a migração;
- como corrigir regressões;
- o critério para considerar a migração concluída;
- a timeline completa do processo.

> **Regra principal:** a versão estática atual é a referência de verdade até a aprovação final da versão Next.js.

---

# 2. Resumo executivo

O projeto original é um site estático composto principalmente por:

- HTML5;
- CSS3;
- Vanilla JavaScript;
- assets locais;
- vídeos MP4;
- PageFlip para o cardápio;
- Docker + Nginx no ambiente atual.

A migração está sendo realizada pelo método **parity-first**.

Isso significa:

1. preservar o legado;
2. reproduzir o mesmo DOM visual em React/Next;
3. portar os comportamentos JavaScript;
4. preservar assets, classes, IDs, copy e breakpoints;
5. validar legado × Next;
6. somente depois modernizar CSS, imagens, arquitetura interna e otimizações.

A estrutura Next foi criada em:

```text
next-app/
```

O site estático original permanece na raiz do repositório e **não deve ser removido durante a fase de migração**.

---

# 3. Regras obrigatórias da migração

## 3.1. Preservação 1:1

Durante a migração não alterar intencionalmente:

- identidade visual;
- cores;
- fontes;
- tamanhos;
- espaçamentos;
- proporções;
- imagens;
- vídeos;
- textos;
- links;
- URLs de WhatsApp;
- animações;
- velocidade de animações;
- parallax;
- breakpoints;
- ordem das seções;
- comportamento mobile;
- estrutura do cardápio;
- experiência da galeria;
- SEO e structured data.

Qualquer melhoria visual deve ser executada **somente depois da aprovação da paridade**.

## 3.2. Legado como baseline

Os seguintes recursos devem permanecer disponíveis como referência:

```text
/index.html
/style.css
/assets/
```

Dentro do Next também existe uma baseline congelada:

```text
next-app/legacy/index.html
```

Ela existe para comparação e documentação, não para renderização do runtime Next.

## 3.3. Sem deploy durante a migração

Esta branch não deve ser utilizada para deploy.

Não executar:

- deploy em VPS;
- publicação em produção;
- alteração do domínio atual;
- merge em `main` antes da validação;
- GitHub Actions para validar esta migração.

O workflow de produção deve permanecer restrito ao `main` e não faz parte do escopo da migração.

## 3.4. Não refatorar CSS antes da hora

Enquanto a Fase 9 não estiver aprovada:

- não dividir o CSS apenas por preferência arquitetural;
- não trocar `px` por `rem` indiscriminadamente;
- não alterar breakpoints;
- não substituir estilos por Tailwind;
- não remover classes antigas apenas porque parecem redundantes;
- não substituir imagens por `next/image` em massa;
- não trocar fontes por `next/font` antes da comparação visual.

---

# 4. Arquitetura atual da migração

Estrutura principal:

```text
next-app/
├── legacy/
│   └── index.html
│
├── public/
│   ├── assets/
│   └── style.css
│
├── scripts/
│   ├── serve-legacy.mjs
│   └── verify-legacy-parity.mjs
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── behaviors/
│   │   ├── bookingModal.ts
│   │   ├── eventsAccordion.ts
│   │   ├── footerYear.ts
│   │   ├── galleryLightbox.ts
│   │   ├── header.ts
│   │   ├── heroLoop.ts
│   │   ├── menuFlipbook.ts
│   │   ├── mobileNavigation.ts
│   │   ├── parallax.ts
│   │   ├── reveal.ts
│   │   ├── scrollSpy.ts
│   │   └── smoothScroll.ts
│   │
│   ├── components/
│   │   ├── behaviors/
│   │   ├── layout/
│   │   ├── menu/
│   │   ├── reservation/
│   │   └── sections/
│   │
│   ├── config/
│   │   ├── content.ts
│   │   ├── navigation.ts
│   │   ├── site.ts
│   │   └── social.ts
│   │
│   └── types/
│
├── tests/
│   ├── browser/
│   └── *.test.mjs
│
├── package.json
├── playwright.config.ts
├── next.config.ts
└── tsconfig.json
```

---

# 5. Estratégia de componentes

O `page.tsx` deve permanecer simples e funcionar como composição da página.

Estrutura atual esperada:

```tsx
<Header />
<HeroSection />
<AboutSection />
<ExperiencePillarsSection />
<PairingsSection />
<MenuSection />
<EventsSection />
<ReservationSection />
<GallerySection />
<Footer />
<BookingModal />
<MenuModal />
<ReservationToast />
<SiteBehaviorController />
<MenuFlipbookController />
```

## Regras

- Server Components por padrão;
- Client Components apenas onde há interação com browser;
- não transformar `page.tsx` inteiro em Client Component;
- comportamentos com `window`, `document`, eventos ou animation frames devem ter cleanup explícito;
- componentes devem manter classes e IDs necessários para o CSS legado durante a paridade.

---

# 6. Design System durante a migração

O projeto legado já possui tokens importantes em CSS.

Exemplos:

```css
--wine-black
--wine-ink
--wine-panel
--wine-panel-2
--wine-gold
--wine-gold-dark
--wine-gold-soft
--wine-white
--wine-cream
--wine-muted
--wine-border
--wine-glow
--font-display
--font-body
--font-script
--container
--transition-premium
```

Esses tokens devem ser preservados durante a migração.

A consolidação futura em um design system mais completo deve ocorrer somente após a Fase 9.

---

# 7. Assets

A árvore atual foi preservada em:

```text
next-app/public/assets/
```

Não renomear nem reorganizar assets durante a migração 1:1.

Preservar especialmente:

- logos;
- imagens das seções;
- vídeos do Hero;
- vídeo do Cardápio;
- páginas desktop do Cardápio;
- páginas mobile do Cardápio;
- PDF do Cardápio;
- mapa;
- imagens da Galeria;
- biblioteca PageFlip.

Depois da aprovação de paridade será possível auditar arquivos duplicados e não utilizados.

---

# 8. Behaviors portados para TypeScript

Os principais scripts Vanilla JavaScript foram separados em módulos TypeScript.

## Header

Preservar:

- estado inicial;
- classe `scrolled` após aproximadamente 60 px;
- autohide após aproximadamente 120 px;
- restauração ao subir a página.

## Mobile Navigation

Preservar:

- hamburger;
- drawer;
- overlay;
- botão de fechar;
- fechamento após selecionar item;
- bloqueio/restauração adequada da interface.

## Scroll Spy

Preservar offset aproximado de:

```text
160px
```

## Reveal

Contrato atual:

```text
threshold: 0.05
rootMargin: 0px 0px -40px 0px
```

## Parallax

Contrato atual:

```text
desativado <= 768px
interpolação aproximada: 0.08
```

## Eventos

Breakpoint mobile principal:

```text
<= 860px
```

Preservar:

- painel ativo;
- expansão;
- centralização;
- CTAs específicos.

## Galeria

Preservar:

- 12 imagens originais;
- loop infinito;
- velocidade base `0.5`;
- velocidade em hover `0.25`;
- retomada automática em aproximadamente `3000ms`;
- drag mouse;
- touch;
- setas;
- lightbox;
- teclado;
- `prefers-reduced-motion`.

---

# 9. Cardápio / Flipbook

Este é o componente de maior risco da migração.

O markup está em React/JSX e a integração foi portada para:

```text
src/behaviors/menuFlipbook.ts
```

A biblioteca visual PageFlip permanece em:

```text
/assets/js/page-flip.browser.js
```

Preservar obrigatoriamente:

- 12 páginas;
- assets desktop;
- assets mobile;
- previous/next;
- input de página;
- Home;
- End;
- ArrowLeft;
- ArrowRight;
- Escape;
- focus trap;
- restauração do foco;
- scroll lock;
- restauração da posição da página;
- pausa dos vídeos da página;
- retomada dos vídeos;
- fullscreen;
- pinch zoom;
- resolução adequada do canvas;
- comportamento responsivo;
- centralização da capa;
- cleanup em React Strict Mode.

Não substituir PageFlip antes da paridade 1:1.

---

# 10. Configuração centralizada

Valores repetidos e estáveis já foram extraídos para:

```text
src/config/site.ts
src/config/navigation.ts
src/config/social.ts
src/config/content.ts
```

Centralizados:

- SEO;
- canonical;
- dados do restaurante;
- navegação;
- URLs sociais;
- WhatsApp;
- mensagens específicas de WhatsApp;
- Galeria;
- páginas do Cardápio;
- PDF do Cardápio;
- parte dos dados de Eventos.

Não alterar copy durante a centralização.

---

# 11. SEO

A versão Next deve continuar preservando:

- `lang="pt-BR"`;
- title;
- description;
- canonical;
- theme-color;
- Open Graph;
- Twitter Card;
- JSON-LD `Restaurant`;
- endereço;
- telefone;
- coordenadas;
- cuisine;
- priceRange;
- horários;
- redes sociais.

No App Router isso está distribuído entre metadata, viewport e JSON-LD.

---

# 12. Processo de validação local

Todas as validações desta branch devem ser locais.

Dentro de:

```bash
cd next-app
```

Executar:

```bash
npm install
npm run browser:install
```

Depois:

```bash
npm run typecheck
npm test
npm run verify:legacy
npm run build
```

Somente se os comandos estruturais estiverem aprovados, executar browser:

```bash
npm run test:functional
npm run test:visual
```

Também é possível executar tudo do Playwright com:

```bash
npm run test:browser
```

---

# 13. Ambiente de comparação legado × Next

O Playwright sobe automaticamente dois runtimes:

```text
LEGADO
http://127.0.0.1:4173

NEXT
http://127.0.0.1:4174
```

O servidor legado usa diretamente os arquivos da raiz do repositório.

O objetivo é comparar a versão migrada contra a fonte original e não contra o site publicado.

---

# 14. Validação funcional automatizada

Arquivo:

```text
tests/browser/functional-parity.spec.ts
```

O contrato é executado nos dois runtimes.

Cobertura atual inclui:

- Hero video;
- Cardápio video;
- autoplay;
- muted;
- loop;
- playsInline;
- arquivos MP4 corretos;
- Header após scroll;
- drawer mobile;
- Eventos mobile;
- Galeria;
- Lightbox;
- modal do Cardápio;
- total de páginas;
- Escape;
- parallax desktop.

---

# 15. Validação visual automatizada

Arquivo:

```text
tests/browser/visual-parity.spec.ts
```

Ferramentas:

- Playwright;
- Chromium;
- pixelmatch;
- pngjs.

## Viewports obrigatórias

```text
1440 × 900
1366 × 768
1024 × 768
820 × 1180
768 × 1024
430 × 932
390 × 844
360 × 800
```

## Estados adicionais

Além da página completa, comparar:

- drawer mobile aberto;
- segundo painel de Eventos ativo;
- Lightbox aberto;
- modal do Cardápio aberto.

## Tolerância técnica

Configuração atual:

```text
pixelmatch threshold: 0.12
includeAA: false
máximo global: 1% dos pixels
```

> O limite automático não substitui inspeção humana.

---

# 16. Estabilização dos screenshots

Para evitar falso positivo no pixel diff, o harness:

- desliga animations;
- desliga transitions;
- desliga smooth scroll;
- esconde caret;
- pausa vídeos;
- oculta visualmente vídeos durante o screenshot;
- aguarda fontes;
- aguarda imagens;
- solicita imagens lazy como eager;
- neutraliza o movimento automático da Galeria;
- coloca elementos `reveal-*` em estado visível.

Os vídeos continuam sendo testados separadamente no contrato funcional.

---

# 17. Como corrigir uma divergência de paridade

Quando um teste visual falhar, seguir esta ordem:

1. reproduzir exatamente no mesmo viewport;
2. verificar o screenshot do legado;
3. verificar o screenshot do Next;
4. abrir o diff gerado;
5. localizar a primeira seção divergente;
6. comparar DOM legado × JSX;
7. comparar classes;
8. comparar IDs;
9. comparar atributos;
10. comparar ordem dos elementos;
11. comparar assets;
12. somente depois investigar CSS;
13. corrigir o menor ponto possível;
14. executar novamente o teste afetado;
15. executar a suíte completa antes da aprovação.

Não tentar compensar uma diferença de DOM adicionando CSS arbitrário.

---

# 18. Critério de aceite da migração 1:1

A migração só pode ser considerada concluída quando houver evidência fresca de sucesso em:

```bash
npm run typecheck
npm test
npm run verify:legacy
npm run build
npm run test:functional
npm run test:visual
```

Além disso, realizar inspeção humana das 8 viewports.

Verificar manualmente:

- tipografia;
- cortes de imagem;
- tamanhos;
- alinhamentos;
- espaçamento;
- Header;
- scroll;
- hover;
- focus;
- drawer mobile;
- reveals;
- parallax;
- Eventos;
- Galeria;
- drag;
- touch;
- Lightbox;
- Cardápio;
- PageFlip;
- fullscreen;
- pinch zoom;
- Footer.

---

# 19. STATUS ATUAL DA MIGRAÇÃO

Legenda:

- ✅ concluído em código;
- 🟡 implementado, mas aguardando validação real;
- ⬜ ainda não iniciado;
- 🚫 proibido nesta fase.

## Visão geral

| Fase | Descrição | Status |
|---|---|---|
| 0 | Baseline e contrato | ✅ |
| 1 | Scaffold Next.js | ✅ |
| 2 | JSX / estrutura visual | 🟡 |
| 3 | Behaviors globais | 🟡 |
| 4 | Eventos | 🟡 |
| 5 | Galeria / Lightbox | 🟡 |
| 6 | Cardápio / Flipbook | 🟡 |
| 7 | Configurações | ✅ |
| 8 | Testes / contratos | 🟡 |
| 9 | Validação browser 1:1 | 🟡 |
| 10 | Refatoração pós-paridade | ⬜ |
| Deploy | Produção | 🚫 |

O status 🟡 significa que o código/harness existe, mas a fase ainda não pode ser considerada aprovada sem execução real dos testes e inspeção visual.

---

# 20. TIMELINE / CHECKLIST DE PROGRESSO

## Fase 0 — Baseline

- [x] Identificar HTML principal do legado.
- [x] Preservar `index.html` original.
- [x] Preservar `style.css` original.
- [x] Preservar árvore de assets.
- [x] Criar baseline dentro de `next-app/legacy/`.
- [x] Documentar comportamento do legado.
- [x] Documentar breakpoints importantes.
- [x] Criar mapa de componentes.
- [x] Definir política parity-first.
- [ ] Executar capturas humanas finais de referência, caso sejam necessárias para auditoria externa.

### Status da fase

**Concluída para código e documentação.**

---

## Fase 1 — Scaffold Next.js

- [x] Criar `next-app/`.
- [x] Configurar Next.js App Router.
- [x] Configurar TypeScript.
- [x] Manter Server Components como padrão.
- [x] Criar `layout.tsx`.
- [x] Criar `page.tsx`.
- [x] Configurar metadata.
- [x] Configurar viewport.
- [x] Migrar JSON-LD.
- [x] Preservar Google Fonts.
- [x] Preservar CSS legado.
- [x] Preservar assets em `public/assets/`.

### Status da fase

**Concluída em código.**

---

## Fase 2 — JSX / estrutura visual

- [x] Migrar Header.
- [x] Migrar Mobile Navigation.
- [x] Migrar Hero.
- [x] Migrar Sobre.
- [x] Migrar Pilares.
- [x] Migrar Harmonizações.
- [x] Migrar Cardápio visual.
- [x] Migrar Eventos.
- [x] Migrar CTA de reserva.
- [x] Migrar Galeria.
- [x] Migrar Footer.
- [x] Migrar Booking Modal.
- [x] Migrar Menu Modal.
- [x] Migrar Reservation Toast.
- [x] Remover `LegacyFragment` do runtime.
- [x] Remover `LegacyHome` do runtime.
- [x] Remover `LegacyModals` do runtime.
- [x] Remover parser HTML do runtime.
- [ ] Aprovar visualmente a geometria 1:1.

### Status da fase

**Implementação concluída; aprovação visual pendente.**

---

## Fase 3 — Behaviors globais

- [x] Header scroll state.
- [x] Header autohide.
- [x] Mobile Navigation.
- [x] Booking Modal.
- [x] Reveal on Scroll.
- [x] Smooth Scroll.
- [x] Scroll Spy.
- [x] Parallax.
- [x] Footer Year.
- [x] Criar `SiteBehaviorController`.
- [x] Implementar cleanup para React Strict Mode.
- [ ] Validar todos os behaviors em browser real.
- [ ] Validar hover/focus manualmente.
- [ ] Validar comportamento de scroll manualmente.

### Status da fase

**Implementada; validação browser pendente.**

---

## Fase 4 — Eventos & Experiências

- [x] Migrar markup para JSX.
- [x] Preservar primeiro painel ativo.
- [x] Preservar 3 experiências.
- [x] Preservar SVGs.
- [x] Preservar CTAs.
- [x] Preservar mensagens WhatsApp.
- [x] Portar comportamento mobile.
- [x] Preservar breakpoint `<= 860px`.
- [x] Preservar centralização do painel.
- [ ] Validar expansão desktop em browser.
- [ ] Validar mobile real/touch.

### Status da fase

**Implementada; validação pendente.**

---

## Fase 5 — Galeria / Lightbox

- [x] Centralizar 12 imagens em configuração.
- [x] Migrar markup para JSX.
- [x] Preservar IDs/classes.
- [x] Portar loop infinito.
- [x] Portar auto-scroll.
- [x] Portar hover speed.
- [x] Portar drag.
- [x] Portar touch.
- [x] Portar arrows.
- [x] Portar pause/resume.
- [x] Portar reduced motion.
- [x] Portar Lightbox.
- [x] Portar navegação por teclado.
- [ ] Validar drag real.
- [ ] Validar touch real.
- [ ] Validar loop prolongado sem drift.

### Status da fase

**Implementada; validação browser/touch pendente.**

---

## Fase 6 — Cardápio / Flipbook

- [x] Migrar Menu Modal para JSX.
- [x] Criar `MenuFlipbookController`.
- [x] Portar integração para TypeScript.
- [x] Manter PageFlip como motor visual.
- [x] Preservar 12 páginas.
- [x] Preservar desktop/mobile assets.
- [x] Preservar previous/next.
- [x] Preservar input de página.
- [x] Preservar teclado.
- [x] Preservar Escape.
- [x] Preservar focus trap.
- [x] Preservar scroll lock.
- [x] Preservar posição de scroll.
- [x] Preservar pausa/restauração dos vídeos.
- [x] Preservar fullscreen.
- [x] Preservar pinch zoom.
- [x] Preservar resolução de canvas.
- [x] Preservar centralização da capa.
- [x] Implementar cleanup para React Strict Mode.
- [ ] Validar PageFlip em Chromium real.
- [ ] Validar fullscreen real.
- [ ] Validar pinch em dispositivo/touch real.
- [ ] Validar capa desktop.
- [ ] Validar spreads internos.
- [ ] Validar páginas mobile.

### Status da fase

**Implementada em código; esta continua sendo a área de maior risco até a validação browser.**

---

## Fase 7 — Configuração

- [x] Criar `site.ts`.
- [x] Criar `navigation.ts`.
- [x] Criar `social.ts`.
- [x] Criar `content.ts`.
- [x] Centralizar navegação.
- [x] Centralizar sociais.
- [x] Centralizar WhatsApp.
- [x] Preservar mensagens distintas.
- [x] Centralizar Galeria.
- [x] Centralizar páginas do Cardápio.
- [x] Centralizar PDF.
- [x] Centralizar dados estáveis de Eventos.
- [x] Criar teste contra hardcodes críticos.

### Status da fase

**Concluída para os dados estáveis da migração.**

---

## Fase 8 — Testes de regressão

- [x] Criar testes de composição.
- [x] Criar testes de JSX nativo.
- [x] Criar testes de IDs/classes/assets críticos.
- [x] Criar testes dos overlays.
- [x] Criar contrato do flipbook.
- [x] Criar contratos dos behaviors.
- [x] Criar teste de configuração centralizada.
- [x] Criar contrato do harness Playwright.
- [x] Criar teste funcional legado × Next.
- [x] Criar teste visual legado × Next.
- [ ] Executar suíte Node com dependências reais instaladas.
- [ ] Executar TypeScript real.
- [ ] Executar build real.
- [ ] Executar Playwright real.

### Status da fase

**Harness implementado; execução completa pendente.**

---

## Fase 9 — Validação browser 1:1

### Preparação

- [x] Criar servidor local do legado.
- [x] Configurar porta `4173` para legado.
- [x] Configurar porta `4174` para Next.
- [x] Criar Playwright config.
- [x] Criar functional parity test.
- [x] Criar visual parity test.
- [x] Configurar pixel diff.
- [x] Configurar 8 viewports.
- [x] Configurar estados interativos adicionais.
- [x] Ignorar artefatos Playwright no Git.
- [x] Documentar processo de validação.

### Execução obrigatória

- [ ] `npm install`
- [ ] `npm run browser:install`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run verify:legacy`
- [ ] `npm run build`
- [ ] `npm run test:functional`
- [ ] `npm run test:visual`

### Aprovação manual

- [ ] 1440 × 900 aprovado.
- [ ] 1366 × 768 aprovado.
- [ ] 1024 × 768 aprovado.
- [ ] 820 × 1180 aprovado.
- [ ] 768 × 1024 aprovado.
- [ ] 430 × 932 aprovado.
- [ ] 390 × 844 aprovado.
- [ ] 360 × 800 aprovado.
- [ ] Header aprovado.
- [ ] Drawer aprovado.
- [ ] Hero aprovado.
- [ ] Sobre aprovado.
- [ ] Pilares aprovados.
- [ ] Harmonizações aprovadas.
- [ ] Cardápio aprovado.
- [ ] Eventos aprovados.
- [ ] Galeria aprovada.
- [ ] Lightbox aprovado.
- [ ] Footer aprovado.
- [ ] Touch aprovado.
- [ ] Teclado aprovado.
- [ ] Fullscreen aprovado.

### Status da fase

**Harness concluído; execução e aceite ainda pendentes.**

---

## Fase 10 — Refatoração pós-paridade

> Não iniciar antes da aprovação da Fase 9.

- [ ] Dividir CSS por responsabilidade.
- [ ] Consolidar tokens semânticos.
- [ ] Criar escala de spacing.
- [ ] Criar escala de radius.
- [ ] Criar tokens de shadows.
- [ ] Criar tokens de motion.
- [ ] Remover estilos inline quando seguro.
- [ ] Reduzir `!important`.
- [ ] Avaliar `next/font`.
- [ ] Avaliar `next/image` seção a seção.
- [ ] Auditar assets duplicados.
- [ ] Remover arquivos obsoletos confirmados.
- [ ] Eliminar APIs globais de `window` quando possível.
- [ ] Melhorar tipagem dos conteúdos.
- [ ] Avaliar componentes UI reutilizáveis.
- [ ] Revisar acessibilidade.
- [ ] Revisar Lighthouse.
- [ ] Revisar Core Web Vitals.
- [ ] Revisar bundle size.
- [ ] Revisar cache de assets.
- [ ] Preparar estratégia de Docker/produção para Next.

### Status da fase

**Não iniciada.**

---

# 21. Próxima ação recomendada

A próxima ação não é refatorar mais o visual.

Executar a validação real em ambiente com npm e Chromium disponíveis:

```bash
cd next-app
npm install
npm run browser:install
npm run typecheck
npm test
npm run verify:legacy
npm run build
npm run test:functional
npm run test:visual
```

Se houver falha:

1. corrigir a primeira divergência real;
2. executar novamente o teste específico;
3. repetir até estabilizar;
4. executar a suíte completa;
5. fazer revisão manual;
6. somente depois marcar a Fase 9 como concluída.

---

# 22. O que NÃO fazer agora

- [ ] Não fazer deploy desta branch.
- [ ] Não fazer merge em `main`.
- [ ] Não alterar GitHub Actions para executar a migração.
- [ ] Não remover o site estático.
- [ ] Não substituir PageFlip.
- [ ] Não redesenhar seções.
- [ ] Não trocar copy.
- [ ] Não trocar assets.
- [ ] Não alterar breakpoints.
- [ ] Não refatorar todo o CSS.
- [ ] Não interpretar teste estrutural como aprovação visual.

---

# 23. Definição de pronto

A migração para Next.js estará pronta para avançar à substituição do legado somente quando todos os itens abaixo forem verdadeiros:

- [ ] `npm run typecheck` passa.
- [ ] `npm test` passa.
- [ ] `npm run verify:legacy` passa.
- [ ] `npm run build` passa.
- [ ] `npm run test:functional` passa.
- [ ] `npm run test:visual` passa.
- [ ] As 8 viewports foram inspecionadas.
- [ ] Não existe regressão visual relevante.
- [ ] Não existe feature perdida.
- [ ] Cardápio funciona em desktop.
- [ ] Cardápio funciona em mobile.
- [ ] PageFlip funciona.
- [ ] Pinch funciona.
- [ ] Fullscreen funciona.
- [ ] Galeria funciona.
- [ ] Lightbox funciona.
- [ ] Parallax funciona.
- [ ] Drawer funciona.
- [ ] Eventos funcionam.
- [ ] SEO está equivalente.
- [ ] WhatsApp e links externos estão equivalentes.
- [ ] Aprovação humana da paridade foi registrada.

Somente depois disso iniciar a Fase 10 e posteriormente planejar a troca do runtime de produção.

---

# 24. Documentos complementares

Para detalhes específicos consultar:

```text
docs/next-migration/01-static-audit.md
docs/next-migration/02-component-map.md
docs/next-migration/03-behavior-contract.md
docs/next-migration/04-design-system-and-assets.md
docs/next-migration/05-migration-plan.md
docs/next-migration/06-execution-status.md
docs/next-migration/07-browser-validation.md
docs/next-migration/legacy-contract.json
NEXT_MIGRATION.md
```

---

# 25. Resumo final do progresso

## Já executado

- estrutura Next criada;
- App Router configurado;
- TypeScript configurado;
- SEO migrado;
- Home migrada para JSX;
- comportamentos principais portados para TypeScript;
- Galeria portada;
- Lightbox portado;
- Eventos portados;
- Cardápio/Flipbook integrado ao Next;
- PageFlip preservado;
- dados repetidos centralizados;
- testes estruturais criados;
- testes funcionais browser criados;
- pixel diff visual criado;
- documentação de validação criada;
- legado preservado como baseline.

## Gargalo atual

O principal gargalo não é mais desenvolvimento estrutural.

O gargalo é **validação real de paridade**:

```text
Node/npm
    ↓
TypeScript
    ↓
Unit/contract tests
    ↓
Next build
    ↓
Chromium / Playwright
    ↓
Functional parity
    ↓
Visual pixel diff
    ↓
Inspeção humana
    ↓
Aprovação 1:1
```

Até esse fluxo ser executado com evidência real, o projeto deve continuar sendo considerado **migração implementada, porém ainda não homologada para substituir o legado**.
