import { describe, expect, it } from 'vitest'
import { isNewChoiceMilestone } from '../components/Discover'

describe('choice milestone celebration', () => {
  it('celebrates only a newly completed hundred', () => {
    expect(isNewChoiceMilestone(99, 100)).toBe(true)
    expect(isNewChoiceMilestone(199, 200)).toBe(true)
    expect(isNewChoiceMilestone(100, 100)).toBe(false)
    expect(isNewChoiceMilestone(0, 200)).toBe(false)
    expect(isNewChoiceMilestone(100, 101)).toBe(false)
  })
})
