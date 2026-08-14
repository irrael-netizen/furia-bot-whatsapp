const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

/**
 * Supabase client initialization with auto-refresh and session persistence
 * Project ref: zrwhnkcetggrfcnpkixa
 */

const supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'User-Agent': 'furia-bot-whatsapp/1.0.0',
      },
    },
  }
);

module.exports = supabaseClient;
