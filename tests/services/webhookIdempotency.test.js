const service = require('../../src/services/paymentService');
const repo = require('../../src/repositories/paymentRepository');
const paytm = require('../../src/integrations/paytmClient');
const sms = require('../../src/integrations/smsClient');
const idempStore = require('../../src/utils/idempotencyStore');

beforeEach(() => {
  repo.clearAll();
  idempStore.clear();
  jest.restoreAllMocks();
});

describe('handlePaymentWebhook idempotency (service)', () => {
  test('skips updates and SMS on duplicate idempotency key', async () => {
    const p = await service.createPayment({ amount: 123, currency: 'INR', customerId: 'C1', phone: '9000000000' });

    const payload = { orderId: p.orderId, status: 'SUCCESS', amount: p.amount };
    const checksum = paytm.generateSignature(payload);
    const context = { idempotencyKey: 'IDEMP-123' };

    const smsSpy = jest.spyOn(sms, 'sendSMS').mockResolvedValue({ success: true, messageId: 'm1' });
    const updateSpy = jest.spyOn(repo, 'updateStatus');

    const first = await service.handlePaymentWebhook({ ...payload, checksum }, context);
    expect(first.status).toBe('SUCCESS');
    expect(smsSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    const second = await service.handlePaymentWebhook({ ...payload, checksum }, context);
    expect(second.status).toBe('SUCCESS');
    expect(smsSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  test('skips duplicate without idempotency key using derived key', async () => {
    const p = await service.createPayment({ amount: 99, currency: 'INR', customerId: 'C2', phone: '9111111111' });
    const payload = { orderId: p.orderId, status: 'SUCCESS', amount: p.amount };
    const checksum = paytm.generateSignature(payload);

    const smsSpy = jest.spyOn(sms, 'sendSMS').mockResolvedValue({ success: true, messageId: 'm2' });
    const updateSpy = jest.spyOn(repo, 'updateStatus');

    await service.handlePaymentWebhook({ ...payload, checksum });
    await service.handlePaymentWebhook({ ...payload, checksum });

    expect(smsSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });
});
