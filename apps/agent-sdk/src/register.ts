/**
 * Agent registration stub for the CloudAGI Agent SDK.
 *
 * Validates the caller's options with Zod, then returns a fake registration
 * result. The real implementation will submit a Solana transaction to the
 * CloudAGI marketplace program.
 *
 * TODO: Replace stub with on-chain registration via `@solana/web3.js`.
 */

import { registerAgentOptionsSchema } from "./schemas.js";
import type {
  AgentId,
  AgentRegistration,
  RegisterAgentOptions,
  TxSignature,
} from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic-looking fake agent ID for stub purposes.
 * Real IDs will be derived from the on-chain program-derived address.
 */
function generateStubAgentId(): AgentId {
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `agent_${ts}_${random}` as AgentId;
}

/**
 * Generate a plausible fake Solana transaction signature (88 base-58 chars).
 * Real signatures come from `sendAndConfirmTransaction`.
 */
function generateStubTxSignature(): TxSignature {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let sig = "";
  for (let i = 0; i < 88; i++) {
    sig += chars[Math.floor(Math.random() * chars.length)];
  }
  return sig as TxSignature;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new agent on the CloudAGI marketplace.
 *
 * Validates `opts` against the {@link RegisterAgentOptions} schema, then
 * returns a stub {@link AgentRegistration}. In production this will:
 *   1. Derive a program-derived address (PDA) for the agent.
 *   2. Build and sign a `RegisterAgent` instruction.
 *   3. Send the transaction to Solana and await confirmation.
 *   4. Return the PDA as `agentId` and the confirmed `txSignature`.
 *
 * @param opts - Registration options including name, skills, pricing, and
 *               the publicly reachable endpoint for this agent.
 * @returns A promise resolving to an {@link AgentRegistration} containing
 *          the assigned agent ID and the on-chain transaction signature.
 *
 * @throws {ZodError} If any field in `opts` fails validation.
 *
 * @example
 * ```ts
 * const reg = await registerAgent({
 *   name: "My Summariser",
 *   skills: ["summarisation"],
 *   pricing: { perMTokensIn: 1000, perMTokensOut: 2000 },
 *   endpoint: "https://my-agent.example.com/invoke",
 * });
 * console.log(reg.agentId); // "agent_lz4k8_a1b2c3d4"
 * ```
 */
export async function registerAgent(
  opts: RegisterAgentOptions,
): Promise<AgentRegistration> {
  // Validate — throws ZodError on invalid input.
  registerAgentOptionsSchema.parse(opts);

  // TODO: Build and submit on-chain registration transaction.
  // For now, return a stub result after a simulated async delay.
  await Promise.resolve(); // yield to event loop; real impl awaits RPC call

  return {
    agentId: generateStubAgentId(),
    txSignature: generateStubTxSignature(),
  };
}
