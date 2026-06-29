import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/utils";
import {
  createAccountSummary,
  createDashboardOverview,
  createDashboardProjections,
} from "@/test/mocks/factories";
import { useAccountMutations, useRateLimitResetCredits } from "@/features/accounts/hooks/use-accounts";
import { useDashboard, useDashboardProjections } from "@/features/dashboard/hooks/use-dashboard";
import type { DashboardOverview, DashboardProjections } from "@/features/dashboard/schemas";
import { useDashboardPreferencesStore } from "@/hooks/use-dashboard-preferences";

import { TooltipProvider } from "@/components/ui/tooltip";

import { ForkDashboardPage } from "./fork-dashboard-page";

function renderPage() {
  return renderWithProviders(
    <TooltipProvider>
      <ForkDashboardPage />
    </TooltipProvider>,
  );
}

vi.mock("@/features/accounts/hooks/use-accounts", () => ({
  useAccountMutations: vi.fn(),
  useRateLimitResetCredits: vi.fn(),
}));

vi.mock("@/features/dashboard/hooks/use-dashboard", () => ({
  useDashboard: vi.fn(),
  useDashboardProjections: vi.fn(),
}));

vi.mock("@/features/dashboard/components/filters/overview-timeframe-select", () => ({
  OverviewTimeframeSelect: () => <div data-testid="overview-timeframe-select" />,
}));

const useAccountMutationsMock = vi.mocked(useAccountMutations);
const useRateLimitResetCreditsMock = vi.mocked(useRateLimitResetCredits);
const useDashboardMock = vi.mocked(useDashboard);
const useDashboardProjectionsMock = vi.mocked(useDashboardProjections);

function mockQueries(
  overview: DashboardOverview,
  projections: DashboardProjections | undefined = createDashboardProjections(),
) {
  useAccountMutationsMock.mockReturnValue({
    resumeMutation: { mutateAsync: vi.fn() },
    limitWarmupMutation: { mutateAsync: vi.fn() },
    resetCreditConsumeMutation: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) },
  } as unknown as ReturnType<typeof useAccountMutations>);
  useDashboardMock.mockReturnValue({
    data: overview,
    isFetching: false,
    error: null,
  } as ReturnType<typeof useDashboard>);
  useDashboardProjectionsMock.mockReturnValue({
    data: projections,
    isFetching: false,
    error: null,
  } as ReturnType<typeof useDashboardProjections>);
}

function offsetIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe("ForkDashboardPage", () => {
  beforeEach(() => {
    useAccountMutationsMock.mockReset();
    useRateLimitResetCreditsMock.mockReset();
    useDashboardMock.mockReset();
    useDashboardProjectionsMock.mockReset();
    window.localStorage.clear();
    useDashboardPreferencesStore.setState({ forkDiagnosticsOpen: false });
    useRateLimitResetCreditsMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
    } as ReturnType<typeof useRateLimitResetCredits>);
  });

  it("renders primary stats, gauges, account sections, and request logs", () => {
    mockQueries(createDashboardOverview());

    renderPage();

    // Stats render as a vertical column ordered tokens, cost, requests.
    const statColumn = screen.getByTestId("stat-column");
    const statLabels = within(statColumn)
      .getAllByText(/^(Tokens|Est\. API Cost|Requests) \(/)
      .map((node) => node.textContent ?? "");
    expect(statLabels[0]).toMatch(/^Tokens/);
    expect(statLabels[1]).toMatch(/^Est\. API Cost/);
    expect(statLabels[2]).toMatch(/^Requests/);

    expect(screen.getByRole("heading", { name: "5 Hour" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByTestId("account-section-alive")).toBeInTheDocument();
    // Request logs moved to their own page; the dashboard stays concise.
    expect(screen.queryByText("Request Logs")).not.toBeInTheDocument();
    // Error rate is demoted to diagnostics, which is collapsed by default.
    expect(screen.queryByText(/^Error rate \(/)).not.toBeInTheDocument();
  });

  it("keeps gauges legend-free and account cards slim", () => {
    mockQueries(createDashboardOverview());

    renderPage();

    // No per-account legend rows; the readout stays empty until hover.
    const readouts = screen.getAllByTestId("quota-donut-readout");
    expect(readouts.length).toBe(2);
    for (const readout of readouts) {
      expect(readout).toBeEmptyDOMElement();
    }

    // Condensed rows: no status badge, plan label, warm-up controls, or
    // credits line — one row per account with a Details action.
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Pro")).not.toBeInTheDocument();
    expect(screen.queryByText(/Warm-up/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Credits:/)).not.toBeInTheDocument();
    const rows = screen.getAllByTestId("account-row");
    expect(rows.length).toBe(2);
    expect(screen.getAllByRole("button", { name: /Details/i }).length).toBe(2);
  });

  it("shows a re-auth action on rows that need it", () => {
    const overview = createDashboardOverview({
      accounts: [
        createAccountSummary({ accountId: "ok" }),
        createAccountSummary({
          accountId: "stale",
          email: "stale@example.com",
          displayName: "stale@example.com",
          status: "reauth_required",
        }),
      ],
    });
    mockQueries(overview);

    renderPage();

    const section = screen.getByTestId("account-section-outOfRotation");
    expect(section).toHaveTextContent("reauth required");
    expect(within(section).getByRole("button", { name: /Re-auth/i })).toBeInTheDocument();
  });

  it("shows banked reset credits on compact account rows and opens the redeem dialog", async () => {
    const user = userEvent.setup();
    const expiresAt = offsetIso(12 * 24 * 60);
    const overview = createDashboardOverview({
      accounts: [
        createAccountSummary({
          accountId: "banked",
          email: "banked@example.com",
          displayName: "banked@example.com",
          availableResetCredits: 2,
          resetCreditNearestExpiresAt: expiresAt,
        }),
      ],
    });
    useRateLimitResetCreditsMock.mockReturnValue({
      data: {
        availableCount: 2,
        nearestExpiresAt: expiresAt,
        credits: [
          {
            id: "credit-soon",
            status: "available",
            resetType: "codex_rate_limits",
            expiresAt,
          },
        ],
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
    } as ReturnType<typeof useRateLimitResetCredits>);
    mockQueries(overview);

    renderPage();

    const resetButton = screen.getByRole("button", {
      name: /Redeem reset credit for banked@example.com/i,
    });
    expect(resetButton).toHaveTextContent("2");

    await user.click(resetButton);

    expect(await screen.findByText("Redeem rate-limit reset credit")).toBeInTheDocument();
    expect(screen.getByText("2 free rate limit resets")).toBeInTheDocument();
  });

  it("renders placeholders when summary metrics are null", () => {
    const overview = createDashboardOverview();
    overview.summary.metrics = null;
    mockQueries(overview);

    renderPage();

    const tokensLabel = screen.getByText(/^Tokens \(/);
    const tokensCard = tokensLabel.closest("div.rounded-xl") as HTMLElement;
    expect(within(tokensCard.parentElement as HTMLElement).getAllByText("0").length).toBeGreaterThan(0);
  });

  it("renders a single gauge when the secondary window is absent", () => {
    const overview = createDashboardOverview();
    overview.summary.secondaryWindow = null;
    overview.windows.secondary = null;
    mockQueries(overview);

    renderPage();

    expect(screen.getByRole("heading", { name: "5 Hour" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Weekly" })).not.toBeInTheDocument();
  });

  it("sections accounts by quota state and shows the next revival", () => {
    const overview = createDashboardOverview({
      accounts: [
        createAccountSummary({ accountId: "alive-1" }),
        createAccountSummary({
          accountId: "dead-5h",
          displayName: "fivehour@example.com",
          email: "fivehour@example.com",
          usage: { primaryRemainingPercent: 0, secondaryRemainingPercent: 40, monthlyRemainingPercent: null },
          resetAtPrimary: offsetIso(42),
        }),
        createAccountSummary({
          accountId: "dead-weekly",
          email: "weekly@example.com",
          displayName: "weekly@example.com",
          usage: { primaryRemainingPercent: 10, secondaryRemainingPercent: 0, monthlyRemainingPercent: null },
        }),
        createAccountSummary({ accountId: "paused-1", status: "paused" }),
      ],
    });
    mockQueries(overview);

    renderPage();

    expect(screen.getByTestId("account-section-alive")).toHaveTextContent("Alive · 1");
    expect(screen.getByTestId("account-section-fiveHourDead")).toHaveTextContent(
      "5 Hour Dead, Weekly Alive · 1",
    );
    expect(screen.getByTestId("account-section-weeklyDead")).toHaveTextContent("Weekly Dead · 1");
    expect(screen.getByTestId("account-section-outOfRotation")).toHaveTextContent(
      "Out of Rotation · 1",
    );
    expect(screen.getByTestId("account-section-fiveHourDead")).toHaveTextContent(/in 4[12]m/);
    expect(screen.getByTestId("next-revival")).toHaveTextContent("fivehour@example.com");
  });

  it("hides empty sections and the next-revival line when nothing is dead", () => {
    mockQueries(createDashboardOverview());

    renderPage();

    expect(screen.queryByTestId("account-section-weeklyDead")).not.toBeInTheDocument();
    expect(screen.queryByTestId("account-section-fiveHourDead")).not.toBeInTheDocument();
    expect(screen.queryByTestId("next-revival")).not.toBeInTheDocument();
  });
});
