create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  role text not null default 'player',
  vip_level integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique,
  avatar_url text,
  country text,
  currency text not null default 'BRL',
  timezone text default 'America/Sao_Paulo',
  kyc_status text not null default 'not_started'
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique,
  balance numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  status text not null default 'active',
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text not null,
  amount numeric(12,2) not null,
  status text not null default 'pending',
  reference text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  category text not null,
  rtp numeric(5,2) not null default 96.00,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  stake numeric(12,2) not null,
  payout numeric(12,2) not null default 0,
  result text not null default 'pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  bet_amount numeric(12,2) not null,
  payout_amount numeric(12,2) not null default 0,
  result_json jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text not null,
  amount numeric(12,2) not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.admin_settings (key, value) values
  ('house_edge', '{"value": 3.4}'),
  ('payout_rate', '{"value": 96.8}'),
  ('min_bet', '{"value": 1}'),
  ('max_bet', '{"value": 5000}'),
  ('daily_limit', '{"value": 20000}'),
  ('auto_payout', '{"value": true}'),
  ('vip_access', '{"value": true}'),
  ('game_boost', '{"value": 1.2}');

insert into public.games (name, type, category, rtp, enabled, config) values
  ('Lucky Spin', 'slot', 'casino', 96.80, true, '{"theme": "classic"}'),
  ('Crash Prime', 'crash', 'casino', 97.20, true, '{"multiplier": 2.5}'),
  ('Dice Rush', 'dice', 'casino', 95.90, true, '{"range": [1, 100]}');

create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_bets_user_id on public.bets(user_id);
create index if not exists idx_game_sessions_user_id on public.game_sessions(user_id);
create unique index if not exists idx_profiles_user_id_unique on public.profiles(user_id);
create unique index if not exists idx_wallets_user_id_unique on public.wallets(user_id);

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.bets enable row level security;
alter table public.game_sessions enable row level security;
alter table public.bonuses enable row level security;
alter table public.admin_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Wallet read own" on public.wallets for select using (auth.uid() = user_id);
create policy "Wallet update own" on public.wallets for update using (auth.uid() = user_id);
create policy "Transactions read own" on public.transactions for select using (auth.uid() = user_id);
create policy "Bets read own" on public.bets for select using (auth.uid() = user_id);
create policy "Games read all" on public.games for select using (true);
create policy "Admin read settings" on public.admin_settings for select using (true);
