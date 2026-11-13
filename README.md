# Ownify

Verified AI agents you own: you choose what they run on, what each task costs, and who sees your data. Built for NEAR HACKATHON 2026.

## Status

Sessions 1 (core infrastructure) and 2 (landing and onboarding) are done. The agent shelf, cost dial, swarm rounds and data vault are not built yet; see `SESSION_REPORT.md` for what exists and what comes next.

## Stack

TypeScript, pnpm + Turborepo monorepo, Supabase (database), Next.js 14 (`apps/web`), Fastify (`apps/api`), shared types (`packages/shared`). Any LLM use goes through Kimi K2 on Hugging Face inference.

## Run it

```bash
pnpm install
cp .env.example .env     # fill in values as sessions need them
pnpm build
pnpm typecheck
pnpm dev                 # web on :3000, api on :4000
```

API check: `curl http://localhost:4000/health`

## Notes

The NEAR Intents Agent API is an experimental, mainnet-only beta. Use small test amounts only.
