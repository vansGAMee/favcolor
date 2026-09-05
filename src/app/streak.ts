const DAY_MS = 86_400_000

const localDayNumber = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)

const storedDayNumber = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return Math.floor(date.getTime() / DAY_MS)
}

export function calculateStreak(dates: string[], today = new Date()) {
  const todayNumber = localDayNumber(today)
  const days = [...new Set(dates.map(storedDayNumber).filter((day): day is number => day !== null && day <= todayNumber))].sort((a, b) => a - b)
  const daySet = new Set(days)
  const hasToday = daySet.has(todayNumber)
  const anchor = hasToday ? todayNumber : daySet.has(todayNumber - 1) ? todayNumber - 1 : null
  let current = 0
  if (anchor !== null) while (daySet.has(anchor - current)) current++
  let longest = 0
  let run = 0
  let previous: number | null = null
  for (const day of days) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }
  return { current, longest, hasToday, activeFromYesterday: !hasToday && current > 0 }
}
