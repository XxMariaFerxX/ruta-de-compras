import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession.jsx';

export default function Dashboard(){
  const [stores,setStores] = useState([]);
  const [query,setQuery] = useState('');
  const { profile } = useSession();

  useEffect(()=>{ (async()=>{
    const { data } = await supabase.from('stores').select('*').order('created_at',{ascending:false});
    setStores(data||[]);
  })(); },[]);

  return (
    <div className="container">
      <div className="card">
        <h2>Tiendas</h2>
        <input placeholder="Buscar tiendas..." value={query} onChange={e=>setQuery(e.target.value)} style={{margin:'10px 0 20px',width:'100%',padding:12,borderRadius:14,border:'2px solid #ddd',fontSize:'.95rem'}} />
        <div className="grid stores">
          {stores.filter(s=> s.name.toLowerCase().includes(query.toLowerCase()) || (s.description||'').toLowerCase().includes(query.toLowerCase())).map(s=> (
            <Link to={`/stores/${s.id}`} key={s.id} className="store-tile">
              <strong>{s.name}</strong>
              <span style={{fontSize:'.75rem',opacity:.7}}>{s.description}</span>
              <span className="badge">{s.layout_cols}x{s.layout_rows}</span>
            </Link>
          ))}
          {stores.length===0 && <p>No hay tiendas todavía.</p>}
        </div>
        {profile?.role==='admin' && <Link to="/admin" className="btn btn-primary mt">Administrar</Link>}
      </div>
    </div>
  );
}
