const { randomUUID } = require('crypto');

const payments = new Map();
const indexByOrderId = new Map();

function create({ amount, currency, customerId, phone, orderId, txnToken, status }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const payment = {
    id,
    orderId,
    amount,
    currency,
    customerId,
    phone,
    txnToken,
    status: status || 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  payments.set(id, payment);
  if (orderId) indexByOrderId.set(orderId, id);
  return payment;
}

function getById(id) {
  return payments.get(id) || null;
}

function getByOrderId(orderId) {
  const id = indexByOrderId.get(orderId);
  return id ? payments.get(id) : null;
}

function update(id, updates) {
  const existing = payments.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  payments.set(id, updated);
  if (updated.orderId) indexByOrderId.set(updated.orderId, id);
  return updated;
}

function updateStatus(id, status) {
  return update(id, { status });
}

function clearAll() {
  payments.clear();
  indexByOrderId.clear();
}

module.exports = {
  create,
  getById,
  getByOrderId,
  update,
  updateStatus,
  clearAll,
};
