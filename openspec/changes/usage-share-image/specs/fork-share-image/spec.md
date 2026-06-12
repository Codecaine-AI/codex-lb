# Fork Share Image

## ADDED Requirements

### Requirement: Share cards render only aggregate, share-safe data
Share card components SHALL render only aggregate usage data derived from
the dashboard overview and reports responses. They SHALL NOT render
account emails, account ids, account names, or API key names. An
aggregate account count MAY be shown. Branding SHALL be an explicit
`brandText` input that defaults to none; cards SHALL render no wordmark
unless one is configured.

#### Scenario: No account identifiers or default wordmark in any variant
- **WHEN** any share card variant renders without configured branding
- **THEN** its output contains no account email, account id, API key
  name, or product wordmark text

#### Scenario: Configured branding renders
- **WHEN** a share card renders with a configured brand text
- **THEN** the brand text appears on the card

### Requirement: Hero card displays overview aggregates
The hero share card SHALL display total tokens, estimated API cost (USD),
and request count for its overview timeframe, with cached-share and
success-rate qualifiers, a token-volume sparkline, the cadence label
(Daily / Weekly / Monthly), and the explicit date range covered.

#### Scenario: Stats render from overview data
- **WHEN** the hero card renders from an overview with metrics
- **THEN** formatted tokens, cost, requests, cadence label, and date range
  are all present

#### Scenario: Null metrics render placeholders
- **WHEN** the overview has `summary.metrics` null
- **THEN** the hero card renders placeholder values rather than failing

### Requirement: Receipt card displays a tokens-by-model breakdown
The receipt share card SHALL display, from the reports response for its
calendar date range: total tokens (input + output) with per-model token
lines (top models by tokens, remainder collapsed into an "other" bucket,
zero-token models omitted), total requests, estimated API cost, the
prorated plan cost paid, and the savings percentage. It SHALL NOT display
a success or error rate.

#### Scenario: Model breakdown renders
- **WHEN** the receipt renders from a reports response with by-model
  token data
- **THEN** each top model appears with its token count and the totals,
  requests, est. API cost, plan cost, and savings lines are present

#### Scenario: No success rate
- **WHEN** the receipt renders
- **THEN** no success- or error-rate line is present

### Requirement: Receipt footer QR code
The receipt share card SHALL render a scannable QR code for a configured
target URL in its footer, with the bare domain printed beneath it. When
no URL is configured the footer SHALL fall back to the decorative
barcode.

#### Scenario: QR renders for a configured URL
- **WHEN** the receipt renders with a QR URL
- **THEN** a QR code encoding that URL and the printed domain are present

#### Scenario: Barcode fallback
- **WHEN** the receipt renders without a QR URL
- **THEN** the decorative barcode renders instead of a QR code

### Requirement: Reports by-model entries include token totals
The reports API (`GET /api/reports`) SHALL include, for each `byModel`
entry, a `tokens` field equal to the summed input and output tokens of
the normal (non-warmup) requests aggregated into that entry. The field is
additive and defaults to 0 for consumers of older payloads.

#### Scenario: By-model tokens are summed
- **WHEN** request logs exist for a model within the queried range
- **THEN** that model's `byModel` entry reports the sum of its input and
  output tokens

### Requirement: Share cards have fixed dimensions and a fixed palette
Share card variants SHALL render at fixed pixel dimensions (hero
1200×675; receipt 1080×1350) with hardcoded colors independent of the
dashboard theme, so a future rasterization step produces identical output
in light and dark mode.

#### Scenario: Card size is viewport-independent
- **WHEN** a share card renders inside any container
- **THEN** its intrinsic size equals its declared capture dimensions

### Requirement: Share lab preview route
The SPA SHALL render a share lab page at `/share-lab` that previews the
hero and receipt variants at every posting cadence (Daily, Weekly,
Monthly) using live data — the dashboard overview per timeframe for the
hero and the reports endpoint per calendar range for the receipt. The
app navigation SHALL include a "Share" item linking to `/share-lab`
(to be repointed at the phase-2 share dialog when it lands).

#### Scenario: Lab renders all cadences
- **WHEN** an authenticated operator navigates to `/share-lab`
- **THEN** Daily, Weekly, and Monthly sections render, each containing
  the hero and receipt variants

#### Scenario: Share is reachable from the top bar
- **WHEN** the app header renders
- **THEN** a "Share" navigation item links to `/share-lab`

### Requirement: Share lab card inspection and download
Each previewed card in the share lab SHALL expand to a near-full-screen
modal on click, and SHALL offer a PNG download rendered from the
true-size card at 2× capture scale via an oklch-compatible DOM-to-image
rasterizer.

#### Scenario: Card expands in a modal
- **WHEN** the operator clicks a card preview
- **THEN** the card renders in a modal scaled to fit the viewport

#### Scenario: Card downloads as PNG
- **WHEN** the operator clicks a card's download action
- **THEN** a PNG of the card rasterized at 2× its capture dimensions is
  downloaded
