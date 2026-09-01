# Online Learner Experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select and, only if justified on 200+ untouched users, integrate a better production learner under equal-click prequential evaluation.

**Architecture:** Add an isolated benchmark/learner facade around the frozen production implementation. Deterministic synthetic users and policies drive test-then-train runs; staged artifacts lock every decision before final evaluation.

**Tech Stack:** TypeScript typed arrays, existing custom Adam/MLP/color math, Vite/Vitest/Playwright, JSON artifacts.

**Spec:** `docs/superpowers/specs/2026-09-02-online-learner-experiment-design.md`

## Global Constraints

- Never change or redefine frozen baseline commit/config.
- Prediction and score always precede training on the current label.
- Development and final seeds are disjoint; final has at least 200 seeds and is run once.
- No oracle internals reach a learner; equal budgets and paired hidden users are mandatory.
- No production replacement without all release gates.

### Task 1: Prequential contracts and realistic users

**Files:** Create `src/ml/online/types.ts`, `src/ml/simulation/suite.ts`, `src/ml/benchmark/prequential.ts`; test with `src/tests/prequential.test.ts`.

- [ ] Write failing tests proving prediction precedes update, identical seed reproducibility, all required scenario families, cycle generation, and exact metric literals.
- [ ] Run focused tests and confirm missing-module failures.
- [ ] Implement learner/oracle/policy contracts, deterministic scenario suite, budgets, trajectories, cycle diagnostics, uncertainty bins and runtime timing.
- [ ] Run focused tests and typecheck.

### Task 2: Candidate models and replay

**Files:** Create quadratic, fixed-center RBF and configurable MLP learners plus replay controller; test gradients, serialization, retention and finite updates.

- [ ] Write failing observable-behavior and finite-difference tests.
- [ ] Implement candidates without touching frozen `MLP`/`PreferenceEnsemble` behavior.
- [ ] Run tests, then development neutral-stream screening across disjoint development seeds.
- [ ] Write machine-readable baseline/development artifacts including parameter counts and latency.

### Task 3: Active policies, optimum, uncertainty and readiness

**Files:** Create policy registry, generic optimum search, stability/cycle/readiness diagnostics and tests.

- [ ] Write failing tests for global coverage, recovery from misleading clicks, multimodal/boundary optima, cycle downgrades and uncertainty/error association.
- [ ] Implement only inexpensive policies and generic candidate ranking.
- [ ] Screen policies at 30/50/100/150; eliminate inferior variants and record negative results.
- [ ] Freeze one overall and one neural winner plus release/readiness rules.

### Task 4: Locked final evaluation

**Files:** Create `benchmarks/locked-final-config.json`, final runner, statistics/bootstrap CI tests, and final artifact.

- [ ] Test paired summaries and bootstrap CI against hand-checked fixtures.
- [ ] Write lock before using final seeds.
- [ ] Run candidate and frozen baseline on the same 200+ untouched users exactly once.
- [ ] Evaluate release gates without changing locked parameters.

### Task 5: Conditional production integration and verification

**Files:** Modify production facade/storage/export/docs only if FINAL passes; preserve UI composition.

- [ ] Add migration/export/readiness tests before production changes.
- [ ] If RELEASE YES, integrate winner and rebuild from preserved history; if NO, retain baseline exactly.
- [ ] Run unit, build, E2E, benchmark, calibration and release commands; visually inspect mobile/desktop.
- [ ] Commit artifacts/docs/code and push `main`.
