# nouvia-mcp

Nouvia Studio backend infrastructure — autonomous loop runners, Cloud Run services, and Firestore data layer.

**GitHub:** [github.com/nouvia-ai/nouvia-mcp](https://github.com/nouvia-ai/nouvia-mcp)
**GCP project:** `nouvia-os`
**Frontend (Nouvia Studio):** [github.com/nouvia-ai/nouvia-studio](https://github.com/nouvia-ai/nouvia-studio) → nouvia-os.web.app

## Services

### `services/bsp-loop-runner/`
BSP (Business Strategy Process) weekly scan and monthly health loop.
- Runs on Cloud Scheduler: weekly scan (Monday 6 AM ET), monthly health (1st of month)
- Uses Claude + web search to scan market signals
- Writes trends to Firestore, delivers digest email
- **GAP-11:** After each scan, submits relevant intelligence candidates to `intelligence_inject_queue` for Ben's review in Nouvia Studio Section 7

### `services/sentinel-reporter/`
Platform usage metrics reporter via BigQuery.
- Tracks adoption scores, usage patterns, and delivery metrics

## Firestore
- Rules: `firestore.rules` (deployed via CI on push to main)
- Indexes: `firestore.indexes.json`

⚠️ This repo does NOT deploy to Firebase Hosting. Hosting is owned by `nouvia-ai/nouvia-studio`.

## CI/CD
- `deploy.yml` — deploys Firestore rules + indexes on push to main
- `deploy-bsp-runner.yml` — deploys BSP loop runner to Cloud Run on changes to `services/bsp-loop-runner/`
- `deploy-sentinel.yml` — deploys sentinel reporter to Cloud Run
