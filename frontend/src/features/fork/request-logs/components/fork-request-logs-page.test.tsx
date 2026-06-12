import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";

import { renderWithProviders } from "@/test/utils";
import {
  createDefaultAccounts,
  createRequestLogFilterOptions,
} from "@/test/mocks/factories";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { useRequestLogs } from "@/features/dashboard/hooks/use-request-logs";

import { ForkRequestLogsPage } from "./fork-request-logs-page";

vi.mock("@/features/accounts/hooks/use-accounts", () => ({
  useAccounts: vi.fn(),
}));

vi.mock("@/features/dashboard/hooks/use-request-logs", () => ({
  useRequestLogs: vi.fn(),
}));

vi.mock("@/features/dashboard/components/recent-requests-table", () => ({
  RecentRequestsTable: () => <div data-testid="recent-requests-table" />,
}));

const useAccountsMock = vi.mocked(useAccounts);
const useRequestLogsMock = vi.mocked(useRequestLogs);

function mockQueries() {
  useAccountsMock.mockReturnValue({
    accountsQuery: { data: createDefaultAccounts() },
  } as unknown as ReturnType<typeof useAccounts>);
  useRequestLogsMock.mockReturnValue({
    filters: {
      search: "",
      timeframe: "all",
      accountIds: [],
      apiKeyIds: [],
      modelOptions: [],
      statuses: [],
      limit: 25,
      offset: 0,
    },
    logsQuery: {
      data: { requests: [], total: 0, hasMore: false },
      isFetching: false,
      error: null,
    },
    optionsQuery: {
      data: createRequestLogFilterOptions(),
      error: null,
    },
    updateFilters: vi.fn(),
  } as unknown as ReturnType<typeof useRequestLogs>);
}

describe("ForkRequestLogsPage", () => {
  beforeEach(() => {
    useAccountsMock.mockReset();
    useRequestLogsMock.mockReset();
  });

  it("renders the filters sidebar next to the requests table", () => {
    mockQueries();

    renderWithProviders(<ForkRequestLogsPage />);

    expect(screen.getByRole("heading", { name: "Requests" })).toBeInTheDocument();
    const sidebar = screen.getByTestId("request-log-filters-sidebar");
    expect(within(sidebar).getByPlaceholderText("Search requests...")).toBeInTheDocument();
    for (const label of ["Accounts", "API Keys", "Models", "Statuses"]) {
      expect(within(sidebar).getByText(label)).toBeInTheDocument();
    }
    expect(within(sidebar).getByRole("button", { name: /Reset filters/i })).toBeInTheDocument();
    expect(screen.getByTestId("recent-requests-table")).toBeInTheDocument();
  });
});
