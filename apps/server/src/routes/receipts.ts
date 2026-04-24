import { Hono } from "hono";

const receipts = new Hono();

/**
 * GET /v1/receipts
 * Returns a list of payment receipts for the authenticated provider.
 * Wave 3+ wires real persistence once the x402 payment layer is complete.
 */
receipts.get("/", (c) => {
  return c.json({
    data: [],
    page: 1,
    total: 0,
  });
});

export { receipts };
