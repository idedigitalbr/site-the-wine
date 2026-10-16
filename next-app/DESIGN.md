# Design Context

## Brand and intent

The Wine Experience is an upscale restaurant and wine venue in Belém. Public reservation screens should feel calm, elegant, and quick to use. Keep the existing black-and-gold identity and let the reservation task stay clear at every step.

## Visual language

- Use a near-black canvas (`#000000`) with warm, almost-black surfaces (`#0B0A08`, `#11100D`).
- Use muted gold (`#D3B97B`) for primary actions, selected steps, and emphasis. The brighter hover and focus color is `#F1D093`.
- Use white for primary text and softened white for supporting text. Borders are thin gold at low opacity (`rgba(211, 185, 123, 0.35)`).
- Use Cormorant Garamond for display headings and Albert Sans for body copy, labels, controls, and buttons.
- Keep headings editorial and spacious, while form labels and helper text remain compact and direct.
- Use semantic spacing from 4px to 64px and rounded corners from 8px to 16px. Prefer the shared CSS tokens over new one-off values.

## Reservation flow

- Keep the five-step indicator visible and legible: Seus dados, Data, Pessoas, Preferências, Confirmação. The Data step contains both the authored monthly calendar and time selection.
- Place each active step in the existing dark bordered reservation surface, with a clear primary action and a quieter back action.
- Make forms responsive, keyboard accessible, and explicit about validation errors. Do not communicate disabled state by color alone.
- Preserve values when navigating between steps. Keep authentication and reservation progress distinct in the copy.
- Use the existing success, warning, danger, and information colors for status messages; maintain readable contrast on dark surfaces.

### Wizard navigation variant

- The action row is one dark strip with a thin gold outline and 12px outer corners. Each action owns its directional gold gradient; the center stays dark and inert, with at least 12px between clickable areas. Desktop actions use 34% of the row, capped at 256px, and never fill two equal halves. Gold fades progressively through warm intermediate tones rather than ending as a solid yellow block. Mobile gives the longer forward label more room than Back.
- At rest, labels and icons are white; gold is concentrated at the outer edge and fades within 42% of each button (about 14% of the desktop strip), matching the reference proportions. Only an enabled button under a fine mouse pointer expands to bright gold with black content over 280ms ease-out. Forward hover also requires locally valid data for the active step and a current available time/table selection in the time step. Validation on click and native busy disabling stay independent of this decorative eligibility. Keyboard focus uses an inset ring. Touch preserves the resting style; reduced motion removes decorative transitions.
- When the forward action cannot advance, it keeps its click-to-validate behavior but uses a visibly darker, muted gold edge treatment and softened content; it never receives the active hover fill. Busy actions remain governed by native `disabled` state.
- Gold decoration disappears with an absent Back action. Busy actions retain native disabled semantics and their existing labels/spinners, with no active fill. Confirmation hover also expires with the temporary table hold; a single timeout follows that deadline, with cleanup on replacement or unmount and no polling. White resting icons have a small dark shadow for separation from the gold.
- Runtime owner: `.reservation-wizard-actions` and `.reservation-wizard-action*` in `src/app/globals.css`, isolated from shared authentication buttons. Local `--wizard-nav-*` variables reference reservation tokens for surface and outline; resting gold is `#F1C861` and active gold is `#FFD66B` for the supplied reference.

## Implementation sources

The reservation tokens live in `src/styles/reservation-tokens.css`. The legacy home and its visual cascade live in `public/style.css`; avoid broad changes there when updating the reservation wizard.

## Floating account control

- The home-only account button uses a 56px fixed circle at the lower-right viewport edge, with 24px desktop and 16px mobile spacing plus safe-area insets. Its adjacent panel is 224px wide on desktop and constrained to the viewport on mobile.
- Keep the control in the existing black-and-gold identity: `--wine-panel`, `--wine-gold`, `--wine-gold-soft`, `--wine-border`, and Albert Sans body text. Local styles belong to `src/components/account/FloatingAccountMenu.module.css`; do not add global selectors or change shared token values.
- The panel is a non-modal navigation popover. Keep its contents out of focus and the accessibility tree while closed, respect reduced motion, and suppress the root behind existing modal and mobile-navigation overlays. The component owns customer session revalidation and the real customer sign-out request; do not couple it to reservation-flow creation.
