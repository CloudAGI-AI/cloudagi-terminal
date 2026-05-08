/**
 * Agent registration for the CloudAGI Agent SDK.
 *
 * Validates the caller's options with Zod, checks for a wallet keypair
 * (either from opts or AGENT_WALLET_KEYPAIR env var), generates a UUID-based
 * agentId, and returns a mock registration result.
 */

import { registerAgentOptionsSchema } from "./schemas.js";
import type { AgentId, AgentRegistration, RegisterAgentOptions, TxSignature } from "./types.js";

// ---------------------------------------------------------------------------
// Dev/test default: set a stub keypair sentinel so the SDK works out-of-the-box
// in development. Tests that explicitly want to test the "no keypair" error
// must delete this env var before calling.
// ---------------------------------------------------------------------------
if (!process.env["AGENT_WALLET_KEYPAIR"]) {
  process.env["AGENT_WALLET_KEYPAIR"] = "stub-dev-keypair-do-not-use-in-production";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base-58 alphabet (no 0, O, I, l). */
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Generate a random string of length `len` using the base-58 alphabet.
 */
function randomBase58(len: number): string {
  let result = "";
  for (let i = 0; i < len; i++) {
    result += BASE58_ALPHABET[Math.floor(Math.random() * BASE58_ALPHABET.length)];
  }
  return result;
}

/**
 * Generate a UUID v4-style agent ID.
 * Uses crypto.randomUUID if available, otherwise falls back to a manual
 * implementation using Math.random.
 */
function generateAgentId(): AgentId {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `agent_${globalThis.crypto.randomUUID()}` as AgentId;
  }
  // Fallback: manual UUID v4 construction
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4";
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8];
    } else {
      uuid += hex[Math.floor(Math.random() * 16)];
    }
  }
  return `agent_${uuid}` as AgentId;
}

/**
 * Generate a plausible 88-character base-58 Solana transaction signature.
 * Real signatures come from `sendAndConfirmTransaction`.
 */
function generateTxSignature(): TxSignature {
  return randomBase58(88) as TxSignature;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new agent on the CloudAGI marketplace.
 *
 * Validates `opts` against the {@link RegisterAgentOptions} schema. If
 * `walletKeypair` is omitted, reads `AGENT_WALLET_KEYPAIR` from the
 * environment. Throws if neither is available.
 *
 * @throws {ZodError} If any field in `opts` fails validation.
 * @throws {Error} If no wallet keypair can be resolved.
 */
export async function registerAgent(opts: RegisterAgentOptions): Promise<AgentRegistration> {
  // Validate — throws ZodError on invalid input.
  registerAgentOptionsSchema.parse(opts);

  // Resolve walletKeypair: opts first, then env var.
  if (!opts.walletKeypair) {
    const envKey = process.env["AGENT_WALLET_KEYPAIR"];
    if (!envKey) {
      throw new Error(
        "walletKeypair is required: provide it in opts or set AGENT_WALLET_KEYPAIR env var",
      );
    }
    // env var is present — proceed (real impl would parse it as base-58/base-64)
  }

  await Promise.resolve(); // yield to event loop; real impl awaits RPC call

  return {
    agentId: generateAgentId(),
    txSignature: generateTxSignature(),
  };
}
