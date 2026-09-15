import crypto from 'node:crypto';

// Contrato documentado em https://api-arvore.auraverta.app/docs
const DEPOSIT_RETRYABLE_STATES = new Set(['PARCEIRA_INDISPONIVEL', 'ERRO_INTERNO']);

export class GatewayError extends Error {
  constructor(code, message, details, httpStatus) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.details = details;
    this.httpStatus = httpStatus;
  }
}

const toCentavos = (valorReais) => Math.round(Number(valorReais) * 100);
const toReais = (valorCentavos) => Number(valorCentavos) / 100;

const normalizeCobranca = (data) => ({
  id: data.id,
  status: data.estado,
  amountReais: toReais(data.valor),
  createdAt: data.criadaEm,
  expiresAt: data.expiraEm,
  paidAt: data.pagaEm,
  pix: data.pix || null,
  refund: data.estorno
    ? { amountReais: toReais(data.estorno.valor), at: data.estorno.em, reason: data.estorno.motivo }
    : null,
  externalReference: data.referenciaExterna
});

const normalizeSaque = (data) => ({
  id: data.id,
  status: data.estado,
  amountReais: toReais(data.valor),
  requestedAt: data.solicitadoEm,
  completedAt: data.concluidoEm,
  externalReference: data.referenciaExterna
});

async function request(method, path, { body, idempotencyKey } = {}) {
  const apiKey = process.env.AURAVERTA_API_KEY;
  const baseUrl = process.env.AURAVERTA_BASE_URL || 'https://api-arvore.auraverta.app';

  if (!apiKey) {
    throw new Error('AURAVERTA_API_KEY não configurada.');
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new GatewayError(
      payload?.erro || 'ERRO_DESCONHECIDO',
      payload?.mensagem || 'Falha na chamada ao gateway de pagamento.',
      payload?.detalhes,
      response.status
    );
  }

  return payload;
}

export const gatewayClient = {
  async getCapabilities() {
    const data = await request('GET', '/v1/capacidades');
    return data.operacoes;
  },

  async getBalance() {
    const data = await request('GET', '/v1/saldo');
    return { availableReais: toReais(data.disponivel), partial: data.parcial, byPartner: data.porParceira };
  },

  async createDeposit({
    amountReais,
    payerName,
    payerDocument,
    payerEmail,
    payerPhone,
    description,
    externalReference,
    expiresInSeconds,
    idempotencyKey
  }) {
    const body = {
      valor: toCentavos(amountReais),
      pagador: {
        nome: payerName,
        documento: payerDocument,
        ...(payerEmail ? { email: payerEmail } : {}),
        ...(payerPhone ? { telefone: payerPhone } : {})
      },
      ...(description ? { descricao: description } : {}),
      ...(expiresInSeconds ? { expiraEmSegundos: expiresInSeconds } : {}),
      ...(externalReference ? { referenciaExterna: externalReference } : {})
    };

    const data = await request('POST', '/v1/cobrancas', {
      body,
      idempotencyKey: idempotencyKey || crypto.randomUUID()
    });
    return normalizeCobranca(data);
  },

  async getDepositStatus(transactionId) {
    const data = await request('GET', `/v1/cobrancas/${transactionId}`);
    return normalizeCobranca(data);
  },

  async refundDeposit(transactionId, { amountReais, reason, idempotencyKey } = {}) {
    const body = {};
    if (amountReais !== undefined) body.valor = toCentavos(amountReais);
    if (reason) body.motivo = reason;

    const data = await request('POST', `/v1/cobrancas/${transactionId}/estorno`, {
      body,
      idempotencyKey: idempotencyKey || crypto.randomUUID()
    });
    return normalizeCobranca(data);
  },

  async requestWithdrawal({ amountReais, pixKeyType, pixKeyValue, externalReference, idempotencyKey }) {
    const body = {
      valor: toCentavos(amountReais),
      chavePix: { tipo: pixKeyType, valor: pixKeyValue },
      ...(externalReference ? { referenciaExterna: externalReference } : {})
    };

    const data = await request('POST', '/v1/saques', {
      body,
      idempotencyKey: idempotencyKey || crypto.randomUUID()
    });
    return normalizeSaque(data);
  },

  async getWithdrawalStatus(transactionId) {
    const data = await request('GET', `/v1/saques/${transactionId}`);
    return normalizeSaque(data);
  },

  async registerWebhook(url) {
    return request('PUT', '/v1/webhook', { body: { url } });
  },

  async getWebhook() {
    try {
      return await request('GET', '/v1/webhook');
    } catch (error) {
      if (error instanceof GatewayError && error.code === 'RECURSO_NAO_ENCONTRADO') return null;
      throw error;
    }
  },

  async removeWebhook() {
    return request('DELETE', '/v1/webhook');
  },

  // Segue exatamente o algoritmo documentado em /docs/guia/06-webhooks.
  verifyWebhookSignature(rawBody, signatureHeader, secret) {
    if (!signatureHeader || !secret) return false;

    const parts = new Map(signatureHeader.split(',').map((p) => p.trim().split('=')));
    const timestamp = parts.get('t');
    const receivedSignature = parts.get('v1');
    if (!timestamp || !receivedSignature) return false;

    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  },

  isRetryable(error) {
    return error instanceof GatewayError && DEPOSIT_RETRYABLE_STATES.has(error.code);
  }
};
