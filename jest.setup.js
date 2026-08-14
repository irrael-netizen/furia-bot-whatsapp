/**
 * Jest Setup File
 * Sets up environment variables and global test configuration
 */

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3000';
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACtest123456789';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15551234567';
process.env.TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+15551234567';
process.env.TWILIO_WEBHOOK_SECRET = process.env.TWILIO_WEBHOOK_SECRET || 'test_webhook_secret_key_for_testing';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test-key';
process.env.SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'test_project_id';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test_anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test_service_role_key';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'warn';
process.env.LOG_FORMAT = process.env.LOG_FORMAT || 'json';
process.env.SUPPORTED_ROLES = process.env.SUPPORTED_ROLES || 'CEO,CFO,COO,ERC';
process.env.DIVISIONS = process.env.DIVISIONS || 'Bebidas,Gear,Reestructuración';
process.env.DAILY_REPORT_HOUR = process.env.DAILY_REPORT_HOUR || '7';
process.env.DAILY_REPORT_MINUTE = process.env.DAILY_REPORT_MINUTE || '0';
process.env.DAILY_REPORT_TIMEZONE = process.env.DAILY_REPORT_TIMEZONE || 'America/Caracas';
process.env.DAILY_REPORT_EMAIL = process.env.DAILY_REPORT_EMAIL || 'test@example.com';
process.env.ENABLE_AUDIT_LOGGING = process.env.ENABLE_AUDIT_LOGGING || 'false';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test_encryption_key';
