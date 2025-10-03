const pino = require('pino');
const config = require('../config/config');

const logger = pino({
  level: config.logLevel,
  base: { service: 'payments-notifications-service' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
