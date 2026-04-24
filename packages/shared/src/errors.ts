/**
 * Typed error classes for @cloudagi/shared.
 * Each error carries a machine-readable `code` field for programmatic handling.
 */

/** Base error type with a stable code identifier. */
export abstract class CloudAGIError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a zod schema parse or manual validation fails.
 * Includes optional `field` to indicate which field failed.
 */
export class ValidationError extends CloudAGIError {
  readonly code = "VALIDATION_ERROR" as const;

  constructor(
    message: string,
    public readonly field?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Thrown when a payment operation fails — e.g. insufficient budget,
 * authorization signature mismatch, or stablecoin transfer rejection.
 */
export class PaymentError extends CloudAGIError {
  readonly code = "PAYMENT_ERROR" as const;

  constructor(
    message: string,
    public readonly invocationId?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Thrown when receipt minting or verification fails — e.g. hash mismatch,
 * cNFT asset not found, or settlement sig invalid.
 */
export class ReceiptError extends CloudAGIError {
  readonly code = "RECEIPT_ERROR" as const;

  constructor(
    message: string,
    public readonly receiptId?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Thrown when an agent cannot be found in the registry — e.g. unknown id,
 * deactivated agent, or endpoint unreachable.
 */
export class AgentNotFoundError extends CloudAGIError {
  readonly code = "AGENT_NOT_FOUND" as const;

  constructor(
    message: string,
    public readonly agentId?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
