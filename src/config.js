require('dotenv').config();

/**
 * Configuration validation and loading
 * Ensures all required environment variables are set
 */

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'SUPABASE_PROJECT_ID',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'LOG_LEVEL',
  'SUPPORTED_ROLES',
  'DIVISIONS',
  'DAILY_REPORT_HOUR',
  'DAILY_REPORT_MINUTE',
  'DAILY_REPORT_TIMEZONE',
  'DAILY_REPORT_EMAIL',
  'ENABLE_AUDIT_LOGGING',
];

// Validate required environment variables
function validateConfig() {
  const missing = [];
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please copy .env.example to .env and fill in the values.`
    );
  }
}

// Parse comma-separated lists
function parseList(str) {
  return str.split(',').map(item => item.trim());
}

// Export configuration object
const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  },

  // Claude (Anthropic)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },

  // Supabase
  supabase: {
    projectId: process.env.SUPABASE_PROJECT_ID,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Rate Limiting
  rateLimit: {
    queriesPerHour: parseInt(process.env.RATE_LIMIT_QUERIES_PER_HOUR, 10) || 30,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 3600000,
  },

  // Roles and divisions
  roles: parseList(process.env.SUPPORTED_ROLES || 'CEO,CFO,COO,ERC'),
  divisions: parseList(process.env.DIVISIONS || 'Bebidas,Gear,Reestructuración'),

  // Daily Report
  dailyReport: {
    hour: parseInt(process.env.DAILY_REPORT_HOUR, 10) || 7,
    minute: parseInt(process.env.DAILY_REPORT_MINUTE, 10) || 0,
    timezone: process.env.DAILY_REPORT_TIMEZONE || 'America/Caracas',
    email: process.env.DAILY_REPORT_EMAIL || 'irrael@me.com',
  },

  // Audit & Security
  audit: {
    enableLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
    encryptionKey: process.env.ENCRYPTION_KEY,
  },

  // Webhook & Security
  security: {
    webhookSecret: process.env.TWILIO_WEBHOOK_SECRET,
  },
};

// Validate on load (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  try {
    validateConfig();
  } catch (error) {
    console.error(error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = config;
