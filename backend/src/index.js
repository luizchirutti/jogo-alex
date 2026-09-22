import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import FortuneTigerEngine from './fortuneTigerEngine.js';
import JadeCascadeEngine from './jadeCascadeEngine.js';
import OlympusAscendEngine from './olympusAscendEngine.js';
import { FestivalEngine, FESTIVAL_GAMES } from './festivalEngine.js';
import { CascadeRealmEngine, CASCADE_REALMS } from './cascadeRealmsEngine.js';
import { GLOBAL_GAMES } from './globalGames.js';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

const getAuthToken = (req) => {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

const getAuthenticatedUser = async (req) => {
  const token = getAuthToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
};

const normalizeIdentifierToEmail = (value) => {
  if (!value) return null;

  const candidate = String(value).trim();
  if (candidate.includes('@')) {
    return candidate.toLowerCase();
  }

  const digits = candidate.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  return `demo+${digits}@gmail.com`;
};

const ensureUserRecords = async (user, metadata = {}) => {
  const userName = metadata.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Jogador';
  const phone = metadata.phone || user.user_metadata?.phone || null;

  const { data: existingUserRow } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

  const { data: userRow, error: userError } = existingUserRow
    ? await supabase.from('users').update({ name: userName, email: user.email, phone, role: 'player', vip_level: 0, status: 'active' }).eq('id', user.id).select().single()
    : await supabase.from('users').insert({ id: user.id, name: userName, email: user.email, phone, role: 'player', vip_level: 0, status: 'active' }).select().single();

  if (userError) {
    console.error('Save users error:', userError.message);
  }

  const { data: existingProfileRow } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

  const { data: profileRow, error: profileError } = existingProfileRow
    ? await supabase.from('profiles').update({ country: metadata.country || 'BR', currency: 'BRL', timezone: 'America/Sao_Paulo', kyc_status: 'not_started' }).eq('user_id', user.id).select().single()
    : await supabase.from('profiles').insert({ user_id: user.id, country: metadata.country || 'BR', currency: 'BRL', timezone: 'America/Sao_Paulo', kyc_status: 'not_started' }).select().single();

  if (profileError) {
    console.error('Save profiles error:', profileError.message);
  }

  const { data: existingWalletRow } = await supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();

  const { data: walletRow, error: walletError } = existingWalletRow
    ? await supabase.from('wallets').update({ balance: Number(existingWalletRow.balance || 0), currency: 'BRL', status: 'active' }).eq('user_id', user.id).select().single()
    : await supabase.from('wallets').insert({ user_id: user.id, balance: 0, currency: 'BRL', status: 'active' }).select().single();

  if (walletError) {
    console.error('Save wallets error:', walletError.message);
  }

  return {
    user: userRow || existingUserRow || { id: user.id, name: userName, email: user.email, phone },
    profile: profileRow || existingProfileRow,
    wallet: walletRow || existingWalletRow || { user_id: user.id, balance: 0, currency: 'BRL' }
  };
};

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'jogo-alex-backend', status: 'running' });
});

const API_GAMES = {
  'jade-cascade': JadeCascadeEngine,
  'olympus-ascend': OlympusAscendEngine,
  ...Object.fromEntries(Object.keys(FESTIVAL_GAMES).map((id) => [id, class FestivalGame extends FestivalEngine { constructor() { super(FESTIVAL_GAMES[id]); } }])),
  ...Object.fromEntries(Object.keys(CASCADE_REALMS).map((id) => [id, class CascadeRealmGame extends CascadeRealmEngine { constructor() { super(CASCADE_REALMS[id]); } }])),
  ...Object.fromEntries(Object.keys(GLOBAL_GAMES).map((id) => [id, class GlobalGame extends FestivalEngine { constructor() { super(GLOBAL_GAMES[id]); } }]))
};

const apiUser = async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Token JWT inválido ou ausente.' });
    return null;
  }
  await ensureUserRecords(user, { name: user.user_metadata?.name, phone: user.user_metadata?.phone });
  return user;
};

// Supabase Auth signs the access_token as a JWT. No password or secret is
// reimplemented by this API.
app.post('/api/login', async (req, res) => {
  const { email, phone, password } = req.body || {};
  const resolvedEmail = normalizeIdentifierToEmail(email || phone);
  if (!resolvedEmail || typeof password !== 'string' || password.length < 1) {
    return res.status(400).json({ error: 'email/telefone e password são obrigatórios.' });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
  if (error || !data.session || !data.user) return res.status(401).json({ error: 'Credenciais inválidas.' });
  await ensureUserRecords(data.user);
  return res.json({
    token: data.session.access_token,
    expires_at: data.session.expires_at,
    user: { id: data.user.id, email: data.user.email }
  });
});

app.get('/api/balance', async (req, res) => {
  const user = await apiUser(req, res);
  if (!user) return;
  const { data: wallet, error } = await supabase.from('wallets')
    .select('balance, currency, updated_at').eq('user_id', user.id).single();
  if (error) return res.status(500).json({ error: 'Não foi possível obter o saldo.' });
  return res.json({ balance: Number(wallet.balance), currency: wallet.currency, updated_at: wallet.updated_at });
});

app.post('/api/deposit', async (req, res) => {
  const user = await apiUser(req, res);
  if (!user) return;
  const paymentReference = String(req.body?.payment_reference || '').trim();
  if (!paymentReference) return res.status(400).json({ error: 'payment_reference é obrigatório.' });
  const { data, error } = await supabase.rpc('credit_approved_deposit', {
    p_user_id: user.id, p_provider_reference: paymentReference
  });
  if (error) return res.status(error.message.includes('NOT_APPROVED') ? 409 : 400).json({ error: error.message });
  const settled = data?.[0];
  return res.json({ ok: true, balance: Number(settled.new_balance), transaction_id: settled.transaction_id });
});

app.post('/api/spin', async (req, res) => {
  const user = await apiUser(req, res);
  if (!user) return;
  const game = String(req.body?.game || 'jade-cascade');
  const bet = Number(req.body?.bet);
  if (!API_GAMES[game] || !Number.isFinite(bet) || bet < 0.1 || bet > 5000) {
    return res.status(400).json({ error: 'Jogo ou aposta inválidos.' });
  }
  // Outcome and payout are generated here, never accepted from the browser.
  const outcome = new API_GAMES[game]().spin(bet);
  const { data, error } = await supabase.rpc('settle_slot_spin', {
    p_user_id: user.id, p_stake: outcome.betAmount, p_payout: outcome.winAmount,
    p_game: game, p_result: outcome
  });
  if (error) {
    const status = error.message.includes('SPIN_RATE_LIMIT') ? 429 : error.message.includes('INSUFFICIENT_BALANCE') ? 409 : 400;
    return res.status(status).json({ error: error.message });
  }
  const settled = data?.[0];
  return res.json({ ok: true, outcome, balance: Number(settled.new_balance), transaction_id: settled.transaction_id });
});

app.post('/auth/register', async (req, res) => {
  const { email, phone, password, name } = req.body;
  const resolvedEmail = normalizeIdentifierToEmail(email || phone);

  if (!resolvedEmail || !password || !name) {
    return res.status(400).json({ error: 'email ou telefone válido, password e name são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: resolvedEmail,
      password,
      options: {
        data: {
          name,
          phone: phone || null
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      await ensureUserRecords(data.user, { name, phone });
    }

    return res.status(201).json({ user: data.user, session: data.session });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, phone, password } = req.body;
  const resolvedEmail = normalizeIdentifierToEmail(email || phone);

  if (!resolvedEmail || !password) {
    return res.status(400).json({ error: 'email ou telefone válido e password são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    if (data.user) {
      await ensureUserRecords(data.user, { name: data.user.user_metadata?.name, phone: data.user.user_metadata?.phone });
    }

    return res.json({ user: data.user, session: data.session });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/users/me', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou ausente.' });
  }

  try {
    await ensureUserRecords(user, { name: user.user_metadata?.name || user.email?.split('@')[0], phone: user.user_metadata?.phone || null });

    const { data: userRow, error: userError } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
    const { data: profileRow, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    const { data: walletRow, error: walletError } = await supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();

    if (userError || profileError || walletError) {
      return res.status(400).json({ error: 'Não foi possível carregar o perfil do usuário.' });
    }

    return res.json({ user: userRow || { id: user.id, email: user.email }, profile: profileRow || null, wallet: walletRow || { user_id: user.id, balance: 0, currency: 'BRL' } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/wallet/balance', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou ausente.' });
  }

  try {
    const walletPayload = await ensureUserRecords(user, { name: user.user_metadata?.name || user.email?.split('@')[0], phone: user.user_metadata?.phone || null });
    const { data, error } = await supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data: data || walletPayload.wallet || { user_id: user.id, balance: 0, currency: 'BRL' } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/wallet/deposit', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const { amount } = req.body;

  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou ausente.' });
  }

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount deve ser maior que zero.' });
  }

  try {
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError) {
      return res.status(400).json({ error: walletError.message });
    }

    const nextBalance = Number(wallet?.balance || 0) + Number(amount);

    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .upsert({
        user_id: user.id,
        balance: nextBalance,
        currency: 'BRL',
        status: 'active'
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount: Number(amount),
      status: 'completed',
      reference: `deposit-${Date.now()}`,
      metadata: { source: 'demo-api' }
    });

    return res.json({ ok: true, wallet: updatedWallet, amount: Number(amount), balance: nextBalance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/games/catalog', async (req, res) => {
  try {
    const { data, error } = await supabase.from('games').select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/games/fortune-tiger/spin', async (req, res) => {
  const { bet_amount } = req.body || {};
  const engine = new FortuneTigerEngine({ betAmount: Number(bet_amount) || 5 });
  const result = engine.spin();

  const user = await getAuthenticatedUser(req);

  if (user) {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({ user_id: user.id, start_time: new Date().toISOString() })
        .select()
        .single();

      if (!sessionError && sessionData?.id) {
        await supabase.from('bet_history').insert({
          user_id: user.id,
          session_id: sessionData.id,
          bet_amount: result.betAmount,
          win_amount: result.winAmount,
          grid_result_json: { grid: result.grid, symbols: result.symbols },
          multiplier: result.multiplier,
          is_feature_triggered: result.featureTriggered
        });
      }
    } catch (dbError) {
      console.warn('Falha ao registrar sessão do Fortune Tiger:', dbError.message);
    }
  }

  return res.json({
    ok: true,
    data: {
      ...result,
      game: 'fortune-tiger',
      provider: 'proprietary'
    }
  });
});

const runProprietarySpin = (Engine, game) => async (req, res) => {
  const { bet_amount } = req.body || {};
  const result = new Engine().spin(bet_amount);
  const user = await getAuthenticatedUser(req);

  if (user) {
    try {
      const { data: session } = await supabase.from('game_sessions')
        .insert({ user_id: user.id, start_time: new Date().toISOString() }).select().single();
      if (session?.id) await supabase.from('bet_history').insert({
        user_id: user.id, session_id: session.id, bet_amount: result.betAmount,
        win_amount: result.winAmount, grid_result_json: { grid: result.grid, cascades: result.cascades, clusters: result.clusters },
        multiplier: result.multiplier || 1, is_feature_triggered: result.featureTriggered
      });
    } catch (error) { console.warn(`Falha ao registrar ${game}:`, error.message); }
  }
  return res.json({ ok: true, data: { ...result, game, provider: 'proprietary', rng: 'server-side-crypto' } });
};

app.post('/games/jade-cascade/spin', runProprietarySpin(JadeCascadeEngine, 'jade-cascade'));
app.post('/games/olympus-ascend/spin', runProprietarySpin(OlympusAscendEngine, 'olympus-ascend'));

app.post('/games/play', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const { game_id, bet_amount } = req.body;

  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou ausente.' });
  }

  if (!game_id || !bet_amount) {
    return res.status(400).json({ error: 'game_id e bet_amount são obrigatórios.' });
  }

  try {
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError) {
      return res.status(400).json({ error: walletError.message });
    }

    const stake = Number(bet_amount);
    const payout = stake * 1.7;
    const nextBalance = Number(wallet?.balance || 0) - stake + payout;

    await supabase.from('wallets').upsert({
      user_id: user.id,
      balance: nextBalance,
      currency: 'BRL',
      status: 'active'
    }, { onConflict: 'user_id' });

    await supabase.from('bets').insert({
      user_id: user.id,
      game_id,
      stake,
      payout,
      result: 'win',
      metadata: { demo: true }
    });

    return res.json({
      ok: true,
      message: 'Rodada demo registrada com sucesso.',
      game_id,
      bet_amount: stake,
      payout,
      balance: nextBalance,
      result: {
        win: true,
        payout,
        status: 'demo'
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/admin/settings', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou ausente.' });
  }

  try {
    const { data, error } = await supabase.from('admin_settings').select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const parsed = Object.fromEntries(
      (data || []).map((row) => [row.key, row.value?.value ?? row.value])
    );

    return res.json({ data: parsed });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/admin/settings', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou ausente.' });
  }

  const incoming = req.body || {};

  if (!incoming || typeof incoming !== 'object' || !Object.keys(incoming).length) {
    return res.status(400).json({ error: 'Nenhuma configuração foi enviada.' });
  }

  try {
    const { data: userRow } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();

    const entries = Object.entries(incoming).map(([key, value]) => ({
      key,
      value: { value },
      updated_by: userRow?.id || null,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('admin_settings')
      .upsert(entries, { onConflict: 'key' })
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const parsed = Object.fromEntries((data || []).map((row) => [row.key, row.value?.value ?? row.value]));

    return res.json({ ok: true, data: parsed });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
