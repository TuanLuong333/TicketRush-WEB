const crypto = require('crypto');

function generateOrderCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TR-${timestamp}-${random}`;
}

function generateQueueToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateOrderCode,
  generateQueueToken
};
