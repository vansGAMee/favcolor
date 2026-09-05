import type { ChoiceEvent, OKLCH } from '../../app/types'
import { gamutMap, oklabDistance } from '../../color/color'
import { isUsefulRenderedPair } from '../../color/displayPair'
import { generateCandidatePool } from '../activeLearning/candidates'
import type { PreferenceEnsemble } from '../ensemble/ensemble'
import { seededRandom } from '../simulation/oracle'

export type BoundaryValidation = {
  dimension: 'lightness'
  direction: 'lower' | 'upper'
  pair: readonly [OKLCH, OKLCH]
}

export type OptimumResult = OKLCH & {
  spread: number
  memberOptima: OKLCH[]
  boundaryValidation: BoundaryValidation | null
  distanceTo: (color: OKLCH) => number
}

type SearchOptions = { choices?: ChoiceEvent[] }

function chosenColor(choice: ChoiceEvent) {
  return choice.chosen === 'a' ? choice.colorA : choice.colorB
}

function runSearch(
  ensemble: PreferenceEnsemble,
  candidateCount: number,
  seed: number,
  extraColors: OKLCH[] = [],
  accept: (color: OKLCH) => boolean = () => true,
) {
  const generated = generateCandidatePool(candidateCount, seed)
  const pool = [...generated, ...extraColors].filter(accept)
  if (!pool.length) throw new Error('Optimum search has no supported candidates')
  const memberOptima = ensemble.models.map((_, modelIndex) => pool.reduce((best, color) => ensemble.utility(color, modelIndex) > ensemble.utility(best, modelIndex) ? color : best, pool[0]))
  const top = [...pool].sort((a, b) => ensemble.utility(b) - ensemble.utility(a)).slice(0, 10)
  const rng = seededRandom(seed + 81)
  const refined: OKLCH[] = [...top]
  for (const origin of top.slice(0, 6)) {
    let best = origin
    for (let scale = 0.08; scale >= 0.008; scale *= 0.5) {
      for (let i = 0; i < 28; i++) {
        const candidate = gamutMap({ l: best.l + (rng() - 0.5) * scale, c: Math.max(0, best.c + (rng() - 0.5) * scale), h: best.h + (rng() - 0.5) * scale * 900 })
        if (accept(candidate) && ensemble.utility(candidate) > ensemble.utility(best)) best = candidate
      }
    }
    refined.push(best)
  }
  const best = refined.reduce((a, b) => ensemble.utility(b) > ensemble.utility(a) ? b : a)
  return { best, memberOptima }
}

function validationProbe(raw: OKLCH, boundaryL: number, direction: BoundaryValidation['direction']) {
  const anchor = gamutMap({ ...raw, l: boundaryL })
  const maximumStep = Math.min(0.08, Math.abs(raw.l - boundaryL))
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, (attempt + 1) / 3)
    const l = boundaryL + (direction === 'lower' ? -1 : 1) * maximumStep * scale
    const probe = gamutMap({ ...raw, l })
    if (isUsefulRenderedPair([anchor, probe])) return [anchor, probe] as const
  }
  if (isUsefulRenderedPair([anchor, raw])) return [anchor, raw] as const
  return null
}

function rejectedAtBoundary(choices: ChoiceEvent[], boundaryL: number, direction: BoundaryValidation['direction']) {
  return [...choices].reverse().some(choice => {
    if (choice.pairType !== 'boundary-validation' || choice.chosen !== 'a') return false
    const outward = direction === 'lower' ? choice.colorB.l < choice.colorA.l : choice.colorB.l > choice.colorA.l
    return outward && Math.abs(choice.colorA.l - boundaryL) < 0.006
  })
}

export function searchOptimum(ensemble: PreferenceEnsemble, candidateCount = 1200, seed = 1, options: SearchOptions = {}): OptimumResult {
  const rawSearch = runSearch(ensemble, candidateCount, seed)
  let best = rawSearch.best
  let memberOptima = rawSearch.memberOptima
  let boundaryValidation: BoundaryValidation | null = null
  const evidenceChoices = options.choices?.filter(choice =>
    choice.pairType !== 'repeated-control' && isUsefulRenderedPair([choice.colorA, choice.colorB])) ?? []

  if (evidenceChoices.length >= 32) {
    const evidence = evidenceChoices.map(chosenColor)
    const lower = Math.min(...evidence.map(color => color.l))
    const upper = Math.max(...evidence.map(color => color.l))
    const direction = best.l < lower ? 'lower' : best.l > upper ? 'upper' : null
    if (direction) {
      const boundaryL = direction === 'lower' ? lower : upper
      const pair = validationProbe(best, boundaryL, direction)
      if (pair) {
        const supported = runSearch(ensemble, candidateCount, seed, evidence, color => color.l >= lower && color.l <= upper)
        best = supported.best
        memberOptima = supported.memberOptima
        if (!rejectedAtBoundary(evidenceChoices, boundaryL, direction)) {
          boundaryValidation = { dimension: 'lightness', direction, pair }
        }
      }
    }
  }

  const spread = memberOptima.reduce((sum, color) => sum + oklabDistance(color, best), 0) / memberOptima.length
  return { ...best, spread, memberOptima, boundaryValidation, distanceTo: (color: OKLCH) => oklabDistance(best, color) }
}
