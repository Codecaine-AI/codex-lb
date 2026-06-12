import { describe, expect, it } from "vitest";

import { createAccountSummary } from "@/test/mocks/factories";

import {
  classifyAccount,
  findNextRevival,
  outOfRotationReason,
  sectionAccounts,
  windowDisplayLabel,
} from "./utils";

const NOW_MS = Date.parse("2026-06-11T12:00:00Z");

function isoMinutesFromNow(minutes: number): string {
  return new Date(NOW_MS + minutes * 60_000).toISOString();
}

describe("classifyAccount", () => {
  it("classifies an active account with quota as alive", () => {
    const account = createAccountSummary({
      usage: { primaryRemainingPercent: 80, secondaryRemainingPercent: 60, monthlyRemainingPercent: null },
    });
    expect(classifyAccount(account, NOW_MS)).toBe("alive");
  });

  it("classifies near-zero primary remaining as fiveHourDead", () => {
    const account = createAccountSummary({
      usage: { primaryRemainingPercent: 0.3, secondaryRemainingPercent: 40, monthlyRemainingPercent: null },
    });
    expect(classifyAccount(account, NOW_MS)).toBe("fiveHourDead");
  });

  it("classifies rate_limited with a future primary reset as fiveHourDead", () => {
    const account = createAccountSummary({
      status: "rate_limited",
      usage: { primaryRemainingPercent: 12, secondaryRemainingPercent: 40, monthlyRemainingPercent: null },
      resetAtPrimary: isoMinutesFromNow(42),
    });
    expect(classifyAccount(account, NOW_MS)).toBe("fiveHourDead");
  });

  it("classifies zero secondary remaining as weeklyDead even when primary is dead too", () => {
    const account = createAccountSummary({
      usage: { primaryRemainingPercent: 0, secondaryRemainingPercent: 0, monthlyRemainingPercent: null },
    });
    expect(classifyAccount(account, NOW_MS)).toBe("weeklyDead");
  });

  it("classifies quota_exceeded with a future secondary reset as weeklyDead", () => {
    const account = createAccountSummary({
      status: "quota_exceeded",
      usage: { primaryRemainingPercent: 50, secondaryRemainingPercent: 10, monthlyRemainingPercent: null },
      resetAtSecondary: isoMinutesFromNow(60 * 24),
    });
    expect(classifyAccount(account, NOW_MS)).toBe("weeklyDead");
  });

  it("classifies paused, reauth_required, and deactivated as outOfRotation", () => {
    for (const status of ["paused", "reauth_required", "deactivated"]) {
      expect(classifyAccount(createAccountSummary({ status }), NOW_MS)).toBe("outOfRotation");
    }
  });

  it("classifies null usage as outOfRotation regardless of status", () => {
    const account = createAccountSummary({ usage: null });
    expect(classifyAccount(account, NOW_MS)).toBe("outOfRotation");
  });

  it("falls through to alive for unknown statuses with usage data", () => {
    const account = createAccountSummary({ status: "mystery_status" });
    expect(classifyAccount(account, NOW_MS)).toBe("alive");
  });
});

describe("sectionAccounts", () => {
  it("places every account in exactly one section and counts sum to total", () => {
    const accounts = [
      createAccountSummary({ accountId: "a1" }),
      createAccountSummary({
        accountId: "a2",
        status: "rate_limited",
        usage: { primaryRemainingPercent: 0, secondaryRemainingPercent: 40, monthlyRemainingPercent: null },
        resetAtPrimary: isoMinutesFromNow(30),
      }),
      createAccountSummary({
        accountId: "a3",
        usage: { primaryRemainingPercent: 5, secondaryRemainingPercent: 0, monthlyRemainingPercent: null },
      }),
      createAccountSummary({ accountId: "a4", status: "paused" }),
    ];

    const sections = sectionAccounts(accounts, NOW_MS);

    expect(sections.alive.map((a) => a.accountId)).toEqual(["a1"]);
    expect(sections.fiveHourDead.map((a) => a.accountId)).toEqual(["a2"]);
    expect(sections.weeklyDead.map((a) => a.accountId)).toEqual(["a3"]);
    expect(sections.outOfRotation.map((a) => a.accountId)).toEqual(["a4"]);

    const totalSectioned =
      sections.alive.length +
      sections.fiveHourDead.length +
      sections.weeklyDead.length +
      sections.outOfRotation.length;
    expect(totalSectioned).toBe(accounts.length);
  });

  it("sorts alive accounts by primary remaining percent descending", () => {
    const accounts = [
      createAccountSummary({
        accountId: "low",
        usage: { primaryRemainingPercent: 20, secondaryRemainingPercent: 50, monthlyRemainingPercent: null },
      }),
      createAccountSummary({
        accountId: "high",
        usage: { primaryRemainingPercent: 90, secondaryRemainingPercent: 50, monthlyRemainingPercent: null },
      }),
    ];

    const sections = sectionAccounts(accounts, NOW_MS);

    expect(sections.alive.map((a) => a.accountId)).toEqual(["high", "low"]);
  });
});

describe("windowDisplayLabel", () => {
  it("maps known window minutes to friendly labels", () => {
    expect(windowDisplayLabel(300, "Primary")).toBe("5 Hour");
    expect(windowDisplayLabel(10_080, "Secondary")).toBe("Weekly");
  });

  it("humanizes other durations and falls back when unknown", () => {
    expect(windowDisplayLabel(2880, "Primary")).toBe("2d");
    expect(windowDisplayLabel(null, "Primary")).toBe("Primary");
    expect(windowDisplayLabel(0, "Primary")).toBe("Primary");
  });
});

describe("findNextRevival", () => {
  it("picks the soonest future primary reset", () => {
    const dead = [
      createAccountSummary({ accountId: "later", resetAtPrimary: isoMinutesFromNow(50) }),
      createAccountSummary({
        accountId: "sooner",
        displayName: "soon@example.com",
        resetAtPrimary: isoMinutesFromNow(10),
      }),
    ];

    const revival = findNextRevival(dead, NOW_MS);

    expect(revival?.accountId).toBe("sooner");
    expect(revival?.label).toBe("soon@example.com");
  });

  it("returns null when no account has a usable future reset", () => {
    expect(findNextRevival([], NOW_MS)).toBeNull();
    expect(
      findNextRevival([createAccountSummary({ resetAtPrimary: null })], NOW_MS),
    ).toBeNull();
    expect(
      findNextRevival([createAccountSummary({ resetAtPrimary: isoMinutesFromNow(-5) })], NOW_MS),
    ).toBeNull();
  });
});

describe("outOfRotationReason", () => {
  it("describes status-based and stale exclusions", () => {
    expect(outOfRotationReason(createAccountSummary({ status: "reauth_required" }))).toBe(
      "reauth required",
    );
    expect(outOfRotationReason(createAccountSummary({ usage: null }))).toBe("no usage data");
  });
});
