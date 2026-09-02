import type { ChoiceEvent, OKLCH } from '../../app/types'
import { oklabDistance } from '../../color/color'

const colorKey = (color: OKLCH) => `${color.l.toFixed(6)}:${color.c.toFixed(6)}:${(((color.h % 360) + 360) % 360).toFixed(4)}`
export const controlPairKey = (choice: Pick<ChoiceEvent, 'colorA' | 'colorB'>) => `${colorKey(choice.colorA)}|${colorKey(choice.colorB)}`
const pairDistance = (a: Pick<ChoiceEvent, 'colorA' | 'colorB'>, b: Pick<ChoiceEvent, 'colorA' | 'colorB'>) => Math.min(
  Math.max(oklabDistance(a.colorA, b.colorA), oklabDistance(a.colorB, b.colorB)),
  Math.max(oklabDistance(a.colorA, b.colorB), oklabDistance(a.colorB, b.colorA)),
)

export function selectControlSource(choices: ChoiceEvent[]) {
  const previousControls = choices.filter(choice => choice.pairType === 'repeated-control')
  const used = new Set(previousControls.map(controlPairKey))
  const eligible = choices.slice(0, Math.max(1, choices.length - 8)).filter(choice => choice.pairType !== 'repeated-control' && choice.pairType !== 'local-challenge' && !used.has(controlPairKey(choice)))
  const candidates = eligible.length ? eligible : choices.filter(choice => choice.pairType !== 'repeated-control' && choice.pairType !== 'local-challenge')
  return candidates.reduce((best, candidate) => {
    const diversity = previousControls.length ? Math.min(...previousControls.map(control => pairDistance(candidate, control))) : oklabDistance(candidate.colorA, candidate.colorB)
    const bestDiversity = previousControls.length ? Math.min(...previousControls.map(control => pairDistance(best, control))) : oklabDistance(best.colorA, best.colorB)
    return diversity > bestDiversity ? candidate : best
  }, candidates[0])
}
