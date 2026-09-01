# Architecture

## Runtime

The Vite/React client is the whole product. `useColorModel` coordinates UI state with pure TypeScript domain modules and IndexedDB. A click is recorded once, yielded through the event loop, trained locally in a small batch, followed by optimum search and a daily snapshot. The numeric work is small enough for this MVP without WASM or a Worker; the controller boundary allows training to move into a Worker if measured interaction latency later requires it.

## Numeric core

- `color/`: standard OKLab/OKLCH ↔ sRGB conversion, gamut mapping by bounded chroma search, OKLab distance, and the six-dimensional network feature map.
- `ml/core/`: a shared-utility `6→24→16→1` tanh MLP backed by `Float64Array`; deterministic Xavier-like initialization; exact pair-loss backpropagation.
- `ml/optimizer/`: custom Adam with bias correction, gradient clipping, and finite-value protection.
- `ml/ensemble/`: five independently seeded models with bootstrap omission differences. Disagreement is variance among pair probabilities, never raw utilities.
- `ml/activeLearning/`: early gamut coverage followed by ambiguity, ensemble disagreement, novelty, bounded distance, and high-utility contender challenges.
- `ml/preference/search`: broad gamut-safe sampling, multiple top regions, local stochastic refinement, ensemble-member maxima, and mean OKLab optimum spread. Boundary colors remain eligible.
- `ml/validation/`: chronological folds, quadratic-OKLab Bradley–Terry baseline, held-out log-loss/accuracy/Brier, and independently calibrated context/drift residual gates.
- `ml/simulation/`: deterministic, independent synthetic oracles used only by tests/calibration.

## Persistence

IndexedDB has `choices`, `snapshots`, and `meta` stores. Choices are immutable event records. A snapshot is replaced only by a later snapshot on the same calendar day. Serialized weights contain architecture/version metadata. JSON import rejects unsupported schema versions before replacing data.

## Presentation

Discover owns equal-geometry pair stimuli, blind control/validation labels, immediate one-tap recording, and state feedback. You renders only computed data: core estimate, chronological metrics, ensemble spread, admitted effects, daily history, and local archive controls. Unavailable evidence is labeled explicitly.
