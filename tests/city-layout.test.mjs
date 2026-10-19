import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,compileLayout,validateTileLayout,applyTileLayout,cloneLayout,placementCheck,occupiedTiles,transformPoint,siteAt,cityRoute,cityDistrict,PLACEABLES,tissueAt} from '../src/city-tile-layout.mjs';
import {createLayoutEditor} from '../src/city-layout-editor.mjs';
import {workStation,beginActivity} from '../src/city-activity.mjs';
import {TISSUES} from '../src/city-frontier-data.mjs';
import {groundPoint} from '../src/city-three-layout.mjs';
import {createVillage} from '../src/city-three-village.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const advance=(s,n)=>{for(let i=0;i<n*20;i++)tickCity(s,.05,data);};
const town=()=>{const s=createCity('normal','simulation',{specialists:true});assert.ok(applyTileLayout(s,createTileLayout()).ok);return s;};
const close=(a,b)=>assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-8);

test('all existing facilities and cottages occupy non-overlapping small tiles with connected entrances',()=>{
 const l=createTileLayout(),c=compileLayout(l);assert.equal(validateTileLayout(l),true);assert.equal(c.valid,true);assert.equal(Object.keys(l.items).length,18);
 const used=new Set();for(const d of PLACEABLES)for(const p of occupiedTiles(d.id,l.items[d.id])){const key=p.col+','+p.row;assert.equal(used.has(key),false);used.add(key);}
 assert.equal(c.connections.filter(r=>r.kind==='pulmonary').length,1);assert.equal(c.connections.filter(r=>r.kind==='systemic').length,4);assert.equal(compileLayout(l),c);
 const overlap=cloneLayout(l);overlap.items.lung={...overlap.items.heart};assert.equal(validateTileLayout(overlap),false);
 const river=cloneLayout(l);river.items.heart.col=15;assert.equal(validateTileLayout(river),false);
});

test('four-way rotation turns occupied cells, ports and reserved workstations together',()=>{
 const l=createTileLayout(),a=l.items.heart;const original=groundPoint(workStation('heart','dock',0).stand);
 for(let r=0;r<4;r++){a.rot=r;close(groundPoint(workStation('heart','dock',0,l).stand),transformPoint(l,'heart',original));assert.equal(occupiedTiles('heart',a).length,56);}
 a.rot=4;assert.equal(validateTileLayout(l),false);
});

test('edit draft, invalid moves, undo and redo never mutate the running layout',()=>{
 const l=createTileLayout(),saved=JSON.stringify(l),e=createLayoutEditor(l);e.event('select','house-7');e.event('nudge',[1,0]);assert.equal(e.changed,true);assert.notEqual(e.draft.items['house-7'].col,l.items['house-7'].col);e.event('undo');assert.equal(JSON.stringify(e.draft),saved);e.event('redo');assert.equal(e.draft.items['house-7'].col,l.items['house-7'].col+1);
 e.event('preview',{...l.items.heart});e.event('drop');assert.ok(e.error);assert.equal(JSON.stringify(l),saved);
});

test('applying a legal organ relocation preserves city state and rebuilds usable routes and saves',()=>{
 const s=town();advance(s,10);const next=cloneLayout(s.layout);let candidate=null;
 for(let x=-18;x<=12&&!candidate;x++)for(let z=-14;z<=14&&!candidate;z++){const p={col:x,row:z,rot:1};if(!placementCheck(next,'heart',p).ok)continue;const n=cloneLayout(next);n.items.heart=p;if(compileLayout(n).valid)candidate=n;}
 assert.ok(candidate,'at least one rotated placement');const before={time:s.time,food:s.resources.food,health:s.districts.heart.hp,cells:s.cells.map(c=>c.id),shipments:s.shipments.map(c=>c.id)};
 candidate.revision++;assert.equal(applyTileLayout(s,candidate).ok,true);assert.deepEqual({time:s.time,food:s.resources.food,health:s.districts.heart.hp,cells:s.cells.map(c=>c.id),shipments:s.shipments.map(c=>c.id)},before);
 const path=cityRoute(s,'lung','heart');close(groundPoint(path.at(-1)),siteAt(s.layout,'heart'));assert.ok(path.length<=160);
 const restored=restoreCity(serializeCity(s));assert.ok(restored);advance(s,20);advance(restored,20);assert.equal(serializeCity(s),serializeCity(restored));assert.ok(s.stats.oxygen>0);assert.ok(s.stats.deliveries>0);
});

test('in-flight medicine remains a single shipment and arrives after a layout save',()=>{
 const s=town();command(s,'medicine',{drugId:'vancomycin',route:'iv',packs:1},data);advance(s,3);const ids=s.shipments.filter(x=>x.kind==='drug').map(x=>x.id),next=cloneLayout(s.layout);next.items['house-7'].col+=1;
 assert.ok(applyTileLayout(s,next).ok);assert.deepEqual(s.shipments.filter(x=>x.kind==='drug').map(x=>x.id),ids);advance(s,60);assert.equal(s.biology.stats.medicine,18);assert.ok(restoreCity(serializeCity(s)));
});

test('selected facility remains a bounded baked preview and changing rotation does not allocate meshes',()=>{
 const l=createTileLayout(),v=createVillage({},l,'heart');let count=0;v.root.traverse(x=>{if(x.isMesh)count++;});for(let r=0;r<4;r++)v.movePreview({...l.items.heart,rot:r});let after=0;v.root.traverse(x=>{if(x.isMesh)after++;});assert.equal(after,count);const preview=v.root.children.find(g=>g.userData.layoutId==='heart');assert.ok(preview&&preview.children.length<=4,'selected facility must remain a handful of baked meshes');v.dispose();
});

test('temporary storage frees space but cannot overwrite a live layout until every facility is replaced',()=>{
 const run=town(),original=serializeCity(run),e=createLayoutEditor(run.layout),position={...e.draft.items.heart};e.event('store');assert.ok(e.isStored('heart'));assert.equal(validateTileLayout(e.draft),false);assert.equal(applyTileLayout(run,e.draft).ok,false);assert.equal(serializeCity(run),original);
 e.event('preview',position);e.event('drop');assert.equal(e.isStored('heart'),false);assert.ok(validateTileLayout(e.draft));assert.ok(compileLayout(e.draft).valid);assert.equal(serializeCity(run),original);
});


test('an active tissue repair follows the relocated house without resetting its work cycle',()=>{
 const s=town(),t=TISSUES.find(t=>t.index===7),c=s.cells.find(c=>c.kind==='fibroblast'),p=tissueAt(s,t).point;
 c.tissueJob=t.id;c.target=t.district;c.path=[];Object.assign(c,p);beginActivity(s,c,'repair',.95,p,t.district);
 const started=c.activity.started,next=cloneLayout(s.layout);next.items['house-7'].col+=1;
 assert.ok(applyTileLayout(s,next).ok);close(groundPoint(c),groundPoint(tissueAt(s,t).point));close(groundPoint(c.activity),groundPoint(tissueAt(s,t).point));assert.equal(c.activity.started,started);
});
