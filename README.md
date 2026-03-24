# Nouvia Intelligence Platform (NIP)

The Nouvia Intelligence Platform is a React SPA (Vite + Firebase) that serves as the central operational hub for Nouvia AI.

## Architecture

Four top-level sections:

- **Dashboard** — Goals, Financial Summary, Governance Queue, Risk Signals, Adoption Score
- **BSP** — Business Strategy Process: Canvas, Experiments, Decisions, Trends
- **Funnel** — Client management and Pipeline tracking
- **OS** — Operating System: Coworkers, Skills, Connectors, IP Library

## Tech Stack

- React 18 + Vite
- Firebase (Firestore + Hosting + Auth)
- GCP project: `nouvia-os`
- Live at: [nouvia-os.web.app](https://nouvia-os.web.app)

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
npm run preview      # preview production build
```

## Services

- `services/bsp-loop-runner/` — BSP weekly scan + monthly health (Cloud Run job)
- `services/sentinel-reporter/` — Platform usage metrics via BigQuery (Cloud Run job)
