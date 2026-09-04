export class Adam {
  private m: Float64Array
  private v: Float64Array
  private step = 0

  constructor(size: number, private learningRate = 0.003, private beta1 = 0.9, private beta2 = 0.999, private epsilon = 1e-8, state?: SerializedAdam) {
    this.m = new Float64Array(size)
    this.v = new Float64Array(size)
    if (state) {
      if (state.version !== 1 || state.m.length !== size || state.v.length !== size || !Number.isInteger(state.step) || state.step < 0) throw new Error('Invalid Adam checkpoint')
      if (![...state.m, ...state.v].every(Number.isFinite)) throw new Error('Invalid Adam checkpoint')
      this.m.set(state.m)
      this.v.set(state.v)
      this.step = state.step
    }
  }

  update(parameters: Float64Array, gradients: Float64Array) {
    if (parameters.length !== gradients.length || parameters.length !== this.m.length) throw new Error('Adam shape mismatch')
    this.step++
    const b1Correction = 1 - Math.pow(this.beta1, this.step)
    const b2Correction = 1 - Math.pow(this.beta2, this.step)
    for (let i = 0; i < parameters.length; i++) {
      const g = Math.max(-5, Math.min(5, Number.isFinite(gradients[i]) ? gradients[i] : 0))
      this.m[i] = this.beta1 * this.m[i] + (1 - this.beta1) * g
      this.v[i] = this.beta2 * this.v[i] + (1 - this.beta2) * g * g
      parameters[i] -= this.learningRate * (this.m[i] / b1Correction) / (Math.sqrt(this.v[i] / b2Correction) + this.epsilon)
      if (!Number.isFinite(parameters[i])) throw new Error('Optimizer produced a non-finite parameter')
    }
  }

  serialize(): SerializedAdam { return { version: 1, m: Array.from(this.m), v: Array.from(this.v), step: this.step } }
}

export type SerializedAdam = { version: 1; m: number[]; v: number[]; step: number }
