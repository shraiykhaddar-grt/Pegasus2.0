const service = require('../../src/services/paymentService');
const repo = require('../../src/repositories/paymentRepository');
const paytm = require('../../src/integrations/paytmClient');
const sms = require('../../src/integrations/smsClient');
const { SignatureVerificationError } = require('../../src/errors');

beforeEach(() => {
  repo.clearAll();
  jest.restoreAllMocks();
});

describe('paymentService', () => {
  test('createPayment creates a pending payment', async () => {
    const payment = await service.createPayment({ amount: 499, currency: 'INR', customerId: 'CUST1', phone: '9999999999' });
    expect(payment).toHaveProperty('id');
    expect(payment).toHaveProperty('orderId');
    expect(payment.status).toBe('PENDING');
  });

  test('verifyPaytmSignature returns true for valid signature', () => {
    const payload = { orderId: 'ORDER_X', status: 'SUCCESS', amount: 100 };
    const sig = paytm.generateSignature(payload);
    expect(service.verifyPaytmSignature(payload, sig)).toBe(true);
  });

  test('handlePaymentWebhook updates status and sends SMS on success', async () => {
    const payment = await service.createPayment({ amount: 250, currency: 'INR', customerId: 'CUST2', phone: '8888888888' });

    const spy = jest.spyOn(sms, 'sendSMS').mockResolvedValue({ success: true, messageId: 'mock_1' });

    const payload = { orderId: payment.orderId, status: 'SUCCESS', amount: payment.amount };
    const checksum = paytm.generateSignature(payload);

    const updated = await service.handlePaymentWebhook({ ...payload, checksum });
    expect(updated.status).toBe('SUCCESS');
    expect(spy).toHaveBeenCalled();
  });

  test('handlePaymentWebhook throws SignatureVerificationError on invalid checksum', async () => {
    const payment = await service.createPayment({ amount: 100, currency: 'INR', customerId: 'C_BAD', phone: '7000000000' });
    const payload = { orderId: payment.orderId, status: 'SUCCESS', amount: payment.amount };
    const badChecksum = 'invalid_bad_checksum';
    await expect(service.handlePaymentWebhook({ ...payload, checksum: badChecksum }))
      .rejects
      .toBeInstanceOf(SignatureVerificationError);
  });

  test('updatePaymentStatus updates to FAILED', async () => {
    const payment = await service.createPayment({ amount: 100, currency: 'INR', customerId: 'CUST3', phone: '7777777777' });
    const updated = service.updatePaymentStatus(payment.id, 'FAILED');
    expect(updated.status).toBe('FAILED');
  });

  test('getPaymentById returns null if not found', () => {
    expect(service.getPaymentById('unknown')).toBeNull();
  });
});
