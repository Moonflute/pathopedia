import {CITY_STYLE as STYLE} from './city-three-style.mjs';
import {CITY_ENTRIES} from './city-world.mjs';
import * as T from './vendor/three/three.module.min.js';
import {GLTFLoader} from './vendor/three/GLTFLoader.js';
import {WALLS} from './city-frontier-data.mjs';
import {wallMaximum} from './city-frontier.mjs';

const root=new URL('../assets/city3d/bundle/',import.meta.url);
export async function loadCityBundle(){
 const response=await fetch(new URL('sources.json',root));if(!response.ok)throw Error('Village assets');
 const manifest=await response.json(),models={},textures=new Map(),materials=new Map(),styled=new WeakSet(),geometries=new Set(),loader=new GLTFLoader();
 const dispose=()=>{for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();for(const t of textures.values())t.dispose();};
 try{
  // Limit parallel decoding and share the atlas across all source models.
  const entries=Object.entries(manifest.models);
  for(let i=0;i<entries.length;i+=3){const results=await Promise.allSettled(entries.slice(i,i+3).map(async([name,entry])=>{
   const url=new URL(entry.path,root),gltf=await loader.loadAsync(url.href);
   gltf.scene.traverse(mesh=>{
    if(!mesh.isMesh)return;geometries.add(mesh.geometry);
    const shared=material=>{
     const index=gltf.parser.associations.get(material)?.materials,definition=gltf.parser.json.materials[index];
     const source=gltf.parser.json.textures?.[definition?.pbrMetallicRoughness?.baseColorTexture?.index]?.source;
     const uri=gltf.parser.json.images?.[source]?.uri;
     if(material.map&&uri){const key=new URL(uri,url).href;if(textures.has(key)){if(material.map!==textures.get(key))material.map.dispose();material.map=textures.get(key);}else{material.map.anisotropy=1;textures.set(key,material.map);}}
     material.roughness=STYLE.roughness;material.metalness=0;
     if(!styled.has(material)){material.color.multiply(new T.Color(STYLE.atlasTint));styled.add(material);}
     const key=[material.map?.uuid,material.color.getHex(),material.side,material.vertexColors,material.transparent,material.opacity,material.alphaTest].join(':');
     if(materials.has(key)){const existing=materials.get(key);if(existing!==material)material.dispose();return existing;}
     materials.set(key,material);return material;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(shared):shared(mesh.material);
    mesh.userData.cityAsset=true;mesh.castShadow=true;mesh.receiveShadow=true;
   });
   gltf.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
   const model=new T.Group();model.add(gltf.scene);gltf.scene.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));model.userData.size=size;models[name]=model;
  }));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;}
  return {models,dispose};
 }catch(error){dispose();throw error;}
}

export function bundleModel(bundle,name,height,maxWidth=Infinity){
 const proto=bundle?.models[name];if(!proto)return null;
 const object=proto.clone(true),size=proto.userData.size;
 object.scale.setScalar(Math.min(height/Math.max(.001,size.y),maxWidth/Math.max(.001,size.x,size.z)));
 return object;
}

// The same 14 wall states drive a small set of instance batches. Broken walls
// still use the existing rubble, fire and repair effects; no new simulation.
export function createBundleWalls(bundle){
 const root=new T.Group(),batches=[],matrix=new T.Matrix4(),wallMatrix=new T.Matrix4(),quaternion=new T.Quaternion(),axis=new T.Vector3(0,1,0),position=new T.Vector3(),scale=new T.Vector3(),color=new T.Color();
 const surface=new T.MeshStandardMaterial({color:0xffffff,roughness:STYLE.roughness});
 function pool(name,capacity,kind){
  const template=bundleModel(bundle,name,1),parts=[];template.updateMatrixWorld(true);const size=new T.Box3().setFromObject(template).getSize(new T.Vector3());
  template.traverse(m=>{if(!m.isMesh)return;const mesh=new T.InstancedMesh(m.geometry,surface,capacity);mesh.userData.cityAsset=true;mesh.userData.structure=kind;mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;root.add(mesh);const part={mesh,local:m.matrixWorld.clone()};parts.push(part);batches.push(part);});
  return {size,parts};
 }
 const walls=pool('stone-wall',WALLS.length,'wall'),towers=pool('stone-tower',4,'tower');
 function put(group){for(const {mesh,local} of group.parts){matrix.multiplyMatrices(wallMatrix,local);mesh.setMatrixAt(mesh.count,matrix);mesh.setColorAt(mesh.count,color);mesh.count++;}}
 return {root,dispose(){surface.dispose();},update(s,{camera,target}={}){
  const vx=camera?camera.position.x-target.x:20,vz=camera?camera.position.z-target.z:32;
  for(const {mesh} of batches)mesh.count=0;
  for(const [i,wall] of WALLS.entries()){
   const state=s.frontier?.walls[i];if(!state||state.hp<=0)continue;
   const dx=wall.b.x-wall.a.x,dz=wall.b.z-wall.a.z,length=Math.hypot(dx,dz),front=wall.nx*vx+wall.nz*vz>Math.hypot(vx,vz)*.3;
   // Leave both biological entrances open in the perimeter.
   const start=i===5?.25:0,end=i===1?Math.min(1,(CITY_ENTRIES.airway.portal.x-1.4-wall.a.x)/dx):1,cx=wall.a.x+dx*(start+end)/2,cz=wall.a.z+dz*(start+end)/2;
   position.set(cx,.02,cz);quaternion.setFromAxisAngle(axis,-Math.atan2(dz,dx));scale.set(length*(end-start)*.99/Math.max(.01,walls.size.x),front?.6:1.7,1);
   color.set(state.repair?0xb9ccc2:state.hp/wallMaximum(s,i)<.75?0xc9ab93:STYLE.plasterWarm);
   wallMatrix.compose(position,quaternion,scale);
   put(walls);
   if(i===0||i===4||i===7||i===10){position.set(wall.a.x,.02,wall.a.z);quaternion.identity();scale.setScalar(front?1.1:2.3);wallMatrix.compose(position,quaternion,scale);put(towers);}
  }
  for(const {mesh} of batches){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }};
}
