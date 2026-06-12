import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { AlertTriangle } from "lucide-react";

import { renderWithProviders } from "@/test/utils";
import type { DashboardStat } from "@/features/dashboard/utils";
import { useDashboardPreferencesStore } from "@/hooks/use-dashboard-preferences";

import { DiagnosticsDisclosure } from "./diagnostics-disclosure";

const errorStat: DashboardStat = {
  label: "Error rate (7d)",
  value: "2.8%",
  icon: AlertTriangle,
  trend: [],
  trendColor: "#f59e0b",
};

function renderDisclosure() {
  return renderWithProviders(
    <DiagnosticsDisclosure
      errorStat={errorStat}
      depletionPrimary={{
        risk: 0.4,
        riskLevel: "warning",
        burnRate: 12,
        safeUsagePercent: 55,
        projectedExhaustionAt: null,
        secondsUntilExhaustion: null,
      }}
      depletionSecondary={null}
      weeklyCreditPace={null}
    />,
  );
}

describe("DiagnosticsDisclosure", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useDashboardPreferencesStore.setState({ forkDiagnosticsOpen: false });
  });

  it("is collapsed by default and reveals content when expanded", () => {
    renderDisclosure();

    expect(screen.queryByTestId("diagnostics-content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Projections & Diagnostics/i }));

    expect(screen.getByTestId("diagnostics-content")).toBeInTheDocument();
    expect(screen.getByText("Error rate (7d)")).toBeInTheDocument();
    expect(screen.getByText(/Primary window depletion/i)).toBeInTheDocument();
  });

  it("persists the open state to the preferences store and localStorage", () => {
    renderDisclosure();

    fireEvent.click(screen.getByRole("button", { name: /Projections & Diagnostics/i }));

    expect(useDashboardPreferencesStore.getState().forkDiagnosticsOpen).toBe(true);
    expect(window.localStorage.getItem("codex-lb-fork-diagnostics-open")).toBe("true");
  });

  it("renders expanded when the stored preference is open", () => {
    useDashboardPreferencesStore.setState({ forkDiagnosticsOpen: true });

    renderDisclosure();

    expect(screen.getByTestId("diagnostics-content")).toBeInTheDocument();
  });
});
