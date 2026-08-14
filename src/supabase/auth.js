const { PrismaClient } = require('@prisma/client');
const logger = require('../logger');

const prisma = new PrismaClient();

/**
 * User Authentication Module
 * Provides phone-based lookup and permission verification
 * Supported roles: CEO, CFO, COO, ERC
 * Divisions: Bebidas, Gear, Reestructuración (CEO sees ALL)
 */

/**
 * Get user by phone number
 * @param {string} phoneNumber - User's phone number (e.g., "+58XXXXXXXXX1")
 * @returns {Promise<{id, phoneNumber, role, divisionAssigned} | null>}
 */
async function getUserByPhone(phoneNumber) {
  try {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      logger.warn(`[Auth] Invalid phone number format: ${phoneNumber}`);
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        role: true,
        divisionAssigned: true,
        active: true,
      },
    });

    // Return null if user doesn't exist or is inactive
    if (!user) {
      logger.debug(`[Auth] User not found: ${phoneNumber}`);
      return null;
    }

    if (!user.active) {
      logger.warn(`[Auth] User inactive: ${phoneNumber}`);
      return null;
    }

    logger.debug(`[Auth] User found: ${phoneNumber} (${user.role})`);
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      divisionAssigned: user.divisionAssigned,
    };
  } catch (error) {
    logger.error(`[Auth] Error fetching user ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Verify if a user has permission to access a division
 * CEO (divisionAssigned='All') can access all divisions
 * Others can only access their assigned division
 * @param {string} phoneNumber - User's phone number
 * @param {string} division - Division to access (Bebidas, Gear, Reestructuración)
 * @returns {Promise<boolean>}
 */
async function verifyUserPermission(phoneNumber, division) {
  try {
    if (!phoneNumber || !division) {
      logger.warn(`[Auth] Missing parameters: phoneNumber=${phoneNumber}, division=${division}`);
      return false;
    }

    const user = await getUserByPhone(phoneNumber);

    if (!user) {
      logger.warn(`[Auth] Permission denied - user not found: ${phoneNumber}`);
      return false;
    }

    // CEO can access all divisions
    if (user.divisionAssigned === 'All') {
      logger.debug(`[Auth] Permission granted: ${phoneNumber} (CEO) → ${division}`);
      return true;
    }

    // Others can only access their assigned division
    const hasPermission = user.divisionAssigned === division;

    if (hasPermission) {
      logger.debug(`[Auth] Permission granted: ${phoneNumber} (${user.role}) → ${division}`);
    } else {
      logger.warn(
        `[Auth] Permission denied: ${phoneNumber} (${user.role}) tried to access ${division}, assigned to ${user.divisionAssigned}`
      );
    }

    return hasPermission;
  } catch (error) {
    logger.error(`[Auth] Error verifying permission for ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  getUserByPhone,
  verifyUserPermission,
};
