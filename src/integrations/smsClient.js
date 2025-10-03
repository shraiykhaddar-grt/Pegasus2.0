async function sendSMS({ to, message, senderId }, apiKey) {
  // Mocked SMS send; returns a fake messageId
  return {
    success: true,
    to,
    senderId,
    message,
    messageId: `mock_${Date.now()}`,
  };
}

module.exports = { sendSMS };
