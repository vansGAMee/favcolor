import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runRecovery150, summarizeRecovery150 } from '../src/ml/simulation/recovery150'

const label = process.argv[2] ?? 'run'
const finalCohort = process.argv[3] === 'final'
const seeds = finalCohort ? [19, 37, 73] : [7, 29]
const startedAt = Date.now()
const protocol = { targets: ['red', 'purple', 'cyan', 'green'], seeds, clicks: 150, earlyFalsePreferenceClicks: 25 }
const report = finalCohort
  ? (() => {
      const beforeRuns = runRecovery150(seeds, true)
      const afterRuns = runRecovery150(seeds, false)
      return {
        label,
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        protocol,
        before: { summary: summarizeRecovery150(beforeRuns), runs: beforeRuns },
        after: { summary: summarizeRecovery150(afterRuns), runs: afterRuns },
      }
    })()
  : (() => {
      const runs = runRecovery150(seeds, label.startsWith('before'))
      return { label, generatedAt: new Date().toISOString(), durationMs: Date.now() - startedAt, protocol, summary: summarizeRecovery150(runs), runs }
    })()
mkdirSync(resolve('benchmarks', 'artifacts'), { recursive: true })
const outputPath = resolve('benchmarks', 'artifacts', `recovery-150-${label}.json`)
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ outputPath, ...('summary' in report ? { summary: report.summary } : { before: report.before.summary, after: report.after.summary }), durationMs: report.durationMs }, null, 2))
