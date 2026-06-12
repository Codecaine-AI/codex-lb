# Dashboard Restructure

## Why

The operator's primary dashboard questions are "what have I spent (tokens,
cost, requests)", "how much aggregate quota remains right now", and "which
accounts are usable now versus quota-dead". The current dashboard buries
these among projections (burn rate, weekly pace, error rate) that are rarely
consulted, and account quota state is a per-card tag instead of the page's
organizing structure. This is the fork's `dashboard-restructure` layer; see
`fork-overlay/dashboard-restructure-design.md` for the full design rationale.

## What Changes

- Add a fork dashboard page that becomes the default dashboard route (`/`),
  composed of:
  - Primary stats: tokens, cost, requests for the selected timeframe.
  - Aggregate remaining-quota gauges for the primary (5-hour) and secondary
    (weekly) windows, labeled from window minutes.
  - Accounts grouped into sections by quota state: Alive; 5-hour dead /
    weekly alive; Weekly dead; Out of rotation — replacing the flat card
    grid as the page's structure.
  - A "next revival" indicator: the soonest primary reset among 5-hour-dead
    accounts.
  - Projections and diagnostics (burn/depletion, weekly pace, error rate)
    demoted to a collapsed disclosure section.
  - Request logs table unchanged below the new top section.
- Upstream `DashboardPage` remains available at a fallback route for
  comparison; no upstream dashboard components are modified.
- Frontend-only: no backend, API, or schema changes.

## Capabilities

### New Capabilities

- `fork-dashboard`: the fork's quota-first dashboard layout — default route,
  primary stats, aggregate window gauges, quota-state account sectioning,
  next-revival indicator, and demoted diagnostics.

### Modified Capabilities

<!-- none: upstream dashboard requirements are unchanged; the fork page is
     additive and upstream's page remains reachable -->

## Impact

- New code under `frontend/src/features/fork/dashboard/` (fork-only).
- Additive route registration change so `/` renders the fork page and the
  upstream dashboard moves to a fallback route.
- Optional additive key(s) in the dashboard preferences store for the
  diagnostics disclosure state.
- Reuses existing data hooks (`useDashboard`, `useDashboardProjections`,
  `useRequestLogs`) and leaf components (donut chart, account cards, request
  table); no changes to `DashboardOverviewSchema` or backend endpoints.
- Fork divergence ledger: `fork-overlay/divergence-ledger.md` gains additive
  entries (route swap, preferences) and fork-only paths.
