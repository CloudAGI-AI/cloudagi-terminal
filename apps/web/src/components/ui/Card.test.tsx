import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { render, screen } from "@/test-utils";
/**
 * Card component tests — Wave 1 RED phase.
 *
 * Card does NOT exist yet. Wave 2 must create it at:
 *   src/components/ui/Card.tsx
 *
 * Expected API:
 *   <Card> — container with surface background + border
 *   <CardHeader> — top section, typically holds title
 *   <CardTitle> — semantic heading inside the card
 *   <CardDescription> — muted supporting text
 *   <CardContent> — main body
 *   <CardFooter> — bottom section, often holds CTAs
 *
 * Used by: agent listing cards on /marketplace, receipt cards, dashboard panels.
 */
import { describe, expect, it } from "vitest";

describe("Card — structure", () => {
  it("renders a card container as an article or div with role=region or article", () => {
    render(<Card aria-label="Agent card">Content</Card>);
    // Wave 2: Card should be addressable — article or section with aria-label
    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  it("renders CardHeader inside Card without throwing", () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
      </Card>,
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
  });

  it("renders CardTitle as a heading element", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>mistral-7b-q4</CardTitle>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: /mistral-7b-q4/i })).toBeInTheDocument();
  });

  it("renders CardDescription with muted styling marker", () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Summarization · $0.002/M-tok</CardDescription>
        </CardHeader>
      </Card>,
    );
    const desc = screen.getByText(/summarization/i);
    expect(desc).toBeInTheDocument();
    // Wave 2: should have data-slot="description" for targeting
    expect(desc).toHaveAttribute("data-slot", "description");
  });

  it("renders CardContent containing arbitrary children", () => {
    render(
      <Card>
        <CardContent>
          <span>Rep: 4.9</span>
        </CardContent>
      </Card>,
    );
    expect(screen.getByText(/rep: 4\.9/i)).toBeInTheDocument();
  });

  it("renders CardFooter containing CTA buttons", () => {
    render(
      <Card>
        <CardFooter>
          <button>Invoke agent</button>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole("button", { name: /invoke agent/i })).toBeInTheDocument();
  });
});

describe("Card — agent listing usage (SPEC §3.2 story 11)", () => {
  it("can display agent name, skill tags, and price in a single card", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>llama-3-8b-instruct</CardTitle>
          <CardDescription>sentiment · $0.003/M-tok · rep 4.7</CardDescription>
        </CardHeader>
        <CardContent>
          <span>Provider: cloud-x</span>
        </CardContent>
        <CardFooter>
          <button>Open terminal</button>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: /llama-3-8b-instruct/i })).toBeInTheDocument();
    expect(screen.getByText(/sentiment/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open terminal/i })).toBeInTheDocument();
  });
});
