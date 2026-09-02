import type { ChoiceEvent, OKLCH, TrainingExample } from '../../app/types'
import { gamutMap, oklabDistance } from '../../color/color'
import { generateCandidatePool } from '../activeLearning/candidates'
import { selectActivePair } from '../activeLearning/select'
import { selectControlSource } from '../activeLearning/controlSchedule'
import { PreferenceEnsemble } from '../ensemble/ensemble'
import { searchOptimum } from '../preference/search'
import { makeOracle, seededRandom } from './oracle'

export const recoveryTargets = [
  { name: 'red', color: gamutMap({ l: .6, c: .27, h: 25 }) },
  { name: 'purple', color: gamutMap({ l: .58, c: .24, h: 305 }) },
  { name: 'cyan', color: gamutMap({ l: .72, c: .2, h: 195 }) },
  { name: 'green', color: gamutMap({ l: .67, c: .23, h: 145 }) },
] as const

export type RecoveryCheckpoint = { click: number; error: number; logLoss: number; coverage: number; optimum: OKLCH }
export type Recovery150Run = { target: string; seed: number; checkpoints: RecoveryCheckpoint[]; movement50to150: number; recentPairDiversity: number; nearRepeatCount: number; controlCount: number; uniqueControlPairs: number; clicksToRecovery: number | null }

const pairDistance = (a: readonly [OKLCH, OKLCH], b: readonly [OKLCH, OKLCH]) => Math.min(
  Math.max(oklabDistance(a[0], b[0]), oklabDistance(a[1], b[1])),
  Math.max(oklabDistance(a[0], b[1]), oklabDistance(a[1], b[0])),
)
const bin = (color: OKLCH) => `${Math.floor(((color.h % 360) + 360) % 360 / 30)}:${Math.floor(color.l * 4)}:${Math.min(2, Math.floor(color.c / .08))}`
const coverage = (colors: OKLCH[]) => {
  const hue = new Set(colors.map(color => Math.floor(((color.h % 360) + 360) % 360 / 30))).size / 12
  const lightness = new Set(colors.map(color => Math.min(2, Math.floor(color.l * 3)))).size / 3
  const chroma = new Set(colors.map(color => Math.min(2, Math.floor(color.c / .08)))).size / 3
  return (hue + lightness + chroma) / 3
}

function legacySelectActivePair(ensemble: PreferenceEnsemble, pool: OKLCH[], seen: OKLCH[], seed: number): readonly [OKLCH, OKLCH] {
  const rng = seededRandom(seed)
  let best: readonly [OKLCH, OKLCH] = [pool[0], pool[1]]
  let bestScore = -Infinity
  const nearestSeen = (color: OKLCH) => seen.length ? Math.min(...seen.slice(-120).map(previous => oklabDistance(previous, color))) : .25
  if (seen.length < 32) {
    for (let i = 0; i < 220; i++) {
      const a = pool[Math.floor(rng() * pool.length)], b = pool[Math.floor(rng() * pool.length)]
      const distance = oklabDistance(a, b)
      if (distance < .09) continue
      const score = .62 * Math.min(1, (nearestSeen(a) + nearestSeen(b)) / .28) + .38 * Math.exp(-Math.pow((distance - .28) / .2, 2))
      if (score > bestScore) { best = [a, b]; bestScore = score }
    }
    return best
  }
  const ranked = [...pool].sort((a, b) => ensemble.utility(b) - ensemble.utility(a))
  const contenders = ranked.slice(0, Math.max(36, Math.floor(pool.length * .22)))
  for (let i = 0; i < 180; i++) {
    const a = contenders[Math.floor(rng() * Math.min(18, contenders.length))], b = contenders[Math.floor(rng() * contenders.length)]
    const distance = oklabDistance(a, b)
    if (distance < .045) continue
    const ambiguity = 1 - Math.abs(ensemble.probability(a, b) - .5) * 2
    const score = .4 * ambiguity + 2.4 * ensemble.disagreement(a, b) + .25 * Math.exp(-Math.pow((distance - .22) / .18, 2)) + .12 * Math.min(1, Math.min(nearestSeen(a), nearestSeen(b)) / .16)
    if (score > bestScore) { best = [a, b]; bestScore = score }
  }
  return best
}

export function simulateRecovery150(targetName: string, target: OKLCH, seed: number, legacy = false): Recovery150Run {
  const ensemble = new PreferenceEnsemble(seed)
  const pool = generateCandidatePool(520, seed + 701)
  const targetOracle = makeOracle(target)
  const earlyTarget = targetName === 'red' || targetName === 'purple' ? gamutMap({ l: .7, c: .2, h: 195 }) : gamutMap({ ...target, h: target.h + 170 })
  const earlyOracle = makeOracle(earlyTarget)
  const rng = seededRandom(seed + 33)
  const history: Array<{ pair: readonly [OKLCH, OKLCH]; example: TrainingExample; control: boolean }> = []
  const choiceEvents: ChoiceEvent[] = []
  const seen: OKLCH[] = []
  const losses: number[] = []
  const checkpoints: RecoveryCheckpoint[] = []
  let clicksToRecovery: number | null = null

  for (let click = 0; click < 150; click++) {
    const control = click > 3 && click % 11 === 10
    const source = control && !legacy ? selectControlSource(choiceEvents) : null
    const pair = control && legacy ? history[0].pair : source ? [source.colorA, source.colorB] as const : (legacy ? legacySelectActivePair : selectActivePair)(ensemble, pool, seen, seed * 1000 + click)
    const oracle = click < 25 ? earlyOracle : targetOracle
    const p = Math.max(1e-7, Math.min(1 - 1e-7, ensemble.probability(pair[0], pair[1])))
    const example = oracle.choose(pair[0], pair[1], rng, click)
    losses.push(-(example.chosenA * Math.log(p) + (1 - example.chosenA) * Math.log(1 - p)))
    ensemble.train([example], click < 20 ? 7 : 4)
    history.push({ pair, example, control })
    choiceEvents.push({ id: String(click), colorA: pair[0], colorB: pair[1], chosen: example.chosenA ? 'a' : 'b', timestamp: click + 1, localHour: example.localHour, weekday: example.weekday, elapsedSinceStartMs: click, reactionTimeMs: 500, leftColor: 'a', modelVersion: 2, pairType: control ? 'repeated-control' : 'normal', distance: oklabDistance(pair[0], pair[1]) })
    seen.push(pair[0], pair[1])
    if ([49, 99, 149].includes(click)) {
      const optimum = searchOptimum(ensemble, 420, seed + click)
      checkpoints.push({ click: click + 1, error: optimum.distanceTo(target), logLoss: losses.reduce((a, b) => a + b, 0) / losses.length, coverage: coverage(seen.slice(-80)), optimum })
    }
    if (click >= 34 && click % 10 === 4 && clicksToRecovery === null) {
      const optimum = searchOptimum(ensemble, 280, seed + click + 5000)
      if (optimum.distanceTo(target) < .18 && oklabDistance(optimum, earlyTarget) > .12) clicksToRecovery = click + 1
    }
  }
  const recent = history.slice(-30).map(item => item.pair)
  let nearRepeatCount = 0
  for (let i = 1; i < recent.length; i++) if (recent.slice(0, i).some(pair => pairDistance(pair, recent[i]) < .045)) nearRepeatCount++
  const controls = history.filter(item => item.control).map(item => item.pair)
  return {
    target: targetName, seed, checkpoints,
    movement50to150: oklabDistance(checkpoints[0].optimum, checkpoints[2].optimum),
    recentPairDiversity: new Set(recent.map(pair => `${bin(pair[0])}|${bin(pair[1])}`)).size / recent.length,
    nearRepeatCount, controlCount: controls.length,
    uniqueControlPairs: controls.filter((pair, index) => !controls.slice(0, index).some(previous => pairDistance(previous, pair) < 1e-6)).length,
    clicksToRecovery,
  }
}

export function runRecovery150(seeds: number[], legacy = false) { return recoveryTargets.flatMap(target => seeds.map(seed => simulateRecovery150(target.name, target.color, seed, legacy))) }
export function summarizeRecovery150(runs: Recovery150Run[]) {
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
  return {
    runs: runs.length,
    error50: mean(runs.map(run => run.checkpoints[0].error)), error100: mean(runs.map(run => run.checkpoints[1].error)), error150: mean(runs.map(run => run.checkpoints[2].error)),
    logLoss150: mean(runs.map(run => run.checkpoints[2].logLoss)), coverage150: mean(runs.map(run => run.checkpoints[2].coverage)),
    movement50to150: mean(runs.map(run => run.movement50to150)), recentPairDiversity: mean(runs.map(run => run.recentPairDiversity)),
    nearRepeatCount: mean(runs.map(run => run.nearRepeatCount)), controlPairDiversity: mean(runs.map(run => run.uniqueControlPairs / run.controlCount)),
    recovered: runs.filter(run => run.clicksToRecovery !== null).length, meanClicksToRecovery: mean(runs.flatMap(run => run.clicksToRecovery ?? [])),
  }
}
