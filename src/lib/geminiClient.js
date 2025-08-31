// Minimal Gemini fetch wrapper. Replace endpoint/model if needed.
function localOptimizeRoute(storeMap, products){
  // Agrupa productos por celda
  const byCell = new Map();
  products.forEach(p=>{ if(!byCell.has(p.cell_id)) byCell.set(p.cell_id, []); byCell.get(p.cell_id).push(p.name); });
  // Construye lista de celdas con coords
  const cellInfos = Array.from(byCell.keys()).map(id=>{
    const cell = storeMap.find(c=>c.id===id);
    const [r,c] = id.split('-').map(Number);
    return { id, x: cell?.x ?? c ?? 0, y: cell?.y ?? r ?? 0, products: byCell.get(id) };
  });
  if(cellInfos.length===0) return { steps:[], totalDistance:0, source:'local' };
  // Nearest neighbor heuristic
  const remaining = [...cellInfos];
  const steps=[]; let current = remaining.shift(); steps.push(current);
  let total=0;
  while(remaining.length){
    let bestIndex=0; let bestDist=Infinity;
    for(let i=0;i<remaining.length;i++){
      const d = Math.abs(current.x-remaining[i].x)+Math.abs(current.y-remaining[i].y);
      if(d<bestDist){ bestDist=d; bestIndex=i; }
    }
    total += bestDist;
    current = remaining.splice(bestIndex,1)[0];
    steps.push(current);
  }
  return { steps: steps.map((s,i)=>({ order:i+1, cellId:s.id, products:s.products })), totalDistance: total, source:'local' };
}

export async function generateOptimizedRoute({ model = import.meta.env.VITE_ROUTE_MODEL, apiKey = import.meta.env.VITE_GEMINI_API_KEY, storeMap, products }) {
  // Si no hay key usar fallback local
  if(!apiKey){
    return localOptimizeRoute(storeMap, products);
  }
  try {
    const prompt = `Given a store grid (cells with x,y) and a list of products with their cellId, output ONLY JSON: {steps:[{order:number,cellId:string,products:string[]}],totalDistance:number}. Minimize walking (Manhattan). Cells: ${JSON.stringify(storeMap.map(c=>({id:c.id,x:c.x,y:c.y})))} Products: ${products.map(p=>`${p.name}(${p.cell_id})`).join(', ')}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{ parts:[{ text: prompt }]}] })
    });
    if(!res.ok){
      return localOptimizeRoute(storeMap, products);
    }
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if(!parsed || !Array.isArray(parsed.steps) || parsed.steps.length===0){
      return localOptimizeRoute(storeMap, products);
    }
    return { ...parsed, source:'gemini' };
  } catch(e){
    return localOptimizeRoute(storeMap, products);
  }
}

export { localOptimizeRoute };
