import { Hono } from "hono";
import { z } from "zod";
import { Errors } from "../lib/errors.js";
import { type ListReceiptsOptions, listReceipts } from "../store/receipts.js";

const feed = new Hono();

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
  agentId: z.string().optional(),
});

feed.get("/receipts", (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = ListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: Errors.validationError(parsed.error.flatten()) }, 400);
  }

  const { page, limit, agentId } = parsed.data;
  const listOpts: ListReceiptsOptions = { page, limit };
  if (agentId !== undefined) listOpts.agentId = agentId;
  const result = listReceipts(listOpts);

  return c.json({
    data: result.data.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      timestamp: r.mintedAt,
      settlementAmount: r.settlementAmount,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      verifyUrl: r.verifyUrl,
      promptHash: r.promptHash,
      outputHash: r.outputHash,
    })),
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

export { feed };
