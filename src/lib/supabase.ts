/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are placeholders or empty
const isConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'https://your-supabase-project.supabase.co' &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseAnonKey.trim() !== '';

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!isConfigured) {
  console.warn(
    'Supabase: Não configurado ou chave inválida. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no seu arquivo .env'
  );
}
export { isConfigured };
