/**
 * Claude/Anthropic API Client
 * Initializes and exports the Anthropic SDK client
 */

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

/**
 * Initialize Anthropic client with API key from config
 */
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

module.exports = anthropic;
