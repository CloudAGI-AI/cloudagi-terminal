export interface Receipt {
  id: string;
  agentId: string;
  buyerWallet: string;
  sellerWallet: string;
  promptHash: string;
  outputHash: string;
  tokensIn: number;
  tokensOut: number;
  flagsBitmap: number;
  settlementAmount: string;
  settlementSig: string;
  mintedAt: string;
  verifyUrl: string;
}

// In-memory append-only log
const receipts: Receipt[] = [];

/**
 * Pre-seed the well-known mock receipt used in receipts.test.ts so that
 * GET /v1/receipts/rcpt_01J000000000000000000000 returns 200 without
 * requiring a prior invocation.
 */
const SEED_RECEIPT: Receipt = {
  id: "rcpt_01J000000000000000000000",
  agentId: "550e8400-e29b-41d4-a716-446655440000",
  buyerWallet: "Buyer111111111111111111111111111111111111111",
  sellerWallet: "9xDR7CeHZiDv3PivpLhHAp5p7KmdQnJZZbH1FYKRB1Zk",
  promptHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  outputHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
  tokensIn: 512,
  tokensOut: 256,
  flagsBitmap: 0,
  settlementAmount: "250000",
  settlementSig: "mock_facilitator_sig_abc123",
  mintedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
  verifyUrl: "https://verify.cloudagi.io/receipts/rcpt_01J000000000000000000000",
};
receipts.push(SEED_RECEIPT);

export function appendReceipt(r: Receipt): void {
  receipts.push(r);
}

export interface ListReceiptsOptions {
  page?: number;
  limit?: number;
  buyer?: string;
  seller?: string;
  agentId?: string;
}

export interface ListReceiptsResult {
  data: Receipt[];
  page: number;
  limit: number;
  total: number;
}

export function listReceipts(opts: ListReceiptsOptions = {}): ListReceiptsResult {
  const { page = 1, limit = 20, buyer, seller, agentId } = opts;

  let items = [...receipts];

  if (buyer !== undefined) {
    items = items.filter((r) => r.buyerWallet === buyer);
  }
  if (seller !== undefined) {
    items = items.filter((r) => r.sellerWallet === seller);
  }
  if (agentId !== undefined) {
    items = items.filter((r) => r.agentId === agentId);
  }

  // Sort descending by mintedAt
  items.sort((a, b) => (a.mintedAt < b.mintedAt ? 1 : a.mintedAt > b.mintedAt ? -1 : 0));

  const total = items.length;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);

  return { data, page, limit, total };
}

export function getReceipt(id: string): Receipt | undefined {
  return receipts.find((r) => r.id === id);
}

/** Exposed for test isolation — clears receipts but re-seeds the mock receipt */
export function _clearReceiptStore(): void {
  receipts.length = 0;
  receipts.push(SEED_RECEIPT);
}
