import type { OnlineObservation } from '../online/types'
import { wrapHue } from '../../color/color'

export function cycleConflictRate(observations: readonly OnlineObservation[]) {
  const group = (h: number) => Math.floor(wrapHue(h + 60) / 120) % 3
  const wins = Array.from({ length: 3 }, () => new Float64Array(3))
  for (const item of observations) {
    const a = group(item.a.h), b = group(item.b.h)
    if (a === b) continue
    if (item.chosenA) wins[a][b]++
    else wins[b][a]++
  }
  const directions = [[0, 1], [1, 2], [2, 0]] as const
  const forward = directions.every(([a, b]) => wins[a][b] > wins[b][a])
  const reverse = directions.every(([a, b]) => wins[b][a] > wins[a][b])
  return forward || reverse ? 1 : 0
}
