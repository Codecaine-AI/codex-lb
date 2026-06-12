import { useMemo } from "react";

import { AlertMessage } from "@/components/alert-message";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { RecentRequestsTable } from "@/features/dashboard/components/recent-requests-table";
import { useRequestLogs } from "@/features/dashboard/hooks/use-request-logs";
import { RequestLogFiltersSidebar } from "@/features/fork/request-logs/components/request-log-filters-sidebar";
import { REQUEST_STATUS_LABELS } from "@/utils/constants";
import { formatModelLabel, formatSlug } from "@/utils/formatters";

const MODEL_OPTION_DELIMITER = ":::";

export function ForkRequestLogsPage() {
  const { filters, logsQuery, optionsQuery, updateFilters } = useRequestLogs();
  const { accountsQuery } = useAccounts();
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const logPage = logsQuery.data;

  const accountOptions = useMemo(() => {
    const entries = new Map<string, { label: string; isEmail: boolean }>();
    for (const account of accounts) {
      const raw = account.displayName || account.email || account.accountId;
      const isEmail = !!account.email && raw === account.email;
      entries.set(account.accountId, { label: raw, isEmail });
    }
    return (optionsQuery.data?.accountIds ?? []).map((accountId) => {
      const entry = entries.get(accountId);
      return {
        value: accountId,
        label: entry?.label ?? accountId,
        isEmail: entry?.isEmail ?? false,
      };
    });
  }, [optionsQuery.data?.accountIds, accounts]);

  const apiKeyOptions = useMemo(
    () =>
      (optionsQuery.data?.apiKeys ?? []).map((option) => ({
        value: option.id,
        label: option.keyPrefix ? `${option.name} · ${option.keyPrefix}` : option.name,
      })),
    [optionsQuery.data?.apiKeys],
  );

  const modelOptions = useMemo(
    () =>
      (optionsQuery.data?.modelOptions ?? []).map((option) => ({
        value: `${option.model}${MODEL_OPTION_DELIMITER}${option.reasoningEffort ?? ""}`,
        label: formatModelLabel(option.model, option.reasoningEffort),
      })),
    [optionsQuery.data?.modelOptions],
  );

  const statusOptions = useMemo(
    () =>
      (optionsQuery.data?.statuses ?? []).map((status) => ({
        value: status,
        label: REQUEST_STATUS_LABELS[status] ?? formatSlug(status),
      })),
    [optionsQuery.data?.statuses],
  );

  const errorMessage =
    (logsQuery.error instanceof Error && logsQuery.error.message) ||
    (optionsQuery.error instanceof Error && optionsQuery.error.message) ||
    null;

  return (
    <div data-testid="fork-request-logs-page" className="animate-fade-in-up space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>

      {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}

      <div className="grid items-start gap-4 grid-cols-[14rem_minmax(0,1fr)]">
        <RequestLogFiltersSidebar
          filters={filters}
          accountOptions={accountOptions}
          apiKeyOptions={apiKeyOptions}
          modelOptions={modelOptions}
          statusOptions={statusOptions}
          onSearchChange={(search) => updateFilters({ search, offset: 0 })}
          onTimeframeChange={(timeframe) => updateFilters({ timeframe, offset: 0 })}
          onAccountChange={(accountIds) => updateFilters({ accountIds, offset: 0 })}
          onApiKeyChange={(apiKeyIds) => updateFilters({ apiKeyIds, offset: 0 })}
          onModelChange={(modelOptionsSelected) =>
            updateFilters({ modelOptions: modelOptionsSelected, offset: 0 })
          }
          onStatusChange={(statuses) => updateFilters({ statuses, offset: 0 })}
          onReset={() =>
            updateFilters({
              search: "",
              timeframe: "all",
              accountIds: [],
              apiKeyIds: [],
              modelOptions: [],
              statuses: [],
              offset: 0,
            })
          }
        />
        <RecentRequestsTable
          requests={logPage?.requests ?? []}
          accounts={accounts}
          total={logPage?.total ?? 0}
          limit={filters.limit}
          offset={filters.offset}
          hasMore={logPage?.hasMore ?? false}
          onLimitChange={(limit) => updateFilters({ limit, offset: 0 })}
          onOffsetChange={(offset) => updateFilters({ offset })}
        />
      </div>
    </div>
  );
}
