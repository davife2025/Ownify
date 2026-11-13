import { createHash } from "node:crypto";
import type { AgentDomain, TierId } from "@ownify/shared";

export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, val]) => `${JSON.stringify(k)}:${canonicalJson(val)}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** What ran, in one record: the agent prompt, the model, the questions asked and how each scored. */
export interface ReceiptInput {
  v: 1;
  agent: AgentDomain;
  tier: TierId;
  provider: string;
  model: string;
  promptHash: string;
  seed: number;
  cases: { id: string; score: number }[];
  score: number;
  scoredAt: string;
}

export const receiptOf = (i: ReceiptInput): string => createHash("sha256").update(canonicalJson(i)).digest("hex");
