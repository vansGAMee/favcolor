import type { OKLCH } from '../../app/types'
import { quadraticFeatures } from './features'
import { LinearUtilityLearner } from './linearBase'

export class QuadraticBT extends LinearUtilityLearner {
  readonly id = 'quadratic-bt'
  readonly modelClass = 'quadratic-bradley-terry'
  constructor(_seed = 1, learningRate = .035) { super(9, learningRate) }
  protected features(color: OKLCH) { return quadraticFeatures(color) }
}
