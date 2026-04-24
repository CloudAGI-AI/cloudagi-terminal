import { logger } from "hono/logger";

/**
 * Request logger middleware using Hono's built-in logger.
 * Emits one line per request: method, path, status, and elapsed ms.
 *
 * Usage: app.use("*", requestLogger());
 */
export const requestLogger = logger;
