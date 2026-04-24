/**
 * Anchor migration — deploy skeleton.
 *
 * Wave 2/3 will populate this with:
 *   1. initialize_config for escrow-stake
 *   2. initialize_tree for receipt-mint (with a real merkle tree keypair)
 *   3. Any post-deploy config writes needed for mandate-intent
 *
 * Run via: anchor migrate --provider.cluster devnet
 */

import * as anchor from "@coral-xyz/anchor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
module.exports = async function (provider: any): Promise<void> {
  anchor.setProvider(provider);

  console.log("CloudAGI contracts — migration skeleton");
  console.log("Provider cluster:", provider.connection.rpcEndpoint);
  console.log("Deployer wallet:", provider.wallet.publicKey.toBase58());

  // TODO Wave 2: call escrow_stake.initialize_config()
  console.log("[TODO] escrow-stake: initialize_config — skipped (Wave 2)");

  // TODO Wave 2: create merkle tree keypair, call receipt_mint.initialize_tree()
  console.log("[TODO] receipt-mint: initialize_tree — skipped (Wave 2)");

  // TODO Wave 2: no-op for mandate-intent (no global config required at deploy)
  console.log("[TODO] mandate-intent: no deploy-time init needed");

  console.log("Migration skeleton complete.");
};
