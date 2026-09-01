# Personal Color Model Design

## Product

Build a local-first two-tab application that learns a single person's display-color preference through pairwise choices. Discover is the quiet comparison instrument; You is the evidence dashboard. The visual system is editorial and instrument-like: true black canvas, obsidian panels, hairline borders, off-white type, and color swatches as the only saturated elements.

## Architecture

Pure TypeScript modules own color conversion, a custom multilayer perceptron, Adam, Bradley–Terry learning, ensemble inference, active pair selection, robust optimum search, chronological evaluation, and simulation. React consumes those modules through an application controller. IndexedDB stores versioned immutable choice records, serialized ensemble weights, settings, and daily snapshots. No model, choice, or inference leaves the device.

The core model maps `[L,C,sin(H),cos(H),sin(2H),cos(2H)]` through `6→24→16→1` with tanh activations. Five deterministically seeded models train from random initialization with stable bootstrap weights. Optional context and drift are independently regularized linear modulation heads and are admitted only when rolling-origin comparisons improve future log-loss. Reaction time is recorded but is not used as a feature or weight in this MVP because it has not earned admission.

## Data flow

A generated, gamut-safe OKLCH pair is randomized on screen. A choice captures the two canonical colors, shown ordering, type, model version, timing, distance, and local context. The controller persists it, incrementally trains the ensemble in small asynchronous batches, recomputes honest chronological metrics when enough future observations exist, searches the core optimum, saves one daily snapshot, then requests the next active/control/validation pair.

## Validation and readiness

Rolling-origin folds train strictly on earlier choices and score later choices. Metrics are held-out log-loss, accuracy, Brier score, random `p=.5` loss, and a regularized linear OKLCH Bradley–Terry baseline. Readiness uses documented engineering minimums: validation is withheld below 8 held-out predictions; Ready additionally needs repeatable neural improvement, reasonable repeated-pair consistency, local candidate success, and ensemble optimum spread below the configured bound. These are product mechanics, not scientific truths.

## Failure handling and privacy

Numerics clamp logits and gradients and reject non-finite serialized values. Storage migrations preserve older records by adding defaults. Import validates schema before replacing local data; reset requires explicit confirmation. If persistence fails, the UI keeps the current session usable and exposes a plain error. Color appearance is explicitly described as display dependent.

## Testing

Unit tests cover color boundaries, gradients, Adam, serialization, pair invariants, synthetic recovery, context/drift gating, active-versus-random benchmarks, temporal leakage, and persistence. Playwright covers first launch, one-choice semantics, refresh, tab navigation, honest unavailable metrics, real daily history, export/reset, keyboard use, and 390px/desktop overflow. Final verification runs unit tests, the production build, and E2E tests with screenshots at both viewport classes.

## Scientific boundary

Guaranteed properties are algebraic symmetry, identical-pair probability, chronological fold ordering, deterministic initialization, and local-only execution. Engineering assumptions include candidate-pool size, distance bands, validation sample minimums, regularization, and readiness cutoffs. Synthetic tests show implementation capability only; whether comparisons reveal a stable human preference requires real-human longitudinal validation.
