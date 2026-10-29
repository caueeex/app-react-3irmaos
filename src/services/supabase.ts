import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabaseUrl(): string {
  return url;
}

if (__DEV__ && !isSupabaseConfigured()) {
  console.warn(
    '[supabase] Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env (chave anon, nunca service_role).',
  );
}

export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
