import { mkdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { FrozenProductionLearner } from '../src/ml/benchmark/frozenBaseline'
import { policyRegistry } from '../src/ml/benchmark/policies'
import { runPrequential, uniformPolicy, type CheckpointMetrics, type PrequentialResult } from '../src/ml/benchmark/prequential'
import { summarize } from '../src/ml/benchmark/statistics'
import { ConfigurableMLP } from '../src/ml/online/mlp'
import { QuadraticBT } from '../src/ml/online/quadratic'
import { RbfBT } from '../src/ml/online/rbf'
import { ReplayController, type ReplayConfig } from '../src/ml/online/replay'
import type { OnlineLearner, QueryPolicy } from '../src/ml/online/types'
import { createScenario } from '../src/ml/simulation/suite'
import { cycleConflictRate } from '../src/ml/validation/cycles'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')
const budgets = [30, 50, 100, 150]
const seeds = Array.from({ length: 39 }, (_, index) => 10_000 + index)
const timestamp = new Date().toISOString()
const commit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim()
const diff = execSync('git diff --binary', { cwd: root }).toString()
const sourceDiffIdentifier = diff.length ? `working-tree-bytes-${Buffer.byteLength(diff)}` : 'clean'

type Factory = { id: string; parameters: number; config: object; create(seed: number): OnlineLearner }
const baseFactories: Factory[] = [
  { id: 'frozen-production-ensemble-v1', parameters: 2925, config: { architecture: [6, 24, 16, 1], members: 5, optimizer: 'Adam', learningRate: .0025, epochs: { first20: 7, later: 4 }, update: 'newest-only bootstrap omission .14' }, create: seed => new FrozenProductionLearner(seed) },
  { id: 'quadratic-bt', parameters: 9, config: { features: 'OKLab quadratic', learningRate: .035 }, create: seed => new QuadraticBT(seed) },
  { id: 'rbf-bt-24', parameters: 33, config: { centers: 24, bandwidth: .15, learningRate: .025 }, create: seed => new RbfBT(seed, 24, .15, .025) },
  { id: 'rbf-bt-48', parameters: 57, config: { centers: 48, bandwidth: .15, learningRate: .025 }, create: seed => new RbfBT(seed, 48, .15, .025) },
  { id: 'mlp-6x12x8x1', parameters: 197, config: { layers: [6, 12, 8, 1], optimizer: 'Adam', learningRate: .003 }, create: seed => new ConfigurableMLP(seed, [6, 12, 8, 1], .003) },
  { id: 'mlp-6x8x1', parameters: 65, config: { layers: [6, 8, 1], optimizer: 'Adam', learningRate: .003 }, create: seed => new ConfigurableMLP(seed, [6, 8, 1], .003) },
]

const metricKeys: (keyof CheckpointMetrics)[] = ['logLoss', 'brier', 'accuracy', 'optimumError', 'medianDisplacement', 'p90Displacement']

function compact(results: PrequentialResult[]) {
  const checkpoints = Object.fromEntries(budgets.map(budget => {
    const rows = results.map(result => result.checkpoints.find(item => item.budget === budget)!)
    return [budget, Object.fromEntries(metricKeys.map(key => [key, summarize(rows.map(row => row[key] as number))]))]
  }))
  const target = .12
  const clicks = results.map(result => {
    const reached = result.checkpoints.find(row => row.optimumError <= target)
    return reached?.budget ?? 151
  })
  const uncertaintyBins = Array.from({ length: 5 }, (_, bin) => {
    const rows = results.flatMap(result => result.observations).filter(item => Math.min(4, Math.floor((item.uncertainty ?? 0) * 5)) === bin)
    return { bin, count: rows.length, meanUncertainty: rows.reduce((sum, item) => sum + (item.uncertainty ?? 0), 0) / Math.max(1, rows.length), empiricalAbsoluteError: rows.reduce((sum, item) => sum + Math.abs((item.predictedProbability ?? .5) - item.chosenA), 0) / Math.max(1, rows.length) }
  })
  return {
    checkpoints, clicksToOptimumErrorAtMost012: summarize(clicks),
    runtime: { updateMeanMs: summarize(results.map(item => item.updateLatencyMeanMs)), updateP95Ms: summarize(results.map(item => item.updateLatencyP95Ms)) },
    cycleDiagnostic: summarize(results.map(item => cycleConflictRate(item.observations))), uncertaintyBins,
  }
}

function run(factory: Factory, policy: QueryPolicy, selectedSeeds = seeds, budget = 150) {
  const started = performance.now()
  const results = selectedSeeds.map((seed, index) => {
    if (index % 13 === 0) console.log(`${factory.id} / ${policy.id}: ${index}/${selectedSeeds.length}`)
    return runPrequential({ learner: factory.create(seed + 701), oracle: createScenario(seed), policy, budget, candidateCount: 180, checkpoints: budgets.filter(value => value <= budget) })
  })
  return { factoryId: factory.id, policyId: policy.id, seeds: selectedSeeds, parameters: factory.parameters, config: factory.config, wallTimeMs: performance.now() - started, summary: compact(results) }
}

mkdirSync(`${root}/benchmarks/artifacts/baseline`, { recursive: true })
mkdirSync(`${root}/benchmarks/artifacts/development`, { recursive: true })

const neutral = baseFactories.map(factory => run(factory, uniformPolicy))
const frozenActive = run(baseFactories[0], policyRegistry[1])
const baselineArtifact = {
  artifactVersion: 1, benchmarkVersion: 'prequential-suite-v1', timestamp,
  frozenGitCommit: '3cda77c5cfe53ad7e4587e52636af7741e07b239', frozenDiffSha1: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391',
  generatedFromCommit: commit, sourceDiffIdentifier,
  baseline: neutral[0], activePolicy: frozenActive,
  activeVsRandom: {
    randomOptimumError150: neutral[0].summary.checkpoints[150].optimumError,
    activeOptimumError150: frozenActive.summary.checkpoints[150].optimumError,
  },
  protocol: { order: ['predict', 'score', 'train'], budgets, candidateCount: 180, seedPool: seeds },
}
writeFileSync(`${root}/benchmarks/artifacts/baseline/frozen-production-prequential.json`, JSON.stringify(baselineArtifact, null, 2))

const serious = neutral.slice(1).sort((a, b) => {
  const am = a.summary.checkpoints[100], bm = b.summary.checkpoints[100]
  return am.logLoss.mean + 1.5 * am.optimumError.mean - bm.logLoss.mean - 1.5 * bm.optimumError.mean
}).slice(0, 3)
const factoryById = new Map(baseFactories.map(factory => [factory.id, factory]))
const replaySeeds = seeds.slice(0, 26)
const replayKinds: Omit<ReplayConfig, 'seed'>[] = [
  { kind: 'newest', replayCount: 0, capacity: 150 },
  { kind: 'uniform', replayCount: 1, capacity: 150 },
  { kind: 'mixed', replayCount: 2, capacity: 150 },
  { kind: 'reservoir', replayCount: 1, capacity: 80 },
]
const replay = serious.flatMap(screened => replayKinds.map(replayConfig => {
  const inner = factoryById.get(screened.factoryId)!
  const factory: Factory = {
    id: `${inner.id}+${replayConfig.kind}-${replayConfig.replayCount}`, parameters: inner.parameters,
    config: { ...inner.config, replay: replayConfig },
    create: seed => new ReplayController(inner.create(seed), { ...replayConfig, seed: seed + 919 }),
  }
  return run(factory, uniformPolicy, replaySeeds)
}))
const replayWinner = replay.sort((a, b) => {
  const am = a.summary.checkpoints[100], bm = b.summary.checkpoints[100]
  return am.logLoss.mean + .5 * am.optimumError.mean - bm.logLoss.mean - .5 * bm.optimumError.mean
})[0]
const winnerBaseId = replayWinner.factoryId.split('+')[0]
const winnerBase = factoryById.get(winnerBaseId)!
const replayConfig = replayKinds.find(item => replayWinner.factoryId.endsWith(`${item.kind}-${item.replayCount}`))!
const winnerFactory: Factory = {
  id: replayWinner.factoryId, parameters: winnerBase.parameters, config: replayWinner.config,
  create: seed => new ReplayController(winnerBase.create(seed), { ...replayConfig, seed: seed + 919 }),
}
const policies = policyRegistry.map(policy => run(winnerFactory, policy, replaySeeds))
const developmentArtifact = {
  artifactVersion: 1, benchmarkVersion: 'prequential-suite-v1', timestamp, gitCommit: commit, sourceDiffIdentifier,
  governance: { developmentSeeds: seeds, finalSeedsNeverAccessed: true, stages: ['neutral model screen', 'replay screen on top three', 'query-policy screen on winner'] },
  neutralModelScreen: neutral, replayScreen: replay, policyScreen: policies,
  omitted: { periodicFullRetraining: 'Rejected before full screen: repeated rebuilding makes per-click work grow with N and is unnecessary while bounded replay candidates stay far below latency target.', gp: 'Rejected before implementation: fixed RBF approximation covers the locally practical kernel candidate without per-query factorization.' },
}
writeFileSync(`${root}/benchmarks/artifacts/development/staged-screening.json`, JSON.stringify(developmentArtifact, null, 2))
console.log(`Development artifacts written. Replay winner: ${replayWinner.factoryId}`)
