import { mkdirSync, writeFileSync } from 'node:fs'
import { policyRegistry } from '../src/ml/benchmark/policies'
import { runPrequential, type PrequentialResult } from '../src/ml/benchmark/prequential'
import { summarize } from '../src/ml/benchmark/statistics'
import { NeuralEnsemble } from '../src/ml/online/neuralStrategies'
import { createScenario } from '../src/ml/simulation/suite'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const seeds = Array.from({ length: 26 }, (_, index) => 10_000 + index)
const budgets = [30, 50, 100, 150]
const metric = (rows: PrequentialResult[], budget: number, key: 'logLoss' | 'optimumError' | 'p90Displacement') => rows.map(result => result.checkpoints.find(item => item.budget === budget)![key])
const screen = policyRegistry.map(policy => {
  const started = performance.now()
  const results = seeds.map((seed, index) => {
    if (index % 13 === 0) console.log(`${policy.id}: ${index}/${seeds.length}`)
    return runPrequential({ learner: new NeuralEnsemble(seed + 701, [6, 12, 8, 1], 3, 2, .003), oracle: createScenario(seed), policy, budget: 150, candidateCount: 180, checkpoints: budgets })
  })
  return {
    policy: policy.id, wallTimeMs: performance.now() - started,
    checkpoints: Object.fromEntries(budgets.map(budget => [budget, {
      logLoss: summarize(metric(results, budget, 'logLoss')),
      optimumError: summarize(metric(results, budget, 'optimumError')),
      p90Displacement: summarize(metric(results, budget, 'p90Displacement')),
    }]))
  }
})
const artifact = { artifactVersion: 1, benchmarkVersion: 'prequential-suite-v1-neural-cycle-2-policy', timestamp: new Date().toISOString(), seeds, model: { layers: [6, 12, 8, 1], members: 3, repetitions: 2, learningRate: .003, parameters: 591 }, screen }
mkdirSync(`${root}/benchmarks/artifacts/development`, { recursive: true })
writeFileSync(`${root}/benchmarks/artifacts/development/neural-cycle-2-policy.json`, JSON.stringify(artifact, null, 2))
console.log('Neural policy development screen written.')
