export interface FactorGate {
  minimumMeanGain: number
  requiredPositiveFolds: number
  calibrationSeeds: number[]
  targetNullFalsePositiveRate: number
}

// Values are replaced only by the documented calibration protocol, never by a single capability fixture.
export const LOCKED_FACTOR_GATES: Record<'context' | 'drift', FactorGate> = {
  context: { minimumMeanGain: 0.025426739661343418, requiredPositiveFolds: 2, calibrationSeeds: Array.from({ length: 32 }, (_, i) => 301 + i), targetNullFalsePositiveRate: 0.05 },
  drift: { minimumMeanGain: 0.02993949922913645, requiredPositiveFolds: 2, calibrationSeeds: Array.from({ length: 32 }, (_, i) => 401 + i), targetNullFalsePositiveRate: 0.05 },
}
