import {compileLayout,walkingRoute,stationOwner,placeable,transformPoint,tissueAt,tissuePresent} from './city-tile-layout.mjs';
import {groundPoint,groundCoordinate,workStationPoints} from './city-three-layout.mjs';
import {CITY_CAPS} from './city-world.mjs';
import {gridPath,roadNavigator} from './city-grid-path.mjs';
import {insideCity,rimPoint} from './city-boundary.mjs';
import {SKIN_TISSUES} from './city-frontier-data.mjs';
import {homeSites} from './city-homeostasis-data.mjs';
export const SYSTEMIC_RADII=Object.freeze({artery:31,vein:28.6});

// Two directed trunks share each corridor: outward arteries and returning veins.
// They meet only at the heart and local exchange beds. Pulmonary circulation has
// its own corridor and reverses the oxygen colours, not the direction of flow.
const cache=new WeakMap(),key=p=>Math.round(p.x)+','+Math.round(p.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clean=points=>points.filter((p,i,a)=>!i||distance(p,a[i-1])>1e-6);
function simplify(points){return clean(points).filter((p,i,a)=>!i||i===a.length-1||Math.abs((p.x-a[i-1].x)*(a[i+1].z-p.z)-(p.z-a[i-1].z)*(a[i+1].x-p.x))>1e-6);}
function flow(id,kind,points,width,oxygenated){
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i-1],points[i]));
 return {id,kind,points,width,oxygenated,lengths,length:lengths.at(-1)};
}
function lane(points,side,network){
 const sampled=[];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(distance(a,b)*4));for(let j=0;j<n;j++)sampled.push({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n});}sampled.push(points.at(-1));
 const snap=p=>({x:+p.x.toFixed(5),z:+p.z.toFixed(5)}),free=p=>!network.occupied.has(key(p));
 const result=sampled.map((p,i)=>{
  if(!i||i===sampled.length-1)return p;
  const a=sampled[i-1],b=sampled[i+1],length=distance(a,b)||1,dx=-(b.z-a.z)/length,dz=(b.x-a.x)/length;
  // Narrow the pair at a pre-existing tight quay, never cut a building corner.
  let offset=.68*side;for(let n=0;n<5;n++){const q=snap({x:p.x+dx*offset,z:p.z+dz*offset});if([[0,0],[.18,0],[-.18,0],[0,.18],[0,-.18]].every(([x,z])=>free({x:q.x+x,z:q.z+z})))return q;offset*=.5;}
  return snap(p);
 });
 // Adjacent clear points can still clip a square corner. Pull both endpoints
 // toward the authored centre line before simplifying the resulting polyline.
 for(let pass=0;pass<6;pass++)for(let i=1;i<result.length;i++){
  const a=result[i-1],b=result[i],steps=Math.max(1,Math.ceil(distance(a,b)*12));let clear=true;
  for(let j=0;j<=steps;j++)if(!free({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps})){clear=false;break;}
  if(!clear)for(const index of [i-1,i])result[index]=snap({x:(result[index].x+sampled[index].x)/2,z:(result[index].z+sampled[index].z)/2});
 }
 return simplify(result);
}
export function compileVascularLayout(layout,shape='round',obstacles=null){
 if(!layout)return null;let variants=cache.get(layout);if(!variants){variants=new Map();cache.set(layout,variants);}const variant=obstacles||shape;if(variants.has(variant))return variants.get(variant);
 const network=compileLayout(layout),centres=Object.fromEntries(network.districts.map(d=>[d.id,groundPoint(d)])),heart=centres.heart,annex=homeSites(layout);
 for(const o of annex)centres[o.id]={x:o.x,z:o.z};
 const square=shape==='square',occupied=obstacles?{has:k=>network.occupied.has(k)||obstacles.has(k)}:network.occupied,streets={occupied};
 const ringPoint=(angle,radius)=>{const p=rimPoint(angle,radius);if(!square)return p;const scale=radius*.94/Math.max(Math.abs(p.x),Math.abs(p.z));return {x:p.x*scale,z:p.z*scale};};
 const vessels=[],beds=[],lines=[];
 const allowed=p=>insideCity(p.col,p.row,1.6)&&!occupied.has(p.col+','+p.row);
 const free=p=>[[0,0],[.08,.08],[-.08,.08],[.08,-.08],[-.08,-.08]].every(([x,z])=>allowed({col:Math.round(p.x+x),row:Math.round(p.z+z)}));
 const clear=(a,b)=>{const steps=Math.max(2,Math.ceil(distance(a,b)*8));for(let i=0;i<=steps;i++)if(!free({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps}))return false;return true;};
 const safe=p=>{if(free(p))return p;for(let r=1;r<8;r++)for(let z=-r;z<=r;z++)for(let x=-r;x<=r;x++){const q={x:Math.round(p.x)+x,z:Math.round(p.z)+z};if(free(q))return q;}return p;};
 const link=(a,b,cost=()=>1)=>{if(!square||Math.abs(a.x-b.x)<1e-6||Math.abs(a.z-b.z)<1e-6){if(clear(a,b))return [a,b];}else for(const p of [{x:b.x,z:a.z},{x:a.x,z:b.z}])if(clear(a,p)&&clear(p,b))return clean([a,p,b]);const middle=gridPath({col:Math.round(a.x),row:Math.round(a.z)},{col:Math.round(b.x),row:Math.round(b.z)},allowed,cost,12000);return simplify([a,...(middle||[]),b]);};
 const add=(id,kind,points,width,site,circuit='systemic')=>{const safePoints=[];for(let i=1;i<points.length;i++)safePoints.push(...link(points[i-1],points[i]).slice(0,-1));safePoints.push(points.at(-1));const v=flow(id,kind,id.startsWith('systemic-')?clean(safePoints):simplify(safePoints),width,site==='lung'?kind==='vein':kind==='artery');Object.assign(v,{site,circuit,oneWay:true,layer:id});vessels.push(v);lines.push(v);return v;};
 function ring(radius){
  const gates=Array.from({length:72},(_,n)=>safe(ringPoint(-Math.PI/2+n*Math.PI/36,radius))),points=[];
  for(let n=0;n<gates.length;n++)points.push(...link(gates[n],gates[(n+1)%72],p=>1+Math.abs((square?Math.max(Math.abs(p.col),Math.abs(p.row))/.94:Math.hypot(p.col,p.row))-radius)*2).slice(0,-1));
  points.push(gates[0]);return {gates,points};
 }
 // Blood exits the heart, traverses the selected supply circuit, exchanges in a
 // tissue bed, then continues clockwise on the return ring to the heart.
 const arterial=ring(SYSTEMIC_RADII.artery),venous=ring(SYSTEMIC_RADII.vein);
 add('systemic-arterial-ring','artery',arterial.points,1.65,'body');
 add('systemic-venous-ring','vein',venous.points,1.5,'body');
 const stem=link(heart,safe(ringPoint(0,29.8)));
 add('aorta','artery',[...lane(stem,1,streets).slice(0,-1),arterial.gates[18]],1.2,'body');
 add('vena-cava','vein',[venous.gates[18],...lane(stem,-1,streets).slice(0,-1).reverse()],1.2,'body');
 for(const id of ['gut','kidney','marrow','lymph',...annex.map(o=>o.id)]){
  const p=centres[id],angle=(Math.atan2(p.z,p.x)+Math.PI/2+Math.PI*2)%(Math.PI*2),n=Math.round(angle/Math.PI*36)%72;
  const base=link(p,safe(ringPoint(-Math.PI/2+n*Math.PI/36,29.8)));
  add('artery-'+id,'artery',[arterial.gates[n],...lane(base,1,streets).slice(0,-1).reverse()],.95,id);
  if(id==='gut'||id==='spleen'){
   const portal=add('vein-'+id,'vein',link(p,centres.liver),.8,id,'portal');portal.portal=true;
  }else add('vein-'+id,'vein',[...lane(base,-1,streets).slice(0,-1),venous.gates[n]],.95,id);
 }
 const systemic=new Set();for(const v of vessels)for(const p of v.points)systemic.add(key(p));
 const lung=centres.lung,pulmonary=gridPath({col:Math.round(heart.x),row:Math.round(heart.z)},{col:Math.round(lung.x),row:Math.round(lung.z)},allowed,p=>systemic.has(p.col+','+p.row)?8:1,12000);
 const pulmonaryBase=simplify([heart,...(pulmonary||network.vascular.lung),lung]);
 add('artery-lung','artery',lane(pulmonaryBase,1,streets),1.25,'lung','pulmonary');
 add('vein-lung','vein',lane(pulmonaryBase,-1,streets).reverse(),1.25,'lung','pulmonary');
 const peripheral=[];
 for(const t of SKIN_TISSUES){
  if(!tissuePresent({layout},t))continue;
  const p=safe(groundPoint(tissueAt({layout},t).point)),angle=(Math.atan2(p.z,p.x)+Math.PI/2+Math.PI*2)%(Math.PI*2),n=Math.round(angle/Math.PI*36)%72;
  const base=link(p,safe(ringPoint(-Math.PI/2+n*Math.PI/36,29.8)));
  add('artery-skin-'+t.skinWall,'artery',[arterial.gates[n],...lane(base,1,streets).slice(0,-1).reverse()],.65,'skin');
  add('vein-skin-'+t.skinWall,'vein',[...lane(base,-1,streets).slice(0,-1),venous.gates[n]],.58,'skin');
  peripheral.push({id:t.id,site:t.district,point:p});
 }
 for(const [id,centre] of Object.entries(centres)){
  const branches=[];
  if(annex.some(o=>o.id===id)){beds.push({id,centre,branches:[],width:.62});continue;}
  for(const role of ['oxygen','dock'])for(let slot=0;slot<(role==='oxygen'?CITY_CAPS.workSlots:1+CITY_CAPS.extensions);slot++){
   const owner=stationOwner(layout,id,role,slot),bay=workStationPoints(id,role,slot,owner!==id?placeable(owner).origin:null),stand=transformPoint(layout,owner,bay.stand);
   const points=simplify([centre,...walkingRoute(layout,groundCoordinate(centre),[groundCoordinate(stand)]).map(groundPoint)]);
   if(points.length<2)continue;branches.push(points);lines.push({points,layer:'bed:'+id,junctions:[{point:centre,id:'exchange:'+id}]});
  }
  beds.push({id,centre,branches,width:.62});
 }
 // Crossing vessels are not shunts: only authored gates and exchange beds
 // connect the two circulations, even when a narrow old block shares a quay.
 const gateId=(kind,p)=>kind+':'+Math.round(p.x*1e6)+','+Math.round(p.z*1e6);
 for(const v of vessels){
  if(v.id==='systemic-arterial-ring'||v.id==='systemic-venous-ring'){const ring=v.kind==='artery'?arterial:venous;v.junctions=ring.gates.map(point=>({point,id:gateId(v.kind,point)}));continue;}
  const first=v.points[0],last=v.points.at(-1),out=v.kind==='artery';
  if(v.portal)v.junctions=[{point:first,id:'exchange:'+v.site},{point:last,id:'exchange:liver'}];
  else if(v.circuit==='pulmonary')v.junctions=[{point:first,id:'exchange:'+(out?'heart':'lung')},{point:last,id:'exchange:'+(out?'lung':'heart')}];
  else if(v.id==='aorta'||v.id==='vena-cava')v.junctions=[{point:out?first:last,id:'exchange:heart'},{point:out?last:first,id:gateId(v.kind,out?last:first)}];
  else {const id=v.site==='skin'?'skin-'+v.id.split('-').at(-1):v.site;v.junctions=[{point:out?first:last,id:gateId(v.kind,out?first:last)},{point:out?last:first,id:'exchange:'+id}];}
 }
 const navigation=roadNavigator(lines);
 const result={shape,vessels,beds,navigation,centres,peripheral,systemic:{arterial,venous},pulmonary: vessels.filter(v=>v.circuit==='pulmonary')};variants.set(variant,result);return result;
}

// The engine keeps its jobs and cargo. Only long-distance RBC/courier navigation
// changes; local loading, immune work and external entry paths remain intact.
export function vascularWalkingRoute(layout,from,target,vascular=compileVascularLayout(layout)){
 if(!target)return [];
 const a=groundPoint(from),b=groundPoint(target);
 if(distance(a,b)<3)return walkingRoute(layout,from,[target]);
 const path=vascular.navigation.route(a,b);
 if(!path)return walkingRoute(layout,from,[target]);
 const entry=distance(a,path[0])>.01?walkingRoute(layout,from,[groundCoordinate(path[0])]).map(groundPoint):[];
 const exit=distance(path.at(-1),b)>.01?walkingRoute(layout,groundCoordinate(path.at(-1)),[target]).map(groundPoint):[];
 return simplify([...entry,...path,...exit]).slice(0,CITY_CAPS.path).map(groundCoordinate);
}
