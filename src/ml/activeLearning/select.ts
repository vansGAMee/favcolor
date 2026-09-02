import type { OKLCH } from '../../app/types'
import { oklabDistance } from '../../color/color'
import type { PreferenceEnsemble } from '../ensemble/ensemble'
import { seededRandom } from '../simulation/oracle'

export function selectActivePair(ensemble: PreferenceEnsemble, pool: OKLCH[], seen: OKLCH[], seed: number): readonly [OKLCH, OKLCH] {
  const rng = seededRandom(seed)
  let best: readonly [OKLCH, OKLCH] = [pool[0], pool[1]]
  let bestScore = -Infinity
  const nearestSeen = (color: OKLCH) => seen.length
    ? Math.min(...seen.slice(-120).map(previous => oklabDistance(previous, color)))
    : 0.25
  const recentPairs: Array<readonly [OKLCH, OKLCH]> = []
  for (let i = Math.max(0, seen.length - 80); i + 1 < seen.length; i += 2) recentPairs.push([seen[i], seen[i + 1]])
  const pairNovelty = (a: OKLCH, b: OKLCH) => {
    if (!recentPairs.length) return 1
    const nearest = Math.min(...recentPairs.map(pair => Math.min(
      Math.max(oklabDistance(a, pair[0]), oklabDistance(b, pair[1])),
      Math.max(oklabDistance(a, pair[1]), oklabDistance(b, pair[0])),
    )))
    return Math.min(1, nearest / .13)
  }

  // Engineering exploration phase: cover the display gamut before model ranks are trusted.
  if (seen.length < 32) {
    for (let i = 0; i < 220; i++) {
      const a = pool[Math.floor(rng() * pool.length)]
      const b = pool[Math.floor(rng() * pool.length)]
      const distance = oklabDistance(a, b)
      if (distance < 0.09) continue
      const coverage = Math.min(1, (nearestSeen(a) + nearestSeen(b)) / 0.28)
      const boundedDistance = Math.exp(-Math.pow((distance - 0.28) / 0.2, 2))
      const score = 0.62 * coverage + 0.38 * boundedDistance
      if (score > bestScore) { best = [a, b]; bestScore = score }
    }
    return best
  }

  const ranked = [...pool].sort((a, b) => ensemble.utility(b) - ensemble.utility(a))
  const queryCount = Math.floor(seen.length / 2)
  if (queryCount % 5 === 0) {
    const incumbents = ranked.slice(0, 12)
    for (let i = 0; i < 240; i++) {
      const a = incumbents[Math.floor(rng() * incumbents.length)]
      const b = pool[Math.floor(rng() * pool.length)]
      const distance = oklabDistance(a, b)
      if (distance < .09) continue
      const ambiguity = 1 - Math.abs(ensemble.probability(a, b) - .5) * 2
      const novelty = Math.min(1, nearestSeen(b) / .16)
      const distanceUtility = Math.exp(-Math.pow((distance - .3) / .23, 2))
      const score = .46 * novelty + .24 * pairNovelty(a, b) + .2 * distanceUtility + .1 * ambiguity
      if (score > bestScore) { best = [a, b]; bestScore = score }
    }
    return best
  }
  const contenders = ranked.slice(0, Math.max(42, Math.floor(pool.length * 0.3)))
  bestScore = -Infinity
  for (let i = 0; i < 220; i++) {
    const a = contenders[Math.floor(rng() * Math.min(20, contenders.length))]
    const b = contenders[Math.floor(rng() * contenders.length)]
    const distance = oklabDistance(a, b)
    if (distance < 0.045) continue
    const probability = ensemble.probability(a, b)
    const ambiguity = 1 - Math.abs(probability - 0.5) * 2
    const disagreement = ensemble.disagreement(a, b)
    const distanceUtility = Math.exp(-Math.pow((distance - 0.22) / 0.18, 2))
    const nearest = (nearestSeen(a) + nearestSeen(b)) / 2
    const novelty = Math.min(1, nearest / 0.16)
    const score = 0.35 * ambiguity + 2.2 * disagreement + 0.2 * distanceUtility + 0.15 * novelty + 0.2 * pairNovelty(a, b)
    if (score > bestScore) { best = [a, b]; bestScore = score }
  }
  return best
}
