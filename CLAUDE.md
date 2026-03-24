# CLAUDE.md — Nouvia Intelligence Platform (NIP)
# INT-001 Phase 2 · Session 0 · TASK-00

## What this is
React SPA (Vite) + Firebase/Firestore + Firebase Hosting.
Single user: Ben Melchionno. GCP project: nouvia-os. Live at nouvia-os.web.app.

## Current structure (pre-INT-001)
src/
  App.jsx           All tab components in one file (INT-001 WS3 will refactor into tabs/)
  AuthGate.jsx      Google Auth wrapper
  firebase.js       Firebase app init — import db from here (DO NOT TOUCH)
  storage.js        Firestore read/write helpers — getData / setData
  main.jsx          Entry point
  index.css         Global styles

## Target structure (INT-001 WS3 will create these)
src/
  components/ui/        Button Card Badge Modal ProgressBar StatusDot
  components/layout/    Navigation AppShell
  tabs/                 One folder per tab — Canvas Clients Experiments Skills
                        Coworkers Decisions Dashboard IPLibrary
  hooks/                Custom Firestore hooks (one per collection)
  styles/               tokens.css — CSS custom properties, import in main entry
tests/
  components/           Unit tests for UI components
  integration/          Hook + Firestore emulator tests
  functional/           End-to-end UX anchor tests
  regression/           suite.js registers all TEST-XXX

## Tech stack
React 18 | Firebase JS SDK v9+ (modular) | Firestore | Firebase Hosting
Vite | No test runner yet (INT-001 adds Vitest — confirm before Session 1)

## Build and test commands
npm run build        # production build (Vite)
npm run dev          # local dev server
npm run lint         # ESLint
npm run preview      # local preview of production build

# INT-001 will add:
npm run test         # Vitest — confirm command after TASK-00 session
firebase emulators:start --only firestore  # Firestore emulator for tests
firebase deploy --only hosting             # production deploy
firebase hosting:channel:deploy preview-int001  # staging deploy
firebase deploy --only firestore:indexes   # deploy composite indexes
firebase deploy --only firestore:rules     # deploy security rules

## Firestore collections
Existing (do not change schema — stored as JSON arrays in /data/{key} docs):
  strategist:canvas
  strategist:clients
  strategist:experiments
  strategist:skills
  strategist:coworkers
  strategist:decisions
  strategist:capability_gaps
  strategist:core_components
  strategist:mcp_connectors

New (INT-001 WS2 — after TASK-01 schema confirmation, do NOT create before):
  okrs           path: okrs/{year}_Q{quarter}
  mrr_entries    path: mrr_entries/{YYYY_MM}
  priority_queue path: priority_queue/{auto_id}
  tracker_events path: tracker_events/{auto_id}  (behavioral capture — TASK-05c)

## Project-specific conventions
Existing data layer: getData / setData helpers in src/storage.js (array-based).
INT-001 new collections: onSnapshot hooks in src/hooks/ — no inline queries in components.
All field names in new WS2 collections: snake_case (MCP compatibility — ADR-P02).
Secrets: none required — Firebase client SDK uses Auth token.
No server-side code in this repo.

## DO NOT TOUCH
src/firebase.js — Firebase app initialisation
src/AuthGate.jsx — Firebase Auth configuration
Any existing Firestore security rules not related to INT-001 new collections
Existing tab component logic during TASK-05a/05b (style-only — zero logic changes)

## INT-001 NCC candidates (flag if patterns evolve during build)
NCC-003: Nouvia Design Token System (tokens.css)
NCC-004: Nouvia UI Component Library (Button Card Badge Modal ProgressBar StatusDot)
NCC-005: Real-time Dashboard Widget Pattern (hook + widget + inline edit)
NCC-006: Firestore Collection Management Tab Pattern (hook + card + modal)

## Open items for TASK-01 (schema confirmation — blocking WS2)
1. OKR structure: 3 objectives max, 3 KRs max, % progress 0–100?
2. MRR history: start fresh today, no migration?
3. IP Library: SOW reference card design confirmed?
4. Priority Queue: Ben-only v1, owner_id field for future multi-user?
5. Release gate: all 3 workstreams ship together?
6. Test command: npm run test or npm run vitest?
7. firebase.js path: src/firebase.js? (confirmed above)
8. CapabilityGap collection name: strategist:capability_gaps (confirmed above)
9. Ben's Firebase Auth UID (required for TASK-10a security rules — must be provided)

## Session map (INT-001)
Session 0:  TASK-00 (this file) + TASK-01 (schema)
Session 1:  TASK-02 + TASK-03 (tokens.css + 6 UI components)
Session 2:  TASK-04 + TASK-05a + TASK-05b (Nav + 6 tab migrations)
Session 3:  TASK-05c (event capture)
Session 4:  TASK-06 + TASK-07 + TASK-08 (IP Library hook + card + form)
Session 5:  TASK-09 (IPLibraryTab)
Session 6:  TASK-10a + TASK-10 (security rules + WS2 hooks) — BLOCKED ON TASK-01
Session 7:  TASK-11 + TASK-12 + TASK-13 (MRR + OKR + PriorityQueue widgets)
Session 8:  TASK-14 + TASK-15 + TASK-16 (OKRModal + support widgets + DashboardTab)
Session 9:  TASK-17 (cross-tab regression)
Session 10: TASK-18 + TASK-19 + TASK-20 + TASK-21 (deploy)
