import test from "node:test";
import assert from "node:assert/strict";
import { agentAccountId, parseAgentAccountId } from "@ownify/shared";
import { agentPolicySchema, buildBuyerPolicy, buildSellerPolicy, usdToAtomic } from "./policy";

test("agent account ids round-trip and reject bad input", () => {
  const id = agentAccountId("swarm.testnet", "buyer", 7);
  assert.equal(id, "buyer-7.swarm.testnet");
  assert.deepEqual(parseAgentAccountId(id, "swarm.testnet"), { role: "buyer", index: 7 });
  assert.equal(parseAgentAccountId("buyer-0.swarm.testnet", "swarm.testnet"), null);
  assert.equal(parseAgentAccountId("buyer-1.other.testnet", "swarm.testnet"), null);
  assert.throws(() => agentAccountId("swarm.testnet", "buyer", 0));
});

test("usdToAtomic converts exactly", () => {
  assert.equal(usdToAtomic("5.00", 6), "5000000");
  assert.equal(usdToAtomic("0.5", 6), "500000");
  assert.equal(usdToAtomic("12", 18), "12000000000000000000");
  assert.throws(() => usdToAtomic("-1", 6));
});

const caps = { assetId: "nep141:example.token", decimals: 6, dailyUsd: "5.00" };

test("buyer policy only allows confidential transfers to listed sellers", () => {
  const p = buildBuyerPolicy({ ...caps, sellerAddresses: ["seller-1.swarm.testnet", "seller-2.swarm.testnet"] });
  assert.deepEqual(p.actions, ["transfer"]);
  assert.equal(p.destinations.mode, "only");
  assert.equal(p.destinations.list.length, 2);
  assert.ok(p.destinations.list.every((d) => d.action === "transfer" && d.confidential === true));
  assert.equal(p.confidential, true);
  assert.equal(p.budget.daily_usd, "5.00");
  assert.equal(p.limits.daily?.["nep141:example.token"], "5000000");
  assert.throws(() => buildBuyerPolicy({ ...caps, sellerAddresses: [] }));
});

test("seller policy only allows withdrawing to its payout address", () => {
  const p = buildSellerPolicy({ ...caps, payout: { chain: "eth", address: "0x" + "1".repeat(40) } });
  assert.deepEqual(p.actions, ["withdraw"]);
  assert.equal(p.destinations.list.length, 1);
});

test("schema rejects non-confidential and malformed policies", () => {
  const good = buildBuyerPolicy({ ...caps, sellerAddresses: ["seller-1.swarm.testnet"] });
  assert.equal(agentPolicySchema.safeParse({ ...good, confidential: false }).success, false);
  assert.equal(
    agentPolicySchema.safeParse({ ...good, destinations: { mode: "any", list: good.destinations.list } }).success,
    false,
  );
  assert.equal(agentPolicySchema.safeParse({ ...good, budget: { ...good.budget, daily_usd: "5.123" } }).success, false);
  assert.equal(agentPolicySchema.safeParse({ ...good, extra: true }).success, false);
});
