/**
 * TerminalPreview component tests — Wave 1 RED phase.
 *
 * TerminalPreview (the reusable UI primitive) does NOT exist yet.
 * Wave 2 must create it at: src/components/ui/TerminalPreview.tsx
 *
 * This is different from the inline TerminalPreview() in page.tsx.
 * The reusable component should accept structured props so it can be
 * composed in /session/[id] and the landing page.
 *
 * Expected API:
 *   <TerminalPreview lines={TerminalLine[]} title="cloudagi — terminal" />
 *   TerminalLine: { type: "command" | "output" | "info" | "prompt"; text: string }
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { TerminalPreview, type TerminalLine } from "@/components/ui/TerminalPreview";

const SAMPLE_LINES: TerminalLine[] = [
  { type: "command", text: "cloudagi agents list --tag summarize" },
  { type: "output", text: "Fetching registry... 3 agents found" },
  { type: "info", text: "mistral-7b-q4 · $0.002/M-tok · rep: 4.9" },
  { type: "prompt", text: "Approve? [y/N]" },
];

describe("TerminalPreview — rendering", () => {
  it("renders the window chrome title bar", () => {
    render(<TerminalPreview lines={SAMPLE_LINES} title="cloudagi — terminal" />);
    expect(screen.getByText(/cloudagi — terminal/i)).toBeInTheDocument();
  });

  it("renders each line of terminal output", () => {
    render(<TerminalPreview lines={SAMPLE_LINES} />);
    for (const line of SAMPLE_LINES) {
      expect(screen.getByText(new RegExp(line.text.slice(0, 20), "i"))).toBeInTheDocument();
    }
  });

  it("renders command lines with a $ prefix indicator", () => {
    render(<TerminalPreview lines={[{ type: "command", text: "cloudagi agents list" }]} />);
    // $ prefix should appear in the DOM for command lines
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });

  it("renders the three macOS-style window control dots", () => {
    render(<TerminalPreview lines={[]} />);
    // Dots are decorative — hidden from AT but present in DOM
    const dots = document.querySelectorAll('[aria-hidden="true"]');
    // At minimum the three colored circles should be present
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it("has role=img with a descriptive aria-label on the outer container", () => {
    render(
      <TerminalPreview
        lines={SAMPLE_LINES}
        aria-label="Terminal interface preview showing agent invocation"
      />
    );
    expect(
      screen.getByRole("img", { name: /terminal interface preview/i })
    ).toBeInTheDocument();
  });
});

describe("TerminalPreview — empty state", () => {
  it("renders without crashing when lines array is empty", () => {
    render(<TerminalPreview lines={[]} />);
    // Should render shell chrome at minimum
    expect(document.querySelector('[role="img"]')).not.toBeNull();
  });
});

describe("TerminalPreview — prompt line (SPEC §4.2 intent approval)", () => {
  it("renders a prompt-type line that visually prompts user approval", () => {
    render(
      <TerminalPreview
        lines={[{ type: "prompt", text: "Approve? [y/N]" }]}
      />
    );
    expect(screen.getByText(/approve\? \[y\/N\]/i)).toBeInTheDocument();
  });
});
