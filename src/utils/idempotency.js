function getIdempotencyKey(req) {
  if (!req) return null;
  const headers = req.headers || {};
  return (
    headers['idempotency-key'] ||
    headers['x-idempotency-key'] ||
    (req.body && req.body.idempotencyKey) ||
    (req.query && req.query.idempotencyKey) ||
    null
  );
}

module.exports = { getIdempotencyKey };
