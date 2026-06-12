import type { AccountSummary } from "@/features/dashboard/schemas";
import { formatWindowMinutes } from "@/utils/formatters";

export type QuotaSectionKey = "alive" | "fiveHourDead" | "weeklyDead" | "outOfRotation";

export type AccountSections = Record<QuotaSectionKey, AccountSummary[]>;

export type NextRevival = {
  accountId: string;
  label: string;
  resetAt: string;
};

/**
 * Synced remaining percentages can hover just above zero while upstream
 * already rejects requests, so "dead" uses a small epsilon instead of 0.
 */
const DEAD_EPSILON_PERCENT = 0.5;

const OUT_OF_ROTATION_STATUSES = new Set(["paused", "reauth_required", "deactivated"]);

function isFutureReset(resetAt: string | null | undefined, nowMs: number): boolean {
  if (!resetAt) {
    return false;
  }
  const resetMs = Date.parse(resetAt);
  return Number.isFinite(resetMs) && resetMs > nowMs;
}

function isDeadPercent(remainingPercent: number | null | undefined): boolean {
  return typeof remainingPercent === "number" && remainingPercent <= DEAD_EPSILON_PERCENT;
}

export function classifyAccount(account: AccountSummary, nowMs: number = Date.now()): QuotaSectionKey {
  if (OUT_OF_ROTATION_STATUSES.has(account.status) || account.usage == null) {
    return "outOfRotation";
  }
  if (
    isDeadPercent(account.usage.secondaryRemainingPercent) ||
    (account.status === "quota_exceeded" && isFutureReset(account.resetAtSecondary, nowMs))
  ) {
    return "weeklyDead";
  }
  if (
    isDeadPercent(account.usage.primaryRemainingPercent) ||
    (account.status === "rate_limited" && isFutureReset(account.resetAtPrimary, nowMs))
  ) {
    return "fiveHourDead";
  }
  return "alive";
}

export function sectionAccounts(accounts: AccountSummary[], nowMs: number = Date.now()): AccountSections {
  const sections: AccountSections = {
    alive: [],
    fiveHourDead: [],
    weeklyDead: [],
    outOfRotation: [],
  };
  for (const account of accounts) {
    sections[classifyAccount(account, nowMs)].push(account);
  }
  sections.alive.sort(
    (a, b) =>
      (b.usage?.primaryRemainingPercent ?? -1) - (a.usage?.primaryRemainingPercent ?? -1),
  );
  return sections;
}

/** Human label for a quota window, derived from its minutes — never hardcoded per plan. */
export function windowDisplayLabel(
  windowMinutes: number | null | undefined,
  fallback: string,
): string {
  if (windowMinutes == null || windowMinutes <= 0) {
    return fallback;
  }
  if (windowMinutes === 300) {
    return "5 Hour";
  }
  if (windowMinutes === 10_080) {
    return "Weekly";
  }
  const formatted = formatWindowMinutes(windowMinutes);
  return formatted === "--" ? fallback : formatted;
}

export function accountDisplayLabel(account: AccountSummary): string {
  return account.displayName || account.email || account.accountId;
}

/** Soonest primary reset among 5-hour-dead accounts; null when none qualify. */
export function findNextRevival(
  fiveHourDead: AccountSummary[],
  nowMs: number = Date.now(),
): NextRevival | null {
  let best: { account: AccountSummary; resetMs: number } | null = null;
  for (const account of fiveHourDead) {
    if (!account.resetAtPrimary) {
      continue;
    }
    const resetMs = Date.parse(account.resetAtPrimary);
    if (!Number.isFinite(resetMs) || resetMs <= nowMs) {
      continue;
    }
    if (best === null || resetMs < best.resetMs) {
      best = { account, resetMs };
    }
  }
  if (best === null) {
    return null;
  }
  return {
    accountId: best.account.accountId,
    label: accountDisplayLabel(best.account),
    resetAt: best.account.resetAtPrimary as string,
  };
}

export function outOfRotationReason(account: AccountSummary): string {
  if (account.usage == null && !OUT_OF_ROTATION_STATUSES.has(account.status)) {
    return "no usage data";
  }
  return account.status.replaceAll("_", " ");
}
