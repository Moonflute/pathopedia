import * as T from './vendor/three/three.module.min.js';
import {mergeGeometries} from './vendor/three/BufferGeometryUtils.js';
import {bundleModel} from './city-three-bundle.mjs';

// Body: x, z, height, width. Props: model, x, z, height, width, y, rotation.
// All positions are local to the existing organ lot; its front exchange stays open.
export const HOME_ASSET_KITS=Object.freeze({
 brain:{body:[[0,-3.65,3.6,4.35]],props:[['bench',-2.55,-2.3,.5,.95],['table',2.5,-2.5,.6,.95],['jar',2.5,-2.5,.27,.3,.76]]},
 thyroid:{body:[[-1.35,-3.8,2.35,2.35],[1.35,-3.8,2.35,2.35]],props:[['station',0,-2.15,.6,1.15],['jar',-.32,-2.15,.32,.35,.76],['jar',.32,-2.15,.24,.3,.76]]},
 pancreas:{body:[[0,-3.8,2.8,3.55]],props:[['station',-2.5,-2.6,.65,.9],['jar',-2.5,-2.6,.35,.3,.8],['tank',2.5,-3.6,1.5,.9],['bucket',2.5,-2.1,.4,.5]]},
 liver:{body:[[-.45,-3.8,2.8,3.55]],props:[['silo',2.45,-4.65,2.4,1.1],['crate',-2.5,-2.1,.6,.75],['supply-barrel',2.45,-2.25,.85,.75]]},
 spleen:{body:[[0,-3.8,2.7,3.55]],props:[['cart',2.45,-4.1,.85,1.05],['bucket',-2.5,-2.25,.5,.65],['logs',2.45,-2.2,.45,.85]]},
 bone:{body:[[0,-3.8,2.7,3.55]],props:[['repair-scaffold',-2.5,-4.6,1.2,.85],['table',2.45,-2.4,.65,.95],['hammer',2.45,-2.4,.25,.4,.82],['rubble-stone',-2.45,-2.25,.3,.8]]},
 adrenal:{body:[[0,-3.8,2.65,3.5]],props:[['tank',-2.45,-3.2,1.3,.9],['tank',2.45,-3.2,1.3,.9],['bucket',2.45,-2.1,.4,.5]]},
 muscle:{body:[[0,-3.8,2.75,3.55]],props:[['table',-2.45,-2.35,.65,.95],['hammer',-2.45,-2.35,.27,.4,.82],['logs',2.45,-2.3,.65,.85],['repair-planks',2.45,-4.5,.3,.9]]},
 fat:{body:[[0,-3.8,2.6,3.5]],props:[['silo',-2.45,-4.5,2.3,.95],['hay-bale',2.45,-2.3,.7,.85],['supply-bags',-2.45,-2.2,.65,.75]]}
});

export function createHomeostasisAssets(sites,bundle){
 const root=new T.Group(),geometries=new Set(),bodies=new Set(),used={};root.name='home-organ-assets';
 function place(parent,name,x,z,height,width,y=.14,angle=0){
  const model=bundleModel(bundle,name,height,width);if(!model)return false;
  model.rotation.y=angle;model.updateMatrixWorld(true);
  const size=new T.Box3().setFromObject(model).getSize(new T.Vector3());
  const roomX=2*(3.3-Math.abs(x)),roomZ=2*Math.min(z+5.9,-1.4-z);
  model.scale.multiplyScalar(Math.min(1,roomX/Math.max(.001,size.x),roomZ/Math.max(.001,size.z)));
  model.position.set(x,y,z);parent.add(model);used[name]=(used[name]||0)+1;return true;
 }
 for(const site of sites){
  const kit=HOME_ASSET_KITS[site.id];if(!kit)continue;
  const group=new T.Group();group.name='home-kit-'+site.id;group.position.set(site.x,0,site.z);root.add(group);
  for(const p of kit.body)if(place(group,site.model,...p))bodies.add(site.id);
  for(const p of kit.props)place(group,...p);
  // Merge only inside one lot. Its bounds stay useful for culling and capsule collision.
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),transform=new T.Matrix4(),batches=new Map();
  group.traverse(mesh=>{
   if(!mesh.isMesh||Array.isArray(mesh.material))return;
   const material=mesh.material,g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
   transform.multiplyMatrices(inverse,mesh.matrixWorld);g.applyMatrix4(transform);
   for(const key of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(key))g.deleteAttribute(key);
   if(!g.attributes.normal)g.computeVertexNormals();
   const count=g.attributes.position.count;
   if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(count*2),2));
   const colors=new Float32Array(count*3),source=material.vertexColors?g.attributes.color:null;
   for(let i=0;i<count;i++){colors[i*3]=source?source.getX(i):1;colors[i*3+1]=source?source.getY(i):1;colors[i*3+2]=source?source.getZ(i):1;}
   g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.clearGroups();
   if(!batches.has(material))batches.set(material,[]);batches.get(material).push(g);
  });
  group.clear();
  for(const [material,parts] of batches){
   const geometry=mergeGeometries(parts);for(const p of parts)p.dispose();geometries.add(geometry);
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const mesh=new T.Mesh(geometry,material);mesh.name=group.name;mesh.userData.cityAsset=true;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
 }
 root.userData.bundleModels=used;
 return {root,hasBody:id=>bodies.has(id),dispose(){for(const g of geometries)g.dispose();root.removeFromParent();}};
}
