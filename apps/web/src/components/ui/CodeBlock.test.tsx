import { CodeBlock } from "@/components/ui/CodeBlock";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
/**
 * CodeBlock component tests — Wave 1 RED phase.
 *
 * CodeBlock does NOT exist yet. Wave 2 must create it at:
 *   src/components/ui/CodeBlock.tsx
 *
 * Expected API:
 *   <CodeBlock language="bash" | "typescript" | "json">{code}</CodeBlock>
 *   <CodeBlock copyable> — shows copy-to-clipboard button
 *   <CodeBlock filename="adapter.ts"> — shows a filename header
 *
 * Used in: seller onboarding instructions, receipt hash display, SDK code samples.
 */
import { describe, expect, it, vi } from "vitest";

const SAMPLE_CODE = `bun run cloudagi serve --agent ./adapter.ts`;
const SAMPLE_JSON = `{ "promptHash": "abc123", "outputHash": "def456" }`;

describe("CodeBlock — rendering", () => {
  it("renders the code content inside a <code> element", () => {
    render(<CodeBlock language="bash">{SAMPLE_CODE}</CodeBlock>);
    expect(screen.getByText(SAMPLE_CODE)).toBeInTheDocument();
  });

  it("renders with role='region' and an accessible label", () => {
    render(
      <CodeBlock language="bash" aria-label="Installation command">
        {SAMPLE_CODE}
      </CodeBlock>,
    );
    expect(screen.getByRole("region", { name: /installation command/i })).toBeInTheDocument();
  });

  it("renders the language indicator label", () => {
    render(<CodeBlock language="typescript">{SAMPLE_CODE}</CodeBlock>);
    expect(screen.getByText(/typescript/i)).toBeInTheDocument();
  });

  it("renders the filename header when filename prop is provided", () => {
    render(
      <CodeBlock language="typescript" filename="adapter.ts">
        {SAMPLE_CODE}
      </CodeBlock>,
    );
    expect(screen.getByText(/adapter\.ts/i)).toBeInTheDocument();
  });

  it("renders JSON content without mangling whitespace", () => {
    render(<CodeBlock language="json">{SAMPLE_JSON}</CodeBlock>);
    expect(screen.getByText(SAMPLE_JSON)).toBeInTheDocument();
  });
});

describe("CodeBlock — copy to clipboard", () => {
  it("renders a copy button when copyable prop is passed", () => {
    render(
      <CodeBlock language="bash" copyable>
        {SAMPLE_CODE}
      </CodeBlock>,
    );
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("does NOT render a copy button when copyable is omitted", () => {
    render(<CodeBlock language="bash">{SAMPLE_CODE}</CodeBlock>);
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  });

  it("copies code to clipboard and shows 'Copied' confirmation on click", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(
      <CodeBlock language="bash" copyable>
        {SAMPLE_CODE}
      </CodeBlock>,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SAMPLE_CODE);
  });
});

describe("CodeBlock — receipt hash display (SPEC §3.2 story 18)", () => {
  it("renders a prompt hash value as selectable code text", () => {
    const hash = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    render(<CodeBlock language="json">{hash}</CodeBlock>);
    expect(screen.getByText(hash)).toBeInTheDocument();
  });
});
