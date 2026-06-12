import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/utils";

import { ForkShareLabPage } from "./share-lab-page";

const domToPngMock = vi.hoisted(() => vi.fn(async () => "data:image/png;base64,stub"));

vi.mock("modern-screenshot", () => ({
  domToPng: domToPngMock,
}));

describe("ForkShareLabPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    domToPngMock.mockClear();
  });

  it("applies the brand presets to the rendered cards", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForkShareLabPage />);

    await waitFor(() => expect(screen.getAllByTestId("share-card-hero")).toHaveLength(3));
    const heroes = screen.getAllByTestId("share-card-hero");
    expect(within(heroes[0]).queryByText("Codecaine")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Codecaine" }));

    expect(within(heroes[0]).getByText("Codecaine")).toBeInTheDocument();
    const receipts = screen.getAllByTestId("share-card-receipt");
    expect(within(receipts[0]).getByText("Codecaine")).toBeInTheDocument();
  });

  it("renders a QR code from the configured link and falls back to barcode when cleared", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForkShareLabPage />);

    await screen.findAllByTestId("share-card-receipt");
    expect(screen.getAllByTestId("share-qr").length).toBeGreaterThan(0);
    expect(screen.getAllByText("lascari.ai").length).toBeGreaterThan(0);

    await user.clear(screen.getByLabelText("QR link"));

    expect(screen.queryByTestId("share-qr")).not.toBeInTheDocument();
  });

  it("downloads a card as PNG at 2x capture scale", async () => {
    const user = userEvent.setup();
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    renderWithProviders(<ForkShareLabPage />);

    await screen.findAllByTestId("share-card-hero");
    await user.click(screen.getAllByRole("button", { name: /PNG/ })[0]);

    await waitFor(() => expect(domToPngMock).toHaveBeenCalledTimes(1));
    expect(domToPngMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        width: 1200,
        height: 675,
        scale: 2,
        style: { transform: "none" },
      }),
    );
    expect(anchorClick).toHaveBeenCalledTimes(1);
    anchorClick.mockRestore();
  });

  it("expands a card into a modal on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForkShareLabPage />);

    await screen.findAllByTestId("share-card-hero");
    await user.click(screen.getAllByRole("button", { name: /Expand Hero/ })[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByTestId("share-card-hero")).toBeInTheDocument();
  });
});
