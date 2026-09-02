import type { OKLCH } from '../../app/types'
import { gamutMap } from '../../color/color'
import { generateCandidatePool } from '../activeLearning/candidates'
import { selectActivePair } from '../activeLearning/select'
import { PreferenceEnsemble } from '../ensemble/ensemble'
import { searchOptimum } from '../preference/search'
import { makeOracle, seededRandom } from './oracle'

export const colorfulTargets = [
  { name: 'cyan', color: gamutMap({ l: .72, c: .2, h: 195 }) },
  { name: 'purple', color: gamutMap({ l: .58, c: .25, h: 305 }) },
  { name: 'red', color: gamutMap({ l: .58, c: .28, h: 25 }) },
  { name: 'high-chroma-boundary', color: gamutMap({ l: .68, c: .42, h: 140 }) },
] as const

export const colorfulSeeds = [7, 29, 83] as const

export type ColorfulRecoveryRun = {
  target: string
  seed: number
  targetChroma: number
  poolMeanChroma: number
  poolHighChromaRate: number
  earlyLowChromaPairRate: number
  earlyLowChromaEndpointRate: number
  recoveryLowChromaPairRate: number
  recoveryLowChromaEndpointRate: number
  meanQueryChroma: number
  distance25: number
  distance50: number
  distance100: number
  finalChroma: number
}

export function simulateColorfulRecovery(targetName: string, target: OKLCH, seed: number): ColorfulRecoveryRun {
  const oracle = makeOracle(target)
  const pool = generateCandidatePool(620, 20_260_901 + seed)
  const ensemble = new PreferenceEnsemble(seed)
  const answerRandom = seededRandom(seed + 99)
  const earlyNoise = seededRandom(seed + 404)
  const seen: OKLCH[] = []
  let earlyMutedPairs = 0
  let earlyMutedEndpoints = 0
  let recoveryMutedPairs = 0
  let recoveryMutedEndpoints = 0
  let queryChroma = 0
  let distance25 = Number.NaN
  let distance50 = Number.NaN

  for (let click = 0; click < 100; click++) {
    const pair = selectActivePair(ensemble, pool, seen, seed * 1000 + click)
    const example = oracle.choose(pair[0], pair[1], answerRandom, click)
    if (click < 8) example.chosenA = earlyNoise() < .5 ? 1 : 0
    const maxChroma = Math.max(pair[0].c, pair[1].c)
    if (click < 16 && maxChroma < .08) earlyMutedPairs++
    if (click >= 16 && click < 50 && maxChroma < .08) recoveryMutedPairs++
    if (click < 16) earlyMutedEndpoints += pair.filter(color => color.c < .08).length
    if (click >= 16 && click < 50) recoveryMutedEndpoints += pair.filter(color => color.c < .08).length
    queryChroma += (pair[0].c + pair[1].c) / 2
    ensemble.train([example], click < 20 ? 7 : 4)
    seen.push(pair[0], pair[1])
    if (click === 24) distance25 = searchOptimum(ensemble, 420, seed + 25).distanceTo(target)
    if (click === 49) distance50 = searchOptimum(ensemble, 520, seed + 50).distanceTo(target)
  }

  const optimum = searchOptimum(ensemble, 700, seed + 100)
  return {
    target: targetName,
    seed,
    targetChroma: target.c,
    poolMeanChroma: pool.reduce((sum, color) => sum + color.c, 0) / pool.length,
    poolHighChromaRate: pool.filter(color => color.c >= .12).length / pool.length,
    earlyLowChromaPairRate: earlyMutedPairs / 16,
    earlyLowChromaEndpointRate: earlyMutedEndpoints / 32,
    recoveryLowChromaPairRate: recoveryMutedPairs / 34,
    recoveryLowChromaEndpointRate: recoveryMutedEndpoints / 68,
    meanQueryChroma: queryChroma / 100,
    distance25,
    distance50,
    distance100: optimum.distanceTo(target),
    finalChroma: optimum.c,
  }
}

export function runColorfulRecoveryBenchmark() {
  return colorfulTargets.flatMap((target, targetIndex) => colorfulSeeds.map(baseSeed => {
    const seed = baseSeed + targetIndex * 100
    return simulateColorfulRecovery(target.name, target.color, seed)
  }))
}

export function summarizeColorfulRecovery(runs: ColorfulRecoveryRun[]) {
  const mean = (key: keyof ColorfulRecoveryRun) => runs.reduce((sum, run) => sum + Number(run[key]), 0) / runs.length
  return {
    runCount: runs.length,
    poolMeanChroma: mean('poolMeanChroma'),
    poolHighChromaRate: mean('poolHighChromaRate'),
    earlyLowChromaPairRate: mean('earlyLowChromaPairRate'),
    earlyLowChromaEndpointRate: mean('earlyLowChromaEndpointRate'),
    recoveryLowChromaPairRate: mean('recoveryLowChromaPairRate'),
    recoveryLowChromaEndpointRate: mean('recoveryLowChromaEndpointRate'),
    meanQueryChroma: mean('meanQueryChroma'),
    distance25: mean('distance25'),
    distance50: mean('distance50'),
    distance100: mean('distance100'),
    colorfulFinalOptima: runs.filter(run => run.finalChroma >= .08).length,
  }
}
