import { useState } from 'react'
import { translate, type Language } from '../app/i18n'

export const DISPLAY_CHECK_KEY = 'favcolor-display-check-v1'

export function DisplayCheck({ language, onFinish }: { language: Language; onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const t = (english: string, russian: string) => translate(language, english, russian)
  return <main className="display-check">
    <section className="display-check-card" aria-labelledby="display-check-title">
      <div className="display-check-progress" aria-label={t(`Step ${step + 1} of 2`, `Шаг ${step + 1} из 2`)}><i className={step === 0 ? 'active' : ''} /><i className={step === 1 ? 'active' : ''} /></div>
      <p className="eyebrow">{t('A quick screen check', 'Быстрая проверка')}</p>
      <h1 id="display-check-title">{t('Display check', 'Проверка экрана')}</h1>
      {step === 0 ? <>
        <p>{t('Make sure every dark square is distinguishable and the light end is not washed out.', 'Убедитесь, что различимы все тёмные квадраты, а светлые не сливаются.')}</p>
        <div className="tone-check" aria-label={t('Dark-to-light tone scale', 'Шкала от тёмного к светлому')}>{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ background: `rgb(${10 + index * 28} ${10 + index * 28} ${12 + index * 27})` }} />)}</div>
        <small>{t('Adjust brightness only if the first or last squares disappear.', 'Настройте яркость, только если крайние квадраты не видны.')}</small>
      </> : <>
        <p>{t('These colors should look distinct and the gray center should stay neutral.', 'Цвета должны различаться, а серый в центре — оставаться нейтральным.')}</p>
        <div className="hue-check" aria-label={t('Color and neutral-gray check', 'Проверка цветов и нейтрального серого')}><i /><i /><i /><i /><i /></div>
        <small>{t('For fair comparisons, turn off Night Light and other color filters.', 'Для точного сравнения выключите ночной режим и цветовые фильтры.')}</small>
      </>}
      <div className="display-check-actions"><button className="secondary" onClick={onFinish}>{t('Skip', 'Пропустить')}</button><button onClick={() => step === 0 ? setStep(1) : onFinish()}>{step === 0 ? t('Continue', 'Далее') : t('Done', 'Готово')}</button></div>
    </section>
  </main>
}
