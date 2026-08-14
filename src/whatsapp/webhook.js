const { getUserByPhone } = require('../supabase/auth');
const { sendWhatsappMessage } = require('./sender');
const logger = require('../logger');

/**
 * WhatsApp Webhook Handler
 * Processes incoming messages from Twilio
 * Returns immediately with XML response (Twilio requirement)
 * Actual message processing happens asynchronously
 */

/**
 * Handle incoming WhatsApp message from Twilio webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleWhatsappWebhook(req, res) {
  try {
    // Extract message details from webhook payload
    const from = req.body.From;
    const messageBody = req.body.Body;
    const messageSid = req.body.MessageSid;

    // Return XML response immediately (Twilio requirement)
    // This tells Twilio we received the webhook
    res.type('text/xml').send('<Response></Response>');

    // Log incoming message
    logger.info({
      message: `[${messageSid}] Received from ${from}: ${messageBody}`,
      messageSid,
      from,
      messageLength: messageBody.length,
    });

    // Normalize phone number: remove "whatsapp:" prefix
    let phoneNumber = from;
    if (phoneNumber.startsWith('whatsapp:')) {
      phoneNumber = phoneNumber.substring(9);
    }

    // Lookup user by phone number
    const user = await getUserByPhone(phoneNumber);

    if (!user) {
      logger.warn({
        message: `[${messageSid}] User not registered: ${phoneNumber}`,
        messageSid,
        from: phoneNumber,
      });

      // Send error message to unregistered user
      try {
        await sendWhatsappMessage(
          phoneNumber,
          'Disculpa, tu número no está registrado en nuestro sistema. Contacta a tu administrador.'
        );
      } catch (sendError) {
        logger.error({
          message: `[${messageSid}] Failed to send error message to unregistered user`,
          error: sendError.message,
        });
      }

      return;
    }

    // Log that we're processing the message for a registered user
    logger.info({
      message: `[${messageSid}] Processing message from ${user.role} at ${user.divisionAssigned}`,
      messageSid,
      userId: user.id,
      role: user.role,
      division: user.divisionAssigned,
      messageBody,
    });

    // Note: Actual message processing (Claude queries, etc.) will be implemented in Task 7
  } catch (error) {
    logger.error({
      message: 'Error processing WhatsApp webhook',
      error: error.message,
      stack: error.stack,
      messageSid: req.body?.MessageSid,
    });
    // Webhook already responded, just log the error
  }
}

module.exports = {
  handleWhatsappWebhook,
};
