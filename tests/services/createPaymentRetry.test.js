const service = require('../../src/services/paymentService');
const repo = require('../../src/repositories/paymentRepository');
const paytm = require('../../src/integrations/paytmClient');
const { ProviderError } = require('../../src/errors');

beforeEach(() => {
  repo.clearAll();
  jest.restoreAllMocks();
});

describe('createPayment retry behavior', () => {
  test('retries once then succeeds', async () => {
    let calls = 0;
    const spy = jest.spyOn(paytm, 'createOrder').mockImplementation(async (params) => {
      calls += 1;
      if (calls === 1) {
        throw new Error('temporary network issue');
      }
      return {
        success: true,
        orderId: params.orderId,
        amount: params.amount,
        currency: params.currency,
        customerId: params.customerId,
        redirectUrl: 'mock',
        txnToken: 'mock_token_' + params.orderId,
        checksum: 'mock_checksum',
      };
    });

    const payment = await service.createPayment({ amount: 150, currency: 'INR', customerId: 'CUST-X', phone: '9999900000' });
    expect(payment).toHaveProperty('id');
    expect(payment.status).toBe('PENDING');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('fails after max retries', async () => {
    const spy = jest.spyOn(paytm, 'createOrder').mockImplementation(async () => {
      throw new Error('permanent failure');
    });

    await expect(service.createPayment({ amount: 200, currency: 'INR', customerId: 'CUST-Y', phone: '9999900001' }))
      .rejects
      .toBeInstanceOf(ProviderError);

    // initial + 2 retries = 3
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('getPaymentById success path', () => {
  test('returns the created payment', async () => {
    const p = await service.createPayment({ amount: 99, currency: 'INR', customerId: 'CUST-Z', phone: '9999900002' });
    const found = service.getPaymentById(p.id);
    expect(found).not.toBeNull();
    expect(found.id).toBe(p.id);
  });
});
