# Your Color

A local-first web app that learns one person’s display-color preference from pairwise choices. Five small neural networks are initialized randomly and trained from scratch in the browser with custom TypeScript forward passes, backpropagation, Bradley–Terry loss, and Adam. There is no backend, external inference, pretrained model, analytics, or ML framework.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Verify

```bash
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
npm run calibrate
npm run benchmark
```

`npm run calibrate` is intentionally slower: it reproduces the independently seeded context/drift gate study and fails if the generated gates differ from the locked release constants.

## Privacy and data

Every choice, model weight, validation result, and daily snapshot stays in this browser’s IndexedDB. The You tab can export a versioned JSON archive, import it, or reset all local data after confirmation.

Color appearance varies by panel, calibration, ambient light, brightness, and operating-system color management. Use the same device and display settings for the most comparable long-term history.

## Method boundary

“Your Color” means the model’s current best estimate of the user’s most-preferred display color under this app’s standardized pairwise comparison procedure. It is not a claim about personality, psychology, mood, or a mathematically true favorite. Synthetic tests demonstrate that the implementation can recover known simulated preference functions; they do not validate human color psychology.

See [Architecture](docs/ARCHITECTURE.md), [Methodology](docs/METHODOLOGY.md), and [Validation](docs/VALIDATION.md).
