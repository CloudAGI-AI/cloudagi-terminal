import { Hono } from "hono";
import { z } from "zod";
import { Errors } from "../lib/errors.js";
import { type ListReceiptsOptions, getReceipt, listReceipts } from "../store/receipts.js";

const receipts = new Hono();

const ListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 20))
    .pipe(z.number().int().positive()),
  buyer: z.string().optional(),
  seller: z.string().optional(),
  agentId: z.string().optional(),
});

/**
 * GET /v1/receipts
 * Paginated list with optional filters: buyer, seller, agentId.
 * Sorted descending by mintedAt.
 */
receipts.get("/", (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = ListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: Errors.validationError(parsed.error.flatten()) }, 400);
  }

  const { page, limit, buyer, seller, agentId } = parsed.data;
  const listOpts: ListReceiptsOptions = { page, limit };
  if (buyer !== undefined) listOpts.buyer = buyer;
  if (seller !== undefined) listOpts.seller = seller;
  if (agentId !== undefined) listOpts.agentId = agentId;
  const result = listReceipts(listOpts);

  return c.json({
    data: result.data,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

/**
 * GET /v1/receipts/:id
 * Fetch individual receipt detail.
 */
receipts.get("/:id", (c) => {
  const id = c.req.param("id");

  const receipt = getReceipt(id);
  if (receipt === undefined) {
    return c.json({ error: Errors.notFound(`Receipt ${id}`) }, 404);
  }

  return c.json(receipt);
});

export { receipts };
