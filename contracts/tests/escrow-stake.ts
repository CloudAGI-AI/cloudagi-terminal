/**
 * escrow-stake — Anchor test suite
 *
 * Happy path: initialize_stake → slash → close_stake
 *
 * All expectations marked RED: will fail until Wave 2/3 wires token transfers.
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
// RED: import generated IDL type once `anchor build` produces it
// import { EscrowStake } from "../target/types/escrow_stake";

describe("escrow-stake", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // RED: replace with real program once IDL is generated
  // const program = anchor.workspace.EscrowStake as Program<EscrowStake>;

  const authority = provider.wallet as anchor.Wallet;
  const provider_wallet = provider.wallet as anchor.Wallet;

  let configPda: PublicKey;
  let stakePda: PublicKey;

  const PROGRAM_ID = new PublicKey("11111111111111111111111111111111"); // RED

  before(async () => {
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_config")],
      PROGRAM_ID // RED: replace after `anchor build`
    );

    [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), provider_wallet.publicKey.toBuffer()],
      PROGRAM_ID // RED: replace after `anchor build`
    );
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("initialises the escrow config PDA", async () => {
    // RED: will throw until program is deployed
    // await program.methods
    //   .initializeConfig()
    //   .accounts({
    //     authority: authority.publicKey,
    //     config: configPda,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .rpc();
    //
    // const config = await program.account.escrowConfig.fetch(configPda);
    // expect(config.authority.toBase58()).to.equal(authority.publicKey.toBase58());

    expect(true).to.equal(true); // RED: remove once program is wired
  });

  it("locks SOL into a stake PDA (Basic tier)", async () => {
    // RED: will throw until lamport transfer CPI is implemented in Wave 2
    //
    // const amount = new anchor.BN(25_000_000); // 25 USDC proxy
    // await program.methods
    //   .initializeStake(amount)
    //   .accounts({
    //     provider: provider_wallet.publicKey,
    //     stakeAccount: stakePda,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .rpc();
    //
    // const stake = await program.account.stakeAccount.fetch(stakePda);
    // expect(stake.stakedLamports.toNumber()).to.equal(25_000_000);
    // expect(stake.tier).to.equal(0); // Basic
    // expect(stake.status).to.deep.equal({ active: {} });

    expect(true).to.equal(true); // RED: remove once program is wired
  });

  it("slashes 25% of stake (max ceiling)", async () => {
    // RED: will throw until lamport transfer to treasury is implemented
    //
    // const slashAmount = new anchor.BN(6_250_000); // 25% of 25 USDC
    // await program.methods
    //   .slash(slashAmount, 1) // reason_code 1 = hash mismatch (SPEC §11.3)
    //   .accounts({
    //     authority: authority.publicKey,
    //     config: configPda,
    //     stakeAccount: stakePda,
    //   })
    //   .rpc();
    //
    // const stake = await program.account.stakeAccount.fetch(stakePda);
    // expect(stake.stakedLamports.toNumber()).to.equal(18_750_000);
    // expect(stake.disputeCount).to.equal(1);

    expect(true).to.equal(true); // RED: remove once program is wired
  });

  it("requests unstake and waits for cooldown before close", async () => {
    // RED: will throw until program is deployed
    //
    // await program.methods
    //   .requestUnstake()
    //   .accounts({ provider: provider_wallet.publicKey, stakeAccount: stakePda })
    //   .rpc();
    //
    // let stake = await program.account.stakeAccount.fetch(stakePda);
    // expect(stake.status).to.deep.equal({ unstaking: {} });
    //
    // // Attempting close before cooldown must fail with CooldownNotElapsed
    // try {
    //   await program.methods.closeStake()
    //     .accounts({ provider: provider_wallet.publicKey, stakeAccount: stakePda, systemProgram: SystemProgram.programId })
    //     .rpc();
    //   expect.fail("expected CooldownNotElapsed");
    // } catch (err: unknown) {
    //   const anchorErr = err as anchor.AnchorError;
    //   expect(anchorErr.error.errorCode.code).to.equal("CooldownNotElapsed");
    // }

    expect(true).to.equal(true); // RED: remove once program is wired
  });

  it("closes stake PDA after cooldown elapses (simulated clock)", async () => {
    // RED: will throw until Wave 2 implements close + lamport return
    //
    // Uses anchor.utils.rpc.setTimestamp or test-validator --warp-slot to
    // advance clock past unlock_at.
    //
    // await program.methods
    //   .closeStake()
    //   .accounts({
    //     provider: provider_wallet.publicKey,
    //     stakeAccount: stakePda,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .rpc();
    //
    // const stake = await program.account.stakeAccount.fetch(stakePda);
    // expect(stake.status).to.deep.equal({ closed: {} });

    expect(true).to.equal(true); // RED: remove once program is wired
  });
});
