import type { ChoiceEvent, OKLCH } from '../app/types'
import { colorToHex, wrapHue } from '../color/color'

export type ColorFamilyKey = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink' | 'neutral'

export interface ColorFamilyStats {
  key: ColorFamilyKey
  exposures: number
  chosen: number
  crossFamilyComparisons: number
  crossFamilyWins: number
  winRate: number | null
  choiceShare: number
}

export interface ColorAtlas {
  totalComparisons: number
  uniqueRenderedColors: number
  coveredFamilies: number
  averageChosenLightness: number | null
  averageChosenChroma: number | null
  averageReactionTimeMs: number | null
  averageChosenHex: string | null
  distinctChosenColors: number
  chosenShades: ColorShadeStats[]
  rejectedShades: ColorShadeStats[]
  recentChosenHexes: string[]
  favoriteColors: FavoriteColorEvidence[]
  families: ColorFamilyStats[]
}

export interface ColorShadeStats {
  hex: string
  exposures: number
  chosen: number
  winRate: number
}

export interface FavoriteColorEvidence extends ColorShadeStats {
  color: OKLCH
  kind: 'color' | 'shade'
}

const familyOrder: ColorFamilyKey[] = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'neutral']

export function colorFamily(color: OKLCH): ColorFamilyKey {
  if (color.c < .04) return 'neutral'
  const hue = wrapHue(color.h)
  if (hue < 15 || hue >= 345) return 'red'
  if (hue < 60) return 'orange'
  if (hue < 105) return 'yellow'
  if (hue < 180) return 'green'
  if (hue < 235) return 'cyan'
  if (hue < 280) return 'blue'
  if (hue < 325) return 'purple'
  return 'pink'
}

const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

const hueDistance = (a: number, b: number) => {
  const distance = Math.abs(wrapHue(a) - wrapHue(b))
  return Math.min(distance, 360 - distance)
}

const averageColor = (colors: OKLCH[]): OKLCH => ({
  l: mean(colors.map(color => color.l))!,
  c: mean(colors.map(color => color.c))!,
  h: wrapHue(Math.atan2(
    colors.reduce((sum, color) => sum + Math.sin(color.h * Math.PI / 180), 0),
    colors.reduce((sum, color) => sum + Math.cos(color.h * Math.PI / 180), 0),
  ) * 180 / Math.PI),
})

const evidenceCell = (color: OKLCH) => {
  const lightness = color.l < .45 ? 0 : color.l < .7 ? 1 : 2
  if (color.c < .045) return `neutral-${lightness}`
  const hue = Math.floor(wrapHue(color.h + 15) / 30) % 12
  const chroma = color.c < .12 ? 0 : 1
  return `${hue}-${lightness}-${chroma}`
}

export function buildFavoriteColors(choices: ChoiceEvent[], primary?: OKLCH): FavoriteColorEvidence[] {
  const cells = new Map<string, { exposures: number; chosen: OKLCH[] }>()
  for (const choice of choices) {
    if (choice.pairType === 'repeated-control') continue
    for (const color of [choice.colorA, choice.colorB]) {
      const key = evidenceCell(color)
      const cell = cells.get(key) ?? { exposures: 0, chosen: [] }
      cell.exposures++
      cells.set(key, cell)
    }
    const winner = choice.chosen === 'a' ? choice.colorA : choice.colorB
    cells.get(evidenceCell(winner))!.chosen.push(winner)
  }
  const candidates = [...cells.values()].filter(cell => cell.exposures >= 3 && cell.chosen.length >= 2)
    .map(cell => {
      const color = averageColor(cell.chosen)
      const winRate = cell.chosen.length / cell.exposures
      return { color, hex: colorToHex(color), exposures: cell.exposures, chosen: cell.chosen.length, winRate, kind: 'color' as const }
    })
    .filter(candidate => candidate.winRate >= .5)
    .sort((a, b) => (b.winRate * Math.log2(b.chosen + 1)) - (a.winRate * Math.log2(a.chosen + 1)))

  const selected: FavoriteColorEvidence[] = []
  for (const candidate of candidates) {
    if (selected.length >= 4) break
    const anchors = [...(primary ? [primary] : []), ...selected.map(item => item.color)]
    let kind: FavoriteColorEvidence['kind'] = 'color'
    let acceptable = true
    for (const anchor of anchors) {
      const neutral = Math.min(anchor.c, candidate.color.c) < .045
      const differentHue = !neutral && hueDistance(anchor.h, candidate.color.h) >= 38
      const distinctNeutral = neutral && Math.abs(anchor.c - candidate.color.c) >= .055
      if (differentHue || distinctNeutral) continue
      const distinctShade = Math.abs(anchor.l - candidate.color.l) >= .18 || Math.abs(anchor.c - candidate.color.c) >= .09
      if (distinctShade && candidate.chosen >= 4 && candidate.winRate >= .58) { kind = 'shade'; continue }
      acceptable = false
      break
    }
    if (acceptable) selected.push({ ...candidate, kind })
  }
  return selected
}

export function buildColorAtlas(choices: ChoiceEvent[], primary?: OKLCH): ColorAtlas {
  const usable = choices.filter(choice => choice.pairType !== 'repeated-control')
  const families = new Map(familyOrder.map(key => [key, {
    key, exposures: 0, chosen: 0, crossFamilyComparisons: 0, crossFamilyWins: 0,
  }]))
  const rendered = new Set<string>()
  const shades = new Map<string, { exposures: number; chosen: number }>()
  const chosenColors: OKLCH[] = []
  const recentChosenHexes: string[] = []
  const reactionTimes: number[] = []

  for (const choice of usable) {
    const aFamily = colorFamily(choice.colorA)
    const bFamily = colorFamily(choice.colorB)
    const chosenColor = choice.chosen === 'a' ? choice.colorA : choice.colorB
    const aHex = colorToHex(choice.colorA)
    const bHex = colorToHex(choice.colorB)
    const chosenHex = choice.chosen === 'a' ? aHex : bHex
    const chosenFamily = choice.chosen === 'a' ? aFamily : bFamily
    families.get(aFamily)!.exposures++
    families.get(bFamily)!.exposures++
    families.get(chosenFamily)!.chosen++
    rendered.add(aHex)
    rendered.add(bHex)
    for (const hex of [aHex, bHex]) {
      const shade = shades.get(hex) ?? { exposures: 0, chosen: 0 }
      shade.exposures++
      shades.set(hex, shade)
    }
    shades.get(chosenHex)!.chosen++
    recentChosenHexes.push(chosenHex)
    chosenColors.push(chosenColor)
    if (Number.isFinite(choice.reactionTimeMs) && choice.reactionTimeMs >= 0) reactionTimes.push(choice.reactionTimeMs)

    if (aFamily !== bFamily) {
      families.get(aFamily)!.crossFamilyComparisons++
      families.get(bFamily)!.crossFamilyComparisons++
      families.get(chosenFamily)!.crossFamilyWins++
    }
  }

  const result = familyOrder.map(key => {
    const family = families.get(key)!
    return {
      ...family,
      winRate: family.crossFamilyComparisons ? family.crossFamilyWins / family.crossFamilyComparisons : null,
      choiceShare: usable.length ? family.chosen / usable.length : 0,
    }
  })

  const shadeStats = [...shades].map(([hex, shade]) => ({
    hex,
    ...shade,
    winRate: shade.exposures ? shade.chosen / shade.exposures : 0,
  }))
  const chosenShades = shadeStats.filter(shade => shade.chosen > 0)
    .sort((a, b) => b.chosen - a.chosen || b.winRate - a.winRate || b.exposures - a.exposures)
  const rejectedShades = shadeStats.filter(shade => shade.chosen === 0)
    .sort((a, b) => b.exposures - a.exposures || a.hex.localeCompare(b.hex))
  const averageChosenHex = chosenColors.length ? colorToHex(averageColor(chosenColors)) : null

  return {
    totalComparisons: usable.length,
    uniqueRenderedColors: rendered.size,
    coveredFamilies: result.filter(family => family.exposures > 0).length,
    averageChosenLightness: mean(chosenColors.map(color => color.l)),
    averageChosenChroma: mean(chosenColors.map(color => color.c)),
    averageReactionTimeMs: mean(reactionTimes),
    averageChosenHex,
    distinctChosenColors: chosenShades.length,
    chosenShades,
    rejectedShades,
    recentChosenHexes: [...new Set(recentChosenHexes.reverse())].slice(0, 12),
    favoriteColors: buildFavoriteColors(usable, primary),
    families: result,
  }
}
