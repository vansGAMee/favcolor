import type { OKLCH } from '../../app/types'
import { gamutMap } from '../../color/color'
import { isUsefulRenderedPair } from '../../color/displayPair'

export function localChallenge(optimum: OKLCH, choiceCount: number): readonly [OKLCH, OKLCH] {
  const step = choiceCount % 2 ? .045 : -.045
  const challenger = (direction: number) => gamutMap({ l: optimum.l + direction, c: optimum.c + .025, h: optimum.h + 18 })
  const pair = [optimum, challenger(step)] as const
  // An outward step can collapse onto the incumbent after gamut mapping.
  // Turn inward; the caller's bounded rendered-pair guard remains the fallback.
  return isUsefulRenderedPair(pair) ? pair : [optimum, challenger(-step)]
}
