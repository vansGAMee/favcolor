import type { OKLCH } from '../../app/types'
import { oklabDistance } from '../../color/color'
import { generateCandidatePool } from '../activeLearning/candidates'
import type { HiddenScenario, OnlineLearner, OnlineObservation, QueryPolicy } from '../online/types'
import { seededRandom } from '../simulation/oracle'

export interface CheckpointMetrics { budget: number; logLoss: number; brier: number; accuracy: number; optimumError: number; medianDisplacement: number; p90Displacement: number }

export interface PrequentialResult {
  learnerId: string; scenarioId: string; policyId: string; observations: OnlineObservation[]; checkpoints: CheckpointMetrics[]
  updateLatencyMeanMs: number; updateLatencyP95Ms: number; optimumTrajectory: OKLCH[]
}

const percentile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * q) - 1)] ?? 0

export function runPrequential(options: { learner: OnlineLearner; oracle: HiddenScenario; policy: QueryPolicy; budget: number; candidateCount?: number; checkpoints?: number[] }): PrequentialResult {
  const { learner, oracle, policy, budget } = options
  const pool = generateCandidatePool(options.candidateCount ?? 180, oracle.seed + 9000)
  const queryRandom = seededRandom(oracle.seed + 100_003)
  const answerRandom = seededRandom(oracle.seed + 200_003)
  const observations: OnlineObservation[] = []
  const optimumTrajectory: OKLCH[] = []
  const updateLatencies: number[] = []
  const checkpoints: CheckpointMetrics[] = []
  const requested = options.checkpoints ?? [30, 50, 100, 150]
  for (let step = 0; step < budget; step++) {
    const [a, b] = policy.select(learner, observations, pool, step, queryRandom)
    const prediction = learner.predict(a, b)
    const chosenA = oracle.sample(a, b, step, answerRandom)
    const observation: OnlineObservation = { a, b, chosenA, timestamp: step, localHour: (step * 7) % 24, weekday: step % 7, elapsedDays: step * .5, predictedProbability: prediction.probability, uncertainty: prediction.uncertainty }
    const start = performance.now()
    learner.update(observation)
    updateLatencies.push(performance.now() - start)
    observations.push(observation)
    const estimate = pool.reduce((best, color) => learner.utility(color) > learner.utility(best) ? color : best, pool[0])
    optimumTrajectory.push(estimate)
    const n = step + 1
    if (requested.includes(n)) {
      const prefix = observations.slice(0, n)
      const logLoss = prefix.reduce((sum, item) => { const p = Math.max(1e-8, Math.min(1 - 1e-8, item.predictedProbability!)); return sum - item.chosenA * Math.log(p) - (1 - item.chosenA) * Math.log(1 - p) }, 0) / n
      const brier = prefix.reduce((sum, item) => sum + Math.pow(item.predictedProbability! - item.chosenA, 2), 0) / n
      const accuracy = prefix.filter(item => (item.predictedProbability! >= .5 ? 1 : 0) === item.chosenA).length / n
      const displacements = optimumTrajectory.slice(1, n).map((item, index) => oklabDistance(item, optimumTrajectory[index]))
      checkpoints.push({ budget: n, logLoss, brier, accuracy, optimumError: oklabDistance(estimate, oracle.optimumAt(step, pool)), medianDisplacement: percentile(displacements, .5), p90Displacement: percentile(displacements, .9) })
    }
  }
  return { learnerId: learner.id, scenarioId: oracle.id, policyId: policy.id, observations, checkpoints, updateLatencyMeanMs: updateLatencies.reduce((a, b) => a + b, 0) / updateLatencies.length, updateLatencyP95Ms: percentile(updateLatencies, .95), optimumTrajectory }
}

export const uniformPolicy: QueryPolicy = { id: 'uniform-random', select: (_learner, _history, pool, _step, random) => [pool[Math.floor(random() * pool.length)], pool[Math.floor(random() * pool.length)]] }
