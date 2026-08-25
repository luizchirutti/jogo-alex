import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import FortuneTigerEngine from '../../GameEngine.js';
import { supabase } from './config/supabase.js';

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

const getAdminUser = async (req) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return null;

  const { data: userRow, error } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (error || userRow?.role !== 'admin' || userRow.status !== 'active') return null;
  return user;
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
    ? await supabase.from('users').update({ name: userName, email: user.email, phone, vip_level: 0, status: 'active' }).eq('id', user.id).select().single()
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

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:8000';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'jogo-alex-backend', status: 'running' });
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
  const requestedBet = Number(req.body?.bet_amount);
  const betAmount = Number.isFinite(requestedBet) && requestedBet > 0 ? requestedBet : 5;
  const engine = new FortuneTigerEngine({ betAmount });
  const result = engine.spin();

  const user = await getAuthenticatedUser(req);
  let balance = null;

  if (user) {
    try {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      const currentBalance = Number(wallet?.balance || 0);
      if (currentBalance < result.betAmount) {
        return res.status(400).json({ error: 'Saldo insuficiente para esta aposta.' });
      }

      balance = Number((currentBalance - result.betAmount + result.winAmount).toFixed(2));

      const { error: balanceError } = await supabase.from('wallets').upsert({
        user_id: user.id,
        balance,
        currency: 'BRL',
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (balanceError) throw balanceError;

      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          bet_amount: result.betAmount,
          payout_amount: result.winAmount,
          result_json: result,
          status: 'completed'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const { error: betError } = await supabase.from('bets').insert({
        user_id: user.id,
        stake: result.betAmount,
        payout: result.winAmount,
        result: result.isWin ? 'win' : 'loss',
        metadata: {
          game: 'fortune-tiger',
          session_id: sessionData.id,
          grid: result.grid,
          feature_triggered: result.featureTriggered
        }
      });

      if (betError) throw betError;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bet',
        amount: result.betAmount,
        status: 'completed',
        reference: `fortune-tiger-${sessionData.id}`,
        metadata: { payout: result.winAmount }
      });
    } catch (dbError) {
      console.error('Falha ao registrar rodada do Fortune Tiger:', dbError.message);
      return res.status(500).json({ error: 'Não foi possível registrar a rodada.' });
    }
  }

  return res.json({
    ok: true,
    data: {
      ...result,
      game: 'fortune-tiger',
      provider: 'proprietary',
      balance
    }
  });
});

app.post('/games/play', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  const { game_id, bet_amount } = req.body;

  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou ausente.' });
  }

  if (!game_id || bet_amount === undefined || bet_amount === null) {
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
    if (!Number.isFinite(stake) || stake <= 0) {
      return res.status(400).json({ error: 'bet_amount deve ser maior que zero.' });
    }

    const currentBalance = Number(wallet?.balance || 0);
    if (currentBalance < stake) {
      return res.status(400).json({ error: 'Saldo insuficiente para esta aposta.' });
    }

    const payout = stake * 1.7;
    const nextBalance = Number((currentBalance - stake + payout).toFixed(2));

    const { error: balanceError } = await supabase.from('wallets').upsert({
      user_id: user.id,
      balance: nextBalance,
      currency: 'BRL',
      status: 'active'
    }, { onConflict: 'user_id' });

    if (balanceError) {
      return res.status(400).json({ error: balanceError.message });
    }

    const { error: betError } = await supabase.from('bets').insert({
      user_id: user.id,
      game_id,
      stake,
      payout,
      result: 'win',
      metadata: { demo: true }
    });

    if (betError) {
      return res.status(400).json({ error: betError.message });
    }

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
  const user = await getAdminUser(req);

  if (!user) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
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
  const user = await getAdminUser(req);

  if (!user) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
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
