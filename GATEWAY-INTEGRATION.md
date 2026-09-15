# Integração com o gateway Aura Verta

Status: **aprovado para conectar em ambiente de testes** (e-mail de 2026-09-09). A parceira ainda está finalizando os testes deles; a validação final fica pendente.

Documentação oficial: https://api-arvore.auraverta.app/docs (acesso gated pela credencial da conta; ver `AURAVERTA_API_KEY` em `backend/.env`, que é ignorado pelo git).

## O que já está implementado

- [backend/src/gateway/auravertaClient.js](backend/src/gateway/auravertaClient.js) — cliente HTTP do contrato (cobranças/saques/saldo Pix/capacidades), com idempotência e verificação de assinatura de webhook.
- [backend/src/routes/payments.js](backend/src/routes/payments.js) — rotas `POST/GET /payments/pix/deposits`, `POST/GET /payments/pix/withdrawals` e `GET /payments/capabilities`, com reconciliação de saldo local (`wallets`/`transactions`).
- `POST /webhooks/auraverta` em [backend/src/index.js](backend/src/index.js) — recebe `cobranca.estado_alterado` e `saque.estado_alterado`, valida a assinatura HMAC (`x-auraverta-signature`) e credita/estorna o saldo local. **Validado de ponta a ponta em 2026-09-10** com uma cobrança de teste via túnel público: a assinatura recebida bateu com `verifyWebhookSignature` usando o segredo atual.
- Saque com retry seguro: erros incertos da parceira (`PARCEIRA_INDISPONIVEL`, `IDEMPOTENCIA_RESULTADO_INDETERMINADO`) tentam de novo com a mesma `Idempotency-Key` e, se persistirem, ficam em `review_needed` **sem estornar o saldo** — a reconciliação acontece depois via webhook, casando pela `referenciaExterna` (não existe estorno automático nesse caso, para não arriscar saldo duplicado).
- Tela de depósito ([script.js](script.js)) pede valor + CPF/CNPJ do pagador, gera o Pix copia-e-cola real e tem botão para verificar pagamento.
- Tela de saque ([script.js](script.js)) pede valor + tipo/valor da chave Pix, com confirmação antes de enviar.
- (Modo "apresentação hospedada" continua 100% fictício/local, sem chamar o backend — não foi alterado.)

## Pendências antes da validação final

- **Deploy com URL pública HTTPS.** O teste do webhook foi feito com um túnel temporário (cloudflared quick tunnel), que já foi derrubado. Depois do deploy, defina `AURAVERTA_WEBHOOK_URL=https://api.seu-dominio.com/webhooks/auraverta` e execute `npm run register:webhook` dentro de `backend/`.
- Rodar `GET /v1/capacidades` (já exposto em `GET /payments/capabilities`) na UI para esconder/desabilitar depósito ou saque quando a operação não estiver disponível para a conta — hoje o backend já trata isso, mas o frontend ainda não consulta esse endpoint.
- Validar um depósito com pagamento real (pequeno valor) para confirmar que o webhook credita o saldo corretamente de ponta a ponta (o teste feito só cobriu a mudança de estado inicial, não uma cobrança paga).
- Validação final combinada com a Aura Verta (mencionada no e-mail original) — eles ainda estavam terminando os testes do lado deles.
- Aprovação jurídica/compliance (LGPD, antifraude, limites) para operar com dinheiro real.

## Regras de segurança

- As credenciais existem apenas em `backend/.env` (fora do git). Nunca commitar `AURAVERTA_API_KEY`/`AURAVERTA_WEBHOOK_SECRET`.
- O navegador nunca recebe o segredo do gateway — toda chamada parte do backend.
- Toda operação de saque/estorno usa `Idempotency-Key`.
- O saldo exibido na aplicação é sempre confirmado pelo servidor (webhook + consulta).
