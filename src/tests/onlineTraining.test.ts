import { describe, expect, it } from 'vitest'
import type { TrainingExample } from '../app/types'
import { PreferenceEnsemble } from '../ml/ensemble/ensemble'
import { rollingValidation } from '../ml/validation/validation'

const example = (index: number, pairType: 'normal' | 'repeated-control' = 'normal') => ({
  a: { l: .42 + index % 3 * .08, c: .12, h: index * 37 % 360 },
  b: { l: .7 - index % 2 * .09, c: .16, h: (index * 37 + 140) % 360 },
  chosenA: (index % 2) as 0 | 1,
  timestamp: index,
  localHour: index % 24,
  weekday: index % 7,
  elapsedDays: index / 2,
  pairType,
})

describe('online training evidence', () => {
  it('does not train on a repeated control observation', () => {
    const ensemble = new PreferenceEnsemble(611)
    const before = ensemble.serialize()

    ensemble.train([example(1, 'repeated-control') as TrainingExample])

    expect(ensemble.serialize()).toEqual(before)
  })

  it('does not count repeated controls as rolling predictive validation', () => {
    const data = [
      ...Array.from({ length: 24 }, (_, index) => example(index)),
      ...Array.from({ length: 8 }, (_, index) => example(100 + index, 'repeated-control')),
    ] as TrainingExample[]

    expect(rollingValidation(data)).toBeNull()
  })

  it('advances dropout randomness between incremental training calls', () => {
    const ensemble = new PreferenceEnsemble(611)
    const updatePatterns: string[] = []

    for (let index = 0; index < 16; index++) {
      const before = ensemble.serialize().models.map(model => JSON.stringify(model))
      ensemble.train([example(index) as TrainingExample])
      const after = ensemble.serialize().models.map(model => JSON.stringify(model))
      updatePatterns.push(JSON.stringify(after.map((model, member) => model !== before[member])))
    }

    expect(new Set(updatePatterns).size).toBeGreaterThan(1)
  })
})
