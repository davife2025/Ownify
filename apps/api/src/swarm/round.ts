import { clearRound } from "./clearing";
import { commitmentOf } from "./commit";
import { RuleError } from "./errors";
import type { Ledger } from "./ledger";
import type { ClearResult, Demand, Emit, Offer, RoundParams } from "./types";

export const PHASES = ["open", "demand", "locked", "bid", "reveal", "cleared", "settled", "closed"] as const;
export type Phase = (typeof PHASES)[number];

export interface Settlement { from: string; to: string; amount: number }
export interface RoundRecord {
  id: string;
  index: number;
  params: RoundParams;
  phase: Phase;
  demands: Demand[];
  voidedDemands: { buyerId: string; reason: string }[];
  offers: Offer[];
  voidedOffers: { sellerId: string; reason: string }[];
  result: ClearResult | null;
  settlements: Settlement[];
  defaults: string[];
}

export interface RoundDeps { id: string; index: number; params: RoundParams; ledger: Ledger; emit: Emit }

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n);

export class Round {
  phase: Phase = "open";
  private demands = new Map<string, Demand>();
  private pool: Demand[] = [];
  private voidedDemands: { buyerId: string; reason: string }[] = [];
  private commitments = new Map<string, { hash: string; commitSeq: number }>();
  private offers = new Map<string, Offer>();
  private voidedOffers: { sellerId: string; reason: string }[] = [];
  private result: ClearResult | null = null;
  private settlements: Settlement[] = [];
  private defaults: string[] = [];
  private seq = 0;

  constructor(private d: RoundDeps) {
    d.emit("roundOpened", { id: d.id, gpuClass: d.params.gpuClass });
  }

  private reached(p: Phase) { return PHASES.indexOf(this.phase) >= PHASES.indexOf(p); }
  private need(p: Phase) {
    if (this.phase !== p) throw new RuleError("wrong_phase", `Round is in phase "${this.phase}", needs "${p}"`);
  }
  private go(p: Phase) { this.phase = p; }

  startDemand() { this.need("open"); this.go("demand"); }

  submitDemand(buyerId: string, hours: number, maxPrice: number) {
    this.need("demand");
    const { minHours, maxHours, minPrice, maxPrice: ceil } = this.d.params;
    if (!isInt(hours) || hours < minHours || hours > maxHours) throw new RuleError("bad_hours", `hours must be an integer from ${minHours} to ${maxHours}`);
    if (!isInt(maxPrice) || maxPrice < minPrice || maxPrice > ceil) throw new RuleError("bad_price", `max price must be an integer from ${minPrice} to ${ceil}`);
    if (this.demands.has(buyerId)) throw new RuleError("duplicate_demand", `${buyerId} already submitted a demand`);
    this.demands.set(buyerId, { buyerId, hours, maxPrice, seq: ++this.seq });
    this.d.emit("demandSubmitted", { buyerId, hours }); // max price stays private until Clear
  }

  /** Closes demand. A buyer who cannot cover hours x max price is voided. */
  lockPool() {
    this.need("demand");
    for (const dm of this.demands.values()) {
      if (this.d.ledger.balance(dm.buyerId) >= dm.hours * dm.maxPrice) this.pool.push(dm);
      else {
        this.voidedDemands.push({ buyerId: dm.buyerId, reason: "insufficient_balance" });
        this.d.emit("demandVoided", { buyerId: dm.buyerId, reason: "insufficient_balance" });
      }
    }
    this.go("locked");
    this.d.emit("poolLocked", { buyers: this.pool.length, totalHours: this.poolHours() });
  }

  private poolHours() { return this.pool.reduce((s, d) => s + d.hours, 0); }

  startBid() { this.need("locked"); this.go("bid"); }

  commitOffer(sellerId: string, hash: string) {
    this.need("bid");
    if (!/^[0-9a-f]{64}$/.test(hash)) throw new RuleError("bad_commitment", "commitment must be 64 lowercase hex characters");
    if (this.commitments.has(sellerId)) throw new RuleError("duplicate_commitment", `${sellerId} already committed`);
    this.commitments.set(sellerId, { hash, commitSeq: ++this.seq });
    this.d.emit("bidCommitted", { sellerId });
  }

  startReveal() {
    this.need("bid");
    this.go("reveal");
    this.d.emit("revealOpened", { commitments: this.commitments.size });
  }

  revealOffer(sellerId: string, price: number, capacity: number, salt: string) {
    this.need("reveal");
    const c = this.commitments.get(sellerId);
    if (!c) throw new RuleError("no_commitment", `${sellerId} has no commitment`);
    if (this.offers.has(sellerId) || this.voidedOffers.some((v) => v.sellerId === sellerId)) {
      throw new RuleError("already_revealed", `${sellerId} already revealed`);
    }
    const { minPrice, maxPrice } = this.d.params;
    const void_ = (reason: string) => {
      this.voidedOffers.push({ sellerId, reason });
      this.d.emit("offerVoided", { sellerId, reason });
    };
    if (commitmentOf(price, capacity, salt) !== c.hash) return void_("hash_mismatch");
    if (!isInt(price) || price < minPrice || price > maxPrice || !isInt(capacity) || capacity < 1) return void_("out_of_range");
    this.offers.set(sellerId, { sellerId, price, capacity, commitSeq: c.commitSeq });
    this.d.emit("offerRevealed", { sellerId, price, capacity });
  }

  clear(): ClearResult {
    this.need("reveal");
    for (const sellerId of this.commitments.keys()) {
      if (!this.offers.has(sellerId) && !this.voidedOffers.some((v) => v.sellerId === sellerId)) {
        this.voidedOffers.push({ sellerId, reason: "no_reveal" });
        this.d.emit("offerVoided", { sellerId, reason: "no_reveal" });
      }
    }
    const res = clearRound(this.pool, [...this.offers.values()]);
    this.result = res;
    this.go("cleared");
    if (res.status === "cleared") {
      this.d.emit("roundCleared", { winner: res.winner, price: res.price, totalHours: res.totalHours, payout: res.payout, allocations: res.allocations });
    } else {
      this.d.emit("roundFailed", { reason: res.reason });
    }
    return res;
  }

  /** Ledger settlement (simulation). A buyer who cannot pay is flagged; the others still pay the same price. */
  settle() {
    this.need("cleared");
    const res = this.result;
    if (!res || res.status !== "cleared") throw new RuleError("nothing_to_settle", "The round did not clear");
    for (const a of res.allocations) {
      try {
        this.d.ledger.transfer(a.buyerId, res.winner, a.pays);
        this.settlements.push({ from: a.buyerId, to: res.winner, amount: a.pays });
        this.d.emit("settlementRecorded", { from: a.buyerId, to: res.winner, amount: a.pays });
      } catch (e) {
        if (!(e instanceof RuleError)) throw e;
        this.defaults.push(a.buyerId);
        this.d.emit("buyerDefaulted", { buyerId: a.buyerId, owed: a.pays });
      }
    }
    this.go("settled");
  }

  close() {
    if (this.phase !== "settled" && !(this.phase === "cleared" && this.result?.status === "failed")) {
      throw new RuleError("wrong_phase", `Cannot close a round in phase "${this.phase}"`);
    }
    this.go("closed");
    this.d.emit("roundClosed", { id: this.d.id });
  }

  /** What the live page may show right now. Max prices and unrevealed offers stay hidden. */
  publicView() {
    const cleared = this.reached("cleared");
    return {
      id: this.d.id,
      index: this.d.index,
      phase: this.phase,
      gpuClass: this.d.params.gpuClass,
      demandCount: this.demands.size,
      poolHours: this.reached("locked") ? this.poolHours() : null,
      commitments: this.commitments.size,
      offers: this.reached("reveal") ? [...this.offers.values()].map(({ sellerId, price, capacity }) => ({ sellerId, price, capacity })) : null,
      demands: cleared ? this.pool.map(({ buyerId, hours, maxPrice }) => ({ buyerId, hours, maxPrice })) : null,
      result: cleared ? this.result : null,
    };
  }

  record(): RoundRecord {
    return {
      id: this.d.id,
      index: this.d.index,
      params: this.d.params,
      phase: this.phase,
      demands: this.pool,
      voidedDemands: this.voidedDemands,
      offers: [...this.offers.values()],
      voidedOffers: this.voidedOffers,
      result: this.result,
      settlements: this.settlements,
      defaults: this.defaults,
    };
  }
}
