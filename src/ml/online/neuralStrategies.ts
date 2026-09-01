import type { OKLCH } from '../../app/types'
import { ConfigurableMLP, type ConfigurableMLPState } from './mlp'
import type { OnlineLearner, OnlineObservation } from './types'

export class RepeatedUpdateLearner implements OnlineLearner {
  readonly id: string
  readonly modelClass = 'neural-mlp-repeated-online-update'
  readonly parameterCount: number
  constructor(private learner: OnlineLearner, readonly repetitions: number) {
    this.id = `${learner.id}+repeat-${repetitions}`
    this.parameterCount = learner.parameterCount
  }
  predict(a: OKLCH, b: OKLCH) { return this.learner.predict(a, b) }
  utility(color: OKLCH) { return this.learner.utility(color) }
  update(observation: OnlineObservation) { for (let i = 0; i < this.repetitions; i++) this.learner.update(observation) }
}

export class NeuralEnsemble implements OnlineLearner {
  readonly id: string
  readonly modelClass = 'neural-mlp-ensemble'
  readonly parameterCount: number
  readonly models: ConfigurableMLP[]

  constructor(seed: number, readonly layers: number[], readonly members: number, readonly repetitions: number, readonly learningRate: number, restored?: ConfigurableMLPState[]) {
    this.models = Array.from({ length: members }, (_, index) => new ConfigurableMLP(seed + index * 9973, layers, learningRate, restored?.[index]))
    this.parameterCount = this.models[0].parameterCount * members
    this.id = `neural-ensemble-${members}x-${layers.join('x')}+repeat-${repetitions}`
  }

  utility(color: OKLCH, modelIndex?: number) {
    if (modelIndex !== undefined) return this.models[modelIndex].utility(color)
    return this.models.reduce((sum, learner) => sum + learner.utility(color), 0) / this.models.length
  }

  probabilities(a: OKLCH, b: OKLCH) { return this.models.map(learner => learner.predict(a, b).probability) }

  probability(a: OKLCH, b: OKLCH) {
    const values = this.probabilities(a, b)
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  disagreement(a: OKLCH, b: OKLCH) {
    const values = this.probabilities(a, b), mean = values.reduce((sum, value) => sum + value, 0) / values.length
    return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length
  }

  predict(a: OKLCH, b: OKLCH) {
    const values = this.probabilities(a, b)
    const probability = values.reduce((sum, value) => sum + value, 0) / values.length
    const variance = values.reduce((sum, value) => sum + Math.pow(value - probability, 2), 0) / values.length
    return { probability, uncertainty: Math.sqrt(variance) }
  }

  update(observation: OnlineObservation) {
    for (const learner of this.models) for (let i = 0; i < this.repetitions; i++) learner.update(observation)
  }

  serialize() { return { version: 2 as const, kind: 'compact-neural-ensemble' as const, layers: [...this.layers], members: this.members, repetitions: this.repetitions, learningRate: this.learningRate, models: this.models.map(model => model.serialize()) } }

  static deserialize(value: ReturnType<NeuralEnsemble['serialize']>) {
    if (value.version !== 2 || value.kind !== 'compact-neural-ensemble' || value.models.length !== value.members) throw new Error('Unsupported neural ensemble state')
    return new NeuralEnsemble(611, value.layers, value.members, value.repetitions, value.learningRate, value.models)
  }
}
