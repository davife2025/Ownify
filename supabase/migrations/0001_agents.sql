create table if not exists public.agents (
  account_id text primary key,
  role text not null check (role in ('buyer', 'seller')),
  idx integer not null check (idx >= 1),
  mode text not null check (mode in ('simulated', 'testnet')),
  public_key text,
  created_at timestamptz not null default now(),
  unique (role, idx)
);

-- No public policies: only the API's service role key reads and writes this table.
alter table public.agents enable row level security;
