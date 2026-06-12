import type { DashboardOverview, OverviewTimeframe } from "@/features/dashboard/schemas";
import type { ReportsResponse } from "@/features/reports/schemas";

export type ShareCardData = {
  timeframe: OverviewTimeframe;
  /** Posting cadence the timeframe maps to: Daily / Weekly / Monthly. */
  cadenceLabel: string;
  /** Human range label: "Last 24 hours" / "Last 7 days" / "Last 30 days". */
  rangeLabel: string;
  /** Explicit dates covered, e.g. "Jun 4 – Jun 11, 2026". */
  dateRangeLabel: string;
  tokens: number | null;
  cachedPercent: number | null;
  requests: number | null;
  successPercent: number | null;
  costUsd: number;
  tokensTrend: number[];
};

export type ReceiptModelLine = {
  model: string;
  tokens: number;
};

export type ReceiptData = {
  cadenceLabel: string;
  dateRangeLabel: string;
  /** Calendar days covered, used to prorate the plan cost. */
  windowDays: number;
  tokens: number;
  requests: number;
  costUsd: number;
  modelLines: ReceiptModelLine[];
  accountCount: number;
};

export type ShareCadence = {
  timeframe: OverviewTimeframe;
  cadenceLabel: string;
  windowDays: number;
};

export const SHARE_CADENCES: ShareCadence[] = [
  { timeframe: "1d", cadenceLabel: "Daily", windowDays: 1 },
  { timeframe: "7d", cadenceLabel: "Weekly", windowDays: 7 },
  { timeframe: "30d", cadenceLabel: "Monthly", windowDays: 30 },
];

const TIMEFRAME_LABELS: Record<OverviewTimeframe, { cadence: string; range: string }> = {
  "1d": { cadence: "Daily", range: "Last 24 hours" },
  "7d": { cadence: "Weekly", range: "Last 7 days" },
  "30d": { cadence: "Monthly", range: "Last 30 days" },
};

const MAX_MODEL_LINES = 4;

const dayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dayYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatShareDateRange(start: Date, end: Date): string {
  if (start.toDateString() === end.toDateString()) {
    return dayYearFormatter.format(end);
  }
  return `${dayFormatter.format(start)} – ${dayYearFormatter.format(end)}`;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function buildShareCardData(overview: DashboardOverview, now: Date = new Date()): ShareCardData {
  const labels = TIMEFRAME_LABELS[overview.timeframe.key];
  const windowMinutes = overview.timeframe.windowMinutes;
  const start = new Date(now.getTime() - windowMinutes * 60_000);

  const metrics = overview.summary.metrics;
  const tokens = metrics?.tokens ?? null;
  const cachedInputTokens = metrics?.cachedInputTokens ?? null;
  const cachedPercent =
    tokens !== null && tokens > 0 && cachedInputTokens !== null
      ? clampPercent((cachedInputTokens / tokens) * 100)
      : null;
  const errorRate = metrics?.errorRate ?? null;
  const successPercent = errorRate === null ? null : clampPercent((1 - errorRate) * 100);

  return {
    timeframe: overview.timeframe.key,
    cadenceLabel: labels.cadence,
    rangeLabel: labels.range,
    dateRangeLabel: formatShareDateRange(start, now),
    tokens,
    cachedPercent,
    requests: metrics?.requests ?? null,
    successPercent,
    costUsd: overview.summary.cost.totalUsd,
    tokensTrend: overview.trends.tokens.map((point) => point.v),
  };
}

export type ReceiptOptions = {
  cadenceLabel: string;
  dateRangeLabel: string;
  windowDays: number;
  accountCount: number;
};

/**
 * Compatibility shim for backends that predate by-model token sums: when
 * every byModel entry reports 0 tokens but costs exist, estimate each
 * model's tokens from its cost share of the total. Used by the share lab
 * only, labeled as an estimate; remove once the live backend ships the
 * real sums.
 */
export function withEstimatedModelTokens(reports: ReportsResponse): {
  reports: ReportsResponse;
  estimated: boolean;
} {
  const totalTokens = reports.summary.totalInputTokens + reports.summary.totalOutputTokens;
  const hasModels = reports.byModel.length > 0;
  const allZero = reports.byModel.every((entry) => entry.tokens === 0);
  const totalCost = reports.byModel.reduce((sum, entry) => sum + entry.costUsd, 0);
  if (!hasModels || !allZero || totalTokens <= 0 || totalCost <= 0) {
    return { reports, estimated: false };
  }
  return {
    reports: {
      ...reports,
      byModel: reports.byModel.map((entry) => ({
        ...entry,
        tokens: Math.round(totalTokens * (entry.costUsd / totalCost)),
      })),
    },
    estimated: true,
  };
}

export function buildReceiptData(reports: ReportsResponse, options: ReceiptOptions): ReceiptData {
  const sorted = [...reports.byModel].sort((a, b) => b.tokens - a.tokens);
  const modelLines = sorted
    .slice(0, MAX_MODEL_LINES)
    .filter((entry) => entry.tokens > 0)
    .map((entry) => ({ model: entry.model, tokens: entry.tokens }));
  const restTokens = sorted
    .slice(MAX_MODEL_LINES)
    .reduce((sum, entry) => sum + entry.tokens, 0);
  if (restTokens > 0) {
    modelLines.push({ model: "other", tokens: restTokens });
  }

  return {
    cadenceLabel: options.cadenceLabel,
    dateRangeLabel: options.dateRangeLabel,
    windowDays: options.windowDays,
    tokens: reports.summary.totalInputTokens + reports.summary.totalOutputTokens,
    requests: reports.summary.totalRequests,
    costUsd: reports.summary.totalCostUsd,
    modelLines,
    accountCount: options.accountCount,
  };
}
