/**
 * Natural Language Understanding (NLU) Module
 * Provides intent extraction and response generation using Claude API
 */

const anthropic = require('./client');

/**
 * Extract user intent from a query
 * Parses financial queries and returns structured intent with parameters
 *
 * @param {string} userQuery - The user's query in natural language
 * @param {string} userRole - User's role (CEO, CFO, COO, ERC)
 * @param {string} userDivision - User's division (Bebidas, Gear, Reestructuración)
 * @returns {Promise<{intention: string, parameters: object, confidence: number}>}
 * @throws {Error} If query parsing fails
 */
async function extractIntent(userQuery, userRole, userDivision) {
  const systemPrompt = `You are a parser of financial queries for Furia Holding (Divisions: Bebidas, Gear, Reestructuración).
You understand the user's role (CEO, CFO, COO, ERC) and their assigned division.

Available intentions:
- calcular_margen: Calculate margin/profitability
- listar_ventas: List sales data
- obtener_balance: Get balance sheet or financial summary
- top_productos: Get top products by revenue
- alertas: Get financial alerts or anomalies
- flujo_caja: Get cash flow data
- comparativa_periodos: Compare periods (week/month/quarter)

You MUST respond ONLY with valid JSON in this exact format:
{
  "intention": "<one of the available intentions>",
  "parameters": {
    "division": "<extracted division if mentioned, otherwise user's assigned division>",
    "periodo": "<period: mes_actual|semana_actual|trimestre_actual|year_to_date or other>",
    "producto": "<if mentioned>",
    "comparar_con": "<comparison period if applicable>"
  },
  "confidence": <0.0 to 1.0>
}

Do not include any other text or formatting.`;

  const userPrompt = `User Role: ${userRole}
User Division: ${userDivision}
User Query: "${userQuery}"`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text from response
    const responseText = response.content[0].text.trim();

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse query: Invalid JSON response from Claude`);
    }

    // Validate response structure
    if (
      !parsedResponse.intention ||
      !parsedResponse.parameters ||
      parsedResponse.confidence === undefined
    ) {
      throw new Error('Failed to parse query: Missing required fields in response');
    }

    return parsedResponse;
  } catch (error) {
    if (error.message.includes('Failed to parse query')) {
      throw error;
    }
    throw new Error(`Failed to parse query: ${error.message}`);
  }
}

/**
 * Generate a conversational response based on intent and data
 * Creates friendly, concise WhatsApp-style responses
 *
 * @param {string} intention - The extracted intention
 * @param {object} data - The data/results to include in the response
 * @returns {Promise<string>} Friendly response text
 * @throws {Error} If response generation fails
 */
async function generateResponse(intention, data) {
  const systemPrompt = `You are a friendly financial assistant for Furia Holding.
Given an intent and data, generate a concise, conversational WhatsApp-style response.
Keep responses brief (1-3 sentences), use emojis sparingly, and focus on key numbers.
Be professional but approachable.`;

  const userPrompt = `Intent: ${intention}
Data: ${JSON.stringify(data)}

Generate a friendly response.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text from response
    const responseText = response.content[0].text.trim();

    if (!responseText) {
      throw new Error('Empty response generated');
    }

    return responseText;
  } catch (error) {
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

module.exports = {
  extractIntent,
  generateResponse,
};
