create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  balance numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  start_time timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.bet_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  bet_amount numeric(12,2) not null check (bet_amount > 0),
  win_amount numeric(12,2) not null default 0 check (win_amount >= 0),
  grid_result_json jsonb not null default '{}'::jsonb,
  multiplier numeric(6,2) not null default 1,
  is_feature_triggered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_game_sessions_user_id on public.game_sessions(user_id);
create index if not exists idx_bet_history_user_id on public.bet_history(user_id);
create index if not exists idx_bet_history_session_id on public.bet_history(session_id);

alter table public.users enable row level security;
alter table public.game_sessions enable row level security;
alter table public.bet_history enable row level security;

create policy "Users can read own account" on public.users for select using (true);
create policy "Users can insert own session" on public.game_sessions for insert with check (true);
create policy "Users can read own sessions" on public.game_sessions for select using (true);
create policy "Users can insert own bet history" on public.bet_history for insert with check (true);
create policy "Users can read own history" on public.bet_history for select using (true);

-- Exemplo de registro de sessão inicial
-- insert into public.users (balance, currency) values (250.00, 'BRL') returning id;
-- insert into public.game_sessions (user_id) values ('<uuid>') returning id;
-- insert into public.bet_history (user_id, session_id, bet_amount, win_amount, grid_result_json, multiplier, is_feature_triggered)
-- values ('<uuid>', '<uuid>', 5.00, 12.50, '{"grid":["🍊","🐯","🧨","💰","🗿","✉️","🍊","🥇","💰"]}', 2.50, false);
