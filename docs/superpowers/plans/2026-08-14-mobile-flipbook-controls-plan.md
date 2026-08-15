# Ajustes de controles e leitura mobile do flipbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flipbook's text controls with accessible icons, remove manual zoom buttons, and improve mobile page fit and rendering density without changing the local-PDF architecture.

**Architecture:** Keep `index.html` as the modal markup source, `menu-flipbook.js` as the interaction controller, and `menu-flipbook.css` as the responsive override layer. Mobile pages remain local WebP assets selected by viewport; the canvas pixel ratio and responsive page area will be tuned independently from desktop.

**Tech Stack:** Static HTML, CSS, browser JavaScript, local StPageFlip engine, Node.js built-in test runner, Pillow for deterministic asset conversion.

## Global Constraints

- Keep the local PDF download at `assets/CardapioMenu/CARDAPIO_THE_WINE.pdf`.
- Keep page rendering local through `loadFromImages(getPageImagesForViewport())`; do not reintroduce PDF.js or iframe loading.
- Preserve keyboard navigation, page input, arrow navigation, swipe pagination, and pinch zoom.
- Use inline SVG icons with accessible names and no external icon dependency.
- Do not version `.codegraph/` or include sensitive/local environment files.

---

### Task 1: Add regression tests for the new toolbar and mobile resolution

**Files:**
- Modify: `tests/menu-flipbook.test.mjs`

**Interfaces:**
- Consumes: current modal markup, controller element bindings, and mobile WebP assets.
- Produces: failing assertions that describe the icon-only toolbar and high-density mobile rendering contract.

- [ ] **Step 1: Write the failing tests**

Add one test that asserts `menuFullscreenBtn` and `menuDownloadBtn` each contain an inline SVG, an accessible label, and a tooltip; assert that `menuZoomOut`, `menuZoomIn`, and `menuFitBtn` are absent from `index.html` and that the controller no longer binds those elements. Add a mobile test that checks all WebP pages are at least `1862 x 2632` pixels and that the controller caps mobile canvas density at `2`.

- [ ] **Step 2: Run the focused tests and verify they fail for the intended reasons**

Run:

```powershell
node --test tests/menu-flipbook.test.mjs
```

Expected: the existing tests continue to pass, while the new toolbar and mobile-density assertions fail because the old controls and `1.5` mobile density are still present.

- [ ] **Step 3: Commit the red tests**

```powershell
git add tests/menu-flipbook.test.mjs
git commit -m "test: define compact flipbook toolbar and mobile density"
```

### Task 2: Implement the icon toolbar and remove text zoom controls

**Files:**
- Modify: `index.html:1113-1127`
- Modify: `assets/js/menu-flipbook.js:66-83, 302-305, 414-416`
- Modify: `assets/css/menu-flipbook.css`

**Interfaces:**
- Consumes: `toggleFullscreen`, local PDF download link, and existing keyboard/page controls.
- Produces: `menuFullscreenBtn` and `menuDownloadBtn` as compact icon controls; `setZoom` remains available to pinch logic only.

- [ ] **Step 1: Replace toolbar markup with inline SVG controls**

Keep the page input and place two controls in the end group:

```html
<button id="menuFullscreenBtn" class="flipbook-icon-button" type="button" aria-label="Abrir tela cheia" title="Abrir tela cheia">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" /></svg>
</button>
<a id="menuDownloadBtn" class="flipbook-icon-button" href="assets/CardapioMenu/CARDAPIO_THE_WINE.pdf" download aria-label="Baixar PDF" title="Baixar PDF">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
</a>
```

Remove the three zoom buttons from the markup.

- [ ] **Step 2: Remove obsolete zoom element bindings and listeners**

Delete `zoomOut`, `zoomIn`, and `fit` from `elements`, and delete their three event listeners. Keep `zoom`, `setZoom`, `updateZoomState`, and pinch handlers because pinch zoom still depends on them. Update `updateFullscreenLabel()` to change `aria-label` and `title` between “Abrir tela cheia” and “Sair da tela cheia”; do not use visible text.

- [ ] **Step 3: Add icon-only toolbar styling**

In `assets/css/menu-flipbook.css`, define `.flipbook-icon-button` with a 34px square hit target, centered SVG, transparent wine-colored styling, and a gold hover/focus state. Override the mobile size to 32px and remove any width assumptions from the old three-button zoom group.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run:

```powershell
node --test tests/menu-flipbook.test.mjs
```

Expected: toolbar tests pass; no old zoom element IDs or listeners remain.

- [ ] **Step 5: Commit the toolbar change**

```powershell
git add index.html assets/js/menu-flipbook.js assets/css/menu-flipbook.css tests/menu-flipbook.test.mjs
git commit -m "feat: simplify flipbook toolbar with icon controls"
```

### Task 3: Improve mobile page fit and rendering density

**Files:**
- Modify: `assets/js/menu-flipbook.js:158-161`
- Modify: `assets/css/menu-flipbook.css:166-225`
- Regenerate: `assets/CardapioMenu/pages/mobile/page-01.webp` through `page-12.webp`

**Interfaces:**
- Consumes: source PNG pages at `2482 x 3510` and current mobile viewport selection.
- Produces: mobile WebP pages at `1862 x 2632`, canvas density capped at `2`, and a page area that uses the available mobile width while preserving the portrait ratio.

- [ ] **Step 1: Generate higher-density mobile WebP assets**

Use Pillow to resize every source PNG to 75% (`1862 x 2632`) with Lanczos resampling and save WebP at quality 90. Keep the output names and local paths unchanged so the controller contract does not change.

- [ ] **Step 2: Update the mobile canvas density**

Change the mobile cap in `updateCanvasResolution()` from `Math.min(window.devicePixelRatio || 1, 1.5)` to `Math.min(window.devicePixelRatio || 1, 2)`. This is the only mobile rendering-density change; desktop remains capped at 3.

- [ ] **Step 3: Use the mobile reader width more efficiently**

Set the mobile page container width to `calc(100% - 4.2rem)`, height to `calc(100% - 0.3rem)`, and keep `object-fit`/portrait sizing governed by StPageFlip. Keep the arrows overlaid and translucent so they do not reserve large blank side columns or cover menu text unnecessarily.

- [ ] **Step 4: Run the mobile asset and full tests**

Run:

```powershell
python -c "from PIL import Image; from pathlib import Path; root=Path('assets/CardapioMenu/pages/mobile'); assert all(Image.open(p).size == (1862, 2632) for p in root.glob('*.webp'))"
node --test tests/menu-flipbook.test.mjs
```

Expected: all mobile assets have the target dimensions and the complete test suite passes.

- [ ] **Step 5: Commit the mobile optimization**

```powershell
git add assets/js/menu-flipbook.js assets/css/menu-flipbook.css assets/CardapioMenu/pages/mobile tests/menu-flipbook.test.mjs
git commit -m "perf: improve mobile flipbook page clarity and fit"
```

### Task 4: Browser smoke test and final verification

**Files:**
- Verify: `index.html`, `assets/css/menu-flipbook.css`, `assets/js/menu-flipbook.js`, `assets/CardapioMenu/pages/mobile/`

**Interfaces:**
- Consumes: the integrated toolbar and mobile rendering changes.
- Produces: fresh test evidence and a clean working tree ready for handoff.

- [ ] **Step 1: Run the complete automated verification**

```powershell
node --test tests/menu-flipbook.test.mjs
git diff --check HEAD~3..HEAD
```

- [ ] **Step 2: Smoke-test the local page**

Serve the repository over HTTP, open the modal, confirm the icon buttons work, confirm there are no console errors, and check that a mobile-sized reader uses the complete page width without cutting the page. Stop the temporary server after validation.

- [ ] **Step 3: Review the final diff and status**

```powershell
git status --short --branch
git log --oneline -4
```

Expected: only the intended commits are present and no untracked generated files exist.
