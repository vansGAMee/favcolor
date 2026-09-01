import type { OKLCH, TrainingExample } from '../../app/types'
import { PreferenceEnsemble } from '../ensemble/ensemble'
import type { OnlineLearner, OnlineObservation } from '../online/types'

export class FrozenProductionLearner implements OnlineLearner {
  readonly id = 'frozen-production-ensemble-v1'
  readonly modelClass = 'five-member-mlp-ensemble'
  readonly parameterCount = 5 * 585
  readonly ensemble: PreferenceEnsemble
  readonly updateEpochs: number[] = []
  private observationCount = 0

  constructor(seed = 611) { this.ensemble = new PreferenceEnsemble(seed) }

  utility(color: OKLCH) { return this.ensemble.utility(color) }

  predict(a: OKLCH, b: OKLCH) {
    const probabilities = this.ensemble.probabilities(a, b)
    const probability = probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length
    const variance = probabilities.reduce((sum, value) => sum + Math.pow(value - probability, 2), 0) / probabilities.length
    return { probability, uncertainty: Math.sqrt(variance) }
  }

  update(observation: OnlineObservation) {
    const training: TrainingExample = {
      a: observation.a, b: observation.b, chosenA: observation.chosenA,
      timestamp: observation.timestamp, localHour: observation.localHour,
      weekday: observation.weekday, elapsedDays: observation.elapsedDays,
    }
    const epochs = this.observationCount < 20 ? 7 : 4
    this.ensemble.train([training], epochs)
    this.updateEpochs.push(epochs)
    this.observationCount++
  }
}
