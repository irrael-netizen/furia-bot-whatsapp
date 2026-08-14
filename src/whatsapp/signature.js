const crypto = require('crypto');

/**
 * Twilio Signature Verification Utility
 * Provides functions for calculating and verifying Twilio webhook signatures
 */

/**
 * Calculate Twilio webhook signature
 * Follows Twilio's exact signature calculation: HMAC-SHA1(url + params_string, secret)
 * @param {string} url - Full URL including protocol and query parameters
 * @param {Object} params - POST body parameters as key-value object
 * @param {string} secret - Twilio webhook secret (auth token)
 * @returns {string} - Base64-encoded HMAC-SHA1 signature
 */
function calculateSignature(url, params, secret) {
  // Build the data string: concatenate sorted keys with their values
  // e.g. "From+58XXXXX1Body Test MessageSid SMXXX"
  const data = Object.keys(params)
    .sort()
    .map(key => key + params[key])
    .join('');

  // Create HMAC-SHA1 signature
  const hash = crypto
    .createHmac('sha1', secret)
    .update(url + data, 'utf-8')
    .digest('Base64');

  return hash;
}

/**
 * Verify Twilio webhook signature
 * @param {string} providedSignature - Signature from X-Twilio-Signature header
 * @param {string} url - Full URL
 * @param {Object} params - POST body parameters
 * @param {string} secret - Twilio webhook secret
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(providedSignature, url, params, secret) {
  const expectedSignature = calculateSignature(url, params, secret);
  return expectedSignature === providedSignature;
}

module.exports = {
  calculateSignature,
  verifySignature,
};
