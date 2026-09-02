import { useRef, type CSSProperties } from 'react'
import type { ReturnTypeOfColorModel } from './types'
import { colorCss, colorToHex } from '../color/color'
import { HistoryGrid } from './HistoryGrid'
import { EvolutionChart } from './EvolutionChart'

const metric = (value: number | undefined, format = (x: number) => x.toFixed(3)) => value === undefined || !Number.isFinite(value) ? 'Not enough evidence yet' : format(value)

export function You({ model }: { model: ReturnTypeOfColorModel }) {
  const input = useRef<HTMLInputElement>(null)
  const enough = (model.metrics?.count ?? 0) >= 8
  const estimateHex = colorToHex(model.estimate)
  const stable = model.modelState === 'Ready'
  const accuracy = enough && model.metrics?.accuracy !== undefined ? model.metrics.accuracy : null
  const loss = enough && model.metrics?.logLoss !== undefined ? model.metrics.logLoss : null
  return <main className="you" id="you-panel" role="tabpanel" aria-labelledby="you-tab">
    <div className="you-heading"><div><p className="eyebrow">Your private model</p><h1>Your color,<br />made visible.</h1></div><p>A living estimate built from your choices—not a personality quiz, and never uploaded.</p></div>
    <section className="profile-grid" style={{ '--estimate-color': estimateHex } as CSSProperties}>
      <article className="estimate-block">
        <div className="estimate-topline"><span>{stable ? 'Stable estimate' : 'Candidate estimate'}</span><span className="state-pill"><i />{model.modelState}</span></div>
        <div className="estimate-swatch" style={{ backgroundColor: colorCss(model.estimate) }}><span>{stable ? 'Current color' : 'Still learning'}</span></div>
        <div className="estimate-details"><div><p className="eyebrow">Current color</p><div className="estimate-hex">{estimateHex}</div></div><div className="oklch"><span>OKLCH</span><strong>{model.estimate.l.toFixed(3)}</strong><strong>{model.estimate.c.toFixed(3)}</strong><strong>{Math.round(model.estimate.h)}°</strong></div></div>
      </article>
      <section className="learning-panel" aria-labelledby="learning-title">
        <div className="section-heading compact-heading"><div><p className="eyebrow">Live model evidence</p><h2 id="learning-title">Learning analytics</h2></div><span>Chronological · local</span></div>
        <div className="metrics-grid">
          <article className="metric-primary"><span>Valid choices</span><strong>{model.choices.length}</strong><small>Stored only on this device</small><div className="choice-track"><i style={{ width: `${Math.min(100, model.choices.length)}%` }} /></div></article>
          <article><span>Held-out accuracy</span><strong>{accuracy === null ? '—' : `${(accuracy * 100).toFixed(0)}%`}</strong><small>{enough ? `${model.metrics?.count} strictly future predictions` : 'Not enough evidence yet'}</small><div className="metric-track"><i style={{ width: `${accuracy === null ? 0 : accuracy * 100}%` }} /></div></article>
          <article><span>Held-out log-loss</span><strong>{loss === null ? '—' : metric(loss)}</strong><small>{enough ? `Linear ${metric(model.metrics?.baselineLogLoss)} · random ${metric(model.metrics?.randomLogLoss)}` : 'Not enough evidence yet'}</small><div className="metric-track inverse"><i style={{ width: `${loss === null ? 0 : Math.max(0, Math.min(100, (1 - loss) * 100))}%` }} /></div></article>
          <article><span>Optimum spread</span><strong>{Number.isFinite(model.spread) ? model.spread.toFixed(3) : '—'}</strong><small>Mean OKLab distance</small></article>
          <article><span>Beats baseline</span><strong>{enough ? (model.metrics?.beatsBaseline ? 'Yes' : 'Not yet') : '—'}</strong><small>Neural vs linear + random</small></article>
          <article><span>Model state</span><strong className="text-metric">{model.modelState}</strong><small>{stable ? 'Estimate is release-stable' : 'Candidate, still adapting'}</small></article>
        </div>
        <div className="effects-row"><div><span>Context</span><strong>{model.choices.length < 100 ? 'Not enough evidence yet' : model.contextActive ? 'Reliable time effect detected' : 'No reliable time effect detected'}</strong></div><div><span>Drift</span><strong>{model.choices.length < 100 ? 'Not enough evidence yet' : model.driftActive ? 'Slow component admitted' : 'No reliable drift detected'}</strong></div><div><span>Retest</span><strong>{model.readiness.controlConsistency === null ? 'Not enough evidence yet' : `${(model.readiness.controlConsistency * 100).toFixed(0)}% consistent · ${model.readiness.controlCount} checks`}</strong></div></div>
      </section>
    </section>
    <section className="insights-grid"><HistoryGrid snapshots={model.snapshots} /><EvolutionChart snapshots={model.snapshots} /></section>
    <section className="data-panel">
      <div><p className="eyebrow">Local archive</p><h2>Your data stays yours.</h2><p>Choices, snapshots, and five independently seeded models live in IndexedDB in this browser.</p></div>
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
