import { describe, expect, it } from "vitest";

import { createDashboardOverview, createReportsResponse } from "@/test/mocks/factories";

import {
  buildReceiptData,
  buildShareCardData,
  formatShareDateRange,
  withEstimatedModelTokens,
} from "./share-data";

const NOW = new Date(2026, 5, 11, 12, 0, 0);

describe("formatShareDateRange", () => {
  it("formats a multi-day range", () => {
    expect(formatShareDateRange(new Date(2026, 5, 4), new Date(2026, 5, 11))).toBe(
      "Jun 4 – Jun 11, 2026",
    );
  });

  it("collapses a same-day range to a single date", () => {
    expect(formatShareDateRange(new Date(2026, 5, 11, 1), new Date(2026, 5, 11, 23))).toBe(
      "Jun 11, 2026",
    );
  });
});

describe("buildShareCardData", () => {
  it("maps overview aggregates for the default 7d timeframe", () => {
    const data = buildShareCardData(createDashboardOverview(), NOW);

    expect(data.timeframe).toBe("7d");
    expect(data.cadenceLabel).toBe("Weekly");
    expect(data.rangeLabel).toBe("Last 7 days");
    expect(data.dateRangeLabel).toBe("Jun 4 – Jun 11, 2026");
    expect(data.tokens).toBe(45_000);
    expect(data.cachedPercent).toBeCloseTo((8_200 / 45_000) * 100, 5);
    expect(data.requests).toBe(228);
    expect(data.successPercent).toBeCloseTo(97.2, 5);
    expect(data.costUsd).toBe(1.82);
    expect(data.tokensTrend.length).toBeGreaterThan(1);
  });

  it("derives daily cadence labels from a 1d timeframe", () => {
    const overview = createDashboardOverview({
      timeframe: { key: "1d", windowMinutes: 1_440, bucketSeconds: 3_600, bucketCount: 24 },
    });
    const data = buildShareCardData(overview, NOW);

    expect(data.cadenceLabel).toBe("Daily");
    expect(data.rangeLabel).toBe("Last 24 hours");
    expect(data.dateRangeLabel).toBe("Jun 10 – Jun 11, 2026");
  });

  it("yields null metric fields when summary.metrics is null", () => {
    const base = createDashboardOverview();
    const data = buildShareCardData(
      { ...base, summary: { ...base.summary, metrics: null } },
      NOW,
    );

    expect(data.tokens).toBeNull();
    expect(data.cachedPercent).toBeNull();
    expect(data.requests).toBeNull();
    expect(data.successPercent).toBeNull();
  });
});

const RECEIPT_OPTIONS = {
  cadenceLabel: "Weekly",
  dateRangeLabel: "Jun 5 – Jun 11, 2026",
  windowDays: 7,
  accountCount: 3,
};

describe("buildReceiptData", () => {
  it("maps report summary totals and model lines sorted by tokens", () => {
    const data = buildReceiptData(createReportsResponse(), RECEIPT_OPTIONS);

    expect(data.tokens).toBe(45_000);
    expect(data.requests).toBe(228);
    expect(data.costUsd).toBe(1.82);
    expect(data.modelLines).toEqual([
      { model: "gpt-5.3-codex", tokens: 30_000 },
      { model: "gpt-5.3", tokens: 11_000 },
      { model: "gpt-5.2-mini", tokens: 4_000 },
    ]);
    expect(data.cadenceLabel).toBe("Weekly");
    expect(data.accountCount).toBe(3);
  });

  it("collapses models beyond the top four into an other bucket", () => {
    const reports = createReportsResponse({
      byModel: [
        { model: "m1", costUsd: 1, requests: 10, percentage: 50, tokens: 500 },
        { model: "m2", costUsd: 0.5, requests: 8, percentage: 25, tokens: 400 },
        { model: "m3", costUsd: 0.2, requests: 6, percentage: 10, tokens: 300 },
        { model: "m4", costUsd: 0.1, requests: 4, percentage: 8, tokens: 200 },
        { model: "m5", costUsd: 0.1, requests: 2, percentage: 5, tokens: 100 },
        { model: "m6", costUsd: 0.05, requests: 1, percentage: 2, tokens: 50 },
      ],
    });
    const data = buildReceiptData(reports, RECEIPT_OPTIONS);

    expect(data.modelLines).toHaveLength(5);
    expect(data.modelLines.at(-1)).toEqual({ model: "other", tokens: 150 });
  });

  it("estimates model tokens from cost share for old backend payloads", () => {
    const reports = createReportsResponse({
      byModel: [
        { model: "m1", costUsd: 3, requests: 30, percentage: 75, tokens: 0 },
        { model: "m2", costUsd: 1, requests: 10, percentage: 25, tokens: 0 },
      ],
    });
    const { reports: estimatedReports, estimated } = withEstimatedModelTokens(reports);

    expect(estimated).toBe(true);
    expect(estimatedReports.byModel).toEqual([
      { model: "m1", costUsd: 3, requests: 30, percentage: 75, tokens: 33_750 },
      { model: "m2", costUsd: 1, requests: 10, percentage: 25, tokens: 11_250 },
    ]);
  });

  it("leaves real model tokens untouched", () => {
    const reports = createReportsResponse();
    const { reports: unchanged, estimated } = withEstimatedModelTokens(reports);

    expect(estimated).toBe(false);
    expect(unchanged).toBe(reports);
  });

  it("omits zero-token models from the breakdown", () => {
    const reports = createReportsResponse({
      byModel: [
        { model: "m1", costUsd: 1, requests: 10, percentage: 100, tokens: 500 },
        { model: "legacy-untracked", costUsd: 0, requests: 0, percentage: 0, tokens: 0 },
      ],
    });
    const data = buildReceiptData(reports, RECEIPT_OPTIONS);

    expect(data.modelLines).toEqual([{ model: "m1", tokens: 500 }]);
  });
});
