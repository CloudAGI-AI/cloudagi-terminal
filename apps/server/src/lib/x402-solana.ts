import {
  type PaymentRequired,
  type PaymentRequirements,
  type SettleResponse,
  type VerifyResponse,
  X402PaymentHandler,
  type X402ServerConfig,
} from "x402-solana/server";
import { env } from "./env.js";

type X402SolanaNetwork = "solana" | "solana-devnet";

export interface SolanaX402PaymentContext {
  requirements: PaymentRequirements;
  response: {
    status: 402;
    body: PaymentRequired;
  };
}

export interface SolanaX402RouteConfig {
  amount: string;
  treasuryAddress: string;
  resourceUrl: string;
  description: string;
}

function x402Network(): X402SolanaNetwork {
  return env.SOLANA_NETWORK === "mainnet-beta" ? "solana" : "solana-devnet";
}

function facilitatorApiKeySecret(): string | undefined {
  return env.FACILITATOR_KEY_SECRET ?? env.FACILITATOR_KEY;
}

function createHandler(treasuryAddress: string): X402PaymentHandler {
  const config: X402ServerConfig = {
    network: x402Network(),
    treasuryAddress,
    facilitatorUrl: env.FACILITATOR_URL,
    rpcUrl: env.SOLANA_RPC_URL,
    defaultToken: {
      address: env.USDC_MINT,
      decimals: 6,
    },
    defaultDescription: "CloudAGI agent invocation",
  };

  const apiKeySecret = facilitatorApiKeySecret();
  if (env.FACILITATOR_KEY_ID !== undefined && apiKeySecret !== undefined) {
    config.apiKeyId = env.FACILITATOR_KEY_ID;
    config.apiKeySecret = apiKeySecret;
  }

  return new X402PaymentHandler(config);
}

export function isRealX402SolanaEnabled(): boolean {
  return env.X402_SOLANA_MODE === "real";
}

export async function createSolanaX402PaymentContext(
  routeConfig: SolanaX402RouteConfig,
): Promise<SolanaX402PaymentContext> {
  const handler = createHandler(routeConfig.treasuryAddress);
  const requirements = await handler.createPaymentRequirements(
    {
      amount: routeConfig.amount,
      asset: {
        address: env.USDC_MINT,
        decimals: 6,
      },
      description: routeConfig.description,
      mimeType: "text/event-stream",
    },
    routeConfig.resourceUrl,
  );

  return {
    requirements,
    response: handler.create402Response(requirements, routeConfig.resourceUrl),
  };
}

export async function verifySolanaX402Payment(
  paymentHeader: string,
  requirements: PaymentRequirements,
  treasuryAddress: string,
): Promise<VerifyResponse> {
  const handler = createHandler(treasuryAddress);
  return handler.verifyPayment(paymentHeader, requirements);
}

export async function settleSolanaX402Payment(
  paymentHeader: string,
  requirements: PaymentRequirements,
  treasuryAddress: string,
): Promise<SettleResponse> {
  const handler = createHandler(treasuryAddress);
  return handler.settlePayment(paymentHeader, requirements);
}
