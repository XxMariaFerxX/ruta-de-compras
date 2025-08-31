import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const ensureProfile = useCallback(async (uid) => {
    // Intenta obtener perfil
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (!error && data) return data;
    // Si no existe, lo creamos (fallback si trigger aún no está)
    const { error: insertError } = await supabase.from('profiles').insert({ id: uid }).select();
    if (insertError && insertError.code !== '23505') { // 23505 duplicado
      throw insertError;
    }
    const { data: data2 } = await supabase.from('profiles').select('*').eq('id', uid).single();
    return data2;
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setLoading(false); return; }
    (async () => {
      try {
        const data = await ensureProfile(session.user.id);
        // sincronizar email si falta o cambió
        if(data && data.email !== session.user.email){
          await supabase.from('profiles').update({ email: session.user.email }).eq('id', session.user.id);
          data.email = session.user.email;
        }
        setProfile(data);
      } catch (e) {
        console.error('Error cargando/creando perfil', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, ensureProfile]);

  // Suscripción realtime para cambios de rol
  useEffect(()=>{
    if(!session){
      if(channelRef.current){ supabase.removeChannel(channelRef.current); channelRef.current=null; }
      return;
    }
    if(channelRef.current){ supabase.removeChannel(channelRef.current); channelRef.current=null; }
    const channel = supabase.channel('profiles-sub-'+session.user.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, payload => {
        setProfile(p=> ({ ...(p||{}), ...payload.new }));
      })
      .subscribe();
    channelRef.current = channel;
    return ()=>{ if(channelRef.current){ supabase.removeChannel(channelRef.current); channelRef.current=null; } };
  },[session]);

  const refreshProfile = useCallback(async ()=>{
    if(!session) return;
    try{
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if(data) setProfile(data);
    }catch(e){ console.warn('No se pudo refrescar perfil', e); }
  },[session]);

  return <SessionContext.Provider value={{ session, profile, loading, refreshProfile }}>{children}</SessionContext.Provider>;
}

export function useSession() { return useContext(SessionContext); }
