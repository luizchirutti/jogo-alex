import 'dotenv/config';
import { gatewayClient } from './gateway/auravertaClient.js';

const webhookUrl = process.env.AURAVERTA_WEBHOOK_URL;

if (!webhookUrl) {
  throw new Error('AURAVERTA_WEBHOOK_URL é obrigatória para registrar o webhook.');
}

const result = await gatewayClient.registerWebhook(webhookUrl);
console.log(`Webhook Aura Verta registrado: ${result.url || webhookUrl}`);