import type { TrainingExample, ValidationMetrics } from '../../app/types'
import { colorFeatures, oklchToOklab } from '../../color/color'
import { PreferenceEnsemble } from '../ensemble/ensemble'
import { LOCKED_FACTOR_GATES, type FactorGate } from './gates'

export function chronologicalSplits<T extends { timestamp: number }>(items: T[], minimumTrain = 24, testSize = 8) {
  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp)
  const splits: { train: T[]; test: T[] }[] = []
  for (let end = minimumTrain; end + testSize <= sorted.length; end += testSize) splits.push({ train: sorted.slice(0, end), test: sorted.slice(end, end + testSize) })
  return splits
}

function featureDiff(example: TrainingExample) {
  const a = colorFeatures(example.a)
  const b = colorFeatures(example.b)
  const al = oklchToOklab(example.a)
  const bl = oklchToOklab(example.b)
  return [
    al.l - bl.l, al.a - bl.a, al.b - bl.b,
    al.l * al.l - bl.l * bl.l,
    al.a * al.a - bl.a * bl.a,
    al.b * al.b - bl.b * bl.b,
    a[1] - b[1], a[4] - b[4], a[5] - b[5],
  ]
}

function sigmoid(x: number) { return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x)))) }

function fitLogistic(examples: TrainingExample[], feature: (x: TrainingExample) => number[], lambda = 0.002, initial?: ArrayLike<number>) {
  const size = feature(examples[0]).length
  const weights = new Float64Array(size)
  if (initial) weights.set(Array.from(initial).slice(0, size))
  for (let epoch = 0; epoch < 1800; epoch++) {
    const gradient = new Float64Array(size)
    for (const example of examples) {
      const x = feature(example)
      let score = 0
      for (let i = 0; i < size; i++) score += weights[i] * x[i]
      const error = sigmoid(score) - example.chosenA
      for (let i = 0; i < size; i++) gradient[i] += error * x[i]
    }
    for (let i = 0; i < size; i++) weights[i] -= 0.18 * (gradient[i] / examples.length + lambda * weights[i])
  }
  const predict = (example: TrainingExample) => {
    const x = feature(example)
    let score = 0
    for (let i = 0; i < size; i++) score += weights[i] * x[i]
    return sigmoid(score)
  }
  return { weights, predict }
}

function loss(examples: TrainingExample[], predict: (x: TrainingExample) => number) {
  return examples.reduce((sum, example) => {
    const p = Math.max(1e-7, Math.min(1 - 1e-7, predict(example)))
    return sum - example.chosenA * Math.log(p) - (1 - example.chosenA) * Math.log(1 - p)
  }, 0) / examples.length
}

function fitResidual(examples: TrainingExample[], basePredict: (x: TrainingExample) => number, extraFeature: (x: TrainingExample) => number[], lambda: number) {
  const weights = new Float64Array(extraFeature(examples[0]).length)
  for (let epoch = 0; epoch < 1800; epoch++) {
    const gradient = new Float64Array(weights.length)
    for (const example of examples) {
      const baseP = Math.max(1e-7, Math.min(1 - 1e-7, basePredict(example)))
      let score = Math.log(baseP / (1 - baseP))
      const x = extraFeature(example)
      for (let i = 0; i < weights.length; i++) score += weights[i] * x[i]
      const error = sigmoid(score) - example.chosenA
      for (let i = 0; i < weights.length; i++) gradient[i] += error * x[i]
    }
    for (let i = 0; i < weights.length; i++) weights[i] -= 0.3 * (gradient[i] / examples.length + lambda * weights[i])
  }
  return (example: TrainingExample) => {
    const baseP = Math.max(1e-7, Math.min(1 - 1e-7, basePredict(example)))
    let score = Math.log(baseP / (1 - baseP))
    const x = extraFeature(example)
    for (let i = 0; i < weights.length; i++) score += weights[i] * x[i]
    return sigmoid(score)
  }
}

export interface FactorEvidence { active: boolean; improvement: number; folds: number; positiveFolds: number }

export function factorEvidence(data: TrainingExample[], kind: 'context' | 'drift', gate: FactorGate = LOCKED_FACTOR_GATES[kind]): FactorEvidence {
  const splits = chronologicalSplits(data, Math.max(80, Math.floor(data.length * 0.5)), Math.max(20, Math.floor(data.length * 0.15))).slice(-3)
  const improvements = splits.map(split => {
    const simple = fitLogistic(split.train, featureDiff)
    const extraFeature = (example: TrainingExample) => {
      const base = featureDiff(example)
      if (kind === 'context') {
        const phase = 2 * Math.PI * example.localHour / 24
        return [...base.slice(0, 3).map(x => x * Math.sin(phase)), ...base.slice(0, 3).map(x => x * Math.cos(phase))]
      }
      const t = Math.max(-1, Math.min(1, example.elapsedDays / 90))
      return base.slice(0, 3).map(x => x * t)
    }
    const full = fitResidual(split.train, simple.predict, extraFeature, kind === 'drift' ? 0.004 : 0.002)
    return loss(split.test, simple.predict) - loss(split.test, full)
  })
  const mean = improvements.reduce((a, b) => a + b, 0) / Math.max(1, improvements.length)
  const positiveFolds = improvements.filter(x => x > 0).length
  return { active: improvements.length >= 3 && mean > gate.minimumMeanGain && positiveFolds >= gate.requiredPositiveFolds, improvement: mean, folds: improvements.length, positiveFolds }
}

export function evaluateFactors(data: TrainingExample[]) {
  return { context: factorEvidence(data, 'context'), drift: factorEvidence(data, 'drift') }
}

export function calculateMetrics(test: TrainingExample[], predict: (x: TrainingExample) => number, baseline: (x: TrainingExample) => number): ValidationMetrics {
  const probabilities = test.map(predict)
  const baselineProbabilities = test.map(baseline)
  return {
    count: test.length,
    logLoss: loss(test, predict),
    accuracy: probabilities.filter((p, i) => (p >= 0.5 ? 1 : 0) === test[i].chosenA).length / test.length,
    brier: probabilities.reduce((sum, p, i) => sum + (p - test[i].chosenA) ** 2, 0) / test.length,
    baselineLogLoss: loss(test, baseline),
    randomLogLoss: Math.log(2),
    beatsBaseline: loss(test, predict) < loss(test, baseline) && loss(test, predict) < Math.log(2),
    folds: 1,
    foldWins: loss(test, predict) < loss(test, baseline) && loss(test, predict) < Math.log(2) ? 1 : 0,
  }
}

export function rollingValidation(data: TrainingExample[]): ValidationMetrics | null {
  if (data.length < 32) return null
  const splits = chronologicalSplits(data, Math.max(24, data.length - 24), 8).slice(-3)
  if (!splits.length) return null
  const foldMetrics = splits.map((split, index) => {
    const model = new PreferenceEnsemble(73 + index * 101)
    model.train(split.train, 14)
    const baseline = fitLogistic(split.train, featureDiff)
    return calculateMetrics(split.test, example => model.probability(example.a, example.b), baseline.predict)
  })
  const weight = 1 / foldMetrics.length
  const foldWins = foldMetrics.filter(metric => metric.beatsBaseline).length
  return {
    count: foldMetrics.reduce((sum, metric) => sum + metric.count, 0),
    logLoss: foldMetrics.reduce((sum, metric) => sum + metric.logLoss * weight, 0),
    accuracy: foldMetrics.reduce((sum, metric) => sum + metric.accuracy * weight, 0),
    brier: foldMetrics.reduce((sum, metric) => sum + metric.brier * weight, 0),
    baselineLogLoss: foldMetrics.reduce((sum, metric) => sum + metric.baselineLogLoss * weight, 0),
    randomLogLoss: Math.log(2), folds: foldMetrics.length, foldWins,
    beatsBaseline: foldMetrics.length >= 2 && foldWins >= Math.ceil(foldMetrics.length * 2 / 3),
  }
}
