# Session map

1. **Core infrastructure** (done): monorepo, workspaces, shared types, API with health route, web shell, Supabase scaffolding.
2. **Landing and onboarding** (done): ticker strip, hero, onboarding cards, docs and API sidebar.
3. **Swarm rules** (draft written; treated as approved with the recommended defaults): RULES.md and a text sequence diagram of one round. No contracts yet.
4. **Agent identity and wallets** (done, with gaps below): one sub-account per agent under a parent, plus the owner-signed spending rules for each agent.
5. **Coordinator and simulation** (next): open a round, sealed bids, reveal, clear; 20 scripted buyers and 5 sellers, no LLM calls.
6. **Live dashboard**: rounds, bids, clearing price and who got what; feeds the ticker.
7. **Verified agent shelf**: housing, study and food agents on Kimi K2 via Hugging Face, with benchmark scores.
8. **Cost dial and receipts**: model, compute and energy settings, a live price, a receipt per task.
9. **Data vault** (stretch): private vault and a labelled testnet sale listing.
10. **Submission pack**: README, final RULES.md, demo video, X post and form.

---

# Session 4: Agent identity and wallets

**Overview:** every agent gets a traceable account name under one parent, and a spending policy in the format the NEAR Intents Agent API expects an owner to sign.

## Built
- `packages/shared`: agent roles, account-id helpers (`buyer-1.<parent>`), `SIMULATION_SIZE` (20 buyers, 5 sellers)
- `apps/api/src/agents/policy.ts`: zod schema for the Agent API policy (from its Policies and Limits page), `buildBuyerPolicy` (confidential transfers to listed sellers only, small daily cap) and `buildSellerPolicy` (withdraw to one payout address only)
- `provisioner.ts`: `SimulatedProvisioner` (no network) and `TestnetProvisioner` (creates real sub-accounts with near-api-js 5; sub-account keys go to a gitignored folder, the parent key stays in memory)
- `store.ts`: in-memory store and a Supabase store; `supabase/migrations/0001_agents.sql`
- API routes: `POST /swarm/agents`, `GET /swarm/agents`, `GET /swarm/agents/:accountId/policy` (preview only)
- `.env.example` now uses the doc's names `NEAR_INTENTS_AGENT_API_URL` and `NEAR_INTENTS_AGENT_API_KEY`

## Verified (run in this session)
- `pnpm build` 3 of 3 and `pnpm typecheck` 4 of 4 succeeded
- 8 of 8 tests pass: naming, USD-to-atomic conversion, both policy builders, schema rejections, provisioning 20 + 5 agents, the policy preview and its error cases
- Built server in simulated mode: provisioned 25 agents (buyer-1.swarm.testnet to seller-5.swarm.testnet) and returned a buyer policy with 5 destinations

## Not verified
- `TestnetProvisioner` was never run: it needs a funded testnet parent account, and this sandbox cannot reach NEAR testnet
- `SupabaseAgentStore` was never run: no Supabase project exists
- The policy format comes from the docs page and has not been accepted by the live Agent API
- The real Agent API is not wired in. It needs a partner API key and an owner who signs, and the request formats for `agent_create`, `grant_issue` and the actions were not read yet. Settlement for the demo is still the ledger plan in RULES.md section 9.

## Facts found while reading the docs
- NEAR Intents has no public testnet deployment (the verifier is on mainnet), so testnet sub-accounts cannot settle through it. This matches the ledger-only plan.
- Agent API wallets are NEAR Intents accounts owned by an owner account that signs twice (`agent_create`, `grant_issue`). The `swarm.testnet` names are a separate, testnet identity layer for onchain traceability.

## Needed from Dave
- A parent account name you control on testnet (`swarm.testnet` may be taken) and its private key, funded from a testnet faucet, to try `PROVISION_MODE=testnet`
- Later, for any real settlement: a partner API key from partners.near-intents.org and a decision on who the owner account is
- Supabase project keys, as before

---

# Session 3: Swarm rules (in progress)

**Overview:** RULES.md with the round phases, a clearing algorithm with a worked example, edge cases, simulation and live-page requirements, and a text sequence diagram of one round.

## Built
- `RULES.md` (draft). No code, no contracts.

## Waiting on Dave
- OK on RULES.md, and answers to the five decisions in its section 11, before any contract or coordinator code
- Assumption made: Ownify enters the AI Swarms track, as the pasted NEAR prompt is for that track

---

# Session 2: Landing and onboarding

**Overview:** the real landing page in `apps/web`: a live round ticker strip, hero, three onboarding cards, and a docs and API area with a left sidebar.

## Built
- Ticker strip under the top bar: one scrolling line of round events, pauses on hover or focus, static and scrollable under reduced motion
- Hero with the pitch and two buttons
- "Start here": three onboarding cards (pick a verified agent, set the cost dial, keep your data)
- "Docs and API": links to three NEAR Intents Agent API pages, plus an Ownify API card pointing at `GET /health` (base URL from `NEXT_PUBLIC_API_URL`)
- Left docs-style sidebar (sticky on wide screens, stacks above the content on narrow ones)
- Look: light and calm, deep blue accent (#1E40AF), Public Sans via `@fontsource-variable/public-sans`, plain CSS in `globals.css`, no Tailwind
- Content lives in `src/content/` (`sample-events.ts`, `links.ts`)

## Verified (run in this session)
- `pnpm build`: 3 of 3 tasks succeeded
- `pnpm typecheck`: 4 of 4 tasks succeeded
- Served the built app and fetched `/`: status 200, and the ticker, onboarding, docs and beta-warning text are all present in the HTML

## Not verified
- No browser was available, so nothing was seen on screen: ticker animation, sticky sidebar, colors and the mobile layout are untested visually
- `pnpm dev` (watch mode) was not run

## Placeholders to replace
- Ticker events are a labelled sample ("Sample round"), not live data. Session 6 wires real rounds.
- RULES.md and Live rounds appear as dashed "coming" cards, not links
- The earlier preview artifact still shows the old teal accent and stat cells; this page supersedes it

## Needed from Dave
- Before Session 3: which track to enter, AI Swarms (the NEAR group-buying prompt) or Agent Economy
- A Supabase project (URL, anon key, service role key) before any database work
- Later: a Hugging Face token (Session 7) and a NEAR Intents partner API key (Session 4)
- The code is only in the zip. It has not been pushed to any repository.

## Next: Session 3, swarm rules
RULES.md for the group-buying round plus a text sequence diagram of one round. Stop for Dave's OK before any contract.

---

# Session 1: Core infrastructure

**Overview:** monorepo foundation: workspaces, build tooling, shared types, an API with a health route, a web app shell, and Supabase client scaffolding.

## Built
- pnpm workspaces + Turborepo (`build`, `typecheck`, `dev` tasks)
- `packages/shared`: `APP_NAME` and the `HealthResponse` type, compiled to `dist`
- `apps/api`: Fastify server, zod-validated env, CORS, `GET /health`, Supabase service client (created only when configured)
- `apps/web`: Next.js 14 app router shell and a Supabase browser client (null when not configured)
- `supabase/migrations/` (empty; schema starts after RULES.md)
- `.env.example` covering Supabase, Hugging Face (Kimi K2), and NEAR Intents keys

## Verified
- `pnpm build` and `pnpm typecheck` passed; the built API returned `ok: true`, `supabaseConfigured: false` from `GET /health`

## Not verified
- Nothing talks to Supabase yet: no project or keys exist
