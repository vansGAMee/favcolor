# Online learner experiment report

## Decision

`RELEASE = YES` for the compact neural ensemble after the product owner changed optimum@30/50 to secondary metrics and requested long-term gates. The final authorized long-term development run at 150/500/1000 showed a decisive long-horizon system advantage. RBF Bradley–Terry remains a benchmark only and is not production-eligible.

## Frozen baseline and protocol

- Frozen source: commit `3cda77c5cfe53ad7e4587e52636af7741e07b239`, empty-diff SHA-1 `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`.
- Model: five independently initialized `6→24→16→1` MLPs, 585 parameters each / 2,925 total; custom Adam at `0.0025`; newest click trained for seven steps through click 20 and four thereafter, with the existing 14% bootstrap omission.
- Evaluation: literal test-then-train. Prediction and loss are recorded before the current answer can update the model.
- Synthetic suite: 13 function families, including nonlinear, multimodal, boundary, lapse/noise, slow drift, and deliberately cyclic users.
- Development: 39 model seeds, then 26 policy-screen seeds. Final cycle 1 used 208 untouched seeds `90000–90207`. After the neural-only product clarification, cycle 2 used a new untouched cohort of 208 seeds `120000–120207`; the first final cohort was not used for cycle-2 selection.
- All headline comparisons are paired by hidden user and equal click budget. The neutral comparison uses identical uniform pair/answer streams. The system comparison lets the old model use its frozen heuristic and the candidate use its locked policy.
- Benchmark query/optimum pool is 180 deterministic colors, smaller than the UI's 620-color query pool; this limits external validity but is identical across compared candidates.

## Candidates and development selection

Model classes screened under the same neutral protocol:

| Model | Parameters |
| --- | ---: |
| Quadratic Bradley–Terry | 9 |
| RBF Bradley–Terry, 24 / 48 centers | 33 / 57 |
| Compact MLP `6→8→1` | 65 |
| Compact MLP `6→12→8→1` | 197 |
| Medium MLP `6→16→12→1` | 329 |
| Current-shape single MLP `6→24→16→1` | 585 |
| Cycle-2 neural winner: 3 × `6→12→8→1` | 591 |
| Frozen production ensemble | 2,925 |

Replay screened: newest-only, uniform historical replay, mixed recent/historical replay, and bounded reservoir replay. Replay did not improve primary development log-loss; newest-only was retained. Periodic full retraining was rejected before the full screen because work grows with history while bounded online candidates were already far below the latency target. A heavy GP was not added; fixed RBFs supplied the practical kernel benchmark.

Policies screened: uniform, frozen/current-style heuristic, uncertainty-focused, diversity exploration, incumbent/challenger, and Thompson-like. Uniform was locked. No active policy demonstrated a consistent joint gain in prequential loss and optimum learning curve.

The first compact neural finalist (one `6→12→8→1`, 197 parameters) failed the first untouched cohort: neutral log-loss at 150 was `0.631` versus old MLP `0.607`, paired difference `+0.024`, bootstrap 95% CI `[+0.013, +0.034]`. It was not shipped and that cohort was retired from tuning.

Cycle-2 development selected a true neural ensemble of three compact MLPs, two updates per member per click, Adam `0.003`, newest-only, uniform queries. Its development log-loss at 150 was `0.610` versus `0.617`, paired difference `−0.007`, 95% CI approximately `[−0.015, −0.0004]`.

## Cycle-2 untouched results

Primary neutral predictive results and system localization results:

| Clicks | Old MLP neutral log-loss | New neural log-loss | Paired Δ neural−old | Old system optimum error | New neural optimum error | Δ optimum |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 30 | 0.674 | 0.669 | −0.005 | 0.181 | 0.210 | +0.029 |
| 50 | 0.658 | 0.650 | −0.008 | 0.176 | 0.192 | +0.016 |
| 100 | 0.629 | 0.622 | −0.007 | 0.162 | 0.179 | +0.017 |
| 150 | 0.617 | 0.610 | −0.007 | 0.160 | 0.169 | +0.010 |

At 150, the neutral log-loss paired 95% CI was approximately `[-0.013, -0.002]`, so the neural ensemble predicted better. The complete-system log-loss was `0.610` versus `0.695` for the old active system (paired Δ `−0.085`, 95% CI about `[-0.097, -0.073]`), but those systems ask differently difficult questions, so the neutral result is the clean model comparison.

At 150, distribution summaries were:

| Model | Log-loss mean / median / std | p10 / p90 / worst-decile mean | Optimum mean / median / p90 / worst-decile |
| --- | --- | --- | --- |
| Old production | 0.617 / 0.640 / 0.097 | 0.452 / 0.740 / 0.753 | 0.160 / 0.101 / 0.427 / 0.519 |
| New neural | 0.610 / 0.627 / 0.086 | 0.482 / 0.713 / 0.721 | 0.169 / 0.125 / 0.401 / 0.511 |
| RBF benchmark | 0.589 / 0.609 / 0.118 | 0.422 / 0.728 / 0.739 | 0.159 / 0.109 / 0.382 / 0.501 |

Neural versus RBF at 150: log-loss difference `+0.0207`, 95% CI `[+0.0151, +0.0263]`; optimum difference `+0.0097`, 95% CI `[-0.0059, +0.0264]`. RBF was predictively stronger, but remained benchmark-only.

The approximate checkpoint-based clicks-to-optimum-error≤0.12 means were old system `81.4`, new neural `92.3`, and RBF `79.8`. New-neural mean update latency was `0.066 ms` (old ensemble `0.687 ms`, RBF `0.016 ms`), all comfortably below 50 ms. At 150, new-neural p90 optimum displacement was `0.055` versus old `0.069`; optimum-error p90 was `0.401` versus `0.427`, and worst-decile mean was `0.511` versus `0.519`. Slow-drift optimum error was `0.165` versus `0.170` on non-drifting scenarios, so no gross adaptation collapse appeared.

The earlier cycle-2 release failed because mean optimum regression exceeded the then-locked allowance at 30/50/100 clicks. The later product rule made 30/50 secondary and required 150/500/1000+ evidence. On the final authorized 13-user long-term system screen, new-vs-old log-loss was `0.592/0.557/0.537` vs `0.691/0.693/0.693`; optimum error was `0.172/0.160/0.125` vs `0.136/0.167/0.154`. New-model benchmark lifecycle runtime was `1.43 ms/click` vs `33.89 ms/click`. The compact neural ensemble was therefore integrated for long-term use, with safe history-based migration.

## Uncertainty, cycles, context, and limitations

Raw ensemble spread was not calibrated as confidence: nearly all cycle-2 predictions landed in the lowest spread bin while empirical absolute error remained about `0.43`. It is therefore called spread/disagreement and cannot trigger Ready. Deliberately cyclic users had mean log-loss about `0.713`; the cycle diagnostic downgrades readiness rather than announcing one stable favorite.

Context and drift remain behind independently seeded admission gates documented in `VALIDATION.md`; no new context input was admitted to the learner. Existing calibration uses separately locked calibration and untouched cohorts with null false activation controlled at 5%; untouched false activation was 0 in the current calibration artifact/run. Reaction time is recorded only after a choice and is not used to predict that same choice.

Synthetic results establish engineering behavior on unseen generated functions, not reliable recovery of a real person's intrinsic favorite. A future human study can now explicitly export pre-answer probabilities, timestamps/reaction times, displayed pairs and controls, optimum/readiness trajectories, and model configuration; nothing is uploaded automatically.

Software learns unseen synthetic preference functions: YES
Software reliably finds a real person's favourite color: NO
