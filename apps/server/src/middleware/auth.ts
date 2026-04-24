import type { Context, Next } from "hono";

// TODO (Wave 2): Implement JWT / API-key auth middleware.
// Verify bearer token against the provider registry and attach
// the resolved identity to c.var.

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  // Placeholder — passes through unconditionally until Wave 2.
  await next();
}
