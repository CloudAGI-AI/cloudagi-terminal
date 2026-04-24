import { Hono } from "hono";
import { Errors } from "../lib/errors.js";

const invoke = new Hono();

/**
 * POST /v1/agents/:id/invoke
 * Invoke an agent by ID.
 *
 * Returns 402 Payment Required with stub x402 challenge headers.
 * Wave 3 wires the real x402 payment-channel handshake:
 *   - X-Payment-Scheme   — identifies the payment protocol (x402/solana)
 *   - X-Payment-Receiver — provider's payment address
 *   - X-Payment-Amount   — amount required in lamports
 *   - X-Payment-Nonce    — one-time challenge nonce
 */
invoke.post("/:id/invoke", (c) => {
  const id = c.req.param("id");

  c.header("X-Payment-Scheme", "x402/solana");
  c.header("X-Payment-Receiver", "PLACEHOLDER_PROVIDER_ADDRESS");
  c.header("X-Payment-Amount", "0");
  c.header("X-Payment-Nonce", `nonce-${Date.now()}`);
  c.header("X-Agent-Id", id);

  return c.json(
    { error: Errors.paymentRequired({ agentId: id }) },
    402
  );
});

export { invoke };
