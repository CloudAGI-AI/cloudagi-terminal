import type { Context, Next } from "hono";

// TODO (Wave 3): Wire the full x402 payment-channel handshake here.
// This middleware will:
//   1. Read the X-Payment header from the request.
//   2. Verify the signed payment receipt on-chain (Solana).
//   3. Reject with 402 + payment-challenge headers if no valid receipt.
//   4. Attach the verified receipt to c.var for downstream route handlers.

export async function x402Middleware(c: Context, next: Next): Promise<void> {
  // Placeholder — passes through unconditionally until Wave 3.
  await next();
}
