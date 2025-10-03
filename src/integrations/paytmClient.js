const crypto = require('crypto');
const config = require('../config/config');

function generateSignature(payload) {
  const data = JSON.stringify(payload);
  return crypto.createHmac('sha256', config.paytm.merchantKey).update(data).digest('hex');
}

function verifySignature(payload, signature) {
  return generateSignature(payload) === signature;
}

async function createOrder({ amount, currency, orderId, customerId, callbackUrl }) {
  const payload = { amount, currency, orderId, customerId, callbackUrl };
  const checksum = generateSignature(payload);
  return {
    success: true,
    orderId,
    amount,
    currency,
    customerId,
    redirectUrl: 'https://securegw-stage.paytm.in/order/process',
    txnToken: 'mock_txn_token_' + orderId,
    checksum,
  };
}

module.exports = {
  createOrder,
  verifySignature,
  generateSignature,
};
