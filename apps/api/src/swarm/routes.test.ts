import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app";
import { SimulatedProvisioner } from "../agents/provisioner";
import { MemoryAgentStore } from "../agents/store";

async function app() {
  return buildApp({
    provisioner: new SimulatedProvisioner("swarm.testnet"),
    store: new MemoryAgentStore(),
    parent: "swarm.testnet",
    supabaseConfigured: false,
    settlement: { decimals: 6, dailyUsd: "5.00" },
  });
}

test("simulate, then read the run, a round and the event feed", async () => {
  const a = await app();
  const sim = await a.inject({ method: "POST", url: "/swarm/simulate", payload: { seed: 3, rounds: 2 } });
  assert.equal(sim.statusCode, 200);
  const body = sim.json() as { runId: string; seed: number; eventCount: number; summary: unknown[] };
  assert.equal(body.seed, 3);
  assert.equal(body.summary.length, 2);

  const again = await a.inject({ method: "POST", url: "/swarm/simulate", payload: { seed: 3, rounds: 2 } });
  assert.deepEqual((again.json() as { summary: unknown[] }).summary, body.summary);

  assert.equal((await a.inject({ method: "GET", url: `/swarm/runs/${body.runId}` })).statusCode, 200);
  assert.equal((await a.inject({ method: "GET", url: `/swarm/runs/${body.runId}/rounds/1` })).statusCode, 200);
  assert.equal((await a.inject({ method: "GET", url: `/swarm/runs/${body.runId}/rounds/9` })).statusCode, 404);

  const first = (await a.inject({ method: "GET", url: `/swarm/runs/${body.runId}/events?limit=5` })).json() as { events: { seq: number }[]; next: number };
  assert.equal(first.events.length, 5);
  const rest = (await a.inject({ method: "GET", url: `/swarm/runs/${body.runId}/events?after=${first.next}&limit=500` })).json() as { events: { seq: number }[] };
  assert.equal(first.events.length + rest.events.length, body.eventCount);
  assert.equal(rest.events[0].seq, first.next + 1);

  const list = (await a.inject({ method: "GET", url: "/swarm/runs" })).json() as { runs: unknown[] };
  assert.equal(list.runs.length, 2);
});

test("rejects bad input and unknown runs", async () => {
  const a = await app();
  assert.equal((await a.inject({ method: "POST", url: "/swarm/simulate", payload: { rounds: 0 } })).statusCode, 400);
  assert.equal((await a.inject({ method: "GET", url: "/swarm/runs/nope" })).statusCode, 404);
  assert.equal((await a.inject({ method: "GET", url: "/swarm/runs/nope/events" })).statusCode, 404);
});

test("the run store keeps only the most recent 50 runs", async () => {
  const { RunStore } = await import("./runs");
  const { runSimulation } = await import("./simulation");
  const store = new RunStore();
  const small = runSimulation({ seed: 1, rounds: 1, buyers: 2, sellers: 2, parent: "swarm.testnet" });
  for (let i = 0; i < 55; i++) store.add(small);
  assert.equal(store.list().length, 50);
  assert.equal(store.get("run-1"), undefined);
  assert.ok(store.get("run-55"));
});
