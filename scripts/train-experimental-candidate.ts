import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import type { OKLCH, PairType, TrainingExample } from '../src/app/types'
import { colorFeatures, colorToHex } from '../src/color/color'
import { PreferenceEnsemble } from '../src/ml/ensemble/ensemble'
import { Adam } from '../src/ml/optimizer/adam'
import { pairProbability } from '../src/ml/preference/pairwise'
import { seededRandom } from '../src/ml/simulation/oracle'

const CONFIG = {
  schemaVersion: 1,
  seed: 20260905,
  folds: 5,
  epochs: 18,
  ensembleSize: 5,
  architecture: [6, 12, 8, 1] as const,
  learningRate: 0.0025,
  inputFeatures: ['lightness', 'chroma', 'chroma-conditioned sin(h)', 'chroma-conditioned cos(h)', 'chroma-conditioned sin(2h)', 'chroma-conditioned cos(2h)'],
  usesRecordedPredictionAsFeature: false,
  excludedPairTypes: ['repeated-control'] as PairType[],
  evaluation: 'packet-grouped frozen held-out predictions',
}

type Observation = {
  colorA: OKLCH
  colorB: OKLCH
  chosen: 'a' | 'b'
  predictionA: number
  modelVersion: number
  pairType: PairType
}
type Packet = { id: string; observations: Observation[] }
type Scored = { packetId: string; y: 0 | 1; p: number }

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index++ } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field); field = '' }
    else if (char === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += char
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const header = rows.shift()
  if (!header) throw new Error('CSV is empty')
  return rows.filter(item => item.length === header.length).map(item => Object.fromEntries(header.map((key, index) => [key, item[index]])))
}

function loadPackets(path: string): Packet[] {
  return parseCsv(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')).map(row => {
    const payload = JSON.parse(row.payload) as { observations: Observation[] }
    if (!row.id || !Array.isArray(payload.observations)) throw new Error('Invalid training_sessions export')
    return { id: row.id, observations: payload.observations }
  })
}

function useful(observation: Observation) {
  return !CONFIG.excludedPairTypes.includes(observation.pairType) && colorToHex(observation.colorA) !== colorToHex(observation.colorB)
}

function asExample(observation: Observation): TrainingExample {
  return {
    a: observation.colorA,
    b: observation.colorB,
    chosenA: observation.chosen === 'a' ? 1 : 0,
    timestamp: 0,
    localHour: 12,
    weekday: 0,
    elapsedDays: 0,
    pairType: observation.pairType,
  }
}

const INPUT = 6
const H1 = 12
const H2 = 8
const PARAMS = H1 * INPUT + H1 + H2 * H1 + H2 + H2 + 1

function normal(rng: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng())
}

type Cache = { x: number[]; h1: Float64Array; h2: Float64Array }

class CompactMLP {
  readonly values: Float64Array

  constructor(seed: number, parameters?: ArrayLike<number>) {
    this.values = new Float64Array(PARAMS)
    if (parameters) { this.values.set(parameters); return }
    const rng = seededRandom(seed)
    let offset = 0
    for (let index = 0; index < H1 * INPUT; index++) this.values[offset++] = normal(rng) * Math.sqrt(2 / (INPUT + H1))
    offset += H1
    for (let index = 0; index < H2 * H1; index++) this.values[offset++] = normal(rng) * Math.sqrt(2 / (H1 + H2))
    offset += H2
    for (let index = 0; index < H2; index++) this.values[offset++] = normal(rng) * Math.sqrt(2 / (H2 + 1))
  }

  private forward(input: ArrayLike<number>) {
    const h1 = new Float64Array(H1)
    const b1 = H1 * INPUT
    for (let j = 0; j < H1; j++) {
      let sum = this.values[b1 + j]
      for (let i = 0; i < INPUT; i++) sum += this.values[j * INPUT + i] * input[i]
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
    for (let index = 0; index < H2; index++) value += this.values[w3 + index] * h2[index]
    return { value, cache: { x: Array.from(input), h1, h2 } as Cache }
  }

  predict(input: ArrayLike<number>) { return this.forward(input).value }

  pairGradient(a: ArrayLike<number>, b: ArrayLike<number>, chosenA: 0 | 1) {
    const fa = this.forward(a)
    const fb = this.forward(b)
    const derivative = pairProbability(fa.value, fb.value) - chosenA
    const gradient = new Float64Array(PARAMS)
    this.accumulate(fa.cache, derivative, gradient)
    this.accumulate(fb.cache, -derivative, gradient)
    return gradient
  }

  private accumulate(cache: Cache, outputDerivative: number, gradient: Float64Array) {
    const b1 = H1 * INPUT
    const w2 = b1 + H1
    const b2 = w2 + H2 * H1
    const w3 = b2 + H2
    gradient[w3 + H2] += outputDerivative
    const dh2 = new Float64Array(H2)
    for (let i = 0; i < H2; i++) {
      gradient[w3 + i] += outputDerivative * cache.h2[i]
      dh2[i] = outputDerivative * this.values[w3 + i] * (1 - cache.h2[i] ** 2)
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
      const dz = dh1[j] * (1 - cache.h1[j] ** 2)
      gradient[b1 + j] += dz
      for (let i = 0; i < INPUT; i++) gradient[j * INPUT + i] += dz * cache.x[i]
    }
  }
}

class CompactEnsemble {
  readonly models: CompactMLP[]
  private readonly optimizers: Adam[]

  constructor(seed: number) {
    this.models = Array.from({ length: CONFIG.ensembleSize }, (_, index) => new CompactMLP(seed + index * 9973))
    this.optimizers = this.models.map(() => new Adam(PARAMS, CONFIG.learningRate))
  }

  train(examples: TrainingExample[], epochs: number, seed: number) {
    for (let member = 0; member < this.models.length; member++) {
      const rng = seededRandom(seed + member * 101)
      for (let epoch = 0; epoch < epochs; epoch++) {
        for (let index = 0; index < examples.length; index++) {
          const example = examples[Math.floor(rng() * examples.length)]
          if (rng() < 0.14) continue
          this.optimizers[member].update(this.models[member].values, this.models[member].pairGradient(colorFeatures(example.a), colorFeatures(example.b), example.chosenA))
        }
      }
    }
  }

  probability(a: OKLCH, b: OKLCH) {
    const af = colorFeatures(a)
    const bf = colorFeatures(b)
    return this.models.reduce((sum, model) => sum + pairProbability(model.predict(af), model.predict(bf)), 0) / this.models.length
  }

  serialize() {
    return {
      format: 'favcolor-experimental-compact-ensemble',
      version: 1,
      architecture: CONFIG.architecture,
      featureRepresentation: 'production colorFeatures: L,C,chroma-conditioned sin/cos hue harmonics',
      members: this.models.map(model => ({ parameters: Array.from(model.values) })),
    }
  }
}

function metrics(scored: Scored[]) {
  let tp = 0; let tn = 0; let fp = 0; let fn = 0; let loss = 0; let correct = 0
  for (const item of scored) {
    const p = Math.max(1e-8, Math.min(1 - 1e-8, item.p))
    loss += -(item.y * Math.log(p) + (1 - item.y) * Math.log(1 - p))
    const predicted = p >= 0.5 ? 1 : 0
    if (predicted === item.y) correct++
    if (predicted && item.y) tp++; else if (!predicted && !item.y) tn++; else if (predicted) fp++; else fn++
  }
  const positives = tp + fn
  const negatives = tn + fp
  const balancedAccuracy = ((positives ? tp / positives : 0.5) + (negatives ? tn / negatives : 0.5)) / 2
  const sorted = [...scored].sort((a, b) => a.p - b.p)
  let rankSum = 0
  for (let start = 0; start < sorted.length;) {
    let end = start + 1
    while (end < sorted.length && sorted[end].p === sorted[start].p) end++
    const averageRank = (start + 1 + end) / 2
    for (let index = start; index < end; index++) if (sorted[index].y) rankSum += averageRank
    start = end
  }
  const rocAuc = positives && negatives ? (rankSum - positives * (positives + 1) / 2) / (positives * negatives) : null
  return { count: scored.length, balancedAccuracy, rocAuc, logLoss: loss / scored.length, accuracy: correct / scored.length, positiveRate: positives / scored.length }
}

function mean(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length }
function variance(values: number[]) { const average = mean(values); return mean(values.map(value => (value - average) ** 2)) }

const source = process.argv[2]
if (!source) throw new Error('Usage: npx tsx scripts/train-experimental-candidate.ts <training_sessions.csv>')
const outputDir = resolve('benchmarks/artifacts/experimental-compact-candidate')
mkdirSync(outputDir, { recursive: true })
const startedAt = Date.now()
const packets = loadPackets(source)
const excludedControls = packets.reduce((sum, packet) => sum + packet.observations.filter(item => item.pairType === 'repeated-control').length, 0)
const excludedCollapsed = packets.reduce((sum, packet) => sum + packet.observations.filter(item => item.pairType !== 'repeated-control' && colorToHex(item.colorA) === colorToHex(item.colorB)).length, 0)
const cleaned = packets.map(packet => ({ ...packet, observations: packet.observations.filter(useful) }))
const shuffled = [...cleaned]
const rng = seededRandom(CONFIG.seed)
for (let index = shuffled.length - 1; index > 0; index--) {
  const swap = Math.floor(rng() * (index + 1)); [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
}
const folds = Array.from({ length: CONFIG.folds }, () => [] as Packet[])
shuffled.forEach((packet, index) => folds[index % folds.length].push(packet))

const candidateScores: Scored[] = []
const productionArchitectureScores: Scored[] = []
const foldReports: Array<Record<string, unknown>> = []
for (let fold = 0; fold < folds.length; fold++) {
  const heldOut = folds[fold]
  const heldOutIds = new Set(heldOut.map(packet => packet.id))
  const train = cleaned.filter(packet => !heldOutIds.has(packet.id)).flatMap(packet => packet.observations).map(asExample)
  const production = new PreferenceEnsemble(CONFIG.seed + fold * 10_007)
  production.train(train, CONFIG.epochs)
  const candidate = new CompactEnsemble(CONFIG.seed + fold * 10_007)
  candidate.train(train, CONFIG.epochs, CONFIG.seed + fold * 104_729)
  const foldCandidate: Scored[] = []
  const foldProduction: Scored[] = []
  for (const packet of heldOut) for (const observation of packet.observations) {
    const y = observation.chosen === 'a' ? 1 as const : 0 as const
    foldCandidate.push({ packetId: packet.id, y, p: candidate.probability(observation.colorA, observation.colorB) })
    foldProduction.push({ packetId: packet.id, y, p: production.probability(observation.colorA, observation.colorB) })
  }
  candidateScores.push(...foldCandidate)
  productionArchitectureScores.push(...foldProduction)
  foldReports.push({ fold, heldOutPackets: heldOut.map(packet => packet.id), candidate: metrics(foldCandidate), productionArchitecture: metrics(foldProduction) })
  console.log(`fold ${fold + 1}/${folds.length}: train=${train.length} test=${foldCandidate.length} candidate_loss=${metrics(foldCandidate).logLoss.toFixed(4)}`)
}

const allObservations = cleaned.flatMap(packet => packet.observations.map(observation => ({ packetId: packet.id, observation })))
const recordedProduction = allObservations.map(({ packetId, observation }) => ({ packetId, y: observation.chosen === 'a' ? 1 as const : 0 as const, p: observation.predictionA }))
const random = recordedProduction.map(item => ({ ...item, p: 0.5 }))
const alwaysA = recordedProduction.map(item => ({ ...item, p: 1 - 1e-8 }))
const randomMetrics = { ...metrics(random), balancedAccuracy: 0.5, accuracy: 0.5, rocAuc: 0.5 }
const perPacket = cleaned.map(packet => ({
  packetId: packet.id,
  candidate: metrics(candidateScores.filter(item => item.packetId === packet.id)),
  productionArchitecture: metrics(productionArchitectureScores.filter(item => item.packetId === packet.id)),
  recordedProduction: metrics(recordedProduction.filter(item => item.packetId === packet.id)),
}))
const foldCandidateLosses = foldReports.map(report => (report.candidate as ReturnType<typeof metrics>).logLoss)
const foldProductionLosses = foldReports.map(report => (report.productionArchitecture as ReturnType<typeof metrics>).logLoss)

const finalCandidate = new CompactEnsemble(CONFIG.seed)
finalCandidate.train(allObservations.map(item => asExample(item.observation)), CONFIG.epochs, CONFIG.seed)
const report = {
  generatedAt: new Date().toISOString(),
  source: basename(source),
  config: CONFIG,
  data: {
    packets: packets.length,
    uploadedObservations: packets.reduce((sum, packet) => sum + packet.observations.length, 0),
    usableObservations: allObservations.length,
    excludedRepeatedControls: excludedControls,
    excludedCollapsedRenderedPairs: excludedCollapsed,
    pairTypes: Object.fromEntries([...new Set(allObservations.map(item => item.observation.pairType))].map(type => [type, allObservations.filter(item => item.observation.pairType === type).length])),
  },
  evaluation: {
    candidate: metrics(candidateScores),
    productionArchitecture: metrics(productionArchitectureScores),
    recordedProductionPrequential: metrics(recordedProduction),
    random: randomMetrics,
    alwaysA: metrics(alwaysA),
    foldVariance: { candidateLogLoss: variance(foldCandidateLosses), productionArchitectureLogLoss: variance(foldProductionLosses) },
    folds: foldReports,
    perPacket,
  },
  limitations: [
    'Packet UUID is an upload-batch identifier, not a guaranteed person or session identifier; grouped estimates may still leak identity across packets and be optimistic.',
    'The grouped architecture comparison is frozen across held-out packets; recorded production predictions are prequential and therefore not directly identical protocols.',
    'This artifact is experimental and is not wired into production inference.',
  ],
  runtimeSeconds: (Date.now() - startedAt) / 1000,
}
writeFileSync(resolve(outputDir, 'config.json'), JSON.stringify(CONFIG, null, 2))
writeFileSync(resolve(outputDir, 'metrics.json'), JSON.stringify(report, null, 2))
writeFileSync(resolve(outputDir, 'candidate-model.json'), JSON.stringify({ ...finalCandidate.serialize(), seed: CONFIG.seed, trainingExamples: allObservations.length }, null, 2))
const summary = [
  `source=${basename(source)}`,
  `packets=${packets.length} usable=${allObservations.length} excluded_controls=${excludedControls} excluded_collapsed=${excludedCollapsed}`,
  `candidate=${JSON.stringify(metrics(candidateScores))}`,
  `production_architecture=${JSON.stringify(metrics(productionArchitectureScores))}`,
  `recorded_production_prequential=${JSON.stringify(metrics(recordedProduction))}`,
  `random=${JSON.stringify(randomMetrics)}`,
  `always_a=${JSON.stringify(metrics(alwaysA))}`,
  `runtime_seconds=${report.runtimeSeconds}`,
  'status=experimental_not_promoted',
].join('\n') + '\n'
writeFileSync(resolve(outputDir, 'training.log'), summary)
console.log(summary.trim())
