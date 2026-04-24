import { Hono } from "hono";
import { Errors } from "../lib/errors.js";

const agents = new Hono();

/**
 * GET /v1/agents
 * Returns a paginated list of registered agents.
 * Wave 1+ will query the actual database.
 */
agents.get("/", (c) => {
  return c.json({
    data: [],
    page: 1,
    total: 0,
  });
});

/**
 * POST /v1/agents
 * Register a new agent.
 * Wave 2 wires real persistence + auth.
 */
agents.post("/", (c) => {
  return c.json(
    { error: Errors.notImplemented("Agent registration") },
    501
  );
});

/**
 * GET /v1/agents/:id
 * Fetch a single agent by ID.
 * Wave 1+ will query the actual database.
 */
agents.get("/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ error: Errors.notFound(`Agent ${id}`) }, 404);
});

export { agents };
