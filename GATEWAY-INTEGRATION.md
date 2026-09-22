# Contrato futuro do gateway

Este projeto permanece em modo de demonstração. Nenhuma chamada financeira, autenticação externa, cartão, PIX, saque ou credencial de produção deve ser adicionada antes da aprovação técnica e jurídica.

## Dados necessários para a próxima etapa

- URL base do ambiente sandbox e do ambiente de produção
- documentação oficial dos endpoints
- método de autenticação e escopos
- criação e consulta de depósitos
- criação e consulta de saques
- consulta de saldo
- webhooks e assinatura de eventos
- códigos de erro e política de idempotência
- regras de conciliação e estorno
- requisitos de LGPD, antifraude e limites transacionais

## Interface esperada

```text
GatewayClient
  createDeposit(input) -> PendingTransaction
  getDepositStatus(transactionId) -> TransactionStatus
  requestWithdrawal(input) -> PendingTransaction
  getWithdrawalStatus(transactionId) -> TransactionStatus
  getBalance(accountId) -> Balance
  verifyWebhook(payload, signature) -> boolean
```

## Regras de segurança

- As credenciais devem existir apenas em variáveis de ambiente do servidor.
- O navegador nunca deve receber segredo do gateway.
- Toda operação precisa de idempotency key e registro auditável.
- O saldo exibido na aplicação deve ser confirmado pelo servidor.
- O protótipo atual deve continuar usando dados fictícios até a integração autorizada.
