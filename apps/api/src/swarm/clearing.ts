import { RuleError } from "./errors";
import type { ClearResult, Demand, Offer, Removal, TraceStep } from "./types";

export function compareId(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true });
}

// Lowest ask first; ties go to the earlier commitment, then the lower account id.
const byAsk = (a: Offer, b: Offer) => a.price - b.price || a.commitSeq - b.commitSeq || compareId(a.sellerId, b.sellerId);

// Lowest max price; ties pick the later demand.
function weakestOf(pool: Demand[]): Demand {
  return pool.reduce((w, d) => (d.maxPrice < w.maxPrice || (d.maxPrice === w.maxPrice && d.seq > w.seq) ? d : w));
}

/** The clearing algorithm from RULES.md section 5. Pure and deterministic. */
export function clearRound(demands: Demand[], offers: Offer[]): ClearResult {
  const removed: Removal[] = [];
  const trace: TraceStep[] = [];
  if (demands.length === 0) return { status: "failed", reason: "no_demand", removed, trace };
  if (offers.length === 0) return { status: "failed", reason: "no_offers", removed, trace };

  let pool = [...demands];
  while (pool.length > 0) {
    const totalHours = pool.reduce((s, d) => s + d.hours, 0);
    const eligible = offers.filter((o) => o.capacity >= totalHours).sort(byAsk);
    const step: TraceStep = { poolSize: pool.length, poolHours: totalHours, eligible: eligible.map((o) => o.sellerId) };

    if (eligible.length === 0) {
      const weakest = weakestOf(pool);
      pool = pool.filter((d) => d !== weakest);
      removed.push({ buyerId: weakest.buyerId, reason: "capacity" });
      trace.push({ ...step, removed: weakest.buyerId, why: "capacity" });
      continue;
    }

    const winner = eligible[0];
    const price = (eligible[1] ?? winner).price;
    step.winner = winner.sellerId;
    step.price = price;

    const weakest = weakestOf(pool);
    if (weakest.maxPrice < price) {
      pool = pool.filter((d) => d !== weakest);
      removed.push({ buyerId: weakest.buyerId, reason: "below_price" });
      trace.push({ ...step, removed: weakest.buyerId, why: "below_price" });
      continue;
    }

    trace.push(step);
    const payout = price * totalHours;
    if (!Number.isSafeInteger(payout)) throw new RuleError("overflow", "payout is not a safe integer");
    const allocations = [...pool]
      .sort((a, b) => a.seq - b.seq)
      .map((d) => ({ buyerId: d.buyerId, hours: d.hours, pays: price * d.hours }));
    return { status: "cleared", winner: winner.sellerId, price, totalHours, payout, allocations, removed, trace };
  }
  return { status: "failed", reason: "no_fit", removed, trace };
}
