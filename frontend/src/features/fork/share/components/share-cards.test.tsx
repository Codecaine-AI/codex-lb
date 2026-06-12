import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createDashboardOverview, createReportsResponse } from "@/test/mocks/factories";
import { buildReceiptData, buildShareCardData } from "@/features/fork/share/share-data";

import { ShareCardHero } from "./share-card-hero";
import { ShareCardReceipt } from "./share-card-receipt";

const NOW = new Date(2026, 5, 11, 12, 0, 0);

function heroData() {
  return buildShareCardData(createDashboardOverview(), NOW);
}

function receiptData() {
  return buildReceiptData(createReportsResponse(), {
    cadenceLabel: "Weekly",
    dateRangeLabel: "Jun 5 – Jun 11, 2026",
    windowDays: 7,
    accountCount: 3,
  });
}

describe("ShareCardHero", () => {
  it("renders the core aggregates with cadence and date range", () => {
    render(<ShareCardHero data={heroData()} />);

    expect(screen.getByText("45K")).toBeInTheDocument();
    expect(screen.getByText("$1.82")).toBeInTheDocument();
    expect(screen.getByText("228")).toBeInTheDocument();
    expect(screen.getByText("18% cached")).toBeInTheDocument();
    expect(screen.getByText("97.2% success")).toBeInTheDocument();
    expect(screen.getByText("Weekly snapshot")).toBeInTheDocument();
    expect(screen.getByText("Jun 4 – Jun 11, 2026")).toBeInTheDocument();
  });

  it("renders placeholders when metrics are null", () => {
    const base = createDashboardOverview();
    const data = buildShareCardData({ ...base, summary: { ...base.summary, metrics: null } }, NOW);
    render(<ShareCardHero data={data} />);

    expect(screen.getAllByText("--").length).toBeGreaterThan(0);
  });

  it("contains no account identifiers and no product wordmark", () => {
    const { container } = render(<ShareCardHero data={heroData()} />);

    expect(container.textContent).not.toContain("@");
    expect(container.textContent).not.toMatch(/codex-lb/i);
  });

  it("renders the configured brand text", () => {
    render(<ShareCardHero data={heroData()} brandText="Lascari AI" />);

    expect(screen.getByText("Lascari AI")).toBeInTheDocument();
  });
});

describe("ShareCardReceipt", () => {
  it("renders tokens by model, requests, and the cost punchline", () => {
    render(<ShareCardReceipt data={receiptData()} />);

    expect(screen.getByText("USAGE RECEIPT")).toBeInTheDocument();
    expect(screen.getByText("Weekly · Jun 5 – Jun 11, 2026")).toBeInTheDocument();
    expect(screen.getByText("TOKENS")).toBeInTheDocument();
    expect(screen.getByText("45K")).toBeInTheDocument();
    expect(screen.getByText("· gpt-5.3-codex")).toBeInTheDocument();
    expect(screen.getByText("30K")).toBeInTheDocument();
    expect(screen.getByText("· gpt-5.3")).toBeInTheDocument();
    expect(screen.getByText("11K")).toBeInTheDocument();
    expect(screen.getByText("REQUESTS")).toBeInTheDocument();
    expect(screen.getByText("228")).toBeInTheDocument();
    expect(screen.getByText("EST. API COST")).toBeInTheDocument();
    expect(screen.getByText("$1.82")).toBeInTheDocument();
    expect(screen.getByText("YOU PAID (3× plan)")).toBeInTheDocument();
    expect(screen.getByText("SAVINGS")).toBeInTheDocument();
  });

  it("does not render a success-rate line", () => {
    render(<ShareCardReceipt data={receiptData()} />);

    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
  });

  it("contains no account identifiers and no product wordmark", () => {
    const { container } = render(<ShareCardReceipt data={receiptData()} />);

    expect(container.textContent).not.toContain("@");
    expect(container.textContent).not.toMatch(/codex-lb/i);
  });

  it("renders brand text and a QR code when configured", () => {
    render(
      <ShareCardReceipt data={receiptData()} brandText="Codecaine" qrUrl="https://lascari.ai" />,
    );

    expect(screen.getByText("Codecaine")).toBeInTheDocument();
    expect(screen.getByTestId("share-qr")).toBeInTheDocument();
    expect(screen.getByText("lascari.ai")).toBeInTheDocument();
  });

  it("falls back to the barcode without a QR url", () => {
    render(<ShareCardReceipt data={receiptData()} />);

    expect(screen.queryByTestId("share-qr")).not.toBeInTheDocument();
  });
});
