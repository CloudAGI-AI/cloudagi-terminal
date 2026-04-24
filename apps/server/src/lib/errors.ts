export type ErrorCode =
  | "NOT_FOUND"
  | "NOT_IMPLEMENTED"
  | "PAYMENT_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export function makeError(
  code: ErrorCode,
  message: string,
  details?: unknown
): AppError {
  return { code, message, details };
}

export const Errors = {
  notFound: (resource: string): AppError =>
    makeError("NOT_FOUND", `${resource} not found`),

  notImplemented: (feature: string): AppError =>
    makeError("NOT_IMPLEMENTED", `${feature} is not yet implemented`),

  paymentRequired: (details?: unknown): AppError =>
    makeError("PAYMENT_REQUIRED", "Payment required to invoke this agent", details),

  unauthorized: (): AppError =>
    makeError("UNAUTHORIZED", "Authentication required"),

  forbidden: (): AppError =>
    makeError("FORBIDDEN", "Insufficient permissions"),

  validationError: (details: unknown): AppError =>
    makeError("VALIDATION_ERROR", "Request validation failed", details),

  internal: (message = "Unexpected server error"): AppError =>
    makeError("INTERNAL_ERROR", message),
} as const;
