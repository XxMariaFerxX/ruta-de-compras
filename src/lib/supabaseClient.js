import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detectamos URL del sitio para redirección de correos (prioriza variable de entorno)
const siteUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : undefined);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, isAdmin=false) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: isAdmin ? 'admin' : 'user' },
      // Redirección después de confirmar correo
      emailRedirectTo: siteUrl ? `${siteUrl}/` : undefined,
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut(){
  await supabase.auth.signOut();
}
