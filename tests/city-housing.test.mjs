import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Matrix4,Vector3} from '../src/vendor/three/three.module.min.js';
import {createTissueScene} from '../src/city-three-tissue.mjs';
import {createCity,serializeCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';
import {createPilotSurface} from '../src/city-pilot-physics.mjs';

test('varied houses keep their lot, stable rebuilds and physical roofs through damage',()=>{
 const s=createCity('normal','simulation',{specialists:true});applyTileLayout(s,createTileLayout());
 // Separate sample lots make every rendered fitting independently measurable.
 const patches=Array.from({length:24},(_,i)=>({x:100+i*3,z:100,angle:i%2?Math.PI/2:0,variant:i,district:'heart'})),matrix=new Matrix4(),box=new Box3(),centre=new Vector3();
 const snapshot=serializeCity(s);
 for(const theme of ['1','2']){
  const scene=createTissueScene(s.layout,patches,[],null,theme);scene.update(s);
  const signatures=root=>{
   const result=[];for(const m of root.children){
    assert.ok(m.count<=m.instanceMatrix.count);m.geometry.computeBoundingBox();
    for(let i=0;i<m.count;i++){
     m.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));box.copy(m.geometry.boundingBox).applyMatrix4(matrix);box.getCenter(centre);
     if(centre.x<90)continue;const p=patches.reduce((a,b)=>Math.hypot(a.x-centre.x,a.z-centre.z)<Math.hypot(b.x-centre.x,b.z-centre.z)?a:b);
     assert.ok(box.min.x>=p.x-.675&&box.max.x<=p.x+.675&&box.min.z>=p.z-.675&&box.max.z<=p.z+.675,`${theme} ${m.name} at ${p.x}: ${JSON.stringify(box)} extends into a neighbouring lane`);
     result.push(m.name+':'+matrix.elements.join(','));
    }
   }return result.sort();
  };
  const before=signatures(scene.root),reordered=createTissueScene(s.layout,[...patches].reverse(),[],null,theme);reordered.update(s);
  assert.deepEqual(signatures(reordered.root),before,'enumeration must not reshuffle architecture');
  const roofs=scene.root.children.filter(m=>m.name.startsWith('tissue-roofs-'));
  assert.ok(roofs.filter(m=>m.count>0).length>=2);
  const surface=createPilotSurface(scene.root,m=>m.name.startsWith('tissue-roofs-'));
  for(const p of patches)assert.equal(surface.clear({x:p.x,y:4,z:p.z},{x:p.x,y:.1,z:p.z}),false,'roof must stop a descending pilot');
  assert.equal(serializeCity(s),snapshot);
  for(const t of Object.values(s.frontier.tissues))t.hp=0;s.time+=.2;scene.update(s);assert.equal(scene.collisionVersion,2);
  for(const m of roofs)for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);box.copy(m.geometry.boundingBox).applyMatrix4(matrix);assert.ok(box.max.y<.65,'collapsed houses must lose tall roofs');}
  for(const t of Object.values(s.frontier.tissues))t.hp=100;s.time-=.2;
  for(const v of [scene,reordered]){const materials=new Set();for(const m of v.root.children){m.dispose();m.geometry.dispose();materials.add(m.material);}for(const m of materials)m.dispose();}
 }
});

test('retained housing matches a fresh scene through breathing, fire, repairs, collapse and restoration',()=>{
 const s=createCity('normal','simulation',{specialists:true});s.layout=createTileLayout();
 const patches=Array.from({length:12},(_,i)=>({x:100+i*3,z:100,variant:i,district:'heart'})),lungs=[{x:0,z:0,variant:0},{x:3,z:0,variant:1}];
 const snapshot=scene=>scene.root.children.map(m=>({name:m.name,count:m.count,matrix:m.instanceMatrix.array.slice(0,m.count*16),color:m.count?m.instanceColor?.array.slice(0,m.count*3):null}));
 const dispose=scene=>{const materials=new Set();for(const m of scene.root.children){m.dispose();m.geometry.dispose();materials.add(m.material);}for(const m of materials)m.dispose();};
 for(const theme of ['1','2']){
  const scene=createTissueScene(s.layout,patches,lungs,null,theme);s.time=0;scene.update(s);
  const roofs=scene.root.children.filter(m=>m.name.startsWith('tissue-roofs-')),body=scene.root.children.find(m=>m.name==='tissue-cottages');
  const versions=roofs.map(m=>m.instanceMatrix.version),colors=body.instanceColor.version,before=body.instanceMatrix.array.slice();
  for(const m of scene.root.children){m.instanceMatrix.clearUpdateRanges();m.instanceColor?.clearUpdateRanges();}
  s.time=.2;scene.update(s);assert.deepEqual(roofs.map(m=>m.instanceMatrix.version),versions);assert.equal(body.instanceColor.version,colors);assert.notDeepEqual(body.instanceMatrix.array,before,'lung motion continues');
  assert.ok(body.instanceMatrix.updateRanges[0].count<body.count*16,'only lung fittings need a new matrix upload');
  for(const [hp,repair] of [[100,false],[60,false],[40,false],[40,true],[0,false],[100,false]]){
   s.time+=.2;s.districts.lung.hp=hp;for(const t of s.frontier.tissues)t.hp=hp;
   const cells=s.cells;s.cells=repair?s.frontier.tissues.map((_,tissueJob)=>({tissueJob,task:'조직 블록 복구'})):[];
   const saved=serializeCity(s);scene.update(s);const fresh=createTissueScene(s.layout,patches,lungs,null,theme);fresh.update(s);
   assert.deepEqual(snapshot(scene),snapshot(fresh),`${theme}: HP ${hp}, repair ${repair}`);assert.equal(serializeCity(s),saved);
   if(hp===40)assert.equal(scene.root.children.find(m=>m.name==='tissue-fire').count>0,!repair);
   dispose(fresh);s.cells=cells;
  }
  assert.equal(scene.collisionVersion,3,'only collapse and restoration replace collision surfaces');
  const restored={...s,time:s.time,districts:{...s.districts,lung:{...s.districts.lung,hp:0}}};scene.update(restored);
  assert.equal(scene.collisionVersion,4,'a new run at the same clock must refresh');dispose(scene);
 }
});
