import { z } from "zod";

// Shape follows the NEAR Intents Agent API "Policies & Limits" page. It has not been
// checked against the live API yet: do that before the first real owner signature.

const usd = z.string().regex(/^\d+(\.\d{1,2})?$/).nullable();
const atomic = z.string().regex(/^\d+$/);
const perAsset = z.record(z.string(), atomic);

const withdrawDestination = z.object({
  action: z.literal("withdraw"),
  chain: z.string().min(1),
  address: z.string().min(1),
  memo: z.string().nullable(),
});
const transferDestination = z.object({
  action: z.literal("transfer"),
  address: z.string().min(1),
  confidential: z.literal(true),
});

export const agentPolicySchema = z
  .object({
    frozen: z.boolean(),
    actions: z.array(z.enum(["swap", "transfer", "withdraw", "limit_order"])),
    confidential: z.literal(true),
    owner_approval: z.boolean(),
    assets: z.union([z.literal("any"), z.array(z.string().min(1)).min(1).max(128)]),
    limits: z.object({
      per_transaction: perAsset.optional(),
      hourly: perAsset.optional(),
      daily: perAsset.optional(),
      monthly: perAsset.optional(),
    }),
    max_actions_per_hour: z.number().int().positive().nullable(),
    destinations: z.object({
      mode: z.enum(["only", "except", "any"]),
      list: z.array(z.union([withdrawDestination, transferDestination])).max(256),
    }),
    budget: z.object({ daily_usd: usd, weekly_usd: usd, monthly_usd: usd }),
    timelock_ms: z.number().int().min(0).max(2_592_000_000),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.destinations.mode === "any" && p.destinations.list.length > 0) {
      ctx.addIssue({ code: "custom", message: 'destinations.mode "any" needs an empty list' });
    }
  });

export type AgentPolicy = z.infer<typeof agentPolicySchema>;

/** "5.00" USD at 6 decimals -> "5000000". Assumes the settlement asset is a USD stablecoin. */
export function usdToAtomic(usdAmount: string, decimals: number): string {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(usdAmount);
  if (!m || decimals < 2) throw new Error(`Invalid USD amount or decimals: ${usdAmount}, ${decimals}`);
  const cents = BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0"));
  return (cents * 10n ** BigInt(decimals - 2)).toString();
}

export interface PolicyCaps {
  assetId: string;
  decimals: number;
  dailyUsd: string;
}

function caps(c: PolicyCaps) {
  const cap = usdToAtomic(c.dailyUsd, c.decimals);
  return {
    limits: { per_transaction: { [c.assetId]: cap }, daily: { [c.assetId]: cap } },
    budget: { daily_usd: c.dailyUsd, weekly_usd: null, monthly_usd: null },
  };
}

const common = { frozen: false, confidential: true as const, owner_approval: false, timelock_ms: 0 };

/** A buyer can only send its share to the listed sellers, within a small daily cap. */
export function buildBuyerPolicy(c: PolicyCaps & { sellerAddresses: string[] }): AgentPolicy {
  if (c.sellerAddresses.length === 0) throw new Error("A buyer policy needs at least one seller address");
  return agentPolicySchema.parse({
    ...common,
    actions: ["transfer"],
    assets: [c.assetId],
    ...caps(c),
    max_actions_per_hour: 10,
    destinations: {
      mode: "only",
      list: c.sellerAddresses.map((address) => ({ action: "transfer", address, confidential: true })),
    },
  });
}

/** A seller can only withdraw to its own payout address, within a small daily cap. */
export function buildSellerPolicy(
  c: PolicyCaps & { payout: { chain: string; address: string } },
): AgentPolicy {
  return agentPolicySchema.parse({
    ...common,
    actions: ["withdraw"],
    assets: [c.assetId],
    ...caps(c),
    max_actions_per_hour: 10,
    destinations: {
      mode: "only",
      list: [{ action: "withdraw", chain: c.payout.chain, address: c.payout.address, memo: null }],
    },
  });
}
