const twilio = require('twilio');
const config = require('../config');
const logger = require('../logger');

/**
 * WhatsApp Message Sender
 * Sends WhatsApp messages using Twilio's API
 */

// Initialize Twilio client
const client = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Send a WhatsApp message
 * @param {string} to - Recipient phone number (e.g., "+58XXXXXXXXX" or "whatsapp:+58XXXXXXXXX")
 * @param {string} body - Message text content
 * @param {string|null} mediaUrl - Optional media URL to attach (image, video, document, etc.)
 * @returns {Promise<string>} - Message SID from Twilio
 * @throws {Error} - If message sending fails
 */
async function sendWhatsappMessage(to, body, mediaUrl = null) {
  try {
    // Normalize phone number: remove "whatsapp:" prefix if present
    let phoneNumber = to;
    if (phoneNumber.startsWith('whatsapp:')) {
      phoneNumber = phoneNumber.substring(9);
    }

    // Ensure phone number has whatsapp: prefix for Twilio
    const toFormatted = `whatsapp:${phoneNumber}`;

    logger.info({
      message: 'Sending WhatsApp message',
      to: phoneNumber,
      messageLength: body.length,
      hasMedia: !!mediaUrl,
    });

    // Build message options
    const messageOptions = {
      from: config.twilio.whatsappNumber,
      body,
    };

    // Add media if provided
    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl];
    }

    // Send message via Twilio
    const message = await client.messages.create({
      ...messageOptions,
      to: toFormatted,
    });

    logger.info({
      message: 'WhatsApp message sent successfully',
      messageSid: message.sid,
      to: phoneNumber,
      status: message.status,
    });

    return message.sid;
  } catch (error) {
    logger.error({
      message: 'Failed to send WhatsApp message',
      error: error.message,
      to,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  sendWhatsappMessage,
};
