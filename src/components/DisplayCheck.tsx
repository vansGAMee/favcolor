import { useState } from 'react'
import { translate, type Language } from '../app/i18n'

export const DISPLAY_CHECK_KEY = 'favcolor-display-check-v2'

export function DisplayCheck({ language, onFinish }: { language: Language; onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const [toneAnswer, setToneAnswer] = useState<'clear' | 'merged' | null>(null)
  const [grayAnswer, setGrayAnswer] = useState<'neutral' | 'tinted' | null>(null)
  const t = (english: string, russian: string) => translate(language, english, russian)
  return <main className="display-check">
    <section className="display-check-card" aria-labelledby="display-check-title">
      <div className="display-check-progress" aria-label={t(`Step ${step + 1} of 2`, `Шаг ${step + 1} из 2`)}><i className={step === 0 ? 'active' : ''} /><i className={step === 1 ? 'active' : ''} /></div>
      <p className="eyebrow">{t('A quick screen check', 'Быстрая проверка')}</p>
      <h1 id="display-check-title">{t('Display check', 'Проверка экрана')}</h1>
      <p className="display-check-truth">{t('This check cannot make colors identical on different screens. It helps you spot display settings that could distort your choices.', 'Эта проверка не может сделать цвета одинаковыми на разных экранах. Она помогает заметить настройки, которые могут искажать ваш выбор.')}</p>
      <details className="oled-advice">
        <summary>{t('Using an OLED screen?', 'Если у вас OLED')}</summary>
        <ul>
          <li>{t('Choose Standard, Natural, or sRGB mode—not Vivid.', 'Выберите Стандартный, Естественный или sRGB — не Яркий режим.')}</li>
          <li>{t('Use a comfortable fixed brightness and disable auto-brightness while choosing.', 'Используйте комфортную фиксированную яркость и выключите автояркость на время выбора.')}</li>
          <li>{t('Disable Night Light, Eye Comfort, True Tone, and color enhancement.', 'Отключите ночной режим, защиту зрения, True Tone и усиление цветов.')}</li>
          <li>{t('Avoid judging color in direct sunlight; ambient light changes perception.', 'Не оценивайте цвет под прямым солнцем: освещение меняет восприятие.')}</li>
        </ul>
      </details>
      {step === 0 ? <>
        <p>{t('Can you distinguish the neighboring dark squares?', 'Различаются ли соседние тёмные квадраты?')}</p>
        <div className="tone-check" aria-label={t('Dark-to-light tone scale', 'Шкала от тёмного к светлому')}>{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ background: `rgb(${10 + index * 28} ${10 + index * 28} ${12 + index * 27})` }} />)}</div>
        <div className="check-answers"><button className={toneAnswer === 'clear' ? 'selected' : ''} onClick={() => setToneAnswer('clear')}>{t('Yes, clearly', 'Да, отчётливо')}</button><button className={toneAnswer === 'merged' ? 'selected' : ''} onClick={() => setToneAnswer('merged')}>{t('Some merge together', 'Часть сливается')}</button></div>
        {toneAnswer === 'merged' && <p className="check-advice" role="status">{t('Lower screen brightness or disable extra-contrast mode until adjacent squares separate.', 'Уменьшите яркость экрана или отключите повышенный контраст, пока соседние квадраты не станут различимы.')}</p>}
      </> : <>
        <p>{t('Does the center gray look neutral, without a warm or cool tint?', 'Серый в центре выглядит нейтральным, без тёплого или холодного оттенка?')}</p>
        <div className="hue-check" aria-label={t('Color and neutral-gray check', 'Проверка цветов и нейтрального серого')}><i /><i /><i /><i /><i /></div>
        <div className="check-answers"><button className={grayAnswer === 'neutral' ? 'selected' : ''} onClick={() => setGrayAnswer('neutral')}>{t('Gray looks neutral', 'Серый нейтральный')}</button><button className={grayAnswer === 'tinted' ? 'selected' : ''} onClick={() => setGrayAnswer('tinted')}>{t('Gray looks tinted', 'Серый имеет оттенок')}</button></div>
        {grayAnswer === 'tinted' && <p className="check-advice" role="status">{t('Disable Night Light, True Tone, vivid mode, and other color filters. The app cannot correct these reliably.', 'Отключите ночной режим, True Tone, яркий режим и другие цветовые фильтры. Приложение не может надёжно исправить их.')}</p>}
      </>}
      <div className="display-check-actions"><button className="secondary" onClick={onFinish}>{t('Skip', 'Пропустить')}</button><button onClick={() => step === 0 ? setStep(1) : onFinish()}>{step === 0 ? t('Continue', 'Далее') : t('Done', 'Готово')}</button></div>
    </section>
  </main>
}
