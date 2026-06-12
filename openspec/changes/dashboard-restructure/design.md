# Design — Dashboard Restructure

## Context

Full design rationale lives in `fork-overlay/dashboard-restructure-design.md`
(fork layer `dashboard-restructure` in `fork-overlay/divergence-ledger.md`).
This document fixes the implementation decisions. All required data already
exists in `DashboardOverviewSchema` (`frontend/src/features/dashboard/
schemas.ts`) — the change is frontend-only.

## Goals / Non-Goals

**Goals:**
- Quota-first dashboard at `/` per the fork-dashboard spec.
- Zero modifications to upstream dashboard components (fork divergence:
  fork-only files + additive route/preferences edits only).
- Reuse upstream hooks, utils, and leaf components wherever they fit.

**Non-Goals:**
- No backend/API/schema changes.
- No aggregate run-out forecasting (step-function forecast is future work).
- No changes to request-log behavior, monthly windows, or
  `additionalQuotas` handling.

## Decisions

1. **New fork-only page over editing `dashboard-page.tsx`.** New components
   live in `frontend/src/features/fork/dashboard/`; the only upstream edits
   are the route registration (point `/` at `ForkDashboardPage`, keep
   upstream at `/upstream-dashboard`) and new optional keys in
   `use-dashboard-preferences.ts`. Alternative — restructuring upstream's
   page in place — was rejected because it converts a high-churn upstream
   file into a fork-owned file (see divergence ledger buckets).
2. **Classification is a pure function.** `classifyAccount(account):
   'alive' | 'fiveHourDead' | 'weeklyDead' | 'outOfRotation'` in a fork-only
   `utils.ts`, unit-tested directly; components stay thin. Epsilon 0.5% for
   dead thresholds per spec.
3. **Reuse upstream data plumbing; fork the presentation leaves.**
   `useDashboard`, `useDashboardProjections`, `useRequestLogs`,
   `buildDashboardView`, `recent-requests-table`, and filter components are
   imported, not copied. The gauge donut and account card are fork variants
   (`quota-donut.tsx`, `fork-account-card.tsx`): gauges are legend-free with
   per-account detail on segment hover, and cards drop the status badge,
   warm-up controls, and credits line (the section an account sits in
   already carries its state). Stats render as a vertical left column
   (`stat-column.tsx`) ordered tokens/cost/requests, with gauges and account
   sections in the right column.
4. **Diagnostics disclosure persistence** extends the existing
   `useDashboardPreferencesStore` localStorage pattern with a
   `forkDiagnosticsOpen` key (default false). Alternative — URL param — was
   rejected: the preference is per-operator, not per-link.
5. **Gauge labels from `windowMinutes`.** Map 300 → "5 Hour", 10080 →
   "Weekly", otherwise a humanized duration; never hardcode window names in
   components.

## Risks / Trade-offs

- [Upstream changes to reused hooks/components can break the fork page] →
  Upstream dashboard kept at `/upstream-dashboard` as a working comparison;
  fork page has its own tests; ledger flags the additive touch points.
- [Classification drift vs backend semantics (e.g. new `AccountStatus`
  values)] → unknown statuses fall through to Alive only if usage data is
  present; otherwise Out of rotation. Unit tests pin the mapping.
- [Sectioned layout hides accounts when classification is wrong] → every
  account renders in exactly one section by construction (classify is
  total); section counts sum to the account total, asserted in tests.

## Migration Plan

Pure frontend; ships with the route swap in the same PR. Rollback is
reverting the route to upstream `DashboardPage`. Update
`fork-overlay/divergence-ledger.md` (fork-only paths + additive entries) in
the same PR.

## Open Questions

- None blocking. Monthly window and `additionalQuotas` explicitly deferred
  (see fork-overlay design doc).
