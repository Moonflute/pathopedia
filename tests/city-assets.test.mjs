import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../src/vendor/three/three.module.min.js';
import {GLTFLoader} from '../src/vendor/three/GLTFLoader.js';
import {CITY_ASSET_KEY,readCityAssets,storeCityAssets,createAssetSwitch} from '../src/city-asset-preference.mjs';
import {createBundleWalls} from '../src/city-three-bundle.mjs';
import {createVillage} from '../src/city-three-village.mjs';
import {createCity,serializeCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';

test('new assets default on; the preference never writes the city save',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(readCityAssets(storage),true);storeCityAssets(false,storage);assert.equal(readCityAssets(storage),false);
 assert.deepEqual([...values.keys()],[CITY_ASSET_KEY]);storeCityAssets(true,storage);assert.equal(readCityAssets(storage),true);
 assert.equal(readCityAssets({getItem(){throw Error('blocked');}}),true);
});

test('unchecked assets do not load; late completion cannot re-enable them',async()=>{
 let resolve,loads=0,disposed=0;const changes=[],states=[];
 const controller=createAssetSwitch({load:()=>{loads++;return new Promise(r=>resolve=r);},apply:v=>changes.push(v),state:v=>states.push(v)});
 await controller.set(false);assert.equal(loads,0);
 const first=controller.set(true);await Promise.resolve();const second=controller.set(true);await controller.set(false);
 const bundle={dispose(){disposed++;}};resolve(bundle);await Promise.all([first,second]);
 assert.deepEqual(changes,[]);assert.equal(states.at(-1),'off');assert.equal(loads,1);
 await controller.set(true);await controller.set(false);await controller.set(true);
 assert.deepEqual(changes,[bundle,null,bundle]);assert.equal(loads,1);
 controller.dispose();assert.equal(disposed,1);
});

test('load failure can retry and a closed view releases an in-flight bundle',async()=>{
 let attempts=0,resolve,disposed=0;const changes=[],states=[];
 const c=createAssetSwitch({load:()=>{if(++attempts===1)throw Error('offline');return new Promise(r=>resolve=r);},apply:v=>changes.push(v),state:v=>states.push(v)});
 await c.set(true);assert.equal(states.at(-1),'error');await c.set(false);
 const pending=c.set(true);await Promise.resolve();c.dispose();resolve({dispose(){disposed++;}});await pending;
 assert.equal(disposed,1);assert.deepEqual(changes,[]);
});

const root=new URL('../assets/city3d/bundle/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('sources.json',root)));
const decode=b=>JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
test('the reviewed subset has complete local references and three shared 1K atlases',()=>{
 assert.equal(manifest.license,'CC0-1.0');assert.equal(Object.keys(manifest.models).length,24);assert.equal(Object.keys(manifest.textures).length,3);
 let bytes=0;
 for(const item of [...Object.values(manifest.models),...Object.entries(manifest.textures).map(([path,v])=>({...v,path}))]){
  const b=readFileSync(new URL(item.path,root));bytes+=b.length;
  assert.equal(b.length,item.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);
 }
 assert.equal(bytes,manifest.totalBytes);assert.ok(bytes<3_700_000);
 for(const t of Object.values(manifest.textures))assert.ok(t.width<=1024&&t.height<=1024);
 for(const entry of Object.values(manifest.models)){
  const url=new URL(entry.path,root),b=readFileSync(url),doc=decode(b);assert.equal(b.readUInt32LE(8),b.length);
  for(const image of doc.images){assert.equal(image.bufferView,undefined);assert.ok(existsSync(new URL(image.uri,url)));}
  for(const view of doc.bufferViews)assert.ok((view.byteOffset||0)+view.byteLength<=doc.buffers[0].byteLength);
 }
});

async function geometryBundle(){
 const models={},loader=new GLTFLoader();
 for(const [name,entry] of Object.entries(manifest.models)){
  const b=readFileSync(new URL(entry.path,root)),doc=decode(b),length=b.readUInt32LE(12),bin=b.subarray(28+length);
  // Decode actual geometry in Node without fetching browser image resources.
  for(const m of doc.materials)delete m.pbrMetallicRoughness.baseColorTexture;
  delete doc.images;delete doc.textures;
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const chunk=Buffer.alloc(8);chunk.writeUInt32LE(bin.length);chunk.writeUInt32LE(0x004e4942,4);
  const data=Buffer.concat([header,json,chunk,bin]),gltf=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  gltf.scene.traverse(m=>{if(m.isMesh)m.userData.cityAsset=true;});gltf.scene.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(gltf.scene),model=new T.Group(),center=bounds.getCenter(new T.Vector3());
  model.userData.size=bounds.getSize(new T.Vector3());gltf.scene.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));model.add(gltf.scene);models[name]=model;
 }
 return {models};
}

test('real imported walls track breakage; switching village meshes preserves city and cached geometry',async()=>{
 const bundle=await geometryBundle(),s=createCity('normal','steady',{workCrews:true,specialists:true});applyTileLayout(s,createTileLayout());
 const snapshot=serializeCity(s),walls=createBundleWalls(bundle);
 const panels=walls.root.children.filter(m=>m.userData.structure==='wall'),towers=walls.root.children.filter(m=>m.userData.structure==='tower');assert.ok(panels.length&&towers.length);
 walls.update(s);assert.ok(panels.every(m=>m.count===14));assert.ok(towers.every(m=>m.count===4));
 s.frontier.walls[4].hp=0;walls.update(s);assert.ok(panels.every(m=>m.count===13));assert.ok(towers.every(m=>m.count===3));
 s.frontier.walls[4].hp=100;walls.update(s);assert.ok(panels.every(m=>m.count===14));assert.ok(towers.every(m=>m.count===4));
 let released=0;for(const model of Object.values(bundle.models))model.traverse(m=>{if(m.geometry)m.geometry.addEventListener('dispose',()=>released++);});
 for(const enabled of [true,false,true]){
  const village=createVillage({},s.layout,'workshop',enabled?bundle:null);village.update(s,{});village.movePreview(s.layout.items.workshop);village.dispose();
  const used=village.root.userData.bundleModels;
  if(enabled){assert.ok(used['house-a']+used['house-b']>=14);assert.equal(used.hall,1);assert.equal(used.tower,3);assert.equal(used.silo,1);assert.ok(used.market>=3);}
  else assert.deepEqual(used,{});
 }
 assert.equal(serializeCity(s),snapshot);assert.equal(released,0);
 for(const mesh of walls.root.children)mesh.dispose();
});
