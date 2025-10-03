const logger = require('../utils/logger');
const config = require('../config/config');
const repo = require('../repositories/paymentRepository');
const paytm = require('../integrations/paytmClient');
const sms = require('../integrations/smsClient');
const { SignatureVerificationError } = require('../errors');

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
  const paytmOrder = await paytm.createOrder({
    amount,
    currency,
    orderId,
    customerId,
    callbackUrl: config.paytm.callbackUrl,
  });

  const payment = repo.create({
    amount,
    currency,
    customerId,
    phone,
    orderId: paytmOrder.orderId,
    txnToken: paytmOrder.txnToken,
    status: 'PENDING',
  });

  logger.info({ paymentId: payment.id, orderId }, 'payment.created');
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

  verifyPaytmSignature({ orderId, status, amount }, checksum, securityContext);

  const existing = repo.getByOrderId(orderId);
  if (!existing) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }

  const updated = repo.updateStatus(existing.id, status);

  if (status === 'SUCCESS') {
    const message = `Payment of \u20B9${amount} successful. Payment ID: ${updated.id}`;
    try {
      await sms.sendSMS({ to: updated.phone, message, senderId: config.sms.senderId }, config.sms.apiKey);
    } catch (e) {
      logger.error({ err: e, paymentId: updated.id }, 'sms.send.failed');
    }
  }

  logger.info({ orderId, status, paymentId: updated.id, idempotencyKey }, 'webhook.processed');
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
  return repo.getById(id);
}

module.exports = {
  createPayment,
  verifyPaytmSignature,
  handlePaymentWebhook,
  updatePaymentStatus,
  sendSMSNotification,
  getPaymentById,
};
