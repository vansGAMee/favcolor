import { describe, expect, it } from 'vitest'
import { generateCandidatePool } from '../ml/activeLearning/candidates'
import { selectActivePair } from '../ml/activeLearning/select'
import { PreferenceEnsemble } from '../ml/ensemble/ensemble'
import { searchOptimum } from '../ml/preference/search'
import { makeOracle, seededRandom, simulateDataset } from '../ml/simulation/oracle'

describe('preference learning', () => {
  it('reduces future loss and recovers an independent synthetic optimum across seeds', () => {
    for (const seed of [4, 19, 71]) {
      const oracle = makeOracle({ l: 0.64, c: 0.18, h: 285 }, 0)
      const data = simulateDataset(oracle, 180, seed)
      const ensemble = new PreferenceEnsemble(seed)
      const before = ensemble.logLoss(data.slice(130))
      ensemble.train(data.slice(0, 130), 28)
      const after = ensemble.logLoss(data.slice(130))
      const optimum = searchOptimum(ensemble, 900, seed)
      expect(after).toBeLessThan(Math.min(before, Math.log(2)))
      expect(optimum.distanceTo({ l: 0.64, c: 0.18, h: 285 })).toBeLessThan(0.24)
    }
  }, 30000)

  it('active selection has aggregate benefit over random under equal budgets', () => {
    let activeError = 0
    let randomError = 0
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
      activeError += searchOptimum(active, 600, seed).distanceTo(oracle.optimum)
      randomError += searchOptimum(random, 600, seed).distanceTo(oracle.optimum)
    }
    expect(activeError).toBeLessThan(randomError)
  }, 30000)
})
