import test from "node:test";
import assert from "node:assert/strict";
import { clearRound } from "./clearing";
import type { Demand, Offer } from "./types";

const d = (buyerId: string, hours: number, maxPrice: number, seq: number): Demand => ({ buyerId, hours, maxPrice, seq });
const o = (sellerId: string, price: number, capacity: number, commitSeq: number): Offer => ({ sellerId, price, capacity, commitSeq });

test("worked example from RULES.md", () => {
  const res = clearRound(
    [d("b1", 10, 8, 1), d("b2", 20, 6, 2), d("b3", 30, 5, 3)],
    [o("A", 4, 80, 1), o("B", 5, 50, 2), o("C", 7, 100, 3)],
  );
  assert.equal(res.status, "cleared");
  if (res.status !== "cleared") return;
  assert.equal(res.winner, "A");
  assert.equal(res.price, 5);
  assert.equal(res.totalHours, 30);
  assert.equal(res.payout, 150);
  assert.deepEqual(res.allocations, [{ buyerId: "b1", hours: 10, pays: 50 }, { buyerId: "b2", hours: 20, pays: 100 }]);
  assert.deepEqual(res.removed, [{ buyerId: "b3", reason: "below_price" }]);
});

test("a single eligible seller wins at its own ask", () => {
  const res = clearRound([d("b1", 10, 9, 1)], [o("A", 4, 100, 1), o("B", 3, 5, 2)]);
  assert.equal(res.status, "cleared");
  if (res.status === "cleared") {
    assert.equal(res.winner, "A");
    assert.equal(res.price, 4);
  }
});

test("equal asks go to the earlier commitment, then the lower account id", () => {
  const early = clearRound([d("b1", 1, 9, 1)], [o("A", 5, 10, 2), o("B", 5, 10, 1)]);
  assert.equal(early.status === "cleared" && early.winner, "B");
  const byId = clearRound([d("b1", 1, 9, 1)], [o("seller-10", 5, 10, 1), o("seller-2", 5, 10, 1)]);
  assert.equal(byId.status === "cleared" && byId.winner, "seller-2");
});

test("removes the weakest buyer until some seller has the capacity", () => {
  const res = clearRound([d("x", 50, 9, 1), d("y", 50, 3, 2)], [o("A", 4, 60, 1)]);
  assert.equal(res.status, "cleared");
  if (res.status === "cleared") {
    assert.deepEqual(res.removed, [{ buyerId: "y", reason: "capacity" }]);
    assert.equal(res.totalHours, 50);
    assert.equal(res.price, 4);
  }
});

test("equal max prices remove the later demand first", () => {
  const res = clearRound([d("first", 5, 3, 1), d("second", 5, 3, 2)], [o("A", 5, 100, 1)]);
  assert.equal(res.status, "failed");
  assert.deepEqual(res.removed.map((r) => r.buyerId), ["second", "first"]);
  if (res.status === "failed") assert.equal(res.reason, "no_fit");
});

test("fails cleanly with no demand or no offers", () => {
  const a = clearRound([], [o("A", 4, 10, 1)]);
  const b = clearRound([d("b1", 1, 9, 1)], []);
  assert.equal(a.status === "failed" && a.reason, "no_demand");
  assert.equal(b.status === "failed" && b.reason, "no_offers");
});

test("payout always equals the sum of what buyers pay", () => {
  const res = clearRound(
    [d("b1", 7, 9, 1), d("b2", 13, 8, 2), d("b3", 3, 7, 3)],
    [o("A", 4, 30, 1), o("B", 6, 30, 2)],
  );
  assert.equal(res.status, "cleared");
  if (res.status === "cleared") assert.equal(res.allocations.reduce((s, a) => s + a.pays, 0), res.payout);
});
