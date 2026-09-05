<div align="center">

# Favcolor 🪐

**A local-first, in-browser neural preference learning engine for discovering your personal color.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Local First](https://img.shields.io/badge/Privacy-100%25%20Local--First-brightgreen.svg?style=flat-square)](#-privacy--local-first-guarantees)
[![Tests](https://img.shields.io/badge/Tests-77%20passed-success.svg?style=flat-square)](#-testing--verification)

[Live Demo](https://favcolor-eight.vercel.app/) • [Research Methodology](https://favcolor-eight.vercel.app/how-it-works) • [Architecture](docs/ARCHITECTURE.md) • [Methodology](docs/METHODOLOGY.md) • [Validation](docs/VALIDATION.md)

</div>

---
<img width="1830" height="912" alt="image" src="https://github.com/user-attachments/assets/18ce3efd-331b-4729-9bb8-51e352c7fc54" />

## 🌟 Overview

**Favcolor** is an open-source, local-first web application that maps an individual's unique color preferences in a perceptually uniform color space (**OKLab / OKLCH**) through pairwise comparison active learning.

Unlike traditional quiz apps or heuristic color pickers, Favcolor trains an ensemble of **five neural networks entirely from scratch in the browser**. There are no pre-trained weights, no external inference APIs, no Python backends, and no heavy machine learning frameworks (no TensorFlow.js, no ONNX, no PyTorch). The entire forward pass, backpropagation, Bradley–Terry loss, Adam optimizer, and active acquisition loop are written in lightweight, dependency-free TypeScript utilizing typed `Float64Array` buffers.

### Core Highlights

- **🔒 100% On-Device & Private**: All training, inference, and preferences reside strictly within the browser's IndexedDB. Zero analytics, zero tracking, zero data exfiltration.
- **🧠 Pure TypeScript Neural Engine**: Hand-crafted 4-layer tanh MLPs (`6 → 24 → 16 → 1`) running deterministic Xavier initialization, pairwise Bradley–Terry loss, and custom Adam optimization with analytical gradient clipping.
- **🎯 Active Learning Acquisition**: Efficiently samples the color gamut by balancing exploration (gamut boundary coverage, novelty), exploitation (high-utility contenders), and epistemic uncertainty (ensemble disagreement).
- **🔬 Perceptual Color Science**: Built on OKLab/OKLCH color coordinates instead of non-uniform RGB/HSL, preserving perceptual lightness, chroma, and continuous circular hue representation.
- **📊 Scientific Validation & Honesty**: Strict chronological walk-forward cross-validation (rolling origin splits), calibration metrics (Brier score, ECE, log-loss vs. quadratic baseline), and an explicit model failure log.
- **✨ Cosmic Visual Storytelling**: Features an OpenAI Astra-inspired 3D logarithmic spiral galaxy canvas, Google Stitch-inspired Aurora Borealis ambient drift, and interactive stardust dot matrix running at a silky 60 FPS.

---

## 🔬 How It Works: The Machine Learning Pipeline

```text
┌─────────────────┐       Pairwise Choice       ┌────────────────────────┐
│  Active Learner ├────────────────────────────►│ 5x Neural Ensemble     │
│ (Acquisition &  │◄────────────────────────────┤ (6→24→16→1 tanh MLPs)  │
│  Gamut Pool)    │     Ensemble Disagreement   └───────────┬────────────┘
└─────────────────┘                                         │
        ▲                                                   │ Backprop / Adam
        │                                                   ▼
┌───────┴─────────┐                              ┌────────────────────────┐
│ IndexedDB Store │                              │ Bradley–Terry Loss     │
│ (Local-First)   │◄─────────────────────────────┤ P(A > B) = σ(U_A - U_B)│
└─────────────────┘     Chronological Snapshot   └────────────────────────┘
```

### 1. Perceptual Color Encoding (6D Feature Map)
Colors are converted from display sRGB to OKLCH. Because hue is circular and hue sensitivity diminishes as chroma approaches zero, the input is mapped to a continuous 6-dimensional feature vector:
$$\mathbf{x} = \left[ L,\, C,\, \sin(H),\, \cos(H),\, \sin(2H),\, \cos(2H) \right]$$
Hue components are conditioned on chroma to eliminate spurious achromatic hue signals.

### 2. Neural Architecture & Bradley–Terry Utility
- **Ensemble**: 5 independent neural networks initialized with distinct seeds and bootstrap sampling.
- **Architecture**: `6 → 24 → 16 → 1` tanh multilayer perceptron (MLP).
- **Loss Formulation**: For a pair of colors $(A, B)$ with latent utilities $U(A)$ and $U(B)$, the predicted probability that $A \succ B$ is:
  $$P(A \succ B) = \sigma(U(A) - U(B)) = \frac{1}{1 + e^{-(U(A) - U(B))}}$$
  Optimized via binary cross-entropy (Bradley–Terry pair log-loss) with analytical backpropagation directly through both inputs.

### 3. Active Learning Policy
Rather than presenting pairs at random, the acquisition function scores candidates across multiple objectives:
- **Gamut Exploration**: Ensures uniform coverage of lightness, chroma, and hue angles early in the session.
- **Ambiguity Sampling**: Identifies pairs where $|U(A) - U(B)| \approx 0$ to refine preference decision boundaries.
- **Epistemic Disagreement**: Maximizes variance in predicted pair probabilities across the 5 ensemble members.
- **High-Utility Contenders**: Tests local perturbations against the current estimated global optimum.

### 4. Chronological Validation (Zero Data Leakage)
Validation splits are strictly temporal: every test choice occurred strictly after every training choice. The model's predictive log-loss and Brier score are continuously benchmarked against a non-neural quadratic OKLab baseline.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/vansGAMee/favcolor.git
cd favcolor

# Install dependencies
npm install
```

### Development Server

Start the local Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

Type-check and create an optimized production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 🧪 Testing & Verification

Favcolor includes a comprehensive test suite covering product flows, ML convergence, recovery benchmarks, and chronological factor gates:

```bash
# Run unit and integration tests (Vitest)
npm test

# Run TypeScript static analysis without emitting files
npm run typecheck

# Run end-to-end tests (Playwright)
npx playwright install chromium
npm run test:e2e
```

### Scientific Benchmarks & Calibration

```bash
# Run synthetic preference recovery benchmark
npm run benchmark

# Benchmark recovery across colorful gamut targets
npm run benchmark:colorful

# 150-click recovery test after adversarial / deceptive initial answers
npm run benchmark:recovery

# Calibrate chronological context & drift gates (ensures release gates match constants)
npm run calibrate
```

---

## 📂 Project Architecture

```text
favcolor/
├── public/                     # Static assets (astronomical photography, sitemap, icons)
│   └── method/                 # NASA / Hubble / JWST authentic cosmic imagery
├── src/
│   ├── app/                    # State management, hooks, i18n (EN/RU), types
│   │   ├── useColorModel.ts    # Central coordinator between UI, ML, and IndexedDB
│   │   ├── i18n.ts             # Complete bilingual localization dictionary
│   │   └── storage.ts          # IndexedDB persistence layer with versioned migrations
│   ├── color/                  # Color science: OKLab, OKLCH, sRGB conversions & gamut mapping
│   ├── ml/                     # Handcrafted in-browser machine learning engine
│   │   ├── core/               # MLP forward/backward pass, tanh activation, Xavier init
│   │   ├── optimizer/          # Custom Adam optimizer with gradient clipping & bias correction
│   │   ├── ensemble/           # 5-member bootstrap ensemble & disagreement estimators
│   │   ├── activeLearning/     # Acquisition policy, candidate pools, challenge generation
│   │   ├── preference/         # Gamut optimum search & stochastic refinement
│   │   └── validation/         # Chronological walk-forward cross-validation & baselines
│   ├── components/             # React presentation components
│   │   ├── Discover.tsx        # Equal-geometry pairwise comparison view
│   │   ├── You.tsx             # Estimated personal color, metrics, history & export
│   │   ├── Method.tsx          # Research methodology & scientific breakdown
│   │   └── method/             # Cosmic visual storytelling components
│   │       ├── CosmicGalaxy.tsx       # 3D interactive logarithmic spiral galaxy canvas
│   │       ├── MethodAuroraGrid.tsx   # Ethereal Aurora Borealis + stardust dot matrix
│   │       └── CosmicStarfieldCard.tsx# Smoked glass celestial companion cards
│   ├── styles.css              # Obsidian glassmorphic design system & animations
│   └── tests/                  # Vitest suite (validation, ML recovery, UI flows)
├── docs/                       # In-depth technical specifications
│   ├── ARCHITECTURE.md         # Runtime lifecycle, data contracts, state flow
│   ├── METHODOLOGY.md          # Theoretical guarantees & algorithmic assumptions
│   └── VALIDATION.md           # Empirical gate thresholds & statistical evidence
├── vercel.json                 # Production routing & cache headers
└── package.json
```

---

## 🔒 Privacy & Local-First Guarantees

1. **No External Requests**: No color choices, telemetry, interaction events, or neural weights ever leave your machine.
2. **IndexedDB Persistence**: All data is stored in the client browser across three isolated stores (`choices`, `snapshots`, `meta`).
3. **Data Portability**: You can export your full model history as a versioned JSON archive or purge all data at any time from the **"You"** (Мой цвет) tab.
4. **Display Dependence Note**: Color perception inherently depends on screen panel technology (OLED, IPS, mini-LED), OS color management, ambient lighting, and display brightness. For reproducible results across time, compare choices under consistent viewing conditions.

---

## ⚖️ Methodological Boundary & Ethics

> [!NOTE]
> **What "Personal Color" Means**:
> In Favcolor, your "Personal Color" is defined strictly as the **model's current best estimate of your most-preferred display color under standardized pairwise comparisons on your current screen**.
>
> We make **zero claims** regarding personality typing, psychological diagnostics, mood profiling, astrological affinity, or universal aesthetic truth. All recovery claims in our documentation demonstrate algorithmic convergence on simulated oracle functions, not psychological theories.

---

## 🤝 Contributing

Contributions from the community are warmly welcome! Whether you want to improve color science algorithms, optimize numerical routines, enhance accessibility, or translate to more languages:

1. **Fork the Repository** (`gh repo fork vansGAMee/favcolor`)
2. **Create a Feature Branch** (`git checkout -b feat/my-improvement`)
3. **Ensure All Tests Pass** (`npm test && npm run typecheck && npm run build`)
4. **Commit Your Changes** (`git commit -m 'feat: add support for wide-gamut Display P3'`)
5. **Push to Your Branch** (`git push origin feat/my-improvement`)
6. **Open a Pull Request**

Please make sure changes maintain:
- Zero external ML/analytics dependencies.
- 100% test coverage for new mathematical or color conversion logic.
- Respect for the local-first, zero-telemetry architecture.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free and open for personal and commercial use.
