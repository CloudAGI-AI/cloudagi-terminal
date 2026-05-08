import { fireEvent, render, screen, waitFor } from "@/test-utils";
/**
 * /session/[id] page tests — Wave 1 RED phase.
 *
 * The page does NOT exist yet (Wave 2 creates it at src/app/session/[id]/page.tsx).
 * These tests define expected rendering and interactions per SPEC §3.2 (Buyer stories)
 * and §4.2 (buyer discovery → session → intent → invoke → receipt flow).
 *
 * SPEC references:
 *   Story 12 — open terminal scoped to a single agent
 *   Story 13 — pre-authorize session budget
 *   Story 14 — see declared intent before execution
 *   Story 15 — approve or reject intent with one click
 *   Story 16 — watch tokens stream in real time
 *   Story 17 — receive on-chain receipt immediately after call
 *   Story 18 — inspect receipt fields
 *   Story 21 — re-invoke same agent with saved prompt
 *   Story 22 — rate invocation thumbs up / down
 */
import { describe, expect, it } from "vitest";
import SessionPage from "./page";

// ---------------------------------------------------------------------------
// Mock params — Next.js page receives { params: { id: string } }
// ---------------------------------------------------------------------------

const MOCK_PARAMS = Promise.resolve({ id: "agent_abc123" });

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

describe("SessionPage — layout and landmarks", () => {
  it("renders a main landmark", () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the agent name as a heading at the top of the session page", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });
  });

  it("renders the terminal interface region", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /terminal|session terminal/i }),
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 13 — budget authorization
// ---------------------------------------------------------------------------

describe("SessionPage — budget authorization (SPEC §3.2 story 13)", () => {
  it("renders a session budget input allowing the buyer to set a stablecoin cap", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(
        screen.getByRole("spinbutton", { name: /budget|session budget|cap/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders an 'Authorize budget' button that signs the session budget", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /authorize budget|sign budget/i }),
      ).toBeInTheDocument();
    });
  });

  it("displays the remaining budget balance during an active session", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByText(/remaining budget|budget remaining/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 14 / 15 — intent approval
// ---------------------------------------------------------------------------

describe("SessionPage — intent approval (SPEC §3.2 stories 14–15)", () => {
  it("renders an intent card / panel after a prompt is submitted", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    const promptInput = await screen.findByRole("textbox", { name: /prompt/i });
    fireEvent.change(promptInput, { target: { value: "summarize the Q3 report" } });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /intent/i })).toBeInTheDocument();
    });
  });

  it("intent card displays the declared intent text in plain English", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    // Wave 2: mock API returns declared intent for test fixture
    await waitFor(() => {
      expect(screen.queryByText(/read prompt|generate.*tokens|settle/i)).not.toBeNull();
    });
  });

  it("renders an 'Approve' button on the intent card", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    });
  });

  it("renders a 'Reject' button on the intent card", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
    });
  });

  it("hides the intent card and begins streaming after 'Approve' is clicked", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => screen.getByRole("button", { name: /approve/i }));
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /intent/i })).toBeNull();
      expect(screen.getByRole("status", { name: /streaming|generating/i })).toBeInTheDocument();
    });
  });

  it("dismisses the session and shows a 'Rejected' status after 'Reject' is clicked", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => screen.getByRole("button", { name: /reject/i }));
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    await waitFor(() => {
      expect(screen.getByText(/rejected|cancelled/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 16 — streaming tokens
// ---------------------------------------------------------------------------

describe("SessionPage — token streaming (SPEC §3.2 story 16)", () => {
  it("renders a streaming output region that updates as tokens arrive", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByRole("log", { name: /output|token stream/i })).toBeInTheDocument();
    });
  });

  it("displays a live token counter while streaming is in progress", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByText(/tokens|tok/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 17 / 18 — receipt card
// ---------------------------------------------------------------------------

describe("SessionPage — receipt display (SPEC §3.2 stories 17–18)", () => {
  it("renders a receipt card region after a completed invocation", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /receipt/i })).toBeInTheDocument();
    });
  });

  it("receipt card shows the prompt hash", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByText(/prompt hash/i)).toBeInTheDocument();
    });
  });

  it("receipt card shows the output hash", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByText(/output hash/i)).toBeInTheDocument();
    });
  });

  it("receipt card shows token counts (in and out)", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByText(/tokens in|token.*in/i)).toBeInTheDocument();
      expect(screen.getByText(/tokens out|token.*out/i)).toBeInTheDocument();
    });
  });

  it("receipt card shows the settlement amount in stablecoin", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByText(/settlement|USDC/i)).toBeInTheDocument();
    });
  });

  it("receipt card shows prompt-injection flag score", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByText(/injection|injection score/i)).toBeInTheDocument();
    });
  });

  it("receipt card contains a link to the on-chain transaction", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /view on-chain|transaction|explorer/i }),
      ).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 21 — re-invoke with saved prompt
// ---------------------------------------------------------------------------

describe("SessionPage — re-invoke (SPEC §3.2 story 21)", () => {
  it("renders a 'Repeat invocation' or 'Re-run' button after a completed call", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /repeat|re-run|run again/i })).toBeInTheDocument();
    });
  });

  it("clicking re-run pre-fills the prompt input with the previous prompt", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => screen.getByRole("button", { name: /repeat|re-run|run again/i }));
    fireEvent.click(screen.getByRole("button", { name: /repeat|re-run|run again/i }));
    const promptInput = screen.getByRole("textbox", { name: /prompt/i });
    expect((promptInput as HTMLInputElement).value).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// SPEC Story 22 — rating
// ---------------------------------------------------------------------------

describe("SessionPage — invocation rating (SPEC §3.2 story 22)", () => {
  it("renders a thumbs up button after a completed invocation", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /thumbs up|rate.*up|\u{1F44D}/u }),
      ).toBeInTheDocument();
    });
  });

  it("renders a thumbs down button after a completed invocation", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /thumbs down|rate.*down|\u{1F44E}/u }),
      ).toBeInTheDocument();
    });
  });

  it("shows a 'Thanks for your rating' confirmation after thumbs up is clicked", async () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    await waitFor(() => screen.getByRole("button", { name: /thumbs up/i }));
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    await waitFor(() => {
      expect(screen.getByText(/thank|rating submitted/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// SPEC — prompt input
// ---------------------------------------------------------------------------

describe("SessionPage — prompt input", () => {
  it("renders a prompt textarea or textbox with accessible label", () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    expect(screen.getByRole("textbox", { name: /prompt/i })).toBeInTheDocument();
  });

  it("renders a 'Send' or 'Submit' button to invoke the agent", () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    expect(screen.getByRole("button", { name: /send|submit|invoke/i })).toBeInTheDocument();
  });

  it("disables the Send button when the prompt textarea is empty", () => {
    render(<SessionPage params={MOCK_PARAMS} />);
    expect(screen.getByRole("button", { name: /send|submit|invoke/i })).toBeDisabled();
  });
});
