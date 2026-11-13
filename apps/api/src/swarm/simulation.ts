import { agentAccountId, type RoundSummary, type SimConfig } from "@ownify/shared";
import { commitmentOf } from "./commit";
import { Ledger } from "./ledger";
import { makeRng } from "./rng";
import { Round, type RoundRecord } from "./round";
import { DEFAULT_PARAMS, type EventType, type RoundParams, type SwarmEvent } from "./types";

// Scripted strategies only. No LLM calls, no network.
const BUYER_STRATEGIES = ["truthful", "shaded", "lateJoiner", "sizeShifter"] as const;
const SELLER_STRATEGIES = ["costPlus", "undercut", "highHold", "randomWalk"] as const;

export type { RoundSummary, SimConfig };

export interface SimRun {
  seed: number;
  config: SimConfig;
  params: RoundParams;
  rounds: RoundRecord[];
  events: SwarmEvent[];
  summary: RoundSummary[];
  initialBalances: Record<string, number>;
  finalBalances: Record<string, number>;
}

function summarize(r: RoundRecord): RoundSummary {
  const res = r.result;
  const base = { round: r.index, voidedDemands: r.voidedDemands.length, voidedOffers: r.voidedOffers.length, defaults: r.defaults.length };
  if (res?.status === "cleared") {
    return { ...base, status: "cleared", winner: res.winner, price: res.price, buyers: res.allocations.length, poolHours: res.totalHours, payout: res.payout };
  }
  return { ...base, status: "failed", reason: res?.reason };
}

export function runSimulation(cfg: SimConfig): SimRun {
  const rng = makeRng(cfg.seed);
  const params = DEFAULT_PARAMS;
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

  const buyers = Array.from({ length: cfg.buyers }, (_, k) => {
    const i = k + 1;
    const value = rng.int(2_500_000, 4_500_000);
    const hours = rng.int(2, 40);
    const poor = i % 7 === 0; // cannot cover its demand: exercises the balance rule
    return {
      id: agentAccountId(cfg.parent, "buyer", i),
      strategy: BUYER_STRATEGIES[k % BUYER_STRATEGIES.length],
      value,
      hours,
      balance: Math.round(hours * value * cfg.rounds * 1.5 * (poor ? 0.1 : 1)),
    };
  });

  const sellers = Array.from({ length: cfg.sellers }, (_, k) => {
    const j = k + 1;
    return {
      id: agentAccountId(cfg.parent, "seller", j),
      strategy: SELLER_STRATEGIES[k % SELLER_STRATEGIES.length],
      cost: rng.int(1_800_000, 2_800_000),
      capacity: rng.int(120, 300),
      noShow: j === 5 ? 0.2 : 0, // seller 5 sometimes fails to reveal: exercises the void rule
      walk: 0,
    };
  });

  const ledger = new Ledger(Object.fromEntries(buyers.map((b) => [b.id, b.balance])));
  const initialBalances = ledger.snapshot();
  const events: SwarmEvent[] = [];
  const rounds: RoundRecord[] = [];
  let lastWinning: number | null = null;

  for (let r = 1; r <= cfg.rounds; r++) {
    const emit = (type: EventType, data: Record<string, unknown>) => events.push({ seq: events.length + 1, round: r, type, data });
    const round = new Round({ id: `round-${r}`, index: r, params, ledger, emit });

    // Seller costs drift a little each round (think energy prices), so clearing prices move.
    if (r > 1) for (const s of sellers) s.cost = clamp(Math.round(s.cost * (1 + (rng.next() - 0.5) * 0.08)), 1_200_000, 3_500_000);

    round.startDemand();
    for (const b of buyers) {
      if (b.strategy === "lateJoiner" && r < 2) continue;
      const hours = b.strategy === "sizeShifter" ? clamp(Math.round(b.hours * (0.5 + rng.next())), 1, params.maxHours) : b.hours;
      const maxPrice = b.strategy === "shaded" ? Math.round(b.value * 0.9) : b.value;
      round.submitDemand(b.id, hours, maxPrice);
    }
    round.lockPool();
    round.startBid();

    const salts = new Map<string, { price: number; salt: string }>();
    for (const s of sellers) {
      let price: number;
      if (s.strategy === "costPlus") price = Math.round(s.cost * 1.2);
      else if (s.strategy === "undercut") price = lastWinning === null ? Math.round(s.cost * 1.3) : Math.max(Math.round(s.cost * 1.05), Math.round(lastWinning * 0.98));
      else if (s.strategy === "highHold") price = Math.round(s.cost * 1.6);
      else {
        s.walk = clamp(s.walk + (rng.next() - 0.5) * 0.1, -0.2, 0.4);
        price = Math.round(s.cost * (1.15 + s.walk));
      }
      price = clamp(price, params.minPrice, params.maxPrice);
      const salt = Math.floor(rng.next() * 2 ** 32).toString(16).padStart(8, "0") + Math.floor(rng.next() * 2 ** 32).toString(16).padStart(8, "0");
      salts.set(s.id, { price, salt });
      round.commitOffer(s.id, commitmentOf(price, s.capacity, salt));
    }

    round.startReveal();
    for (const s of sellers) {
      if (s.noShow > 0 && rng.next() < s.noShow) continue;
      const { price, salt } = salts.get(s.id)!;
      round.revealOffer(s.id, price, s.capacity, salt);
    }

    const res = round.clear();
    if (res.status === "cleared") {
      round.settle();
      lastWinning = res.price;
    }
    round.close();
    rounds.push(round.record());
  }

  return { seed: cfg.seed, config: cfg, params, rounds, events, summary: rounds.map(summarize), initialBalances, finalBalances: ledger.snapshot() };
}
