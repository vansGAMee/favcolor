import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { FrozenProductionLearner } from '../src/ml/benchmark/frozenBaseline'
import { frozenCurrentPolicy } from '../src/ml/benchmark/policies'
import { runPrequential, uniformPolicy, type CheckpointMetrics, type PrequentialResult } from '../src/ml/benchmark/prequential'
import { pairedSummary, summarize } from '../src/ml/benchmark/statistics'
import { NeuralEnsemble } from '../src/ml/online/neuralStrategies'
import { RbfBT } from '../src/ml/online/rbf'
import type { OnlineLearner, QueryPolicy } from '../src/ml/online/types'
import { createScenario } from '../src/ml/simulation/suite'
import { cycleConflictRate } from '../src/ml/validation/cycles'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const lock = JSON.parse(readFileSync(`${root}/benchmarks/locked-neural-final-cycle-2.json`, 'utf8'))
const seeds = Array.from({ length: lock.finalSeeds.count }, (_, index) => lock.finalSeeds.first + index)
const budgets: number[] = lock.budgets
const keys: (keyof CheckpointMetrics)[] = ['logLoss', 'brier', 'accuracy', 'optimumError', 'medianDisplacement', 'p90Displacement']

function execute(id: string, create: (seed: number) => OnlineLearner, policy: QueryPolicy) {
  const started = performance.now()
  const results = seeds.map((seed, index) => {
    if (index % 13 === 0) console.log(`${id}: ${index}/${seeds.length}`)
    return runPrequential({ learner: create(seed + 701), oracle: createScenario(seed), policy, budget: 150, candidateCount: lock.evaluation.candidatePool, checkpoints: budgets })
  })
  return { id, policy: policy.id, wallTimeMs: performance.now() - started, results }
}

const values = (results: PrequentialResult[], budget: number, key: keyof CheckpointMetrics) => results.map(result => result.checkpoints.find(row => row.budget === budget)![key] as number)
function summary(run: { results: PrequentialResult[] }) {
  const observations = run.results.flatMap(result => result.observations)
  return {
    checkpoints: Object.fromEntries(budgets.map(budget => [budget, Object.fromEntries(keys.map(key => [key, summarize(values(run.results, budget, key))]))])),
    clicksToOptimumErrorAtMost012: summarize(run.results.map(result => result.checkpoints.find(row => row.optimumError <= .12)?.budget ?? 151)),
    updateLatencyMeanMs: summarize(run.results.map(result => result.updateLatencyMeanMs)),
    updateLatencyP95Ms: summarize(run.results.map(result => result.updateLatencyP95Ms)),
    cycleConflictRate: summarize(run.results.map(result => cycleConflictRate(result.observations))),
    uncertaintyBins: Array.from({ length: 5 }, (_, bin) => {
      const rows = observations.filter(item => Math.min(4, Math.floor((item.uncertainty ?? 0) * 5)) === bin)
      return { bin, count: rows.length, meanSignal: rows.reduce((sum, item) => sum + (item.uncertainty ?? 0), 0) / Math.max(1, rows.length), empiricalAbsoluteError: rows.reduce((sum, item) => sum + Math.abs((item.predictedProbability ?? .5) - item.chosenA), 0) / Math.max(1, rows.length) }
    }),
    scenarioGroups: {
      driftingOptimumError150: summarize(run.results.filter(result => Math.floor(Number(result.scenarioId.split('-').at(-1)) / 13) % 6 === 5).map(result => result.checkpoints.at(-1)!.optimumError)),
      stableOptimumError150: summarize(run.results.filter(result => Math.floor(Number(result.scenarioId.split('-').at(-1)) / 13) % 6 !== 5).map(result => result.checkpoints.at(-1)!.optimumError)),
      cyclicLogLoss150: summarize(run.results.filter(result => result.scenarioId.startsWith('cyclic-')).map(result => result.checkpoints.at(-1)!.logLoss)),
    },
  }
}
function compare(baseline: PrequentialResult[], candidate: PrequentialResult[]) {
  return Object.fromEntries(budgets.map(budget => [budget, Object.fromEntries(keys.map((key, index) => {
    const before = values(baseline, budget, key), after = values(candidate, budget, key)
    return [key, { baseline: summarize(before), candidate: summarize(after), pairedCandidateMinusBaseline: pairedSummary(before, after, 1_200_000 + budget * 17 + index) }]
  }))]))
}

const neural = execute('locked-neural-ensemble-3x-small-r2', seed => new NeuralEnsemble(seed, [6, 12, 8, 1], 3, 2, .003), uniformPolicy)
const rbf = execute('rbf-benchmark-only', seed => new RbfBT(seed, 24, .15, .025), uniformPolicy)
const oldNeutral = execute('old-production-neutral', seed => new FrozenProductionLearner(seed), uniformPolicy)
const oldSystem = execute('old-production-current-policy', seed => new FrozenProductionLearner(seed), frozenCurrentPolicy)
const neuralSummary = summary(neural), rbfSummary = summary(rbf), oldNeutralSummary = summary(oldNeutral), oldSystemSummary = summary(oldSystem)
const neuralNeutral = compare(oldNeutral.results, neural.results)
const neuralSystem = compare(oldSystem.results, neural.results)
const neuralVsRbf = compare(rbf.results, neural.results)
const gate = lock.releaseGates
const checks = {
  neutralLogLoss: neuralNeutral[150].logLoss.pairedCandidateMinusBaseline.bootstrap95[1] < gate.neutralLogLossPaired95UpperBelow,
  systemLogLoss: neuralSystem[150].logLoss.pairedCandidateMinusBaseline.bootstrap95[1] < gate.systemLogLossPaired95UpperBelow,
  optimumMeans: budgets.every(budget => neuralSystem[budget].optimumError.pairedCandidateMinusBaseline.meanDifference <= gate.optimumMeanRegressionEachBudgetAtMost),
  optimumP90: budgets.every(budget => neuralSummary.checkpoints[budget].optimumError.p90 - oldSystemSummary.checkpoints[budget].optimumError.p90 <= gate.optimumP90RegressionEachBudgetAtMost),
  optimumWorstDecile: budgets.every(budget => neuralSummary.checkpoints[budget].optimumError.worstDecileMean - oldSystemSummary.checkpoints[budget].optimumError.worstDecileMean <= gate.optimumWorstDecileRegressionEachBudgetAtMost),
  stability: neuralSummary.checkpoints[150].p90Displacement.p90 - oldSystemSummary.checkpoints[150].p90Displacement.p90 <= gate.p90DisplacementRegressionAt150AtMost,
  runtime: neuralSummary.updateLatencyMeanMs.mean < gate.meanUpdateLatencyMsBelow,
}
const release = Object.values(checks).every(Boolean)
const artifact = {
  artifactVersion: 1, timestamp: new Date().toISOString(), gitCommit: execSync('git rev-parse HEAD', { cwd: root }).toString().trim(), lockedConfig: lock, seeds,
  productionCandidate: { wallTimeMs: neural.wallTimeMs, summary: neuralSummary }, rbfBenchmark: { wallTimeMs: rbf.wallTimeMs, summary: rbfSummary },
  oldProductionNeutral: { wallTimeMs: oldNeutral.wallTimeMs, summary: oldNeutralSummary }, oldProductionSystem: { wallTimeMs: oldSystem.wallTimeMs, summary: oldSystemSummary },
  neuralNeutralComparison: neuralNeutral, neuralSystemComparison: neuralSystem, neuralVsRbf, releaseChecks: checks, release: release ? 'YES' : 'NO',
}
mkdirSync(`${root}/benchmarks/artifacts/final`, { recursive: true })
writeFileSync(`${root}/benchmarks/artifacts/final/neural-cycle-2-untouched-208.json`, JSON.stringify(artifact, null, 2))
console.log(`NEURAL FINAL CYCLE 2 complete. RELEASE=${artifact.release}`)
