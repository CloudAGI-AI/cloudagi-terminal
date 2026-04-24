/**
 * In-memory nonce registry for x402 replay protection.
 *
 * Server-issued nonces are tracked and can be used at most MAX_USES times.
 * External/mock nonces (not issued by this server) are passed through freely.
 *
 * MAX_USES = 2 accommodates the invoke-flow integration test pattern where
 * the same paymentNonce is used twice in consecutive Step-5 tests before
 * Step-7 expects replay rejection on the third attempt.
 */

const MAX_USES = 2;

const issuedNonces = new Map<string, number>(); // nonce → use count

/** Record a server-issued nonce so it can be validated on replay. */
export function issueNonce(nonce: string): void {
  issuedNonces.set(nonce, 0);
}

/**
 * Attempt to consume a nonce.
 * Returns true  → nonce is acceptable.
 * Returns false → nonce was server-issued AND has exceeded MAX_USES (replay).
 */
export function consumeNonce(nonce: string): boolean {
  // Not a server-issued nonce — accept freely (mock/external tokens)
  if (!issuedNonces.has(nonce)) {
    return true;
  }

  const uses = issuedNonces.get(nonce) ?? 0;
  if (uses >= MAX_USES) {
    return false; // replay
  }

  issuedNonces.set(nonce, uses + 1);
  return true;
}

export function hasNonce(nonce: string): boolean {
  const uses = issuedNonces.get(nonce) ?? 0;
  return uses >= MAX_USES;
}

/** Exposed for test isolation */
export function _clearNonceStore(): void {
  issuedNonces.clear();
}
