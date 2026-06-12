import { AlertTriangle, Clock, ExternalLink, KeyRound, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MiniQuotaBar } from "@/components/mini-quota-bar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AccountCardProps } from "@/features/dashboard/components/account-card";
import type { AccountSummary } from "@/features/dashboard/schemas";
import { outOfRotationReason, type QuotaSectionKey } from "@/features/fork/dashboard/utils";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { cn } from "@/lib/utils";
import { formatPercentNullable, formatQuotaResetLabel } from "@/utils/formatters";

export type AccountRowProps = {
  account: AccountSummary;
  section: QuotaSectionKey;
  onAction?: AccountCardProps["onAction"];
};

function QuotaCell({
  label,
  percent,
  resetAt,
  testId,
}: {
  label: string;
  percent: number | null;
  resetAt: string | null | undefined;
  testId: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-28 shrink-0 items-center gap-1.5">
          <span className="w-5 shrink-0 text-[10px] uppercase text-muted-foreground">{label}</span>
          <MiniQuotaBar percent={percent} testId={testId} aria-label={`${label} remaining`} />
          <span className="w-9 shrink-0 text-right text-xs tabular-nums font-medium">
            {formatPercentNullable(percent)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        Resets {formatQuotaResetLabel(resetAt ?? null)}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Single-line account row for the condensed sections list. Reset times live
 * in the bar tooltips; dead rows surface their countdown inline because that
 * is the number that matters there.
 */
export function AccountRow({ account, section, onAction }: AccountRowProps) {
  const blurred = usePrivacyStore((s) => s.blurred);
  const title = account.displayName || account.email || account.accountId;
  const monthlyOnly =
    account.windowMinutesMonthly != null &&
    account.windowMinutesPrimary == null &&
    account.windowMinutesSecondary == null;
  const weeklyOnly = account.windowMinutesPrimary == null && account.windowMinutesSecondary != null;
  const outOfRotation = section === "outOfRotation";
  const countdownResetAt =
    section === "fiveHourDead"
      ? account.resetAtPrimary
      : section === "weeklyDead"
        ? account.resetAtSecondary
        : null;
  const needsResume = account.status === "paused";
  const needsReauth = account.status === "reauth_required" || account.status === "deactivated";

  return (
    <div
      data-testid="account-row"
      className={cn("flex h-9 items-center gap-3 px-1", outOfRotation && "opacity-60")}
    >
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {blurred ? <span className="privacy-blur">{title}</span> : title}
      </p>

      {countdownResetAt ? (
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          {formatQuotaResetLabel(countdownResetAt)}
        </span>
      ) : null}

      {outOfRotation ? (
        <span className="flex min-w-0 shrink items-center gap-1 truncate text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {outOfRotationReason(account)}
        </span>
      ) : (
        <>
          {monthlyOnly ? (
            <QuotaCell
              label="Mo"
              percent={account.usage?.monthlyRemainingPercent ?? null}
              resetAt={account.resetAtMonthly}
              testId={`row-monthly-${account.accountId}`}
            />
          ) : (
            <>
              {!weeklyOnly && (
                <QuotaCell
                  label="5h"
                  percent={account.usage?.primaryRemainingPercent ?? null}
                  resetAt={account.resetAtPrimary}
                  testId={`row-primary-${account.accountId}`}
                />
              )}
              <QuotaCell
                label="Wk"
                percent={account.usage?.secondaryRemainingPercent ?? null}
                resetAt={account.resetAtSecondary}
                testId={`row-secondary-${account.accountId}`}
              />
            </>
          )}
        </>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {needsReauth && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 rounded-lg px-2 text-xs text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            onClick={() => onAction?.(account, "reauth")}
          >
            <KeyRound className="h-3 w-3" aria-hidden="true" />
            Re-auth
          </Button>
        )}
        {needsResume && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 rounded-lg px-2 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            onClick={() => onAction?.(account, "resume")}
          >
            <Play className="h-3 w-3" aria-hidden="true" />
            Resume
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Details for ${title}`}
          className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onAction?.(account, "details")}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
