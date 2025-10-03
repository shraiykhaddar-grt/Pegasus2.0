const { getIdempotencyKey } = require('../../src/utils/idempotency');

describe('idempotency util', () => {
  test('extracts idempotency-key header', () => {
    const req = { headers: { 'idempotency-key': 'IDEMP-A' } };
    expect(getIdempotencyKey(req)).toBe('IDEMP-A');
  });

  test('extracts x-idempotency-key header', () => {
    const req = { headers: { 'x-idempotency-key': 'IDEMP-B' } };
    expect(getIdempotencyKey(req)).toBe('IDEMP-B');
  });

  test('extracts body idempotencyKey', () => {
    const req = { headers: {}, body: { idempotencyKey: 'IDEMP-C' } };
    expect(getIdempotencyKey(req)).toBe('IDEMP-C');
  });

  test('extracts query idempotencyKey', () => {
    const req = { headers: {}, query: { idempotencyKey: 'IDEMP-D' } };
    expect(getIdempotencyKey(req)).toBe('IDEMP-D');
  });

  test('returns null when absent', () => {
    const req = { headers: {} };
    expect(getIdempotencyKey(req)).toBeNull();
  });
});
