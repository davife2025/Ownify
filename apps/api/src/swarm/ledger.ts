import { RuleError } from "./errors";

export class Ledger {
  private balances = new Map<string, number>();

  constructor(initial: Record<string, number> = {}) {
    for (const [id, n] of Object.entries(initial)) this.balances.set(id, n);
  }

  balance(id: string): number {
    return this.balances.get(id) ?? 0;
  }

  transfer(from: string, to: string, amount: number): void {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new RuleError("bad_amount", `Invalid amount ${amount}`);
    if (this.balance(from) < amount) throw new RuleError("insufficient_balance", `${from} cannot pay ${amount}`);
    this.balances.set(from, this.balance(from) - amount);
    this.balances.set(to, this.balance(to) + amount);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries([...this.balances.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  }

  total(): number {
    return [...this.balances.values()].reduce((s, n) => s + n, 0);
  }
}
