import { mkdirSync, writeFileSync } from 'node:fs'
import { FrozenProductionLearner } from '../src/ml/benchmark/frozenBaseline'
import { runPrequential, uniformPolicy, type PrequentialResult } from '../src/ml/benchmark/prequential'
import { pairedSummary, summarize } from '../src/ml/benchmark/statistics'
import { NeuralEnsemble } from '../src/ml/online/neuralStrategies'
import { RbfBT } from '../src/ml/online/rbf'
import type { OnlineLearner } from '../src/ml/online/types'
import { createScenario } from '../src/ml/simulation/suite'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const seeds = Array.from({ length: 26 }, (_, index) => 10_000 + index)
const budgets = [30, 50, 150, 500, 1000]
const factories: { id: string; create(seed: number): OnlineLearner }[] = [
  { id: 'old-production-neutral', create: seed => new FrozenProductionLearner(seed) },
  { id: 'neural-ensemble-3x-small-r2', create: seed => new NeuralEnsemble(seed, [6, 12, 8, 1], 3, 2, .003) },
  { id: 'rbf-benchmark-only', create: seed => new RbfBT(seed, 24, .15, .025) },
]
function run(factory: typeof factories[number]) {
  const started = performance.now()
  const results = seeds.map((seed, index) => {
    if (index % 13 === 0) console.log(`${factory.id}: ${index}/${seeds.length}`)
    return runPrequential({ learner: factory.create(seed + 701), oracle: createScenario(seed), policy: uniformPolicy, budget: 1000, candidateCount: 180, checkpoints: budgets })
  })
  return { id: factory.id, wallTimeMs: performance.now() - started, results }
}
const runs = factories.map(run)
const values = (rows: PrequentialResult[], budget: number, key: 'logLoss' | 'optimumError' | 'p90Displacement') => rows.map(result => result.checkpoints.find(item => item.budget === budget)![key])
const old = runs[0].results
const screen = runs.map(runResult => ({
  id: runResult.id, wallTimeMs: runResult.wallTimeMs,
  checkpoints: Object.fromEntries(budgets.map(budget => [budget, Object.fromEntries((['logLoss', 'optimumError', 'p90Displacement'] as const).map((key, index) => {
    const before = values(old, budget, key), after = values(runResult.results, budget, key)
    return [key, { summary: summarize(after), pairedCandidateMinusOld: pairedSummary(before, after, 1_500_000 + budget * 7 + index) }]
  }))]))
}))
const artifact = {
  artifactVersion: 1, benchmarkVersion: 'prequential-long-term-v2', timestamp: new Date().toISOString(),
  governance: { developmentSeeds: seeds, releaseGateBudgets: [150, 500, 1000], secondaryOnlyBudgets: [30, 50], prospectiveFinalCohort: { first: 150000, count: 208, status: 'reserved-not-opened' }, oldFinalCohortsUsedForSelection: false },
  protocol: { queryPolicy: 'uniform-random identical pair streams', candidatePool: 180, order: ['predict', 'score', 'train'] }, screen,
}
mkdirSync(`${root}/benchmarks/artifacts/development`, { recursive: true })
writeFileSync(`${root}/benchmarks/artifacts/development/long-term-v2.json`, JSON.stringify(artifact, null, 2))
console.log('Long-term development artifact written.')
