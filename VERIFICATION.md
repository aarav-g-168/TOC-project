# Verification log

## Initial MVP — 7 October 2026

- **26 automated tests pass** using `npm test`.
- Every string up to length eight checked against independent predicates for 19 descriptions; both original and minimized machines agree.
- All 30 nonempty binary patterns up to length four tested for contains, starts, ends and forbidden construction against all strings up to length seven (30,600 recognition checks), including overlapping patterns.
- Exact faculty trace for `110101` verified: q0, q1, q1, q2, q3, q3, q3.
- Actual equivalent-state merging, unreachable-state removal, all-accepting and all-rejecting minimization cases verified.
- `npm run build` succeeds.
- Fresh Vite development start returns HTTP 200. Production preview also returns HTTP 200 and runs the app successfully.
- All six clickable examples verified in the browser with accepted and rejected inputs (12 checks), using simulation playback controls.
- Faculty `110101` playback reaches ACCEPTED in q3; `0000` reaches REJECTED in q0.
- q2 selection displays its actual `10` prefix meaning and outgoing transitions.
- Minimization displays actual counts 4 → 4, reduced 0, for the already-minimal containing-101 DFA; Show original restores the generated machine.
- Pause, Next, Reset and Play verified in the production build.
- Unsupported input displays a parser error and retains the previous valid machine.
- Desktop (1440 px) and phone (390 px) layouts inspected. No horizontal page overflow. Graph refits on viewport changes; zoom, fit view and reset layout are available.
- No browser console errors observed. Development warnings from attribution hiding and hot replacement of type objects were resolved by retaining attribution and using stable module-level type definitions; no production errors or warnings were observed.

The project includes a readable README with startup instructions, architecture, algorithms, limitations and the exact faculty demo flow. A production screenshot is delivered beside the project.

## Minimal UI refinement

- Applied UI UX Pro Max minimal developer-tool guidance, adapted to the user's neutral, solid-component direction.
- Replaced cyan outlines/glow with charcoal surfaces, solid controls, neutral state outlines and muted simulation fills. Removed ornamental counters and uppercase section labels.
- Added visible input labels, skip-to-workspace navigation, guide disclosure semantics, hidden decorative icons and larger touch targets.
- All 26 core tests still pass; production build succeeds.
- Updated production UI verified at 375, 768, 1024 and 1440 pixels, with no horizontal page overflow. Desktop and phone layouts visually inspected.
- Simulation Pause/Next, the accepting faculty trace, state selection, guide disclosure, minimization and Show original checked in the browser.
- Updated preview has no observed console warnings or errors. Replaced the delivered screenshot and rebuilt the project ZIP.

## NFA support — 8 October 2026

- Added a visible DFA/NFA selector that generates the selected model for the current description.
- Genuine branching construction for contains and ends; prefix and exact-count NFAs use missing transitions to drop failed branches. Parity, length and forbidden constraints use valid single-destination NFAs, with an honest explanation.
- Transition table displays destination sets and ∅. Graph and simulation track every active state and traversed edge; acceptance requires at least one accepting final branch.
- Added epsilon closure with cycle handling and reachable subset conversion, including the empty-set DFA sink.
- Direct NFA minimization is guarded. Conversion enables standard DFA minimization; contains-101 converts to 6 DFA states and minimizes to 4.
- **51 automated tests pass**. For 19 descriptions, the NFA, converted DFA and minimized DFA match independent predicates on all inputs up to length eight. Overlapping binary patterns up to length four are also checked across all strings up to length seven. Epsilon cycles, dead branches, empty input, type guards, invalid symbols and the 256-state conversion bound are tested.
- Production build succeeds. All six NFA examples pass accepted/rejected browser checks, including ∅ rejection for a failed prefix and excess counts.
- Browser conversion and minimization preserve acceptance. No observed console errors or warnings.
- NFA layout checked at 375, 768 and 1440 pixels without horizontal page overflow. The selector, destination sets and simultaneous state/edge highlights were visually verified.

## Custom substring phrasing — 8 October 2026

- Fixed the reported `contains 101010 as a substring` error by recognizing an optional substring/pattern suffix in contains and forbidden rules.
- Full-condition matching remains strict: unsupported trailing conditions are rejected.
- **52 tests pass**, including the exact reported wording, quoted and alternate word order, a/b patterns, accepted and rejected inputs, and DFA/NFA/conversion equivalence.
- Production build succeeds. The exact prompt generates seven-state DFA and NFA models in the browser, with no parser error.
