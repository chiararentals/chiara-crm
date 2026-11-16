import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bez ključeva aplikacija radi lokalno (podaci u pregledniku), kao do sada.
export const remoteEnabled = Boolean(url && key);
export const supabase = remoteEnabled ? createClient(url, key) : null;
