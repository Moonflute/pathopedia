import {compileLayout,walkingRoute,stationOwner,placeable,transformPoint} from './city-tile-layout.mjs';
import {groundPoint,groundCoordinate,workStationPoints} from './city-three-layout.mjs';
import {CITY_CAPS} from './city-world.mjs';
import {gridPath,roadNavigator} from './city-grid-path.mjs';

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
export function compileVascularLayout(layout){
 if(!layout)return null;if(cache.has(layout))return cache.get(layout);
 const network=compileLayout(layout),centres=Object.fromEntries(network.districts.map(d=>[d.id,groundPoint(d)])),heart=centres.heart;
 const bases={},systemic=new Set();
 for(const id of ['gut','kidney','marrow','lymph']){
  const points=walkingRoute(layout,groundCoordinate(heart),network.vascular[id].slice(1).map(groundCoordinate)).map(groundPoint);
  bases[id]=simplify([heart,...points]);
  for(let i=1;i<bases[id].length;i++){const a=bases[id][i-1],b=bases[id][i],n=Math.ceil(distance(a,b)*2);for(let j=0;j<=n;j++)systemic.add(key({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n}));}
 }
 const lung=centres.lung,pulmonary=gridPath({col:Math.round(heart.x),row:Math.round(heart.z)},{col:Math.round(lung.x),row:Math.round(lung.z)},network.walkable,p=>systemic.has(p.col+','+p.row)?5:1);
 bases.lung=simplify(pulmonary||network.vascular.lung);
 const vessels=[],beds=[],lines=[];
 for(const [id,points] of Object.entries(bases)){
  const width=id==='lung'?.86:1.02;
  const artery=flow('artery-'+id,'artery',lane(points,1,network),width,id!=='lung');
  const vein=flow('vein-'+id,'vein',lane(points,-1,network).reverse(),width+.08,id==='lung');
  for(const v of [artery,vein]){v.site=id;v.circuit=id==='lung'?'pulmonary':'systemic';v.oneWay=true;vessels.push(v);lines.push(v);}
 }
 for(const [id,centre] of Object.entries(centres)){
  const branches=[];
  for(const role of ['oxygen','dock'])for(let slot=0;slot<(role==='oxygen'?CITY_CAPS.workSlots:1+CITY_CAPS.extensions);slot++){
   const owner=stationOwner(layout,id,role,slot),bay=workStationPoints(id,role,slot,owner!==id?placeable(owner).origin:null),stand=transformPoint(layout,owner,bay.stand);
   const points=simplify([centre,...walkingRoute(layout,groundCoordinate(centre),[groundCoordinate(stand)]).map(groundPoint)]);
   if(points.length<2)continue;branches.push(points);lines.push({points});
  }
  beds.push({id,centre,branches,width:.62});
 }
 const navigation=roadNavigator(lines);
 const result={vessels,beds,navigation,centres};cache.set(layout,result);return result;
}

// The engine keeps its jobs and cargo. Only long-distance RBC/courier navigation
// changes; local loading, immune work and external entry paths remain intact.
export function vascularWalkingRoute(layout,from,target){
 if(!target)return [];
 const a=groundPoint(from),b=groundPoint(target),vascular=compileVascularLayout(layout);
 if(distance(a,b)<3)return walkingRoute(layout,from,[target]);
 const path=vascular.navigation.route(a,b);
 if(!path)return walkingRoute(layout,from,[target]);
 const entry=distance(a,path[0])>.01?walkingRoute(layout,from,[groundCoordinate(path[0])]).map(groundPoint):[];
 const exit=distance(path.at(-1),b)>.01?walkingRoute(layout,groundCoordinate(path.at(-1)),[target]).map(groundPoint):[];
 return simplify([...entry,...path,...exit]).slice(0,CITY_CAPS.path).map(groundCoordinate);
}
