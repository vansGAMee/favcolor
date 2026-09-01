import type { OKLCH } from '../../app/types'
import { oklabDistance } from '../../color/color'
import { selectActivePair } from '../activeLearning/select'
import type { OnlineLearner, OnlineObservation, QueryPolicy } from '../online/types'
import { FrozenProductionLearner } from './frozenBaseline'
import { uniformPolicy } from './prequential'

function distinct(a: OKLCH, b: OKLCH, pool: readonly OKLCH[]): readonly [OKLCH, OKLCH] {
  if (a !== b) return [a, b]
  return [a, pool[(pool.indexOf(a) + 1) % pool.length]]
}

function sampledPairs(pool: readonly OKLCH[], random: () => number, count = 140) {
  return Array.from({ length: count }, () => distinct(pool[Math.floor(random() * pool.length)], pool[Math.floor(random() * pool.length)], pool))
}

export const frozenCurrentPolicy: QueryPolicy = {
  id: 'frozen-current-heuristic',
  select(learner, history, pool, step, random) {
    if (learner instanceof FrozenProductionLearner) {
      return selectActivePair(learner.ensemble, [...pool], history.flatMap(item => [item.a, item.b]), step * 7919 + 17)
    }
    const seen = history.slice(-60).flatMap(item => [item.a, item.b])
    const nearest = (color: OKLCH) => seen.length ? Math.min(...seen.map(previous => oklabDistance(color, previous))) : .25
    if (seen.length < 32) {
      return sampledPairs(pool, random, 220).reduce((best, pair) => {
        const score = Math.min(1, (nearest(pair[0]) + nearest(pair[1])) / .28) + .6 * Math.exp(-Math.pow((oklabDistance(pair[0], pair[1]) - .28) / .2, 2))
        const old = Math.min(1, (nearest(best[0]) + nearest(best[1])) / .28) + .6 * Math.exp(-Math.pow((oklabDistance(best[0], best[1]) - .28) / .2, 2))
        return score > old ? pair : best
      })
    }
    const ranked = [...pool].sort((a, b) => learner.utility(b) - learner.utility(a)).slice(0, Math.max(36, Math.floor(pool.length * .22)))
    return sampledPairs(ranked, random, 180).reduce((best, pair) => {
      const prediction = learner.predict(pair[0], pair[1])
      const score = (1 - Math.abs(prediction.probability - .5) * 2) + .35 * Math.exp(-Math.pow((oklabDistance(pair[0], pair[1]) - .22) / .18, 2)) + .15 * Math.min(1, Math.min(nearest(pair[0]), nearest(pair[1])) / .16)
      const oldPrediction = learner.predict(best[0], best[1])
      const old = (1 - Math.abs(oldPrediction.probability - .5) * 2) + .35 * Math.exp(-Math.pow((oklabDistance(best[0], best[1]) - .22) / .18, 2)) + .15 * Math.min(1, Math.min(nearest(best[0]), nearest(best[1])) / .16)
      return score > old ? pair : best
    })
  },
}

export const uncertaintyPolicy: QueryPolicy = {
  id: 'uncertainty-focused',
  select(learner, _history, pool, _step, random) {
    return sampledPairs(pool, random).reduce((best, pair) => {
      const score = learner.predict(pair[0], pair[1]).uncertainty + .15 * Math.min(1, oklabDistance(pair[0], pair[1]) / .2)
      const old = learner.predict(best[0], best[1]).uncertainty + .15 * Math.min(1, oklabDistance(best[0], best[1]) / .2)
      return score > old ? pair : best
    })
  },
}

export const diversityPolicy: QueryPolicy = {
  id: 'diversity-exploration',
  select(_learner, history, pool, _step, random) {
    const seen = history.slice(-100).flatMap(item => [item.a, item.b])
    const novelty = (color: OKLCH) => seen.length ? Math.min(...seen.map(previous => oklabDistance(color, previous))) : .3
    return sampledPairs(pool, random).reduce((best, pair) => novelty(pair[0]) + novelty(pair[1]) > novelty(best[0]) + novelty(best[1]) ? pair : best)
  },
}

export const incumbentChallengerPolicy: QueryPolicy = {
  id: 'incumbent-challenger',
  select(learner, _history, pool) {
    const ranked = [...pool].sort((a, b) => learner.utility(b) - learner.utility(a))
    const incumbent = ranked[0]
    const challengers = ranked.slice(1, Math.max(12, Math.ceil(ranked.length * .3)))
    const challenger = challengers.reduce((best, color) => {
      const score = learner.predict(incumbent, color).uncertainty + .2 * Math.min(1, oklabDistance(incumbent, color) / .2)
      const old = learner.predict(incumbent, best).uncertainty + .2 * Math.min(1, oklabDistance(incumbent, best) / .2)
      return score > old ? color : best
    })
    return [incumbent, challenger]
  },
}

export const thompsonLikePolicy: QueryPolicy = {
  id: 'thompson-like',
  select(learner, _history, pool, step, random) {
    const scale = .35 / Math.sqrt(1 + step / 25)
    const ranked = pool.map(color => ({ color, draw: learner.utility(color) + scale * (random() * 2 - 1) })).sort((a, b) => b.draw - a.draw)
    return distinct(ranked[0].color, ranked[1].color, pool)
  },
}

export const policyRegistry: QueryPolicy[] = [uniformPolicy, frozenCurrentPolicy, uncertaintyPolicy, diversityPolicy, incumbentChallengerPolicy, thompsonLikePolicy]
