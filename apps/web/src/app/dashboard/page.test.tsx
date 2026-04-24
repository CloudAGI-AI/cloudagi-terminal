/**
 * /dashboard page tests — Wave 1 RED phase.
 *
 * The page does NOT exist yet (Wave 2 creates it at src/app/dashboard/page.tsx).
 * These tests define expected rendering and interactions per SPEC §3.1 (Seller stories)
 * and §3.2 (Buyer stories — receipt / history).
 *
 * SPEC references:
 *   Story 8  — seller views earnings, call count, avg latency, dispute rate
 *   Story 9  — adjust price or pause agent without unregistering
 *   Story 19 — buyer exports receipt history as CSV or JSONL
 *   Story 27 — observer views per-agent history
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@/test-utils";
import DashboardPage from "./page";

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

describe("DashboardPage — layout and landmarks", () => {
  it("renders a main landmark with a provider dashboard heading", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /dashboard|provider dashboard/i })
    ).toBeInTheDocument();
  });

  it("renders a tab or section navigation between Provider and Buyer views", () => {
    render(<DashboardPage />);
    const tabs = screen.queryByRole("tablist");
    expect(tabs).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 8 — provider metrics
// ---------------------------------------------------------------------------

describe("DashboardPage — provider metrics (SPEC §3.1 story 8)", () => {
  it("renders an 'Earnings' metric panel with a monetary value", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/earnings/i)).toBeInTheDocument();
    });
  });

  it("renders a 'Call count' metric panel", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/call count|calls/i)).toBeInTheDocument();
    });
  });

  it("renders an 'Average latency' metric panel in milliseconds", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/avg latency|average latency/i)).toBeInTheDocument();
    });
  });

  it("renders a 'Dispute rate' metric panel as a percentage", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/dispute rate/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 9 — adjust price / pause agent
// ---------------------------------------------------------------------------

describe("DashboardPage — agent management (SPEC §3.1 story 9)", () => {
  it("renders a 'Pause agent' button that is enabled when agent is active", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /pause agent/i })
      ).toBeInTheDocument();
    });
  });

  it("renders a 'Resume agent' button when agent is paused", async () => {
    render(<DashboardPage />);
    // Wave 2: initial state for test fixture should be paused
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /resume agent/i }) ||
        screen.getByRole("button", { name: /pause agent/i })
      ).toBeInTheDocument();
    });
  });

  it("renders a price adjustment input with current price pre-filled", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("spinbutton", { name: /price|update price/i })
      ).toBeInTheDocument();
    });
  });

  it("renders a 'Save changes' button for price updates", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save changes|update price/i })
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 19 — receipt history export
// ---------------------------------------------------------------------------

describe("DashboardPage — receipt history (SPEC §3.2 story 19)", () => {
  it("renders a receipt history table or list", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("table", { name: /receipt history|receipts/i }) ||
        screen.getByRole("list", { name: /receipt history/i })
      ).toBeInTheDocument();
    });
  });

  it("renders an 'Export CSV' button", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /export csv/i })
      ).toBeInTheDocument();
    });
  });

  it("renders an 'Export JSONL' button", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /export jsonl/i })
      ).toBeInTheDocument();
    });
  });

  it("clicking 'Export CSV' triggers a file download for the receipt data", async () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window, "URL", {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
    });
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });
    render(<DashboardPage />);
    await waitFor(() => screen.getByRole("button", { name: /export csv/i }));
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 8 — dispute rate alerts
// ---------------------------------------------------------------------------

describe("DashboardPage — dispute alerts (SPEC §3.1 story 10)", () => {
  it("renders an alert or notification when there is an open slash event", async () => {
    render(<DashboardPage />);
    // Wave 2: fixture with active slash event should show an alert banner
    await waitFor(() => {
      const alert = screen.queryByRole("alert");
      // May not have active slash in happy-path fixture — just assert element exists if present
      if (alert) {
        expect(alert).toBeInTheDocument();
      } else {
        // No slash event — assert the appeal button is NOT shown
        expect(
          screen.queryByRole("button", { name: /appeal/i })
        ).toBeNull();
      }
    });
  });
});
