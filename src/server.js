const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.env }, 'server.started');
});

process.on('SIGINT', () => {
  server.close(() => {
    logger.info('server.stopped');
    process.exit(0);
  });
});

module.exports = server;
