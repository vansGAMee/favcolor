import { describe, expect, it } from 'vitest'
import type { ChoiceEvent, OKLCH } from '../app/types'
import { buildTasteProfile } from '../analytics/tasteProfile'

const choice = (index: number, colorA: OKLCH, colorB: OKLCH, chosen: 'a' | 'b'): ChoiceEvent => ({
  id: String(index), colorA, colorB, chosen,
  timestamp: index, localHour: 12, weekday: 1, elapsedSinceStartMs: index,
  reactionTimeMs: 500, leftColor: 'a', modelVersion: 2, pairType: 'normal',
  distance: 0.2,
})

describe('taste profile analytics', () => {
  it('reports chosen poles from clear observed contrasts and ignores indistinguishable pairs', () => {
    const profile = buildTasteProfile([
      choice(1, { l: .76, c: .12, h: 50 }, { l: .54, c: .12, h: 50 }, 'a'),
      choice(2, { l: .64, c: .05, h: 50 }, { l: .64, c: .20, h: 50 }, 'b'),
      choice(3, { l: .64, c: .16, h: 50 }, { l: .64, c: .16, h: 230 }, 'a'),
      choice(4, { l: .60, c: .10, h: 80 }, { l: .61, c: .11, h: 82 }, 'a'),
    ])

    expect(profile.axes.lightness).toMatchObject({ score: 1, sampleCount: 1 })
    expect(profile.axes.chroma).toMatchObject({ score: 1, sampleCount: 1 })
    expect(profile.axes.warmth).toMatchObject({ score: 1, sampleCount: 1 })
  })

  it('shows a large profile shift when recent saturation choices reverse', () => {
    const muted = { l: .62, c: .04, h: 290 }
    const vivid = { l: .62, c: .21, h: 290 }
    const choices = Array.from({ length: 24 }, (_, index) => choice(index, vivid, muted, index < 12 ? 'a' : 'b'))
    const profile = buildTasteProfile(choices)

    expect(profile.axes.chroma.score).toBe(-1)
    expect(profile.axes.chroma.trend[0].score).toBe(1)
    expect(profile.axes.chroma.trend.at(-1)?.score).toBe(-1)
    expect(profile.stability.shift).toBe(100)
  })
})
