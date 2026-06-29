# Dashboard Restructure — Design

Fork layer: `dashboard-restructure`. Status: design. Mockup: CleanShot
2026-06-11 (tokens/cost/requests left column, 5-hour + weekly gauges top
right, accounts sectioned by quota state bottom right).

## Goals

Ranked by what actually gets looked at:

1. **Tokens, cost, requests** — the primary stats, always visible at top.
2. **Remaining quota right now** — aggregate 5-hour and weekly gauges.
3. **Accounts sectioned by quota state** — which accounts are usable now,
   which are 5-hour-limited but come back soon, which are weekly-dead.
   Sectioning replaces the current flat card grid with status tags; the
   grouping itself carries the information.

Explicitly demoted: **error rate, burn/depletion projections, weekly credit
pace**. Not removed — moved behind a disclosure (collapsed "Projections /
Diagnostics" section) and/or a dashboard preference toggle, following the
existing `useDashboardPreferencesStore` pattern
(`frontend/src/hooks/use-dashboard-preferences.ts`, currently used for
`accountBurnrateEnabled`).

## Data mapping — no backend changes required

Everything below already exists in `DashboardOverviewSchema`
(`frontend/src/features/dashboard/schemas.ts`):

| Mockup element | Source field |
|----------------|--------------|
| Tokens | `summary.metrics.tokens` (+ `cachedInputTokens` as sub-stat) |
| Cost | `summary.cost.totalUsd` |
| Requests | `summary.metrics.requests` |
| 5-Hour gauge | `summary.primaryWindow` — `remainingPercent`, `remainingCredits`, `capacityCredits`, `resetAt`, `windowMinutes` |
| Weekly gauge | `summary.secondaryWindow` (nullable — hide gauge when null) |
| Per-account state | `accounts[]`: `usage.primaryRemainingPercent`, `usage.secondaryRemainingPercent`, `resetAtPrimary`, `resetAtSecondary`, `status` |

Label gauges from `windowMinutes` (300 → "5 Hour", 10080 → "Weekly") rather
than hardcoding, so plan variations render correctly.

## Account sectioning rules

Backend account statuses (`app/db/models.py` `AccountStatus`): `active`,
`rate_limited`, `quota_exceeded`, `paused`, `reauth_required`, `deactivated`.

Section assignment, evaluated top to bottom per account:

1. **Out of rotation** — `status` in {`paused`, `reauth_required`,
   `deactivated`}, or `usage` is null (never synced / stale). Not a quota
   state; rendered last, visually muted, with the reason. The mockup omits
   this group but it must exist or these accounts would be miscounted as
   dead/alive.
2. **Weekly dead** — `usage.secondaryRemainingPercent <= 0` (or
   `status == quota_exceeded` with `resetAtSecondary` in the future). Show
   countdown to `resetAtSecondary`.
3. **5-hour dead, weekly alive** — `usage.primaryRemainingPercent <= 0` (or
   `status == rate_limited` with `resetAtPrimary` in the future) while
   secondary still has remaining. Show countdown to `resetAtPrimary` — these
   accounts revive soon and the countdown is the useful number.
4. **Alive** — everything else. Sorted by `primaryRemainingPercent`
   descending. Section header shows count (e.g. "Alive · 7").

Use a small epsilon (e.g. `<= 0.5%`) instead of exactly 0 when classifying
dead, since synced percentages can hover just above zero while the upstream
already rejects requests.

## Run-out / projection stance

The backend already computes aggregate projections (`depletionPrimary`,
`depletionSecondary`, `weeklyCreditPace` with `confidence` and
`staleAccountCount`). These aggregate across accounts whose windows reset at
different times, which is exactly why the numbers feel mushy — defer them to
the collapsed diagnostics section as-is, unchanged.

The concrete, trustworthy alternatives this layout surfaces instead:

- Per-account reset countdowns inside the dead sections (real timestamps,
  no modeling).
- A "next revival" line under the 5-hour gauge: the soonest
  `resetAtPrimary` among 5-hour-dead accounts and which account it is —
  answers "when do I get capacity back" without a burn-rate model.

If an aggregate run-out estimate is wanted later, it should be a
step-function forecast built from per-account `remainingCredits` +
`resetAt` schedules, not a smoothed burn rate. Out of scope for the first
cut.

## Implementation shape (divergence buckets)

Per [divergence-ledger.md](divergence-ledger.md), prefer fork-only files over
owned ones:

- **fork-only**: `frontend/src/features/fork/dashboard/` — new
  `fork-dashboard-page.tsx` composing the layout, plus new section
  components (`stat-column.tsx`, `quota-donut.tsx`, `quota-gauges.tsx`,
  `fork-account-card.tsx`, `account-sections.tsx`,
  `diagnostics-disclosure.tsx`). Reuse upstream `recent-requests-table`,
  filter components, the `useDashboard` hooks, and `buildDashboardView`
  utils. The donut and account card are fork variants rather than reuse:
  the gauges are legend-free (per-account breakdown only on segment hover)
  and the cards are slim (name, quota bars, Details/Resume/Re-auth — no
  status badge, warm-up controls, or general credits line, since the section
  an account sits in already carries its state). Banked reset credits are
  surfaced as a compact row action with count/countdown because redemption is
  account-specific and expiry-sensitive.

Layout (refined 2026-06-11 after first build review): left column holds the
Tokens / Cost / Requests stat cards stacked vertically; right column holds
the two gauges side by side with the sectioned account cards below them;
diagnostics disclosure and request logs span full width underneath.
- **additive**: one route-registration swap so `/` renders
  `ForkDashboardPage` instead of upstream `DashboardPage`; optional new keys
  in `use-dashboard-preferences.ts` for the diagnostics toggle.
- **owned**: ideally none. Upstream `dashboard-page.tsx` stays untouched and
  keeps working at a fallback route if useful for comparison. Only take
  ownership of upstream files if reuse turns out to be impractical.

Request logs table: unchanged, stays below the new top section.

## Open questions

- Monthly window (`monthlyRemainingPercent`, `resetAtMonthly`) — third gauge
  or fold into diagnostics? Default: diagnostics until it matters.
- `additionalQuotas` (per-feature limits) — out of scope for the first cut.
- Whether the alive section shows mini quota bars per card (existing
  `mini-quota-bar` component) — probably yes, cheap reuse.

## Workflow

This is a dashboard-visible change: create
`openspec/changes/dashboard-restructure/` (proposal → tasks) before
implementation, with this doc as the context source. Update the divergence
ledger tables in the same PR that lands the code.
