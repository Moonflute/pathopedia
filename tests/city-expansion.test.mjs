import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,compileLayout,validateTileLayout,applyTileLayout,addLayoutBuilding,PLACEABLES} from '../src/city-tile-layout.mjs';
import {createLayoutEditor} from '../src/city-layout-editor.mjs';
import {populationLimit,CITY_CAPS} from '../src/city-world.mjs';
import {PERIMETER} from '../src/city-frontier-data.mjs';
import {workStation} from '../src/city-activity.mjs';
import {requestWorkplace,workplaceCapacity} from '../src/city-workplaces.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {qualityProfile} from '../src/city-three-layout.mjs';

const town=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});assert.ok(applyTileLayout(s,createTileLayout()).ok);return s;};
test('fourfold town connects 54 facilities and added buildings survive editing and saving',()=>{
 const area=Math.abs(PERIMETER.reduce((n,p,i)=>{const q=PERIMETER[(i+1)%PERIMETER.length];return n+p[0]*q[1]-p[1]*q[0];},0)/2);
 assert.equal(area,1149*4);const s=town();assert.equal(s.cells.length,108);assert.equal(populationLimit(s),192);assert.equal(Object.keys(s.layout.items).length,54);
 const e=createLayoutEditor(s.layout);e.event('site','gut');e.event('add','depot');assert.equal(e.error,'');const id=e.selected;assert.ok(e.draft.items[id]);e.event('undo');assert.ok(!e.draft.items[id]);e.event('redo');assert.ok(e.draft.items[id]);
 assert.ok(applyTileLayout(s,e.draft).ok);assert.equal(workplaceCapacity(s,'gut','dock'),3);assert.ok(restoreCity(serializeCity(s)).layout.items[id]);
 e.event('select',id);e.event('remove');assert.ok(!e.draft.items[id]);assert.ok(compileLayout(e.draft).valid);assert.ok(s.layout.items[id],'draft does not change live town');
 e.event('select','heart');e.event('remove');assert.ok(e.draft.items.heart,'required organ cannot be removed');
});

test('legacy layouts retain placements, workers, cargo and progress during one-time expansion',()=>{
 const s=createCity('normal','simulation',{specialists:true});
 const poses=[[-6,-7],[0,2],[6,8],[6,-5],[-5,10],[-11,1],[-17,-5],[-6,-1],[-6,3],[0,8],[6,0],[6,4],[-14,-10],[-18,0],[-1,-7],[2,-11],[-12,7],[0,12]];
 const old={version:1,grid:'square',revision:7,items:Object.fromEntries(PLACEABLES.map((d,i)=>[d.id,{col:poses[i][0],row:poses[i][1],rot:0}]))};
 assert.ok(applyTileLayout(s,old).ok);command(s,'medicine',{drugId:'vancomycin',route:'iv',packs:1},null);s.time=21;
 const saved=serializeCity(s),restored=restoreCity(saved);assert.ok(restored);assert.equal(restored.layout.version,2);assert.equal(restored.time,21);assert.deepEqual(restored.resources,s.resources);assert.deepEqual(restored.cells.map(c=>c.id),s.cells.map(c=>c.id));assert.deepEqual(restored.shipments.map(c=>[c.id,c.amount]),s.shipments.map(c=>[c.id,c.amount]));
 for(const id of Object.keys(old.items))assert.deepEqual(restored.layout.items[id],old.items[id]);
 assert.ok(validateTileLayout(restored.layout));assert.ok(compileLayout(restored.layout).valid);assert.equal(serializeCity(restoreCity(serializeCity(restored))),serializeCity(restored));
});

test('secondary docks use their real building and enlarged saves keep more than 200 workers',()=>{
 const s=town();assert.equal(workplaceCapacity(s,'gut','dock'),2);assert.equal(workplaceCapacity(s,'lung','oxygen'),6);
 const a=s.cells[0],b=s.cells[1];const first=requestWorkplace(s,a,'gut','dock'),second=requestWorkplace(s,b,'gut','dock');assert.equal(first.slot,0);assert.equal(second.slot,1);assert.equal(second.owner,'depot-gut-0');assert.deepEqual(second.target,workStation('gut','dock',1,s.layout).target);assert.notDeepEqual(first.target,second.target);
 let l=s.layout;for(let n=0;n<16;n++){const result=addLayoutBuilding(l,'house','heart');assert.ok(result.ok,result.text);l=result.layout;}
 assert.ok(applyTileLayout(s,l).ok);assert.equal(populationLimit(s),CITY_CAPS.cells);
 while(s.cells.length<210){const copy=structuredClone(s.cells.find(c=>c.kind==='rbc'));copy.id=++s.serial;copy.workplace=null;copy.queueMove=null;copy.path=[];copy.step=0;s.cells.push(copy);}
 const restored=restoreCity(serializeCity(s));assert.ok(restored);assert.equal(restored.cells.length,210);
 for(let i=0;i<30;i++)tickCity(restored,1/30,null);assert.ok(restoreCity(serializeCity(restored)));
});

test('offscreen cells leave render batches while simulation and follow coordinates stay intact',()=>{
 const s=town(),before=serializeCity(s),actors=createActors(qualityProfile(390));actors.draw(s);assert.equal(actors.positions.length,108);
 actors.draw(s,{visible:()=>false});assert.equal(actors.positions.length,0);assert.equal(actors.root.children.find(m=>m.name==='body').count,0);assert.equal(serializeCity(s),before);
 actors.draw(s,{visible:()=>true});assert.equal(actors.positions.length,108);
});
