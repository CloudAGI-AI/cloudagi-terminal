import { Badge } from "@/components/ui/Badge";
import { render, screen } from "@/test-utils";
/**
 * Badge component tests — Wave 1 RED phase.
 *
 * Badge does NOT exist yet. Wave 2 must create it at:
 *   src/components/ui/Badge.tsx
 *
 * Expected API:
 *   <Badge variant="default" | "success" | "warning" | "danger" | "outline">
 *   Used for: agent status (active/paused/slashed), skill tags,
 *             receipt status (minted/disputed/refunded), reputation tier.
 */
import { describe, expect, it } from "vitest";

describe("Badge — rendering", () => {
  it("renders the badge text content", () => {
    render(<Badge>active</Badge>);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders with variant='default' as baseline", () => {
    render(<Badge variant="default">default</Badge>);
    expect(screen.getByText("default")).toHaveAttribute("data-variant", "default");
  });

  it("renders with variant='success' for active agent status", () => {
    render(<Badge variant="success">active</Badge>);
    expect(screen.getByText("active")).toHaveAttribute("data-variant", "success");
  });

  it("renders with variant='warning' for paused agent status", () => {
    render(<Badge variant="warning">paused</Badge>);
    expect(screen.getByText("paused")).toHaveAttribute("data-variant", "warning");
  });

  it("renders with variant='danger' for slashed agent status", () => {
    render(<Badge variant="danger">slashed</Badge>);
    expect(screen.getByText("slashed")).toHaveAttribute("data-variant", "danger");
  });

  it("renders with variant='outline' for skill tags", () => {
    render(<Badge variant="outline">sentiment.classify.v1</Badge>);
    expect(screen.getByText(/sentiment\.classify\.v1/)).toHaveAttribute("data-variant", "outline");
  });
});

describe("Badge — agent status scenarios (SPEC §5.1)", () => {
  it("renders 'minted' receipt status badge", () => {
    render(<Badge variant="success">minted</Badge>);
    expect(screen.getByText("minted")).toBeInTheDocument();
  });

  it("renders 'disputed' receipt status badge with warning styling", () => {
    render(<Badge variant="warning">disputed</Badge>);
    expect(screen.getByText("disputed")).toBeInTheDocument();
  });

  it("renders 'refunded' receipt status badge with danger styling", () => {
    render(<Badge variant="danger">refunded</Badge>);
    expect(screen.getByText("refunded")).toBeInTheDocument();
  });
});

describe("Badge — accessibility", () => {
  it("is inline and does not obscure surrounding text from screen readers", () => {
    render(
      <p>
        Status: <Badge>active</Badge>
      </p>,
    );
    // The paragraph text + badge text should both be readable
    expect(screen.getByText(/status:/i)).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });
});
