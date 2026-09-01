# Online Learner Experiment Design

## Decision

The frozen baseline is commit `3cda77c5cfe53ad7e4587e52636af7741e07b239`, clean diff hash `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`: five 585-parameter `6→24→16→1` tanh MLPs, Adam `0.0025`, newest-example bootstrap updates, early coverage then ambiguity/disagreement/high-utility contender acquisition, broad-plus-local optimum search. Its code and definition will not be altered; candidates use separate modules/adapters.

## Experiment architecture

All evaluation is event-by-event test-then-train. A hidden user and displayed pair produce a learner probability before the answer is sampled. Log-loss, Brier, accuracy, optimum trajectory, runtime and uncertainty are recorded, and only then is the answer passed to the exact update method used by production.

A deterministic suite spans smooth/narrow/broad/multimodal/ring/hue/chroma/lightness/interaction/boundary/muted/saturated scalar utilities, noise/lapses/contradictions/weak preference/drift, and deliberately cyclic choice behavior. Learners receive only colors, context available before the answer, and past labels—never oracle utility or optimum.

## Staged selection

1. Characterize frozen baseline on development seeds and store an immutable JSON artifact.
2. On identical neutral pair streams, screen quadratic Bradley–Terry, fixed-center RBF Bradley–Terry, frozen MLP, and configurable smaller MLP. Screen newest-only, uniform replay, recent+historical replay, reservoir, and periodic retrain only for serious models.
3. For surviving model/replay combinations, compare uniform, frozen heuristic, uncertainty, diversity, incumbent-challenger, and deterministic Thompson-like policies at budgets 30/50/100/150.
4. Choose one overall winner and one neural winner on development seeds. Calibrate cycle/readiness/uncertainty rules only there.
5. Write a machine-readable lock containing config, development seeds and a never-used final range of at least 200 seeds. Run FINAL exactly once.
6. Replace production only if paired FINAL evidence satisfies every release gate. Otherwise retain baseline and report `RELEASE = NO`.

Successive elimination is mandatory; no full Cartesian product is run. Runtime is part of selection. All meaningful runs write JSON under `benchmarks/artifacts/{baseline,development,final}`.

## Product integration

If a candidate wins, a versioned learner facade preserves stored choices and safely rebuilds/migrates model state. Export adds pre-click probability, optimum/state trajectories, model config and controls. UI stays visually intact but distinguishes an early current estimate from validated/stable evidence. Scalar-utility conflict or poor stability prevents Ready.

## Scientific boundary

Synthetic success validates software behavior on the specified simulation family, not a real human's “true favorite.” The final human-validity answer remains NO until a separate human study exists.
