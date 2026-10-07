# AutoMind AI visual system

User direction: minimal, solid components; retain the useful workspace layout; remove neon outlines and ornamental UI.

Informed by the UI UX Pro Max local search for `developer tool minimal dark`: **Minimalism & Swiss Style**, a dark working surface, clear typography, predictable grid, restrained hover feedback and accessible focus. Its marketing/FAQ structure is not applicable to this interactive lab. Color and type are adapted to the user's preference for neutral, simple components.

## Rules

- Neutral charcoal background and solid gray surfaces; no gradients, blur or glow.
- One white primary action: Generate Automaton. Other controls use solid gray or quiet buttons.
- System sans-serif for interface text; Cascadia Code/Consolas for states, inputs and transitions. No network-loaded fonts.
- Semantic CSS variables in `src/styles.css` are the token source of truth.
- Muted blue appears only for simulation progress and keyboard focus. Green/red result surfaces always include explicit text and an icon.
- State outlines and double circles carry automata semantics. Keep them neutral and readable.
- 8/16/24/32 pixel spacing rhythm, 6 pixel controls and 8 pixel panels; no ornamental section counters or uppercase promotional labels.
- Minimum 44 pixel main controls, 48 pixel inputs, larger example chips on touch layouts.
- Visible form labels, skip link, guide disclosure state, decorative icons hidden from screen readers, visible focus and reduced-motion support.
- Retain graph plus explanation desktop layout, with a single column on phones and automatic graph fitting.

## Main tokens

| Token | Value | Use |
| --- | --- | --- |
| `--page` | `#161616` | Application background |
| `--surface` | `#222222` | Panels |
| `--surface-raised` | `#303030` | Secondary controls |
| `--text` | `#eeeeec` | Main text and primary button |
| `--secondary-text` | `#bbbbba` | Supporting text |
| `--muted` | `#a3a3a1` | Metadata |
| `--accent` | `#b9cbe4` | Current state and focus |
