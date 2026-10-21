import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../src/vendor/three/three.module.min.js';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout,compileLayout} from '../src/city-tile-layout.mjs';
import {groundCoordinate,qualityProfile,landscapeCameraRange} from '../src/city-three-layout.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {createVillage} from '../src/city-three-village.mjs';
import {createFrontierScene,entryFlowPoint} from '../src/city-three-frontier.mjs';
import {CITY_CAPS,LANDSCAPE_RADIUS} from '../src/city-world.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const town=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());return s;};
const translation=(mesh,index)=>{const matrix=new T.Matrix4();mesh.getMatrixAt(index,matrix);return new T.Vector3().setFromMatrixPosition(matrix);};

test('pathogen eyes and long axis turn with displayed movement, then face the attack target',()=>{
 const s=town();s.cells=[];s.enemies=[{id:999,recordId:'PAE-013',hp:100,...groundCoordinate({x:0,z:0})}];
 const actors=createActors(qualityProfile(1280)),eyes=actors.root.getObjectByName('enemyEyes'),body=actors.root.getObjectByName('enemy');
 actors.draw(s);Object.assign(s.enemies[0],groundCoordinate({x:-1,z:0}));s.time+=.05;actors.draw(s);
 let face=translation(eyes,0).add(translation(eyes,1)).multiplyScalar(.5).sub(translation(body,0));assert.ok(face.x<-.45);assert.ok(Math.abs(face.z)<.01);
 Object.assign(s.enemies[0],groundCoordinate({x:-1,z:1}));s.time+=.05;actors.draw(s);
 face=translation(eyes,0).add(translation(eyes,1)).multiplyScalar(.5).sub(translation(body,0));assert.ok(face.z>.45);assert.ok(Math.abs(face.x)<.01);
 const target=groundCoordinate({x:0,z:1});Object.assign(s.enemies[0],{action:'attack',attackX:target.x,attackY:target.y});actors.draw(s);
 face=translation(eyes,0).add(translation(eyes,1)).multiplyScalar(.5).sub(translation(body,0));assert.ok(face.x>.45);
});

test('airflow follows the compiled intake into the lung and slows with ventilation',()=>{
 const s=town(),path=compileLayout(s.layout).entries.airway;
 assert.ok(Math.hypot(entryFlowPoint(path,0).x-path[0].x,entryFlowPoint(path,0).z-path[0].z)<1e-7);
 assert.ok(Math.hypot(entryFlowPoint(path,1).x-path.at(-1).x,entryFlowPoint(path,1).z-path.at(-1).z)<1e-7);
 const scene=createFrontierScene();scene.update(s);const normal=scene.root.getObjectByName('frontier-glow').count;
 s.weather.id='dry';s.time+=.1;const saved=serializeCity(s);scene.update(s);assert.equal(serializeCity(s),saved);assert.ok(scene.root.getObjectByName('frontier-glow').count<normal);
 scene.root.traverse(m=>{if(m.isInstancedMesh){assert.ok(m.count<m.instanceMatrix.count,m.name);assert.ok(m.instanceMatrix.array.every(Number.isFinite),m.name);}});
});

test('the baked landscape covers zoom-out and entry scenery leaves saved routes unchanged',()=>{
 const s=town(),saved=serializeCity(s),village=createVillage({},s.layout);let radius=0;
 village.root.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh&&m.geometry){m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;radius=Math.max(radius,Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z));}});
 assert.ok(radius>=LANDSCAPE_RADIUS-1);assert.equal(serializeCity(s),saved);assert.ok(compileLayout(s.layout).valid);village.dispose();
});

test('portrait overview and low tilt keep every ground ray between the clip planes',()=>{
 for(const [span,zoom,elevation] of [[32,.15,.64],[32,.15,.426],[27,.38,.64],[17,.38,.426],[32,3.3,.8]]){
  const range=landscapeCameraRange(span,zoom,elevation),depth=span/(2*zoom)*Math.sqrt(1-elevation**2)/elevation;
  assert.ok(range.distance-depth>1);assert.ok(range.distance+depth<range.far);assert.ok(range.fogNear>range.distance);
 }
});

test('a 256-pathogen introduction releases quickly, renders every representative and resumes deterministically',()=>{
 const s=town();s.cells=[];
 assert.equal(command(s,'expose',{recordId:'SAU-002',front:'blood',amount:256},data).ok,true);
 assert.equal(command(s,'expose',{recordId:'SPN-105',front:'blood',amount:3},data).ok,false);
 tickCity(s,.05,data);assert.equal(s.enemies.length,8);assert.ok(new Set(s.enemies.map(e=>e.x+','+e.y)).size>1);
 let copy=restoreCity(serializeCity(s));assert.ok(copy);
 for(let i=0;i<16*20;i++){tickCity(s,.05,data);tickCity(copy,.05,data);}
 assert.equal(s.spawn.length,0);assert.equal(s.enemies.length,CITY_CAPS.enemies);assert.equal(serializeCity(copy)===serializeCity(s),true,'large introduction resumes with the same routes and state');
 const actors=createActors(qualityProfile(390));actors.draw(s);assert.equal(actors.root.getObjectByName('enemyEyes').count,512);assert.equal(actors.root.children.length,16);
 actors.root.traverse(m=>{if(m.isInstancedMesh){assert.ok(m.count<=m.instanceMatrix.count,m.name);assert.ok(m.instanceMatrix.array.every(Number.isFinite),m.name);}});
});
