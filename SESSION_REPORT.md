# Session map

1. **Core infrastructure** (done): monorepo, workspaces, shared types, API with health route, web shell, Supabase scaffolding.
2. **Landing and onboarding** (done): ticker strip, hero, onboarding cards, docs and API sidebar.
3. **Swarm rules** (draft written, waiting for OK): RULES.md and a text sequence diagram of one round. No contracts until approved.
4. **Agent identity and wallets**: one sub-account per agent under a parent, wired to the Agent API with owner-signed spending rules.
5. **Coordinator and simulation**: open a round, sealed bids, reveal, clear; 20 scripted buyers and 5 sellers, no LLM calls.
6. **Live dashboard**: rounds, bids, clearing price and who got what; feeds the ticker.
7. **Verified agent shelf**: housing, study and food agents on Kimi K2 via Hugging Face, with benchmark scores.
8. **Cost dial and receipts**: model, compute and energy settings, a live price, a receipt per task.
9. **Data vault** (stretch): private vault and a labelled testnet sale listing.
10. **Submission pack**: README, final RULES.md, demo video, X post and form.

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
