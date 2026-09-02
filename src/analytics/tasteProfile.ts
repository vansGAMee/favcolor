import type { ChoiceEvent, OKLCH } from '../app/types'
import { wrapHue } from '../color/color'

export type TasteAxisKey = 'lightness' | 'chroma' | 'warmth'

export interface TasteAxis {
  score: number | null
  sampleCount: number
  trend: Array<{ at: number; score: number }>
}

export interface TasteProfile {
  axes: Record<TasteAxisKey, TasteAxis>
  stability: { shift: number | null }
}

const valueFor = (axis: TasteAxisKey, color: OKLCH) => {
  if (axis === 'lightness') return color.l
  if (axis === 'chroma') return color.c
  return color.c * Math.cos((wrapHue(color.h) - 50) * Math.PI / 180)
}

const thresholds: Record<TasteAxisKey, number> = { lightness: .06, chroma: .025, warmth: .04 }
const keys: TasteAxisKey[] = ['lightness', 'chroma', 'warmth']
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

export function buildTasteProfile(choices: ChoiceEvent[]): TasteProfile {
  const signals: Record<TasteAxisKey, Array<{ at: number; value: number }>> = { lightness: [], chroma: [], warmth: [] }

  choices.forEach((choice, at) => {
    const contrasts = keys.map(axis => ({
      axis,
      strength: Math.abs(valueFor(axis, choice.colorA) - valueFor(axis, choice.colorB)) / thresholds[axis],
    })).sort((a, b) => b.strength - a.strength)
    const strongest = contrasts[0]
    if (strongest.strength < 1) return
    const chosen = choice.chosen === 'a' ? choice.colorA : choice.colorB
    const rejected = choice.chosen === 'a' ? choice.colorB : choice.colorA
    signals[strongest.axis].push({ at, value: valueFor(strongest.axis, chosen) >= valueFor(strongest.axis, rejected) ? 1 : -1 })
  })

  const axes = Object.fromEntries(keys.map(axis => {
    const values = signals[axis]
    const trend = values.map((entry, index) => ({ at: entry.at, score: mean(values.slice(Math.max(0, index - 11), index + 1).map(item => item.value)) }))
    return [axis, { score: trend.at(-1)?.score ?? null, sampleCount: values.length, trend }]
  })) as Record<TasteAxisKey, TasteAxis>

  const shifts = keys.flatMap(axis => {
    const values = signals[axis]
    if (values.length < 8) return []
    const middle = Math.floor(values.length / 2)
    return [Math.abs(mean(values.slice(0, middle).map(item => item.value)) - mean(values.slice(middle).map(item => item.value))) * 50]
  })

  return { axes, stability: { shift: shifts.length ? Math.round(mean(shifts)) : null } }
}
