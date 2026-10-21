import {CITY_BOUNDS,CITY_CAPS,CITY_ENTRIES,storedPlacement} from './city-world.mjs';
import {DISTRICTS,districtDef} from './city-data.mjs';
import {SITES,COTTAGES,RIVER_PATH,groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {PERIMETER,WORKSHOP,FRONTS,TISSUES,WALLS} from './city-frontier-data.mjs';
import {vascularRoute,FOOD_ROAD} from './city-map.mjs';

// Grid topology is independent of organ state and rendering. A future hex grid
// supplies its own neighbours, rotation and coordinate conversion here.
export const SQUARE_GRID=Object.freeze({id:'square',size:1,turns:4,neighbours:[[1,0],[0,1],[-1,0],[0,-1]],toWorld:(x,z)=>({x,z}),fromWorld:p=>({col:Math.round(p.x),row:Math.round(p.z)})});
const bounds={heart:[-3,-4,4,4],lung:[-6,-6,4,4],gut:[-2,-4,6,4],kidney:[-3,-1,6,6],marrow:[-5,-3,4,5],lymph:[-5,-2,4,5]};
const solids={heart:[-2,-5,2,0],lung:[-6,-6,4,-1],gut:[0,-4,6,-1],kidney:[1,-1,6,4],marrow:[-4,1,1,4],lymph:[-5,-2,-1,2]};
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
function findPlacement(layout,d,start=d.origin){
 const base={...SQUARE_GRID.fromWorld(start),rot:0};
 for(let radius=0;radius<=48;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
  const a={col:base.col+dx,row:base.row+dz,rot:0};
  if(placementCheck(layout,d.id,a).ok)return a;
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
 for(const d of PLACEABLES){const xy=centres[d.id],start=xy?{x:xy[0],z:xy[1]}:{x:d.origin.x*2,z:d.origin.z*2};
  const a=findPlacement(l,d,start);if(!a)throw Error('No default tile placement: '+d.id);l.items[d.id]=a;
 }
 return populateExpansion(l);
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
 const centre=layout.items[site],start=centre?{x:centre.col+7,z:centre.row+5}:d.origin,a=findPlacement(layout,d,start);
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
 const connections=[],roadCells=new Map();
 const port=id=>{const a=layout.items[id],q=rotateOffset({x:placeable(id).port[0],z:placeable(id).port[1]},a.rot);return {x:a.col+q.x,z:a.row+q.z};};
 const centre=id=>({x:layout.items[id].col,z:layout.items[id].row});
 // Bounded breadth-first search, performed once on Apply, never per frame.
 function path(a,b,owners=[]){
  const start=SQUARE_GRID.fromWorld(a),end=SQUARE_GRID.fromWorld(b),todo=[start],previous=new Map([[key(start),null]]);let head=0,found=false;
  while(head<todo.length&&head<((CITY_BOUNDS.right-CITY_BOUNDS.left+1)*(CITY_BOUNDS.bottom-CITY_BOUNDS.top+1))){const p=todo[head++];if(key(p)===key(end)){found=true;break;}
   for(const [dx,dz] of SQUARE_GRID.neighbours){const q={col:p.col+dx,row:p.row+dz},k=key(q),owner=occupied.get(k);if(previous.has(k)||!tileAllowed(q.col,q.row)||owner&&!owners.includes(owner))continue;previous.set(k,p);todo.push(q);}
  }
  if(!found)return null;const cells=[];let p=end;while(p){cells.push({x:p.col,z:p.row});p=previous.get(key(p));}cells.reverse();return cells;
 }
 function connect(id,from,to,kind,owners=[]){
  const middle=path(from,to,owners);if(!middle){connections.push({id,kind,ok:false,points:[]});return null;}
  for(const p of middle){const k=p.x+','+p.z;if(!roadCells.has(k))roadCells.set(k,new Set());roadCells.get(k).add(kind);}
  const points=simplify([from,...middle,to].filter((p,i,a)=>!i||p.x!==a[i-1].x||p.z!==a[i-1].z));connections.push({id,kind,ok:true,points});return points;
 }
 const vascular={};
 for(const d of DISTRICTS.filter(d=>d.id!=='heart')){const p=connect(d.id,port('heart'),port(d.id),d.id==='lung'?'pulmonary':'systemic',['heart',d.id]);vascular[d.id]=p?[centre('heart'),...p,centre(d.id)]:[];}
 const entries={};for(const [id,{start,gate,portal,screen}] of Object.entries(CITY_ENTRIES)){
  const organ=id==='airway'?'lung':'gut',p=connect('entry-'+id,gate,port(organ),'entry',[organ]);entries[id]=p?[start,...[portal,...(screen?[screen]:[])],...p,centre(organ)]:[];
 }
 for(const d of layoutPlaceables(layout).filter(d=>d.kind!=='organ')){const nearest=d.kind!=='house'&&d.district?districtDef(d.district):DISTRICTS.reduce((a,b)=>Math.hypot(centre(a.id).x-centre(d.id).x,centre(a.id).z-centre(d.id).z)<Math.hypot(centre(b.id).x-centre(d.id).x,centre(b.id).z-centre(d.id).z)?a:b);connect(d.id,port(d.id),port(nearest.id),'walk',[d.id,nearest.id]);}
 const districts=DISTRICTS.map(d=>({...d,...groundCoordinate(centre(d.id))}));
 const result={connections,vascular,entries,roadCells,districts,valid:connections.every(c=>c.ok),ports:Object.fromEntries(layoutPlaceables(layout).map(d=>[d.id,port(d.id)]))};compiled.set(layout,result);return result;
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
export function tissueAt(s,t){const p=transformPoint(s?.layout,'house-'+t.index,t);return {...t,...p,point:localPoint(s,'house-'+t.index,{x:t.x,z:t.z+1.4})};}
export const depotAt=(s,id)=>transformPoint(s?.layout,id==='skin'?'workshop':id==='airway'?'lung':'gut',FRONTS[id].depot);
// Map a saved actor through its nearest facility's local frame. Transit routes
// are reissued; resources, jobs, IDs and progress are not recreated.
export function applyTileLayout(s,next){
 if(!validateTileLayout(next)||!compileLayout(next).valid)return {ok:false,text:'겹침 또는 끊긴 연결을 먼저 수정해 주세요.'};
 const old=s.layout,oldDistricts=cityDistricts(s),mapped=(p,hint)=>{const owner=hint&&next.items[hint]?hint:oldDistricts.reduce((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)<Math.hypot(p.x-b.x,p.y-b.y)?a:b).id;return groundCoordinate(transformPoint(next,owner,inversePoint(old,owner,groundPoint(p))));};
 for(const a of [...s.cells,...s.shipments,...s.debris,...s.enemies]){
  if(a.front&&!a.entered||a.frontJob!=null&&a.frontStage==='repair')continue;const frame=a.tissueJob!=null?'house-'+TISSUES[a.tissueJob].index:a.frontJob!=null&&a.frontStage==='shop'?'workshop':(a.workplace?stationOwner(old,a.workplace.site,a.workplace.role,a.workplace.slot):a.activity?.site);Object.assign(a,mapped(a,frame));
  if(a.activity)Object.assign(a.activity,mapped(a.activity,frame||a.activity.site));
  if(a.path){a.path=[];a.step=0;a.queueMove=null;a.assignment=null;a.staged=false;}
 }
 s.layout=cloneLayout(next);s.effects=[];
 for(const c of s.cells){if(c.kind==='rbc'){c.path=cityRoute(s,cityDistricts(s).reduce((a,b)=>Math.hypot(c.x-a.x,c.y-a.y)<Math.hypot(c.x-b.x,c.y-b.y)?a:b).id,c.cargo?c.target:'lung');c.step=0;}if(c.frontJob!=null){c.path=c.frontStage==='shop'?[localPoint(s,'workshop',{x:WORKSHOP.x+1.1,z:WORKSHOP.z+.5})]:c.frontStage==='field'?[WALLS[c.frontJob].inside]:[];c.step=0;}if(c.tissueJob!=null){c.path=[tissueAt(s,TISSUES[c.tissueJob]).point];c.step=0;}}
 for(const sh of s.shipments){const from=cityDistricts(s).reduce((a,b)=>Math.hypot(sh.x-a.x,sh.y-a.y)<Math.hypot(sh.x-b.x,sh.y-b.y)?a:b);sh.path=sh.kind==='raw'&&sh.phase!=='leaving'?intakeRoute(s):cityRoute(s,from.id,sh.phase==='pickup'?'gut':sh.to);sh.step=0;}
 for(const e of s.enemies)e.entryStep=null;
 return {ok:true,text:'마을 배치 저장 완료'};
}
