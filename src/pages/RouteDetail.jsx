import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function RouteDetail(){
  const { routeId } = useParams();
  const [route,setRoute] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  useEffect(()=>{ load(); },[routeId]);
  async function load(){
    setLoading(true); setError('');
    const { data, error } = await supabase.from('routes').select('id, created_at, route_json, stores:store_id(name)').eq('id',routeId).single();
    if(error) setError(error.message); else setRoute(data);
    setLoading(false);
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Detalle ruta</h2>
          <Link to="/routes" className="btn btn-secondary">Volver</Link>
        </div>
        {loading && <p>Cargando...</p>}
        {error && <p style={{color:'red'}}>{error}</p>}
        {route && (
          <>
            <p style={{fontSize:'.85rem',opacity:.8}}>Tienda: <strong>{route.stores?.name || 'Tienda'}</strong> • {new Date(route.created_at).toLocaleString()}</p>
            <div className="map-legend">
              <div className="legend-item"><span className="legend-box entrance" /> Entrada</div>
              <div className="legend-item"><span className="legend-box checkout" /> Caja</div>
              <div className="legend-item"><span className="legend-box product" /> Producto</div>
              <div className="legend-item"><span className="legend-box route" /> Ruta</div>
            </div>
            <MapForRoute route={route} />
            <div className="route-steps" style={{marginTop:20}}>
              {(route.route_json?.steps||[]).map((s,i)=>(
                <div key={i} className="route-step">
                  <div className="route-step-number">{i+1}</div>
                  <div className="route-area">
                    <strong>Celda {s.cellId}</strong>
                    <div className="route-products">{(s.products||[]).join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MapForRoute({ route }){
  const steps = route.route_json?.steps||[];
  const store = { layout_cols: inferCols(steps), layout_rows: inferRows(steps), entrance_cell: steps[0]?.cellId };
  const layout = buildCells(store.layout_rows, store.layout_cols, steps);
  return (
    <div className="map-wrapper" style={{marginTop:10}}>
      <div className="map-canvas" style={{['--cols']:store.layout_cols, position:'relative'}}>
        {layout.map(cell=>{
          const stepIdx = steps.findIndex(s=>s.cellId===cell.id);
          return (
            <div key={cell.id} data-cell-id={cell.id} className={`map-cell ${stepIdx!==-1?'product':''}`}>
              <div>{cell.id}</div>
            </div>
          );
        })}
        <RouteSvgOverlay steps={steps} />
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
        <marker id="arrow-end-detail" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#fdd835" />
        </marker>
      </defs>
      <path d={pathState.d} fill="none" stroke="#fdd835" strokeWidth={pathState.stroke} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrow-end-detail)" />
    </svg>
  );
}

function buildCells(rows, cols, steps){
  const arr=[]; for(let r=0;r<rows;r++){ for(let c=0;c<cols;c++){ const id=`${r}-${c}`; arr.push({id}); } } return arr;
}
function inferCols(steps){
  let max=0; steps.forEach(s=>{ const [r,c]=s.cellId.split('-').map(Number); if(c>max) max=c; }); return max+1 || 1;
}
function inferRows(steps){
  let max=0; steps.forEach(s=>{ const [r,c]=s.cellId.split('-').map(Number); if(r>max) max=r; }); return max+1 || 1;
}