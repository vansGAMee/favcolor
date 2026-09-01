import { useRef } from 'react'
import type { ReturnTypeOfColorModel } from './types'
import { colorCss, colorToHex } from '../color/color'
import { HistoryGrid } from './HistoryGrid'

const metric = (value: number | undefined, format = (x: number) => x.toFixed(3)) => value === undefined || !Number.isFinite(value) ? 'Not enough evidence yet' : format(value)

export function You({ model }: { model: ReturnTypeOfColorModel }) {
  const input = useRef<HTMLInputElement>(null)
  const enough = (model.metrics?.count ?? 0) >= 8
  return <main className="you" id="you-panel" role="tabpanel" aria-labelledby="you-tab">
    <div className="you-heading"><div><p className="eyebrow">Your private model</p><h1>Your color,<br />in evidence.</h1></div><p>The model’s current best estimate under a standardized, on-device comparison procedure.</p></div>
    <section className="analytics-card">
      <div className="estimate-block">
        <div className="estimate-swatch" style={{ backgroundColor: colorCss(model.estimate) }} />
        <p className="eyebrow">Current core estimate</p>
        <div className="estimate-hex">{colorToHex(model.estimate)}</div>
        <div className="oklch">OKLCH {model.estimate.l.toFixed(3)} · {model.estimate.c.toFixed(3)} · {Math.round(model.estimate.h)}°</div>
        <span className="state-pill"><span className="pulse" />{model.modelState}</span>
      </div>
      <div className="metrics-grid">
        <article><span>Valid choices</span><strong>{model.choices.length}</strong><small>Stored on device</small></article>
        <article><span>Held-out predictions</span><strong>{enough ? model.metrics?.count : '—'}</strong><small>{enough ? 'Strictly future choices' : 'Not enough evidence yet'}</small></article>
        <article><span>Held-out accuracy</span><strong>{enough ? metric(model.metrics?.accuracy, value => `${(value * 100).toFixed(0)}%`) : '—'}</strong><small>{enough ? 'Chronological evaluation' : 'Not enough evidence yet'}</small></article>
        <article><span>Held-out log-loss</span><strong>{enough ? metric(model.metrics?.logLoss) : '—'}</strong><small>{enough ? `Linear ${metric(model.metrics?.baselineLogLoss)} · random ${metric(model.metrics?.randomLogLoss)}` : 'Not enough evidence yet'}</small></article>
        <article><span>Beats baseline</span><strong>{enough ? (model.metrics?.beatsBaseline ? 'Yes' : 'Not yet') : '—'}</strong><small>Neural vs linear + random</small></article>
        <article><span>Ensemble optimum spread</span><strong>{Number.isFinite(model.spread) ? model.spread.toFixed(3) : '—'}</strong><small>Mean OKLab distance</small></article>
      </div>
      <div className="effects-row"><span>Context</span><strong>{model.choices.length < 100 ? 'Not enough evidence yet' : model.contextActive ? 'Reliable time effect detected' : 'No reliable time effect detected'}</strong><span>Drift</span><strong>{model.choices.length < 100 ? 'Not enough evidence yet' : model.driftActive ? 'Slow component admitted' : 'No reliable drift detected'}</strong><span>Retest</span><strong>{model.readiness.controlConsistency === null ? 'Not enough evidence yet' : `${(model.readiness.controlConsistency * 100).toFixed(0)}% consistent · ${model.readiness.controlCount} checks`}</strong></div>
    </section>
    <HistoryGrid snapshots={model.snapshots} />
    <section className="data-panel">
      <div><p className="eyebrow">Local archive</p><h2>Your data stays yours.</h2><p>Choices, snapshots, and three independently seeded compact neural models live in IndexedDB on this browser.</p></div>
      <div className="data-actions">
        <button onClick={() => void model.exportData()}>Export JSON</button>
        <button onClick={() => input.current?.click()}>Import JSON</button>
        <input ref={input} hidden type="file" accept="application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void model.importData(file) }} />
        <button className="danger" onClick={() => { if (window.confirm('Reset all choices, models, and history on this device?')) void model.reset() }}>Reset local data</button>
      </div>
    </section>
    <p className="display-note">Physical color appearance varies across uncalibrated displays. For long-term comparison, use the same device and display settings.</p>
  </main>
}
