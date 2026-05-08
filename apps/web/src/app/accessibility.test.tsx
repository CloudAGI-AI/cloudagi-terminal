import { render } from "@/test-utils";
import { axe, toHaveNoViolations } from "jest-axe";
/**
 * Accessibility smoke tests — Wave 1 RED phase.
 *
 * Uses @axe-core/react (via jest-axe compat layer) to run WCAG 2.1 AA
 * automated checks on the landing page.
 *
 * These tests will FAIL until:
 *   1. axe-core devDep is installed (Wave 0 package.json update)
 *   2. Any axe violations introduced during Wave 2 component creation are fixed.
 *
 * Note: axe catches ~30% of WCAG issues automatically; manual testing is
 * still required for full compliance.
 */
import { describe, expect, it } from "vitest";
import HomePage from "./page";

expect.extend(toHaveNoViolations);

describe("Landing page — axe-core WCAG 2.1 AA smoke", () => {
  it("has no automatically detectable axe violations on the full landing page", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no color-contrast violations in the hero section", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container, {
      runOnly: {
        type: "rule",
        values: ["color-contrast"],
      },
    });
    expect(results).toHaveNoViolations();
  });

  it("has no missing form label violations", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container, {
      runOnly: {
        type: "rule",
        values: ["label", "label-content-name-mismatch"],
      },
    });
    expect(results).toHaveNoViolations();
  });

  it("has no landmark region violations", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container, {
      runOnly: {
        type: "rule",
        values: ["landmark-one-main", "landmark-unique", "region", "bypass"],
      },
    });
    expect(results).toHaveNoViolations();
  });

  it("all images have descriptive alt text or are marked aria-hidden", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container, {
      runOnly: {
        type: "rule",
        values: ["image-alt", "role-img-alt"],
      },
    });
    expect(results).toHaveNoViolations();
  });

  it("all interactive elements are keyboard focusable and have visible focus indicators", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container, {
      runOnly: {
        type: "rule",
        values: ["focusable-no-name", "interactive-supports-focus", "tabindex"],
      },
    });
    expect(results).toHaveNoViolations();
  });

  it("heading hierarchy is sequential with no skipped levels", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container, {
      runOnly: {
        type: "rule",
        values: ["heading-order"],
      },
    });
    expect(results).toHaveNoViolations();
  });

  it("all links have discernible text (no empty or icon-only links)", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container, {
      runOnly: {
        type: "rule",
        values: ["link-name"],
      },
    });
    expect(results).toHaveNoViolations();
  });
});
