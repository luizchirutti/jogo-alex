-- Apply after schema.sql.  All wallet mutations are made through these RPCs,
-- so a client cannot choose either a payout or a balance.

create table if not exists public.spin_rate_limits (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_spin_at timestamptz not null default now()
);

-- Payment providers/webhooks create an approved intent with the provider's
-- amount.  The browser only submits the reference, never an amount to credit.
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider_reference text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'BRL',
  status text not null check (status in ('pending', 'approved', 'credited', 'failed')) default 'pending',
  created_at timestamptz not null default now(),
  credited_at timestamptz
);

create or replace function public.settle_slot_spin(
  p_user_id uuid,
  p_stake numeric,
  p_payout numeric,
  p_game text,
  p_result jsonb
) returns table (new_balance numeric, transaction_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_wallet public.wallets%rowtype;
  v_last_spin timestamptz;
  v_transaction_id uuid := gen_random_uuid();
begin
  if p_stake is null or p_stake <= 0 or p_stake > 5000 or p_payout is null or p_payout < 0 then
    raise exception 'INVALID_SPIN_VALUES' using errcode = '22023';
  end if;

  select last_spin_at into v_last_spin from public.spin_rate_limits where user_id = p_user_id for update;
  if found then
    if v_last_spin > clock_timestamp() - interval '1 second' then
      raise exception 'SPIN_RATE_LIMIT' using errcode = 'P0001';
    end if;
    update public.spin_rate_limits set last_spin_at = clock_timestamp() where user_id = p_user_id;
  else
    insert into public.spin_rate_limits (user_id, last_spin_at) values (p_user_id, clock_timestamp());
  end if;

  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found or v_wallet.status <> 'active' then raise exception 'WALLET_UNAVAILABLE' using errcode = 'P0001'; end if;
  if v_wallet.balance < p_stake then raise exception 'INSUFFICIENT_BALANCE' using errcode = 'P0001'; end if;

  update public.wallets set balance = balance - p_stake + p_payout, updated_at = clock_timestamp()
    where user_id = p_user_id returning balance into new_balance;
  insert into public.transactions (id, user_id, type, amount, status, reference, metadata) values
    (v_transaction_id, p_user_id, 'spin', p_stake - p_payout, 'completed', 'spin-' || v_transaction_id,
     jsonb_build_object('game', p_game, 'stake', p_stake, 'payout', p_payout, 'result', p_result));
  transaction_id := v_transaction_id;
  return next;
end;
$$;

create or replace function public.credit_approved_deposit(p_user_id uuid, p_provider_reference text)
returns table (new_balance numeric, transaction_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_intent public.payment_intents%rowtype;
  v_transaction_id uuid := gen_random_uuid();
begin
  select * into v_intent from public.payment_intents
    where user_id = p_user_id and provider_reference = p_provider_reference for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_intent.status <> 'approved' then raise exception 'PAYMENT_NOT_APPROVED' using errcode = 'P0001'; end if;

  update public.wallets set balance = balance + v_intent.amount, updated_at = clock_timestamp()
    where user_id = p_user_id and status = 'active' returning balance into new_balance;
  if not found then raise exception 'WALLET_UNAVAILABLE' using errcode = 'P0001'; end if;
  update public.payment_intents set status = 'credited', credited_at = clock_timestamp() where id = v_intent.id;
  insert into public.transactions (id, user_id, type, amount, status, reference, metadata) values
    (v_transaction_id, p_user_id, 'deposit', v_intent.amount, 'completed', v_intent.provider_reference,
     jsonb_build_object('payment_intent_id', v_intent.id));
  transaction_id := v_transaction_id;
  return next;
end;
$$;

revoke all on function public.settle_slot_spin(uuid, numeric, numeric, text, jsonb) from public;
revoke all on function public.credit_approved_deposit(uuid, text) from public;
