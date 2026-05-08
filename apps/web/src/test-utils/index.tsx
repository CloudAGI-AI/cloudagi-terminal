import { type RenderOptions, render } from "@testing-library/react";
/**
 * test-utils/index.ts
 *
 * Re-exports @testing-library/react's render + all utilities, with a custom
 * render wrapper that can be extended with providers (ThemeProvider, etc.)
 * once they exist in Wave 2/3.
 */
import type React from "react";

// ---------------------------------------------------------------------------
// Wrapper — add global providers here as they are implemented
// ---------------------------------------------------------------------------

function AllProviders({ children }: { children: React.ReactNode }) {
  // TODO Wave 2: wrap with ThemeProvider, WalletAdapter, QueryClient, etc.
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Custom render
// ---------------------------------------------------------------------------

function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from RTL so tests only need to import from test-utils
export * from "@testing-library/react";
export { customRender as render };
