# Session 1: Core infrastructure

**Overview:** monorepo foundation for Ownify: workspaces, build tooling, shared types, an API with a health route, a web app shell, and Supabase client scaffolding.

## Built
- pnpm workspaces + Turborepo (`build`, `typecheck`, `dev` tasks)
- `packages/shared`: `APP_NAME` and the `HealthResponse` type, compiled to `dist`
- `apps/api`: Fastify server, zod-validated env, CORS, `GET /health`, Supabase service client (created only when configured)
- `apps/web`: Next.js 14 app router shell with a placeholder page and a Supabase browser client (null when not configured)
- `supabase/migrations/` (empty; schema starts after RULES.md)
- `.env.example` covering Supabase, Hugging Face (Kimi K2), and NEAR Intents keys

## Verified (run in this session)
- `pnpm build`: 3 of 3 tasks succeeded
- `pnpm typecheck`: 4 of 4 tasks succeeded
- Started the built API and called `GET /health`: returned `ok: true`, `supabaseConfigured: false`

## Not verified
- `pnpm dev` (watch mode) was not run
- The web page was built but not opened in a browser
- Nothing talks to Supabase yet: no project or keys exist

## Needed from Dave
- A Supabase project (URL, anon key, service role key) before any database work
- Later: a Hugging Face token (Session 7) and a NEAR Intents partner API key (Session 4)
- The code is only in this zip. It has not been pushed to any repository.

## Next: Session 2, landing and onboarding
Decisions so far: light and calm look, deep blue accent, hero leads with one scrolling line of live round events, left sidebar for docs and API navigation, onboarding as cards. The preview artifact still shows the earlier teal accent and stat-cell ticker.
