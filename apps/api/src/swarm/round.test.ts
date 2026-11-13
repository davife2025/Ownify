import test from "node:test";
import assert from "node:assert/strict";
import { commitmentOf } from "./commit";
import { RuleError } from "./errors";
import { Ledger } from "./ledger";
import { Round } from "./round";
import { DEFAULT_PARAMS, type SwarmEvent } from "./types";

function setup(balances: Record<string, number>) {
  const ledger = new Ledger(balances);
  const events: SwarmEvent[] = [];
  const round = new Round({
    id: "round-1", index: 1, params: DEFAULT_PARAMS, ledger,
    emit: (type, data) => events.push({ seq: events.length + 1, round: 1, type, data }),
  });
  return { ledger, events, round };
}
const P = 1_000_000;

test("full round: settles by the rules and conserves money", () => {
  const { ledger, events, round } = setup({ b1: 100 * P, b2: 100 * P });
  const before = ledger.total();
  round.startDemand();
  round.submitDemand("b1", 10, 5 * P);
  round.submitDemand("b2", 10, 4 * P);
  round.lockPool();
  round.startBid();
  round.commitOffer("sA", commitmentOf(2 * P, 50, "saltsaltA"));
  round.commitOffer("sB", commitmentOf(3 * P, 50, "saltsaltB"));
  round.startReveal();
  round.revealOffer("sA", 2 * P, 50, "saltsaltA");
  round.revealOffer("sB", 3 * P, 50, "saltsaltB");
  const res = round.clear();
  assert.equal(res.status, "cleared");
  round.settle();
  round.close();
  if (res.status !== "cleared") return;
  assert.equal(res.winner, "sA");
  assert.equal(res.price, 3 * P);
  assert.equal(ledger.balance("sA"), 60 * P);
  assert.equal(ledger.balance("b1"), 70 * P);
  assert.equal(ledger.total(), before);
  assert.equal(round.phase, "closed");
  assert.equal(events[0].type, "roundOpened");
  assert.equal(events[events.length - 1].type, "roundClosed");
});

test("max prices and unrevealed offers stay hidden until the rules allow", () => {
  const { round } = setup({ b1: 100 * P });
  round.startDemand();
  round.submitDemand("b1", 10, 5 * P);
  assert.equal(JSON.stringify(round.publicView()).includes(String(5 * P)), false);
  round.lockPool();
  round.startBid();
  round.commitOffer("sA", commitmentOf(2 * P, 50, "saltsaltA"));
  assert.equal(round.publicView().offers, null);
  assert.equal(round.publicView().poolHours, 10);
  round.startReveal();
  round.revealOffer("sA", 2 * P, 50, "saltsaltA");
  assert.equal(round.publicView().demands, null);
  round.clear();
  assert.equal(round.publicView().demands?.[0].maxPrice, 5 * P);
});

test("enforces phase order and one demand per buyer", () => {
  const { round } = setup({ b1: 100 * P });
  assert.throws(() => round.submitDemand("b1", 1, P), (e) => e instanceof RuleError && e.code === "wrong_phase");
  round.startDemand();
  round.submitDemand("b1", 1, P);
  assert.throws(() => round.submitDemand("b1", 2, P), (e) => e instanceof RuleError && e.code === "duplicate_demand");
  assert.throws(() => round.submitDemand("b2", 0, P), (e) => e instanceof RuleError && e.code === "bad_hours");
  assert.throws(() => round.commitOffer("sA", "00"), (e) => e instanceof RuleError);
});

test("a buyer who cannot cover hours x max price is voided at lock", () => {
  const { round } = setup({ rich: 100 * P, poor: 1 });
  round.startDemand();
  round.submitDemand("rich", 10, 5 * P);
  round.submitDemand("poor", 10, 5 * P);
  round.lockPool();
  assert.deepEqual(round.record().voidedDemands, [{ buyerId: "poor", reason: "insufficient_balance" }]);
  assert.equal(round.publicView().poolHours, 10);
});

test("mismatched and missing reveals are void", () => {
  const { round } = setup({ b1: 100 * P });
  round.startDemand();
  round.submitDemand("b1", 10, 5 * P);
  round.lockPool();
  round.startBid();
  round.commitOffer("liar", commitmentOf(2 * P, 50, "saltsaltL"));
  round.commitOffer("ghost", commitmentOf(2 * P, 50, "saltsaltG"));
  round.commitOffer("honest", commitmentOf(3 * P, 50, "saltsaltH"));
  round.startReveal();
  round.revealOffer("liar", 1 * P, 50, "saltsaltL"); // not what was committed
  round.revealOffer("honest", 3 * P, 50, "saltsaltH");
  round.clear();
  const voided = round.record().voidedOffers;
  assert.deepEqual(voided.find((v) => v.sellerId === "liar")?.reason, "hash_mismatch");
  assert.deepEqual(voided.find((v) => v.sellerId === "ghost")?.reason, "no_reveal");
  const res = round.record().result;
  assert.equal(res?.status === "cleared" && res.winner, "honest");
});

test("a buyer who cannot pay at settlement is flagged; the others still pay", () => {
  const { ledger, round } = setup({ b1: 100 * P, b2: 100 * P });
  round.startDemand();
  round.submitDemand("b1", 10, 5 * P);
  round.submitDemand("b2", 10, 5 * P);
  round.lockPool();
  round.startBid();
  round.commitOffer("sA", commitmentOf(2 * P, 50, "saltsaltA"));
  round.startReveal();
  round.revealOffer("sA", 2 * P, 50, "saltsaltA");
  round.clear();
  ledger.transfer("b1", "elsewhere", 100 * P); // b1 spends its money after the lock
  round.settle();
  const rec = round.record();
  assert.deepEqual(rec.defaults, ["b1"]);
  assert.equal(rec.settlements.length, 1);
  assert.equal(ledger.balance("sA"), 20 * P);
});

test("a failed round closes without settling", () => {
  const { round } = setup({});
  round.startDemand();
  round.lockPool();
  round.startBid();
  round.startReveal();
  assert.equal(round.clear().status, "failed");
  assert.throws(() => round.settle());
  round.close();
  assert.equal(round.phase, "closed");
});
