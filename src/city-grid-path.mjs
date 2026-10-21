// Bounded, deterministic A*. Callers cache the compiled town, never search on draw.
export function gridPath(start,end,allowed,cost=()=>1,limit=6000){
 const key=p=>p.col+','+p.row,goal=key(end),heap=[],scores=new Map([[key(start),0]]),previous=new Map();
 const push=n=>{let i=heap.length;heap.push(n);while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;};
 const heuristic=p=>(Math.abs(p.col-end.col)+Math.abs(p.row-end.row))*.6;
 push({...start,g:0,f:heuristic(start)});let visited=0;
 while(heap.length&&visited++<limit){
  const p=pop(),k=key(p);if(p.g!==scores.get(k))continue;
  if(k===goal){const out=[];let q=p;while(q){out.push({x:q.col,z:q.row});q=previous.get(key(q));}return out.reverse();}
  for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){const q={col:p.col+dx,row:p.row+dz},j=key(q);if(!allowed(q))continue;const turn=p.dx!=null&&(p.dx!==dx||p.dz!==dz)?.12:0,g=p.g+cost(q)+turn;if(g>=(scores.get(j)??Infinity))continue;scores.set(j,g);previous.set(j,p);push({...q,dx,dz,g,f:g+heuristic(q)});}
 }
 return null;
}

// Draw each shared street once, with the widest participating road class.
export function streetNetwork(connections){
 const edges=new Map(),rank={walk:0,entry:1,systemic:2,pulmonary:2};
 for(const c of connections)for(let i=1;i<c.points.length;i++){
  const a=c.points[i-1],b=c.points[i],length=Math.round(Math.abs(b.x-a.x)+Math.abs(b.z-a.z));
  if(!length||a.x!==b.x&&a.z!==b.z)continue;
  const dx=Math.sign(b.x-a.x),dz=Math.sign(b.z-a.z);
  for(let n=0;n<length;n++){const x=Math.round(a.x)+dx*n,z=Math.round(a.z)+dz*n,xx=x+dx,zz=z+dz,axis=dx?'x':'z',line=dx?z:x,start=dx?Math.min(x,xx):Math.min(z,zz),key=axis+':'+line+':'+start,level=rank[c.kind]||0;
   if(!edges.has(key)||edges.get(key).level<level)edges.set(key,{axis,line,start,level});
  }
 }
 const rows=new Map();for(const e of edges.values()){const k=e.axis+':'+e.line+':'+e.level;if(!rows.has(k))rows.set(k,[]);rows.get(k).push(e);}
 const runs=[];for(const row of rows.values()){row.sort((a,b)=>a.start-b.start);for(let i=0;i<row.length;){const a=row[i],start=a.start;let end=start+1;while(++i<row.length&&row[i].start===end)end++;runs.push({level:a.level,points:a.axis==='x'?[{x:start,z:a.line},{x:end,z:a.line}]:[{x:a.line,z:start},{x:a.line,z:end}]});}}
 const corners=new Map();for(const r of runs)for(const p of r.points){const k=p.x+','+p.z;if(!corners.has(k)||corners.get(k).level<r.level)corners.set(k,{...p,level:r.level});}
 return {runs,junctions:[...corners.values()],edges:edges.size};
}
