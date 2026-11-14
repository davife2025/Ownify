import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TaskReceipt } from "@ownify/shared";

export interface ReceiptStore {
  add(r: TaskReceipt): void;
  get(id: string): TaskReceipt | null;
  list(limit: number): TaskReceipt[];
}

const CAP = 200;

export class MemoryReceiptStore implements ReceiptStore {
  protected items: TaskReceipt[] = [];
  add(r: TaskReceipt) {
    this.items.push(r);
    if (this.items.length > CAP) this.items.splice(0, this.items.length - CAP);
  }
  get(id: string) { return this.items.find((r) => r.id === id) ?? null; }
  list(limit: number) { return this.items.slice(-limit).reverse(); }
}

/** Keeps the latest 200 receipts in a JSON file. Receipts hold no question or answer text. */
export class FileReceiptStore extends MemoryReceiptStore {
  constructor(private path: string) {
    super();
    if (existsSync(path)) this.items = JSON.parse(readFileSync(path, "utf8")) as TaskReceipt[];
  }
  override add(r: TaskReceipt) {
    super.add(r);
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.items, null, 2) + "\n");
  }
}
