const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || (env === 'test' ? 'silent' : 'info'),
  paytm: {
    merchantId: process.env.PAYTM_MERCHANT_ID || 'mock_merchant_id',
    merchantKey: process.env.PAYTM_MERCHANT_KEY || 'mock_merchant_key',
    website: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
    industryTypeId: process.env.PAYTM_INDUSTRY_TYPE_ID || 'Retail',
    callbackUrl: process.env.PAYTM_CALLBACK_URL || 'http://localhost:3000/api/payments/webhook',
  },
  sms: {
    apiKey: process.env.SMS_API_KEY || 'mock_sms_api_key',
    senderId: process.env.SMS_SENDER_ID || 'TXTSMS',
  },
};
