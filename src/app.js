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
  log.error({ err, status }, 'request:error');
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
