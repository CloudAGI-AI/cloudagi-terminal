/**
 * receipt-mint — Anchor test suite
 *
 * Happy path: initialize_tree → mint_receipt (Bubblegum init mocked)
 *
 * All expectations marked RED: will fail until Wave 2/3 wires Bubblegum CPIs.
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
// RED: import generated IDL type once `anchor build` produces it
// import { ReceiptMint } from "../target/types/receipt_mint";

describe("receipt-mint", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // RED: replace with real program once IDL is generated
  // const program = anchor.workspace.ReceiptMint as Program<ReceiptMint>;

  const authority = provider.wallet as anchor.Wallet;

  let registryPda: PublicKey;

  before(async () => {
    // RED: derive PDA once program ID is real
    [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipt_registry")],
      // RED: replace with real program ID after `anchor build`
      new PublicKey("11111111111111111111111111111111")
    );
  });

  // ---------------------------------------------------------------------------
  // Happy path — mocked (no real Bubblegum tree)
  // ---------------------------------------------------------------------------

  it("initialises the receipt registry PDA", async () => {
    // RED: will throw until Bubblegum tree accounts are provided
    // const merkleTree = Keypair.generate();
    // await program.methods
    //   .initializeTree()
    //   .accounts({
    //     authority: authority.publicKey,
    //     registry: registryPda,
    //     treeAuthority: ...,
    //     merkleTree: merkleTree.publicKey,
    //     bubblegumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
    //     compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    //     noopProgram: SPL_NOOP_PROGRAM_ID,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .rpc();
    //
    // const registry = await program.account.receiptRegistry.fetch(registryPda);
    // expect(registry.merkleCount.toNumber()).to.equal(0);

    expect(true).to.equal(true); // RED: remove once Bubblegum CPI is wired
  });

  it("mints a receipt cNFT for an invocation", async () => {
    // RED: will throw until Bubblegum CPI is implemented in Wave 2
    //
    // const metadata = {
    //   invocationId: Array.from(crypto.randomBytes(16)),
    //   promptHash:   Array.from(crypto.randomBytes(32)),
    //   outputHash:   Array.from(crypto.randomBytes(32)),
    //   tokensIn:     512,
    //   tokensOut:    256,
    //   flagsBitmap:  0,
    //   settlementAmount: new anchor.BN(250_000), // 0.25 USDC
    //   settlementSig:    Array.from(new Uint8Array(64).fill(0xcd)),
    // };
    // await program.methods
    //   .mintReceipt(metadata)
    //   .accounts({ ... })
    //   .rpc();
    //
    // const registry = await program.account.receiptRegistry.fetch(registryPda);
    // expect(registry.merkleCount.toNumber()).to.equal(1);

    expect(true).to.equal(true); // RED: remove once Bubblegum CPI is wired
  });

  it("verifies a receipt by asset_id", async () => {
    // RED: will throw until spl_account_compression::verify_leaf CPI lands
    //
    // const assetId = PublicKey.unique();
    // await program.methods
    //   .verifyReceipt(assetId)
    //   .accounts({ ... })
    //   .remainingAccounts(proofAccounts)
    //   .rpc();

    expect(true).to.equal(true); // RED: remove once verify_leaf CPI is wired
  });
});
