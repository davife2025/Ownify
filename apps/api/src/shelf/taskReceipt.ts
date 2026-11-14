import { createHash } from "node:crypto";
import type { TaskReceipt } from "@ownify/shared";
import { canonicalJson } from "./receipt";

export type ReceiptBody = Omit<TaskReceipt, "id" | "receiptHash">;

export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

/** The id and hash are derived from everything else, so any edit to a receipt is detectable. */
export function buildReceipt(body: ReceiptBody): TaskReceipt {
  const receiptHash = sha256(canonicalJson(body));
  return { ...body, id: receiptHash.slice(0, 16), receiptHash };
}

export function receiptMatches(r: TaskReceipt): boolean {
  const { id, receiptHash, ...body } = r;
  return receiptHash === sha256(canonicalJson(body)) && id === receiptHash.slice(0, 16);
}
