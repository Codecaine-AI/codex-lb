import { useMemo } from "react";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import type { AccountCardProps } from "@/features/dashboard/components/account-card";
import type { AccountSummary } from "@/features/dashboard/schemas";
import { AccountRow } from "@/features/fork/dashboard/components/account-row";
import {
  sectionAccounts,
  windowDisplayLabel,
  type QuotaSectionKey,
} from "@/features/fork/dashboard/utils";

export type AccountSectionsProps = {
  accounts: AccountSummary[];
  primaryWindowMinutes: number | null;
  secondaryWindowMinutes: number | null;
  onAction?: AccountCardProps["onAction"];
};

type SectionDescriptor = {
  key: QuotaSectionKey;
  title: string;
};

export function AccountSections({
  accounts,
  primaryWindowMinutes,
  secondaryWindowMinutes,
  onAction,
}: AccountSectionsProps) {
  const sections = useMemo(() => sectionAccounts(accounts), [accounts]);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No accounts connected yet"
        description="Import or authenticate an account to get started."
      />
    );
  }

  const primaryLabel = windowDisplayLabel(primaryWindowMinutes, "5 Hour");
  const secondaryLabel = windowDisplayLabel(secondaryWindowMinutes, "Weekly");
  const descriptors: SectionDescriptor[] = [
    { key: "alive", title: "Alive" },
    { key: "fiveHourDead", title: `${primaryLabel} Dead, ${secondaryLabel} Alive` },
    { key: "weeklyDead", title: `${secondaryLabel} Dead` },
    { key: "outOfRotation", title: "Out of Rotation" },
  ];

  return (
    <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
      {descriptors.map((descriptor) =>
        sections[descriptor.key].length > 0 ? (
          <section key={descriptor.key} data-testid={`account-section-${descriptor.key}`}>
            <div className="flex items-center gap-3">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {descriptor.title} · {sections[descriptor.key].length}
              </h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-1 divide-y divide-border/60">
              {sections[descriptor.key].map((account) => (
                <AccountRow
                  key={account.accountId}
                  account={account}
                  section={descriptor.key}
                  onAction={onAction}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
