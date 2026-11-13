import { createHash } from "node:crypto";

/** Commitment = sha256 hex of the UTF-8 string `price|capacity|salt` (RULES.md section 4). */
export function commitmentOf(price: number, capacity: number, salt: string): string {
  return createHash("sha256").update(`${price}|${capacity}|${salt}`).digest("hex");
}
