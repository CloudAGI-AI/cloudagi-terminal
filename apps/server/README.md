# @cloudagi/server

Hono 4.x API server for the CloudAGI agent marketplace. Handles agent registration, discovery, invocation routing, and payment-receipt tracking. Runs on Bun.

## Run locally

```bash
bun dev
```

Server listens on `PORT` (default `3001`). Copy `.env.example` to `.env` and edit as needed.

## Endpoints

| Method | Path                      | Status       | Description                              |
|--------|---------------------------|--------------|------------------------------------------|
| GET    | `/`                       | 200          | Service name, version, and status        |
| GET    | `/health`                 | 200          | Liveness check with server uptime        |
| GET    | `/v1/agents`              | 200          | Paginated agent list (placeholder)       |
| POST   | `/v1/agents`              | 501          | Register agent (Wave 2)                  |
| GET    | `/v1/agents/:id`          | 404          | Fetch single agent (Wave 1)              |
| POST   | `/v1/agents/:id/invoke`   | 402          | Invoke agent — stub x402 challenge       |
| GET    | `/v1/receipts`            | 200          | Payment receipts list (placeholder)      |
| WS     | `/v1/sessions/:id/stream` | —            | Streaming session (Wave 4, not yet wired)|
