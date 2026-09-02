import { useState } from 'react'
import type { ReturnTypeOfColorModel } from './types'
import { colorCss, colorToHex } from '../color/color'

export function Discover({ model }: { model: ReturnTypeOfColorModel }) {
  const blind = model.pair.type === 'validation' || model.pair.type === 'repeated-control'
  const [choiceMotion, setChoiceMotion] = useState<{ pair: ReturnTypeOfColorModel['pair']; index: number } | null>(null)
  const chosen = choiceMotion?.pair === model.pair ? choiceMotion.index : null
  const committedChoiceCount = model.busy ? Math.max(0, model.choices.length - 1) : model.choices.length
  const stage = model.choices.length < 16 ? 'Calibrating your range' : model.choices.length < 50 ? 'Mapping preference' : 'Refining your estimate'

  return <main className="discover" id="discover-panel" role="tabpanel" aria-labelledby="discover-tab">
    <section className="discover-copy">
      <div><p className="eyebrow">A private color study</p><h1>Which color feels<br />more like you?</h1></div>
      <div className="study-status"><span className="status-kicker"><i />{stage}</span><span className="choice-count" key={committedChoiceCount}><strong>{committedChoiceCount}</strong> valid choices</span></div>
    </section>
    <section className="comparison" aria-label="Choose the color you prefer">
      {model.pair.displayed.map((color, index) => <button
        className={`color-card${chosen === index ? ' is-chosen' : ''}${chosen !== null && chosen !== index ? ' is-dismissed' : ''}`}
        type="button"
        key={`${color.l}-${color.c}-${color.h}-${model.choices.length}-${index}`}
        aria-label={`Choose ${blind ? `color ${index + 1}` : colorToHex(color)}`}
        disabled={model.busy}
        onClick={() => { setChoiceMotion({ pair: model.pair, index }); void model.choose(index as 0 | 1) }}
      >
        <span className="swatch" style={{ backgroundColor: colorCss(color) }} />
        <span className="color-meta">
          <span className="option-index">0{index + 1}</span>
          <span className="color-code">{blind ? 'Color code hidden' : colorToHex(color)}</span>
          <span className="choose-label">Choose <span aria-hidden="true">→</span></span>
        </span>
      </button>)}
      <span className="versus" aria-hidden="true">or</span>
    </section>
    <footer className="choice-footer"><span className="notice-change" key={model.notice}>{model.notice}</span><span>{blind ? 'Blind consistency check' : 'Trust your first reaction'}</span></footer>
  </main>
}
