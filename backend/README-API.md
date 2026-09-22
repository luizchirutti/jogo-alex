# API segura de conta e saldo

Antes de iniciar o servidor, aplique `supabase/schema.sql` e depois
`supabase/secure_wallet_api.sql` no banco Postgres do Supabase. Configure
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente do servidor.

`POST /api/login` recebe `email` (ou `phone`) e `password` e devolve o JWT
`token` do Supabase. Envie esse token nas demais chamadas:

```http
Authorization: Bearer <token>
```

- `GET /api/balance` devolve o saldo persistido.
- `POST /api/spin` recebe somente `{ "game": "jade-cascade", "bet": 1 }`
  ou `olympus-ascend`. O resultado, prêmio, débito, crédito e rate limit são
  tratados no servidor/Postgres. Há no máximo uma rodada por segundo por usuário.
- `POST /api/deposit` recebe `{ "payment_reference": "..." }`. A referência
  precisa existir em `payment_intents` como `approved`, criada pelo webhook
  autenticado do provedor de pagamentos. Valores enviados pelo browser nunca
  são usados para creditar saldo.

As funções RPC usam bloqueio de linha e fazem a mutação de saldo, a transação e
o rate limit na mesma transação Postgres. Não exponha as RPCs ao papel `anon`.
