import { makeOracle, simulateDataset } from '../src/ml/simulation/oracle'
import { factorEvidence } from '../src/ml/validation/validation'
import type { FactorGate } from '../src/ml/validation/gates'
import { LOCKED_FACTOR_GATES } from '../src/ml/validation/gates'

type Kind = 'context' | 'drift'
type Sample = { seed: number; strength: number; gain: number; positiveFolds: number }

const configurations = {
  context: { optimum: { l: 0.62, c: 0.17, h: 260 }, strengths: [0.8, 1.5, 2.5], calibrationStart: 301, holdoutStart: 2101 },
  drift: { optimum: { l: 0.65, c: 0.18, h: 280 }, strengths: [0.6, 1.2, 2], calibrationStart: 401, holdoutStart: 2201 },
} as const

function percentile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(q * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))]
}

function summary(values: number[]) {
  return { min: Math.min(...values), p25: percentile(values, .25), median: percentile(values, .5), p75: percentile(values, .75), p95: percentile(values, .95), max: Math.max(...values), mean: values.reduce((a, b) => a + b, 0) / values.length }
}

function collect(kind: Kind, start: number, count: number, strengths: readonly number[]) {
  const config = configurations[kind]
  const nulls: Sample[] = []
  const positives: Sample[] = []
  const rawGate: FactorGate = { minimumMeanGain: -Infinity, requiredPositiveFolds: 0, calibrationSeeds: [], targetNullFalsePositiveRate: .05 }
  for (let i = 0; i < count; i++) {
    const seed = start + i
    const nullData = simulateDataset(makeOracle(config.optimum, 0, 0), 240, seed)
    const nullEvidence = factorEvidence(nullData, kind, rawGate)
    nulls.push({ seed, strength: 0, gain: nullEvidence.improvement, positiveFolds: nullEvidence.positiveFolds })
    for (const strength of strengths) {
      const oracle = kind === 'context' ? makeOracle(config.optimum, strength, 0) : makeOracle(config.optimum, 0, strength)
      const evidence = factorEvidence(simulateDataset(oracle, 240, seed), kind, rawGate)
      positives.push({ seed, strength, gain: evidence.improvement, positiveFolds: evidence.positiveFolds })
    }
  }
  return { nulls, positives }
}

function rates(samples: Sample[], threshold: number, requiredPositiveFolds: number) {
  const admitted = samples.filter(sample => sample.positiveFolds >= requiredPositiveFolds && sample.gain > threshold).length
  return { admitted, total: samples.length, rate: admitted / samples.length }
}

const report: Record<string, unknown> = { generatedAt: new Date().toISOString(), protocol: 'On fresh calibration cohorts, choose the 95th-percentile eligible-null gain threshold and the fold-consistency rule (2/3 or 3/3 improving folds) with highest positive-cohort sensitivity subject to empirical null activation <=5%. Lock before evaluating fresh untouched seeds.' }

for (const kind of ['context', 'drift'] as const) {
  const config = configurations[kind]
  const calibration = collect(kind, config.calibrationStart, 32, config.strengths)
  const candidates = [2, 3].map(requiredPositiveFolds => {
    const eligible = calibration.nulls.filter(sample => sample.positiveFolds >= requiredPositiveFolds).map(sample => sample.gain)
    const threshold = eligible.length ? percentile(eligible, .95) : 0
    return { requiredPositiveFolds, threshold, falsePositive: rates(calibration.nulls, threshold, requiredPositiveFolds), truePositive: rates(calibration.positives, threshold, requiredPositiveFolds) }
  }).filter(candidate => candidate.falsePositive.rate <= .05)
    .sort((a, b) => b.truePositive.rate - a.truePositive.rate || a.falsePositive.rate - b.falsePositive.rate)
  const selected = candidates[0]
  if (!selected) throw new Error(`No ${kind} gate controls calibration false activation`)
  const { threshold, requiredPositiveFolds } = selected
  const locked = LOCKED_FACTOR_GATES[kind]
  if (Math.abs(locked.minimumMeanGain - threshold) > 1e-12 || locked.requiredPositiveFolds !== requiredPositiveFolds) {
    throw new Error(`${kind} calibration no longer reproduces the locked gate`)
  }
  const holdout = collect(kind, config.holdoutStart, 16, config.strengths)
  report[kind] = {
    gate: { minimumMeanGain: threshold, requiredPositiveFolds },
    candidateRules: candidates,
    calibration: {
      seeds: [config.calibrationStart, config.calibrationStart + 31],
      nullGain: summary(calibration.nulls.map(x => x.gain)),
      positiveGainByStrength: Object.fromEntries(config.strengths.map(strength => [strength, summary(calibration.positives.filter(x => x.strength === strength).map(x => x.gain))])),
      falsePositive: rates(calibration.nulls, threshold, requiredPositiveFolds),
      truePositive: rates(calibration.positives, threshold, requiredPositiveFolds),
      truePositiveByStrength: Object.fromEntries(config.strengths.map(strength => [strength, rates(calibration.positives.filter(x => x.strength === strength), threshold, requiredPositiveFolds)])),
    },
    untouched: {
      seeds: [config.holdoutStart, config.holdoutStart + 15],
      nullGain: summary(holdout.nulls.map(x => x.gain)),
      positiveGainByStrength: Object.fromEntries(config.strengths.map(strength => [strength, summary(holdout.positives.filter(x => x.strength === strength).map(x => x.gain))])),
      falsePositive: rates(holdout.nulls, threshold, requiredPositiveFolds),
      truePositive: rates(holdout.positives, threshold, requiredPositiveFolds),
      truePositiveByStrength: Object.fromEntries(config.strengths.map(strength => [strength, rates(holdout.positives.filter(x => x.strength === strength), threshold, requiredPositiveFolds)])),
    },
  }
}

console.log(JSON.stringify(report, null, 2))
