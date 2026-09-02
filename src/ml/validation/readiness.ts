import type { ChoiceEvent, ModelState, ValidationMetrics } from '../../app/types'
import { controlPairKey } from '../activeLearning/controlSchedule'

const sameColor = (a: ChoiceEvent['colorA'], b: ChoiceEvent['colorA']) => a.l === b.l && a.c === b.c && a.h === b.h
const samePair = (a: ChoiceEvent, b: ChoiceEvent) => sameColor(a.colorA, b.colorA) && sameColor(a.colorB, b.colorB)

export function assessReadiness(choices: ChoiceEvent[], metrics: ValidationMetrics | null, spread: number) {
  const controls = [...new Map(choices.filter(choice => choice.pairType === 'repeated-control').map(choice => [controlPairKey(choice), choice])).values()]
  const consistentControls = controls.filter(control => {
    const original = choices.find(choice => choice.timestamp < control.timestamp && choice.pairType !== 'repeated-control' && samePair(choice, control))
    return original?.chosen === control.chosen
  }).length
  const controlConsistency = controls.length ? consistentControls / controls.length : null
  const challenges = choices.filter(choice => choice.pairType === 'local-challenge')
  const challengeWinRate = challenges.length ? challenges.filter(choice => choice.chosen === 'a').length / challenges.length : null
  const exploration = choices.filter(choice => choice.pairType !== 'repeated-control').flatMap(choice => [choice.colorA, choice.colorB])
  const hueBins = new Set(exploration.filter(color => color.c >= .035).map(color => Math.floor((((color.h % 360) + 360) % 360) / 30))).size
  const lightnessBins = new Set(exploration.map(color => color.l < .45 ? 0 : color.l < .72 ? 1 : 2)).size
  const chromaBins = new Set(exploration.map(color => color.c < .08 ? 0 : color.c < .16 ? 1 : 2)).size
  const coverageReady = hueBins >= 8 && lightnessBins === 3 && chromaBins === 3
  let state: ModelState = choices.length < 16 ? 'Learning' : choices.length < 32 ? 'Narrowing' : 'Testing candidate'
  if (
    choices.length >= 48 && metrics?.beatsBaseline && metrics.folds >= 3 && metrics.foldWins >= 2 &&
    spread <= 0.18 && controls.length >= 2 && (controlConsistency ?? 0) >= 0.6 &&
    challenges.length >= 1 && (challengeWinRate ?? 0) >= 0.5 && coverageReady
  ) state = 'Ready'
  return { state, controlCount: controls.length, controlConsistency, challengeCount: challenges.length, challengeWinRate, coverage: { hueBins, lightnessBins, chromaBins, ready: coverageReady } }
}
