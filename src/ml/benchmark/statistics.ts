import { seededRandom } from '../simulation/oracle'

const percentile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * q) - 1)]

export function summarize(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / Math.max(1, values.length - 1)
  const worstCount = Math.max(1, Math.ceil(values.length * .1))
  return { mean, median: percentile(values, .5), std: Math.sqrt(variance), p10: percentile(values, .1), p50: percentile(values, .5), p90: percentile(values, .9), worstDecileMean: [...values].sort((a, b) => b - a).slice(0, worstCount).reduce((a, b) => a + b, 0) / worstCount }
}

export function pairedSummary(baseline: number[], candidate: number[], seed: number) {
  if (baseline.length !== candidate.length) throw new Error('Paired arrays must have equal length')
  const differences = candidate.map((value, index) => value - baseline[index])
  const random = seededRandom(seed)
  const bootstrapMeans: number[] = []
  for (let sample = 0; sample < 2000; sample++) {
    let sum = 0
    for (let i = 0; i < differences.length; i++) sum += differences[Math.floor(random() * differences.length)]
    bootstrapMeans.push(sum / differences.length)
  }
  return { meanDifference: differences.reduce((a, b) => a + b, 0) / differences.length, bootstrap95: [percentile(bootstrapMeans, .025), percentile(bootstrapMeans, .975)] as const, differences }
}
