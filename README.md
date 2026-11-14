# Ownify

Verified AI agents you own: you choose what they run on, what each task costs, and who sees your data. Built for NEAR HACKATHON 2026.

## Status

Sessions 1 (core infrastructure), 2 (landing and onboarding) 4 (agent identity) and 5 (coordinator and simulation), 6 (live dashboard) and 7 (agent shelf) and 8 (cost dial and receipts) are done; Session 3 (RULES.md) is a draft awaiting review. The agent shelf, cost dial, swarm rounds and data vault are not built yet; see `SESSION_REPORT.md` for what exists and what comes next.

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

## Cost dial and receipts

On `/agents`, before asking an agent a question you can step the cost down two ways, and see a price ceiling update live:

- **Answer budget** (Economy, Balanced, Max): the same model with a smaller or larger answer limit (250, 600 or 1200 tokens), so it really changes how many tokens you pay for.
- **Provider**: Fastest (Hugging Face's default) or Cheapest. Cheapest adds `:cheapest` to the model id, which Hugging Face documents as picking the provider with the lowest price per output token.

Every answer returns a receipt: tokens in and out (as reported by the provider, or estimated and labelled), cost, time, the model requested and served, and hashes of the prompt and question. Receipts hold no question or answer text, and `GET /receipts/:id` says whether a receipt still matches its hash.

What this does not do: prices come from the `PRICE_*` settings (reference rates until you set them), not from Hugging Face billing, and energy use is not measured, so there is no energy setting.

## Troubleshooting

- `Module not found: Can't resolve '@ownify/shared'`: the shared package must be built before the apps start. `pnpm install` now does this, and `pnpm dev` builds it first. If you run an app on its own, run `pnpm --filter @ownify/shared build` first, and delete `apps/web/.next` if the error sticks.
- After unpacking a newer zip, run `pnpm install` again.

## Notes

The NEAR Intents Agent API is an experimental, mainnet-only beta. Use small test amounts only.
