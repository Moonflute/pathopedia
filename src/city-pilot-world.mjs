import {compileLayout,siteAt} from './city-tile-layout.mjs';
import {compileThemeLayout} from './city-theme-layout.mjs';
import {combinePilotSurfaces} from './city-pilot-physics.mjs';
import {insideCity,CITY_RADIUS} from './city-boundary.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function segmentDistance(p,a,b){const x=b.x-a.x,z=b.z-a.z,l=x*x+z*z,q=l?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/l)):0;return Math.hypot(p.x-a.x-x*q,p.z-a.z-z*q);}
const worlds=new WeakMap();
export function pilotWorld(layout,theme){
 let variants=worlds.get(layout);if(!variants){variants=new Map();worlds.set(layout,variants);}if(variants.has(theme))return variants.get(theme);
 const network=compileLayout(layout),town=compileThemeLayout(layout,theme),decor=new Set(),stations=['lung','heart','gut','kidney','marrow','lymph'].map(id=>({id,...siteAt(layout,id)}));
 for(const p of [...town.blocks.frontages,...town.blocks.tissues,...town.blocks.lung]){
  if(p.cells){for(const key of p.cells)decor.add(key);continue;}
  const r=town.blocks.lung.includes(p)?1.2:.65;for(let x=Math.floor((p.x-r)*2);x<=Math.floor((p.x+r)*2);x++)for(let z=Math.floor((p.z-r)*2);z<=Math.floor((p.z+r)*2);z++)decor.add(x+','+z);
 }
 const corridors=[...town.vascular.vessels,...network.access,...network.streets.runs].flatMap(v=>v.points.slice(1).map((b,i)=>({a:v.points[i],b,r:Math.max(.5,(v.width||.9)/2)}))),lanes=new Set();
 if(theme==='1')for(const v of corridors)for(let x=Math.ceil((Math.min(v.a.x,v.b.x)-v.r)*4);x<=Math.floor((Math.max(v.a.x,v.b.x)+v.r)*4);x++)for(let z=Math.ceil((Math.min(v.a.z,v.b.z)-v.r)*4);z<=Math.floor((Math.max(v.a.z,v.b.z)+v.r)*4);z++)if(segmentDistance({x:x/4,z:z/4},v.a,v.b)<v.r)lanes.add(x+','+z);
 let surface=null,baseSurface=null,annexSurface=null,revision=0;
 const solid=p=>surface?surface.blocked(p):network.occupied.has(Math.round(p.x)+','+Math.round(p.z))||decor.has(Math.floor(p.x*2)+','+Math.floor(p.z*2));
 function canStand(p,kind='neutrophil'){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)||!insideCity(p.x,p.z,1.3))return false;
  const r=kind==='rbc'?.12:.18;
  if(surface?solid(p):[[0,0],[-r,-r],[r,-r],[-r,r],[r,r]].some(([x,z])=>solid({x:p.x+x,z:p.z+z})))return false;
  if(kind!=='rbc'||stations.some(s=>distance(s,p)<2.5))return true;
  return theme==='2'?town.source.isWater(p):lanes.has(Math.round(p.x*4)+','+Math.round(p.z*4));
 }
 function safe(p,kind,extra=()=>true){if(canStand(p,kind)&&extra(p))return {...p};for(let r=.25;r<=8;r+=.25)for(let i=0;i<24;i++){const q={x:p.x+Math.cos(i*Math.PI/12)*r,z:p.z+Math.sin(i*Math.PI/12)*r};if(canStand(q,kind)&&extra(q))return q;}return null;}
 function move(p,dx,dz,kind){const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.1));for(let i=0;i<n;i++){const x={x:p.x+dx/n,z:p.z};if(canStand(x,kind))p.x=x.x;const z={x:p.x,z:p.z+dz/n};if(canStand(z,kind))p.z=z.z;}return p;}
 function clear(a,b){if(surface)return surface.clear(a,b);const n=Math.max(1,Math.ceil(distance(a,b)*10));for(let i=1;i<n;i++)if((a.y??.45)+((b.y??.45)-(a.y??.45))*i/n<3&&solid({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;}
 function trace(a,d,max=26){
  if(surface)return surface.trace?.(a,d,max)||null;
  for(let t=.05;t<=max;t+=.05){const p={x:a.x+d.x*t,y:a.y+d.y*t,z:a.z+d.z*t};if(p.y>=.27&&p.y<3&&solid(p))return {...p,distance:t};}return null;
 }
 function moveBody(p,delta,height=.62){
  const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.y,delta.z)/.07));let grounded=false,ceiling=false;
  for(let i=0;i<steps;i++){
   const before={...p};p.x+=delta.x/steps;p.z+=delta.z/steps;p.y+=delta.y/steps;
   if(!insideCity(p.x,p.z,1.3)){const radius=Math.hypot(before.x,before.z),next=Math.hypot(p.x,p.z),limit=Math.max(radius,(CITY_RADIUS-1.35));p.x*=Math.min(1,limit/next);p.z*=Math.min(1,limit/next);}
   if(surface){
    for(let n=0;n<4;n++){const hit=surface.resolve(p,height);if(!hit)break;if(hit.y>.35&&delta.y<=0)grounded=true;if(hit.y<-.35&&delta.y>0)ceiling=true;}
    const wanted={x:before.x+delta.x/steps,z:before.z+delta.z/steps};
    if(delta.y<=0&&distance(p,wanted)>.025&&p.y<=before.y+.08){
     const raised={...wanted,y:before.y+.24};let overhead=false;
     for(let n=0;n<4;n++){const hit=surface.resolve(raised,height);if(!hit)break;if(hit.y<-.1)overhead=true;}
     if(!overhead&&insideCity(raised.x,raised.z,1.3)&&distance(raised,wanted)<.015&&raised.y<=before.y+.245){Object.assign(p,raised);grounded=true;}
    }
   }
   else if(p.y<3&&!canStand(p)){const x={x:p.x,z:before.z};if(canStand(x)){p.z=before.z;}else{p.x=before.x;if(!canStand(p))p.z=before.z;}if(before.y>=3){p.y=3;grounded=true;}}
   if(!insideCity(p.x,p.z,1.3)){const scale=(CITY_RADIUS-1.35)/Math.hypot(p.x,p.z);p.x*=scale;p.z*=scale;}
   if(p.y<=.001){p.y=0;grounded=true;}
  }
  return {grounded,ceiling};
 }
 function fitsBody(p,height){if(!surface)return true;const q={...p};surface.resolve(q,height);return Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<.012;}
 const passable=new Map();
 function route(a,b,kind){
  const key=(x,z)=>x+','+z,free=(x,z)=>{const k=kind+':'+key(x,z);if(!passable.has(k))passable.set(k,canStand({x:x/4,z:z/4},kind));return passable.get(k);};
  const snap=p=>{const x=Math.round(p.x*4),z=Math.round(p.z*4);for(let r=0;r<=12;r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))===r&&free(x+dx,z+dz))return {x:x+dx,z:z+dz};return null;};
  const start=snap(a),end=snap(b);if(!start||!end)return [];
  const heap=[],best=new Map(),parents=new Map(),nodes=new Map();
  const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].score<=n.score)break;heap[i]=heap[p];i=p;}heap[i]=n;};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
  const startKey=key(start.x,start.z),endKey=key(end.x,end.z);best.set(startKey,0);nodes.set(startKey,start);push({...start,k:startKey,cost:0,score:distance(start,end)});
  let reached=false,visited=0;
  while(heap.length&&visited++<65000){const p=pop();if(p.cost!==best.get(p.k))continue;if(p.k===endKey){reached=true;break;}
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=p.x+dx,z=p.z+dz;if(!free(x,z)||dx&&dz&&(!free(p.x+dx,p.z)||!free(p.x,p.z+dz)))continue;const k=key(x,z),cost=p.cost+(dx&&dz?Math.SQRT2:1);if(cost>=(best.get(k)??Infinity))continue;best.set(k,cost);parents.set(k,p.k);nodes.set(k,{x,z});push({x,z,k,cost,score:cost+Math.hypot(x-end.x,z-end.z)});}
  }
  if(!reached)return [];
  const points=[];for(let k=endKey;k;k=parents.get(k)){const p=nodes.get(k);points.push({x:p.x/4,z:p.z/4});}points.reverse();
  // Keep corner waypoints; the same collision map is used by the input mover.
  return points.filter((p,i)=>!i||i===points.length-1||(p.x-points[i-1].x)*(points[i+1].z-p.z)!==(p.z-points[i-1].z)*(points[i+1].x-p.x));
 }
 const result={canStand,safe,move,moveBody,fitsBody,clear,trace,route,stations,town,get revision(){return revision;},setSurface(value){baseSurface=value;surface=combinePilotSurfaces(baseSurface,annexSurface);revision++;passable.clear();},setAnnexSurface(value){annexSurface=value;surface=combinePilotSurfaces(baseSurface,annexSurface);revision++;passable.clear();}};variants.set(theme,result);return result;
}
