import * as T from './vendor/three/three.module.min.js';
import {activeActivity,activityProgress} from './city-activity.mjs';
import {groundPoint} from './city-three-layout.mjs';

const tags={load:'▣',unload:'↓',build:'⚒',repair:'⚒',fabricate:'⚒',produce:'Y',engulf:'◎',shoot:'✦',collect:'♻',signal:'!',patch:'+',present:'MHC',prime:'MHC',degranulate:'✦',cytotoxic:'✦',regulate:'〜',net:'NET'};
const tint={load:0xefc97b,unload:0x8ddae0,repair:0x9edcb8,build:0x9edcb8,produce:0xc2a0ed,engulf:0xeab88a,collect:0xafcf88,signal:0xefcd83,present:0xc4afe9,regulate:0xa3d1c8};
export function createPilotLife(){
 const root=new T.Group(),materials=new Map(),baseMaterial=new T.SpriteMaterial(),labels=Array.from({length:8},()=>{const sprite=new T.Sprite(baseMaterial);sprite.scale.set(.48,.23,1);root.add(sprite);return sprite;});
 const geometry=new T.TorusGeometry(.38,.026,4,20),material=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6}),rings=new T.InstancedMesh(geometry,material,8),particleGeometry=new T.SphereGeometry(.035,4,3),particleMaterial=new T.MeshBasicMaterial({color:0xffffff}),particles=new T.InstancedMesh(particleGeometry,particleMaterial,32),dummy=new T.Object3D(),color=new T.Color();rings.frustumCulled=particles.frustumCulled=false;root.add(rings,particles);
 function label(kind){if(materials.has(kind))return materials.get(kind);const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#163b34dd';c.fillRect(0,0,128,64);c.fillStyle='#'+(tint[kind]||0xb9d9c4).toString(16).padStart(6,'0');c.textAlign='center';c.textBaseline='middle';c.font='bold 33px sans-serif';c.fillText(tags[kind]||'…',64,34);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const mat=new T.SpriteMaterial({map:texture,depthTest:true});materials.set(kind,mat);return mat;}
 const setRing=(x,z,size,col)=>{dummy.position.set(x,.1,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(size);dummy.updateMatrix();rings.setMatrixAt(rings.count,dummy.matrix);rings.setColorAt(rings.count++,color.setHex(col));};
 return {root,update(s,v){
  labels.forEach(l=>l.visible=false);rings.count=particles.count=0;
  const near=s.cells.filter(c=>c!==v.cell&&!c.lost).map(c=>({c,p:groundPoint(c),a:activeActivity(c,s.time)})).filter(o=>Math.hypot(o.p.x-v.position.x,o.p.z-v.position.z)<12).sort((a,b)=>Math.hypot(a.p.x-v.position.x,a.p.z-v.position.z)-Math.hypot(b.p.x-v.position.x,b.p.z-v.position.z)).slice(0,8);
  near.forEach(({c,p,a},i)=>{
   const kind=a?.kind||(c.waitReason?'signal':null);if(kind){labels[i].material=label(kind);labels[i].position.set(p.x,1.15,p.z);labels[i].visible=true;}
   if(a&&['load','unload','produce','collect','present'].includes(a.kind)){
    const q=groundPoint(a),progress=activityProgress(a,s.time);for(let n=0;n<3&&particles.count<32;n++){let t=(progress+n/3)%1;if(a.kind==='load'||a.kind==='collect')t=1-t;dummy.position.set(p.x+(q.x-p.x)*t,.45+Math.sin(t*Math.PI)*.2,p.z+(q.z-p.z)*t);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();particles.setMatrixAt(particles.count,dummy.matrix);particles.setColorAt(particles.count++,color.setHex(tint[a.kind]||0xc6d8a1));}
   }
  });
  const tracked=v.observed?.track;if(tracked){const p=groundPoint(tracked);setRing(p.x,p.z,1,0x9af4d6);}
  for(const e of v.incidents)setRing(e.x,e.z,2+Math.sin(s.time*2)*.15,e.color);
  rings.instanceMatrix.needsUpdate=true;if(rings.instanceColor)rings.instanceColor.needsUpdate=true;particles.instanceMatrix.needsUpdate=true;if(particles.instanceColor)particles.instanceColor.needsUpdate=true;
 },dispose(){baseMaterial.dispose();for(const m of materials.values()){m.map.dispose();m.dispose();}geometry.dispose();material.dispose();particleGeometry.dispose();particleMaterial.dispose();rings.dispose();particles.dispose();root.clear();}};
}
