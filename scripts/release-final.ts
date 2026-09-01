import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { FrozenProductionLearner } from '../src/ml/benchmark/frozenBaseline'
import { frozenCurrentPolicy } from '../src/ml/benchmark/policies'
import { runPrequential, uniformPolicy, type CheckpointMetrics, type PrequentialResult } from '../src/ml/benchmark/prequential'
import { pairedSummary, summarize } from '../src/ml/benchmark/statistics'
import { RbfBT } from '../src/ml/online/rbf'
import { ConfigurableMLP } from '../src/ml/online/mlp'
import type { OnlineLearner, QueryPolicy } from '../src/ml/online/types'
import { createScenario } from '../src/ml/simulation/suite'
import { cycleConflictRate } from '../src/ml/validation/cycles'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const lock = JSON.parse(readFileSync(`${root}/benchmarks/locked-final-config.json`, 'utf8'))
const seeds = Array.from({ length: lock.finalSeeds.count }, (_, index) => lock.finalSeeds.first + index)
const budgets: number[] = lock.budgets
const metricKeys: (keyof CheckpointMetrics)[] = ['logLoss', 'brier', 'accuracy', 'optimumError', 'medianDisplacement', 'p90Displacement']

function execute(id: string, factory: (seed: number) => OnlineLearner, policy: QueryPolicy) {
  const started = performance.now()
  const results = seeds.map((seed, index) => {
    if (index % 13 === 0) console.log(`${id}: ${index}/${seeds.length}`)
    return runPrequential({ learner: factory(seed + 701), oracle: createScenario(seed), policy, budget: 150, candidateCount: lock.evaluation.candidatePool, checkpoints: budgets })
  })
  return { id, policy: policy.id, wallTimeMs: performance.now() - started, results }
}

function summarizeRun(run: { results: PrequentialResult[] }) {
  const checkpoints = Object.fromEntries(budgets.map(budget => [budget, Object.fromEntries(metricKeys.map(key => [key, summarize(run.results.map(result => result.checkpoints.find(row => row.budget === budget)![key] as number))]))]))
  const clicks = run.results.map(result => result.checkpoints.find(row => row.optimumError <= .12)?.budget ?? 151)
  const observations = run.results.flatMap(result => result.observations)
  const uncertaintyBins = Array.from({ length: 5 }, (_, bin) => {
    const rows = observations.filter(item => Math.min(4, Math.floor((item.uncertainty ?? 0) * 5)) === bin)
    return { bin, count: rows.length, meanSignal: rows.reduce((sum, item) => sum + (item.uncertainty ?? 0), 0) / Math.max(1, rows.length), empiricalAbsoluteError: rows.reduce((sum, item) => sum + Math.abs((item.predictedProbability ?? .5) - item.chosenA), 0) / Math.max(1, rows.length) }
  })
  return {
    checkpoints, clicksToOptimumErrorAtMost012: summarize(clicks),
    updateLatencyMeanMs: summarize(run.results.map(result => result.updateLatencyMeanMs)),
    updateLatencyP95Ms: summarize(run.results.map(result => result.updateLatencyP95Ms)),
    cycleConflictRate: summarize(run.results.map(result => cycleConflictRate(result.observations))),
    uncertaintyBins,
    scenarioGroups: {
      drifting: summarize(run.results.filter(result => Math.floor(Number(result.scenarioId.split('-').at(-1)) / 13) % 6 === 5).map(result => result.checkpoints.at(-1)!.optimumError)),
      nonDrifting: summarize(run.results.filter(result => Math.floor(Number(result.scenarioId.split('-').at(-1)) / 13) % 6 !== 5).map(result => result.checkpoints.at(-1)!.optimumError)),
      cyclic: summarize(run.results.filter(result => result.scenarioId.startsWith('cyclic-')).map(result => result.checkpoints.at(-1)!.logLoss)),
    },
  }
}

function compare(baseline: PrequentialResult[], candidate: PrequentialResult[]) {
  return Object.fromEntries(budgets.map(budget => [budget, Object.fromEntries(metricKeys.map((key, keyIndex) => {
    const base = baseline.map(result => result.checkpoints.find(row => row.budget === budget)![key] as number)
    const next = candidate.map(result => result.checkpoints.find(row => row.budget === budget)![key] as number)
    return [key, { baseline: summarize(base), candidate: summarize(next), pairedCandidateMinusBaseline: pairedSummary(base, next, 700_000 + budget * 17 + keyIndex) }]
  }))]))
}

const rbf = execute('locked-rbf-bt-24-benchmark', seed => new RbfBT(seed, 24, .15, .025), uniformPolicy)
const neural = execute('locked-mlp-6x12x8x1', seed => new ConfigurableMLP(seed, [6, 12, 8, 1], .003), uniformPolicy)
const baselineNeutral = execute('frozen-baseline-neutral', seed => new FrozenProductionLearner(seed), uniformPolicy)
const baselineSystem = execute('frozen-baseline-current-policy', seed => new FrozenProductionLearner(seed), frozenCurrentPolicy)
const rbfSummary = summarizeRun(rbf)
const neuralSummary = summarizeRun(neural)
const baselineNeutralSummary = summarizeRun(baselineNeutral)
const baselineSystemSummary = summarizeRun(baselineSystem)
const neuralNeutralComparison = compare(baselineNeutral.results, neural.results)
const neuralSystemComparison = compare(baselineSystem.results, neural.results)
const rbfNeutralComparison = compare(baselineNeutral.results, rbf.results)
const neuralVsRbf = compare(rbf.results, neural.results)
const gates = lock.releaseGates
const checks: Record<string, boolean> = {
  neutralLogLoss: neuralNeutralComparison[150].logLoss.pairedCandidateMinusBaseline.bootstrap95[1] < gates.neutralPrequentialLogLossPaired95UpperBelow,
  systemLogLoss: neuralSystemComparison[150].logLoss.pairedCandidateMinusBaseline.bootstrap95[1] < gates.systemPrequentialLogLossPaired95UpperBelow,
  optimumMeans: budgets.every(budget => neuralSystemComparison[budget].optimumError.pairedCandidateMinusBaseline.meanDifference <= gates.optimumMeanDifferenceAtEachBudgetAtMost),
  optimumP90: budgets.every(budget => neuralSummary.checkpoints[budget].optimumError.p90 - baselineSystemSummary.checkpoints[budget].optimumError.p90 <= gates.optimumP90RegressionAtEachBudgetAtMost),
  optimumWorstDecile: budgets.every(budget => neuralSummary.checkpoints[budget].optimumError.worstDecileMean - baselineSystemSummary.checkpoints[budget].optimumError.worstDecileMean <= gates.optimumWorstDecileRegressionAtEachBudgetAtMost),
  stability: neuralSummary.checkpoints[150].p90Displacement.p90 - baselineSystemSummary.checkpoints[150].p90Displacement.p90 <= gates.p90DisplacementRegressionAt150AtMost,
  runtime: neuralSummary.updateLatencyMeanMs.mean < gates.meanUpdateLatencyMsBelow,
}
const release = Object.values(checks).every(Boolean)
const artifact = {
  artifactVersion: 1, timestamp: new Date().toISOString(), gitCommit: execSync('git rev-parse HEAD', { cwd: root }).toString().trim(),
  lockedConfig: lock, seeds, finalMetricsInspectedBeforeAllFrozenModelsCompleted: false,
  productionCandidate: { config: lock.bestNeuralDevelopmentCandidate, wallTimeMs: neural.wallTimeMs, summary: neuralSummary },
  rbfBenchmark: { config: lock.candidate, wallTimeMs: rbf.wallTimeMs, summary: rbfSummary },
  baselineNeutral: { config: lock.baseline, wallTimeMs: baselineNeutral.wallTimeMs, summary: baselineNeutralSummary },
  baselineSystem: { config: lock.baseline, wallTimeMs: baselineSystem.wallTimeMs, summary: baselineSystemSummary },
  neuralNeutralComparison, neuralSystemComparison, rbfNeutralComparison, neuralVsRbf,
  releaseChecks: checks, release: release ? 'YES' : 'NO',
}
mkdirSync(`${root}/benchmarks/artifacts/final`, { recursive: true })
writeFileSync(`${root}/benchmarks/artifacts/final/final-untouched-208.json`, JSON.stringify(artifact, null, 2))
console.log(`FINAL complete. RELEASE=${artifact.release}`)
