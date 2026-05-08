import { Button } from "@/components/ui/Button";
import { fireEvent, render, screen } from "@/test-utils";
/**
 * Button component tests — Wave 1 RED phase.
 *
 * Button does NOT exist yet. Wave 2 must create it at:
 *   src/components/ui/Button.tsx
 *
 * Expected API (derived from class-variance-authority pattern and SPEC CTAs):
 *   <Button variant="primary" | "secondary" | "ghost" size="sm" | "md" | "lg">
 *   <Button asChild> — renders child element via Radix Slot
 *   <Button disabled>
 *   <Button isLoading> — shows spinner, disables interaction
 */
import { describe, expect, it, vi } from "vitest";

describe("Button — rendering", () => {
  it("renders a button element with the provided text label", () => {
    render(<Button>List your agent</Button>);
    expect(screen.getByRole("button", { name: /list your agent/i })).toBeInTheDocument();
  });

  it("renders with variant='primary' applying accent background styles", () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole("button", { name: /primary/i });
    // Wave 2: should carry a data-variant or class that identifies it as primary
    expect(btn).toHaveAttribute("data-variant", "primary");
  });

  it("renders with variant='secondary' applying border/outline styles", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole("button", { name: /secondary/i });
    expect(btn).toHaveAttribute("data-variant", "secondary");
  });

  it("renders with variant='ghost' applying minimal background styles", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button", { name: /ghost/i })).toHaveAttribute("data-variant", "ghost");
  });

  it("renders with size='sm' applying small padding classes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "sm");
  });

  it("renders with size='lg' applying large padding classes", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "lg");
  });
});

describe("Button — disabled state", () => {
  it("is disabled when the disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not fire onClick when disabled", () => {
    const handler = vi.fn();
    render(
      <Button disabled onClick={handler}>
        Disabled
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("Button — loading state", () => {
  it("renders a loading spinner when isLoading=true", () => {
    render(<Button isLoading>Loading</Button>);
    // Wave 2: spinner should have role="status" or aria-label="Loading"
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("is aria-disabled when isLoading=true to prevent double-submit", () => {
    render(<Button isLoading>Loading</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Button — asChild (Radix Slot)", () => {
  it("renders as an anchor element when asChild wraps an <a>", () => {
    render(
      <Button asChild>
        <a href="/marketplace">Browse marketplace</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: /browse marketplace/i })).toBeInTheDocument();
  });
});

describe("Button — onClick interaction", () => {
  it("calls the onClick handler when clicked", () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click me</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
