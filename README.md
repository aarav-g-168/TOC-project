# AutoMind AI

**Explainable Natural Language-Based Automata Generation and Learning Platform**

A compact, frontend-only academic MVP by **Aarav Gupta (24BIT0245)** and **Abhishek Yennam (24BIT0603)**. React, Vite, Tailwind CSS, React Flow and Lucide React. No backend, accounts, database or cloud AI.

The refined UI uses neutral charcoal surfaces, solid controls, system typography and restrained simulation colors. The graph/explanation layout stays intact. The design rules are saved in `design-system/automind-ai/MASTER.md`, informed by the project's UI UX Pro Max skill and adapted to this learning tool.

## Start

Install Node.js 20.19+ or 22.12+ (Node 24 also works). In this folder:

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). To stop, press Ctrl+C. No API keys or environment variables are required.

```powershell
npm test
npm run build
npm run preview
```

`npm test` uses Node's built-in test runner. `build` produces a static `dist/` folder; `preview` serves that production build locally. Once installed, computation runs locally in the browser and does not send prompts to a service.

## Source map

| File | Responsibility |
| --- | --- |
| `src/core/parser.js` | Full-condition regular-expression grammar; formal constraint extraction and validation |
| `src/core/automata.js` | DFA generation, simulation and partition-refinement minimization |
| `src/Graph.jsx` | React Flow state nodes, labelled transitions, active path and layout |
| `src/App.jsx` | One-page input, understanding, explanations, table and simulation controls |
| `src/styles.css` | Tailwind import, responsive dark theme and graph styling |
| `tests/core.test.js` | Independent acceptance oracles, rejection cases, traces and minimization checks |
| `vite.config.js` | React and Tailwind Vite plugins |

The core modules are plain JavaScript with no React imports. The graph, table and simulator all consume the same automaton model: `states`, `alphabet`, `start`, `accepting`, `transitions`, `type` and `constraint`.

## Supported grammar

One supported condition per description. Common `Strings`, `Binary strings`, `with`, and `that` prefixes are stripped. Quotes, capitalization and a trailing full stop are normalized. The remaining condition must match in full, preventing accidental partial interpretation of combined conditions.

| Pattern | Examples |
| --- | --- |
| Contains | `Binary strings containing 101`, `contains substring 110` |
| Starts | `Strings starting with 10`, `begins with 1` |
| Ends | `Strings ending with 01`, `ends with 101` |
| Symbol parity | `even number of 1s`, `odd number of 0s` |
| Exact count | `Strings containing exactly two 1s`, `exactly three 0s`, `exactly 0 1s` |
| Forbidden substring | `no consecutive 1s`, `does not contain 00`, `without 101` |
| Length parity | `even length`, `odd length` |

Binary alphabet `{0,1}` is the default. Patterns involving `a` or `b` infer `{a,b}`. An explicit two-symbol alphabet is supported, for example `Strings over {a,b} ending with ab` or `Strings over {x,y} even length`. Symbol/pattern grammar is deliberately limited to `0`, `1`, `a`, `b`; arbitrary English and combined conditions are rejected. Conflicting symbols also produce an error. The guide and example chips fill the input; click Generate Automaton to apply it. If generation fails, the prior valid automaton stays visible with an error notice.

## Algorithms

**Contains / ends / forbidden:** State `qk` represents the length of the longest suffix matching a prefix of the target. For each new symbol, search for the longest suffix that remains a target prefix. This implements a KMP-style prefix automaton without hard-coded example graphs. Contains makes a full match an accepting absorbing state. Forbidden makes that state a rejecting sink. Ends continues updating after a full match, accepting only when the final suffix is the target.

**Starts:** Track how many initial symbols match. A mismatch enters a rejecting sink. A complete prefix match enters an accepting absorbing state.

**Symbol parity / length parity:** Two states track even and odd. Symbol parity toggles only on the target symbol; length parity toggles on every symbol.

**Exact count:** States track counts from zero to the requested count, plus an overflow rejecting sink. Non-target symbols preserve the count.

**Simulation:** Validate all symbols, begin in the start state, and follow the transition function once per character. Record every source, symbol and destination. Acceptance is membership of the final state in the accepting set. The empty input is ε and uses the start state's acceptance. Play advances every 650 ms; Pause, Next and Reset change the displayed position in the same recorded trace. The graph highlights the current state and the most recently traversed transition. The tape identifies the next symbol to read. Clicking Simulate begins playback; the result appears when the input finishes.

**Minimization:** Remove unreachable states, partition reachable states by acceptance, then repeatedly split each group by its vector of destination-group indices over the alphabet. When no further split is possible, build the quotient DFA with one state per group. The UI computes actual original, minimized and reduced counts and shows group membership. Many generated machines are already minimal: a reduction of zero is correct, including the containing-101 faculty example. The tests include a six-state fixture where equivalent reachable states merge to three and an unreachable state disappears. No artificial states are added to make the demo numbers more dramatic.

## Faculty demonstration (about 4 minutes)

1. Enter **Binary strings containing 101**, then click **Generate Automaton**.
2. Read Understanding: `{0,1}`, Contains substring 101, DFA, four states.
3. Click **q2**. Explain that the longest suffix matching the target prefix is `10`. On `1`, move to q3; on `0`, return to q0.
4. Check the transition table against the graph. Accepting q3 has a double border and remains q3 on both symbols.
5. Enter **110101**, click **Simulate**. Pause or step with Next. The path is q0 → q1 → q1 → q2 → q3 → q3 → q3. The result is ACCEPTED.
6. Enter **0000**, click **Simulate**. The result is REJECTED in q0.
7. Click **Minimize DFA**. The result is 4 → 4, reduced 0: the original DFA is already minimal. Click Show original to return.
8. Try **Even 1s** with `1100` (accepted) and `1` (rejected); **Ends with 01** with `1101` and `011`; **Exactly two 1s** with `1010` and `111`; **No consecutive 1s** with `10101` and `110`.
9. Try `I like football` or `Strings with 1` to show honest unsupported/ambiguous-input handling. Use Pattern guide for a/b and length examples.

## Verification and limits

The automated tests compare recognition to independent string predicates on every string up to length eight for 19 descriptions, repeat recognition after minimization, verify transition destinations, verify the exact faculty trace, and check invalid input, ε, parser errors, actual merging and unreachable-state removal. Overlap-sensitive targets are tested too.

The project intentionally generates **DFAs only**. There is no NFA conversion, full regex engine, arbitrary NLP, conjunction/disjunction of constraints, data persistence or export UI. Patterns and exact counts are capped at 12 to keep graphs useful; test strings are capped at 200. Graph layout uses a simple five-column grid with draggable nodes, zoom, pan, fit view and reset. Large graphs may require zooming or manual adjustment. Animations are educational playback, not a server task.

Implementation references: [React Flow custom edges](https://reactflow.dev/learn/customization/custom-edges) and [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite).
