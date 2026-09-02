import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runColorfulRecoveryBenchmark, summarizeColorfulRecovery } from '../src/ml/simulation/colorfulRecovery'

const label = process.argv[2] ?? 'run'
const startedAt = Date.now()
const runs = runColorfulRecoveryBenchmark()
const report = {
  label,
  generatedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt,
  protocol: { clicks: 100, misleadingEarlyAnswers: 8, seedsPerTarget: 3 },
  summary: summarizeColorfulRecovery(runs),
  byTarget: Object.fromEntries([...new Set(runs.map(run => run.target))].map(target => {
    const targetRuns = runs.filter(run => run.target === target)
    return [target, summarizeColorfulRecovery(targetRuns)]
  })),
  runs,
}

const outputDirectory = resolve('benchmarks', 'artifacts')
mkdirSync(outputDirectory, { recursive: true })
const outputPath = resolve(outputDirectory, `gray-recovery-${label}.json`)
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ outputPath, ...report }, null, 2))
