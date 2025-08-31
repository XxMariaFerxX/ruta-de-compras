import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession.jsx';

export default function Store(){
  const { id } = useParams();
  const [store,setStore] = useState(null);
  const [cells,setCells] = useState([]); // grid cells with products assigned
  const [products,setProducts] = useState([]);
  const [name,setName] = useState('');
  const [price,setPrice] = useState('');
  const [cellId,setCellId] = useState('');
  const [error,setError] = useState('');
  const { profile } = useSession();
  const navigate = useNavigate();

  useEffect(()=>{ load(); },[id]);
  async function load(){
    const { data: storeData } = await supabase.from('stores').select('*').eq('id',id).single();
    setStore(storeData);
    const { data: prodData } = await supabase.from('products').select('*').eq('store_id',id).order('created_at');
    setProducts(prodData||[]);
    // build grid cells
    if(storeData){
      const arr=[]; let counter=0;
      for(let r=0;r<storeData.layout_rows;r++){
        for(let c=0;c<storeData.layout_cols;c++){
          const cid = `${r}-${c}`;
          const prods = prodData?.filter(p=>p.cell_id===cid) || [];
            arr.push({ id: cid, x:c, y:r, products: prods });
          counter++;
        }
      }
      setCells(arr);
    }
  }

  async function addProduct(e){
    e.preventDefault(); setError('');
    try {
      if(!cellId) throw new Error('Selecciona una celda.');
      const { error:err } = await supabase.from('products').insert({ store_id:id, name, price: +price || 0, cell_id:cellId });
      if(err) throw err; setName(''); setPrice(''); setCellId(''); load();
    } catch(err){ setError(err.message); }
  }

  const cartInitial = [];
  const [cart,setCart] = useState(cartInitial);
  function toggleCart(p){ setCart(cur => cur.find(x=>x.id===p.id) ? cur.filter(x=>x.id!==p.id) : [...cur,p]); }

  const selectedCells = useMemo(()=> new Set(cart.map(p=>p.cell_id)),[cart]);

  async function deleteProduct(p){
    if(!confirm(`¿Eliminar producto "${p.name}"?`)) return;
    const { error:err } = await supabase.from('products').delete().eq('id', p.id);
    if(err){ alert('Error al borrar: '+err.message); return; }
    // recargar lista
    load();
  }

  if(!store) return <div className="container"><div className="card"><p>Cargando...</p></div></div>;
  return (
    <div className="container">
      <div className="card">
        <h2>{store.name}</h2>
        <p style={{opacity:.8,fontSize:'.85rem'}}>{store.description}</p>
        <div className="map-legend">
          <div className="legend-item"><span className="legend-box entrance" /> Entrada</div>
          <div className="legend-item"><span className="legend-box checkout" /> Caja</div>
          <div className="legend-item"><span className="legend-box product" /> Producto</div>
        </div>
        <div className="map-wrapper" style={{marginTop:10}}>
          <div className="map-canvas" style={{['--cols']:store.layout_cols}}>
            {cells.map(cell => {
              const isEntrance = store.entrance_cell === cell.id;
              const isCheckout = (store.checkout_cells||[]).includes(cell.id);
              return (
                <div key={cell.id} className={`map-cell ${cell.products.length? 'product':''} ${selectedCells.has(cell.id)?'highlight':''} ${isEntrance?'entrance':''} ${isCheckout?'checkout':''}`} onClick={()=>{ if(cell.products.length) { const prod = cell.products[0]; toggleCart(prod); } }}>
                  {!cell.products.length && <div>{cell.id}</div>}
                  {cell.products.length>0 && <div style={{fontSize:'.6rem',marginTop:2,lineHeight:1.1}}>{cell.products.map(p=> p.name).join(',')}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Productos</h2>
        <div className="grid products">
          {products.map(p=> <div key={p.id} className="product-tile" onClick={()=>toggleCart(p)}>
            <strong>{p.name}</strong>
            <span className="price">${p.price}</span>
            <span style={{fontSize:'.65rem',opacity:.6}}>Celda {p.cell_id}</span>
            {cart.find(x=>x.id===p.id) && <span className="badge">En la lista</span>}
            {profile?.role==='admin' && (
              <button
                type="button"
                style={{marginTop:4,padding:'6px 10px',background:'#ff4d4f',color:'#fff',border:'none',borderRadius:8,fontSize:'.65rem',cursor:'pointer'}}
                onClick={(e)=>{ e.stopPropagation(); deleteProduct(p); }}
              >Borrar</button>
            )}
          </div>)}
        </div>
        {products.length===0 && <p>No hay productos.</p>}
      </div>

      <div className="card">
        <h2>Lista de compras</h2>
        {cart.length===0 && <p>Aún no has agregado productos.</p>}
        <ul style={{padding:0}}>
          {cart.map(p=> <li key={p.id} style={{listStyle:'none',background:'#fff',marginBottom:8,padding:10,borderRadius:10,display:'flex',justifyContent:'space-between'}}>
            <span>{p.name}</span>
            <button className="btn btn-secondary" onClick={()=>toggleCart(p)}>Quitar</button>
          </li>)}
        </ul>
        {cart.length>0 && <button className="btn btn-success" onClick={()=>navigate(`/stores/${id}/route`, { state:{ store, products: cart, cells }})}>Generar ruta óptima</button>}
      </div>

      {profile?.role==='admin' && <div className="card">
        <h2>Agregar producto</h2>
        <form onSubmit={addProduct} className="flex">
          <div className="field"><label>Nombre</label><input value={name} onChange={e=>setName(e.target.value)} required /></div>
          <div className="field"><label>Precio</label><input type="number" value={price} onChange={e=>setPrice(e.target.value)} required /></div>
          <div className="field"><label>Celda</label>
            <select value={cellId} onChange={e=>setCellId(e.target.value)} required>
              <option value="">Seleccionar</option>
              {cells.map(c=> <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </div>
          {error && <div style={{color:'red',width:'100%'}}>{error}</div>}
          <button className="btn btn-primary">Guardar</button>
        </form>
      </div>}
      <div style={{height:40}} />
    </div>
  );
}
