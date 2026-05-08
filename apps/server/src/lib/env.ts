import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  SOLANA_CLUSTER: z.enum(["mainnet-beta", "testnet", "devnet"]).default("devnet"),
  SOLANA_NETWORK: z.enum(["mainnet-beta", "devnet"]).default("devnet"),
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
  USDC_MINT: z.string().min(1).default("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  FACILITATOR_URL: z.string().url().default("https://facilitator.payai.network"),
  FACILITATOR_KEY: z.string().min(1).optional(),
  FACILITATOR_KEY_ID: z.string().min(1).optional(),
  FACILITATOR_KEY_SECRET: z.string().min(1).optional(),
  X402_SOLANA_MODE: z.enum(["mock", "real"]).default("mock"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
