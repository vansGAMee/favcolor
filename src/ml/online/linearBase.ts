import type { OKLCH } from '../../app/types'
import type { OnlineLearner, OnlineObservation } from './types'
import { stableProbability } from './features'

export abstract class LinearUtilityLearner implements OnlineLearner {
  abstract readonly id: string
  abstract readonly modelClass: string
  protected weights: Float64Array
  private m: Float64Array
  private v: Float64Array
  private step = 0

  constructor(readonly parameterCount: number, protected learningRate: number) {
    this.weights = new Float64Array(parameterCount)
    this.m = new Float64Array(parameterCount)
    this.v = new Float64Array(parameterCount)
  }

  protected abstract features(color: OKLCH): number[]

  utility(color: OKLCH) {
    const x = this.features(color)
    let value = 0
    for (let i = 0; i < this.weights.length; i++) value += this.weights[i] * x[i]
    return value
  }

  predict(a: OKLCH, b: OKLCH) {
    const probability = stableProbability(this.utility(a) - this.utility(b))
    return { probability, uncertainty: 1 - Math.abs(probability - .5) * 2 }
  }

  update(observation: OnlineObservation) {
    const a = this.features(observation.a)
    const b = this.features(observation.b)
    const p = this.predict(observation.a, observation.b).probability
    const error = p - observation.chosenA
    this.step++
    for (let i = 0; i < this.weights.length; i++) {
      const gradient = Math.max(-4, Math.min(4, error * (a[i] - b[i]) + 0.0005 * this.weights[i]))
      this.m[i] = .9 * this.m[i] + .1 * gradient
      this.v[i] = .999 * this.v[i] + .001 * gradient * gradient
      const mh = this.m[i] / (1 - Math.pow(.9, this.step))
      const vh = this.v[i] / (1 - Math.pow(.999, this.step))
      this.weights[i] -= this.learningRate * mh / (Math.sqrt(vh) + 1e-8)
    }
  }
}
