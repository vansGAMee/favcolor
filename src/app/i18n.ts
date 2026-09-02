import type { ModelState } from './types'

export type Language = 'en' | 'ru'

export const translate = (language: Language, english: string, russian: string) => language === 'ru' ? russian : english

export function stateLabel(state: ModelState, language: Language) {
  if (language === 'en') return state
  return ({ Learning: 'Обучение', Narrowing: 'Уточнение', 'Testing candidate': 'Проверка результата', Ready: 'Готово' } as const)[state]
}

export function russianChoiceWord(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'ответ'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ответа'
  return 'ответов'
}
