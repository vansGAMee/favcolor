import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChoiceEvent, DailySnapshot, ModelState, OKLCH, TrainingExample, ValidationMetrics } from './types'
import { colorToHex, oklabDistance } from '../color/color'
import { ensureUsefulRenderedPair } from '../color/displayPair'
import { generateCandidatePool } from '../ml/activeLearning/candidates'
import { selectActivePair } from '../ml/activeLearning/select'
import { PreferenceEnsemble, type SerializedEnsemble } from '../ml/ensemble/ensemble'
import { searchOptimum } from '../ml/preference/search'
import { evaluateFactors, rollingValidation } from '../ml/validation/validation'
import { assessReadiness } from '../ml/validation/readiness'
import { ColorDatabase } from '../storage/db'
import { collectTrainingObservation } from '../data/trainingCollection'
import { insertTrainingSession } from '../data/supabaseClient'
import { selectControlSource } from '../ml/activeLearning/controlSchedule'
import { localChallenge } from '../ml/activeLearning/localChallenge'

type DisplayPair = { canonical: readonly [OKLCH, OKLCH]; displayed: readonly [OKLCH, OKLCH]; leftColor: 'a' | 'b'; type: ChoiceEvent['pairType']; startedAt: number }

const db = new ColorDatabase()
const pool = generateCandidatePool(620, 20260901)
const initialColor = { l: 0.64, c: 0.17, h: 280 }

function asTraining(choice: ChoiceEvent): TrainingExample {
  return {
    a: choice.colorA, b: choice.colorB, chosenA: choice.chosen === 'a' ? 1 : 0,
    timestamp: choice.timestamp, localHour: choice.localHour, weekday: choice.weekday,
    elapsedDays: choice.elapsedSinceStartMs / 86_400_000, pairType: choice.pairType,
  }
}

function controlExpectedChoice(event: ChoiceEvent, previousChoices: ChoiceEvent[]) {
  if (event.pairType !== 'repeated-control') return undefined
  const same = (a: OKLCH, b: OKLCH) => a.l === b.l && a.c === b.c && a.h === b.h
  return [...previousChoices].reverse().find(choice => choice.pairType !== 'repeated-control' && same(choice.colorA, event.colorA) && same(choice.colorB, event.colorB))?.chosen
}

function pairFor(ensemble: PreferenceEnsemble, choices: ChoiceEvent[], typeOverride?: ChoiceEvent['pairType']): DisplayPair {
  let type: ChoiceEvent['pairType'] = typeOverride ?? 'normal'
  const canonical = ensureUsefulRenderedPair(attempt => {
    if (attempt > 0) {
      if (type === 'repeated-control' || type === 'local-challenge' || type === 'boundary-validation') type = 'normal'
      return selectActivePair(ensemble, pool, choices.flatMap(choice => [choice.colorA, choice.colorB]), choices.length * 7919 + 17 + attempt * 104729)
    }
    const optimum = searchOptimum(ensemble, 360, choices.length + 901, { choices })
    if (optimum.boundaryValidation) {
      type = 'boundary-validation'
      return optimum.boundaryValidation.pair
    }
    if (choices.length > 3 && choices.length % 11 === 10) {
      const old = selectControlSource(choices)
      type = 'repeated-control'
      return [old.colorA, old.colorB]
    }
    if (choices.length > 31 && choices.length % 13 === 12) {
      type = 'local-challenge'
      return localChallenge({ l: optimum.l, c: optimum.c, h: optimum.h }, choices.length)
    }
    if (choices.length > 5 && choices.length % 7 === 6) type = 'validation'
    return selectActivePair(ensemble, pool, choices.flatMap(choice => [choice.colorA, choice.colorB]), choices.length * 7919 + 17)
  })
  const swap = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0
  return { canonical, displayed: swap ? [canonical[1], canonical[0]] : canonical, leftColor: swap ? 'b' : 'a', type, startedAt: performance.now() }
}

export function useColorModel() {
  const ensembleRef = useRef(new PreferenceEnsemble(611))
  const appStart = useRef(Date.now())
  const [choices, setChoices] = useState<ChoiceEvent[]>([])
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [pair, setPair] = useState<DisplayPair>(() => pairFor(ensembleRef.current, []))
  const [estimate, setEstimate] = useState<OKLCH>(initialColor)
  const [spread, setSpread] = useState(Number.NaN)
  const [unsupportedExtrapolation, setUnsupportedExtrapolation] = useState(false)
  const [metrics, setMetrics] = useState<ValidationMetrics | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('All learning stays on this device.')
  const [error, setError] = useState<string | null>(null)
  const [contextActive, setContextActive] = useState(false)
  const [driftActive, setDriftActive] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const hydrate = useCallback(async () => {
    try {
      const storedChoices = (await db.getChoices()).sort((a, b) => a.timestamp - b.timestamp)
      const storedSnapshots = await db.getSnapshots()
      const serialized = await db.getModel()
      const legacyModel = Array.isArray(serialized) && serialized.length === 5 && serialized.every(model => model && typeof model === 'object' && 'version' in model && model.version === 2)
      const checkpoint = serialized && typeof serialized === 'object' && !Array.isArray(serialized) && 'version' in serialized && serialized.version === 1 && 'models' in serialized
      if (legacyModel || checkpoint) ensembleRef.current = new PreferenceEnsemble(611, serialized as SerializedEnsemble)
      else if (storedChoices.length) ensembleRef.current.train(storedChoices.map(asTraining), 10)
      if (storedChoices.length) appStart.current = Math.min(...storedChoices.map(choice => choice.timestamp - choice.elapsedSinceStartMs))
      const optimum = searchOptimum(ensembleRef.current, 500, storedChoices.length + 1, { choices: storedChoices })
      const validation = rollingValidation(storedChoices.map(asTraining))
      setChoices(storedChoices)
      setSnapshots(storedSnapshots)
      setEstimate(optimum)
      setSpread(optimum.spread)
      setUnsupportedExtrapolation(Boolean(optimum.boundaryValidation))
      setMetrics(validation)
      if (storedChoices.length) setPair(pairFor(ensembleRef.current, storedChoices))
      if (storedChoices.length >= 100) {
        const factors = evaluateFactors(storedChoices.map(asTraining))
        setContextActive(factors.context.active)
        setDriftActive(factors.drift.active)
      }
      setHydrated(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load local data') }
  }, [])

  useEffect(() => { void hydrate() }, [hydrate])

  const choose = async (displayedIndex: 0 | 1) => {
    if (busy || !hydrated) return
    setBusy(true)
    const predictionA = ensembleRef.current.probability(pair.canonical[0], pair.canonical[1])
    const canonicalChosen: 'a' | 'b' = displayedIndex === 0 ? pair.leftColor : pair.leftColor === 'a' ? 'b' : 'a'
    const now = new Date()
    const event: ChoiceEvent = {
      id: crypto.randomUUID(), colorA: pair.canonical[0], colorB: pair.canonical[1], chosen: canonicalChosen,
      timestamp: now.getTime(), localHour: now.getHours(), weekday: now.getDay(), elapsedSinceStartMs: Math.max(now.getTime() - appStart.current, choices.at(-1)?.elapsedSinceStartMs ?? 0),
      reactionTimeMs: Math.max(0, performance.now() - pair.startedAt), leftColor: pair.leftColor, modelVersion: 2, pairType: pair.type,
      distance: oklabDistance(pair.canonical[0], pair.canonical[1]),
    }
    const nextChoices = [...choices, event]
    setChoices(nextChoices)
    setNotice(`Choice recorded · ${colorToHex(pair.displayed[displayedIndex])}`)
    try {
      await db.addChoice(event)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      ensembleRef.current.train([asTraining(event)], choices.length < 20 ? 7 : 4)
      setPair(pairFor(ensembleRef.current, nextChoices))
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      const optimum = searchOptimum(ensembleRef.current, 520, nextChoices.length + 101, { choices: nextChoices })
      const validation = rollingValidation(nextChoices.map(asTraining))
      const extrapolationPending = Boolean(optimum.boundaryValidation)
      const modelState = assessReadiness(nextChoices, validation, optimum.spread, { unsupportedExtrapolation: extrapolationPending }).state
      const date = now.toLocaleDateString('en-CA')
      const snapshotColor: OKLCH = { l: optimum.l, c: optimum.c, h: optimum.h }
      const snapshot: DailySnapshot = { date, color: snapshotColor, hex: colorToHex(snapshotColor), state: modelState, totalChoices: nextChoices.length, validation }
      await db.saveModel(ensembleRef.current.serialize())
      await db.saveSnapshot(snapshot)
      const nextSnapshots = [...snapshots.filter(item => item.date !== date), snapshot].sort((a, b) => a.date.localeCompare(b.date))
      setSnapshots(nextSnapshots)
      setEstimate(optimum)
      setSpread(optimum.spread)
      setUnsupportedExtrapolation(extrapolationPending)
      setMetrics(validation)
      void collectTrainingObservation({
        colorA: event.colorA, colorB: event.colorB, chosen: event.chosen, predictionA,
        modelVersion: event.modelVersion, pairType: event.pairType,
        chosenSide: displayedIndex === 0 ? 'left' : 'right', reactionTimeMs: event.reactionTimeMs,
        controlExpectedChoice: controlExpectedChoice(event, choices),
      }, insertTrainingSession)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your choice') }
    finally { setBusy(false) }
  }

  const exportData = async () => {
    const blob = new Blob([await db.exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `your-color-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => { await db.importJson(await file.text()); await hydrate(); setNotice('Local archive imported.') }
  const reset = async () => { await db.reset(); ensembleRef.current = new PreferenceEnsemble(611); appStart.current = Date.now(); setChoices([]); setSnapshots([]); setMetrics(null); setEstimate(initialColor); setSpread(Number.NaN); setUnsupportedExtrapolation(false); setPair(pairFor(ensembleRef.current, [])); setNotice('Local data reset.') }

  const readiness = assessReadiness(choices, metrics, spread, { unsupportedExtrapolation })
  return {
    choices, snapshots, pair, estimate, spread, metrics, busy, hydrated, notice, error, contextActive, driftActive,
    modelState: readiness.state, readiness, choose, exportData, importData, reset,
  }
}
