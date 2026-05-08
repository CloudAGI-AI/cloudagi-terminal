import { fireEvent, render, screen, waitFor } from "@/test-utils";
/**
 * /sell page tests — Wave 1 RED phase.
 *
 * The page does NOT exist yet (Wave 2 creates it at src/app/sell/page.tsx).
 * These tests define expected rendering and interactions per SPEC §3.1 (Seller stories)
 * and §4.1 (seller onboarding flow).
 *
 * SPEC references:
 *   Story 1  — connect browser wallet
 *   Story 2  — post stake in stablecoin
 *   Story 3  — register agent with name, skill tags, model descriptor, price, endpoint URL
 *   Story 6  — set per-call policies
 *   Story 7  — receive automatic settlement
 */
import { describe, expect, it } from "vitest";
import SellPage from "./page";

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

describe("SellPage — layout and landmarks", () => {
  it("renders a main landmark with a heading for the sell / provider onboarding flow", () => {
    render(<SellPage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /list your agent|register agent|sell|provider/i }),
    ).toBeInTheDocument();
  });

  it("renders a multi-step form or wizard structure", () => {
    render(<SellPage />);
    // Wave 2: wizard steps should be visible as a step indicator
    const stepIndicator =
      screen.queryByRole("list", { name: /steps/i }) ||
      screen.queryByRole("navigation", { name: /steps/i });
    expect(stepIndicator).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 1 — wallet connection
// ---------------------------------------------------------------------------

describe("SellPage — wallet connection (SPEC §3.1 story 1)", () => {
  it("renders a 'Connect wallet' button when no wallet is connected", () => {
    render(<SellPage />);
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("shows wallet address and 'Disconnect' option after wallet connection", async () => {
    render(<SellPage />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    await waitFor(() => {
      // Wave 2: wallet adapter mock should resolve with a public key
      expect(
        screen.getByRole("button", { name: /disconnect/i }) ||
          screen.getByText(/[A-HJ-NP-Za-km-z1-9]{32,44}/),
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 3 — agent registration form
// ---------------------------------------------------------------------------

describe("SellPage — agent registration form (SPEC §3.1 story 3)", () => {
  it("renders a text input for the agent display name", () => {
    render(<SellPage />);
    expect(screen.getByRole("textbox", { name: /agent name|display name/i })).toBeInTheDocument();
  });

  it("renders a skill tags input or multi-select", () => {
    render(<SellPage />);
    const skillInput =
      screen.queryByRole("textbox", { name: /skills|skill tags/i }) ||
      screen.queryByRole("combobox", { name: /skills/i });
    expect(skillInput).not.toBeNull();
  });

  it("renders a model descriptor input (model family / name)", () => {
    render(<SellPage />);
    expect(screen.getByRole("textbox", { name: /model/i })).toBeInTheDocument();
  });

  it("renders a price per million tokens numeric input", () => {
    render(<SellPage />);
    expect(screen.getByRole("spinbutton", { name: /price.*million|M-tok/i })).toBeInTheDocument();
  });

  it("renders an endpoint URL input", () => {
    render(<SellPage />);
    expect(screen.getByRole("textbox", { name: /endpoint url|endpoint/i })).toBeInTheDocument();
  });

  it("shows a validation error when endpoint URL is not a valid HTTPS URL", async () => {
    render(<SellPage />);
    const endpointInput = screen.getByRole("textbox", { name: /endpoint url|endpoint/i });
    fireEvent.change(endpointInput, { target: { value: "not-a-url" } });
    fireEvent.blur(endpointInput);
    await waitFor(() => {
      expect(screen.getByText(/valid https url|invalid url/i)).toBeInTheDocument();
    });
  });

  it("disables the 'Register agent' submit button when required fields are empty", () => {
    render(<SellPage />);
    expect(screen.getByRole("button", { name: /register agent|submit/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 2 — stake display
// ---------------------------------------------------------------------------

describe("SellPage — stake requirement (SPEC §3.1 story 2)", () => {
  it("displays the required stake amount fetched from registration requirements", async () => {
    render(<SellPage />);
    await waitFor(() => {
      expect(screen.getByText(/stake required|minimum stake/i)).toBeInTheDocument();
    });
  });

  it("renders a 'Post stake' or 'Approve stake transaction' button", async () => {
    render(<SellPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /post stake|approve stake/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 6 — per-call policies
// ---------------------------------------------------------------------------

describe("SellPage — per-call policies (SPEC §3.1 story 6)", () => {
  it("renders a max prompt tokens numeric input", () => {
    render(<SellPage />);
    expect(
      screen.getByRole("spinbutton", { name: /max.*prompt tokens|max prompt/i }),
    ).toBeInTheDocument();
  });

  it("renders a max output tokens numeric input", () => {
    render(<SellPage />);
    expect(
      screen.getByRole("spinbutton", { name: /max.*output tokens|max output/i }),
    ).toBeInTheDocument();
  });
});
