# Design — Usage Share Image

## Goals

- One-click shareable image of aggregate usage at the operator's posting
  cadence (daily / weekly / monthly).
- Share-safe by construction: the cards render only aggregates — never
  account emails, account ids, or API key names — and no product wordmark
  until a public-facing name is chosen.
- Deterministic rendering: cards use a fixed palette and fixed pixel
  dimensions so the rasterized PNG matches the on-screen preview and is
  independent of the dashboard theme.

## Data

Two sources, one per card:

**Hero** — dashboard overview
(`GET /api/dashboard/overview?timeframe={1d|7d|30d}`, rolling window):

| Card element | Source |
|--------------|--------|
| Tokens | `summary.metrics.tokens` |
| Cached share | `summary.metrics.cachedInputTokens / tokens` |
| Est. API cost | `summary.cost.totalUsd` |
| Requests / success | `summary.metrics.requests`, `1 - errorRate` |
| Token sparkline | `trends.tokens[].v` |

**Receipt** — reports endpoint
(`GET /api/reports?start_date&end_date`, calendar days — which matches a
"daily/weekly/monthly receipt" better than a rolling window):

| Card element | Source |
|--------------|--------|
| Tokens | `summary.totalInputTokens + totalOutputTokens` |
| Tokens by model | `byModel[].tokens` (added by this change) |
| Requests | `summary.totalRequests` |
| Est. API cost | `summary.totalCostUsd` |
| You paid / savings | `accounts × plan $/mo × days/30` vs. est. cost |

Pure builders map responses to card props: `buildShareCardData(overview)`
and `buildReceiptData(reports, options)`.

## Layouts

### Hero — 1200×675 (Twitter summary_large_image ratio)

```
┌──────────────────────────────────────────────────────────────────────┐
│   ◉                                                   Last 7 days    │
│                                                                      │
│     147.2M              $312.40                 8,431                │
│     TOKENS              EST. API COST           REQUESTS             │
│     38% cached          if paid per-token       99.6% success        │
│                                                                      │
│   token volume                                                       │
│   ▂▃▂▅▆▄▇█▆▅▇▇█▆▅▃▅▆▇█▇▆▅▆▇█▇▆▅▆▇▆▅▆▇█▇                              │
│                                                                      │
│   Weekly snapshot                          Jun 4 – Jun 11, 2026      │
└──────────────────────────────────────────────────────────────────────┘
```

Dark fixed palette, three stats max, one accent color, logo mark only
(no wordmark).

### Receipt — 1080×1350 (4:5 portrait, mobile-friendly crop)

```
┌──────────────────────────┐
│      USAGE RECEIPT       │
│   Weekly · Jun 5 – 11    │
│  ──────────────────────  │
│  TOKENS         147.2M   │
│   · gpt-5.3-codex 98.0M  │
│   · gpt-5.3       31.2M  │
│   · gpt-5.2-mini  12.4M  │
│   · other          5.6M  │
│  REQUESTS        8,431   │
│  ──────────────────────  │
│  EST. API COST  $312.40  │
│  YOU PAID       ~$46.67  │
│ ▓SAVINGS            85%▓ │
│  ──────────────────────  │
│        ▄▄▄▄▄▄▄           │
│        █ QR  █           │
│        ▀▀▀▀▀▀▀           │
│       lascari.ai         │
└──────────────────────────┘
```

Paper-light fixed palette, monospace. Top four models by tokens plus an
"other" bucket; zero-token models omitted. "You paid" is the plan price
prorated to the timeframe; the plan price is a placeholder constant
(`PLAN_USD_PER_MONTH`) during prototyping and becomes a setting if the
receipt ships.

### Gauge — dropped

A 1200×675 quota-used-ring variant was prototyped and dropped after the
first lab review: quota-% is operator-facing, not meaningful to outside
viewers.

## Decisions

- **Cadence is first-class.** Every card carries the cadence label and an
  explicit date range; the share lab previews all three cadences side by
  side.
- **Receipt is calendar-aligned, hero is rolling.** The receipt reads the
  reports endpoint (calendar days), the hero reads the overview (rolling
  window). Their totals can differ slightly by design; each card is
  internally consistent.
- **By-model tokens come from the backend.** The reports by-model
  aggregate gains summed input+output tokens (additive response field)
  rather than the frontend re-aggregating request logs client-side.
- **No success rate on the receipt** (review feedback) — the receipt is
  tokens-by-model, requests, and the cost punchline only.
- **Branding is configurable, default none.** Cards take a `brandText`
  prop (hero: wordmark next to the logo mark; receipt: brand line above
  the title). The share lab has a settings bar with presets ("Lascari
  AI", "Codecaine") and free text, persisted in localStorage, so names
  can be auditioned live before one is chosen.
- **Receipt QR over barcode.** The receipt footer renders a scannable QR
  code (inline SVG via `qrcode-generator`) pointing at a configurable
  URL (lab setting, default `https://lascari.ai`), with the bare domain
  printed beneath; an empty URL falls back to the decorative barcode.
- **Fixed palette over theme tokens.** The app theme uses `oklch()` CSS
  variables and a light/dark toggle. Cards hardcode their colors so the
  exported PNG is identical regardless of dashboard theme.
- **Inline SVG over Recharts inside cards.** Sparkline and barcode are
  hand-rolled SVG: deterministic, no animation/responsive-container
  complications during DOM-to-image capture.
- **Rasterizer (phase 2): `modern-screenshot` / `html-to-image`,** which
  paint via SVG `<foreignObject>` and therefore support `oklch()` and any
  CSS the browser renders. `html2canvas` re-implements CSS parsing and
  throws on `oklch()` — ruled out.
- **Share lab is a temporary route.** `/share-lab` exists to evaluate the
  candidates against live data; it is retired (or kept as a hidden dev
  tool) once a variant ships. Originally unlinked, it gained a top-bar
  "Share" nav item once it became the operator's day-to-day way to
  produce share images; the nav item repoints at the phase-2 share
  dialog when that lands.
- **Lab-only estimation shim for old backends.** Until the live deployment
  ships the by-model token sums, the lab estimates each model's tokens
  from its cost share (`withEstimatedModelTokens`) and labels the preview
  "model split estimated from cost share". The receipt component itself
  never estimates; the shim is removed with phase 2.

## Open questions (to resolve before phase 2)

- The wordmark/name to print on the cards.
- Whether the receipt's plan-price input becomes a fork setting (and
  whether it should be per-account plan-aware: Plus vs. Pro).
- Whether both variants ship in the share dialog or only one.
