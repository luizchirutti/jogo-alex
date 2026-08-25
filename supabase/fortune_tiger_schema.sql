-- O Fortune Tiger usa o schema principal em schema.sql.
-- Execute schema.sql uma única vez; este arquivo é apenas uma migração
-- complementar de índices para as tabelas já existentes.

create index if not exists idx_game_sessions_fortune_tiger
  on public.game_sessions (user_id, created_at desc);

create index if not exists idx_bets_game_metadata
  on public.bets using gin (metadata);
