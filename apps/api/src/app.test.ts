import test from "node:test";
import assert from "node:assert/strict";
import type { AgentRecord } from "@ownify/shared";
import { buildApp, type AppDeps } from "./app";
import { SimulatedProvisioner } from "./agents/provisioner";
import { MemoryAgentStore } from "./agents/store";

function deps(over: Partial<AppDeps["settlement"]> = {}): AppDeps {
  return {
    provisioner: new SimulatedProvisioner("swarm.testnet"),
    store: new MemoryAgentStore(),
    parent: "swarm.testnet",
    supabaseConfigured: false,
    settlement: { decimals: 6, dailyUsd: "5.00", ...over },
  };
}

test("provisions the default 20 buyers and 5 sellers", async () => {
  const app = await buildApp(deps());
  const res = await app.inject({ method: "POST", url: "/swarm/agents", payload: {} });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { mode: string; agents: AgentRecord[] };
  assert.equal(body.mode, "simulated");
  assert.equal(body.agents.length, 25);
  assert.equal(body.agents.filter((a) => a.role === "buyer").length, 20);
  assert.equal(body.agents.filter((a) => a.role === "seller").length, 5);
  assert.equal(body.agents[0].accountId, "buyer-1.swarm.testnet");

  const list = (await app.inject({ method: "GET", url: "/swarm/agents" })).json() as { agents: AgentRecord[] };
  assert.equal(list.agents.length, 25);
});

test("rejects an invalid provision request", async () => {
  const app = await buildApp(deps());
  const res = await app.inject({ method: "POST", url: "/swarm/agents", payload: { buyers: 0 } });
  assert.equal(res.statusCode, 400);
});

test("policy preview needs a settlement asset, then returns a buyer policy", async () => {
  const noAsset = await buildApp(deps());
  await noAsset.inject({ method: "POST", url: "/swarm/agents", payload: {} });
  const r1 = await noAsset.inject({ method: "GET", url: "/swarm/agents/buyer-1.swarm.testnet/policy" });
  assert.equal(r1.statusCode, 409);

  const withAsset = await buildApp(deps({ assetId: "nep141:example.token" }));
  await withAsset.inject({ method: "POST", url: "/swarm/agents", payload: {} });
  const r2 = await withAsset.inject({ method: "GET", url: "/swarm/agents/buyer-1.swarm.testnet/policy" });
  assert.equal(r2.statusCode, 200);
  const body = r2.json() as { preview: boolean; policy: { destinations: { list: unknown[] } } };
  assert.equal(body.preview, true);
  assert.equal(body.policy.destinations.list.length, 5);

  const r3 = await withAsset.inject({ method: "GET", url: "/swarm/agents/buyer-99.swarm.testnet/policy" });
  assert.equal(r3.statusCode, 404);
  const r4 = await withAsset.inject({ method: "GET", url: "/swarm/agents/seller-1.swarm.testnet/policy" });
  assert.equal(r4.statusCode, 409);
});
