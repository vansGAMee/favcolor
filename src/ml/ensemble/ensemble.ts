import type { OKLCH, TrainingExample } from '../../app/types'
import { colorFeatures } from '../../color/color'
import { MLP, deserializeNetwork, serializeNetwork } from '../core/network'
import { Adam } from '../optimizer/adam'
import { pairProbability, trainPair } from '../preference/pairwise'
import { seededRandom } from '../simulation/oracle'

export class PreferenceEnsemble {
  readonly models: MLP[]
  private optimizers: Adam[]
  private seed: number
  private trainingCalls = 0

  constructor(seed = 1, serialized?: ReturnType<typeof serializeNetwork>[]) {
    this.seed = seed
    this.models = serialized?.map(deserializeNetwork) ?? Array.from({ length: 5 }, (_, i) => new MLP(seed + i * 9973))
    this.optimizers = this.models.map(model => new Adam(model.parameters().length, 0.0025))
  }

  utility(color: OKLCH, modelIndex?: number) {
    const features = colorFeatures(color)
    if (modelIndex !== undefined) return this.models[modelIndex].predict(features)
    return this.models.reduce((sum, model) => sum + model.predict(features), 0) / this.models.length
  }

  probabilities(a: OKLCH, b: OKLCH) {
    const af = colorFeatures(a)
    const bf = colorFeatures(b)
    return this.models.map(model => pairProbability(model.predict(af), model.predict(bf)))
  }

  probability(a: OKLCH, b: OKLCH) {
    const ps = this.probabilities(a, b)
    return ps.reduce((sum, p) => sum + p, 0) / ps.length
  }

  disagreement(a: OKLCH, b: OKLCH) {
    const ps = this.probabilities(a, b)
    const mean = ps.reduce((sum, p) => sum + p, 0) / ps.length
    return ps.reduce((sum, p) => sum + (p - mean) ** 2, 0) / ps.length
  }

  train(examples: TrainingExample[], epochs = 1) {
    const independent = examples.filter(example => example.pairType !== 'repeated-control')
    if (!independent.length) return
    const call = this.trainingCalls++
    for (let m = 0; m < this.models.length; m++) {
      const rng = seededRandom(this.seed + m * 101 + independent.length * 17 + call * 104729)
      for (let epoch = 0; epoch < epochs; epoch++) {
        for (let j = 0; j < independent.length; j++) {
          const sample = independent[Math.floor(rng() * independent.length)]
          if (rng() < 0.14) continue
          trainPair(this.models[m], this.optimizers[m], colorFeatures(sample.a), colorFeatures(sample.b), sample.chosenA)
        }
      }
    }
  }

  logLoss(examples: TrainingExample[]) {
    if (!examples.length) return Number.NaN
    return examples.reduce((sum, example) => {
      const p = Math.max(1e-8, Math.min(1 - 1e-8, this.probability(example.a, example.b)))
      return sum - example.chosenA * Math.log(p) - (1 - example.chosenA) * Math.log(1 - p)
    }, 0) / examples.length
  }

  serialize() { return this.models.map(serializeNetwork) }
}
