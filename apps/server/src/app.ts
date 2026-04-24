import { Hono } from "hono";
import { requestLogger } from "./middleware/logging.js";
import { agents } from "./routes/agents.js";
import { invoke } from "./routes/invoke.js";
import { receipts } from "./routes/receipts.js";

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use("*", requestLogger());

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (c) => {
  return c.json({
    name: "cloudagi-server",
    version: "0.0.0",
    status: "ok",
  });
});

// ── Health ────────────────────────────────────────────────────────────────────
const SERVER_START = Date.now();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    uptimeMs: Date.now() - SERVER_START,
  });
});

// ── v1 routes ─────────────────────────────────────────────────────────────────
app.route("/v1/agents", agents);
app.route("/v1/agents", invoke);   // mounts /:id/invoke under /v1/agents
app.route("/v1/receipts", receipts);

// ── WebSocket placeholder ─────────────────────────────────────────────────────
// TODO (Wave 4): Wire WebSocket streaming for /v1/sessions/:id/stream
// Use Hono's upgradeWebSocket helper (hono/ws) or Bun's native WebSocket API.
// Example shape:
//   app.get("/v1/sessions/:id/stream", upgradeWebSocket((c) => ({
//     onMessage(evt, ws) { ... },
//     onClose() { ... },
//   })));

export { app };
