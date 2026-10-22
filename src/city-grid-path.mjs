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

// Navigation uses the renderer's polylines. Arrays are ordinary two-way streets;
// {points, oneWay:true} is a directed vessel. Connections require shared nodes.
export function roadNavigator(lines){
 const nodes=new Map(),edges=[],edgeKeys=new Set(),buckets=new Map(),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),pointKey=p=>Math.round(p.x*1e6)+','+Math.round(p.z*1e6);
 const node=(p,layer,junctions)=>{const k=junctions?.get(pointKey(p))||(layer?layer+':':'')+pointKey(p);if(!nodes.has(k))nodes.set(k,{...p,key:k,links:[]});return nodes.get(k);};
 function edge(a,b,oneWay=false,layer='',junctions=null){
  const length=distance(a,b);if(length<1e-7)return;const u=node(a,layer,junctions),v=node(b,layer,junctions),k=(oneWay?[u.key,v.key]:[u.key,v.key].sort()).join('>')+':'+oneWay;if(edgeKeys.has(k))return;edgeKeys.add(k);
  const e={a:u,b:v,length,oneWay,id:edges.length};edges.push(e);u.links.push({node:v,length});if(!oneWay)v.links.push({node:u,length});
  for(let x=Math.floor(Math.min(a.x,b.x)/4);x<=Math.floor(Math.max(a.x,b.x)/4);x++)for(let z=Math.floor(Math.min(a.z,b.z)/4);z<=Math.floor(Math.max(a.z,b.z)/4);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(e);}
 }
 for(const line of lines){const points=line.points||line,junctions=line.junctions&&new Map(line.junctions.map(j=>[pointKey(j.point),j.id]));for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],axis=Math.abs(a.x-b.x)<1e-7?'z':Math.abs(a.z-b.z)<1e-7?'x':null,parts=[a];
  if(axis){const lo=Math.min(a[axis],b[axis]),hi=Math.max(a[axis],b[axis]);for(let n=Math.floor(lo)+1;n<hi-1e-7;n++)parts.push({...a,[axis]:n});parts.splice(1,parts.length-1,...parts.slice(1).sort((p,q)=>(p[axis]-q[axis])*Math.sign(b[axis]-a[axis])));}
  parts.push(b);for(let j=1;j<parts.length;j++)edge(parts[j-1],parts[j],line.oneWay===true,line.layer,junctions);
 }}
 function nearest(p){
  const x=Math.floor(p.x/4),z=Math.floor(p.z/4),seen=new Set();let best=null;
  for(let r=0;r<=32;r++){
   for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){if(r&&Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;for(const e of buckets.get((x+dx)+','+(z+dz))||[]){if(seen.has(e.id))continue;seen.add(e.id);const t=Math.max(0,Math.min(1,((p.x-e.a.x)*(e.b.x-e.a.x)+(p.z-e.a.z)*(e.b.z-e.a.z))/(e.length*e.length))),point={x:e.a.x+(e.b.x-e.a.x)*t,z:e.a.z+(e.b.z-e.a.z)*t},d=distance(p,point);if(!best||d<best.distance-1e-8)best={point,edge:e,distance:d};}}
   if(best&&best.distance<=Math.min(p.x-(x-r)*4,(x+r+1)*4-p.x,p.z-(z-r)*4,(z+r+1)*4-p.z)+1e-7)return best;
  }
  return best;
 }
 const cache=new Map();
 function route(a,b){
  const start=nearest(a),end=nearest(b);if(!start||!end)return null;
  if(start.edge===end.edge&&(!start.edge.oneWay||distance(start.edge.a,start.point)<=distance(end.edge.a,end.point)))return [start.point,end.point];
  const k=start.point.x+','+start.point.z+'>'+end.point.x+','+end.point.z;if(cache.has(k))return cache.get(k);
  const open=[],scores=new Map(),previous=new Map();
  const push=(n,g,parent=null)=>{if(g>=(scores.get(n.key)??Infinity))return;scores.set(n.key,g);previous.set(n.key,parent);const item={node:n,g,f:g+distance(n,end.point)};let i=open.length;open.push(item);while(i){const j=(i-1)>>1;if(open[j].f<=item.f)break;open[i]=open[j];i=j;}open[i]=item;};
  const pop=()=>{const first=open[0],last=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let j=i*2+1;if(j+1<open.length&&open[j+1].f<open[j].f)j++;if(open[j].f>=last.f)break;open[i]=open[j];i=j;}open[i]=last;}return first;};
  for(const n of [start.edge.a,start.edge.b])if(!start.edge.oneWay||n===start.edge.b||distance(start.point,n)<1e-7)push(n,distance(start.point,n));let best=Infinity,finish=null;
  while(open.length){const item=pop(),n=item.node;if(item.f>=best)break;if(item.g!==scores.get(n.key))continue;if(n===end.edge.a||n===end.edge.b&&(!end.edge.oneWay||distance(n,end.point)<1e-7)){const total=item.g+distance(n,end.point);if(total<best){best=total;finish=n;}}for(const link of n.links)push(link.node,item.g+link.length,n);}
  if(!finish)return null;const path=[end.point];for(let n=finish;n;n=previous.get(n.key))path.push({x:n.x,z:n.z});path.push(start.point);path.reverse();
  if(cache.size>=512)cache.delete(cache.keys().next().value);cache.set(k,path);return path;
 }
 return {nearest,route,nodes:nodes.size,edges:edges.length};
}
