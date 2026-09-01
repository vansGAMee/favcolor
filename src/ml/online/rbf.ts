import type { OKLCH } from '../../app/types'
import { oklabDistance } from '../../color/color'
import { generateCandidatePool } from '../activeLearning/candidates'
import { quadraticFeatures } from './features'
import { LinearUtilityLearner } from './linearBase'

export class RbfBT extends LinearUtilityLearner {
  readonly id: string
  readonly modelClass = 'fixed-center-rbf-bradley-terry'
  private centers: OKLCH[]
  constructor(seed = 1, centerCount = 36, private bandwidth = .15, learningRate = .025) {
    super(9 + centerCount, learningRate)
    this.id = `rbf-bt-${centerCount}`
    this.centers = generateCandidatePool(centerCount, seed + 740)
  }
  protected features(color: OKLCH) {
    const denom = 2 * this.bandwidth * this.bandwidth
    return [...quadraticFeatures(color), ...this.centers.map(center => Math.exp(-Math.pow(oklabDistance(color, center), 2) / denom))]
  }
}
