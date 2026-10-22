import {cityDistrict,cityDistricts,compileLayout,walkablePoint,siteAt,tissueAt,tissuePresent} from './city-tile-layout.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {compileThemeLayout} from './city-theme-layout.mjs';
import {vascularWalkingRoute} from './city-vascular-layout.mjs';
import {SKIN_TISSUES} from './city-frontier-data.mjs';
import {gridPath} from './city-grid-path.mjs';
import {releaseWorkplace} from './city-workplaces.mjs';

export const TRAFFIC_LABELS=Object.freeze({circulating:'혈류 이동',rolling:'혈관 벽 구르기',adhering:'내피 부착',crossing:'혈관 밖 이동',chemotaxis:'염증 신호 추적',lymph:'림프관 · 항원 운반',egress:'림프절 출발',resident:'조직 상주'});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),worldDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const circulating=new Set(['neutrophil','monocyte','nk','eosinophil','basophil','cd8','helperT','treg']);
const nearest=(s,p)=>cityDistricts(s).reduce((a,b)=>distance(a,p)<distance(b,p)?a:b).id;
const caches=new WeakMap();
function simplify(points){return points.filter((p,i,a)=>!i||i===a.length-1||Math.abs((p.x-a[i-1].x)*(a[i+1].z-p.z)-(p.z-a[i-1].z)*(a[i+1].x-p.x))>1e-7);}

// Tissue movement uses the walkable ground, rather than snapping back onto a
// vessel. The same authored points are used by the lymph renderer and actors.
export function tissueRoute(s,from,to){
 if(!s.layout)return [{x:to.x,y:to.y}];
 const network=compileLayout(s.layout),a=walkablePoint(s.layout,groundPoint(from)),b=walkablePoint(s.layout,groundPoint(to));
 const path=gridPath({col:Math.round(a.x),row:Math.round(a.z)},{col:Math.round(b.x),row:Math.round(b.z)},network.walkable,()=>1,12000);
 if(!path)return [{x:from.x,y:from.y}];
 return simplify([a,...path,b]).map(groundCoordinate);
}
export function hostPaths(s){
 if(!s.layout)return null;
 const theme=s.transportTheme||'2';let variants=caches.get(s.layout);if(!variants){variants=new Map();caches.set(s.layout,variants);}if(variants.has(theme))return variants.get(theme);
 const vascular=compileThemeLayout(s.layout,theme).vascular,node=cityDistrict(s,'lymph'),lymph=[];
 const origins=[...cityDistricts(s).filter(d=>d.id!=='lymph').map(d=>({key:d.id,site:d.id,...d})),...SKIN_TISSUES.filter(t=>tissuePresent(s,t)).map(t=>({key:'skin:'+t.skinWall,site:t.district,...tissueAt(s,t).point}))];
 for(const p of origins){const points=tissueRoute(s,p,node);lymph.push({key:p.key,site:p.site,points:[{x:p.x,y:p.y},...points]});}
 const result={vascular,lymph};variants.set(theme,result);return result;
}
export function lymphPath(s,site,from){
 const candidates=hostPaths(s)?.lymph.filter(p=>p.site===site)||[];
 const line=candidates.sort((a,b)=>distance(from,a.points[0])-distance(from,b.points[0]))[0];
 return line?[...tissueRoute(s,from,line.points[0]),...line.points.slice(1)]:tissueRoute(s,from,cityDistrict(s,'lymph'));
}
function gateFor(s,target){
 const p=groundPoint(target),paths=hostPaths(s);if(!paths)return {gate:{x:target.x-40,y:target.y},roll:{x:target.x-70,y:target.y},exit:{x:target.x-15,y:target.y}};
 let choice=null;
 for(const v of paths.vascular.vessels.filter(v=>v.kind==='vein'))for(let j=1;j<v.points.length;j++){
  const a=v.points[j-1],b=v.points[j],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;if(!length)continue;
  const q=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)),point={x:a.x+q*dx,z:a.z+q*dz},d=worldDistance(p,point);
  if(!choice||d<choice.distance)choice={distance:d,point,dx:dx/Math.sqrt(length),dz:dz/Math.sqrt(length)};
 }
 const g=choice.point,d=worldDistance(g,p)||1,roll={x:g.x-choice.dx*1.15,z:g.z-choice.dz*1.15},exit=walkablePoint(s.layout,{x:g.x+(p.x-g.x)/d*.9,z:g.z+(p.z-g.z)/d*.9});
 return {gate:groundCoordinate(g),roll:groundCoordinate(roll),exit:groundCoordinate(exit)};
}
function setPath(c,path,mode,api){releaseWorkplace(c);api.route(c,path);c.travelMode=mode;}
function event(s,kind,c,site){const p=s.physiology;if(!p)return;p.events.push({time:s.time,kind,site,recordId:c.recordId||null,x:c.x,y:c.y});p.events=p.events.slice(-48);if(kind==='extravasation')p.stats.extravasations++;}
export function moveToInflammation(s,c,target,key,dt,api,speed=65){
 const site=target.site||target.id&&s.districts[target.id]&&target.id||c.immuneSite||c.target||nearest(s,target);
 if(!s.physiology||!s.layout){if(distance(c,target)<12)return true;if(c.immuneMove!==key){c.immuneMove=key;api.route(c,[target]);}return api.move(c,speed,dt);}
 if(target.compartment==='blood'){
  c.extravascular=false;c.transit=null;c.trafficStage='circulating';
  if(c.immuneMove!==key||s.time>=(c.chemotaxisRepath||0)){c.immuneMove=key;c.chemotaxisRepath=s.time+1.5;setPath(c,vascularWalkingRoute(s.layout,c,target,hostPaths(s).vascular),'blood',api);}
  return distance(c,target)<35||api.move(c,speed*2.4,dt);
 }
 if(!circulating.has(c.kind)||c.tissueResident){c.extravascular=true;c.tissueSite=site;}
 // A cell already placed in this tissue (including old saves) needs no fake
 // excursion through a vessel before it may recognize a nearby target.
 if(c.extravascular==null&&distance(c,target)<45){c.extravascular=true;c.tissueSite=site;}
 if(c.extravascular&&c.tissueSite===site){
  c.trafficStage=c.tissueResident?'resident':'chemotaxis';
  if(distance(c,target)<12)return true;
  if(c.immuneMove!==key||s.time>=(c.chemotaxisRepath||0)&&distance(c.path.at(-1)||c,target)>20){c.immuneMove=key;c.chemotaxisRepath=s.time+1.5;setPath(c,tissueRoute(s,c,target),'tissue',api);}
  return api.move(c,speed,dt);
 }
 if(!c.transit||c.transit.site!==site){
  c.extravascular=false;c.transit={site,...gateFor(s,target),stage:'circulating',since:s.time};c.immuneMove=null;
  setPath(c,vascularWalkingRoute(s.layout,c,c.transit.roll,hostPaths(s).vascular),'blood',api);
 }
 const t=c.transit;c.trafficStage=t.stage;c.task=TRAFFIC_LABELS[t.stage];c.nextTask='부착 → 혈관 밖 → 감염 현장';c.alertKind='threat';c.alertUntil=s.time+1;
 if(t.stage==='circulating'){
  if(!api.move(c,speed*2.4,dt))return false;t.stage='rolling';t.since=s.time;setPath(c,[t.gate],'tissue',api);
 }else if(t.stage==='rolling'){
  const arrived=api.move(c,12,dt);if(arrived&&s.time-t.since>=1.5){t.stage='adhering';t.since=s.time;}
 }else if(t.stage==='adhering'){
  if(s.time-t.since>=1.3){t.stage='crossing';t.since=s.time;setPath(c,[t.exit],'tissue',api);}
 }else if(t.stage==='crossing'){
  const arrived=api.move(c,12,dt);if(arrived&&s.time-t.since>=1.4){c.extravascular=true;c.tissueSite=site;c.transit=null;c.immuneMove=null;c.trafficStage='chemotaxis';event(s,'extravasation',c,site);}
 }
 return false;
}
export function moveDendriticToNode(s,c,dt,api){
 if(c.trafficStage!=='lymph'){
  c.trafficStage='lymph';c.immuneMove=null;setPath(c,lymphPath(s,c.immuneSite,c),'lymph',api);event(s,'antigen-pickup',c,c.immuneSite);
 }
 c.task=TRAFFIC_LABELS.lymph;c.nextTask='림프절 → MHC 제시';
 return api.move(c,95,dt);
}
export function leaveNode(s,c){c.extravascular=false;c.tissueSite=null;c.transit=null;c.travelMode=null;c.immuneMove=null;c.trafficStage='egress';event(s,'effector-departure',c,c.immuneSite||'lymph');}
export function resetTransit(c){c.transit=null;c.travelMode=null;c.trafficStage=null;c.extravascular=null;c.immuneMove=null;}
