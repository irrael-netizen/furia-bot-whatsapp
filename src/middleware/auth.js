const config = require('../config');
const logger = require('../logger');
const { verifySignature } = require('../whatsapp/signature');

/**
 * Twilio Webhook Signature Verification Middleware
 * Validates that incoming webhook requests are actually from Twilio
 * by verifying the X-Twilio-Signature header
 */

/**
 * Verify Twilio webhook signature
 * Middleware that validates the X-Twilio-Signature header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function verifyTwilioSignature(req, res, next) {
  try {
    // Get the signature from the header
    const twilioSignature = req.get('X-Twilio-Signature') || '';

    // Construct the URL exactly as Twilio does
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Verify the signature
    const isValid = verifySignature(
      twilioSignature,
      url,
      req.body,
      config.security.webhookSecret
    );

    if (!isValid) {
      logger.warn({
        message: 'Invalid Twilio signature',
        provided: twilioSignature,
        url,
      });
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Invalid Twilio webhook signature',
      });
    }

    logger.debug({
      message: 'Valid Twilio signature verified',
      url,
    });

    next();
  } catch (error) {
    logger.error({
      message: 'Error verifying Twilio signature',
      error: error.message,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Signature verification failed',
    });
  }
}

module.exports = {
  verifyTwilioSignature,
};
