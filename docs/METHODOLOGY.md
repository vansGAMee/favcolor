# Methodology

## Mathematically guaranteed

- The same utility network scores both colors. Pair probability is `sigmoid(U(A) - U(B))`, so swapping colors complements the probability, identical colors produce `0.5`, and a shared utility offset cancels.
- Inputs use OKLCH-derived `[L, C, sin(H), cos(H), sin(2H), cos(2H)]`, not RGB/HSL/HSV coordinates.
- Validation folds sort by timestamp and every test item occurs strictly after every training item.
- Ensemble disagreement is calculated over pair probabilities.
- Core optimum search evaluates displayable candidates and does not exclude gamut boundaries.
- No event or weight leaves the browser through application code.

## Engineering assumptions

- Candidate-pool size, uniform pair acquisition, readiness sample minimums, optimum-spread bound, and 11/7/13-event control scheduling are MVP mechanics—not perceptual constants.
- Ready requires at least three future folds with two neural wins, two repeated controls with at least 60% consistency, a local-candidate challenge win rate of at least 50%, and ensemble optimum spread no greater than 0.18 OKLab. These conservative release mechanics are not universal scientific cutoffs.
- Three compact models balance robustness with browser cost; each receives two online Adam updates from the newest click.
- Validation metrics appear after eight chronological future predictions; this is a display minimum, not a truth threshold.
- Context and drift use regularized residual modulation over ΔOKLab features. They stay off unless three rolling-origin folds satisfy independently calibrated gates documented in `VALIDATION.md`.
- Reaction time is recorded but not used for weighting or inference. It has no admission result yet.

## Requires real-human validation

- Whether repeated pair choices provide a stable and useful estimate for an individual.
- Whether uniform acquisition remains preferable to active acquisition for real humans.
- Whether context or long-term drift appears at detectable rates in real use.
- Whether display changes, fatigue, symbolic HEX knowledge, adaptation, and comparison order introduce important biases.

Estimate movement early in learning is not labeled preference drift. Synthetic recovery shows software capability only and cannot establish a psychological color construct.
