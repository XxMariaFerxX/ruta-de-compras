import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { generateOptimizedRoute } from '../lib/geminiClient.js';
import { supabase } from '../lib/supabaseClient.js';
import { useSession } from '../hooks/useSession.jsx';

export default function RoutePlanner(){
  const { state } = useLocation();
  const { store, products, cells } = state || {};
  const [route,setRoute] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [savedMsg,setSavedMsg] = useState('');
  const { session } = useSession();

  useEffect(()=>{ if(store && products) plan(); },[]);

  async function plan(){
    setLoading(true); setError(''); setSavedMsg('');
    try {
      let result = await generateOptimizedRoute({ storeMap: cells, products });
      // Ajustar inicio y fin según entrada y cajas
      if(result?.steps?.length){
        // Forzar inicio en entrada si existe
        if(store.entrance_cell){
          const idx = result.steps.findIndex(s=>s.cellId===store.entrance_cell);
          if(idx === -1){
            result.steps.unshift({ order:0, cellId: store.entrance_cell, products: [] });
          } else if(idx>0){
            const [entr] = result.steps.splice(idx,1);
            result.steps.unshift(entr);
          }
        }
        // Añadir caja más cercana al final si hay cajas definidas
        if(store.checkout_cells?.length){
          const last = result.steps[result.steps.length-1];
            let best=null; let bestDist=Infinity;
            for(const cid of store.checkout_cells){
              const cell = cells.find(c=>c.id===cid);
              if(!cell) continue;
              const [_,xStr] = cid.split('-');
              const dist = Math.abs(cell.x - (last?.x ?? 0)) + Math.abs(cell.y - (last?.y ?? 0));
              if(dist < bestDist){ bestDist=dist; best=cid; }
            }
            if(best && !result.steps.find(s=>s.cellId===best)){
              result.steps.push({ order: result.steps.length+1, cellId: best, products: [] });
            }
        }
        // Reasignar orden secuencial
        result.steps = result.steps.map((s,i)=> ({ ...s, order: i+1 }));
      }
      setRoute(result);
      if(!result.steps?.length){
        setError('No se pudo generar ruta (lista vacía).');
      }
    } catch(err){ setError(err.message); }
    finally { setLoading(false); }
  }

  async function save(){
    if(!route || !session) return; 
    const { error:err } = await supabase.from('routes').insert({ user_id: session.user.id, store_id: store.id, route_json: route });
    if(err){ setSavedMsg('Error al guardar'); } else { setSavedMsg('Ruta guardada'); }
  }

  if(!store) return <div className="container"><div className="card"><p>Datos insuficientes.</p></div></div>;
  return (
    <div className="container">
      <div className="card">
        <h2>Ruta óptima - {store.name}</h2>
        {loading && <p>Generando ruta...</p>}
        {error && <p style={{color:'red'}}>{error}</p>}
        {route && route.steps?.length>0 && <>
          <div className="map-legend">
            <div className="legend-item"><span className="legend-box entrance" /> Entrada</div>
            <div className="legend-item"><span className="legend-box checkout" /> Caja</div>
            <div className="legend-item"><span className="legend-box product" /> Producto</div>
            <div className="legend-item"><span className="legend-box route" /> Ruta</div>
          </div>
          <div className="map-wrapper" style={{marginTop:6}}>
            <div className="map-canvas" style={{['--cols']:store.layout_cols, position:'relative'}}>
              {cells.map(cell => {
                const isEntrance = store.entrance_cell === cell.id;
                const isCheckout = (store.checkout_cells||[]).includes(cell.id);
                const stepIdx = route.steps.findIndex(s=>s.cellId===cell.id);
                const inRoute = stepIdx !== -1;
                return (
                  <div key={cell.id} data-cell-id={cell.id} className={`map-cell ${cell.products.length? 'product':''} ${isEntrance?'entrance':''} ${isCheckout?'checkout':''}`}>
                    {!cell.products.length && <div>{cell.id}</div>}
                    {cell.products.length>0 && <div style={{fontSize:'.6rem',marginTop:2,lineHeight:1.1}}>{cell.products.map(p=> p.name).join(',')}</div>}
        {/* removed numeric badge */}
                  </div>
                );
              })}
      <RouteSvgOverlay steps={route.steps} cols={store.layout_cols} />
            </div>
          </div>
          <div className="route-steps">
            {(route.steps || []).map((s,i)=>(
              <div key={i} className="route-step">
                <div className="route-step-number">{i+1}</div>
                <div className="route-area">
                  <strong>Celda {s.cellId}</strong>
                  <div className="route-products">{s.products?.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:'.7rem',opacity:.7}}>Origen: {route.source||'desconocido'} | Distancia estimada: {route.totalDistance ?? 'n/d'}</div>
          <button className="btn btn-primary mt" onClick={save} disabled={!session}>Guardar ruta</button>
          {savedMsg && <div style={{marginTop:8,fontSize:'.8rem',color: savedMsg.includes('Error')?'red':'var(--success)'}}>{savedMsg}</div>}
        </>}
        {(!route || !route.steps?.length) && !loading && <button className="btn btn-success" onClick={plan}>Generar ruta</button>}
      </div>
    </div>
  );
}

function RouteSvgOverlay({ steps }){
  if(!steps || steps.length<2) return null;
  const [pathState,setPathState] = useState({ d:'', w:0, h:0, stroke:3 });
  useEffect(()=>{
    function recompute(){
      const canvas = document.querySelector('.map-canvas');
      if(!canvas) return;
      const pts=[];
      steps.forEach(s=>{
        const el = canvas.querySelector(`[data-cell-id='${s.cellId}']`);
        if(el){
          const r = el.getBoundingClientRect();
          const cR = canvas.getBoundingClientRect();
          // Coordenadas relativas al origen del canvas (0,0) sin volver a sumar padding
          const centerX = (r.left - cR.left) + r.width/2;
          const centerY = (r.top - cR.top) + r.height/2;
          pts.push({x:centerX,y:centerY});
        }
      });
      if(pts.length<2) return;
      const d = pts.map((p,i)=> i?`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`:`M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
      const w = Math.max(...pts.map(p=>p.x))+6;
      const h = Math.max(...pts.map(p=>p.y))+6;
      const firstCell = canvas.querySelector('.map-cell');
      const baseSize = firstCell ? firstCell.getBoundingClientRect().width : 60;
      setPathState({ d, w, h, stroke: Math.max(2, baseSize*0.026) });
    }
    // doble frame para asegurar layout estable en móviles tras zoom/orientación
    requestAnimationFrame(()=>requestAnimationFrame(recompute));
    const ro = new ResizeObserver(()=>recompute());
    const canvas = document.querySelector('.map-canvas');
    if(canvas) ro.observe(canvas);
    window.addEventListener('resize', recompute);
    const mo = new MutationObserver(()=>recompute());
    if(canvas) mo.observe(canvas,{ attributes:true, childList:true, subtree:true });
    return ()=>{ window.removeEventListener('resize', recompute); ro.disconnect(); mo.disconnect(); };
  },[steps]);
  if(!pathState.d) return null;
  return (
    <svg className="route-overlay" width={pathState.w} height={pathState.h} style={{position:'absolute',top:0,left:0}}>
      <defs>
        <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#fdd835" />
        </marker>
      </defs>
      <path d={pathState.d} fill="none" stroke="#fdd835" strokeWidth={pathState.stroke} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrow-end)" />
    </svg>
  );
}
