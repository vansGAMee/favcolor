import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ChoiceEvent, OKLCH, TrainingExample } from '../src/app/types'
import { gamutMap, inGamut, oklabDistance } from '../src/color/color'
import { generateCandidatePool } from '../src/ml/activeLearning/candidates'
import { selectControlSource } from '../src/ml/activeLearning/controlSchedule'
import { selectActivePair } from '../src/ml/activeLearning/select'
import { PreferenceEnsemble } from '../src/ml/ensemble/ensemble'
import { searchOptimum } from '../src/ml/preference/search'
import { seededRandom } from '../src/ml/simulation/oracle'

const targets = [
  { name: 'red', color: gamutMap({ l: .6, c: .27, h: 25 }) },
  { name: 'purple', color: gamutMap({ l: .58, c: .24, h: 305 }) },
  { name: 'cyan', color: gamutMap({ l: .72, c: .2, h: 195 }) },
  { name: 'green', color: gamutMap({ l: .67, c: .23, h: 145 }) },
] as const
const coverageTargets = [
  ...targets.map(target => target.color),
  gamutMap({ l: .72, c: .22, h: 55 }), gamutMap({ l: .84, c: .18, h: 100 }),
  gamutMap({ l: .38, c: .16, h: 255 }), gamutMap({ l: .82, c: .12, h: 350 }),
  gamutMap({ l: .42, c: .12, h: 190 }), gamutMap({ l: .82, c: .13, h: 145 }),
  gamutMap({ l: .48, c: .08, h: 75 }), gamutMap({ l: .74, c: .08, h: 275 }),
]
const seeds = [17, 53]

function legacyPool(count: number, seed: number) {
  const rng = seededRandom(seed)
  const colors: OKLCH[] = []
  for (let i = 0; i < count; i++) {
    const l = .24 + .66 * ((i * .61803398875 + rng() * .08) % 1)
    const h = (i * 137.507764 + rng() * 35) % 360
    const mapped = gamutMap({ l, c: .025 + .29 * Math.sqrt(rng()), h })
    if (mapped.c >= .012 && inGamut(mapped)) colors.push(mapped)
  }
  return colors
}

type PoolFactory = (count: number, seed: number) => OKLCH[]

function simulate(target: typeof targets[number], seed: number, makePool: PoolFactory) {
  const ensemble = new PreferenceEnsemble(seed)
  const pool = makePool(620, 20260901)
  const choices: ChoiceEvent[] = []
  const seen: OKLCH[] = []
  const losses: number[] = []
  const noise = seededRandom(seed + 404)
  const earlyFlips = Array.from({ length: 20 }, () => noise() < .3)
  let targetExposures = 0
  let earlyTargetExposures = 0
  let firstTargetExposure: number | null = null

  for (let click = 0; click < 150; click++) {
    let pair: readonly [OKLCH, OKLCH]
    let pairType: ChoiceEvent['pairType'] = 'normal'
    if (click > 3 && click % 11 === 10) {
      const source = selectControlSource(choices)
      pair = [source.colorA, source.colorB]
      pairType = 'repeated-control'
    } else if (click > 31 && click % 13 === 12) {
      const optimum = searchOptimum(ensemble, 360, click + 901)
      pair = [optimum, gamutMap({ l: optimum.l + (click % 2 ? .045 : -.045), c: optimum.c + .025, h: optimum.h + 18 })]
      pairType = 'local-challenge'
    } else {
      pair = selectActivePair(ensemble, pool, seen, click * 7919 + 17)
      if (click > 5 && click % 7 === 6) pairType = 'validation'
    }

    const prediction = Math.max(1e-7, Math.min(1 - 1e-7, ensemble.probability(pair[0], pair[1])))
    let chosenA = oklabDistance(pair[0], target.color) <= oklabDistance(pair[1], target.color) ? 1 : 0
    if (click < earlyFlips.length && earlyFlips[click]) chosenA = chosenA ? 0 : 1
    const example: TrainingExample = { a: pair[0], b: pair[1], chosenA: chosenA as 0 | 1, timestamp: click, localHour: click * 7 % 24, weekday: click % 7, elapsedDays: click * .55, pairType }
    losses.push(-(example.chosenA * Math.log(prediction) + (1 - example.chosenA) * Math.log(1 - prediction)))
    ensemble.train([example], click < 20 ? 7 : 4)
    choices.push({ id: `${seed}-${click}`, colorA: pair[0], colorB: pair[1], chosen: example.chosenA ? 'a' : 'b', timestamp: click + 1, localHour: example.localHour, weekday: example.weekday, elapsedSinceStartMs: click, reactionTimeMs: 500, leftColor: 'a', modelVersion: 2, pairType, distance: oklabDistance(pair[0], pair[1]) })
    seen.push(pair[0], pair[1])

    if (pairType === 'normal' || pairType === 'validation') {
      const exposed = Math.min(oklabDistance(pair[0], target.color), oklabDistance(pair[1], target.color)) < .09
      if (exposed) {
        targetExposures++
        if (click < 20) earlyTargetExposures++
        firstTargetExposure ??= click + 1
      }
    }
  }

  const optimum = searchOptimum(ensemble, 520, 251)
  const error = oklabDistance(optimum, target.color)
  return { target: target.name, seed, error, recovered: error < .18, logLoss: losses.reduce((sum, loss) => sum + loss, 0) / losses.length, targetExposures, earlyTargetExposures, firstTargetExposure }
}

function summarize(runs: ReturnType<typeof simulate>[]) {
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    runs: runs.length,
    recovered: runs.filter(run => run.recovered).length,
    error: mean(runs.map(run => run.error)),
    logLoss: mean(runs.map(run => run.logLoss)),
    targetExposures: mean(runs.map(run => run.targetExposures)),
    earlyTargetExposures: mean(runs.map(run => run.earlyTargetExposures)),
    firstTargetExposure: mean(runs.flatMap(run => run.firstTargetExposure ?? [])),
  }
}

function coverage(makePool: PoolFactory) {
  const pool = makePool(620, 20260901).filter(color => color.c >= .035)
  const errors = coverageTargets.map(target => Math.min(...pool.map(candidate => oklabDistance(candidate, target))))
  return { worst: Math.max(...errors), mean: errors.reduce((sum, error) => sum + error, 0) / errors.length, red: errors[0] }
}

const startedAt = Date.now()
const beforeRuns = targets.flatMap(target => seeds.map(seed => simulate(target, seed, legacyPool)))
const afterRuns = targets.flatMap(target => seeds.map(seed => simulate(target, seed, generateCandidatePool)))
const report = {
  generatedAt: new Date().toISOString(), durationMs: Date.now() - startedAt,
  protocol: { poolSize: 620, poolSeed: 20260901, clicks: 150, seeds, earlyNoisyClicks: 20, earlyFlipProbability: .3, productionSchedule: true },
  before: { coverage: coverage(legacyPool), summary: summarize(beforeRuns), runs: beforeRuns },
  after: { coverage: coverage(generateCandidatePool), summary: summarize(afterRuns), runs: afterRuns },
}
mkdirSync(resolve('benchmarks', 'artifacts'), { recursive: true })
const outputPath = resolve('benchmarks', 'artifacts', 'production-recovery-pool-fix.json')
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ outputPath, durationMs: report.durationMs, before: report.before, after: report.after }, null, 2))
