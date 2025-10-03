const express = require('express');
const app = express();
const logger = require('./utils/logger');
const requestLogger = require('./middleware/logger');
const healthRoutes = require('./routes/health');
const paymentRoutes = require('./routes/payments');

app.use(express.json());
app.use(requestLogger);

app.use(healthRoutes);
app.use(paymentRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const log = req && req.log ? req.log : logger;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'APP_ERROR');
  const response = {
    error: err.message || 'Internal Server Error',
    code,
    requestId: req && req.id,
  };
  log.error({ err, status, code, requestId: response.requestId }, 'request:error');
  res.status(status).json(response);
});

module.exports = app;
