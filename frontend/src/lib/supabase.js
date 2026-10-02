import { createClient } from '@supabase/supabase-js';

function hasRealValue(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('YOUR_');
}

export const hasSupabaseConfig =
  hasRealValue(import.meta.env.VITE_SUPABASE_URL) &&
  hasRealValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = hasSupabaseConfig
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  : null;

export const supabaseConfigMessage =
  hasSupabaseConfig
    ? ''
    : 'CampusHub is missing its Supabase configuration. Copy frontend/.env.example to frontend/.env and add your real project URL and anon key, then restart the dev server.';