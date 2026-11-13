# Ownify

Verified AI agents you own: you choose what they run on, what each task costs, and who sees your data. Built for NEAR HACKATHON 2026.

## Status

Sessions 1 (core infrastructure), 2 (landing and onboarding) 4 (agent identity) and 5 (coordinator and simulation), 6 (live dashboard) and 7 (agent shelf) are done; Session 3 (RULES.md) is a draft awaiting review. The agent shelf, cost dial, swarm rounds and data vault are not built yet; see `SESSION_REPORT.md` for what exists and what comes next.

## Stack

TypeScript, pnpm + Turborepo monorepo, Supabase (database), Next.js 14 (`apps/web`), Fastify (`apps/api`), shared types (`packages/shared`). Any LLM use goes through Kimi K2 on Hugging Face inference.

## Run it

```bash
pnpm install
cp .env.example .env     # fill in values as sessions need them
pnpm build
pnpm typecheck
pnpm dev                 # web on :3000, api on :4000; open http://localhost:3000/live and /agents
```

API checks:

```bash
curl http://localhost:4000/health
curl -X POST http://localhost:4000/swarm/agents -H "content-type: application/json" -d '{}'   # 20 buyers, 5 sellers
curl http://localhost:4000/swarm/agents
curl http://localhost:4000/swarm/agents/buyer-1.swarm.testnet/policy    # needs SETTLEMENT_ASSET_ID
curl -X POST http://localhost:4000/swarm/simulate -H "content-type: application/json" -d '{"seed":1,"rounds":3}'
curl http://localhost:4000/swarm/runs/run-1/events?limit=20
pnpm --filter @ownify/api simulate -- --seed 1 --rounds 3     # prints a round-by-round summary
curl http://localhost:4000/shelf
curl -X POST http://localhost:4000/shelf/housing/ask -H "content-type: application/json" -d '{"question":"How do I check a lease?","tier":"economy"}'
pnpm --filter @ownify/api verify --agent all --tier all           # needs HF_TOKEN; see VERIFICATION.md
pnpm --filter @ownify/api test
pnpm --filter @ownify/web check:ssr                              # renders the dashboard panels from a real simulation
```

## Notes

The NEAR Intents Agent API is an experimental, mainnet-only beta. Use small test amounts only.
