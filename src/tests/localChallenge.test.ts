import { describe, expect, it } from 'vitest'
import { colorToHex } from '../color/color'
import { isUsefulRenderedPair } from '../color/displayPair'
import { localChallenge } from '../ml/activeLearning/localChallenge'

describe('local challenges at gamut boundaries', () => {
  it('challenges the captured black optimum with a distinguishable alternative', () => {
    // Packet 70dccf97-b9f3-49df-a440-ac6ea134af1d, observation 63.
    // Even scheduling selects a negative L step, which previously clipped to L=0.
    const optimum = { l: 0, c: .004400245150856298, h: 12.428783057956025 }
    const pair = localChallenge(optimum, 64)
    expect(colorToHex(pair[0])).toBe('#000000')
    expect(isUsefulRenderedPair(pair)).toBe(true)
    expect(pair[1].l).toBeGreaterThan(pair[0].l)
  })

  it('also turns inward at the upper boundary and preserves ordinary steps', () => {
    expect(isUsefulRenderedPair(localChallenge({ l: 1, c: 0, h: 40 }, 51))).toBe(true)
    const pair = localChallenge({ l: .13099011552884407, c: .053696366414271515, h: 28.917683066334575 }, 51)
    expect(pair[1].l).toBeCloseTo(.17599011552884408, 12)
  })
})
