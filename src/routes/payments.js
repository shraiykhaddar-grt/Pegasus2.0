const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentsController');

router.post('/api/payments', ctrl.createPayment);
router.get('/api/payments/:id', ctrl.getPaymentById);
router.patch('/api/payments/:id', ctrl.updatePaymentStatus);
router.post('/api/payments/webhook', ctrl.webhook);

module.exports = router;
