import {naturalWaterway,simplifyWaterway,roundWaterway,softenWaterway} from './city-waterways.mjs';
import {compileLayout,walkingRoute,walkablePoint,stationOwner,placeable,transformPoint,tissueAt,tissuePresent} from './city-tile-layout.mjs';
import {groundPoint,groundCoordinate,workStationPoints} from './city-three-layout.mjs';
import {CITY_CAPS} from './city-world.mjs';
import {gridPath,roadNavigator} from './city-grid-path.mjs';
import {insideCity,rimPoint} from './city-boundary.mjs';
import {SKIN_TISSUES} from './city-frontier-data.mjs';
import {homeSites} from './city-homeostasis-data.mjs';
export const SYSTEMIC_RADII=Object.freeze({artery:41,vein:38.6});
export const VASCULAR_REVISION=6;
const SQUARE_RADII=Object.freeze({artery:31,vein:28.6});

// Two directed trunks share each corridor: outward arteries and returning veins.
// They meet only at the heart and local exchange beds. Pulmonary circulation has
// its own corridor and reverses the oxygen colours, not the direction of flow.
const cache=new WeakMap(),key=p=>Math.round(p.x)+','+Math.round(p.z);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clean=points=>points.filter((p,i,a)=>!i||distance(p,a[i-1])>1e-6);
function simplify(points){return clean(points).filter((p,i,a)=>!i||i===a.length-1||Math.abs((p.x-a[i-1].x)*(a[i+1].z-p.z)-(p.z-a[i-1].z)*(a[i+1].x-p.x))>1e-6);}
function removeShortDetours(points,clear){
 const route=clean(points);
 // Keep the first and last approaches aligned with their junctions.
 for(let i=2;i<route.length-2;){
  const a=route[i-1],b=route[i],c=route[i+1];
  const incoming=distance(a,b),outgoing=distance(b,c),shortcut=distance(a,c);
  if(Math.min(incoming,outgoing)<1.4&&shortcut<.86*(incoming+outgoing)&&clear(a,c)){
   route.splice(i,1);i=Math.max(2,i-1);
  }else i++;
 }
 return route;
}
function flow(id,kind,points,width,oxygenated){
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i-1],points[i]));
 return {id,kind,points,width,oxygenated,lengths,length:lengths.at(-1)};
}
function lane(points,side,network,endDirection=null,spacing=.68,waterClear=null){
 const sampled=[];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(distance(a,b)*4));for(let j=0;j<n;j++)sampled.push({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n});}sampled.push(points.at(-1));
 const snap=p=>({x:+p.x.toFixed(5),z:+p.z.toFixed(5)}),free=p=>!network.occupied.has(key(p));
 const result=sampled.map((p,i)=>{
  if(!i||i===sampled.length-1&&!endDirection)return p;
  const a=sampled[i-1],b=sampled[Math.min(i+1,sampled.length-1)],length=distance(a,b)||1,dx=i===sampled.length-1?-endDirection.z:-(b.z-a.z)/length,dz=i===sampled.length-1?endDirection.x:(b.x-a.x)/length;
  // Narrow the pair at a pre-existing tight quay, never cut a building corner.
  const taper=waterClear?Math.min(1,distance(p,sampled[0])/1.4,endDirection?1:distance(p,sampled.at(-1))/1.4):1;
  let offset=spacing*side*taper;
  for(let n=0;n<5;n++){
   const q=snap({x:p.x+dx*offset,z:p.z+dz*offset});
   if(waterClear?waterClear(p,q):[[0,0],[.18,0],[-.18,0],[0,.18],[0,-.18]].every(([x,z])=>free({x:q.x+x,z:q.z+z})))return q;
   offset*=.5;
  }
  return snap(p);
 });
 // Adjacent clear points can still clip a square corner. Pull both endpoints
 // toward the authored centre line before simplifying the resulting polyline.
 for(let pass=0;pass<6;pass++)for(let i=1;i<result.length;i++){
  const a=result[i-1],b=result[i],steps=Math.max(1,Math.ceil(distance(a,b)*12));let clear=waterClear?waterClear(a,b):true;
  if(!waterClear)for(let j=0;j<=steps;j++)if(!free({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps})){clear=false;break;}
  if(!clear)for(const index of [i-1,i])result[index]=snap({x:(result[index].x+sampled[index].x)/2,z:(result[index].z+sampled[index].z)/2});
 }
 // Keep one checked centreline through a tight corner. Routing separately
 // between offset samples can send the lane back through the same grid cell.
 if(waterClear)return result.slice(1).every((p,i)=>waterClear(result[i],p))?result:points;
 return simplify(result);
}
export function compileVascularLayout(layout,shape='round',obstacles=null){
 if(!layout)return null;let variants=cache.get(layout);if(!variants){variants=new Map();cache.set(layout,variants);}const variant=obstacles||shape;if(variants.has(variant))return variants.get(variant);
 const network=compileLayout(layout),centres=Object.fromEntries(network.districts.map(d=>[d.id,groundPoint(d)])),heart=centres.heart,annex=homeSites(layout);
 for(const o of annex)centres[o.id]={x:o.x,z:o.z};
 const square=shape==='square',occupied=obstacles?{has:k=>network.occupied.has(k)||obstacles.has(k)}:network.occupied,streets={occupied};
 // The square already reaches the outer neighbourhoods at its corners. Expand
 // the circular trunks and derive every branch junction from that same pair.
 const radii=square?SQUARE_RADII:SYSTEMIC_RADII,branchRadius=(radii.artery+radii.vein)/2;
 const ringPoint=(angle,radius)=>{const p=rimPoint(angle,radius);if(!square)return p;const scale=radius*.94/Math.max(Math.abs(p.x),Math.abs(p.z));return {x:p.x*scale,z:p.z*scale};};
 const vessels=[],beds=[],lines=[];
 const allowed=p=>insideCity(p.col,p.row,1.6)&&!occupied.has(p.col+','+p.row);
 const free=p=>[[0,0],[.08,.08],[-.08,.08],[.08,-.08],[-.08,-.08]].every(([x,z])=>allowed({col:Math.round(p.x+x),row:Math.round(p.z+z)}));
 const clear=(a,b)=>{const steps=Math.max(2,Math.ceil(distance(a,b)*8));for(let i=0;i<=steps;i++)if(!free({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps}))return false;return true;};
 const safe=p=>{if(free(p))return p;for(let r=1;r<8;r++)for(let z=-r;z<=r;z++)for(let x=-r;x<=r;x++){const q={x:Math.round(p.x)+x,z:Math.round(p.z)+z};if(free(q))return q;}return p;};
 const link=(a,b,cost=()=>1)=>{if(!square||Math.abs(a.x-b.x)<1e-6||Math.abs(a.z-b.z)<1e-6){if(clear(a,b))return [a,b];}else for(const p of [{x:b.x,z:a.z},{x:a.x,z:b.z}])if(clear(a,p)&&clear(p,b))return clean([a,p,b]);const middle=gridPath({col:Math.round(a.x),row:Math.round(a.z)},{col:Math.round(b.x),row:Math.round(b.z)},allowed,cost,12000);return simplify([a,...(middle||[]),b]);};
 // Reserve turning room before smoothing. Near a real destination the margin
 // tapers away, so narrow saved entrances remain reachable.
 const nearby=new Map();
 const buildingGap=p=>{const k=key(p);if(!nearby.has(k)){const cx=Math.round(p.x),cz=Math.round(p.z),cells=[];for(let x=cx-3;x<=cx+3;x++)for(let z=cz-3;z<=cz+3;z++)if(occupied.has(x+','+z))cells.push({x,z});nearby.set(k,cells);}let gap=3;for(const q of nearby.get(k))gap=Math.min(gap,Math.hypot(Math.max(0,Math.abs(p.x-q.x)-.58),Math.max(0,Math.abs(p.z-q.z)-.58)));return gap;};
 const branch=(a,b,options={})=>{
  if(square)return link(a,b);
  const roomy=p=>free(p)&&buildingGap(p)>=Math.min(1.2,distance(p,a)*.55,distance(p,b)*.55);
  const guideClear=(p,q)=>{const steps=Math.max(2,Math.ceil(distance(p,q)*6));for(let n=0;n<=steps;n++)if(!roomy({x:p.x+(q.x-p.x)*n/steps,z:p.z+(q.z-p.z)*n/steps}))return false;return true;};
  const guide=(p,q)=>{
   const start={col:Math.round(p.x),row:Math.round(p.z)},end={col:Math.round(q.x),row:Math.round(q.z)};
   const middle=gridPath(start,end,t=>roomy({x:t.col,z:t.row}),()=>1,12000)||gridPath(start,end,allowed,t=>1+4*Math.max(0,1.6-buildingGap({x:t.col,z:t.row}))**2,12000);
   return middle?clean([p,...middle,q]):link(p,q);
  };
  return naturalWaterway(a,b,{link:guide,clear,guideClear,...options});
 };
 const feeders=new Map(),tangent=(index,direction=1)=>{const t=-Math.PI/2+index*Math.PI/36;return {x:-Math.sin(t)*direction,z:Math.cos(t)*direction};};
 const alignment=(points,direction,end=false)=>{const i=end?points.length-1:1,a=points[i-1],b=points[i],length=distance(a,b)||1;return ((b.x-a.x)*direction.x+(b.z-a.z)*direction.z)/length;};
 function feeder(n,sign,stem){
  const key=n+':'+sign+':'+stem;if(feeders.has(key))return feeders.get(key);let best=null,score=-Infinity;
  for(const index of [n,(n+4)%72,(n+68)%72,(n+8)%72,(n+64)%72]){
   const angle=-Math.PI/2+(index+.5)*Math.PI/36,radial={x:Math.cos(angle),z:Math.sin(angle)},root=safe(ringPoint(angle,branchRadius-sign*4.2)),toward={x:radial.x*sign,z:radial.z*sign},side=stem?sign:-sign,spacing=stem?.36:.26;
   const outward={x:root.x-toward.z*spacing*side,z:root.z+toward.x*spacing*side},inward={x:root.x+toward.z*spacing*side,z:root.z-toward.x*spacing*side},a=(index+(stem?1:0))%72,v=(index+(stem?0:1))%72;
   if(!free(outward)||!free(inward))continue;
   const at=tangent(a,stem?-1:1),vt=tangent(v,stem?-1:1);
   const supply=branch(arterial.gates[a],outward,{startDirection:at,endDirection:{x:-toward.x,z:-toward.z}}),returning=branch(inward,venous.gates[v],{startDirection:toward,endDirection:vt});
   const quality=Math.min(alignment(supply,at),alignment(returning,vt,true));
   if(quality>score){score=quality;best={root,toward,side,a,v};}if(quality>.94)break;
  }
  if(!best){const angle=-Math.PI/2+(n+.5)*Math.PI/36;best={root:safe(ringPoint(angle,branchRadius-sign*4.2)),toward:{x:Math.cos(angle)*sign,z:Math.sin(angle)*sign},side:stem?sign:-sign,a:(n+(stem?1:0))%72,v:(n+(stem?0:1))%72};}
  feeders.set(key,best);return best;
 }
 function branches(p,n,stem=false){
  if(square){const base=link(p,safe(ringPoint(-Math.PI/2+n*Math.PI/36,branchRadius)));
   return {artery:[arterial.gates[n],...lane(base,1,streets).slice(0,-1).reverse()],vein:[...lane(base,-1,streets).slice(0,-1),venous.gates[n]]};
  }
  // Nearby outer tissues share a feeder. Paired mouths follow the trunk's
  // tangent before turning toward the neighbourhood, rather than meeting at 90 degrees.
  n=stem?n:(Math.round(n/4)*4)%72;
  const sign=Math.hypot(p.x,p.z)<branchRadius?1:-1,{root,toward,side,a,v}=feeder(n,sign,stem);
  const base=branch(p,root,{endDirection:toward}),spacing=stem?.36:.26,outward=lane(base,side,streets,toward,spacing,clear),inward=lane(base,-side,streets,toward,spacing,clear);
  const supply=branch(arterial.gates[a],outward.at(-1),{startDirection:tangent(a,stem?-1:1),endDirection:{x:-toward.x,z:-toward.z}});
  const returning=branch(inward.at(-1),venous.gates[v],{startDirection:toward,endDirection:tangent(v,stem?-1:1)});
  return {artery:clean([...supply,...outward.slice(0,-1).reverse()]),vein:clean([...inward,...returning.slice(1)])};
 }
 function add(id,kind,points,width,site,circuit='systemic'){
  if(square){
   const safePoints=[];
   for(let i=1;i<points.length;i++)safePoints.push(...link(points[i-1],points[i]).slice(0,-1));
   points=[...safePoints,points.at(-1)];
  }
  const path=id.startsWith('systemic-')?clean(points):square?simplify(points):simplifyWaterway(softenWaterway(roundWaterway(removeShortDetours(points,clear),clear),clear),clear);
  const vessel=flow(id,kind,path,width,site==='lung'?kind==='vein':kind==='artery');
  Object.assign(vessel,{site,circuit,oneWay:true,layer:id});vessels.push(vessel);lines.push(vessel);return vessel;
 }
 function ring(radius){
  const gates=Array.from({length:72},(_,n)=>safe(ringPoint(-Math.PI/2+n*Math.PI/36,radius))),points=[];
  const followRing=(a,b)=>link(a,b,p=>1+Math.abs((square?Math.max(Math.abs(p.col),Math.abs(p.row))/.94:Math.hypot(p.col,p.row))-radius)*2);
  for(let n=0;n<gates.length;n++){
   const a=gates[n],b=gates[(n+1)%72];
   const section=square?followRing(a,b):simplifyWaterway(naturalWaterway(a,b,{link:followRing,clear}),clear);
   points.push(...section.slice(0,-1));
  }
  points.push(gates[0]);
  if(square)return {gates,points};
  // Smooth across the old section boundaries, then put junctions back on the
  // resulting ring. Fixed grid-snapped gates otherwise leave a kink each side.
  const rounded=simplifyWaterway(softenWaterway(points,clear,true),clear),pins=new Map();
  for(let n=0;n<gates.length;n++){
   let nearest=null;
   for(let i=1;i<rounded.length;i++){
    const a=rounded[i-1],b=rounded[i],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((gates[n].x-a.x)*dx+(gates[n].z-a.z)*dz)/l)):0,p={x:a.x+dx*t,z:a.z+dz*t},d=distance(gates[n],p);
    if(!nearest||d<nearest.distance)nearest={index:i,t,point:p,distance:d};
   }
   gates[n]=nearest.point;if(!pins.has(nearest.index))pins.set(nearest.index,[]);pins.get(nearest.index).push(nearest);
  }
  const connected=[rounded[0]];
  for(let i=1;i<rounded.length;i++)connected.push(...(pins.get(i)||[]).sort((a,b)=>a.t-b.t).map(p=>p.point),rounded[i]);
  return {gates,points:clean(connected)};
 }
 // Blood exits the heart, traverses the selected supply circuit, exchanges in a
 // tissue bed, then continues clockwise on the return ring to the heart.
 const arterial=ring(radii.artery),venous=ring(radii.vein);
 add('systemic-arterial-ring','artery',arterial.points,1.65,'body');
 add('systemic-venous-ring','vein',venous.points,1.5,'body');
 const stem=branches(heart,18,true);
 add('aorta','artery',[...stem.artery].reverse(),square?1.2:.66,'body');
 add('vena-cava','vein',[...stem.vein].reverse(),square?1.2:.66,'body');
 const portalHub=safe({x:centres.liver.x-8,z:centres.liver.z+5}),portalTrunk=branch(portalHub,centres.liver);
 function portalPath(id,p){
  if(square)return link(p,centres.liver);
  const anchors=[p];
  if(id==='spleen'){
   // The splenic return bends around the southern working neighbourhoods;
   // it does not excavate a straight cross-city trench through the centre.
   let from=Math.atan2(p.z,p.x),to=Math.atan2(portalHub.z,portalHub.x);if(from<to)from+=Math.PI*2;
   const steps=Math.max(2,Math.ceil((from-to)/.32));
   for(let n=0;n<=steps;n++){const angle=from+(to-from)*n/steps;anchors.push(safe(ringPoint(angle,branchRadius-10+2.5*Math.sin(angle*2))));}
  }
  anchors.push(portalHub);const path=[];
  for(let n=1;n<anchors.length;n++)path.push(...branch(anchors[n-1],anchors[n]).slice(0,-1));
  return clean([...path,...portalTrunk]);
 }
 for(const id of ['gut','kidney','marrow','lymph',...annex.map(o=>o.id)]){
  const p=centres[id],angle=(Math.atan2(p.z,p.x)+Math.PI/2+Math.PI*2)%(Math.PI*2),n=Math.round(angle/Math.PI*36)%72;
  const pair=branches(p,n);
  add('artery-'+id,'artery',pair.artery,square?.95:.46,id);
  if(id==='gut'||id==='spleen'){
   const portal=add('vein-'+id,'vein',portalPath(id,p),square?.8:.4,id,'portal');portal.portal=true;
  }else add('vein-'+id,'vein',pair.vein,square?.95:.46,id);
 }
 const systemic=new Set();for(const v of vessels)for(const p of v.points)systemic.add(key(p));
 const lung=centres.lung,pulmonary=gridPath({col:Math.round(heart.x),row:Math.round(heart.z)},{col:Math.round(lung.x),row:Math.round(lung.z)},allowed,p=>systemic.has(p.col+','+p.row)?8:1,12000);
 const pulmonaryGuide=simplify([heart,...(pulmonary||network.vascular.lung),lung]);
 const pulmonaryBase=square?pulmonaryGuide:branch(heart,lung);
 add('artery-lung','artery',lane(pulmonaryBase,1,streets,null,square?.68:.32,square?null:clear),square?1.25:.62,'lung','pulmonary');
 add('vein-lung','vein',lane(pulmonaryBase,-1,streets,null,square?.68:.32,square?null:clear).reverse(),square?1.25:.62,'lung','pulmonary');
 const peripheral=[];
 for(const t of SKIN_TISSUES){
  if(!tissuePresent({layout},t))continue;
  const p=safe(groundPoint(tissueAt({layout},t).point)),angle=(Math.atan2(p.z,p.x)+Math.PI/2+Math.PI*2)%(Math.PI*2),n=Math.round(angle/Math.PI*36)%72;
  const pair=branches(p,n);
  add('artery-skin-'+t.skinWall,'artery',pair.artery,square?.65:.3,'skin');
  add('vein-skin-'+t.skinWall,'vein',pair.vein,square?.58:.28,'skin');
  peripheral.push({id:t.id,site:t.district,point:p});
 }
 for(const [id,centre] of Object.entries(centres)){
  const branches=[];
  if(annex.some(o=>o.id===id)){beds.push({id,centre,branches:[],width:.62});continue;}
  for(const role of ['oxygen','dock'])for(let slot=0;slot<(role==='oxygen'?CITY_CAPS.workSlots:1+CITY_CAPS.extensions);slot++){
   const owner=stationOwner(layout,id,role,slot),bay=workStationPoints(id,role,slot,owner!==id?placeable(owner).origin:null),stand=transformPoint(layout,owner,bay.stand);
   const points=square?simplify([centre,...walkingRoute(layout,groundCoordinate(centre),[groundCoordinate(stand)]).map(groundPoint)]):
    simplifyWaterway(clean(branch(centre,safe(walkablePoint(layout,stand)))),clear);
   if(points.length<2)continue;branches.push(points);lines.push({points,layer:'bed:'+id,junctions:[{point:centre,id:'exchange:'+id}]});
  }
  beds.push({id,centre,branches,width:square?.62:.38});
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
