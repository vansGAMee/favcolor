import { describe, expect, it } from 'vitest'
import type { ChoiceEvent, OKLCH } from '../app/types'
import type { PreferenceEnsemble } from '../ml/ensemble/ensemble'
import { isUsefulRenderedPair } from '../color/displayPair'
import { searchOptimum } from '../ml/preference/search'

const color = (l: number): OKLCH => ({ l, c: 0.08, h: 18 })

function choice(chosenL: number, otherL: number): ChoiceEvent {
  return {
    id: crypto.randomUUID(),
    colorA: color(chosenL),
    colorB: color(otherL),
    chosen: 'a',
    timestamp: Date.now(),
    localHour: 12,
    weekday: 1,
    elapsedSinceStartMs: 1_000,
    reactionTimeMs: 500,
    leftColor: 'a',
    modelVersion: 2,
    pairType: 'normal',
    distance: Math.abs(chosenL - otherL),
  }
}

function boundaryChoice(pair: readonly [OKLCH, OKLCH], chosen: 'a' | 'b'): ChoiceEvent {
  return { ...choice(pair[0].l, pair[1].l), colorA: pair[0], colorB: pair[1], chosen, pairType: 'boundary-validation' }
}

function lowerIsAlwaysBetter() {
  return {
    models: Array.from({ length: 5 }, () => ({})),
    utility: (candidate: OKLCH) => -candidate.l,
  } as unknown as PreferenceEnsemble
}

describe('evidence-supported optimum search', () => {
  it('asks for direct evidence instead of finalizing an unsupported near-black optimum', () => {
    const choices = Array.from({ length: 32 }, (_, index) => index % 2
      ? choice(0.131, 0.56)
      : choice(0.31, 0.48))
    const result = searchOptimum(lowerIsAlwaysBetter(), 500, 63, { choices })

    expect(result.l).toBeGreaterThanOrEqual(0.13)
    expect(result.boundaryValidation?.dimension).toBe('lightness')
    expect(result.boundaryValidation?.direction).toBe('lower')
    expect(isUsefulRenderedPair(result.boundaryValidation!.pair)).toBe(true)
  })

  it('keeps the result inside evidence after the user rejects the darker probe', () => {
    const choices = Array.from({ length: 32 }, () => choice(0.131, 0.56))
    const first = searchOptimum(lowerIsAlwaysBetter(), 500, 63, { choices })
    const rejected = [...choices, boundaryChoice(first.boundaryValidation!.pair, 'a')]
    const result = searchOptimum(lowerIsAlwaysBetter(), 500, 64, { choices: rejected })

    expect(result.l).toBeGreaterThanOrEqual(0.13)
    expect(result.boundaryValidation).toBeNull()
  })

  it('does not treat a collapsed black-vs-black pair as boundary evidence', () => {
    const choices = Array.from({ length: 32 }, () => choice(0.131, 0.56))
    const collapsed = {
      ...choice(0, 0),
      colorA: { l: 0, c: 0.01, h: 12 },
      colorB: { l: 0, c: 0, h: 0 },
      pairType: 'local-challenge' as const,
    }
    const result = searchOptimum(lowerIsAlwaysBetter(), 500, 64, { choices: [...choices, collapsed] })

    expect(result.l).toBeGreaterThanOrEqual(0.13)
    expect(result.boundaryValidation?.direction).toBe('lower')
  })

  it('still reaches genuine black after direct darker confirmations', () => {
    let choices = Array.from({ length: 32 }, () => choice(0.131, 0.56))
    const first = searchOptimum(lowerIsAlwaysBetter(), 500, 63, { choices })
    choices = [...choices, boundaryChoice(first.boundaryValidation!.pair, 'b')]
    const second = searchOptimum(lowerIsAlwaysBetter(), 500, 64, { choices })
    choices = [...choices, boundaryChoice(second.boundaryValidation!.pair, 'b')]
    const result = searchOptimum(lowerIsAlwaysBetter(), 500, 65, { choices })

    expect(result.l).toBeLessThan(0.01)
    expect(result.boundaryValidation).toBeNull()
  })

  it('does not add a probe when the optimum is already supported', () => {
    const centered = {
      models: Array.from({ length: 5 }, () => ({})),
      utility: (candidate: OKLCH) => -Math.abs(candidate.l - 0.3),
    } as unknown as PreferenceEnsemble
    const choices = Array.from({ length: 32 }, (_, index) => index % 2
      ? choice(0.131, 0.56)
      : choice(0.31, 0.48))
    const result = searchOptimum(centered, 500, 63, { choices })

    expect(result.l).toBeGreaterThan(0.28)
    expect(result.l).toBeLessThan(0.32)
    expect(result.boundaryValidation).toBeNull()
  })
})
