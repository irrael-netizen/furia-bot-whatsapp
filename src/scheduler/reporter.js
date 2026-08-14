const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { executeFinancialQuery } = require('../supabase/queries');
const { generateResponse } = require('../claude/nlu');
const { sendWhatsappMessage } = require('../whatsapp/sender');
const logger = require('../logger');

const prisma = new PrismaClient();

/**
 * Send reports to a specific user
 * Queries each report type, generates responses, and sends via WhatsApp
 * @param {object} user - User object with phoneNumber, role, divisionAssigned, active
 * @returns {Promise<void>}
 * @throws {Error} If sending reports fails
 */
async function sendUserReports(user) {
  try {
    if (!user || !user.phoneNumber) {
      logger.warn('[Reporter] Invalid user object');
      return;
    }

    logger.info(`[Reporter] Sending reports to ${user.role} at ${user.phoneNumber}`);

    // Find report config for this user
    const reportConfig = await prisma.reportConfig.findUnique({
      where: { userPhone: user.phoneNumber },
    });

    // Skip if no config or inactive
    if (!reportConfig || !reportConfig.active) {
      logger.debug(`[Reporter] No active report config for ${user.phoneNumber}`);
      return;
    }

    // Skip if no reports configured
    if (!reportConfig.reportsDaily || reportConfig.reportsDaily.length === 0) {
      logger.debug(`[Reporter] No reports configured for ${user.phoneNumber}`);
      return;
    }

    // Send each report type
    for (const reportType of reportConfig.reportsDaily) {
      try {
        logger.debug(`[Reporter] Processing report type: ${reportType}`);

        // Execute financial query for this report type
        const queryResult = await executeFinancialQuery(user.phoneNumber, reportType, {
          division: user.divisionAssigned,
          periodo: 'mes_actual',
        });

        // Generate friendly response
        const responseText = await generateResponse(reportType, queryResult);

        // Format message with emoji header
        const message = `📊 Reporte Diario - ${reportType}\n\n${responseText}`;

        // Send via WhatsApp
        await sendWhatsappMessage(user.phoneNumber, message);

        logger.info(`[Reporter] ✓ Sent ${reportType} report to ${user.phoneNumber}`);
      } catch (reportError) {
        logger.error(
          `[Reporter] Error sending ${reportType} report to ${user.phoneNumber}:`,
          reportError
        );
        // Continue with next report if one fails
        continue;
      }
    }
  } catch (error) {
    logger.error(`[Reporter] Error sending reports to ${user.phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Run daily reports for all active users
 * Processes all users with active report configs
 * @returns {Promise<void>}
 */
async function runDailyReports() {
  try {
    const timestamp = new Date().toISOString();
    logger.info(`[${timestamp}] Running daily reports...`);

    // Fetch all active users
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        phoneNumber: true,
        role: true,
        divisionAssigned: true,
        active: true,
      },
    });

    logger.debug(`[Reporter] Found ${users.length} active users`);

    // Process each user
    for (const user of users) {
      try {
        await sendUserReports(user);
      } catch (userError) {
        logger.error(`[Reporter] Error processing user ${user.phoneNumber}:`, userError);
        // Continue with next user if one fails
        continue;
      }
    }

    const endTimestamp = new Date().toISOString();
    logger.info(`[${endTimestamp}] Daily reports complete`);
  } catch (error) {
    logger.error('[Reporter] Error running daily reports:', error);
    throw error;
  }
}

/**
 * Initialize the daily reporter scheduler
 * Sets up cron job to run at 7:00 AM Venezuela time every day
 * @returns {object} Cron job instance
 */
function initializeScheduler() {
  try {
    // Cron expression: 0 7 * * * = 7:00 AM every day
    const job = cron.schedule('0 7 * * *', runDailyReports, {
      timezone: 'America/Caracas',
    });

    logger.info('[Reporter] Daily reporter scheduled for 7:00 AM Venezuela time');

    return job;
  } catch (error) {
    logger.error('[Reporter] Error initializing scheduler:', error);
    throw error;
  }
}

module.exports = {
  sendUserReports,
  runDailyReports,
  initializeScheduler,
};
