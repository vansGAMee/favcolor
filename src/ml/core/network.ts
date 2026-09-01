const INPUT = 6
const H1 = 24
const H2 = 16
const PARAMS = H1 * INPUT + H1 + H2 * H1 + H2 + H2 + 1

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function normal(rng: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng())
}

type Cache = { x: number[]; h1: Float64Array; h2: Float64Array }

export class MLP {
  private values: Float64Array

  constructor(seed = 1, parameters?: ArrayLike<number>) {
    this.values = new Float64Array(PARAMS)
    if (parameters) {
      if (parameters.length !== PARAMS) throw new Error('Invalid network parameter count')
      this.values.set(parameters)
      if (!this.values.every(Number.isFinite)) throw new Error('Network contains non-finite parameters')
      return
    }
    const rng = mulberry32(seed)
    let offset = 0
    for (let i = 0; i < H1 * INPUT; i++) this.values[offset++] = normal(rng) * Math.sqrt(2 / (INPUT + H1))
    offset += H1
    for (let i = 0; i < H2 * H1; i++) this.values[offset++] = normal(rng) * Math.sqrt(2 / (H1 + H2))
    offset += H2
    for (let i = 0; i < H2; i++) this.values[offset++] = normal(rng) * Math.sqrt(2 / (H2 + 1))
  }

  parameters() { return this.values }

  private forward(input: ArrayLike<number>): { value: number; cache: Cache } {
    if (input.length !== INPUT) throw new Error('Expected six color features')
    const h1 = new Float64Array(H1)
    const w1 = 0
    const b1 = H1 * INPUT
    for (let j = 0; j < H1; j++) {
      let sum = this.values[b1 + j]
      for (let i = 0; i < INPUT; i++) sum += this.values[w1 + j * INPUT + i] * input[i]
      h1[j] = Math.tanh(sum)
    }
    const w2 = b1 + H1
    const b2 = w2 + H2 * H1
    const h2 = new Float64Array(H2)
    for (let j = 0; j < H2; j++) {
      let sum = this.values[b2 + j]
      for (let i = 0; i < H1; i++) sum += this.values[w2 + j * H1 + i] * h1[i]
      h2[j] = Math.tanh(sum)
    }
    const w3 = b2 + H2
    let value = this.values[w3 + H2]
    for (let i = 0; i < H2; i++) value += this.values[w3 + i] * h2[i]
    return { value, cache: { x: Array.from(input), h1, h2 } }
  }

  predict(input: ArrayLike<number>) { return this.forward(input).value }

  private accumulate(cache: Cache, outputDerivative: number, gradient: Float64Array) {
    const b1 = H1 * INPUT
    const w2 = b1 + H1
    const b2 = w2 + H2 * H1
    const w3 = b2 + H2
    gradient[w3 + H2] += outputDerivative
    const dh2 = new Float64Array(H2)
    for (let i = 0; i < H2; i++) {
      gradient[w3 + i] += outputDerivative * cache.h2[i]
      dh2[i] = outputDerivative * this.values[w3 + i] * (1 - cache.h2[i] * cache.h2[i])
    }
    const dh1 = new Float64Array(H1)
    for (let j = 0; j < H2; j++) {
      gradient[b2 + j] += dh2[j]
      for (let i = 0; i < H1; i++) {
        gradient[w2 + j * H1 + i] += dh2[j] * cache.h1[i]
        dh1[i] += dh2[j] * this.values[w2 + j * H1 + i]
      }
    }
    for (let j = 0; j < H1; j++) {
      const dz = dh1[j] * (1 - cache.h1[j] * cache.h1[j])
      gradient[b1 + j] += dz
      for (let i = 0; i < INPUT; i++) gradient[j * INPUT + i] += dz * cache.x[i]
    }
  }

  pairGradients(a: ArrayLike<number>, b: ArrayLike<number>, chosenA: 0 | 1) {
    const fa = this.forward(a)
    const fb = this.forward(b)
    const probability = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, fa.value - fb.value))))
    const derivative = probability - chosenA
    const gradient = new Float64Array(PARAMS)
    this.accumulate(fa.cache, derivative, gradient)
    this.accumulate(fb.cache, -derivative, gradient)
    return gradient
  }
}

export function serializeNetwork(network: MLP) {
  return { version: 1, architecture: [6, 24, 16, 1], parameters: Array.from(network.parameters()) }
}

export function deserializeNetwork(value: ReturnType<typeof serializeNetwork>) {
  if (value.version !== 1 || value.architecture.join(',') !== '6,24,16,1') throw new Error('Unsupported network format')
  return new MLP(0, value.parameters)
}
