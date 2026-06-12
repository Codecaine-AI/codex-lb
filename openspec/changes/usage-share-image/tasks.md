# Tasks — Usage Share Image

## 1. Share data mapping (fork-only)

- [x] 1.1 Create `frontend/src/features/fork/share/share-data.ts` with
      `ShareCardData` / `buildShareCardData(overview, now)` (hero) and
      `ReceiptData` / `buildReceiptData(reports, options)` (receipt):
      cadence/range labels, date-range labels, cached/success percents,
      token trend values, by-model token lines (top 4 + "other",
      zero-token models omitted).
- [x] 1.2 Unit tests `share-data.test.ts`: label/date-range derivation,
      percent math, null `summary.metrics` yields null fields, model-line
      sorting / other-bucket / zero-token omission.

## 2. Card variants (fork-only)

- [x] 2.1 `components/share-sparkline.tsx`: inline-SVG sparkline (line +
      area fill) from trend values; renders nothing for <2 points.
- [x] 2.2 `components/share-card-hero.tsx`: 1200×675 dark card — logo
      mark (no wordmark), range label, tokens/cost/requests hero stats
      with qualifiers, sparkline, cadence + date-range footer.
- [x] 2.3 `components/share-card-receipt.tsx`: 1080×1350 paper card —
      tokens with per-model lines, requests, est. API cost vs. prorated
      plan cost, savings banner, placeholder plan-price constant; no
      success rate, no wordmark.
- [x] 2.4 Card tests: each variant renders fixture data; no account
      identifiers and no wordmark; null-metric fixture renders
      placeholders; receipt has no success line.
- [x] 2.5 ~~Gauge variant~~ — prototyped, then removed after the first
      lab review (operator feedback: quota-% not meaningful to outside
      viewers).

## 3. Reports by-model tokens (additive backend)

- [x] 3.1 `app/modules/reports/repository.py`: `ModelAggregateRow` gains
      `tokens`; by-model query sums input and output tokens.
- [x] 3.2 `app/modules/reports/schemas.py` + `service.py`:
      `ModelCostEntry.tokens` (default 0) passed through to the response.
- [x] 3.3 `tests/integration/test_reports_api.py`: by-model assertions
      cover the new `tokens` field.
- [x] 3.4 Frontend `features/reports/schemas.ts`: `tokens` field
      (optional, default 0) on `ModelCostEntrySchema`; reports-page test
      fixtures updated.

## 4. Share lab preview route

- [x] 4.1 `components/share-lab-page.tsx`: per cadence, fetch the
      overview (hero) via `useDashboard` and the calendar-range report
      (receipt) via `useReports`; render both variants scaled down with
      true-size capture dimensions noted.
- [x] 4.2 Additive route in `frontend/src/App.tsx`: `/share-lab` renders
      the share lab page (one import + one route line; not in the nav).
- [x] 4.3 Route test in
      `frontend/src/__integration__/fork-dashboard-routes.test.tsx`:
      `/share-lab` renders all three cadence sections with both variants.
- [x] 4.4 MSW mocks: `createReportsResponse` factory, `GET /api/reports`
      handler, handler-coverage registration.
- [x] 4.5 Lab-only `withEstimatedModelTokens` shim: estimate model tokens
      from cost share when the live backend predates the `tokens` field,
      with an "estimated" caption on the preview.
- [x] 4.6 Lab interactivity: click any card preview to inspect it in a
      near-fullscreen modal; settings bar for brand text (presets + free
      text) and QR link, persisted in localStorage and applied live.
- [x] 4.7 Receipt QR footer: `share-qr.tsx` (inline-SVG QR via the
      `qrcode-generator` dependency) replaces the barcode when a QR link
      is configured; "thank you" footer line removed.
- [x] 4.8 Per-card PNG download in the lab: `modern-screenshot`
      (oklch-safe) rasterizes the true-size card at 2× from the preview
      and modal, named `usage-<variant>-<cadence>.png`.
- [x] 4.9 Top-bar "Share" nav item → `/share-lab` in
      `app-header.tsx` `NAV_ITEMS` (supersedes the not-in-nav note in
      4.2); nav-link assertion added to the fork routes test.

## 5. Verification and fork bookkeeping (phase 1)

- [x] 5.1 Frontend suite green (`bun run test`), `tsc -b` passes, backend
      reports tests green (`uv run pytest tests/integration/test_reports_api.py`).
- [x] 5.2 Update `fork-overlay/divergence-ledger.md`: layer row, fork-only
      paths, additive entries for `App.tsx`, reports backend files,
      reports frontend schema/tests, and MSW mock files.

## 6. Export dialog (phase 2 — after a variant is chosen)

- [ ] 6.1 Decide the wordmark/name to print on the cards (placeholder
      constant `SHARE_BRAND_TEXT` until then).
- [x] 6.2 Add oklch-safe rasterizer dependency (`modern-screenshot`);
      2× export landed in the lab (task 4.8).
- [ ] 6.3 Share dialog on the fork dashboard: preview, cadence select,
      show-cost toggle, Download PNG, Copy to clipboard.
- [ ] 6.4 Plan-price setting for the receipt (replace
      `PLAN_USD_PER_MONTH` placeholder).
- [ ] 6.5 Retire or hide `/share-lab` and remove the
      `withEstimatedModelTokens` shim (requires the live backend to be
      rebuilt with the by-model token sums); update spec + ledger
      accordingly.
