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

- Keep the five-step indicator visible and legible: Seus dados, Data, Horário, Preferências, Confirmação.
- Place each active step in the existing dark bordered reservation surface, with a clear primary action and a quieter back action.
- Make forms responsive, keyboard accessible, and explicit about validation errors. Do not communicate disabled state by color alone.
- Preserve values when navigating between steps. Keep authentication and reservation progress distinct in the copy.
- Use the existing success, warning, danger, and information colors for status messages; maintain readable contrast on dark surfaces.

## Implementation sources

The reservation tokens live in `src/styles/reservation-tokens.css`. The legacy home and its visual cascade live in `public/style.css`; avoid broad changes there when updating the reservation wizard.
