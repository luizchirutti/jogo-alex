# Arquitetura da casa de apostas

## Visão geral

Este projeto foi dividido em duas frentes:

1. Frontend mockado da casa de apostas
2. Estrutura real de backend para conectar ao Supabase e evoluir para painel/admin, carteira e jogos próprios

## Stack recomendada

- Frontend: Next.js + TypeScript
- Backend: Node.js + Express
- Banco: Supabase Postgres
- Auth: Supabase Auth
- Realtime: Supabase Realtime

## Estrutura

- `index.html` - protótipo visual atual
- `styles.css` - visual da casa de apostas
- `script.js` - interações do mock
- `backend/` - base da API real
- `supabase/schema.sql` - esquema inicial do banco

## Camadas

### Frontend
- login/cadastro
- home
- carteira
- promoções
- jogos
- histórico
- painel admin

### API Gateway
- `/auth/register`
- `/auth/login`
- `/users/me`
- `/wallet/balance`
- `/wallet/deposit`
- `/games/catalog`
- `/games/play`
- `/admin/users` (admin)
- `/admin/settings`

### Banco
- usuários
- perfis
- carteira
- transações
- jogos
- apostas
- sessões de jogo
- configurações admin
- logs de auditoria

## Execução local

1. Execute `supabase/schema.sql` no projeto Supabase.
2. Configure `backend/.env` com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `PORT`.
3. Inicie a API com `cd backend` e `npm start`.
4. Sirva a raiz do projeto em `http://localhost:8000` com um servidor HTTP estático.
5. Confirme a API em `http://localhost:4000/health`.

O arquivo `supabase/fortune_tiger_schema.sql` é somente uma migração complementar de índices. Ele não deve ser usado no lugar do schema principal.

## Próximos passos

1. configurar as políticas de produção do Supabase
2. revisar e versionar regras de RTP por jogo com auditoria independente
3. substituir depósitos fictícios por um gateway aprovado
4. adicionar transações atômicas para débito e crédito da carteira
5. criar testes de autenticação, carteira, painel admin e rodadas
