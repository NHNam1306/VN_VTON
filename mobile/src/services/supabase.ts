import { createClient } from '@supabase/supabase-js';

import { authStorage } from './auth-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder-key';

export const authConfigurationError =
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? null
    : 'Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
