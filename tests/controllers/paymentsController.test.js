const request = require('supertest');
const app = require('../../src/app');
const paytm = require('../../src/integrations/paytmClient');
const repo = require('../../src/repositories/paymentRepository');

describe('Payments API', () => {
  beforeEach(() => {
    repo.clearAll();
  });

  test('POST /api/payments creates a payment', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({ amount: 300, currency: 'INR', customerId: 'C123', phone: '9999990000' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('PENDING');
  });

  test('GET /api/payments/:id fetches payment', async () => {
    const create = await request(app)
      .post('/api/payments')
      .send({ amount: 300, currency: 'INR', customerId: 'C123', phone: '9999990000' });

    const id = create.body.id;
    const res = await request(app).get(`/api/payments/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  test('POST /api/payments/webhook processes success', async () => {
    const create = await request(app)
      .post('/api/payments')
      .send({ amount: 450, currency: 'INR', customerId: 'C567', phone: '9999991111' });

    const payment = create.body;
    const payload = { orderId: payment.orderId, status: 'SUCCESS', amount: payment.amount };
    const checksum = paytm.generateSignature(payload);

    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ ...payload, checksum });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.status).toBe('SUCCESS');
  });
});
