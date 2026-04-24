/**
 * Global test setup for apps/server vitest suite.
 * Runs before every test file.
 */

// Ensure test environment never tries to bind a real port
process.env["NODE_ENV"] = "test";
