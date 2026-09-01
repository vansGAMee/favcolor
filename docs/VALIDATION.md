# Validation

## Release metrics

Product metrics use rolling-origin evaluation only: every validation choice has a timestamp later than every choice used to fit that fold. The primary score is held-out Bradley–Terry log-loss. Accuracy and Brier score are secondary. The neural ensemble is compared with random `p=0.5` and a regularized quadratic-OKLab linear Bradley–Terry baseline.

Metrics remain unavailable below eight future predictions. “Ready” is an engineering state, not scientific proof: it additionally requires improvement over both baselines and bounded ensemble-optimum spread.

## Optional-factor calibration protocol

Context and drift gates were calibrated independently of their capability fixtures. Each synthetic history has 240 chronological comparisons. Raw evidence is the mean future log-loss improvement over a fixed quadratic-OKLab baseline across three rolling folds. Candidate rules required either 2/3 or 3/3 folds to improve; the selected rule maximized calibration positive sensitivity subject to at most 5% empirical activation among calibration-null users. The gain cutoff is the 95th percentile among eligible calibration-null gains.

The first 24-seed protocol is retained as a failed experiment: its context gate had 4.2% calibration false activation but 16.7% on its untouched cohort. Those seeds were consumed and excluded from the final calibration. The final study used fresh seed ranges.

### Locked context gate

- Calibration seeds: 301–332 (32 null users; 32 users at each strength 0.8, 1.5, 2.5).
- Gate: mean future log-loss gain `> 0.025426739661343418`, with at least 2/3 folds improving.
- Calibration null gain: min −0.01416, median −0.00270, p95 0.02338, max 0.02543; false-positive rate 0/32 (0%).
- Calibration positive gain medians: 0.00459 / 0.01710 / 0.04641; aggregate TPR 40/96 (41.7%); by strength 3.1% / 31.3% / 90.6%.
- Untouched seeds: 2101–2116. Null gain min −0.00700, median −0.00241, p95/max 0.01250; false-positive rate 0/16 (0%).
- Untouched positive gain medians: 0.00647 / 0.02458 / 0.05786; aggregate TPR 23/48 (47.9%); by strength 0% / 50.0% / 93.8%.

### Locked drift gate

- Calibration seeds: 401–432 (32 null users; 32 users at each strength 0.6, 1.2, 2.0).
- Gate: mean future log-loss gain `> 0.02993949922913645`, with at least 2/3 folds improving.
- Calibration null gain: min −0.00059, median 0.01116, p95 0.02994, max 0.03076; false-positive rate 1/32 (3.1%).
- Calibration positive gain medians: 0.01587 / 0.02219 / 0.02887; aggregate TPR 19/96 (19.8%); by strength 0% / 15.6% / 43.8%.
- Untouched seeds: 2201–2216. Null gain min 0.00422, median 0.01215, p95/max 0.02484; false-positive rate 0/16 (0%).
- Untouched positive gain medians: 0.01754 / 0.02138 / 0.03177; aggregate TPR 15/48 (31.3%); by strength 0% / 18.8% / 75.0%.

The low weak-effect sensitivity is intentional and visible: optional factors default off unless they show a repeatable, practically measurable future-prediction gain. Synthetic detection rates do not establish human time-of-day or preference-drift effects.

Reproduce the full calibration and untouched evaluation with:

```bash
npm run calibrate
```

The command fails if newly generated gates differ from the locked production constants.

## Synthetic learner and acquisition benchmark

Run with `npm run benchmark`. The virtual user's hidden radial OKLab utility is defined only in the simulation module and is not available to the learner.

- Recovery seeds 4/19/71: future neural log-loss 0.6190 / 0.6190 / 0.6421 versus random 0.6931. Mean future log-loss was 0.6267; mean recovered-optimum error was 0.1692 OKLab.
- Equal-budget active-versus-random seeds 2/8/21 (48 queries): active optimum errors 0.3126 / 0.3039 / 0.2420; random errors 0.3400 / 0.2451 / 0.3400. Aggregate mean was 0.2861 active versus 0.3084 random, a 7.2% reduction.

The active policy loses on one of three seeds and its aggregate advantage is modest. It passes the current deterministic aggregate criterion, but this is a weak result rather than broad evidence of dominance. More seeds and human-query benchmarks are needed before claiming general sample-efficiency improvement.
