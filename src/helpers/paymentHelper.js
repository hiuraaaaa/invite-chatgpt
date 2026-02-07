const crypto = require('crypto');

/**
 * Generate unique invoice reference
 */
function generateReference(prefix = 'INV') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate signature for Tripay
 */
function generateTripaySignature(merchantRef, amount) {
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;
  const merchantCode = process.env.TRIPAY_MERCHANT_CODE;

  return crypto
    .createHmac('sha256', privateKey)
    .update(merchantCode + merchantRef + amount)
    .digest('hex');
}

/**
 * Verify Tripay callback signature
 */
function verifyTripaySignature(json, signature) {
  const privateKey = process.env.TRIPAY_PRIVATE_KEY;

  const calculatedSignature = crypto
    .createHmac('sha256', privateKey)
    .update(JSON.stringify(json))
    .digest('hex');

  return calculatedSignature === signature;
}

/**
 * Generate signature for Midtrans
 */
function generateMidtransSignature(orderId, statusCode, grossAmount) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

/**
 * Verify Midtrans callback signature
 */
function verifyMidtransSignature(orderId, statusCode, grossAmount, signature) {
  const calculatedSignature = generateMidtransSignature(orderId, statusCode, grossAmount);
  return calculatedSignature === signature;
}

/**
 * Generate signature for Duitku
 */
function generateDuitkuSignature(merchantCode, merchantOrderId, amount) {
  const merchantKey = process.env.DUITKU_MERCHANT_KEY;

  return crypto
    .createHash('md5')
    .update(`${merchantCode}${amount}${merchantOrderId}${merchantKey}`)
    .digest('hex');
}

/**
 * Verify Duitku callback signature
 */
function verifyDuitkuSignature(merchantCode, amount, merchantOrderId, signature) {
  const calculatedSignature = generateDuitkuSignature(merchantCode, merchantOrderId, amount);
  return calculatedSignature === signature;
}

/**
 * Format price to Indonesian Rupiah
 */
function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price);
}

/**
 * Parse price from formatted string
 */
function parsePrice(formattedPrice) {
  return parseInt(formattedPrice.replace(/[^0-9]/g, ''));
}

/**
 * Calculate expired time
 */
function calculateExpiredTime(days) {
  const now = new Date();
  return new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
}

/**
 * Check if invoice is expired
 */
function isExpired(expiredTime) {
  const now = new Date();
  const expired = new Date(expiredTime);
  return now >= expired;
}

/**
 * Get time remaining until expired
 */
function getTimeRemaining(expiredTime) {
  const now = new Date();
  const expired = new Date(expiredTime);
  const diff = expired - now;

  if (diff <= 0) {
    return { expired: true, hours: 0, minutes: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { expired: false, hours, minutes };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mask email for privacy
 */
function maskEmail(email) {
  const [username, domain] = email.split('@');
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  const visibleChars = 2;
  const masked = username.substring(0, visibleChars) + '***';
  return `${masked}@${domain}`;
}

/**
 * Generate random string
 */
function generateRandomString(length = 8) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

/**
 * Sleep/delay utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry logic wrapper
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry ${i + 1}/${maxRetries} after error:`, error.message);
      await sleep(delay * (i + 1));
    }
  }
}

/**
 * Log transaction
 */
function logTransaction(type, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}]`, JSON.stringify(data, null, 2));
}

module.exports = {
  generateReference,
  generateTripaySignature,
  verifyTripaySignature,
  generateMidtransSignature,
  verifyMidtransSignature,
  generateDuitkuSignature,
  verifyDuitkuSignature,
  formatPrice,
  parsePrice,
  calculateExpiredTime,
  isExpired,
  getTimeRemaining,
  isValidEmail,
  maskEmail,
  generateRandomString,
  sleep,
  retry,
  logTransaction
};
