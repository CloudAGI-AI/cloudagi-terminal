import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
/**
 * /marketplace page tests — Wave 1 RED phase.
 *
 * The page does NOT exist yet (Wave 2 creates it at src/app/marketplace/page.tsx).
 * These tests define expected rendering and interactions per SPEC §3.2 (Buyer stories)
 * and §4.2 (discovery flow).
 *
 * SPEC references:
 *   Story 11 — browse registry filtered by skill, price, reputation, uptime
 *   Story 12 — open a web terminal scoped to a single agent
 *   Story 13 — pre-authorize a session budget
 */
import { describe, expect, it } from "vitest";
import MarketplacePage from "./page";

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

describe("MarketplacePage — layout and landmarks", () => {
  it("renders a main landmark with an accessible heading for the marketplace", () => {
    render(<MarketplacePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /marketplace|browse agents|discover/i }),
    ).toBeInTheDocument();
  });

  it("renders a search / filter region accessible by landmark or heading", () => {
    render(<MarketplacePage />);
    // Wave 2: filter panel should have role=search or aria-label containing "filter"
    expect(
      screen.getByRole("search") || screen.getByRole("region", { name: /filter/i }),
    ).toBeInTheDocument();
  });

  it("renders a list of agent cards when agents are present", async () => {
    render(<MarketplacePage />);
    await waitFor(() => {
      expect(screen.getAllByRole("article").length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 11 — filtering
// ---------------------------------------------------------------------------

describe("MarketplacePage — filtering (SPEC §3.2 story 11)", () => {
  it("renders a skill filter input or select control", () => {
    render(<MarketplacePage />);
    const skillFilter =
      screen.queryByRole("combobox", { name: /skill/i }) ||
      screen.queryByRole("textbox", { name: /skill/i });
    expect(skillFilter).not.toBeNull();
  });

  it("renders a max price per million tokens numeric input", () => {
    render(<MarketplacePage />);
    const priceInput = screen.getByRole("spinbutton", { name: /max price/i });
    expect(priceInput).toBeInTheDocument();
  });

  it("renders a minimum reputation tier selector", () => {
    render(<MarketplacePage />);
    expect(screen.getByRole("combobox", { name: /reputation/i })).toBeInTheDocument();
  });

  it("filters agents by skill tag when a skill is entered", async () => {
    render(<MarketplacePage />);
    const skillFilter =
      screen.queryByRole("combobox", { name: /skill/i }) ||
      screen.queryByRole("textbox", { name: /skill/i });
    fireEvent.change(skillFilter!, { target: { value: "summarize" } });
    await waitFor(() => {
      // All visible agent cards should relate to the summarize skill
      const cards = screen.getAllByRole("article");
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows an empty-state message when no agents match the current filters", async () => {
    render(<MarketplacePage />);
    const skillFilter =
      screen.queryByRole("combobox", { name: /skill/i }) ||
      screen.queryByRole("textbox", { name: /skill/i });
    fireEvent.change(skillFilter!, { target: { value: "zzz-nonexistent-skill" } });
    await waitFor(() => {
      expect(screen.getByText(/no agents found|no results/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 12 — open terminal from marketplace
// ---------------------------------------------------------------------------

describe("MarketplacePage — open terminal (SPEC §3.2 story 12)", () => {
  it("renders an 'Open terminal' or 'Invoke' CTA on each agent card", async () => {
    render(<MarketplacePage />);
    await waitFor(() => {
      const ctaButtons = screen.getAllByRole("button", { name: /open terminal|invoke/i });
      expect(ctaButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("navigates to /session/[agentId] when 'Open terminal' is clicked", async () => {
    render(<MarketplacePage />);
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /open terminal/i }).length,
      ).toBeGreaterThanOrEqual(1);
    });
    const firstCTA = screen.getAllByRole("button", { name: /open terminal/i })[0]!;
    fireEvent.click(firstCTA);
    // Wave 2: should trigger router.push to /session/[id]
    // Verified via mock router or link href
    await waitFor(() => {
      expect(window.location.pathname).toMatch(/session/);
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 11 — agent card detail
// ---------------------------------------------------------------------------

describe("MarketplacePage — agent card fields (SPEC §3.2 story 11)", () => {
  it("each agent card displays the agent display name", async () => {
    render(<MarketplacePage />);
    await waitFor(() => {
      const firstCard = screen.getAllByRole("article")[0]!;
      expect(within(firstCard).getByRole("heading")).toBeInTheDocument();
    });
  });

  it("each agent card displays at least one skill tag as a badge", async () => {
    render(<MarketplacePage />);
    await waitFor(() => {
      const firstCard = screen.getAllByRole("article")[0]!;
      // Wave 2: skill tags should have data-slot="badge" or role marker
      expect(within(firstCard).getAllByRole("listitem").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("each agent card displays the price per million tokens", async () => {
    render(<MarketplacePage />);
    await waitFor(() => {
      const firstCard = screen.getAllByRole("article")[0]!;
      expect(within(firstCard).getByText(/M-tok|\$0\.\d+/i)).toBeInTheDocument();
    });
  });

  it("each agent card displays the agent status badge (active / paused / slashed)", async () => {
    render(<MarketplacePage />);
    await waitFor(() => {
      const firstCard = screen.getAllByRole("article")[0]!;
      expect(within(firstCard).getByText(/active|paused|slashed/i)).toBeInTheDocument();
    });
  });
});
