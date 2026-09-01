import { generateCandidatePool } from '../src/ml/activeLearning/candidates'
import { selectActivePair } from '../src/ml/activeLearning/select'
import { PreferenceEnsemble } from '../src/ml/ensemble/ensemble'
import { searchOptimum } from '../src/ml/preference/search'
import { makeOracle, seededRandom, simulateDataset } from '../src/ml/simulation/oracle'

const recovery = []
for (const seed of [4, 19, 71]) {
  const oracle = makeOracle({ l: 0.64, c: 0.18, h: 285 }, 0)
  const data = simulateDataset(oracle, 180, seed)
  const ensemble = new PreferenceEnsemble(seed)
  const before = ensemble.logLoss(data.slice(130))
  ensemble.train(data.slice(0, 130), 28)
  const after = ensemble.logLoss(data.slice(130))
  recovery.push({ seed, untrainedFutureLogLoss: before, trainedFutureLogLoss: after, randomLogLoss: Math.log(2), optimumErrorOKLab: searchOptimum(ensemble, 900, seed).distanceTo(oracle.optimum) })
}

const activeVsRandom = []
for (const seed of [2, 8, 21]) {
  const oracle = makeOracle({ l: 0.7, c: 0.16, h: 40 }, 0)
  const pool = generateCandidatePool(260, seed)
  const active = new PreferenceEnsemble(seed)
  const random = new PreferenceEnsemble(seed)
  const rng = seededRandom(seed + 99)
  const seen = [] as typeof pool
  for (let i = 0; i < 48; i++) {
    const activePair = selectActivePair(active, pool, seen, seed * 100 + i)
    const randomPair = [pool[Math.floor(rng() * pool.length)], pool[Math.floor(rng() * pool.length)]] as const
    active.train([oracle.choose(activePair[0], activePair[1], rng, i)], 3)
    random.train([oracle.choose(randomPair[0], randomPair[1], rng, i)], 3)
    seen.push(activePair[0], activePair[1])
  }
  activeVsRandom.push({ seed, activeOptimumErrorOKLab: searchOptimum(active, 600, seed).distanceTo(oracle.optimum), randomOptimumErrorOKLab: searchOptimum(random, 600, seed).distanceTo(oracle.optimum) })
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
console.log(JSON.stringify({
  recovery,
  recoveryMean: { futureLogLoss: mean(recovery.map(x => x.trainedFutureLogLoss)), randomLogLoss: Math.log(2), optimumErrorOKLab: mean(recovery.map(x => x.optimumErrorOKLab)) },
  activeVsRandom,
  activeVsRandomMean: { activeOptimumErrorOKLab: mean(activeVsRandom.map(x => x.activeOptimumErrorOKLab)), randomOptimumErrorOKLab: mean(activeVsRandom.map(x => x.randomOptimumErrorOKLab)) },
}, null, 2))
