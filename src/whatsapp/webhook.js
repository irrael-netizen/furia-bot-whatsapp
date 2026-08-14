const { getUserByPhone } = require('../supabase/auth');
const { sendWhatsappMessage } = require('./sender');
const { extractIntent, generateResponse } = require('../claude/nlu');
const { executeFinancialQuery } = require('../furia/queries');
const { checkRateLimit } = require('../utils/rateLimit');
const { formatForWhatsapp } = require('../utils/formatter');
const { logQuery } = require('../supabase/audit');
const logger = require('../logger');

/**
 * WhatsApp Webhook Handler
 * Processes incoming messages from Twilio
 * Returns immediately with XML response (Twilio requirement)
 * Actual message processing happens asynchronously
 *
 * Pipeline:
 * 1. Validate webhook and return XML immediately (Twilio requirement)
 * 2. Lookup user and verify registration
 * 3. Check rate limit
 * 4. Extract intent using Claude NLU
 * 5. Execute financial query with Supabase
 * 6. Generate response using Claude
 * 7. Log to audit trail
 * 8. Send response via WhatsApp
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

    // Process message asynchronously (don't block webhook response)
    processMessageAsync(phoneNumber, messageBody, messageSid).catch((error) => {
      logger.error({
        message: `[${messageSid}] Async processing failed`,
        error: error.message,
        stack: error.stack,
      });
    });
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

/**
 * Process message asynchronously
 * Performs all the heavy lifting after webhook response is sent
 * @param {string} phoneNumber - User's phone number
 * @param {string} messageBody - Message text
 * @param {string} messageSid - Twilio message SID
 * @private
 */
async function processMessageAsync(phoneNumber, messageBody, messageSid) {
  const startTime = Date.now();
  let user;
  let intention;
  let parameters;
  let queryResult;
  let responseText;

  try {
    // Step 1: Lookup user by phone number
    logger.debug(`[${messageSid}] Looking up user: ${phoneNumber}`);
    user = await getUserByPhone(phoneNumber);

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

    logger.debug({
      message: `[${messageSid}] User found`,
      userId: user.id,
      role: user.role,
      division: user.divisionAssigned,
    });

    // Step 2: Check rate limit
    logger.debug(`[${messageSid}] Checking rate limit for ${phoneNumber}`);
    const allowed = await checkRateLimit(phoneNumber);

    if (!allowed) {
      logger.warn(`[${messageSid}] Rate limit exceeded for ${phoneNumber}`);
      try {
        await sendWhatsappMessage(
          phoneNumber,
          'Has alcanzado el límite de consultas (30 por hora). Intenta más tarde.'
        );
      } catch (sendError) {
        logger.error({
          message: `[${messageSid}] Failed to send rate limit message`,
          error: sendError.message,
        });
      }
      return;
    }

    // Step 3: Extract intent using Claude NLU
    logger.debug(`[${messageSid}] Extracting intent from: "${messageBody}"`);
    const intentResult = await extractIntent(messageBody, user.role, user.divisionAssigned);

    intention = intentResult.intention;
    parameters = intentResult.parameters;

    logger.info({
      message: `[${messageSid}] Intent extracted`,
      intention,
      confidence: intentResult.confidence,
      parameters,
    });

    // A greeting or off-topic message has no query to run, so answer with
    // guidance instead of failing the pipeline.
    if (intention === 'no_soportado') {
      logger.info(`[${messageSid}] Unsupported query, sending guidance`);
      await sendWhatsappMessage(
        phoneNumber,
        'Consulto las cifras de seis empresas: Furia Store, Furia Energy, ' +
          'Caracas Fly, Altitude, Vida By Furia y FuriaGear.\n\n' +
          'Pregúntame por ejemplo:\n' +
          '• ¿Cuánto vendió Furia Energy?\n' +
          '• ¿Cómo va Furia Store mes a mes?\n' +
          '• ¿Cuál es el EBITDA de Caracas Fly?\n' +
          '• ¿Por qué el reporte oficial de Altitude da distinto?\n' +
          '• ¿Cuánto facturó Vida By Furia sin contabilizar?\n\n' +
          'Solo tengo el resumen mensual: no hay detalle de productos, ' +
          'clientes ni transacciones.'
      );
      return;
    }

    // Step 4: Execute financial query
    logger.debug(`[${messageSid}] Executing financial query: ${intention}`);
    queryResult = await executeFinancialQuery(phoneNumber, intention, parameters);

    logger.info({
      message: `[${messageSid}] Query executed successfully`,
      intention,
      resultKeys: Object.keys(queryResult || {}),
    });

    // Step 5: Generate response using Claude
    logger.debug(`[${messageSid}] Generating response`);
    responseText = await generateResponse(intention, queryResult);

    logger.debug(`[${messageSid}] Response generated: "${responseText.substring(0, 50)}..."`);

    // Step 6: Log to audit trail
    const duration = Date.now() - startTime;
    logger.debug(`[${messageSid}] Logging to audit trail (duration: ${duration}ms)`);

    await logQuery(
      phoneNumber,
      messageBody,
      intention,
      parameters,
      queryResult,
      true, // success
      null, // no error
      duration
    );

    // Step 7: Format and send response
    const formatted = formatForWhatsapp(responseText);
    logger.debug(`[${messageSid}] Sending response: ${formatted.length} characters`);
    await sendWhatsappMessage(phoneNumber, formatted);

    logger.info({
      message: `[${messageSid}] Completed successfully`,
      duration,
      intention,
      responseLength: formatted.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      message: `[${messageSid}] Pipeline error`,
      error: error.message,
      stack: error.stack,
      duration,
      intention: intention || 'unknown',
    });

    // Try to send error message to user
    try {
      const errorMessage =
        'Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.';
      await sendWhatsappMessage(phoneNumber, errorMessage);
    } catch (sendError) {
      logger.error({
        message: `[${messageSid}] Failed to send error message`,
        error: sendError.message,
      });
    }

    // Log the failed query to audit trail
    try {
      await logQuery(
        phoneNumber,
        messageBody,
        intention || 'unknown',
        parameters || {},
        queryResult || null,
        false, // failed
        error.message,
        duration
      );
    } catch (auditError) {
      logger.error({
        message: `[${messageSid}] Failed to log error to audit trail`,
        error: auditError.message,
      });
    }
  }
}

module.exports = {
  handleWhatsappWebhook,
};
