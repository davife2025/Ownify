import "dotenv/config";
import { z } from "zod";

// Empty strings from a copied .env.example count as "not set".
const blank = (v: unknown) => (v === "" ? undefined : v);
const optStr = z.preprocess(blank, z.string().optional());

const schema = z.object({
  PORT: z.preprocess(blank, z.coerce.number().default(4000)),
  SUPABASE_URL: z.preprocess(blank, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: optStr,

  PROVISION_MODE: z.preprocess(blank, z.enum(["simulated", "testnet"]).default("simulated")),
  NEAR_PARENT_ACCOUNT_ID: z.preprocess(blank, z.string().default("swarm.testnet")),
  NEAR_PARENT_PRIVATE_KEY: optStr,
  NEAR_RPC_URL: z.preprocess(blank, z.string().url().default("https://rpc.testnet.near.org")),
  AGENT_ACCOUNT_FUNDING_NEAR: z.preprocess(blank, z.string().default("0.05")),
  AGENT_KEYS_DIR: z.preprocess(blank, z.string().default(".near-credentials")),

  SETTLEMENT_ASSET_ID: optStr,
  SETTLEMENT_ASSET_DECIMALS: z.preprocess(blank, z.coerce.number().int().min(2).max(24).default(6)),
  AGENT_DAILY_USD_BUDGET: z.preprocess(blank, z.string().regex(/^\d+(\.\d{1,2})?$/).default("5.00")),
  SELLER_PAYOUT_CHAIN: optStr,
  SELLER_PAYOUT_ADDRESS: optStr,
});

export const env = schema.parse(process.env);
