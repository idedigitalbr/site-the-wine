# Cardápio Flipbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o visualizador nativo de PDF do modal do cardápio por um flipbook responsivo com animação 3D, paginação e controles de leitura.

**Architecture:** Manter `#menuModal` como shell de modal e mover a lógica de PDF, paginação e interação para `assets/js/menu-flipbook.js`, carregado como script clássico para permitir o uso direto por `file://`. Renderizar páginas com PDF.js em canvases dentro de uma página/spread ativo; trocar o estado com uma animação 3D e manter o PDF apenas como fonte local.

**Tech Stack:** HTML estático, CSS existente, JavaScript ES modules, PDF.js 3.11.174 via CDN, Node.js built-in test runner.

## Global Constraints

- Usar `assets/CardapioMenu/CARDAPIO_THE_WINE.pdf` como fonte única do cardápio.
- Não usar `<iframe>` como visualizador do PDF.
- Não adicionar framework ou bundler ao site estático.
- Preservar a abertura pelos gatilhos `.trigger-menu-modal` e o bloqueio de rolagem do modal.
- Não versionar `.codegraph/`.

---

### Task 1: Criar testes de paginação antes da implementação

**Files:**
- Create: `tests/menu-flipbook.test.mjs`
- Test: `tests/menu-flipbook.test.mjs`

**Interfaces:**
- Consumes: `normalizePage`, `getSpread`, `nextPage`, `previousPage` de `assets/js/menu-flipbook-state.mjs`.
- Produces: contrato executável para a lógica de navegação.

- [ ] **Step 1: Write the failing test**

Criar testes com `node:test` e `node:assert/strict` cobrindo capa, spread, limites e avanço/retorno:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePage,
  getSpread,
  nextPage,
  previousPage,
} from '../assets/js/menu-flipbook-state.mjs';

test('normalizes a page into the valid PDF range', () => {
  assert.equal(normalizePage(0, 12), 1);
  assert.equal(normalizePage(20, 12), 12);
  assert.equal(normalizePage('4', 12), 4);
});

test('keeps the cover alone and groups the remaining pages in spreads', () => {
  assert.deepEqual(getSpread(1, 12), { current: 1, pages: [1], isCover: true });
  assert.deepEqual(getSpread(2, 12), { current: 2, pages: [2, 3], isCover: false });
  assert.deepEqual(getSpread(10, 12), { current: 10, pages: [10, 11], isCover: false });
  assert.deepEqual(getSpread(12, 12), { current: 12, pages: [12], isCover: false });
});

test('moves through cover and spreads with bounded pagination', () => {
  assert.equal(nextPage(1, 12), 2);
  assert.equal(nextPage(10, 12), 12);
  assert.equal(nextPage(12, 12), 12);
  assert.equal(previousPage(2, 12), 1);
  assert.equal(previousPage(10, 12), 8);
  assert.equal(previousPage(1, 12), 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/menu-flipbook.test.mjs`

Expected: FAIL because `assets/js/menu-flipbook-state.mjs` does not exist yet.

### Task 2: Implement and verify the pagination state module

**Files:**
- Create: `assets/js/menu-flipbook-state.mjs`
- Test: `tests/menu-flipbook.test.mjs`

**Interfaces:**
- Consumes: page input and total page count.
- Produces: `normalizePage(page, total)`, `getSpread(page, total)`, `nextPage(page, total)`, `previousPage(page, total)`.

- [ ] **Step 1: Write the minimal implementation**

Implement numeric normalization and the cover/spread rules:

```js
export function normalizePage(page, total) {
  const max = Math.max(1, Number(total) || 1);
  const value = Number.parseInt(page, 10);
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, value));
}

export function getSpread(page, total) {
  const current = normalizePage(page, total);
  const max = Math.max(1, Number(total) || 1);
  if (current === 1) return { current, pages: [1], isCover: true };
  const first = current % 2 === 0 ? current : current - 1;
  const pages = [first];
  if (first + 1 <= max) pages.push(first + 1);
  return { current, pages, isCover: false };
}

export function nextPage(page, total) {
  const current = normalizePage(page, total);
  const max = Math.max(1, Number(total) || 1);
  return current === 1 ? Math.min(2, max) : Math.min(current + 2, max);
}

export function previousPage(page, total) {
  const current = normalizePage(page, total);
  return current <= 2 ? 1 : current - 2;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/menu-flipbook.test.mjs`

Expected: 3 passing tests and no failures.

### Task 3: Add the flipbook modal contract test

**Files:**
- Modify: `tests/menu-flipbook.test.mjs`
- Test: `tests/menu-flipbook.test.mjs`

**Interfaces:**
- Consumes: `index.html` and `style.css` as static assets.
- Produces: regression coverage for required flipbook controls and removal of the iframe viewer.

- [ ] **Step 1: Write the failing contract test**

Append a test that reads the repository files and asserts the new modal identifiers, PDF source, and absence of `menu-pdf-viewer`/`<iframe>` in the menu viewer block:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('contains the flipbook modal controls without a native iframe viewer', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="menuFlipbookStage"/);
  assert.match(html, /id="menuPrevBtn"/);
  assert.match(html, /id="menuNextBtn"/);
  assert.match(html, /id="menuPageInput"/);
  assert.match(html, /CARDAPIO_THE_WINE\.pdf/);
  assert.doesNotMatch(html, /class="menu-pdf-viewer"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/menu-flipbook.test.mjs`

Expected: FAIL because the current modal has the old loading container and iframe fallback.

### Task 4: Replace the modal markup and styles with the flipbook shell

**Files:**
- Modify: `index.html:1105-1125`
- Modify: `style.css:3692-3883`

**Interfaces:**
- Consumes: existing `#menuModal`, `.trigger-menu-modal`, and CSS variables such as `--wine-gold`.
- Produces: accessible modal shell with `#menuFlipbookStage`, page canvas slots, nav buttons, toolbar, loading and error states.

- [ ] **Step 1: Replace the modal HTML**

Use a dialog-labelled overlay with:

```html
<div class="modal-overlay menu-modal-overlay" id="menuModal" role="dialog" aria-modal="true" aria-labelledby="menuModalTitle" aria-hidden="true">
  <div class="menu-modal-card">
    <div class="flipbook-header">
      <div>
        <span class="flipbook-kicker">THE WINE EXPERIENCE</span>
        <h2 id="menuModalTitle">Cardápio</h2>
      </div>
      <button class="menu-modal-close" id="menuModalCloseBtn" type="button" aria-label="Fechar cardápio">×</button>
    </div>
    <div class="flipbook-reader" id="menuFlipbookStage" tabindex="0" aria-label="Leitor do cardápio">
      <button class="flipbook-nav flipbook-nav-prev" id="menuPrevBtn" type="button" aria-label="Página anterior">‹</button>
      <div class="flipbook-page-area" id="menuFlipbookPages" aria-live="polite"></div>
      <button class="flipbook-nav flipbook-nav-next" id="menuNextBtn" type="button" aria-label="Próxima página">›</button>
      <div class="menu-pdf-loading" id="menuPdfLoading" role="status"><span class="pdf-spinner" aria-hidden="true"></span><span>Carregando cardápio...</span></div>
      <div class="menu-pdf-error" id="menuPdfError" role="alert" hidden><strong>Não foi possível carregar o cardápio.</strong><button id="menuRetryBtn" type="button">Tentar novamente</button></div>
    </div>
    <div class="flipbook-toolbar" aria-label="Controles do cardápio">
      <button id="menuZoomOut" type="button" aria-label="Diminuir zoom">−</button>
      <button id="menuFitBtn" type="button">Ajustar</button>
      <button id="menuZoomIn" type="button" aria-label="Aumentar zoom">+</button>
      <label class="flipbook-page-control">Página <input id="menuPageInput" type="number" min="1" value="1" aria-label="Número da página"> <span>/ <strong id="menuPageTotal">—</strong></span></label>
      <button id="menuFullscreenBtn" type="button">Tela cheia</button>
      <a id="menuDownloadBtn" href="assets/CardapioMenu/CARDAPIO_THE_WINE.pdf" download>Baixar PDF</a>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add the responsive flipbook CSS**

Style the modal as a dark, gold-accented reader; set `.flipbook-page-area` to a centered 3D stage, `.flipbook-page` to a canvas-backed paper surface, and add `@keyframes flipbookTurnNext`/`flipbookTurnPrevious` with a 500 ms `rotateY` transition. Use one page on viewports at or below 820 px and hide overflow behind the modal while active.

- [ ] **Step 3: Run the contract and state tests**

Run: `node --test tests/menu-flipbook.test.mjs`

Expected: the static contract passes after the markup replacement, and the pagination tests remain green.

### Task 5: Implement the PDF.js flipbook controller

**Files:**
- Create: `assets/js/menu-flipbook.js`
- Modify: `index.html` to load the classic controller after the page markup and PDF.js
- Modify: `index.html:1248-1373` to remove the old inline PDF viewer implementation and leave reservation code intact

**Interfaces:**
- Consumes: `window.pdfjsLib`, `#menuModal` markup, `assets/CardapioMenu/CARDAPIO_THE_WINE.pdf`, and state functions from `menu-flipbook-state.mjs`.
- Produces: `window.openMenuModal()` and `window.closeMenuModal()` plus all flipbook interactions.

- [ ] **Step 1: Implement PDF loading and page rendering**

Load the document once, set the PDF.js worker URL, render requested pages into canvases, cache rendered canvases by page number, and insert only the active cover/spread into `#menuFlipbookPages`. Use `devicePixelRatio` for sharp canvases while keeping CSS dimensions bounded by the reader area.

- [ ] **Step 2: Implement navigation and flip animation**

Use `getSpread`, `nextPage`, and `previousPage`; disable buttons at bounds; add `.is-turning-next` or `.is-turning-previous` for 500 ms; update the page slots after the animation; and update `aria-label`, input value, total and visible-page text.

- [ ] **Step 3: Implement controls and accessibility**

Wire click, Enter, Escape, Home, End, ArrowLeft, ArrowRight, wheel-free touch swipe, zoom range, fit reset, fullscreen with `requestFullscreen`, overlay close, and focus restoration to the element that opened the modal. Prevent event propagation from toolbar controls and keep body/document scroll locked while active.

- [ ] **Step 4: Implement error and retry states**

If PDF.js is unavailable or loading fails, replace the spinner with a retry button and a clear download link; do not create an iframe. Keep the modal closable in the error state.

### Task 6: Verify the complete feature locally

**Files:**
- Test: `tests/menu-flipbook.test.mjs`
- Verify: `index.html`, `style.css`, `assets/js/menu-flipbook.js`

- [ ] **Step 1: Run the full automated test**

Run: `node --test tests/menu-flipbook.test.mjs`

Expected: all state and static contract tests pass.

- [ ] **Step 2: Serve the static site over HTTP**

Run: `python -m http.server 4173`

Open `http://127.0.0.1:4173/index.html` and verify the PDF loads without the Chrome PDF toolbar.

- [ ] **Step 3: Exercise desktop interactions**

Verify opening from the CTA, cover rendering, next/previous arrows, page input, zoom, fullscreen, Escape and overlay close. Confirm only the active spread is visible after each animation.

- [ ] **Step 4: Exercise mobile interactions**

Use a narrow viewport and verify single-page mode, readable controls, horizontal swipe and no horizontal page overflow.

- [ ] **Step 5: Review Git diff and status**

Run: `git diff --check; git status --short`

Expected: no whitespace errors, only the intended files changed, and `.codegraph/` remains ignored.
