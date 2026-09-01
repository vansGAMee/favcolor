import type { ReturnTypeOfColorModel } from './types'
import { colorCss, colorToHex } from '../color/color'

export function Discover({ model }: { model: ReturnTypeOfColorModel }) {
  const blind = model.pair.type === 'validation' || model.pair.type === 'repeated-control'
  return <main className="discover" id="discover-panel" role="tabpanel" aria-labelledby="discover-tab">
    <section className="discover-copy">
      <p className="eyebrow">Personal color study</p>
      <h1>You don’t know your<br />favorite color yet.</h1>
      <div className="state-line"><span className="pulse" />{model.modelState}<span>{model.choices.length} valid choices</span></div>
    </section>
    <section className="comparison" aria-label="Choose the color you prefer">
      {model.pair.displayed.map((color, index) => <button
        className="color-card"
        type="button"
        key={`${color.l}-${color.c}-${color.h}-${model.choices.length}-${index}`}
        aria-label={`Choose ${blind ? `color ${index + 1}` : colorToHex(color)}`}
        disabled={model.busy}
        onClick={() => void model.choose(index as 0 | 1)}
      >
        <span className="swatch" style={{ backgroundColor: colorCss(color) }} />
        <span className="color-meta">
          <span>{blind ? 'Code hidden for this check' : colorToHex(color)}</span>
          <span className="choose-label">Choose <span aria-hidden="true">↗</span></span>
        </span>
      </button>)}
    </section>
    <footer className="choice-footer"><span>{model.notice}</span><span>{blind ? 'Blind check' : 'Tap, compare, continue'}</span></footer>
  </main>
}
