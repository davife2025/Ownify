import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SIMULATION_SIZE } from "@ownify/shared";
import { runSimulation } from "./simulation";
import type { RunStore } from "./runs";

const simBody = z.object({
  seed: z.number().int().min(0).max(2 ** 32 - 1).optional(),
  rounds: z.number().int().min(1).max(50).default(5),
  buyers: z.number().int().min(1).max(50).default(SIMULATION_SIZE.buyers),
  sellers: z.number().int().min(1).max(20).default(SIMULATION_SIZE.sellers),
});

const eventsQuery = z.object({
  after: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export function registerSwarmRoutes(app: FastifyInstance, deps: { runs: RunStore; parent: string }) {
  app.post("/swarm/simulate", async (req, reply) => {
    const parsed = simBody.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "invalid body", issues: parsed.error.issues });
    const { seed = Math.floor(Math.random() * 2 ** 32), ...rest } = parsed.data;
    const run = deps.runs.add(runSimulation({ seed, parent: deps.parent, ...rest }));
    return { runId: run.id, seed: run.seed, config: run.config, eventCount: run.events.length, summary: run.summary };
  });

  app.get("/swarm/runs", async () => ({
    runs: deps.runs.list().map((r) => ({ runId: r.id, createdAt: r.createdAt, seed: r.seed, rounds: r.config.rounds, summary: r.summary })),
  }));

  app.get<{ Params: { runId: string } }>("/swarm/runs/:runId", async (req, reply) => {
    const run = deps.runs.get(req.params.runId);
    if (!run) return reply.code(404).send({ error: "unknown run" });
    const { events, ...rest } = run;
    return { ...rest, eventCount: events.length };
  });

  app.get<{ Params: { runId: string; n: string } }>("/swarm/runs/:runId/rounds/:n", async (req, reply) => {
    const run = deps.runs.get(req.params.runId);
    const round = run?.rounds.find((r) => r.index === Number(req.params.n));
    if (!run || !round) return reply.code(404).send({ error: "unknown run or round" });
    return round;
  });

  app.get<{ Params: { runId: string } }>("/swarm/runs/:runId/events", async (req, reply) => {
    const run = deps.runs.get(req.params.runId);
    if (!run) return reply.code(404).send({ error: "unknown run" });
    const q = eventsQuery.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: "invalid query", issues: q.error.issues });
    const events = run.events.filter((e) => e.seq > q.data.after).slice(0, q.data.limit);
    return { events, next: events.length ? events[events.length - 1].seq : q.data.after };
  });
}
