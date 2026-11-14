# Session map

1. **Core infrastructure** (done): monorepo, workspaces, shared types, API with health route, web shell, Supabase scaffolding.
2. **Landing and onboarding** (done): ticker strip, hero, onboarding cards, docs and API sidebar.
3. **Swarm rules** (draft written; treated as approved with the recommended defaults): RULES.md and a text sequence diagram of one round. No contracts yet.
4. **Agent identity and wallets** (done, with gaps below): one sub-account per agent under a parent, plus the owner-signed spending rules for each agent.
5. **Coordinator and simulation** (done, service only; the NEAR contract is not written): open a round, sealed bids, reveal, clear; 20 scripted buyers and 5 sellers, no LLM calls.
6. **Live dashboard** (done, not yet seen in a browser): rounds, bids, clearing price and who got what; feeds the ticker.
7. **Verified agent shelf** (done; never run against the real model): housing, study and food agents on Kimi K2 via Hugging Face, with benchmark scores.
8. **Cost dial and receipts**: model, compute and energy settings, a live price, a receipt per task.
9. **Data vault** (stretch): private vault and a labelled testnet sale listing.
10. **Submission pack**: README, final RULES.md, demo video, X post and form.

---

# Session 8: Cost dial and receipts

**Overview:** before asking an agent a question you can step the cost down and see a live price ceiling; every answer comes with a receipt of what ran and what it cost. Also fixes the `pnpm dev` error you reported.

## Fix: `Can't resolve '@ownify/shared'` under `pnpm dev`
- **Cause:** `@ownify/shared` points at its `dist/` folder, which only exists after a build. A fresh checkout (or my zips, which leave out `dist`) has none, and `pnpm dev` started the web app, the API and the shared watcher all at once, so the web app compiled first and failed. I reproduced the same 500 and error by starting `next dev` without a shared build. I had only tested built servers and had never run dev mode, which my earlier reports said.
- **Fix:** the `dev` task now depends on the shared package's build, and `pnpm install` builds it too (postinstall).
- **Verified:** from a clean state (no `dist`, no `.next`, no turbo cache), `pnpm dev` served `/`, `/live` and `/agents` with 200 in about 6 seconds, with no module errors in the log, and the API answered. A fresh `pnpm install` leaves `packages/shared/dist` in place.
- If the error sticks on your machine: run `pnpm install`, delete `apps/web/.next`, and start again with `pnpm dev` from the repo root.

## Built
- `packages/shared`: price and token math (`quote`, `costUsd`, `ratesFor`), the receipt type, and `usdFine`
- API: `GET /pricing`; `POST /shelf/:agent/ask` now takes `compute` (fastest or cheapest) and returns a receipt; `GET /receipts/:id` (also says whether the receipt still matches its hash) and `GET /receipts`; a file store keeping the latest 200 receipts
- The Hugging Face client adds `:cheapest` to the model id for the cheapest setting (Hugging Face's docs: default is the fastest provider, `:cheapest` is the lowest price per output token) and reads the provider's reported token usage when present
- Receipts hold tokens (reported or estimated, labelled), cost, time, model requested and served, prompt and question hashes. They never hold the question or answer text.
- Web: the ask form has a cost dial (answer budget with a price ceiling beside each option, provider choice, a live estimate, the rates used, and a note that energy is not measured) and a receipt card after each answer
- `.env.example` has the `PRICE_*` and `RECEIPTS_FILE` settings

## Verified (run in this session)
- `pnpm build` 3 of 3, `pnpm typecheck` 4 of 4, 56 of 56 API tests (9 new)
- Stepping the answer budget down lowers the price ceiling; token and cost math; half-set price pairs are ignored; tampering with any receipt field is detected; receipts contain neither question nor answer text; the Hugging Face request carries the `:cheapest` suffix only when asked
- Server render of the cost dial and receipt card, including the "not quantified" note when no cheaper rates are set
- Under `pnpm dev`: `/pricing`, an ask with the cheapest setting (mock model), fetching that receipt (it matched its hash), and the receipt list all worked

## Not verified, and limits
- **The real Hugging Face API has still never been called.** Reading `usage` from its reply and the `:cheapest` suffix are tested against fakes and Hugging Face's documentation only.
- **Prices are not real until you set them.** The reference rates ($1 input and $3 output per million tokens) came from a third-party page and are not verified. Receipt costs are tokens times these rates, not Hugging Face billing. The cheaper provider's price is unknown unless you set `PRICE_CHEAPEST_*`; until then the estimate shows the standard rates and says so.
- **Energy is not measured and there is no energy setting.** The pitch cannot claim users can step energy down unless you supply a source or an assumption, or drop it.
- The model setting is the answer budget (same model), as the Kimi-K2-only rule requires. The compute setting is the provider choice, fastest or cheapest; the router's other options (`:preferred`, a named provider) are not offered.
- The price on screen is a ceiling: the model may answer in fewer tokens than the budget
- A hash of a short question can be guessed, so treat receipts as semi-private
- The page was server-rendered but never opened in a browser

## Needed from Dave
- Your real token prices (from Hugging Face billing or the provider) for the `PRICE_*` settings
- A Hugging Face token, still, for real answers, reported token counts and scores
- A decision on the energy claim: supply a source or assumption, or remove it from the pitch
- Whether to build the data vault (Session 9) or go straight to the submission pack (Session 10)
- After unpacking this zip, run `pnpm install`

---

# Session 7: Verified agent shelf

**Overview:** housing, study and food agents, a scoring pipeline that tests each one on questions with known answers at three cost tiers, a receipt for every score, and a shelf page where people can ask an agent a question. Rules are written up in `VERIFICATION.md`.

## Built
- `apps/api/src/shelf/`: agent definitions and system prompts; hidden banks of 10 questions per agent; a deterministic rubric scorer (expected facts, forbidden claims, required referral); seeded case selection that always includes the referral cases and rotates the rest; sha256 receipts; a file-based score store; the Hugging Face client (`https://router.huggingface.co/v1/chat/completions`, `moonshotai/Kimi-K2-Instruct` by default, both from Hugging Face's own docs); a labelled mock used when no token is set; a shared rate limit on questions
- Routes: `GET /shelf`, `POST /shelf/:agent/ask`, `GET /shelf/:agent/receipt/:tier`
- CLI: `pnpm verify` runs the benchmark and writes `apps/api/data/shelf-scores.json`; it refuses to run on the mock unless `--allow-mock`
- Web: `/agents` with an agent card per domain (scores by tier, safe behavior, status) and an ask form with an answer-budget choice; "Agent shelf" added to the top bar, sidebar and docs cards
- Status wording on the page: Not scored yet, Sample only (mock model), Verified, or Not verified with the reason

## Verified (run in this session)
- `pnpm build` 3 of 3, `pnpm typecheck` 4 of 4, 47 of 47 API tests
- All 30 questions and every pattern compile; scoring rewards known facts, caps a missing referral at half marks, and zeroes a forbidden claim; selection always includes referral cases and every question gets asked across seeds; receipts change when any field changes and recompute correctly
- The Hugging Face client sends the documented request (URL, bearer token, model, messages, max tokens) and handles errors, empty answers and network failure, tested against a fake fetch
- Built servers: `/shelf` lists 3 agents x 3 tiers with no scores, the hidden bank is not in any response, asking works in mock mode, a bad tier is rejected, the CORS preflight for the ask form passes, `/agents` returns 200
- The CLI refuses to run without a token; with `--allow-mock` it stores flagged sample scores
- Server render of the shelf shows all five status wordings

## Not verified
- **No call to the real Hugging Face API has ever been made.** There is no token and this sandbox cannot reach it. The client is checked only against the documented request and response shape.
- **No agent has a real score.** The shelf shows "Not scored yet" until you run `pnpm verify` with a token. The 54 calls are your Hugging Face usage.
- The expected answers and patterns were written by me and not reviewed by anyone else; skim `apps/api/src/shelf/banks/` before relying on them
- The shelf page was server-rendered but never opened in a browser
- Scores are in a JSON file, not Supabase

## Decisions and needs
- A Hugging Face fine-grained token (permission to make calls to Inference Providers) to run `pnpm verify` and to make `/agents` answer for real
- Model: the router also lists a newer `moonshotai/Kimi-K2.5`. The default stays `moonshotai/Kimi-K2-Instruct`; change `HF_MODEL` if you prefer the newer one.
- Tiers are the same model with a smaller or larger answer budget, because the build rule allows only Kimi K2. For Session 8, the cost dial's "model" setting would therefore be the answer budget, not a choice of models, unless you allow other models.
- For a hosted demo: run `pnpm verify` locally and commit `apps/api/data/shelf-scores.json`; the API also needs somewhere to run
- Still open: the NEAR contract (assumed service-only), and everything under Sessions 4 and 5 for real accounts and settlement

---

# Session 6: Live dashboard

**Overview:** a `/live` page that shows rounds, sealed bids, the clearing price and who got what, a replay that plays a round back event by event, and a landing-page ticker that reads the latest simulation.

## Built
- `packages/shared`: the swarm types moved here so the API and web app share one definition, plus `usd` and `shortId` formatters, `describeEvent` (one plain sentence per event) and `reduceRoundEvents` (rebuilds a round's public state from its events, with no hidden max prices)
- `apps/web` `/live`: run controls (seed, rounds), a rounds list, a phase stepper, panels for pool, sealed bids (revealed offers with the winner marked, void offers with reasons), result, who got what, left out, settlement and an event feed; "Replay this round" and "Show the result"; screen-reader announcements during replay
- If the API has no runs yet, `/live` creates one (seed 2026, 5 rounds). Error state explains how to start the API.
- Landing page: the ticker shows the latest simulation's last round, and falls back to the labelled sample if there is none or the API is offline. "Live rounds" is now linked from the top bar, sidebar, hero and cards.
- API: the run store keeps the latest 50 runs
- Simulation: seller costs drift a little each round (think energy prices)
- `pnpm --filter @ownify/web check:ssr`

## Verified (run in this session)
- `pnpm build` 3 of 3, `pnpm typecheck` 4 of 4, 33 of 33 API tests
- Replaying a round's public events rebuilds the stored round record exactly (offers, void reasons, result, settlements, defaults), across several seeds
- Server render of the dashboard panels from real simulation output: full round, a partial replay before the pool locks (no result shown early), and an empty state
- Built API and web servers together: the API allows the web origin (CORS), `/` and `/live` return 200 with the expected content, and the runs and events the dashboard loads come back
- Found and fixed a flaw: with fixed seller costs the clearing price was identical in every round. After the drift change, seed 2026 clears at $2.93, $3.03, $3.14, $3.04, $3.15 per GPU-hour.

## Not verified
- No browser was available, so the client side was never exercised: data fetching in the page, the replay timer, button clicks, layout, colors and mobile. Open `/live` and check it.
- The ticker's switch from sample to live lines is the same: only its server render was checked
- Runs live in memory and reset when the API restarts; there is no Supabase storage yet
- Rounds still come only from the simulation, not from real agents
- The earlier preview artifact still shows the teal accent and stat cells; the real pages supersede it

## Needed from Dave
- Run `pnpm dev`, open `/live`, and tell me what looks or behaves wrong
- For a hosted demo the API needs somewhere to run, and the web app needs `NEXT_PUBLIC_API_URL` pointing at it
- Still open: OK to write the minimal NEAR contract (assumed service-only until you say so)
- Everything under Sessions 4 and 5 still applies for real accounts and settlement

---

# Session 5: Coordinator and simulation

**Overview:** the round rules from RULES.md as running code, plus a market of 20 scripted buyers and 5 scripted sellers that runs without any LLM.

## Built (all in `apps/api/src/swarm/`)
- `clearing.ts`: the clearing algorithm, pure and deterministic, with the tie rules
- `round.ts`: a round state machine (open, demand, locked, bid, reveal, cleared, settled, closed). It checks phase order, one demand per buyer, hours and price limits, balance at lock, and sealed bids by sha256 commit and reveal. Bad or missing reveals are voided. Max prices and unrevealed offers stay hidden in `publicView()`.
- `ledger.ts`: integer balances; settlement moves each buyer's share to the winner, and a buyer who cannot pay is flagged while the others still pay
- `simulation.ts`: seeded random generator; buyer scripts (truthful, shaded, late joiner, size shifter, plus buyers who cannot cover their demand); seller scripts (cost plus, undercut, high hold, random walk, plus one seller that sometimes skips its reveal)
- Event feed with sequence numbers, ready for the ticker
- Routes: `POST /swarm/simulate`, `GET /swarm/runs`, `GET /swarm/runs/:id`, `GET /swarm/runs/:id/rounds/:n`, `GET /swarm/runs/:id/events?after=`
- CLI: `pnpm --filter @ownify/api simulate -- --seed 1 --rounds 3`
- RULES.md now states the commitment encoding

## Verified (run in this session)
- `pnpm build` 3 of 3, `pnpm typecheck` 4 of 4, 28 of 28 tests pass
- The worked example in RULES.md clears exactly as written (winner A, price 5, buyers pay 50 and 100)
- Across 40 seeds, 4 rounds each: money is conserved, no buyer pays above its max, no cheaper eligible offer lost, payout equals the sum of shares
- The same seed gives the identical market; a test checks the swarm code has no network or LLM calls
- Built server: simulated and served rounds and events over HTTP

## Not built or not verified
- No NEAR contract. Sealed bids are committed to the service, not to the chain, until you approve the contract.
- Settlement is a ledger in memory, not NEAR Intents
- Runs live in memory and are lost on restart; Supabase persistence comes with the dashboard
- Live (non-simulated) rounds with real agents are not wired: the engine takes bids from code only

## Needed from Dave
- OK to write the minimal NEAR contract (records commitments, reveals and results, holds no money), or confirm service-only
- Everything listed under Session 4 still applies for real accounts and settlement

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
