const { PrismaClient } = require('@prisma/client');
const logger = require('../logger');

const prisma = new PrismaClient();

/**
 * Log a query to the audit trail
 * Records all queries (success or failure) to Supabase for audit compliance
 *
 * @param {string} phoneNumber - User's phone number
 * @param {string} query - The original user query text
 * @param {string} intention - The extracted intention (e.g., "calcular_margen")
 * @param {object} parameters - Query parameters (will be JSON stringified)
 * @param {object} result - Query result data (will be JSON stringified)
 * @param {boolean} success - Whether the query succeeded
 * @param {string|null} errorMessage - Error message if failed (default: null)
 * @param {number} duration - Query duration in milliseconds (default: 0)
 * @returns {Promise<void>}
 * @throws {Error} - If logging fails (logged but not thrown to caller)
 */
async function logQuery(
  phoneNumber,
  query,
  intention,
  parameters = {},
  result = null,
  success = true,
  errorMessage = null,
  duration = 0
) {
  try {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      logger.warn(`[Audit] Invalid phone number format: ${phoneNumber}`);
      return;
    }

    if (!query || typeof query !== 'string') {
      logger.warn(`[Audit] Invalid query format: ${query}`);
      return;
    }

    // Create audit log entry
    const logEntry = await prisma.queryLog.create({
      data: {
        userPhone: phoneNumber,
        query, // Original user query
        intention, // Extracted intention
        parameters: JSON.stringify(parameters), // Stringify parameters object
        result: JSON.stringify(result), // Stringify result object
        duration, // Duration in milliseconds
        success, // Whether query succeeded
        errorMessage, // Error message if failed
      },
    });

    logger.debug(`[Audit] Query logged:`, {
      id: logEntry.id,
      phoneNumber,
      intention,
      success,
      duration,
    });

    return logEntry;
  } catch (error) {
    // Log audit failure but don't throw - audit failures shouldn't break the pipeline
    logger.error(`[Audit] Failed to log query:`, {
      phoneNumber,
      intention,
      error: error.message,
      stack: error.stack,
    });
    // Return null to indicate failure
    return null;
  }
}

module.exports = {
  logQuery,
};
