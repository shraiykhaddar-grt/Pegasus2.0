const logger = require('../utils/logger');
const config = require('../config/config');
const repo = require('../repositories/paymentRepository');
const paytm = require('../integrations/paytmClient');
const sms = require('../integrations/smsClient');
const { SignatureVerificationError, ProviderError } = require('../errors');
const idempStore = require('../utils/idempotencyStore');
const { withRetry } = require('../utils/retry');

function assertNumber(n, field) {
  if (typeof n !== 'number' || Number.isNaN(n)) {
    const err = new Error(`${field} must be a number`);
    err.status = 400;
    throw err;
  }
}

function assertString(s, field) {
  if (!s || typeof s !== 'string') {
    const err = new Error(`${field} must be a string`);
    err.status = 400;
    throw err;
  }
}

async function createPayment({ amount, currency = 'INR', customerId, phone }) {
  assertNumber(amount, 'amount');
  assertString(currency, 'currency');
  assertString(customerId, 'customerId');
  assertString(phone, 'phone');

  const orderId = `ORDER_${Date.now().toString(36)}`;

  logger.info({ amount, currency, customerId, orderId }, 'payment.create.request');

  let paytmOrder;
  try {
    paytmOrder = await withRetry(
      async (attempt) => {
        try {
          const res = await paytm.createOrder({ amount, currency, orderId, customerId, callbackUrl: config.paytm.callbackUrl });
          if (!res || !res.orderId || !res.txnToken) {
            throw new ProviderError('Invalid provider response', { details: { res }, retryable: false });
          }
          return res;
        } catch (e) {
          // normalize error to ProviderError
          if (!(e instanceof ProviderError)) {
            throw new ProviderError(e.message || 'Provider call failed', { details: { cause: e }, retryable: true });
          }
          throw e;
        }
      },
      {
        retries: 2,
        minDelayMs: 100,
        factor: 2,
        maxDelayMs: 1000,
        onRetry: (err, attempt, delay) => {
          logger.warn({ orderId, attempt, delay, err }, 'payment.create.provider.retry');
        },
      }
    );
  } catch (err) {
    logger.error({ orderId, err }, 'payment.create.failed');
    throw err;
  }

  const payment = repo.create({
    amount,
    currency,
    customerId,
    phone,
    orderId: paytmOrder.orderId,
    txnToken: paytmOrder.txnToken,
    status: 'PENDING',
  });

  logger.info({ paymentId: payment.id, orderId }, 'payment.create.succeeded');
  return payment;
}

function verifyPaytmSignature(payload, signature, securityContext = {}) {
  if (!signature) {
    logger.warn({ securityContext, payloadMeta: { orderId: payload && payload.orderId } }, 'security.signature.missing');
    throw new SignatureVerificationError('Missing signature/checksum');
  }
  const isValid = paytm.verifySignature(payload, signature);
  if (!isValid) {
    logger.warn({ securityContext, payloadMeta: { orderId: payload && payload.orderId } }, 'security.signature.mismatch');
    throw new SignatureVerificationError('Invalid signature/checksum');
  }
  return true;
}

async function handlePaymentWebhook(payload, context = {}) {
  const { orderId, status, amount, checksum } = payload || {};
  if (!orderId || !status || typeof amount !== 'number' || !checksum) {
    const err = new Error('Invalid webhook payload');
    err.status = 400;
    throw err;
  }

  const { idempotencyKey, ip, userAgent, method, path } = context || {};
  const securityContext = { idempotencyKey, ip, userAgent, method, path };

  // Log received event
  logger.info({
    orderId,
    status,
    idempotencyKey,
    ip,
    userAgent,
    method,
    path,
  }, 'webhook.received');

  verifyPaytmSignature({ orderId, status, amount }, checksum, securityContext);

  // Log validated event
  logger.info({ orderId, idempotencyKey }, 'webhook.validated');

  // Idempotency enforcement
  const derivedKey = idempotencyKey || `wh:${orderId}:${status}:${checksum}`;
  if (idempStore.has(derivedKey)) {
    const existing = repo.getByOrderId(orderId);
    logger.info({ orderId, idempotencyKey, derivedKey }, 'webhook.idempotent.skip');
    return existing || null;
  }
  idempStore.set(derivedKey);

  const existing = repo.getByOrderId(orderId);
  if (!existing) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }

  const updated = updatePaymentStatus(existing.id, status);

  if (status === 'SUCCESS') {
    const message = `Payment of \u20B9${amount} successful. Payment ID: ${updated.id}`;
    try {
      await sendSMSNotification(updated.phone, message);
    } catch (e) {
      logger.error({ err: e, paymentId: updated.id }, 'sms.send.failed');
    }
  }

  // Log applied event
  logger.info({ orderId, status, paymentId: updated.id, idempotencyKey }, 'webhook.applied');
  return updated;
}

function updatePaymentStatus(id, status) {
  assertString(id, 'id');
  assertString(status, 'status');
  const updated = repo.updateStatus(id, status);
  if (!updated) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  return updated;
}

async function sendSMSNotification(to, message) {
  assertString(to, 'to');
  assertString(message, 'message');
  return sms.sendSMS({ to, message, senderId: config.sms.senderId }, config.sms.apiKey);
}

function getPaymentById(id) {
  assertString(id, 'id');
  const payment = repo.getById(id);
  if (!payment) {
    logger.info({ id }, 'payment.get.not_found');
    return null;
  }
  logger.info({ id }, 'payment.get.succeeded');
  return payment;
}

module.exports = {
  createPayment,
  verifyPaytmSignature,
  handlePaymentWebhook,
  updatePaymentStatus,
  sendSMSNotification,
  getPaymentById,
};
