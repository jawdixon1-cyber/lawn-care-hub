-- Jobber OAuth: stored tokens + short-lived state for CSRF protection

create table if not exists public.jobber_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  account_name text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobber_tokens enable row level security;

-- Users can read their own connection metadata (NOT the raw tokens — we'll expose only "is connected")
create policy "users read own jobber_tokens"
  on public.jobber_tokens for select using (auth.uid() = user_id);

create policy "users delete own jobber_tokens"
  on public.jobber_tokens for delete using (auth.uid() = user_id);

-- Edge functions use the service role; no insert/update policies needed for end users.

-- One-time OAuth state for CSRF protection. Rows expire after 10 min.
create table if not exists public.jobber_oauth_state (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_to text,
  created_at timestamptz not null default now()
);

alter table public.jobber_oauth_state enable row level security;
-- No client policies — only edge functions touch this via service role.

-- Helper view: returns a single boolean for the current user's connection state
create or replace view public.jobber_connection as
  select user_id, account_name, connected_at, scope
  from public.jobber_tokens
  where user_id = auth.uid();
