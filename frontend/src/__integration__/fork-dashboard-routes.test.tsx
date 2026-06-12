import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { renderWithProviders } from "@/test/utils";

if (!HTMLElement.prototype.scrollIntoView) {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: () => {},
  });
}

describe("fork dashboard routes", () => {
  it("renders the fork dashboard at /dashboard", async () => {
    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(await screen.findByTestId("fork-dashboard-page")).toBeInTheDocument();
  });

  it("renders the fork request logs page at /requests", async () => {
    window.history.pushState({}, "", "/requests");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Requests" })).toBeInTheDocument();
    expect(await screen.findByTestId("request-log-filters-sidebar")).toBeInTheDocument();
  });

  it("renders the share lab with all cadence sections at /share-lab", async () => {
    window.history.pushState({}, "", "/share-lab");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Share lab" })).toBeInTheDocument();
    expect(await screen.findByTestId("share-lab-section-daily")).toBeInTheDocument();
    expect(await screen.findByTestId("share-lab-section-weekly")).toBeInTheDocument();
    expect(await screen.findByTestId("share-lab-section-monthly")).toBeInTheDocument();
    expect(await screen.findAllByTestId("share-card-hero")).toHaveLength(3);
    expect(await screen.findAllByTestId("share-card-receipt")).toHaveLength(3);
  });

  it("links to the share lab from the top bar", async () => {
    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    const shareLinks = await screen.findAllByRole("link", { name: "Share" });
    expect(shareLinks.length).toBeGreaterThan(0);
    for (const link of shareLinks) {
      expect(link).toHaveAttribute("href", "/share-lab");
    }
  });

  it("keeps the upstream dashboard reachable at /upstream-dashboard", async () => {
    window.history.pushState({}, "", "/upstream-dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      await screen.findByText("Overview, account health, and recent request logs."),
    ).toBeInTheDocument();
  });
});
