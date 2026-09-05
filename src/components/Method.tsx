import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { translate, type Language } from '../app/i18n'

gsap.registerPlugin(useGSAP)

const recoveryRows = [
  { label: ['Targets recovered', 'Найдено целей'], before: '75%', after: '100%', width: 100 },
  { label: ['Mean OKLab error', 'Средняя ошибка OKLab'], before: '0.118', after: '0.078', width: 66 },
  { label: ['Worst coverage gap', 'Худший пробел охвата'], before: '0.251', after: '0.053', width: 21 },
  { label: ['Recent pair diversity', 'Разнообразие последних пар'], before: '0.239', after: '0.644', width: 100 },
  { label: ['Near-repeat count', 'Почти одинаковых пар'], before: '25.3', after: '8.8', width: 35 },
]

const targetRows = [
  { label: 'Cyan', before: '0.158', after: '0.097', change: '-39%' },
  { label: 'Red', before: '0.269', after: '0.192', change: '-29%' },
  { label: 'Purple', before: '0.185', after: '0.201', change: '+8%', regressed: true },
  { label: 'Boundary', before: '0.139', after: '0.143', change: '+3%', regressed: true },
]

const candidateRows = [
  { label: ['Balanced accuracy', 'Сбалансированная точность'], production: '0.563', candidate: '0.547' },
  { label: ['AUC', 'AUC'], production: '0.602', candidate: '0.565' },
  { label: ['Log-loss', 'Log-loss'], production: '0.663', candidate: '0.682' },
]

const checkpoints = {
  50: { error: '0.236', loss: '0.743', coverage: '0.991' },
  100: { error: '0.160', loss: '0.696', coverage: '0.944' },
  150: { error: '0.186', loss: '0.673', coverage: '0.956' },
} as const

function MethodSeo({ language }: { language: Language }) {
  useEffect(() => {
    const title = language === 'ru' ? 'Как работает Favcolor | Нейросеть выбора цвета' : 'How Favcolor Works | A Neural Color Preference Model'
    const description = language === 'ru'
      ? 'Метод, архитектура, реальные тесты и история разработки локальной нейросети Favcolor.'
      : 'Method, architecture, real benchmarks, and development history of Favcolor’s local neural preference model.'
    const previousTitle = document.title
    document.title = title
    const restorers: Array<() => void> = []
    const ensureMeta = (selector: string, attribute: string, value: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(selector)
      const previous = node?.getAttribute(attribute)
      if (!node) {
        node = document.createElement('meta')
        const [name, key] = selector.includes('property=') ? ['property', selector.match(/property="([^"]+)/)?.[1]] : ['name', selector.match(/name="([^"]+)/)?.[1]]
        if (key) node.setAttribute(name, key)
        node.dataset.methodSeo = 'true'
        document.head.appendChild(node)
      }
      node.setAttribute(attribute, value)
      restorers.push(() => previous === null || previous === undefined ? node?.removeAttribute(attribute) : node?.setAttribute(attribute, previous))
    }
    ensureMeta('meta[name="description"]', 'content', description)
    ensureMeta('meta[property="og:title"]', 'content', title)
    ensureMeta('meta[property="og:description"]', 'content', description)
    ensureMeta('meta[property="og:url"]', 'content', 'https://favcolor-eight.vercel.app/how-it-works')
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      canonical.dataset.methodSeo = 'true'
      document.head.appendChild(canonical)
    }
    canonical.href = 'https://favcolor-eight.vercel.app/how-it-works'
    const structuredData = document.createElement('script')
    structuredData.type = 'application/ld+json'
    structuredData.dataset.methodSeo = 'true'
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: title,
      description,
      dateModified: '2026-09-05',
      inLanguage: language,
      isPartOf: { '@type': 'WebSite', name: 'Favcolor', url: 'https://favcolor-eight.vercel.app/' },
      mainEntityOfPage: 'https://favcolor-eight.vercel.app/how-it-works',
    })
    document.head.appendChild(structuredData)
    return () => {
      document.title = previousTitle
      restorers.forEach(restore => restore())
      if (previousCanonical) canonical?.setAttribute('href', previousCanonical)
      document.head.querySelectorAll('[data-method-seo="true"]').forEach(node => node.remove())
    }
  }, [language])
  return null
}

export function Method({ language }: { language: Language }) {
  const root = useRef<HTMLElement>(null)
  const [checkpoint, setCheckpoint] = useState<keyof typeof checkpoints>(100)
  const t = (english: string, russian: string) => translate(language, english, russian)
  const steps = [
    [t('Choose', 'Выбор'), t('Two displayable colors. One instinctive tap.', 'Два доступных экрану цвета. Один интуитивный выбор.')],
    [t('Update', 'Обучение'), t('Five neural networks learn from the pair.', 'Пять нейросетей обучаются на этой паре.')],
    [t('Challenge', 'Проверка'), t('The next pair tests uncertainty and unexplored gamut.', 'Следующая пара проверяет сомнения и новые области цвета.')],
    [t('Validate', 'Готовность'), t('Future answers decide whether the estimate holds.', 'Будущие ответы показывают, устойчива ли оценка.')],
  ]
  const history = [
    ['02.09', t('Neural foundation', 'Нейронная основа'), t('A five-network preference ensemble, pairwise loss, custom backpropagation, and local checkpoints completed the first learning loop.', 'Ансамбль из пяти сетей, парная функция потерь, собственное обратное распространение и локальные checkpoints замкнули первый цикл обучения.')],
    ['02.09', t('Gray lost its imaginary hue', 'Серый лишился несуществующего оттенка'), t('Hue features now fade with chroma. Gray endpoints after warm-up fell from 22.18% to 0.49%.', 'Признаки оттенка теперь затухают вместе с насыщенностью. Серые варианты после разогрева сократились с 22,18% до 0,49%.')],
    ['02.09', t('Exploration learned to disagree', 'Исследование научилось возражать'), t('Coverage challengers and novelty protection made recovery from an early wrong region possible.', 'Проверка новых областей и защита от повторов позволили выходить из ранней ошибочной области.')],
    ['02.09', t('Anonymous research packets', 'Анонимные исследовательские пакеты'), t('Opt-in collection began excluding repeated controls and collapsed rendered pairs from training exports.', 'Добровольный сбор начал исключать контрольные повторы и пары, схлопнувшиеся на экране.')],
    ['04.09', t('Display honesty', 'Честность отображения'), t('A display check and OLED guidance made screen limitations visible instead of pretending every device is identical.', 'Проверка экрана и рекомендации для OLED сделали ограничения дисплея явными, не притворяясь, что все устройства одинаковы.')],
    ['04.09', t('Method made public', 'Метод стал публичным'), t('Architecture, benchmarks, limitations, and the model’s namesake became part of the product.', 'Архитектура, тесты, ограничения и имя модели стали частью продукта.')],
    ['05.09', t('Result sharing without identity', 'Публичный цвет без личности'), t('A minimal validated URL can restore a color without containing history, choices, or training data.', 'Минимальная проверяемая ссылка восстанавливает цвет без истории, выборов и обучающих данных.')],
    ['05.09', t('Unsupported boundaries rejected', 'Неподтверждённые границы отклонены'), t('The final search stopped rewarding extreme regions that the user had never meaningfully compared.', 'Финальный поиск перестал награждать крайние области, которые пользователь ни разу содержательно не сравнивал.')],
  ]

  const playSignal = () => {
    if (!root.current || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const layers = root.current.querySelectorAll('.method-network-layer')
    gsap.timeline()
      .set(layers, { opacity: .22 })
      .to(layers, { opacity: 1, scale: 1.08, duration: .18, stagger: .12, ease: 'power2.out' })
      .to(layers, { scale: 1, duration: .28, stagger: .06, ease: 'power2.out' }, '-=.16')
  }

  useGSAP(() => {
    if (typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const mm = gsap.matchMedia()
    mm.add('(min-width: 701px)', () => {
      gsap.from('.method-hero-copy > *', { y: 28, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out' })
      gsap.from('.method-network', { y: 20, opacity: 0, scale: .985, duration: 1, ease: 'power3.out', delay: .16 })
      gsap.utils.toArray<HTMLElement>('.method-step').forEach((step, index) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 56%',
          end: 'bottom 48%',
          onToggle: self => {
            if (!self.isActive) return
            gsap.to('.method-step', { opacity: .35, x: 0, duration: .25 })
            gsap.to(step, { opacity: 1, x: 6, duration: .35, ease: 'power2.out' })
            gsap.to('.method-network-layer', { opacity: (_, el) => Number((el as HTMLElement).dataset.layer) <= index ? 1 : .22, duration: .35, stagger: .03 })
          },
          onLeaveBack: () => {
            if (index !== 0) return
            gsap.to('.method-step, .method-network-layer', { opacity: 1, x: 0, duration: .3, ease: 'power2.out' })
          },
        })
      })
    })
    gsap.utils.toArray<HTMLElement>('.method-reveal').forEach(section => {
      gsap.from(section, { y: 24, opacity: 0, duration: .65, ease: 'power2.out', scrollTrigger: { trigger: section, start: 'top 86%', once: true } })
    })
    gsap.from('.method-data-row', { x: -16, opacity: 0, duration: .45, stagger: .06, ease: 'power2.out', scrollTrigger: { trigger: '.method-comparison', start: 'top 82%', once: true } })
    return () => mm.revert()
  }, { scope: root, dependencies: [language], revertOnUpdate: true })

  return <main ref={root} className="method-page" id="method-panel" role="tabpanel" aria-labelledby="method-tab">
    <MethodSeo language={language} />
    <section className="method-hero">
      <div className="method-hero-copy">
        <p className="eyebrow">{t('Local neural preference learning', 'Локальное обучение предпочтениям')}</p>
        <h1 aria-label={t('How Favcolor learns your color', 'Как Favcolor изучает ваш цвет')}>{t('It does not guess.', 'Не угадывает.')}<br /><em>{t('It learns.', 'Учится.')}</em></h1>
        <p>{t('Every tap updates a small neural model in your browser. Here is what it learned, passed, and failed.', 'Каждое нажатие меняет небольшую нейросеть в браузере. Здесь её механизм, результаты и ошибки.')}</p>
      </div>
      <div className="method-network" aria-label={t('Neural architecture: six inputs, two hidden layers, one output', 'Архитектура сети: шесть входов, два скрытых слоя, один выход')}>
        <div className="method-network-head"><span>{t('Production model', 'Production-модель')}</span><i>{t('running locally', 'работает локально')}</i></div>
        <div className="method-network-map" aria-hidden="true">
          {[6, 12, 8, 1].map((count, layer) => <div className="method-network-layer" data-layer={layer} key={count}><small>{count}</small>{Array.from({ length: count }, (_, index) => <i key={index} />)}</div>)}
        </div>
        <div className="method-network-stats"><span><strong>5</strong>{t('networks', 'сетей')}</span><span><strong>197</strong>{t('parameters each', 'параметров в каждой')}</span><span><strong>0</strong>{t('cloud inference', 'облачных запросов')}</span></div>
        <div className="method-model-name"><span>{t('Model name', 'Имя модели')}</span><strong>Nikolai Dubovskoy</strong><small>{t('a tribute, not a scientific designation', 'дань уважения, не научное обозначение')}</small></div>
        <button className="method-signal-button" type="button" onClick={playSignal}>{t('Send one choice through the network', 'Пропустить один выбор через сеть')}<span aria-hidden="true">→</span></button>
      </div>
      <figure className="method-hero-visual method-reveal">
        <img src="/method/color-space-journey.png" alt={t('A color-space map with a learning path moving toward the model estimate', 'Карта цветового пространства с траекторией обучения к оценке модели')} width="1824" height="864" fetchPriority="high" />
        <figcaption><span>OKLCH / {t('search space', 'пространство поиска')}</span><p>{t('The path is illustrative; the measurements below are the actual benchmark results.', 'Траектория условная; измерения ниже — реальные результаты тестов.')}</p></figcaption>
      </figure>
    </section>

    <section className="method-process method-reveal" id="method-process">
      <header><h2>{t('One choice becomes the next question.', 'Один выбор становится следующим вопросом.')}</h2></header>
      <div className="method-process-layout">
        <div className="method-formula"><span>{t('Pair probability', 'Вероятность выбора')}</span><strong>p(A) = σ(u(A) - u(B))</strong><p>{t('The model learns relative preference. It never asks you to score a color on an abstract scale.', 'Модель учит относительное предпочтение. Она не просит оценивать цвет по абстрактной шкале.')}</p></div>
        <div className="method-steps">{steps.map(([title, body], index) => <article className="method-step" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </div>
    </section>

    <section className="method-evidence method-reveal" id="method-evidence">
      <header><h2>{t('Numbers that can say no.', 'Числа, которые могут сказать «нет».')}</h2><p>{t('Every number comes from a committed deterministic artifact. Live user metrics are not presented as scientific proof.', 'Каждое число взято из сохранённого детерминированного артефакта. Метрики пользователей не выдаются за научное доказательство.')}</p></header>
      <div className="method-evidence-board">
        <article className="method-evidence-lead"><span>{t('Recovery after a noisy start', 'Выход из шумного старта')}</span><strong>8 / 8</strong><p>{t('hidden targets recovered by 150 clicks', 'скрытых целей найдено к 150 выборам')}</p><div className="method-spark" aria-hidden="true">{[31, 44, 39, 56, 49, 68, 73, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><small>{t('red · purple · cyan · green', 'красный · фиолетовый · голубой · зелёный')}</small></article>
        <div className="method-comparison"><div className="method-comparison-head"><span>{t('Metric', 'Метрика')}</span><span>{t('Before', 'До')}</span><span>{t('After', 'После')}</span></div>{recoveryRows.map(row => <div className="method-data-row" key={row.label[0]}><span>{language === 'ru' ? row.label[1] : row.label[0]}</span><s>{row.before}</s><strong>{row.after}</strong><i style={{ width: `${row.width}%` }} /></div>)}</div>
      </div>
      <p className="method-protocol">{t('Protocol: 4 hidden targets × 2 deterministic seeds, 20 noisy early answers, 150 online test-then-train clicks. Synthetic users are software tests, not evidence about human psychology.', 'Протокол: 4 скрытые цели × 2 детерминированных seed, 20 ранних шумных ответов, 150 циклов test-then-train. Синтетические пользователи - это тесты программы, а не доказательство о психологии людей.')}</p>
      <div className="method-checkpoint">
        <div className="method-checkpoint-copy"><h3>{t('Open the run at a checkpoint', 'Откройте прогон в контрольной точке')}</h3><p>{t('The optimum did not improve in a straight line. The test keeps that visible.', 'Оптимум улучшался не по прямой. Тест это не скрывает.')}</p></div>
        <div className="method-checkpoint-controls" aria-label={t('Benchmark checkpoint', 'Контрольная точка теста')}>{([50, 100, 150] as const).map(value => <button key={value} type="button" aria-pressed={checkpoint === value} onClick={() => setCheckpoint(value)}>{value}</button>)}</div>
        <div className="method-checkpoint-values" key={checkpoint}><span><strong>{checkpoints[checkpoint].error}</strong>{t('optimum error', 'ошибка оптимума')}</span><span><strong>{checkpoints[checkpoint].loss}</strong>log-loss</span><span><strong>{checkpoints[checkpoint].coverage}</strong>{t('gamut coverage', 'охват gamut')}</span></div>
      </div>
    </section>

    <section className="method-integrity method-reveal">
      <header><p className="eyebrow">{t('Failure log', 'Журнал ошибок')}</p><h2>{t('The useful history is where it broke.', 'Самая полезная история - где всё ломалось.')}</h2></header>
      <div className="method-integrity-grid">
        <article className="method-integrity-card method-integrity-gray"><span>{t('Gray endpoints after warm-up', 'Серые варианты после разогрева')}</span><div><s>22.18%</s><strong>0.49%</strong></div><p>{t('Hue features used to stay loud even when chroma was zero.', 'Признаки оттенка раньше оставались сильными даже при нулевой насыщенности.')}</p></article>
        <article className="method-integrity-card"><span>{t('Colorful final optima', 'Цветные финальные оптимумы')}</span><div><s>7 / 12</s><strong>12 / 12</strong></div><p>{t('Same 12 seeds and 100-click protocol.', 'Те же 12 seed и протокол на 100 выборов.')}</p></article>
        <article className="method-integrity-card method-integrity-targets"><div className="method-target-head"><span>{t('Optimum error by target', 'Ошибка оптимума по цели')}</span><small>{t('lower is better', 'меньше лучше')}</small></div>{targetRows.map(row => <div key={row.label}><b>{row.label}</b><s>{row.before}</s><strong>{row.after}</strong><em className={row.regressed ? 'is-regression' : ''}>{row.change}</em></div>)}<p>{t('Regressions stay visible. Aggregate improvement is not permission to hide them.', 'Регрессии не спрятаны. Общее улучшение не даёт права их скрывать.')}</p></article>
        <article className="method-integrity-card method-integrity-gates"><div><strong>0 / 16</strong><span>{t('false context activations', 'ложных включений контекста')}</span></div><div><strong>0 / 16</strong><span>{t('false drift activations', 'ложных включений дрейфа')}</span></div><p>{t('Untouched null and stable seeds. Weak effects are missed more often than false effects are announced.', 'Нетронутые null и stable seed. Слабый эффект чаще пропускается, чем объявляется ложный.')}</p></article>
      </div>
    </section>

    <section className="method-candidate method-reveal">
      <div className="method-candidate-copy"><h2>{t('A model that did not ship.', 'Модель, которая не вышла.')}</h2><p>{t('A compact neural candidate was evaluated on anonymous opt-in packets. It did not beat production, so it stayed an experiment.', 'Компактный нейронный кандидат проверили на добровольно отправленных анонимных пакетах. Он не превзошёл production и остался экспериментом.')}</p><div className="method-candidate-volume"><span><strong>1,092</strong>{t('raw observations', 'сырых наблюдения')}</span><span><strong>994</strong>{t('usable', 'пригодных')}</span><span><strong>23</strong>{t('packets', 'пакета')}</span></div></div>
      <div className="method-candidate-table"><div><span>{t('Grouped estimate', 'Групповая оценка')}</span><b>{t('Production', 'Production')}</b><b>{t('Candidate', 'Кандидат')}</b></div>{candidateRows.map(row => <div key={row.label[0]}><span>{language === 'ru' ? row.label[1] : row.label[0]}</span><strong>{row.production}</strong><s>{row.candidate}</s></div>)}<p><i />{t('Not promoted', 'Не внедрена')}<small>{t('Packet UUID may not equal one human. Grouped estimates can be optimistic.', 'UUID пакета может не соответствовать одному человеку. Групповые оценки могут быть оптимистичными.')}</small></p></div>
    </section>

    <section className="method-history method-reveal" id="method-history">
      <header><h2 aria-label={t('Development history', 'История разработки')}>{t('Built by correcting itself.', 'Сделано через исправление ошибок.')}</h2></header>
      <div className="method-history-list">{history.map(([date, title, body], index) => <article className="method-history-item" key={`${date}-${title}`}><time dateTime={`2026-09-${date.slice(0, 2)}`}>{date}.2026</time><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
    </section>

    <section className="method-display-visual method-reveal">
      <img src="/method/display-pixels.png" alt={t('Macro view of RGB display pixels blending into a continuous color', 'Макросъёмка RGB-пикселей экрана, переходящих в непрерывный цвет')} width="1536" height="1024" loading="lazy" />
      <div><p className="eyebrow">{t('Displayed, not imagined', 'Показано, а не придумано')}</p><h2>{t('The screen is part of the experiment.', 'Экран — часть эксперимента.')}</h2><p>{t('The model works in a perceptual color space, but every comparison is validated after conversion to the pixels your display can actually render.', 'Модель работает в перцептивном цветовом пространстве, но каждая пара проверяется после преобразования в пиксели, которые действительно может показать экран.')}</p></div>
    </section>

    <section className="method-boundary method-reveal" id="method-boundary"><div className="method-boundary-main"><h2>{t('A useful estimate. Not an absolute truth.', 'Полезная оценка. Не абсолютная истина.')}</h2><p>{t('“Your color” is the model’s current best estimate under this pairwise procedure. It is not a diagnosis, a personality type, or proof of one permanent favorite.', '«Ваш цвет» - текущая лучшая оценка модели в рамках парных сравнений. Это не диагноз, не тип личности и не доказательство одного вечного любимого цвета.')}</p><a href="/">{t('Try it with your own choices', 'Проверить на своих выборах')}<span aria-hidden="true">→</span></a></div><div className="method-boundary-notes"><p>{t('Screens, brightness, color profiles, ambient light, and fatigue can change appearance and choice.', 'Экран, яркость, цветовой профиль, освещение и усталость могут менять вид цвета и выбор.')}</p><p>{t('The production model is a real neural network trained only from your choices. Benchmarks test software recovery, not people.', 'Production-модель - настоящая нейросеть, которая учится только на ваших выборах. Benchmark проверяют программу, а не людей.')}</p><p>{t('Your model and history stay in this browser. Anonymous research sharing remains strictly opt-in.', 'Модель и история остаются в браузере. Анонимная отправка данных для исследований включается только добровольно.')}</p></div></section>
  </main>
}
