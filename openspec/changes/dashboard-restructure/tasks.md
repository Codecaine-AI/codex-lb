# Tasks — Dashboard Restructure

## 1. Classification and view logic (fork-only)

- [x] 1.1 Create `frontend/src/features/fork/dashboard/utils.ts` with
      `classifyAccount` (alive | fiveHourDead | weeklyDead | outOfRotation,
      0.5% epsilon, status precedence per spec), section sorting, window
      label derivation from `windowMinutes`, and next-revival selection.
- [x] 1.2 Unit tests `utils.test.ts`: each spec scenario for classification
      (mixed states, near-zero, stale/null usage, unknown status fallback),
      sections sum to account total, window labels (300/10080/other),
      next-revival picks soonest and is null when none dead.

## 2. Components (fork-only)

- [x] 2.1 `quota-gauges.tsx`: primary + optional secondary gauge from
      `summary.primaryWindow`/`secondaryWindow` reusing `donut-chart`;
      derived labels; next-revival line under the primary gauge.
- [x] 2.2 `account-sections.tsx`: ordered sections with counts, hidden when
      empty, reset countdowns in dead sections, muted out-of-rotation rows;
      reuse upstream `account-card` (or `account-summary` row pieces) for
      account rendering and pass through the existing account actions.
- [x] 2.3 `diagnostics-disclosure.tsx`: collapsed-by-default section
      containing error-rate stat, depletion projections, and
      `WeeklyCreditsPaceCard`, persisted via new `forkDiagnosticsOpen`
      preference.
- [x] 2.4 `fork-dashboard-page.tsx`: compose stats (tokens/cost/requests),
      gauges, account sections, diagnostics disclosure, and the unchanged
      request-logs section, reusing `useDashboard`,
      `useDashboardProjections`, `useRequestLogs`, and existing filter/table
      components; keep header timeframe select + refresh.

## 3. Additive wiring (upstream touch points)

- [x] 3.1 Extend `frontend/src/hooks/use-dashboard-preferences.ts` with the
      persisted `forkDiagnosticsOpen` key (default false).
- [x] 3.2 Route swap in `frontend/src/App.tsx`: `/dashboard` renders
      `ForkDashboardPage`; add `/upstream-dashboard` rendering upstream
      `DashboardPage`.

## 4. Component/page tests

- [x] 4.1 Page test: fork dashboard renders stats, gauges, sections, and
      request logs from mocked overview data; null `summary.metrics` shows
      placeholders; null `secondaryWindow` renders single gauge.
- [x] 4.2 Diagnostics test: collapsed by default, content hidden until
      expanded, state persists via preferences store.
- [x] 4.3 Route test: `/dashboard` renders fork page, `/upstream-dashboard`
      renders upstream page.

## 5. Verification and fork bookkeeping

- [x] 5.1 Frontend suite green (`bun run test` / project equivalent) and
      production build passes.
- [x] 5.2 Update `fork-overlay/divergence-ledger.md`: fork-only path
      `frontend/src/features/fork/**`; additive entries for `App.tsx` and
      `use-dashboard-preferences.ts`; layer status → implementing/landed.
- [x] 5.3 `openspec validate --specs` (strict) passes.
