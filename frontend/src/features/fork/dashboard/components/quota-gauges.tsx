import { Sunrise } from "lucide-react";

import type { RemainingItem } from "@/features/dashboard/utils";
import { QuotaDonut } from "@/features/fork/dashboard/components/quota-donut";
import type { NextRevival } from "@/features/fork/dashboard/utils";
import { windowDisplayLabel } from "@/features/fork/dashboard/utils";
import { formatQuotaResetLabel } from "@/utils/formatters";

export type QuotaGaugeWindow = {
  windowMinutes: number | null;
  capacityCredits: number;
};

export type QuotaGaugesProps = {
  primaryWindow: QuotaGaugeWindow;
  secondaryWindow: QuotaGaugeWindow | null;
  primaryItems: RemainingItem[];
  secondaryItems: RemainingItem[];
  primaryTotal: number;
  secondaryTotal: number;
  nextRevival: NextRevival | null;
};

export function QuotaGauges({
  primaryWindow,
  secondaryWindow,
  primaryItems,
  secondaryItems,
  primaryTotal,
  secondaryTotal,
  nextRevival,
}: QuotaGaugesProps) {
  const primaryLabel = windowDisplayLabel(primaryWindow.windowMinutes, "Primary");
  const secondaryLabel = secondaryWindow
    ? windowDisplayLabel(secondaryWindow.windowMinutes, "Weekly")
    : null;

  return (
    <div className={secondaryWindow ? "grid gap-4 grid-cols-2" : "grid gap-4"}>
      <QuotaDonut
        title={primaryLabel}
        items={primaryItems}
        total={primaryWindow.capacityCredits}
        centerValue={primaryTotal}
        footer={
          nextRevival ? (
            <p
              data-testid="next-revival"
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Sunrise className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Next revival: {nextRevival.label} {formatQuotaResetLabel(nextRevival.resetAt)}
              </span>
            </p>
          ) : null
        }
      />
      {secondaryWindow ? (
        <QuotaDonut
          title={secondaryLabel ?? "Weekly"}
          items={secondaryItems}
          total={secondaryWindow.capacityCredits}
          centerValue={secondaryTotal}
        />
      ) : null}
    </div>
  );
}
