import { describe, expect, it } from 'vitest'
import type { OKLCH } from '../app/types'
import { gamutMap, oklabDistance } from '../color/color'
import { generateCandidatePool } from '../ml/activeLearning/candidates'

const representativeTargets: OKLCH[] = [
  { l: .6, c: .27, h: 25 },
  { l: .72, c: .22, h: 55 },
  { l: .84, c: .18, h: 100 },
  { l: .67, c: .23, h: 145 },
  { l: .72, c: .2, h: 195 },
  { l: .38, c: .16, h: 255 },
  { l: .58, c: .24, h: 305 },
  { l: .82, c: .12, h: 350 },
  { l: .42, c: .12, h: 190 },
  { l: .82, c: .13, h: 145 },
  { l: .48, c: .08, h: 75 },
  { l: .74, c: .08, h: 275 },
].map(gamutMap)

describe('candidate gamut coverage', () => {
  it('places a useful chromatic candidate near representative displayable targets', () => {
    const pool = generateCandidatePool(620, 20260901)
    const errors = representativeTargets.map(target => Math.min(
      ...pool.filter(candidate => candidate.c >= .035).map(candidate => oklabDistance(candidate, target)),
    ))

    expect(Math.max(...errors)).toBeLessThan(.075)
  })
})
