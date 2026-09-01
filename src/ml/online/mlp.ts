import type { OKLCH } from '../../app/types'
import { neuralFeatures, stableProbability } from './features'
import type { OnlineLearner, OnlineObservation } from './types'
import { seededRandom } from '../simulation/oracle'

type Forward = { activations: Float64Array[] }
export type ConfigurableMLPState = { layers: number[]; weights: number[][]; biases: number[][] }

export class ConfigurableMLP implements OnlineLearner {
  readonly id: string
  readonly modelClass = 'neural-mlp'
  readonly parameterCount: number
  private weights: Float64Array[] = []
  private biases: Float64Array[] = []
  private m: Float64Array[] = []
  private v: Float64Array[] = []
  private step = 0

  constructor(seed: number, readonly layers: number[], private learningRate = .003, restored?: ConfigurableMLPState) {
    if (layers[0] !== 6 || layers.at(-1) !== 1) throw new Error('MLP must map six features to one utility')
    const rng = seededRandom(seed)
    let count = 0
    for (let l = 0; l < layers.length - 1; l++) {
      const input = layers[l], output = layers[l + 1]
      const w = new Float64Array(input * output)
      const scale = Math.sqrt(6 / (input + output))
      for (let i = 0; i < w.length; i++) w[i] = (rng() * 2 - 1) * scale
      this.weights.push(w); this.biases.push(new Float64Array(output))
      this.m.push(new Float64Array(w.length + output)); this.v.push(new Float64Array(w.length + output))
      count += w.length + output
    }
    if (restored) {
      if (restored.layers.join(',') !== layers.join(',') || restored.weights.length !== this.weights.length) throw new Error('Unsupported compact neural state')
      for (let index = 0; index < this.weights.length; index++) {
        if (restored.weights[index].length !== this.weights[index].length || restored.biases[index].length !== this.biases[index].length) throw new Error('Invalid compact neural state')
        this.weights[index].set(restored.weights[index]); this.biases[index].set(restored.biases[index])
      }
    }
    this.parameterCount = count
    this.id = `mlp-${layers.join('x')}`
  }

  private forward(color: OKLCH): Forward {
    const activations = [Float64Array.from(neuralFeatures(color))]
    for (let l = 0; l < this.weights.length; l++) {
      const previous = activations[l]
      const output = new Float64Array(this.layers[l + 1])
      for (let j = 0; j < output.length; j++) {
        let sum = this.biases[l][j]
        for (let i = 0; i < previous.length; i++) sum += this.weights[l][j * previous.length + i] * previous[i]
        output[j] = l === this.weights.length - 1 ? sum : Math.tanh(sum)
      }
      activations.push(output)
    }
    return { activations }
  }

  utility(color: OKLCH) { return this.forward(color).activations.at(-1)![0] }

  predict(a: OKLCH, b: OKLCH) {
    const probability = stableProbability(this.utility(a) - this.utility(b))
    return { probability, uncertainty: 1 - Math.abs(probability - .5) * 2 }
  }

  private gradients(forward: Forward, outputDerivative: number) {
    const gw = this.weights.map(w => new Float64Array(w.length))
    const gb = this.biases.map(b => new Float64Array(b.length))
    let delta = Float64Array.of(outputDerivative)
    for (let l = this.weights.length - 1; l >= 0; l--) {
      const previous = forward.activations[l]
      const current = forward.activations[l + 1]
      const dz = new Float64Array(delta.length)
      for (let j = 0; j < delta.length; j++) dz[j] = delta[j] * (l === this.weights.length - 1 ? 1 : 1 - current[j] * current[j])
      const next = new Float64Array(previous.length)
      for (let j = 0; j < dz.length; j++) {
        gb[l][j] += dz[j]
        for (let i = 0; i < previous.length; i++) {
          gw[l][j * previous.length + i] += dz[j] * previous[i]
          next[i] += dz[j] * this.weights[l][j * previous.length + i]
        }
      }
      delta = next
    }
    return { gw, gb }
  }

  update(observation: OnlineObservation) {
    const fa = this.forward(observation.a), fb = this.forward(observation.b)
    const ua = fa.activations.at(-1)![0], ub = fb.activations.at(-1)![0]
    const derivative = stableProbability(ua - ub) - observation.chosenA
    const ga = this.gradients(fa, derivative), gb = this.gradients(fb, -derivative)
    this.step++
    for (let l = 0; l < this.weights.length; l++) {
      const size = this.weights[l].length
      for (let k = 0; k < size + this.biases[l].length; k++) {
        const raw = k < size ? ga.gw[l][k] + gb.gw[l][k] : ga.gb[l][k - size] + gb.gb[l][k - size]
        const g = Math.max(-4, Math.min(4, raw))
        this.m[l][k] = .9 * this.m[l][k] + .1 * g
        this.v[l][k] = .999 * this.v[l][k] + .001 * g * g
        const update = this.learningRate * (this.m[l][k] / (1 - Math.pow(.9, this.step))) / (Math.sqrt(this.v[l][k] / (1 - Math.pow(.999, this.step))) + 1e-8)
        if (k < size) this.weights[l][k] -= update
        else this.biases[l][k - size] -= update
      }
    }
  }

  serialize(): ConfigurableMLPState {
    return { layers: [...this.layers], weights: this.weights.map(values => Array.from(values)), biases: this.biases.map(values => Array.from(values)) }
  }
}
