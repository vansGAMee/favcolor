import { describe, expect, it } from 'vitest'
import type { TrainingExample } from '../app/types'
import { PreferenceEnsemble } from '../ml/ensemble/ensemble'

const example = (index: number): TrainingExample => ({
  a: { l: .4 + index % 4 * .08, c: .1 + index % 3 * .03, h: index * 43 % 360 },
  b: { l: .76 - index % 3 * .07, c: .12 + index % 2 * .04, h: (index * 43 + 137) % 360 },
  chosenA: index % 3 ? 1 : 0,
  timestamp: index,
  localHour: index % 24,
  weekday: index % 7,
  elapsedDays: index * .5,
  pairType: 'normal',
})

const parameters = (ensemble: PreferenceEnsemble) => ensemble.models.flatMap(model => Array.from(model.parameters()))

describe('learning continuity', () => {
  it('matches uninterrupted learning after checkpoint restore and one more update', () => {
    const uninterrupted = new PreferenceEnsemble(611)
    const reloaded = new PreferenceEnsemble(611)
    for (let index = 0; index < 36; index++) {
      const epochs = index < 20 ? 7 : 4
      uninterrupted.train([example(index)], epochs)
      reloaded.train([example(index)], epochs)
    }

    const restored = new PreferenceEnsemble(611, reloaded.serialize() as never)
    uninterrupted.train([example(36)], 4)
    restored.train([example(36)], 4)

    const expected = parameters(uninterrupted)
    const actual = parameters(restored)
    expect(actual).toHaveLength(expected.length)
    expect(Math.max(...actual.map((value, index) => Math.abs(value - expected[index])))).toBeLessThan(1e-12)
  })
})
