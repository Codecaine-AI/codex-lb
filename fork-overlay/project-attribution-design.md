# Per-Project Attribution — Design

Fork layer: `project-attribution` (the overlay README's
`add-project-context-routing`, narrowed: attribution first, routing later).
Status: design.

## Problem

Today the only client-side identity is the API key (`Authorization: Bearer`,
validated in `app/core/auth/dependencies.py`), so seeing spend per project
means minting and wiring a key per project — which has proven awkward in
practice. Wanted: a request-scoped **project** label, independent of the key,
that shows up in request logs and spend rollups.

## Mechanism

A project is a short slug attached to each request. Resolution order:

1. **Header** `X-Project: <slug>` — explicit per-request override. Precedent:
   the proxy already honors custom client headers and persists them
   (`session_id` / `x-codex-session-id` / `x-codex-turn-state` in
   `app/modules/proxy/affinity.py:175`), so extraction follows an existing
   pattern.
2. **API key default** — new nullable `ApiKey.default_project` column, set in
   the dashboard. Existing key-per-project setups keep working with zero
   client changes: set each key's default project once, done. The user can
   then collapse to one key (or a few) and switch via header where clients
   allow it.
3. Neither → project is null; logs and rollups show "unattributed".

Validation: slug pattern `[a-z0-9][a-z0-9._-]{0,63}`, lowercased; invalid
values are dropped (treated as absent), never rejected with an error — a bad
label must not fail a proxy request. The value is persisted and rendered in
the dashboard, so sanitization is mandatory.

Not chosen, and why:

- **Reusing `RequestLog.source`** (`app/db/models.py:191`, indexed at
  `:1038`): it is the internal traffic-class tag (`limit_warmup` writes it;
  reports filter on it at `app/modules/reports/repository.py:213`).
  Overloading it mixes operator-facing project identity with internal
  bookkeeping. New column instead.
- **Project encoded in the bearer token** (`sk-xxx.project`): works with any
  client but complicates token hashing/caching
  (`app/core/auth/dependencies.py:78` caches by SHA256 of the raw token) and
  leaks identity into credentials. Skip.
- **URL path prefix** (`/p/<project>/v1/...`): universal (every client can
  set a base URL) and worth keeping as a possible phase 2 for clients that
  cannot set headers; not in the first cut.

## Changes

Backend (all additive):

- `RequestLog.project` — new nullable indexed String column; Alembic
  migration on the current head, with downgrade, no backfill needed
  (historical rows stay null = unattributed).
- `ApiKey.default_project` — new nullable String column; same migration.
- Proxy request-log path: resolve project per the order above and pass it
  through `_write_request_log` (`app/modules/proxy/_service/request_log.py`)
  into `request_logs/repository.add_log`.
- Aggregation: `aggregate_by_project` in `app/modules/reports/repository.py`
  modeled on `aggregate_by_account` (`:139`), and a usage summary modeled on
  `api_keys/repository.list_usage_summary_by_key` (`:190`). Exclude internal
  `source='limit_warmup'` rows like existing report queries do.
- API: expose project in request-log responses + filter options, and a
  spend-per-project report endpoint.

Frontend:

- Request logs: project column + filter (additive to existing filter row).
- Spend per project: a panel in reports, or a card in the fork dashboard's
  diagnostics/spend area — decide during the dashboard-restructure build
  since that page is fork-only anyway.
- API keys settings: default-project field on the key form (additive).

## Routing tie-in (later, not now)

Once requests carry a project, routing can use it (pin a project to an
account or a sticky preference, project-level traffic class). That is the
original `add-project-context-routing` idea — explicitly out of scope for
this layer; attribution must land and prove itself first.

## Divergence buckets

- **additive**: model columns + migration, request-log write path threading,
  report/api-key repository queries, API schema fields, small frontend
  filter/form edits.
- **fork-only**: spend-per-project UI if it lives in the fork dashboard.
- **owned**: none expected.

Candidate to upstream: plausibly yes — generic per-request labeling is not
fork-specific. Keep the header name neutral (`X-Project`) and the layer
self-contained so it can be PR'd to `Soju06/codex-lb` if it works out.

## Workflow gates

Schema + API + dashboard-visible: requires
`openspec/changes/project-attribution/` before implementation. Migration must
satisfy the Alembic gates (single head on current parent, downgrade path).
Regression coverage at the proxy route level: request with header, request
with key default, header overriding key default, invalid slug dropped,
unattributed rollup row.

## Open questions

- Header name: `X-Project` vs `X-Codex-LB-Project`. Neutral short name
  preferred unless collision risk shows up in practice.
- Should project be a first-class table (id, display name, color) instead of
  a free slug? First cut: free slug, no table — a registry can be added later
  without breaking logged slugs.
- Per-project budgets/limits (analogous to `ApiKeyLimit`): out of scope;
  revisit after attribution data exists.
