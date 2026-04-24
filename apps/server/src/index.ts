import { env } from "./lib/env.js";
import { app } from "./app.js";

const port = env.PORT;

console.log(`cloudagi-server starting on port ${port} (${env.NODE_ENV})`);

export default {
  port,
  fetch: app.fetch,
};
