import { describe, expect, it } from "vitest";
import {
  ALGORITHM_VERSION,
  BPS_DENOMINATOR,
  DEFAULT_DISPUTE_WINDOW_MS,
  FACILITATOR_FEE_BPS,
  MIN_STAKE_LAMPORTS,
  PLATFORM_FEE_BPS,
  PROVIDER_FEE_BPS,
  REPUTATION_TIERS,
  TOTAL_FEE_BPS,
} from "./constants.js";

describe("fee basis points", () => {
  it("PLATFORM + PROVIDER + FACILITATOR sums to 10000", () => {
    expect(PLATFORM_FEE_BPS + PROVIDER_FEE_BPS + FACILITATOR_FEE_BPS).toBe(10000);
  });

  it("TOTAL_FEE_BPS equals BPS_DENOMINATOR", () => {
    expect(TOTAL_FEE_BPS).toBe(BPS_DENOMINATOR);
  });

  it("PLATFORM_FEE_BPS is 1500 (15%)", () => {
    expect(PLATFORM_FEE_BPS).toBe(1500);
  });

  it("PROVIDER_FEE_BPS is 8000 (80%)", () => {
    expect(PROVIDER_FEE_BPS).toBe(8000);
  });

  it("FACILITATOR_FEE_BPS is 500 (5%)", () => {
    expect(FACILITATOR_FEE_BPS).toBe(500);
  });

  it("each fee value is a positive integer", () => {
    for (const bps of [PLATFORM_FEE_BPS, PROVIDER_FEE_BPS, FACILITATOR_FEE_BPS]) {
      expect(Number.isInteger(bps)).toBe(true);
      expect(bps).toBeGreaterThan(0);
    }
  });
});

describe("MIN_STAKE_LAMPORTS", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(MIN_STAKE_LAMPORTS)).toBe(true);
    expect(MIN_STAKE_LAMPORTS).toBeGreaterThan(0);
  });

  it("represents at least 1 USDC (1_000_000 micro-USDC)", () => {
    expect(MIN_STAKE_LAMPORTS).toBeGreaterThanOrEqual(1_000_000);
  });
});

describe("DEFAULT_DISPUTE_WINDOW_MS", () => {
  it("is exactly 72 hours in milliseconds", () => {
    expect(DEFAULT_DISPUTE_WINDOW_MS).toBe(72 * 60 * 60 * 1000);
  });

  it("is greater than 0", () => {
    expect(DEFAULT_DISPUTE_WINDOW_MS).toBeGreaterThan(0);
  });
});

describe("REPUTATION_TIERS", () => {
  it("has exactly 5 tiers", () => {
    expect(REPUTATION_TIERS).toHaveLength(5);
  });

  it("starts with Unrated at index 0", () => {
    expect(REPUTATION_TIERS[0]).toBe("Unrated");
  });

  it("ends with Platinum at index 4", () => {
    expect(REPUTATION_TIERS[4]).toBe("Platinum");
  });

  it("follows ascending order: Unrated < Bronze < Silver < Gold < Platinum", () => {
    expect(REPUTATION_TIERS).toEqual(["Unrated", "Bronze", "Silver", "Gold", "Platinum"]);
  });

  it("all tier names are non-empty strings", () => {
    for (const tier of REPUTATION_TIERS) {
      expect(typeof tier).toBe("string");
      expect(tier.length).toBeGreaterThan(0);
    }
  });
});

describe("ALGORITHM_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof ALGORITHM_VERSION).toBe("string");
    expect(ALGORITHM_VERSION.length).toBeGreaterThan(0);
  });

  it("is '0.1'", () => {
    expect(ALGORITHM_VERSION).toBe("0.1");
  });
});
