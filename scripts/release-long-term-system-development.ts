import { mkdirSync, writeFileSync } from 'node:fs'
import { FrozenProductionLearner } from '../src/ml/benchmark/frozenBaseline'
import { frozenCurrentPolicy } from '../src/ml/benchmark/policies'
import { runPrequential, uniformPolicy, type PrequentialResult } from '../src/ml/benchmark/prequential'
import { pairedSummary, summarize } from '../src/ml/benchmark/statistics'
import { NeuralEnsemble } from '../src/ml/online/neuralStrategies'
import { createScenario } from '../src/ml/simulation/suite'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const seeds = Array.from({ length: 13 }, (_, index) => 10_000 + index)
const budgets = [30, 50, 150, 500, 1000]
function execute(id: string, neural: boolean) {
  const started = performance.now()
  const results = seeds.map((seed, index) => {
    console.log(`${id}: ${index}/${seeds.length}`)
    return runPrequential({
      learner: neural ? new NeuralEnsemble(seed + 701, [6, 12, 8, 1], 3, 2, .003) : new FrozenProductionLearner(seed + 701),
      oracle: createScenario(seed), policy: neural ? uniformPolicy : frozenCurrentPolicy,
      budget: 1000, candidateCount: 180, checkpoints: budgets,
    })
  })
  return { id, wallTimeMs: performance.now() - started, results }
}
const old = execute('old-production-current-policy', false)
const neural = execute('neural-ensemble-uniform', true)
const values = (rows: PrequentialResult[], budget: number, key: 'logLoss' | 'optimumError' | 'p90Displacement') => rows.map(result => result.checkpoints.find(item => item.budget === budget)![key])
const checkpoints = Object.fromEntries(budgets.map(budget => [budget, Object.fromEntries((['logLoss', 'optimumError', 'p90Displacement'] as const).map((key, index) => {
  const before = values(old.results, budget, key), after = values(neural.results, budget, key)
  return [key, { old: summarize(before), neural: summarize(after), pairedNeuralMinusOld: pairedSummary(before, after, 1_600_000 + budget * 7 + index) }]
}))]))
const artifact = { artifactVersion: 1, benchmarkVersion: 'prequential-long-term-system-v2-screen', timestamp: new Date().toISOString(), seeds, budgets, old: { policy: old.id, wallTimeMs: old.wallTimeMs }, neural: { policy: neural.id, wallTimeMs: neural.wallTimeMs }, checkpoints }
mkdirSync(`${root}/benchmarks/artifacts/development`, { recursive: true })
writeFileSync(`${root}/benchmarks/artifacts/development/long-term-system-v2-screen.json`, JSON.stringify(artifact, null, 2))
console.log('Long-term system development screen written.')
