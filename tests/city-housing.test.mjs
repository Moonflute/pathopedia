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
