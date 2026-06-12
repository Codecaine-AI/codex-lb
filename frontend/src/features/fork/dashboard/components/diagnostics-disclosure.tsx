import { ChevronRight } from "lucide-react";

import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { WeeklyCreditsPaceCard } from "@/features/dashboard/components/weekly-credits-pace-card";
import type { DashboardStat, WeeklyCreditPace } from "@/features/dashboard/utils";
import type { Depletion } from "@/features/dashboard/schemas";
import { useDashboardPreferencesStore } from "@/hooks/use-dashboard-preferences";
import { cn } from "@/lib/utils";
import { formatRate } from "@/utils/formatters";

export type DiagnosticsDisclosureProps = {
  errorStat: DashboardStat | null;
  depletionPrimary: Depletion | null;
  depletionSecondary: Depletion | null;
  weeklyCreditPace: WeeklyCreditPace | null;
};

function DepletionSummary({ label, depletion }: { label: string; depletion: Depletion }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label} depletion
      </p>
      <p className="mt-1">
        Risk: <span className="font-medium">{depletion.riskLevel}</span> · Burn rate{" "}
        {formatRate(depletion.burnRate / 100)} of capacity/hr
      </p>
      {depletion.projectedExhaustionAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Projected exhaustion: {new Date(depletion.projectedExhaustionAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

export function DiagnosticsDisclosure({
  errorStat,
  depletionPrimary,
  depletionSecondary,
  weeklyCreditPace,
}: DiagnosticsDisclosureProps) {
  const open = useDashboardPreferencesStore((s) => s.forkDiagnosticsOpen);
  const setOpen = useDashboardPreferencesStore((s) => s.setForkDiagnosticsOpen);

  return (
    <section className="space-y-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 text-left"
      >
        <ChevronRight
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")}
          aria-hidden="true"
        />
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Projections &amp; Diagnostics
        </h2>
        <div className="h-px flex-1 bg-border" />
      </button>
      {open ? (
        <div data-testid="diagnostics-content" className="space-y-4">
          {errorStat ? <StatsGrid stats={[errorStat]} /> : null}
          <div className="grid gap-4 xl:grid-cols-2">
            {depletionPrimary ? (
              <DepletionSummary label="Primary window" depletion={depletionPrimary} />
            ) : null}
            {depletionSecondary ? (
              <DepletionSummary label="Secondary window" depletion={depletionSecondary} />
            ) : null}
          </div>
          {weeklyCreditPace ? <WeeklyCreditsPaceCard pace={weeklyCreditPace} /> : null}
        </div>
      ) : null}
    </section>
  );
}
