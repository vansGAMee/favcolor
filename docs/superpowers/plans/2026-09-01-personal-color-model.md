# Personal Color Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete browser-local personal color preference MVP described in the supplied brief.

**Architecture:** Pure TypeScript ML/color/storage modules feed a React controller and two-tab UI. Five scratch-built neural models learn pairwise utility locally; IndexedDB persists choices, weights, and daily snapshots; rolling-origin validation controls honest readiness.

**Tech Stack:** Vite, React, TypeScript, Vitest, fake-indexeddb, Playwright, IndexedDB, plain CSS.

**Spec:** `docs/superpowers/specs/2026-09-01-personal-color-model-design.md`

## Global Constraints

- No external inference, pretrained weights, ML framework, analytics, backend, login, or downloaded dataset.
- Model coordinates are OKLCH-derived `[L,C,sin(H),cos(H),sin(2H),cos(2H)]`.
- Validation is chronological; production metrics and history always derive from stored events.
- UI is mobile-first, keyboard usable, reduced-motion aware, and uses equal comparison geometry.

---

### Task 1: Color foundation and project harness

**Files:** Create Vite/Vitest configuration, `src/color/color.ts`, and `src/tests/color.test.ts`.

**Interfaces:** Produce `oklchToSrgb`, `srgbToOklch`, `toHex`, `inGamut`, `gamutMap`, `oklabDistance`, and `colorFeatures`.

- [ ] Write literal-fixture tests for black/white/primaries, hue wrapping, round trips, gamut mapping, finite boundaries, and distance symmetry.
- [ ] Run the color test and confirm missing-module failure.
- [ ] Implement standard OKLab matrices, polar conversion, bounded chroma search, and feature encoding.
- [ ] Run the color test and full typecheck.

### Task 2: Scratch neural engine and pairwise learner

**Files:** Create `src/ml/core/network.ts`, `src/ml/optimizer/adam.ts`, `src/ml/preference/pairwise.ts`, and focused tests.

**Interfaces:** Produce `Network`, `forward`, `backwardPair`, `Adam`, `pairProbability`, `trainExample`, `serializeNetwork`, and `deserializeNetwork`.

- [ ] Write deterministic initialization, shape, finite-difference gradient, optimizer, serialization, finiteness, and symmetry tests.
- [ ] Run tests and confirm missing behavior failures.
- [ ] Implement dense tanh layers with typed arrays, stable sigmoid/BCE derivatives, gradient clipping, and Adam.
- [ ] Run focused and complete unit tests.

### Task 3: Ensemble, simulation, active selection, and optimum search

**Files:** Create ensemble, simulation, active-learning, search modules and synthetic/benchmark tests.

**Interfaces:** Produce `PreferenceEnsemble`, `makeOracle`, `simulateChoice`, `selectActivePair`, `searchOptimum`, and `benchmarkStrategies`.

- [ ] Write seeded synthetic recovery and active-versus-random aggregate tests using an oracle independent of production code.
- [ ] Confirm failures before implementation.
- [ ] Implement five seeded learners, probability disagreement, bounded-distance/novelty acquisition, global candidate search, multi-region refinement, and optimum spread.
- [ ] Run benchmarks and preserve measured results for documentation.

### Task 4: Temporal validation and optional factors

**Files:** Create `src/ml/validation/validation.ts`, context/drift modules, simulations, and tests.

**Interfaces:** Produce chronological folds, neural/linear/random metrics, context and drift ablations, and readiness state.

- [ ] Write strict temporal-order, effect/null context, moving/stable drift, and unavailable-metric tests.
- [ ] Confirm failures before implementation.
- [ ] Implement rolling-origin evaluation, regularized linear baseline, Brier/accuracy/log-loss, and conservative repeated-improvement gates.
- [ ] Run validation tests and document engineering thresholds.

### Task 5: IndexedDB persistence and product controller

**Files:** Create `src/storage/db.ts`, `src/app/model.ts`, storage/controller tests, and worker-compatible async scheduling.

**Interfaces:** Produce schema-versioned CRUD, `exportData`, `importData`, `resetData`, immutable `ChoiceEvent`, `DailySnapshot`, and `AppState` updates.

- [ ] Write fake-IndexedDB tests for save/reload, prediction equivalence, migration, import validation, snapshot replacement-by-day, and reset.
- [ ] Confirm failures before implementation.
- [ ] Implement atomic stores and a controller that records once, trains asynchronously, validates, searches, snapshots, and advances the pair.
- [ ] Run integration tests and typecheck.

### Task 6: Discover and You interface

**Files:** Create React components, `src/App.tsx`, `src/styles.css`, and component tests.

**Interfaces:** Render only Discover/You tabs; expose comparison buttons, honest metrics, history detail, export/import/reset, and privacy/method notes.

- [ ] Write UI behavior tests for first launch, exact single recording, next pair, honest unavailable metrics, history details, and destructive confirmation.
- [ ] Confirm failures before implementation.
- [ ] Implement the obsidian editorial interface, accessible controls, equal stimuli, responsive layout, focus states, transition, and reduced motion.
- [ ] Run unit/integration tests and build.

### Task 7: Browser journeys and final verification

**Files:** Create `playwright.config.ts`, `e2e/app.spec.ts`, final docs, and generated benchmark record.

**Interfaces:** Commands `npm run dev`, `npm test`, `npm run build`, and `npm run test:e2e`.

- [ ] Write Playwright flows for persistence, tabs, metrics honesty, snapshot grid, export/reset, keyboard, 390px, desktop, and overflow.
- [ ] Run E2E and confirm any observable failures before fixes.
- [ ] Fix only reproduced defects, rerun focused tests after each fix, and inspect screenshots.
- [ ] Run clean unit, build, and E2E commands; record exact counts and benchmark output in `docs/VALIDATION.md`.
