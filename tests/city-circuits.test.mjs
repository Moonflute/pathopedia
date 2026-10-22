import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout,compileLayout,walkingRoute} from '../src/city-tile-layout.mjs';
import {compileVascularLayout} from '../src/city-vascular-layout.mjs';
import {CITY_RADIUS,RIM_WALLS,wallPieces} from '../src/city-boundary.mjs';
import {TISSUES,WALLS} from '../src/city-frontier-data.mjs';
import {groundPoint,groundCoordinate} from '../src/city-three-layout.mjs';
import {entryTrackHeight,trackHeight,trackMeasure} from '../src/city-entry-tracks.mjs';
import {tickResponse,responseView,validateResponse} from '../src/city-response.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});assert.ok(applyTileLayout(s,createTileLayout()).ok);return s;};

test('systemic blood completes all four sides while pulmonary blood stays between heart and lung',()=>{
 const v=compileVascularLayout(createTileLayout());
 for(const id of ['gut','kidney','marrow','lymph']){
  const circuit=[...v.navigation.route(v.centres.heart,v.centres[id]),...v.navigation.route(v.centres[id],v.centres.heart)];
  for(const axis of ['x','z']){assert.ok(Math.min(...circuit.map(p=>p[axis]))<-35,id+' negative '+axis);assert.ok(Math.max(...circuit.map(p=>p[axis]))>35,id+' positive '+axis);}
 }
 for(const id of ['artery-lung','vein-lung'])assert.ok(v.vessels.find(v=>v.id===id).points.every(p=>Math.hypot(p.x,p.z)<30));
 assert.equal(RIM_WALLS.length,14);for(const w of RIM_WALLS){assert.ok(wallPieces(w).length>3);for(const p of w.points)assert.ok(Math.abs(Math.hypot(p.x,p.z)-CITY_RADIUS)<1e-8);}
 const layout=createTileLayout();for(const wall of WALLS){const route=walkingRoute(layout,groundCoordinate(v.centres.heart),[wall.inside]),end=groundPoint(route.at(-1)),target=groundPoint(wall.inside);assert.ok(Math.hypot(end.x-target.x,end.z-target.z)<.01,'repair route '+wall.id);}
});

test('both mucosal entrances have elevated decks with ramps and no shared blood-road connection',()=>{
 const c=compileLayout(createTileLayout());
 for(const [id,points] of Object.entries(c.entries)){
  const total=trackMeasure(points).total;assert.ok(total>20);assert.equal(trackHeight(0,total),0);assert.equal(trackHeight(total,total),0);assert.equal(entryTrackHeight(points,points[1]),1.65);
  assert.ok(c.connections.find(p=>p.id==='entry-'+id)?.ok);
  assert.equal(c.streets.runs.some(p=>p.level===1),false);
 }
});

test('existing four-tissue saves keep damage and receive the additional normal tissue',()=>{
 const s=city(),saved=JSON.parse(serializeCity(s));saved.frontier.tissues=saved.frontier.tissues.slice(0,4);saved.frontier.tissues[0].hp=42;delete saved.frontier.rimVersion;
 const restored=restoreCity(saved);assert.ok(restored);assert.equal(restored.frontier.tissues.length,TISSUES.length);assert.equal(restored.frontier.tissues[0].hp,42);assert.equal(restored.frontier.rimVersion,1);
 assert.ok(restored.frontier.tissues.slice(4).every(t=>t.hp===100));
});

test('the response timeline waits for real antigen presentation and tissue recovery',()=>{
 const s=city();assert.ok(command(s,'expose',{recordId:'SAU-002',front:'skin',wall:11,amount:6},data).ok);tickCity(s,.05,data,true);
 let view=responseView(s);assert.equal(view.route,'피부');assert.equal(view.episode.seen[2],null);assert.equal(view.episode.seen[3],null);
 const episode=view.episode;s.frontier.walls[11].hp=25;s.time+=3;s.spawn=[];s.enemies=[];tickResponse(s);view=responseView(s);
 assert.equal(view.episode.closedAt,undefined);assert.equal(view.episode.seen[2],null);assert.equal(view.episode.seen[3],null);assert.ok(view.episode.seen[4]!=null);
 assert.ok(command(s,'expose',{recordId:'SAU-002',front:'skin',wall:11,amount:6},data).ok);tickResponse(s);view=responseView(s);
 assert.notEqual(view.stage,5);assert.equal(view.steps[4].state,'waiting');assert.equal(view.steps[4].detail,'감염 진행');s.spawn=[];s.enemies=[];
 s.frontier.walls[11].hp=100;s.time++;tickResponse(s);assert.ok(episode.closedAt);assert.equal(responseView(s).steps[3].state,'skipped');assert.ok(validateResponse(s));assert.ok(restoreCity(serializeCity(s)));
});
