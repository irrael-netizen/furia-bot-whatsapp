const { PrismaClient } = require('@prisma/client');
const logger = require('../logger');

const prisma = new PrismaClient();

// Rate limit constants
const RATE_LIMIT = 30; // 30 queries per hour
const WINDOW = 3600000; // 1 hour in milliseconds

/**
 * Check if a user has exceeded the rate limit
 * Queries made in the last WINDOW (1 hour) are counted
 * Returns true if user can proceed, false if rate limited
 *
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<boolean>} - true if user can proceed, false if rate limited
 * @throws {Error} - If rate limit check fails
 */
async function checkRateLimit(phoneNumber) {
  try {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      logger.warn(`[RateLimit] Invalid phone number format: ${phoneNumber}`);
      return false;
    }

    // Calculate the time window start (1 hour ago)
    const windowStart = new Date(Date.now() - WINDOW);

    // Count queries made by this user in the last hour
    const queryCount = await prisma.queryLog.count({
      where: {
        userPhone: phoneNumber,
        createdAt: {
          gte: windowStart, // Greater than or equal to window start
        },
      },
    });

    logger.debug(`[RateLimit] User ${phoneNumber}: ${queryCount}/${RATE_LIMIT} queries in last hour`);

    // Return true if under limit, false if at or over limit
    const isAllowed = queryCount < RATE_LIMIT;

    if (!isAllowed) {
      logger.warn(
        `[RateLimit] Rate limit exceeded for ${phoneNumber}: ${queryCount} queries in last hour`
      );
    }

    return isAllowed;
  } catch (error) {
    logger.error(`[RateLimit] Error checking rate limit for ${phoneNumber}:`, error);
    // On error, be conservative and deny (fail closed)
    return false;
  }
}

module.exports = {
  checkRateLimit,
};
