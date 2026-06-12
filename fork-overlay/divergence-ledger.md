# Divergence Ledger

This file is the single source of truth for **everything `ford/main` changes
relative to `upstream/main`**. Every fork change updates this ledger in the
same commit or PR that makes the change. If the audit diff shows divergence
this file does not explain, that is a bug in the ledger.

Audit command:

```bash
git fetch upstream
git diff upstream/main...ford/main --stat
```

## How to record a change

Every fork change lands in one of three buckets. The bucket determines how
upstream merges treat the files involved.

| Bucket | Meaning | Merge rule |
|--------|---------|------------|
| **fork-only** | New files/directories that do not exist upstream | Never conflict. Keep both, no action. |
| **additive** | Small edits to upstream files (a mount point, an enum value, an import, a dispatch branch) | Take both sides; re-check the mount point still renders/dispatches. |
| **owned** | Upstream files the fork has rewritten wholesale (e.g. restructured dashboard pages) | Prefer **ours**, then read upstream's diff for that file (`git log -p upstream/main -- <path>` since last sync) and deliberately re-port behavior changes worth keeping. |

Rules of thumb that keep this ledger short:

- New files are free; edited upstream lines are debt. Prefer fork-only
  components under `frontend/src/features/fork/` (create on first use) wired
  into upstream pages via minimal **additive** mount points.
- Cosmetic changes (colors, spacing, density, hiding elements) go through CSS
  variables / overrides, not component edits, whenever possible.
- Before moving a file to **owned**, consider whether a fork-only replacement
  plus a one-line additive route/mount swap gets the same result. Owned files
  are the only ones that cost real effort at every upstream sync.
- Backend layers stay default-off or explicitly configured (a new routing
  strategy is inert until selected in the dashboard).

## Fork layers

One layer = one concern = one branch = one OpenSpec change (for behavior
changes). Layers should be individually re-buildable on top of
`upstream/main` if a sync ever goes badly sideways.

| Layer | Status | OpenSpec change | Notes |
|-------|--------|-----------------|-------|
| `fork-overlay-docs` | landed | — (docs only) | This folder: overlay README, design notes, this ledger. |
| `add-inflight-aware-routing` | planned | TBD | In-flight-aware, reset-priority routing strategy. See [availability-routing-design.md](availability-routing-design.md). Candidate to upstream. |
| `project-attribution` | designed | TBD | Request-scoped project label (`X-Project` header / API-key default) persisted on request logs, spend-per-project rollups. See [project-attribution-design.md](project-attribution-design.md). Additive backend + migration; candidate to upstream. |
| `dashboard-restructure` | implemented | `dashboard-restructure` | Quota-first dashboard relayout: tokens/cost/requests stats, 5h+weekly gauges, accounts sectioned by quota state, projections demoted to diagnostics. See [dashboard-restructure-design.md](dashboard-restructure-design.md). Frontend-only; fork-only page + additive route swap, no owned files. |
| `usage-share-image` | prototyping | `usage-share-image` | Shareable usage-image cards (tokens / est. API cost / requests) for daily/weekly/monthly posting. Phase 1: `/share-lab` preview route rendering the hero + receipt candidates from live data (a gauge variant was prototyped and dropped); phase 2: share dialog with PNG export. Fork-only components + additive route line + additive backend by-model token sums in `/api/reports`. |

## Fork-only files and directories

| Path | Layer |
|------|-------|
| `fork-overlay/**` | `fork-overlay-docs` |
| `frontend/src/features/fork/**` (except `share/`) | `dashboard-restructure` |
| `frontend/src/features/fork/share/**` | `usage-share-image` |
| `frontend/src/__integration__/fork-dashboard-routes.test.tsx` | `dashboard-restructure` (+ `/share-lab` case from `usage-share-image`) |
| `openspec/changes/dashboard-restructure/**` | `dashboard-restructure` |
| `openspec/changes/usage-share-image/**` | `usage-share-image` |

## Upstream files modified — additive

| Path | Layer | What the edit is |
|------|-------|------------------|
| `frontend/src/App.tsx` | `dashboard-restructure` | Route swap: `/dashboard` renders `ForkDashboardPage`; `/requests` renders `ForkRequestLogsPage`; upstream page moved to `/upstream-dashboard` (two imports + three route lines). |
| `frontend/src/App.tsx` | `usage-share-image` | One import + one route line: `/share-lab` renders `ForkShareLabPage` (not in nav). |
| `app/modules/reports/repository.py` | `usage-share-image` | By-model aggregate also sums input+output tokens (`ModelAggregateRow.tokens`). |
| `app/modules/reports/schemas.py` | `usage-share-image` | `ModelCostEntry.tokens` response field (default 0, backward compatible). |
| `app/modules/reports/service.py` | `usage-share-image` | Passes the by-model token sum through to the response. |
| `tests/integration/test_reports_api.py` | `usage-share-image` | By-model assertions include the new `tokens` field. |
| `frontend/src/features/reports/schemas.ts` | `usage-share-image` | `tokens` field (optional, default 0) on `ModelCostEntrySchema`. |
| `frontend/src/features/reports/components/reports-page.test.tsx` | `usage-share-image` | Test fixtures gain the `tokens` field. |
| `frontend/src/test/mocks/factories.ts` | `usage-share-image` | `createReportsResponse` factory added. |
| `frontend/src/test/mocks/handlers.ts` | `usage-share-image` | `GET /api/reports` handler added. |
| `frontend/src/test/mocks/handler-coverage.test.ts` | `usage-share-image` | `GET /api/reports` registered in the expected-endpoint list. |
| `frontend/package.json` | `usage-share-image` | Two dependencies added: `qrcode-generator` (receipt QR code), `modern-screenshot` (oklch-safe PNG export). |
| `frontend/src/components/layout/app-header.tsx` | `dashboard-restructure` | One nav item added: "Requests" → `/requests`. |
| `frontend/src/components/layout/app-header.tsx` | `usage-share-image` | One nav item added: "Share" → `/share-lab` (repoints at the phase-2 share dialog later). |
| `frontend/src/hooks/use-dashboard-preferences.ts` | `dashboard-restructure` | New persisted `forkDiagnosticsOpen` preference (key `codex-lb-fork-diagnostics-open`) following the existing burnrate pattern. |
| `frontend/src/__integration__/dashboard-flow.test.tsx` | `dashboard-restructure` | Upstream dashboard-flow integration test now targets `/upstream-dashboard` (URL strings only) since `/dashboard` renders the fork page with a 1d default timeframe. |

## Upstream files modified — owned

| Path | Layer | Why owned / what to re-port on sync |
|------|-------|--------------------------------------|
| _none yet_ | | |

## Upstream sync checklist

Run on every `git merge upstream/main` into `ford/main`:

1. `git fetch upstream --tags && git switch ford/main && git merge upstream/main`
   (`rerere` is enabled and will replay known conflict resolutions).
2. For each conflicted file, resolve per its bucket above. A conflicted file
   missing from this ledger means the ledger is stale — fix the ledger too.
3. For every **owned** file, even if it merged cleanly, review upstream's
   changes to it since the last sync and re-port what matters.
4. `uv run pytest` and frontend tests/build pass.
5. `openspec validate --specs`.
6. `git diff upstream/main...ford/main --stat` — confirm every path is
   explained by this ledger.
7. Push.
