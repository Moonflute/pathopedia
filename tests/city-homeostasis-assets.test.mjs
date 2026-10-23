import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../src/vendor/three/three.module.min.js';
import {GLTFLoader} from '../src/vendor/three/GLTFLoader.js';
import {createHomeostasisScene} from '../src/city-three-homeostasis.mjs';
import {homeSites,homeFootprint} from '../src/city-homeostasis-data.mjs';
import {createPilotSurface} from '../src/city-pilot-physics.mjs';
import {createCity,serializeCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';

// Decode the shipped geometry; replace image IO with shared texture identities.
const root=new URL('../assets/city3d/bundle/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('sources.json',root)));
const models={},materials=new Map(),textures=new Map(),loader=new GLTFLoader();
for(const [name,entry] of Object.entries(manifest.models)){
 const bytes=readFileSync(new URL(entry.path,root)),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length);
 const images=doc.materials.map(m=>{const i=m.pbrMetallicRoughness?.baseColorTexture?.index;return doc.images?.[doc.textures?.[i]?.source]?.uri;});
 for(const m of doc.materials)delete m.pbrMetallicRoughness.baseColorTexture;delete doc.images;delete doc.textures;
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.alloc(20),chunk=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);chunk.writeUInt32LE(binary.length);chunk.writeUInt32LE(0x004e4942,4);
 const data=Buffer.concat([header,json,chunk,binary]),gltf=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;const material=mesh.material,uri=images[gltf.parser.associations.get(material)?.materials];
  if(uri){if(!textures.has(uri))textures.set(uri,new T.Texture());material.map=textures.get(uri);}
  const key=[uri,material.color.getHex(),material.vertexColors,material.side].join(':');if(!materials.has(key))materials.set(key,material);mesh.material=materials.get(key);mesh.userData.cityAsset=true;
 });
 gltf.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(gltf.scene),model=new T.Group(),center=bounds.getCenter(new T.Vector3());
 model.userData.size=bounds.getSize(new T.Vector3());gltf.scene.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));model.add(gltf.scene);models[name]=model;
}
const bundle={models};

test('organ assets stay inside existing lots, leave exchange points walkable and keep shared resources alive',()=>{
 const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());
 const saved=serializeCity(s);let sharedDisposals=0;
 for(const model of Object.values(models))model.traverse(m=>{if(m.isMesh){m.geometry.addEventListener('dispose',()=>sharedDisposals++);m.material.addEventListener('dispose',()=>sharedDisposals++);}});
 for(const theme of ['1','2'])for(const enabled of [true,false]){
  const scene=createHomeostasisScene({layout:s.layout,theme,bundle:enabled?bundle:null});scene.update(s);
  const assets=scene.buildings.getObjectByName('home-organ-assets'),sites=homeSites(s.layout);let draws=0;
  for(const site of sites){const group=assets.getObjectByName('home-kit-'+site.id),box=new T.Box3().setFromObject(group),f=homeFootprint(site);
   if(enabled){assert.ok(!box.isEmpty(),site.id);assert.ok(box.min.x>=f.left&&box.max.x<=f.right&&box.min.z>=f.top&&box.max.z<=f.bottom,site.id+' footprint');}
   else assert.ok(box.isEmpty());
  }
  scene.buildings.traverse(m=>{if(m.isMesh)draws++;});assert.ok(draws<=29,'bounded static batches: '+draws);
  const surface=createPilotSurface(scene.buildings);
  for(const site of sites){assert.ok(surface.blocked({x:site.x,z:site.z-3.8}),site.id+' building collision');assert.ok(!surface.blocked({x:site.x,z:site.z}),site.id+' open exchange');}
  for(const mesh of Object.values(scene.pools))assert.ok(mesh.count<=mesh.instanceMatrix.count);
  scene.dispose();assert.equal(sharedDisposals,0);
 }
 assert.equal(serializeCity(s),saved);
});
