import {CITY_BOUNDS,CITY_CAPS,CITY_ENTRIES,storedPlacement} from './city-world.mjs';
import {DISTRICTS,districtDef} from './city-data.mjs';
import {SITES,COTTAGES,RIVER_PATH,groundPoint,groundCoordinate,workStationPoints,lymphocyteBay} from './city-three-layout.mjs';
import {PERIMETER,WORKSHOP,FRONTS,TISSUES,WALLS,SKIN_TISSUES} from './city-frontier-data.mjs';
import {vascularRoute,FOOD_ROAD} from './city-map.mjs';
import {TOWN_PLAN,TOWN_HOUSES,GROWTH_OFFSETS} from './city-town-plan.mjs';
import {gridPath,streetNetwork,roadNavigator} from './city-grid-path.mjs';
import {insideCity} from './city-boundary.mjs';

// Grid topology is independent of organ state and rendering. A future hex grid
// supplies its own neighbours, rotation and coordinate conversion here.
export const SQUARE_GRID=Object.freeze({id:'square',size:1,turns:4,neighbours:[[1,0],[0,1],[-1,0],[0,-1]],toWorld:(x,z)=>({x,z}),fromWorld:p=>({col:Math.round(p.x),row:Math.round(p.z)})});
const bounds={heart:[-3,-4,4,4],lung:[-6,-6,4,4],gut:[-2,-4,6,4],kidney:[-3,-1,6,6],marrow:[-5,-3,4,5],lymph:[-5,-2,4,5]};
const solids={heart:[-2,-5,2,-1],lung:[-6,-6,4,-1],gut:[0,-4,6,-1],kidney:[1,-1,6,4],marrow:[-4,1,1,4],lymph:[-5,-2,-1,2]};
const ports={heart:[4,0],lung:[0,4],gut:[-3,0],kidney:[-4,0],marrow:[0,-4],lymph:[4,0]};
export const PLACEABLES=Object.freeze([
 ...DISTRICTS.map(d=>({id:d.id,name:SITES[d.id].label,kind:'organ',origin:SITES[d.id],bounds:bounds[d.id],solid:solids[d.id],port:ports[d.id],color:SITES[d.id].color})),
 {id:'workshop',name:'피부 보수 공방',kind:'support',origin:WORKSHOP,bounds:[-2,-3,3,4],port:[3,0],color:0xc5aa7c},
 ...COTTAGES.map(([x,z,size,angle],i)=>({id:'house-'+i,name:(TISSUES.some(t=>t.index===i)?'조직 주택 ':'민가 ')+(i+1),kind:'house',origin:{x,z},bounds:[-1,-1,2,2],port:[0,2],size,angle,color:0xa9bc9e}))
]);
const centres={heart:[0,3],lung:[-12,-19],gut:[17,-7],kidney:[18,18],marrow:[-10,23],lymph:[-25,2]};
const additions=[];
for(let i=11;i<CITY_CAPS.houses;i++){
 const district=DISTRICTS[(i-11)%6].id,[x,z]=centres[district],n=Math.floor((i-11)/6),offset=[[-7,-7],[7,6],[7,-7],[-7,6],[-11,0],[11,0],[0,9],[0,-10],[10,10]][n];
 additions.push({id:'house-'+i,name:'민가 '+(i+1),kind:'house',district,optional:true,origin:{x:x+offset[0],z:z+offset[1]},bounds:[-1,-1,2,2],port:[0,2],size:1.2+(i%3)*.12,angle:(i%3-1)*.2,color:0xa9bc9e});
}
for(const d of DISTRICTS)for(const kind of ['depot','production'])for(let n=0;n<CITY_CAPS.extensions;n++){
 const [x,z]=centres[d.id];additions.push({id:kind+'-'+d.id+'-'+n,name:d.short+' '+(kind==='depot'?'보급소':'생산 공방')+' '+(n+1),kind,district:d.id,optional:true,origin:{x:x+(kind==='depot'?7:-7),z:z+4+n*6},bounds:kind==='production'?[-3,-2,4,4]:[-2,-2,3,3],solid:[-1,-2,2,0],port:[0,3],color:kind==='depot'?0xd3b878:0x9fbdb0});
}
const definitions=new Map([...PLACEABLES,...additions].map(d=>[d.id,d]));
export const placeable=id=>definitions.get(id);
export const layoutPlaceables=layout=>layout?Object.keys(layout.items).map(placeable).filter(Boolean):PLACEABLES;
export const expansionTypes=Object.freeze({house:'민가',depot:'보급소',production:'생산 공방'});
export function stationOwner(layout,id,role,slot=0){
 const kind=role==='dock'?'depot':['oxygen','produce','fabricate'].includes(role)?'production':null;
 const index=role==='dock'?slot-1:Math.floor((slot-3)/3);
 if(!kind||index<0)return id;
 return layoutPlaceables(layout).filter(d=>d.kind===kind&&d.district===id&&!storedPlacement(layout.items[d.id]))[index]?.id||id;
}
export function extensionRoute(layout,id){const c=compileLayout(layout).connections.find(c=>c.id===id);return c?.ok?[...c.points].reverse().map(groundCoordinate):[];}

export const rotateOffset=(p,r)=>{switch((r%4+4)%4){case 1:return {x:-p.z,z:p.x};case 2:return {x:-p.x,z:-p.z};case 3:return {x:p.z,z:-p.x};default:return {x:p.x,z:p.z};}};
export const cloneLayout=l=>JSON.parse(JSON.stringify(l));
export function transformPoint(layout,id,p){const d=placeable(id),a=layout?.items?.[id];if(!d||!a)return {x:p.x,z:p.z};const q=rotateOffset({x:p.x-d.origin.x,z:p.z-d.origin.z},a.rot);return {x:a.col+q.x,z:a.row+q.z};}
export function inversePoint(layout,id,p){const d=placeable(id),a=layout?.items?.[id];if(!d||!a)return {x:p.x,z:p.z};const q=rotateOffset({x:p.x-a.col,z:p.z-a.row},-a.rot);return {x:d.origin.x+q.x,z:d.origin.z+q.z};}
export function siteAt(layout,id){const d=SITES[id];if(!d)return null;const p=transformPoint(layout,id,d),b=transformPoint(layout,id,{x:d.building[0],z:d.building[1]});return {...d,...p,building:[b.x,b.z]};}
export function occupiedTiles(id,a){const d=placeable(id),out=[];if(!d||!a)return out;const [x0,z0,x1,z1]=d.bounds;for(let x=x0;x<x1;x++)for(let z=z0;z<z1;z++){const p=rotateOffset({x,z},a.rot);out.push({col:a.col+p.x,row:a.row+p.z});}return out;}
export function riverX(z){for(let i=1;i<RIVER_PATH.length;i++){const a=RIVER_PATH[i-1],b=RIVER_PATH[i];if(z<=b[1])return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);}return RIVER_PATH.at(-1)[0];}
function inside(x,z){let yes=false;for(let i=0,j=PERIMETER.length-1;i<PERIMETER.length;j=i++){const a=PERIMETER[i],b=PERIMETER[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function tileAllowed(col,row,kind='road'){
 if(!inside(col-.55,row-.55)||!inside(col+.55,row+.55)||!inside(col-.55,row+.55)||!inside(col+.55,row-.55))return false;
 if(col>riverX(row)-(kind==='kidney'?.2:2.1))return false;
 if(col>=CITY_ENTRIES.airway.gate.x-2&&col<=CITY_ENTRIES.airway.gate.x+2&&row<=CITY_ENTRIES.airway.gate.z)return false;
 return true;
}
export function placementCheck(layout,id,a){
 if(!placeable(id)||!a||![a.col,a.row,a.rot].every(Number.isInteger)||a.rot<0||a.rot>3||a.col<CITY_BOUNDS.left||a.col>CITY_BOUNDS.right||a.row<CITY_BOUNDS.top||a.row>CITY_BOUNDS.bottom)return {ok:false,reason:'잘못된 배치'};
 const cells=occupiedTiles(id,a),other=new Set();for(const [key,p] of Object.entries(layout.items))if(key!==id)for(const c of occupiedTiles(key,p))other.add(c.col+','+c.row);
 if(cells.some(c=>!tileAllowed(c.col,c.row,id)))return {ok:false,reason:'성벽·수로·입구와 겹침'};
 const q=rotateOffset({x:placeable(id).port[0],z:placeable(id).port[1]},a.rot),exit={col:a.col+q.x,row:a.row+q.z};
 if(!tileAllowed(exit.col,exit.row)||other.has(key(exit)))return {ok:false,reason:'출입구 공간 부족'};
 for(const [otherId,p] of Object.entries(layout.items))if(otherId!==id&&placeable(otherId)){const port=rotateOffset({x:placeable(otherId).port[0],z:placeable(otherId).port[1]},p.rot);if(cells.some(c=>c.col===p.col+port.x&&c.row===p.row+port.z))return {ok:false,reason:'다른 출입구를 막음'};}
 if(cells.some(c=>other.has(c.col+','+c.row)))return {ok:false,reason:'다른 시설과 겹침'};
 return {ok:true,reason:'배치 가능'};
}
function findPlacement(layout,d,start=d.origin,accept=()=>true){
 const base={...SQUARE_GRID.fromWorld(start),rot:start.rot||0};
 for(let radius=0;radius<=48;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
  const a={col:base.col+dx,row:base.row+dz,rot:base.rot};
  if(placementCheck(layout,d.id,a).ok&&accept(a))return a;
 }
 return null;
}
function populateExpansion(l){
 // New suburbs use the same authored models at human scale.
 for(const d of additions.filter(d=>d.kind==='house'?Number(d.id.slice(6))<35:d.id.endsWith('-0'))){
  const a=findPlacement(l,d);if(!a)throw Error('No expansion placement: '+d.id);l.items[d.id]=a;
 }
 return l;
}
export function createTileLayout(){
 const l={version:2,grid:'square',revision:0,items:{}};
 for(const [id,p] of Object.entries(TOWN_PLAN))l.items[id]={col:p.centre[0],row:p.centre[1],rot:0};
 l.items.workshop={col:-22,row:17,rot:0};
 TOWN_HOUSES.forEach(({col,row,rot},i)=>{l.items['house-'+i]={col,row,rot};});
 for(const [id,p] of Object.entries(TOWN_PLAN))for(const kind of ['depot','production'])l.items[kind+'-'+id+'-0']={col:p[kind][0],row:p[kind][1],rot:0};
 return l;
}
export function migrateTileLayout(l){
 if(!l||l.version!==1)return l;
 if(!validateTileLayout(l))return null;
 let base={...cloneLayout(l),version:2};
 const expanded=populateExpansion(cloneLayout(base));
 if(compileLayout(expanded).valid)return expanded;
 // A customised old town may have narrow exits. Keep it usable even when an
 // optional suburb cannot be connected at its preferred location.
 for(const d of additions.filter(d=>d.kind==='house'?Number(d.id.slice(6))<35:d.id.endsWith('-0'))){
  const a=findPlacement(base,d);if(!a)continue;
  const next=cloneLayout(base);next.items[d.id]=a;if(compileLayout(next).valid)base=next;
 }
 return base;
}
export function addLayoutBuilding(layout,kind,site='heart'){
 const d=additions.find(d=>d.kind===kind&&!layout.items[d.id]&&(kind==='house'||d.district===site));
 if(!d)return {ok:false,text:'증설 한도에 도달했습니다.'};
 const centre=layout.items[site],offsets=GROWTH_OFFSETS[kind]||[[7,5]];
 const starts=centre?offsets.map(([x,z])=>{const p=rotateOffset({x,z},centre.rot);return {x:centre.col+p.x,z:centre.row+p.z,rot:centre.rot};}):[d.origin];
 // Prefer complete small courts near the selected district before the general search.
 const connected=a=>compileLayout({...layout,items:{...layout.items,[d.id]:a}}).valid;
 let a=starts.map(p=>({...SQUARE_GRID.fromWorld(p),rot:p.rot||0})).find(p=>placementCheck(layout,d.id,p).ok&&connected(p));
 if(!a)a=findPlacement(layout,d,starts[0],connected);
 if(!a)return {ok:false,text:'배치 공간이 부족합니다.'};
 const next=cloneLayout(layout);next.items[d.id]=a;
 if(!compileLayout(next).valid)return {ok:false,text:'도로 공간을 확보해 주세요.'};
 return {ok:true,layout:next,id:d.id};
}
export function validateTileLayout(l){
 if(!l||![1,2].includes(l.version)||l.grid!=='square'||!Number.isInteger(l.revision)||l.revision<0||l.revision>1e7||!l.items||Array.isArray(l.items))return false;
 const ids=Object.keys(l.items);
 if(ids.length>definitions.size||PLACEABLES.some(d=>!l.items[d.id])||ids.some(id=>!placeable(id))||l.version===1&&ids.length!==PLACEABLES.length)return false;
 return ids.every(id=>placementCheck(l,id,l.items[id]).ok);
}
const compiled=new WeakMap();
const key=p=>p.col+','+p.row;
function simplify(points){return points.filter((p,i)=>{if(!i||i===points.length-1)return true;const a=points[i-1],b=points[i+1];return (p.x-a.x)*(b.z-p.z)!==(p.z-a.z)*(b.x-p.x);});}
export function compileLayout(layout){
 if(compiled.has(layout))return compiled.get(layout);
 const occupied=new Map();for(const [id,a] of Object.entries(layout.items)){const d=placeable(id);for(const c of occupiedTiles(id,a)){const q=rotateOffset({x:c.col-a.col,z:c.row-a.row},-a.rot),r=d.solid;if(!r||q.x>=r[0]&&q.x<=r[2]&&q.z>=r[1]&&q.z<=r[3])occupied.set(key(c),id);}}
 for(const t of skinTissuesAt(layout).values())for(let x=Math.round(t.x)-1;x<=Math.round(t.x)+1;x++)for(let z=Math.round(t.z)-1;z<=Math.round(t.z)+1;z++)occupied.set(x+','+z,'skin-tissue-'+t.id);
 const connections=[],roadCells=new Map();
 const port=id=>{const a=layout.items[id],q=rotateOffset({x:placeable(id).port[0],z:placeable(id).port[1]},a.rot);return {x:a.col+q.x,z:a.row+q.z};};
 const centre=id=>({x:layout.items[id].col,z:layout.items[id].row});
 const walkable=p=>insideCity(p.col,p.row,1.05)&&!occupied.has(key(p));
 // A modest discount joins existing streets without creating long detours.
 const pathCache=new Map();
 const path=(a,b,reuse=false)=>{const start=SQUARE_GRID.fromWorld(a),end=SQUARE_GRID.fromWorld(b),k=key(start)+'>'+key(end)+':'+reuse;
  if(pathCache.has(k))return pathCache.get(k);
  const result=gridPath(start,end,walkable,p=>reuse&&roadCells.has(key(p))?.65:1);
  if(pathCache.size>=512)pathCache.delete(pathCache.keys().next().value);pathCache.set(k,result);return result;
 };
 function connect(id,from,to,kind){
  const middle=kind==='entry'?gridPath(SQUARE_GRID.fromWorld(from),SQUARE_GRID.fromWorld(to),p=>insideCity(p.col,p.row,1)&&!occupied.has(key(p)),()=>1,12000):path(from,to,kind==='walk');if(!middle){connections.push({id,kind,ok:false,points:[]});return null;}
  if(kind!=='entry')for(const p of middle){const k=p.x+','+p.z;if(!roadCells.has(k))roadCells.set(k,new Set());roadCells.get(k).add(kind);}
  const points=simplify([from,...middle,to].filter((p,i,a)=>!i||p.x!==a[i-1].x||p.z!==a[i-1].z));connections.push({id,kind,ok:true,points});return points;
 }
 const vascular={};
 for(const d of DISTRICTS.filter(d=>d.id!=='heart')){const p=connect(d.id,port('heart'),port(d.id),d.id==='lung'?'pulmonary':'systemic');vascular[d.id]=p?[centre('heart'),...p,centre(d.id)]:[];}
 const entries={};for(const [id,{start,gate,portal,screen}] of Object.entries(CITY_ENTRIES)){
  const organ=id==='airway'?'lung':'gut';
  // Air crosses the wall on its own elevated conduit and enters the lung
  // directly; it does not meander through the organ's blood-loading entrance.
  if(id==='airway'){const end=transformPoint(layout,'lung',{x:SITES.lung.x,z:SITES.lung.z-5.8}),points=[start,portal,screen,end];connections.push({id:'entry-'+id,kind:'entry',ok:true,points});entries[id]=points;}
  else{const p=connect('entry-'+id,gate,port(organ),'entry');entries[id]=p?[start,portal,...p,centre(organ)]:[];}
 }
 for(const d of layoutPlaceables(layout).filter(d=>d.kind!=='organ')){const nearest=d.kind!=='house'&&d.district?districtDef(d.district):DISTRICTS.reduce((a,b)=>Math.hypot(centre(a.id).x-centre(d.id).x,centre(a.id).z-centre(d.id).z)<Math.hypot(centre(b.id).x-centre(d.id).x,centre(b.id).z-centre(d.id).z)?a:b);connect(d.id,port(d.id),port(nearest.id),'walk');}
 const districts=DISTRICTS.map(d=>({...d,...groundCoordinate(centre(d.id))}));
 const streets=streetNetwork(connections.filter(c=>c.kind!=='entry')),access=[],free=p=>freePoint(walkable,p);
 function pave(from,to,width=.62,kind='service'){
  const a=free(from),b=free(to),middle=path(a,b,true);if(!middle)return;
  for(const p of middle){const k=p.x+','+p.z;if(!roadCells.has(k))roadCells.set(k,new Set(['walk']));}
  const points=simplify([a,...middle,b].filter((p,i,list)=>!i||Math.hypot(p.x-list[i-1].x,p.z-list[i-1].z)>1e-7));if(points.length>1)access.push({points,width,kind});
 }
 for(const d of DISTRICTS){
  pave(port(d.id),centre(d.id),1.4);
  for(const role of ['oxygen','dock','rest','build','repair',...(d.id==='lymph'?['produce']:[]),...(['marrow','gut'].includes(d.id)?['fabricate']:[]),...(d.id==='kidney'?['waste']:[])]){
   const slots=['oxygen','produce','fabricate'].includes(role)?CITY_CAPS.workSlots:role==='dock'?1+CITY_CAPS.extensions:3;
   for(let slot=0;slot<slots;slot++){const owner=stationOwner(layout,d.id,role,slot),bay=workStationPoints(d.id,role,slot,owner!==d.id?placeable(owner).origin:null);pave(owner===d.id?centre(d.id):port(owner),transformPoint(layout,owner,bay.stand));}
  }
 }
 for(const d of layoutPlaceables(layout).filter(d=>d.kind==='house'))pave(port(d.id),transformPoint(layout,d.id,{x:d.origin.x,z:d.origin.z+1.4}));
 for(let slot=0;slot<48;slot++)pave(centre('lymph'),transformPoint(layout,'lymph',lymphocyteBay(slot)),.6);
 pave(port('workshop'),transformPoint(layout,'workshop',{x:WORKSHOP.x+1.1,z:WORKSHOP.z+.5}));
 for(const [id,front] of Object.entries(FRONTS)){const owner=id==='skin'?'workshop':front.district,p=transformPoint(layout,owner,front.depot);pave(port(owner),{x:p.x-1.15,z:p.z});}
 for(let slot=0;slot<9;slot++)pave(centre('gut'),transformPoint(layout,'gut',{x:SITES.gut.x+3.5+slot%3*.85,z:SITES.gut.z+2+Math.floor(slot/3)*.85}));
 const patrol=WALLS.map(w=>free(groundPoint(w.inside)));
 for(let i=0;i<patrol.length;i++)pave(patrol[i],patrol[(i+1)%patrol.length],.65,'patrol');
 for(const t of skinTissuesAt(layout).values()){pave(patrol[t.skinWall],groundPoint(t.point),.8,'patrol');pave(port(t.district),groundPoint(t.point),.65,'patrol');}
 const near=patrol.reduce((a,b)=>Math.hypot(a.x-port('workshop').x,a.z-port('workshop').z)<Math.hypot(b.x-port('workshop').x,b.z-port('workshop').z)?a:b);pave(port('workshop'),near,.65,'patrol');
 const entrances=Object.values(entries),navigation=roadNavigator([...streets.runs.map(r=>r.points),...access.map(r=>r.points)]);pathCache.clear();
 const result={connections,vascular,entries,entrances,roadCells,streets,access,navigation,occupied,walkable,path,districts,valid:connections.every(c=>c.ok),ports:Object.fromEntries(layoutPlaceables(layout).map(d=>[d.id,port(d.id)]))};compiled.set(layout,result);return result;
}

function freePoint(walkable,p){
 const start=SQUARE_GRID.fromWorld(p);if(walkable(start))return p;
 for(let r=1;r<10;r++)for(let z=-r;z<=r;z++)for(let x=-r;x<=r;x++){if(Math.max(Math.abs(x),Math.abs(z))!==r)continue;const q={col:start.col+x,row:start.row+z};if(walkable(q))return {x:q.col,z:q.row};}
 return p;
}
export const walkablePoint=(layout,p)=>layout?freePoint(compileLayout(layout).walkable,p):p;
export const roadPoint=(layout,p)=>layout?(compileLayout(layout).navigation.nearest(p)?.point||p):p;
export function walkingRoute(layout,from,points){
 if(!layout)return points;const c=compileLayout(layout),out=[];let a=groundPoint(from);
 const clear=(u,v,exterior=false)=>{const n=Math.max(1,Math.ceil(Math.hypot(v.x-u.x,v.z-u.z)*4));for(let i=0;i<=n;i++){const p=SQUARE_GRID.fromWorld({x:u.x+(v.x-u.x)*i/n,z:u.z+(v.z-u.z)*i/n});if(c.occupied.has(key(p))||!exterior&&!c.walkable(p))return false;}return true;};
 const approach=(u,v)=>Math.hypot(u.x-v.x,u.z-v.z)<1e-6?[]:clear(u,v)?[v]:(c.path(u,v,true)?.concat([v])||null);
 const onSegment=(p,u,v)=>Math.abs(Math.hypot(p.x-u.x,p.z-u.z)+Math.hypot(p.x-v.x,p.z-v.z)-Math.hypot(v.x-u.x,v.z-u.z))<1e-6;
 for(const target of points){const b=groundPoint(target);
  // Preserve the authored path outside the mouth/airway before joining town.
  if(c.entrances.some(points=>points.some((p,i)=>i&&onSegment(a,points[i-1],p)&&onSegment(b,points[i-1],p)))){out.push(target);a=b;continue;}
  const start=walkablePoint(layout,a),end=walkablePoint(layout,b),road=c.navigation.route(start,end);
  if(!road){out.push(groundCoordinate(a));break;}
  const entry=approach(start,road[0]),exit=approach(road.at(-1),end);
  if(!entry||!exit){out.push(groundCoordinate(a));break;}
  out.push(...simplify([...(Math.hypot(start.x-a.x,start.z-a.z)>1e-6?[start]:[]),...entry,...road,...exit].filter((p,i,list)=>!i||Math.hypot(p.x-list[i-1].x,p.z-list[i-1].z)>1e-6)).map(groundCoordinate));a=end;
 }
 return out.slice(0,CITY_CAPS.path);
}
export const cityDistricts=s=>s?.layout?compileLayout(s.layout).districts:DISTRICTS;
export const cityDistrict=(s,id)=>cityDistricts(s).find(d=>d.id===id);
export const localPoint=(s,id,p)=>groundCoordinate(transformPoint(s?.layout,id,p));
export function cityRoute(s,from,to){
 if(!s?.layout)return vascularRoute(from,to);if(from===to){const d=cityDistrict(s,to);return [{x:d.x,y:d.y}];}
 const c=compileLayout(s.layout),out=from==='heart'?[]:[...c.vascular[from]].reverse(),back=to==='heart'?[siteAt(s.layout,'heart')]:c.vascular[to];
 return [...out,...back].map(groundCoordinate);
}
export const intakeRoute=s=>s?.layout?compileLayout(s.layout).entries.gut.map(groundCoordinate):FOOD_ROAD;
const skinCache=new WeakMap();
function skinTissuesAt(layout){
 if(!layout)return new Map();if(skinCache.has(layout))return skinCache.get(layout);
 const occupied=new Set(layoutPlaceables(layout).flatMap(d=>occupiedTiles(d.id,layout.items[d.id])).map(p=>p.col+','+p.row)),result=new Map();
 for(const t of SKIN_TISSUES){
  let chosen=null;
  for(const tangent of [0,3,-3,6,-6]){const x=t.x-t.nz*tangent,z=t.z+t.nx*tangent;let free=insideCity(x,z,3);
   for(let a=Math.round(x)-2;a<=Math.round(x)+2;a++)for(let b=Math.round(z)-2;b<=Math.round(z)+2;b++)if(occupied.has(a+','+b))free=false;
   if(free){chosen={...t,x,z,point:groundCoordinate({x:x-t.nx*2.4,z:z-t.nz*2.4})};break;}
  }
  if(chosen)result.set(t.id,chosen);
 }
 skinCache.set(layout,result);return result;
}
export function tissueAt(s,t){if(t.skinWall!=null)return skinTissuesAt(s?.layout).get(t.id)||t;const id='house-'+t.index,base=t.managed?placeable(id).origin:t,p=transformPoint(s?.layout,id,base);return {...t,...p,point:localPoint(s,id,{x:base.x,z:base.z+1.4})};}
export const tissuePresent=(s,t)=>t.skinWall!=null?skinTissuesAt(s.layout).has(t.id):!s.layout?!t.managed:!!s.layout.items['house-'+t.index]&&!storedPlacement(s.layout.items['house-'+t.index]);
export const depotAt=(s,id)=>transformPoint(s?.layout,id==='skin'?'workshop':id==='airway'?'lung':'gut',FRONTS[id].depot);
// Map a saved actor through its nearest facility's local frame. Transit routes
// are reissued; resources, jobs, IDs and progress are not recreated.
export function applyTileLayout(s,next){
 if(!validateTileLayout(next)||!compileLayout(next).valid)return {ok:false,text:'겹침 또는 끊긴 연결을 먼저 수정해 주세요.'};
 const old=s.layout,oldDistricts=cityDistricts(s),mapped=(p,hint)=>{const owner=hint&&next.items[hint]?hint:oldDistricts.reduce((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)<Math.hypot(p.x-b.x,p.y-b.y)?a:b).id;return groundCoordinate(transformPoint(next,owner,inversePoint(old,owner,groundPoint(p))));};
 for(const a of [...s.cells,...s.shipments,...s.debris,...s.enemies]){
  if(a.front&&!a.entered||a.frontJob!=null&&a.frontStage==='repair')continue;const frame=a.tissueJob!=null?'house-'+TISSUES[a.tissueJob].index:a.frontJob!=null&&a.frontStage==='shop'?'workshop':(a.workplace?stationOwner(old,a.workplace.site,a.workplace.role,a.workplace.slot):a.activity?.site);Object.assign(a,mapped(a,frame));
  if(a.activity)Object.assign(a.activity,mapped(a.activity,frame||a.activity.site));
  if(a.path){a.path=[];a.step=0;delete a.roadPathVersion;a.queueMove=null;a.assignment=null;a.staged=false;a.perfusionId=null;}
  if(a.immuneMove!=null)a.immuneMove=null;
 }
 if(s.immunity)for(const a of [...s.immunity.infected,...s.immunity.parasites,...s.immunity.exposures,...s.immunity.nets])Object.assign(a,mapped(a,a.site));
 s.layout=cloneLayout(next);s.effects=[];
 if(s.time===0)for(const c of s.cells)if(!c.activity)Object.assign(c,groundCoordinate(roadPoint(s.layout,groundPoint(c))));
 for(const c of s.cells){if(c.kind==='rbc'){c.path=cityRoute(s,cityDistricts(s).reduce((a,b)=>Math.hypot(c.x-a.x,c.y-a.y)<Math.hypot(c.x-b.x,c.y-b.y)?a:b).id,c.cargo?c.target:'lung');c.step=0;}if(c.frontJob!=null){c.path=c.frontStage==='shop'?[localPoint(s,'workshop',{x:WORKSHOP.x+1.1,z:WORKSHOP.z+.5})]:c.frontStage==='field'?[WALLS[c.frontJob].inside]:[];c.step=0;}if(c.patchWall!=null){c.path=[WALLS[c.patchWall].inside];c.step=0;}if(c.tissueJob!=null){c.path=[tissueAt(s,TISSUES[c.tissueJob]).point];c.step=0;}}
 for(const sh of s.shipments){const from=cityDistricts(s).reduce((a,b)=>Math.hypot(sh.x-a.x,sh.y-a.y)<Math.hypot(sh.x-b.x,sh.y-b.y)?a:b);sh.path=sh.kind==='raw'&&sh.phase!=='leaving'?intakeRoute(s):cityRoute(s,from.id,sh.phase==='pickup'?'gut':sh.to);sh.step=0;}
 for(const e of s.enemies){e.entryStep=null;e.attackX=null;e.attackY=null;e.action='approach';}
 return {ok:true,text:'마을 배치 저장 완료'};
}
