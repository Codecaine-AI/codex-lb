# Usage Share Image

## Why

The operator wants to share aggregate usage stats (tokens, estimated API
cost, requests) as an image on social media, at a daily / weekly / monthly
cadence. The dashboard already has most of the data
(`GET /api/dashboard/overview` returns metrics, cost, and trends per
timeframe; `GET /api/reports` returns per-model rollups); what is missing
is a presentation of those aggregates as a fixed-size, share-safe image
and a way to download or copy it. This is the fork's `usage-share-image`
layer.

## What Changes

Phase 1 (prototyping — current state after the first lab review):

- Fixed-size share-card render components for two layout candidates
  (a third, "gauge", was prototyped and dropped after review):
  - **Hero** (1200×675, Twitter `summary_large_image` ratio): three big
    stats + token sparkline, from the dashboard overview.
  - **Receipt** (1080×1350, 4:5 portrait): itemized "usage receipt" from
    the reports endpoint — tokens broken down by model, requests, and an
    est.-API-cost vs. plan-cost savings punchline.
- Cards carry no product wordmark (an anonymous logo mark only); the
  wordmark string is a placeholder constant until a name is chosen.
- A fork-only `/share-lab` route renders both variants at all three
  cadences (daily / weekly / monthly) from live data, scaled down.
- **Backend (additive)**: the reports by-model aggregate
  (`GET /api/reports` → `byModel[]`) gains a summed `tokens` field
  (input + output) so the receipt can break tokens down by model.

Phase 2 (after a variant is chosen):

- Share dialog on the fork dashboard with a live preview, cadence
  selection, show-cost toggle, **Download PNG** and **Copy to clipboard**
  actions (rasterized at 2× via an oklch-safe DOM-to-image library).
- Retire or hide the share lab route.

## Capabilities

### New Capabilities

- `fork-share-image`: share-safe usage image rendering — fixed-size card
  layouts built from dashboard overview and reports aggregates, a preview
  lab route, the reports by-model token sums powering the receipt, and
  (phase 2) PNG export actions.

### Modified Capabilities

<!-- none: no existing capability spec covers the reports endpoint; the
     by-model tokens requirement lives in fork-share-image -->

## Impact

- New code under `frontend/src/features/fork/share/` (fork-only).
- Additive route registration in `frontend/src/App.tsx` (`/share-lab`).
- Additive backend edit: `app/modules/reports/{repository,service,schemas}.py`
  (by-model token sums; response field is additive and backward
  compatible).
- Additive frontend edits: reports schema field, reports-page test
  fixtures, MSW reports factory/handler/coverage registration.
- Phase 2 adds one frontend dependency for DOM-to-PNG rasterization
  (`modern-screenshot` or `html-to-image`; `html2canvas` is ruled out
  because the theme uses `oklch()` colors it cannot parse).
- Fork divergence ledger: `fork-overlay/divergence-ledger.md` tracks the
  layer, the fork-only path, and every additive edit above.
