import type { OKLCH } from '../../app/types'
import { seededRandom } from '../simulation/oracle'
import type { OnlineLearner, OnlineObservation } from './types'

export type ReplayConfig = { kind: 'newest' | 'uniform' | 'mixed' | 'reservoir'; replayCount: number; capacity: number; seed: number }

export class ReplayController implements OnlineLearner {
  readonly id: string
  readonly modelClass: string
  readonly parameterCount: number
  private history: OnlineObservation[] = []
  private seen = 0
  private random: () => number

  constructor(private learner: OnlineLearner, readonly config: ReplayConfig) {
    this.id = `${learner.id}+${config.kind}-${config.replayCount}`
    this.modelClass = learner.modelClass
    this.parameterCount = learner.parameterCount
    this.random = seededRandom(config.seed)
  }
  predict(a: OKLCH, b: OKLCH) { return this.learner.predict(a, b) }
  utility(color: OKLCH) { return this.learner.utility(color) }

  update(observation: OnlineObservation) {
    this.learner.update(observation)
    if (this.history.length) {
      for (let i = 0; i < this.config.replayCount; i++) {
        let sample: OnlineObservation
        if (this.config.kind === 'mixed' && i % 2 === 0) sample = this.history[Math.max(0, this.history.length - 1 - Math.floor(this.random() * Math.min(20, this.history.length)))]
        else sample = this.history[Math.floor(this.random() * this.history.length)]
        this.learner.update(sample)
      }
    }
    this.seen++
    if (this.config.kind === 'reservoir') {
      if (this.history.length < this.config.capacity) this.history.push(observation)
      else {
        const index = Math.floor(this.random() * this.seen)
        if (index < this.config.capacity) this.history[index] = observation
      }
    } else {
      this.history.push(observation)
      if (this.history.length > this.config.capacity) this.history.shift()
    }
  }
}
