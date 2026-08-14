const logger = require('../logger');

// WhatsApp message size limit
const WHATSAPP_MAX_LENGTH = 4096;

/**
 * Format data for WhatsApp message
 * Ensures message is within WhatsApp's character limit (4096 chars)
 * Handles strings, objects, and other types
 *
 * @param {string|object|any} data - Data to format
 * @returns {string} - Formatted message string ≤ 4096 characters
 */
function formatForWhatsapp(data) {
  try {
    let formatted;

    if (typeof data === 'string') {
      // If already a string, use as-is
      formatted = data;
    } else if (typeof data === 'object' && data !== null) {
      // If object, stringify it
      formatted = JSON.stringify(data);
    } else {
      // For other types, convert to string
      formatted = String(data);
    }

    // Truncate if necessary to WhatsApp limit
    if (formatted.length > WHATSAPP_MAX_LENGTH) {
      logger.warn(
        `[Formatter] Message truncated from ${formatted.length} to ${WHATSAPP_MAX_LENGTH} characters`
      );
      formatted = formatted.substring(0, WHATSAPP_MAX_LENGTH);
    }

    logger.debug(`[Formatter] Formatted message: ${formatted.length} characters`);
    return formatted;
  } catch (error) {
    logger.error(`[Formatter] Error formatting message:`, error);
    // Fallback to simple error message
    return 'Error: Unable to process response.';
  }
}

module.exports = {
  formatForWhatsapp,
};
