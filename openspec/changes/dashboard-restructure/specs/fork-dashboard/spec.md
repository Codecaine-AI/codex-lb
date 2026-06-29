# Fork Dashboard

## ADDED Requirements

### Requirement: Fork dashboard is the default dashboard route
The SPA SHALL render the fork dashboard page at the root dashboard route
(`/`). The upstream dashboard page SHALL remain reachable at a fallback
route (`/upstream-dashboard`) without modification to its components.

#### Scenario: Root route renders fork dashboard
- **WHEN** an authenticated operator navigates to `/`
- **THEN** the fork dashboard page renders

#### Scenario: Upstream dashboard remains reachable
- **WHEN** an authenticated operator navigates to `/upstream-dashboard`
- **THEN** the unmodified upstream dashboard page renders

### Requirement: Primary stats show tokens, cost, and requests
The fork dashboard SHALL display total tokens, total cost (USD), and total
requests for the selected overview timeframe as its primary stats, sourced
from the existing dashboard overview response (`summary.metrics.tokens`,
`summary.cost.totalUsd`, `summary.metrics.requests`).

#### Scenario: Stats render from overview data
- **WHEN** the dashboard overview query resolves with metrics
- **THEN** tokens, cost, and requests are displayed as the top-level stats

#### Scenario: Null metrics render placeholders
- **WHEN** the overview response has `summary.metrics` null
- **THEN** the stats render an em-dash placeholder rather than failing

### Requirement: Aggregate window gauges
The fork dashboard SHALL display an aggregate remaining-quota gauge for the
primary window and, when present, the secondary window, using
`summary.primaryWindow` / `summary.secondaryWindow` (remaining percent,
remaining credits, capacity credits, reset time). Gauge labels SHALL be
derived from `windowMinutes` (e.g. 300 → "5 Hour", 10080 → "Weekly"), not
hardcoded.

#### Scenario: Both windows present
- **WHEN** the overview response includes primary and secondary windows
- **THEN** two gauges render with labels derived from each window's minutes

#### Scenario: Secondary window absent
- **WHEN** `summary.secondaryWindow` is null
- **THEN** only the primary gauge renders and the layout does not break

### Requirement: Accounts are sectioned by quota state
The fork dashboard SHALL group accounts into ordered sections — "Alive",
"5-hour dead, weekly alive" (labels derived from window minutes), "Weekly
dead", and "Out of rotation" — with per-section counts. Classification, per
account, evaluated in this order:

1. Out of rotation: `status` in {`paused`, `reauth_required`,
   `deactivated`} or `usage` is null.
2. Weekly dead: secondary remaining percent <= 0.5, or
   `status == quota_exceeded` with a future `resetAtSecondary`.
3. 5-hour dead: primary remaining percent <= 0.5, or
   `status == rate_limited` with a future `resetAtPrimary`.
4. Alive: everything else, sorted by primary remaining percent descending.

Empty sections SHALL be hidden.

#### Scenario: Mixed account states are sectioned
- **WHEN** accounts include one active with quota, one rate-limited with a
  future primary reset and secondary quota remaining, one with secondary
  remaining percent 0, and one paused
- **THEN** each appears in exactly one section: Alive, 5-hour dead, Weekly
  dead, and Out of rotation respectively

#### Scenario: Near-zero remaining counts as dead
- **WHEN** an account reports primary remaining percent 0.3 and secondary
  remaining percent 40
- **THEN** the account is classified 5-hour dead, weekly alive

#### Scenario: Stale account is out of rotation
- **WHEN** an account has `usage` null
- **THEN** the account appears in Out of rotation with a muted treatment

#### Scenario: Empty sections hidden
- **WHEN** no account is weekly dead
- **THEN** the Weekly dead section is not rendered

### Requirement: Dead sections show reset countdowns
Accounts in the 5-hour dead section SHALL show a countdown to their
`resetAtPrimary`; accounts in the Weekly dead section SHALL show a countdown
to their `resetAtSecondary`. When the relevant reset timestamp is null the
account row SHALL render without a countdown.

#### Scenario: 5-hour dead account shows primary reset countdown
- **WHEN** a 5-hour dead account has `resetAtPrimary` 42 minutes in the
  future
- **THEN** its row shows a countdown of approximately 42 minutes

### Requirement: Banked reset credits are actionable from compact account rows
The fork dashboard account rows SHALL render a compact reset-credit action
whenever an account reports `availableResetCredits > 0`. The action SHALL show
the available reset-credit count, SHALL include the soonest-expiring credit
countdown when `resetCreditNearestExpiresAt` is present, and SHALL open the
shared reset-credit confirmation flow used by the Accounts page. Read-only
operators SHALL NOT be able to redeem reset credits from the fork dashboard.

#### Scenario: Account row shows reset-credit count
- **WHEN** an account row receives `availableResetCredits = 2`
- **THEN** the row renders a reset-credit action showing `2`

#### Scenario: Reset action opens confirmation flow
- **WHEN** an operator activates the reset-credit action on a writable
  dashboard session
- **THEN** the shared reset-credit confirmation dialog opens for that account

#### Scenario: No banked credits hides the action
- **WHEN** an account reports `availableResetCredits = 0`
- **THEN** the fork dashboard row renders no reset-credit action

### Requirement: Next revival indicator
The fork dashboard SHALL display, adjacent to the primary window gauge, the
soonest `resetAtPrimary` among 5-hour-dead accounts and the display name of
that account. When no account is 5-hour dead the indicator SHALL be hidden.

#### Scenario: Soonest revival shown
- **WHEN** two accounts are 5-hour dead with primary resets in 10 and 50
  minutes
- **THEN** the indicator names the 10-minute account and its reset time

#### Scenario: No dead accounts
- **WHEN** no account is 5-hour dead
- **THEN** no next-revival indicator renders

### Requirement: Diagnostics are demoted to a collapsed disclosure
Error rate, depletion/burn projections, and the weekly credit pace card
SHALL render inside a collapsed-by-default disclosure section below the
account sections. The disclosure's open state SHALL persist across reloads
via the dashboard preferences store. The projections data SHALL be
unchanged from the existing backend responses.

#### Scenario: Diagnostics collapsed by default
- **WHEN** the fork dashboard first renders for an operator with no stored
  preference
- **THEN** error rate, depletion, and weekly pace content is not visible
  until the disclosure is expanded

#### Scenario: Disclosure state persists
- **WHEN** the operator expands the diagnostics disclosure and reloads
- **THEN** the disclosure renders expanded

### Requirement: Request logs remain available
The fork dashboard SHALL render the existing request logs section
(filters, table, pagination) below the new top sections, functionally
unchanged.

#### Scenario: Request logs render and filter
- **WHEN** the operator filters request logs by status on the fork dashboard
- **THEN** the table updates exactly as on the upstream dashboard
