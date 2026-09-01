import type { MLP } from '../core/network'
import type { Adam } from '../optimizer/adam'

export function pairProbability(utilityA: number, utilityB: number) {
  const difference = Math.max(-30, Math.min(30, utilityA - utilityB))
  return 1 / (1 + Math.exp(-difference))
}

export function trainPair(model: MLP, optimizer: Adam, a: ArrayLike<number>, b: ArrayLike<number>, chosenA: 0 | 1) {
  const gradients = model.pairGradients(a, b, chosenA)
  optimizer.update(model.parameters(), gradients)
  const p = pairProbability(model.predict(a), model.predict(b))
  return -(chosenA * Math.log(Math.max(1e-9, p)) + (1 - chosenA) * Math.log(Math.max(1e-9, 1 - p)))
}
