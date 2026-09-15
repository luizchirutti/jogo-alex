import { Router } from 'express';
import crypto from 'node:crypto';
import { gatewayClient, GatewayError } from '../gateway/auravertaClient.js';

const FINAL_DEPOSIT_FAILURE_STATES = new Set(['Rejeitada', 'Expirada', 'Cancelada', 'Falhada']);
const FINAL_WITHDRAWAL_FAILURE_STATES = new Set(['Rejeitado', 'Falhado', 'Devolvido']);
// Resultado incerto: a operação pode ter sido enviada à parceira sem resposta. Nunca estornar automaticamente.
const UNCERTAIN_WITHDRAWAL_ERROR_CODES = new Set(['PARCEIRA_INDISPONIVEL', 'IDEMPOTENCIA_RESULTADO_INDETERMINADO']);

async function withRetries(operation, { attempts = 3, isRetryable } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

export async function reconcileDeposit({ supabase, deposit }) {
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('reference', deposit.id)
    .eq('type', 'deposit')
    .maybeSingle();

  if (!transaction || transaction.status === 'completed') return;

  if (deposit.status === 'Concluida') {
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', transaction.user_id).maybeSingle();
    const nextBalance = Number(wallet?.balance || 0) + Number(transaction.amount);

    await supabase.from('wallets').update({ balance: nextBalance }).eq('user_id', transaction.user_id);
    await supabase
      .from('transactions')
      .update({ status: 'completed', metadata: { ...transaction.metadata, state: deposit.status } })
      .eq('id', transaction.id);
  } else if (FINAL_DEPOSIT_FAILURE_STATES.has(deposit.status)) {
    await supabase
      .from('transactions')
      .update({ status: 'failed', metadata: { ...transaction.metadata, state: deposit.status } })
      .eq('id', transaction.id);
  } else {
    await supabase
      .from('transactions')
      .update({ metadata: { ...transaction.metadata, state: deposit.status } })
      .eq('id', transaction.id);
  }
}

export async function reconcileWithdrawal({ supabase, withdrawal }) {
  let transaction = null;

  if (withdrawal.id) {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', withdrawal.id)
      .eq('type', 'withdrawal')
      .maybeSingle();
    transaction = data;
  }

  // Saque que ficou "review_needed" nunca recebeu o id do gateway — só é encontrável pela referência que nós geramos.
  if (!transaction && withdrawal.externalReference) {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('metadata->>external_reference', withdrawal.externalReference)
      .eq('type', 'withdrawal')
      .maybeSingle();
    transaction = data;
  }

  if (!transaction || transaction.status === 'completed' || transaction.status === 'failed') return;

  const metadata = { ...transaction.metadata, state: withdrawal.status };
  if (withdrawal.id) metadata.gateway_id = withdrawal.id;

  if (withdrawal.status === 'Concluido') {
    await supabase
      .from('transactions')
      .update({ status: 'completed', reference: withdrawal.id || transaction.reference, metadata })
      .eq('id', transaction.id);
  } else if (FINAL_WITHDRAWAL_FAILURE_STATES.has(withdrawal.status)) {
    // O valor já foi debitado na solicitação (ver POST /pix/withdrawals) — devolve o saldo reservado.
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', transaction.user_id).maybeSingle();
    const nextBalance = Number(wallet?.balance || 0) + Number(transaction.amount);

    await supabase.from('wallets').update({ balance: nextBalance }).eq('user_id', transaction.user_id);
    await supabase
      .from('transactions')
      .update({ status: 'failed', reference: withdrawal.id || transaction.reference, metadata })
      .eq('id', transaction.id);
  } else {
    await supabase
      .from('transactions')
      .update({ reference: withdrawal.id || transaction.reference, metadata })
      .eq('id', transaction.id);
  }
}

function sendGatewayError(res, error) {
  if (error instanceof GatewayError) {
    return res.status(error.httpStatus || 502).json({ error: error.code, message: error.message, details: error.details });
  }
  return res.status(500).json({ error: error.message });
}

export function createPaymentsRouter({ supabase, getAuthenticatedUser }) {
  const router = Router();

  router.post('/pix/deposits', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido ou ausente.' });

    const {
      amount,
      payer_name: payerName,
      payer_document: payerDocument,
      payer_email: payerEmail,
      description
    } = req.body || {};
    const amountReais = Number(amount);

    if (!Number.isFinite(amountReais) || amountReais <= 0) {
      return res.status(400).json({ error: 'amount deve ser maior que zero.' });
    }
    if (!payerDocument) {
      return res.status(400).json({ error: 'payer_document (CPF/CNPJ) é obrigatório.' });
    }

    try {
      const idempotencyKey = crypto.randomUUID();
      const deposit = await gatewayClient.createDeposit({
        amountReais,
        payerName: payerName || user.user_metadata?.name || user.email,
        payerDocument,
        payerEmail: payerEmail || user.email,
        description: description || 'Depósito Jogo Alex',
        externalReference: `deposit-${user.id}-${Date.now()}`,
        idempotencyKey
      });

      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: amountReais,
        status: 'pending',
        reference: deposit.id,
        metadata: { gateway: 'auraverta', idempotency_key: idempotencyKey, state: deposit.status }
      });

      if (insertError) return res.status(400).json({ error: insertError.message });

      return res.status(201).json({ ok: true, deposit });
    } catch (error) {
      return sendGatewayError(res, error);
    }
  });

  router.get('/pix/deposits/:id', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido ou ausente.' });

    try {
      const deposit = await gatewayClient.getDepositStatus(req.params.id);
      await reconcileDeposit({ supabase, deposit });
      return res.json({ ok: true, deposit });
    } catch (error) {
      return sendGatewayError(res, error);
    }
  });

  router.post('/pix/withdrawals', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido ou ausente.' });

    const { amount, pix_key_type: pixKeyType, pix_key_value: pixKeyValue } = req.body || {};
    const amountReais = Number(amount);

    if (!Number.isFinite(amountReais) || amountReais <= 0) {
      return res.status(400).json({ error: 'amount deve ser maior que zero.' });
    }
    if (!pixKeyType || !pixKeyValue) {
      return res.status(400).json({ error: 'pix_key_type e pix_key_value são obrigatórios.' });
    }

    try {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) return res.status(400).json({ error: walletError.message });

      const currentBalance = Number(wallet?.balance || 0);
      if (currentBalance < amountReais) {
        return res.status(400).json({ error: 'Saldo insuficiente para este saque.' });
      }

      // Reserva o valor antes de chamar o gateway, para o saldo nunca ficar negativo.
      const { error: debitError } = await supabase
        .from('wallets')
        .update({ balance: currentBalance - amountReais })
        .eq('user_id', user.id);

      if (debitError) return res.status(400).json({ error: debitError.message });

      const idempotencyKey = crypto.randomUUID();
      const externalReference = `withdrawal-${user.id}-${Date.now()}`;

      try {
        const withdrawal = await withRetries(
          () => gatewayClient.requestWithdrawal({ amountReais, pixKeyType, pixKeyValue, externalReference, idempotencyKey }),
          { attempts: 3, isRetryable: (error) => gatewayClient.isRetryable(error) }
        );

        const { error: insertError } = await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'withdrawal',
          amount: amountReais,
          status: 'pending',
          reference: withdrawal.id,
          metadata: {
            gateway: 'auraverta',
            idempotency_key: idempotencyKey,
            external_reference: externalReference,
            state: withdrawal.status
          }
        });

        if (insertError) return res.status(400).json({ error: insertError.message });

        return res.status(202).json({ ok: true, withdrawal, balance: currentBalance - amountReais });
      } catch (gatewayError) {
        if (gatewayError instanceof GatewayError && UNCERTAIN_WITHDRAWAL_ERROR_CODES.has(gatewayError.code)) {
          // Não sabemos se o saque foi efetivado do lado da parceira: não estorna o saldo reservado.
          // A conciliação acontece pelo webhook (casado por external_reference) quando a situação se resolver.
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'withdrawal',
            amount: amountReais,
            status: 'review_needed',
            reference: null,
            metadata: {
              gateway: 'auraverta',
              idempotency_key: idempotencyKey,
              external_reference: externalReference,
              error_code: gatewayError.code
            }
          });

          return res.status(202).json({
            ok: true,
            pending_review: true,
            message: 'Não foi possível confirmar o saque com o gateway agora. O valor foi reservado e será conciliado automaticamente assim que a situação se resolver.'
          });
        }

        // Falha definitiva (dados inválidos, destino não autorizado etc.): devolve o valor reservado.
        await supabase.from('wallets').update({ balance: currentBalance }).eq('user_id', user.id);
        throw gatewayError;
      }
    } catch (error) {
      return sendGatewayError(res, error);
    }
  });

  router.get('/pix/withdrawals/:id', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido ou ausente.' });

    try {
      const withdrawal = await gatewayClient.getWithdrawalStatus(req.params.id);
      await reconcileWithdrawal({ supabase, withdrawal });
      return res.json({ ok: true, withdrawal });
    } catch (error) {
      return sendGatewayError(res, error);
    }
  });

  router.get('/capabilities', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido ou ausente.' });

    try {
      const operations = await gatewayClient.getCapabilities();
      return res.json({
        ok: true,
        operations,
        // A ausência de uma operação é estado normal da conta agora, não indisponível por bug — ver docs/guia/05-erros.
        canDeposit: operations.includes('POST /v1/cobrancas'),
        canWithdraw: operations.includes('POST /v1/saques')
      });
    } catch (error) {
      return sendGatewayError(res, error);
    }
  });

  return router;
}
