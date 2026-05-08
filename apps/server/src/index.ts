import { app } from "./app.js";
import { env } from "./lib/env.js";

const port = env.PORT;

console.log(`cloudagi-server starting on port ${port} (${env.NODE_ENV})`);

export default {
  port,
  fetch: app.fetch,
};
