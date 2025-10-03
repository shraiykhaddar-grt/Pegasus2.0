const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

module.exports = function requestLogger(req, res, next) {
  const reqId = randomUUID();
  req.id = reqId;
  req.log = logger.child({ reqId });
  const start = process.hrtime.bigint();

  req.log.info({ method: req.method, url: req.originalUrl || req.url }, 'request:start');

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    req.log.info({ statusCode: res.statusCode, durationMs }, 'request:finish');
  });

  next();
};
