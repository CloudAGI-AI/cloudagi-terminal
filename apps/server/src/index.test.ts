import { describe, it, expect } from "vitest";
import { app } from "./app.js";

describe("GET /health", () => {
  it("returns HTTP 200 with status ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);

    const body: unknown = await res.json();
    expect(body).toMatchObject({ status: "ok" });
  });
});
