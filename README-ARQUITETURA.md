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

## Próximo passo

1. criar projeto no Supabase
2. rodar `supabase/schema.sql`
3. configurar `.env` no backend
4. testar endpoints com o servidor local
5. conectar frontend autenticado ao backend
6. criar módulo de jogos próprios
