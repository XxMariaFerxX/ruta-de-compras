import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useSession } from '../hooks/useSession.jsx';
import { Link } from 'react-router-dom';

export default function SavedRoutes(){
  const { session } = useSession();
  const [routes,setRoutes] = useState([]);
  const [loading,setLoading] = useState(false);
  const [msg,setMsg] = useState('');

  useEffect(()=>{ if(session){ load(); } },[session]);
  async function load(){
    setLoading(true);
    const { data } = await supabase.from('routes').select('id, created_at, route_json, store_id, stores:store_id(name)').order('created_at',{ascending:false});
    setRoutes(data||[]);
    setLoading(false);
  }

  async function del(id){
    if(!confirm('¿Borrar ruta?')) return;
    const { error } = await supabase.from('routes').delete().eq('id',id);
    if(error){ setMsg('Error al borrar'); } else { setMsg('Ruta eliminada'); load(); }
    setTimeout(()=>setMsg(''),2500);
  }

  if(!session) return <div className="container"><div className="card"><p>Inicia sesión para ver tus rutas.</p></div></div>;
  return (
    <div className="container">
      <div className="card">
        <h2>Mis rutas guardadas</h2>
        {loading && <p>Cargando...</p>}
        {!loading && routes.length===0 && <p>No tienes rutas guardadas.</p>}
  {msg && <p style={{fontSize:'.7rem',color: msg.includes('Error') ? 'red':'var(--success)'}}>{msg}</p>}
        {!loading && routes.length>0 && <ul className="saved-routes-list" style={{padding:0}}>
          {routes.map(r=> <li key={r.id} className="clickable-route">
            <div>
              <strong>{r.stores?.name || 'Tienda'}</strong><br/>
              <span style={{fontSize:'.7rem',opacity:.7}}>{new Date(r.created_at).toLocaleString()} • {r.route_json?.steps?.length || 0} pasos</span>
            </div>
            <div style={{display:'flex',gap:6}}>
              <Link className="btn btn-secondary" to={`/routes/${r.id}`}>Ver</Link>
              <button className="btn btn-secondary" style={{background:'#ff4d4f',borderColor:'#ff4d4f',color:'#fff'}} onClick={()=>del(r.id)}>Borrar</button>
            </div>
          </li>)}
        </ul>}
      </div>
    </div>
  );
}