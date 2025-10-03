const service = require('../services/paymentService');
const { getIdempotencyKey } = require('../utils/idempotency');

exports.createPayment = async (req, res, next) => {
  try {
    const { amount, currency, customerId, phone } = req.body || {};
    const payment = await service.createPayment({ amount, currency, customerId, phone });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
};

exports.getPaymentById = (req, res, next) => {
  try {
    const payment = service.getPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Not found' });
    res.json(payment);
  } catch (err) {
    next(err);
  }
};

exports.updatePaymentStatus = (req, res, next) => {
  try {
    const { status } = req.body || {};
    const updated = service.updatePaymentStatus(req.params.id, status);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.webhook = async (req, res, next) => {
  try {
    const idempotencyKey = getIdempotencyKey(req);
    const context = {
      idempotencyKey,
      ip: req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.originalUrl || req.url,
    };
    const updated = await service.handlePaymentWebhook(req.body, context);
    res.status(200).json({ success: true, payment: updated });
  } catch (err) {
    next(err);
  }
};
