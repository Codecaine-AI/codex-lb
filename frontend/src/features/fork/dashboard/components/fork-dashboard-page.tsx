import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { AlertMessage } from "@/components/alert-message";
import { useAccountMutations } from "@/features/accounts/hooks/use-accounts";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { OverviewTimeframeSelect } from "@/features/dashboard/components/filters/overview-timeframe-select";
import { useDashboard, useDashboardProjections } from "@/features/dashboard/hooks/use-dashboard";
import { buildDashboardView } from "@/features/dashboard/utils";
import {
  OverviewTimeframeKeySchema,
  type AccountSummary,
  type OverviewTimeframe,
} from "@/features/dashboard/schemas";
import { AccountSections } from "@/features/fork/dashboard/components/account-sections";
import { DiagnosticsDisclosure } from "@/features/fork/dashboard/components/diagnostics-disclosure";
import { QuotaGauges } from "@/features/fork/dashboard/components/quota-gauges";
import { StatColumn } from "@/features/fork/dashboard/components/stat-column";
import { findNextRevival, sectionAccounts } from "@/features/fork/dashboard/utils";
import { useThemeStore } from "@/hooks/use-theme";

// Fork default: this dashboard is a live side-monitor view, so "today"
// matters more than the upstream 7d default.
const FORK_DEFAULT_TIMEFRAME: OverviewTimeframe = "1d";

function parseForkOverviewTimeframe(value: string | null): OverviewTimeframe {
  const parsed = OverviewTimeframeKeySchema.safeParse(value);
  return parsed.success ? parsed.data : FORK_DEFAULT_TIMEFRAME;
}

export function ForkDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const overviewTimeframe = useMemo(
    () => parseForkOverviewTimeframe(searchParams.get("overviewTimeframe")),
    [searchParams],
  );
  const dashboardQuery = useDashboard(overviewTimeframe);
  const projectionsQuery = useDashboardProjections(Boolean(dashboardQuery.data));
  const { resumeMutation, limitWarmupMutation } = useAccountMutations();

  const isRefreshing = dashboardQuery.isFetching || projectionsQuery.isFetching;

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);

  const handleOverviewTimeframeChange = useCallback(
    (timeframe: OverviewTimeframe) => {
      const next = new URLSearchParams(searchParams);
      if (timeframe === FORK_DEFAULT_TIMEFRAME) {
        next.delete("overviewTimeframe");
      } else {
        next.set("overviewTimeframe", timeframe);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const handleAccountAction = useCallback(
    (account: AccountSummary, action: string) => {
      switch (action) {
        case "details":
          navigate(`/accounts?selected=${account.accountId}`);
          break;
        case "resume":
          void resumeMutation.mutateAsync(account.accountId);
          break;
        case "reauth":
          navigate(`/accounts?selected=${account.accountId}`);
          break;
        case "warmup-toggle":
          void limitWarmupMutation.mutateAsync({
            accountId: account.accountId,
            enabled: !account.limitWarmupEnabled,
          });
          break;
      }
    },
    [limitWarmupMutation, navigate, resumeMutation],
  );

  const overview = dashboardQuery.data;

  const view = useMemo(() => {
    if (!overview) {
      return null;
    }
    // Request logs live on their own page now, so the view gets none.
    return buildDashboardView(
      overview,
      [],
      {
        isDark,
        // The burn projection lives in the diagnostics disclosure, not the
        // primary stats row.
        showAccountBurnrate: false,
      },
      projectionsQuery.data,
    );
  }, [overview, isDark, projectionsQuery.data]);

  // With showAccountBurnrate disabled the view stats are
  // [requests, tokens, cost, errorRate]; the mockup orders the primary row
  // tokens / cost / requests and demotes error rate to diagnostics.
  const topStats = view ? [view.stats[1], view.stats[2], view.stats[0]].filter(Boolean) : [];
  const errorStat = view?.stats[3] ?? null;

  const nextRevival = useMemo(() => {
    if (!overview) {
      return null;
    }
    return findNextRevival(sectionAccounts(overview.accounts).fiveHourDead);
  }, [overview]);

  const errorMessage =
    (dashboardQuery.error instanceof Error && dashboardQuery.error.message) || null;

  return (
    <div data-testid="fork-dashboard-page" className="animate-fade-in-up space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <OverviewTimeframeSelect
            value={overviewTimeframe}
            onChange={handleOverviewTimeframeChange}
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4${isRefreshing ? " animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}

      {!view || !overview ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Fixed two-column layout at every viewport width — this dashboard
              lives on a narrow side monitor and must not reflow. */}
          <div className="grid gap-4 grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <StatColumn stats={topStats} />

            <div className="space-y-6">
              <QuotaGauges
                primaryWindow={{
                  windowMinutes: overview.summary.primaryWindow.windowMinutes,
                  capacityCredits: overview.summary.primaryWindow.capacityCredits,
                }}
                secondaryWindow={
                  overview.summary.secondaryWindow
                    ? {
                        windowMinutes: overview.summary.secondaryWindow.windowMinutes,
                        capacityCredits: overview.summary.secondaryWindow.capacityCredits,
                      }
                    : null
                }
                primaryItems={view.primaryUsageItems}
                secondaryItems={view.secondaryUsageItems}
                primaryTotal={view.primaryTotal}
                secondaryTotal={view.secondaryTotal}
                nextRevival={nextRevival}
              />

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Accounts</h2>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <AccountSections
                  accounts={overview.accounts}
                  primaryWindowMinutes={overview.summary.primaryWindow.windowMinutes}
                  secondaryWindowMinutes={overview.summary.secondaryWindow?.windowMinutes ?? null}
                  onAction={handleAccountAction}
                />
              </section>
            </div>
          </div>

          <DiagnosticsDisclosure
            errorStat={errorStat}
            depletionPrimary={projectionsQuery.data?.depletionPrimary ?? overview.depletionPrimary ?? null}
            depletionSecondary={projectionsQuery.data?.depletionSecondary ?? overview.depletionSecondary ?? null}
            weeklyCreditPace={view.weeklyCreditPace}
          />
        </>
      )}
    </div>
  );
}
