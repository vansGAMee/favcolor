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
  const contenders = ranked.slice(0, Math.max(36, Math.floor(pool.length * 0.22)))
  bestScore = -Infinity
  for (let i = 0; i < 180; i++) {
    const a = contenders[Math.floor(rng() * Math.min(18, contenders.length))]
    const b = contenders[Math.floor(rng() * contenders.length)]
    const distance = oklabDistance(a, b)
    if (distance < 0.045) continue
    const probability = ensemble.probability(a, b)
    const ambiguity = 1 - Math.abs(probability - 0.5) * 2
    const disagreement = ensemble.disagreement(a, b)
    const distanceUtility = Math.exp(-Math.pow((distance - 0.22) / 0.18, 2))
    const nearest = Math.min(nearestSeen(a), nearestSeen(b))
    const novelty = Math.min(1, nearest / 0.16)
    const score = 0.4 * ambiguity + 2.4 * disagreement + 0.25 * distanceUtility + 0.12 * novelty
    if (score > bestScore) { best = [a, b]; bestScore = score }
  }
  return best
}
