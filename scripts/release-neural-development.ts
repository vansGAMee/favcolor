import { mkdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { FrozenProductionLearner } from '../src/ml/benchmark/frozenBaseline'
import { runPrequential, uniformPolicy, type PrequentialResult } from '../src/ml/benchmark/prequential'
import { pairedSummary, summarize } from '../src/ml/benchmark/statistics'
import { ConfigurableMLP } from '../src/ml/online/mlp'
import { NeuralEnsemble, RepeatedUpdateLearner } from '../src/ml/online/neuralStrategies'
import type { OnlineLearner } from '../src/ml/online/types'
import { createScenario } from '../src/ml/simulation/suite'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const seeds = Array.from({ length: 39 }, (_, index) => 10_000 + index)
const budgets = [30, 50, 100, 150]
type Factory = { id: string; parameters: number; config: object; create(seed: number): OnlineLearner }
const repeated = (id: string, layers: number[], repetitions: number, learningRate: number): Factory => ({
  id, parameters: new ConfigurableMLP(1, layers, learningRate).parameterCount,
  config: { layers, repetitions, learningRate, members: 1 },
  create: seed => new RepeatedUpdateLearner(new ConfigurableMLP(seed, layers, learningRate), repetitions),
})
const ensemble = (id: string, layers: number[], members: number, repetitions: number, learningRate: number): Factory => ({
  id, parameters: new ConfigurableMLP(1, layers, learningRate).parameterCount * members,
  config: { layers, repetitions, learningRate, members },
  create: seed => new NeuralEnsemble(seed, layers, members, repetitions, learningRate),
})
const factories: Factory[] = [
  { id: 'old-production-neutral', parameters: 2925, config: { frozen: true }, create: seed => new FrozenProductionLearner(seed) },
  repeated('small-r2-lr003', [6, 12, 8, 1], 2, .003),
  repeated('small-r4-lr003', [6, 12, 8, 1], 4, .003),
  repeated('small-r7-lr0015', [6, 12, 8, 1], 7, .0015),
  ensemble('small-e3-r2-lr003', [6, 12, 8, 1], 3, 2, .003),
  ensemble('small-e5-r1-lr003', [6, 12, 8, 1], 5, 1, .003),
  repeated('medium-r2-lr003', [6, 16, 12, 1], 2, .003),
  ensemble('medium-e3-r1-lr003', [6, 16, 12, 1], 3, 1, .003),
  repeated('current-shape-r2-lr003', [6, 24, 16, 1], 2, .003),
  repeated('current-shape-r4-lr0015', [6, 24, 16, 1], 4, .0015),
]

function run(factory: Factory) {
  const started = performance.now()
  const results = seeds.map((seed, index) => {
    if (index % 13 === 0) console.log(`${factory.id}: ${index}/${seeds.length}`)
    return runPrequential({ learner: factory.create(seed + 701), oracle: createScenario(seed), policy: uniformPolicy, budget: 150, candidateCount: 180, checkpoints: budgets })
  })
  return { factory, wallTimeMs: performance.now() - started, results }
}
const runs = factories.map(run)
const baseline = runs[0].results
const metric = (rows: PrequentialResult[], budget: number, key: 'logLoss' | 'optimumError' | 'p90Displacement') => rows.map(result => result.checkpoints.find(item => item.budget === budget)![key])
const screened = runs.map(runResult => ({
  id: runResult.factory.id, parameters: runResult.factory.parameters, config: runResult.factory.config, wallTimeMs: runResult.wallTimeMs,
  checkpoints: Object.fromEntries(budgets.map(budget => [budget, {
    logLoss: summarize(metric(runResult.results, budget, 'logLoss')),
    optimumError: summarize(metric(runResult.results, budget, 'optimumError')),
    p90Displacement: summarize(metric(runResult.results, budget, 'p90Displacement')),
    pairedLogLossVsOld: pairedSummary(metric(baseline, budget, 'logLoss'), metric(runResult.results, budget, 'logLoss'), 810_000 + budget),
    pairedOptimumVsOld: pairedSummary(metric(baseline, budget, 'optimumError'), metric(runResult.results, budget, 'optimumError'), 820_000 + budget),
  }]))
}))
const artifact = {
  artifactVersion: 1, benchmarkVersion: 'prequential-suite-v1-neural-cycle-2', timestamp: new Date().toISOString(),
  gitCommit: execSync('git rev-parse HEAD', { cwd: root }).toString().trim(),
  governance: { seeds, oldFinalCohortUsedForSelection: false, prospectiveNextFinalCohort: { first: 120000, count: 208, status: 'reserved-not-opened' } },
  screen: screened,
}
mkdirSync(`${root}/benchmarks/artifacts/development`, { recursive: true })
writeFileSync(`${root}/benchmarks/artifacts/development/neural-cycle-2.json`, JSON.stringify(artifact, null, 2))
console.log('Neural development cycle 2 written.')
