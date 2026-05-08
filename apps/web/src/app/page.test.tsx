import { render, screen, within } from "@/test-utils";
/**
 * Landing page tests — Wave 1 RED phase.
 *
 * All tests target the existing page.tsx structure.
 * Sections covered: NavBar, HeroSection, FeaturesSection, StatsStrip,
 * TerminalPreview, Footer, and accessibility landmarks.
 */
import { describe, expect, it } from "vitest";
import HomePage from "./page";

// ---------------------------------------------------------------------------
// NavBar
// ---------------------------------------------------------------------------

describe("NavBar", () => {
  it("renders the cloudagi brand link / logo with accessible name", () => {
    render(<HomePage />);
    expect(screen.getByLabelText("CloudAGI home")).toBeInTheDocument();
  });

  it("renders a primary navigation landmark", () => {
    render(<HomePage />);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  });

  it("renders a GitHub link in the navbar that opens in a new tab", () => {
    render(<HomePage />);
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    const ghLink = within(nav).getByRole("link", { name: /github/i });
    expect(ghLink).toHaveAttribute("target", "_blank");
    expect(ghLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders a Docs navigation link", () => {
    render(<HomePage />);
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("link", { name: /docs/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// HeroSection
// ---------------------------------------------------------------------------

describe("HeroSection", () => {
  it("renders the primary hero heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("hero heading contains the on-chain tagline", () => {
    render(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/on-chain from the terminal/i);
  });

  it("renders the 'List your agent' primary CTA link", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /list your agent/i })).toBeInTheDocument();
  });

  it("renders the 'Open terminal' secondary CTA link", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /open terminal/i })).toBeInTheDocument();
  });

  it("renders the 'active development — public sprint' status badge", () => {
    render(<HomePage />);
    expect(screen.getByText(/active development/i)).toBeInTheDocument();
  });

  it("renders a hero section with aria-labelledby pointing to hero-heading id", () => {
    render(<HomePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveAttribute("id", "hero-heading");
    const heroSection = document.querySelector('[aria-labelledby="hero-heading"]');
    expect(heroSection).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FeaturesSection
// ---------------------------------------------------------------------------

describe("FeaturesSection", () => {
  it("renders the features section heading", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /cloudagi approach/i }),
    ).toBeInTheDocument();
  });

  it("renders exactly 3 feature cards as article elements", () => {
    render(<HomePage />);
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);
  });

  it("renders a Registry feature card with description about on-chain identity", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /registry/i })).toBeInTheDocument();
    expect(screen.getByText(/registers an agent on-chain/i)).toBeInTheDocument();
  });

  it("renders a Terminal feature card with description about web terminal flow", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /^terminal$/i })).toBeInTheDocument();
    expect(screen.getByText(/intent preview before any spend/i)).toBeInTheDocument();
  });

  it("renders a Receipts feature card with description about on-chain receipt minting", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /receipts/i })).toBeInTheDocument();
    expect(screen.getByText(/mints an on-chain receipt/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// StatsStrip
// ---------------------------------------------------------------------------

describe("StatsStrip", () => {
  it("renders the platform statistics section landmark", () => {
    render(<HomePage />);
    expect(screen.getByRole("region", { name: /platform statistics/i })).toBeInTheDocument();
  });

  it("renders 'Uptime' stat label with 99.9 value", () => {
    render(<HomePage />);
    expect(screen.getByText(/uptime/i)).toBeInTheDocument();
    expect(screen.getByText("99.9")).toBeInTheDocument();
  });

  it("renders 'Active agents' stat label", () => {
    render(<HomePage />);
    expect(screen.getByText(/active agents/i)).toBeInTheDocument();
  });

  it("renders 'Receipts minted' stat label", () => {
    render(<HomePage />);
    expect(screen.getByText(/receipts minted/i)).toBeInTheDocument();
  });

  it("renders stats in a definition list (dl) for semantic correctness", () => {
    render(<HomePage />);
    const dl = document.querySelector("dl");
    expect(dl).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TerminalPreview
// ---------------------------------------------------------------------------

describe("TerminalPreview", () => {
  it("renders the terminal preview region with descriptive aria-label", () => {
    render(<HomePage />);
    expect(screen.getByRole("region", { name: /terminal preview/i })).toBeInTheDocument();
  });

  it("renders an img role element describing the terminal interface", () => {
    render(<HomePage />);
    expect(screen.getByRole("img", { name: /terminal interface preview/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

describe("Footer", () => {
  it("renders a footer landmark element", () => {
    render(<HomePage />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the footer navigation landmark", () => {
    render(<HomePage />);
    expect(screen.getByRole("navigation", { name: /footer navigation/i })).toBeInTheDocument();
  });

  it("renders a GitHub link in the footer", () => {
    render(<HomePage />);
    const footer = screen.getByRole("contentinfo");
    const ghLink = within(footer).getByRole("link", { name: /github/i });
    expect(ghLink).toBeInTheDocument();
  });

  it("renders the Apache 2.0 license note", () => {
    render(<HomePage />);
    expect(screen.getByText(/apache 2\.0/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Accessibility landmarks — overall page structure
// ---------------------------------------------------------------------------

describe("Accessibility landmarks — page structure", () => {
  it("renders exactly one main landmark", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("renders a header / banner landmark", () => {
    render(<HomePage />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders a footer / contentinfo landmark", () => {
    render(<HomePage />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("page has at least one h1 and it is unique", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
