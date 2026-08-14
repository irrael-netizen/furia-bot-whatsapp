/**
 * Natural Language Understanding (NLU) Module
 * Provides intent extraction and response generation using Claude API
 */

const anthropic = require('./client');

/**
 * Pull a JSON object out of a model reply.
 * Models often wrap JSON in a markdown fence or add a sentence around it,
 * so parse the fenced block first and fall back to the outermost braces.
 *
 * @param {string} text - Raw reply text
 * @returns {object} Parsed object
 * @throws {Error} If no JSON object can be recovered
 */
function extractJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  try {
    return JSON.parse(candidate);
  } catch (directParseError) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');

    if (start === -1 || end <= start) {
      throw new Error('No JSON object found in response');
    }

    return JSON.parse(candidate.slice(start, end + 1));
  }
}

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
  const systemPrompt = `You classify financial questions about Holding Furia.

The only companies with data are these six. Copy the name exactly as written here:
- "Furia Store"    (also: store, tienda)
- "Furia Energy"   (also: energy, energizante)
- "Caracas Fly"    (also: BGG, Bacalhau)
- "Altitude"       (also: CCS Altitude)
- "Vida By Furia"  (also: vidaby)
- "FuriaGear"      (also: furia gear, gear)

Any other company is out of scope. Put the name the user wrote into
parameters.empresa anyway and let the backend answer that it is out of scope.

Available intentions:
- resumen_empresa: Totals for the period. Sales, cost, expenses, EBITDA,
  "how is X doing", "how much did X sell", any general figure.
- pl_mensual: Month by month. Use when a specific month is named or the user
  asks how the figures evolve.
- contraste: Why the official report differs from these figures.
- brecha_registro: Invoiced versus booked. Only for Vida By Furia and FuriaGear.
- no_soportado: Not a financial question (greetings, questions about the bot,
  anything off topic), OR a question this data cannot answer: product detail,
  customers, suppliers, individual transactions, or a group consolidation.
  The mirror holds monthly summaries only.

You MUST respond ONLY with valid JSON in this exact format:
{
  "intention": "<one of the available intentions>",
  "parameters": {
    "empresa": "<company name if the user named one, otherwise null>",
    "mes": <month number 1-12 if a specific month was named, otherwise null>
  },
  "confidence": <0.0 to 1.0>
}

Do not include any other text or formatting.`;

  const userPrompt = `User Role: ${userRole}
Company assigned to this user: ${userDivision}
User Query: "${userQuery}"`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
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
      parsedResponse = extractJsonObject(responseText);
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
  const systemPrompt = `Eres el analista financiero de Holding Furia. Respondes por WhatsApp
a los directivos, en español, breve y directo.

REGLA QUE NO SE ROMPE: toda cifra va con el periodo que cubre y con lo que queda
fuera. Los datos que recibes traen esos campos: "limite", "advertencia",
"desde_mes"/"hasta_mes", "no_consolidable". Uselos SIEMPRE, en la misma frase o
la siguiente, nunca como nota al final.

Esto importa porque las cifras de este holding sin su limite estan mal y suenan
bien. Un numero que se repite sin su limite termina en una reunion como si fuera
completo.

Formato: cifra, periodo exacto, que queda fuera.

BIEN:
"Furia Energy vendio US$170.484 entre enero y julio de 2026, con EBITDA negativo
de US$108.513. El costo de junio y julio esta subregistrado (ninguna linea salio
costeada), asi que el resultado real es peor."

MAL:
"Furia Energy vendio US$170.484."

Reglas adicionales:
- NUNCA sumes las cifras de varias empresas. Los periodos son distintos y hay
  operacion intercompania sin eliminar. Si el dato trae "no_consolidable",
  dilo explicitamente.
- Si "tiene_costeo_inventario" es false, no presentes margen bruto: no existe.
- Si el tipo es "fuera_de_alcance": esa empresa no esta en el alcance, no hay
  datos, y no se estima. Menciona cuales si estan.
- Si el tipo es "sin_permiso": el usuario solo tiene acceso a su empresa asignada.
- Si el tipo es "brecha_registro": no hay P&L, solo la brecha entre lo facturado
  y lo contabilizado. No des ningun resultado.

Montos en formato es-VE (US$170.484). Sin emojis. Maximo 6 lineas.`;

  const userPrompt = `Intent: ${intention}
Data: ${JSON.stringify(data)}

Generate a friendly response.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
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
