import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useSession } from '../hooks/useSession.jsx';

export default function Admin(){
  const { profile } = useSession();
  const [stores,setStores] = useState([]);
  const [name,setName] = useState('');
  const [description,setDescription] = useState('');
  const [layoutCols,setLayoutCols] = useState(6);
  const [layoutRows,setLayoutRows] = useState(6);
  const [entranceCell,setEntranceCell] = useState('');
  const [checkoutCells,setCheckoutCells] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [editingId,setEditingId] = useState(null);
  const [users,setUsers] = useState([]);
  const [userSearch,setUserSearch] = useState('');
  const [userError,setUserError] = useState('');

  useEffect(()=>{ load(); },[]);
  async function load(){
    const { data } = await supabase.from('stores').select('*').order('created_at',{ascending:false});
    setStores(data||[]);
    // fetch full users list via RPC
    const { data: usersData, error: usersErr } = await supabase.rpc('admin_list_users');
    if(!usersErr && usersData){
      setUsers(usersData);
    } else {
      console.warn('Fallo admin_list_users RPC, usando fallback profiles:', usersErr);
      const { data: profFallback, error: profErr } = await supabase.from('profiles').select('id, role, email, created_at');
      if(profErr){ console.error('Error fallback profiles', profErr); setUsers([]); } else { setUsers(profFallback||[]); }
    }
  }

  function buildAllCellIds(){
    const ids=[]; for(let r=0;r<layoutRows;r++){ for(let c=0;c<layoutCols;c++){ ids.push(`${r}-${c}`);} } return ids;
  }

  function toggleCheckout(id){
    setCheckoutCells(cur=> cur.includes(id) ? cur.filter(x=>x!==id) : [...cur,id]);
  }

  async function createOrUpdateStore(e){
    e.preventDefault(); setLoading(true); setError('');
    try{
      if(editingId){
        const { error:err } = await supabase.from('stores').update({ name, description, layout_cols:layoutCols, layout_rows:layoutRows, entrance_cell: entranceCell || null, checkout_cells: checkoutCells }).eq('id', editingId);
        if(err) throw err;
      } else {
        const { error:err } = await supabase.from('stores').insert({ name, description, layout_cols:layoutCols, layout_rows:layoutRows, entrance_cell: entranceCell || null, checkout_cells: checkoutCells });
        if(err) throw err;
      }
      resetForm();
      load();
    }catch(err){ setError(err.message); } finally{ setLoading(false); }
  }

  function resetForm(){
    setEditingId(null); setName(''); setDescription(''); setEntranceCell(''); setCheckoutCells([]); setLayoutCols(6); setLayoutRows(6);
  }

  function startEdit(store){
    setEditingId(store.id); setName(store.name); setDescription(store.description||''); setLayoutCols(store.layout_cols); setLayoutRows(store.layout_rows); setEntranceCell(store.entrance_cell||''); setCheckoutCells(store.checkout_cells||[]);
  }

  async function deleteStore(id){
    if(!confirm('¿Eliminar tienda?')) return;
    await supabase.from('stores').delete().eq('id',id); load();
  }

  async function deleteUser(id){
    if(!confirm('¿Eliminar usuario? Esto borra sus rutas.')) return;
    // use RPC function admin_delete_user (assuming created)
    const { error:err } = await supabase.rpc('admin_delete_user',{ target: id });
    if(err){ setUserError(err.message); } else { setUserError(''); load(); }
  }

  if(profile?.role!=='admin') return <div className="container"><div className="card"><p>No autorizado.</p></div></div>;
  return (
    <div className="container">
      <div className="card">
  <h2>{editingId? 'Editar tienda':'Crear tienda'}</h2>
  <form onSubmit={createOrUpdateStore} className="flex">
          <div className="field"><label>Nombre</label><input value={name} onChange={e=>setName(e.target.value)} required /></div>
            <div className="field"><label>Descripción</label><input value={description} onChange={e=>setDescription(e.target.value)} /></div>
          <div className="field"><label>Columnas</label><input type="number" value={layoutCols} min={2} max={20} onChange={e=>setLayoutCols(+e.target.value)} /></div>
          <div className="field"><label>Filas</label><input type="number" value={layoutRows} min={2} max={20} onChange={e=>setLayoutRows(+e.target.value)} /></div>
          <div className="field" style={{flexBasis:'100%'}}>
            <label>Entrada</label>
            <select value={entranceCell} onChange={e=>setEntranceCell(e.target.value)}>
              <option value="">(opcional)</option>
              {buildAllCellIds().map(id=> <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div className="field" style={{flexBasis:'100%'}}>
            <label>Cajas (selecciona múltiples)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {buildAllCellIds().map(id=> <button type="button" key={id} onClick={()=>toggleCheckout(id)} className={`mini-cell-btn ${checkoutCells.includes(id)?'active':''}`}>{id}</button>)}
            </div>
            {checkoutCells.length>0 && <small style={{opacity:.7}}>Seleccionadas: {checkoutCells.join(', ')}</small>}
          </div>
          {error && <div style={{color:'red',width:'100%'}}>{error}</div>}
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" disabled={loading}>{loading? (editingId?'Guardando...':'Creando...') : (editingId? 'Guardar cambios':'Crear tienda')}</button>
            {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>}
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Tiendas existentes</h2>
        <ul className="scroll-y" style={{maxHeight:300,padding:0}}>
          {stores.map(s=> <li key={s.id} style={{listStyle:'none',marginBottom:8,background:'#fff',padding:10,borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
            <span><strong>{s.name}</strong> <span style={{fontSize:'.7rem',opacity:.6}}>{s.layout_cols}x{s.layout_rows}</span></span>
            <span style={{display:'flex',gap:6}}>
              <button className="btn btn-secondary" style={{padding:'6px 12px'}} onClick={()=>startEdit(s)}>Editar</button>
              <button className="btn btn-secondary" style={{padding:'6px 12px',background:'#ff4d4f',borderColor:'#ff4d4f',color:'#fff'}} onClick={()=>deleteStore(s.id)}>Borrar</button>
            </span>
          </li>)}
        </ul>
      </div>
      <div className="card">
        <h2>Usuarios</h2>
  <input placeholder="Buscar por email o ID" value={userSearch} onChange={e=>setUserSearch(e.target.value)} style={{marginBottom:10,width:'100%',padding:8,borderRadius:8,border:'1px solid #ccc'}} />
        {userError && <p style={{color:'red'}}>{userError}</p>}
        <ul className="scroll-y" style={{maxHeight:300,padding:0}}>
          {users.filter(u=> (u.id+ (u.email||'')).toLowerCase().includes(userSearch.toLowerCase())).map(u=> <li key={u.id} style={{listStyle:'none',marginBottom:8,background:'#fff',padding:10,borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
            <span><strong>{u.email || u.id.slice(0,8)}</strong> <span style={{fontSize:'.65rem',opacity:.6}}>({u.role})</span></span>
            {u.id !== profile.id && <button className="btn btn-secondary" style={{padding:'6px 12px',background:'#ff4d4f',borderColor:'#ff4d4f',color:'#fff'}} onClick={()=>deleteUser(u.id)}>Eliminar</button>}
          </li>)}
        </ul>
      </div>
    </div>
  );
}
