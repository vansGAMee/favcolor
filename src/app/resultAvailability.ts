import type { OKLCH } from './types'

export const RESULT_AVAILABLE_CHOICES = 32

export function resultIsAvailable(choiceCount: number, estimate: OKLCH) {
  return choiceCount >= RESULT_AVAILABLE_CHOICES && [estimate.l, estimate.c, estimate.h].every(Number.isFinite) &&
    estimate.l >= 0 && estimate.l <= 1 && estimate.c >= 0
}
