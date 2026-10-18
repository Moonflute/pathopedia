import * as T from './vendor/three/three.module.min.js';
import {groundPoint} from './city-three-layout.mjs';
import {JOBS,DRUGS} from './city-data.mjs';

// A handful of instanced draws for all cells, rather than one scene graph per cell.
export function createActors(profile){
 const root=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),batches={},last=new Map(),positions=[];
 const capacity=profile.maxCells+profile.maxShipments;
 function batch(id,geometry,limit=capacity,flat=false){const material=flat?new T.MeshBasicMaterial({color:0xffffff}):new T.MeshStandardMaterial({color:0xffffff,roughness:.85});const mesh=new T.InstancedMesh(geometry,material,limit);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=!flat;mesh.receiveShadow=!flat;root.add(mesh);batches[id]=mesh;return mesh;}
 const sphere=new T.SphereGeometry(1,10,7),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,10);
 batch('body',sphere);batch('cap',sphere);batch('eyes',sphere,capacity*2);batch('feet',sphere,capacity*2);batch('hands',sphere,capacity*2);batch('cargo',box);batch('oxygen',sphere);batch('tool',box);batch('cart',box,profile.maxShipments);batch('wheels',cylinder,profile.maxShipments*2);
 batch('enemy',new T.IcosahedronGeometry(1,1),profile.maxEnemies);batch('spikes',new T.ConeGeometry(1,1,5),profile.maxEnemies*4);batch('enemyEyes',sphere,profile.maxEnemies*2);batch('debris',new T.IcosahedronGeometry(1,0),80);
 batch('selected',new T.TorusGeometry(.4,.035,4,18),profile.maxCells,true);
 batch('beam',cylinder,64,true);
 function put(id,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0){const m=batches[id],n=m.count;if(n>=m.instanceMatrix.count)return;dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(c));m.count++;}
 const eyeColor=0x41464c;
 function worker(p,kind,id,t,loaded,selected,task,drug){
  const phase=typeof id==='number'?id:Number(id.replace('shipment',''));
  const prev=last.get(id),distance=prev?Math.hypot(p.x-prev.x,p.z-prev.z):0,movedAt=distance>.00001?t:prev?.movedAt??-1,moving=t-movedAt<.12;
  let angle=prev?.angle??.5;if(distance>.00001)angle=Math.atan2(p.x-prev.x,p.z-prev.z);
  last.set(id,{...p,angle,movedAt});const bob=moving?Math.abs(Math.sin(t*11+phase))*.07:Math.sin(t*2+phase)*.015;
  const base=JOBS[kind]?.color||'#d7bb8b',wide=kind==='macrophage'?1.22:1,cs=Math.cos(angle),sn=Math.sin(angle);
  const at=(x,z)=>({x:p.x+x*cs+z*sn,z:p.z-x*sn+z*cs});
  put('body',p.x,.38+bob,p.z,.27*wide,.32,.25*wide,base);
  put('cap',p.x,.67+bob,p.z,kind==='rbc'?.32:.3,kind==='rbc'?.09:.13,.28,kind==='rbc'?0xbf5964:kind==='fibroblast'?0xdfaa47:kind==='dendritic'?0x7d9e74:kind==='macrophage'?0x8f7bb3:0xfff6df);
  for(const side of [-1,1]){
   const eye=at(side*.092,.227);put('eyes',eye.x,.43+bob,eye.z,.037,.049,.027,eyeColor,0,angle);
   const foot=at(side*.13,moving?Math.sin(t*11+phase+side)*.08:0);put('feet',foot.x,.09,foot.z,.10,.075,.14,0x826f61,0,angle);
   const arm=at(side*.28,.015);put('hands',arm.x,.34+bob,arm.z,.075,.105,.075,base);
  }
  if(loaded){const cargo=at(0,-.26);if(kind==='rbc')put('oxygen',cargo.x,.48+bob,cargo.z,.19,.22,.19,0x9cded8);else put('cargo',cargo.x,.39+bob,cargo.z,.28,.28,.25,kind==='dendritic'?0xb4cf87:0xc9a375,0,angle);}
  if(kind==='neutrophil'){const gun=at(.34,.19);put('tool',gun.x,.4+bob,gun.z,.1,.13,.4,drug?.color||0xaac6ad,0,angle);}
  if(kind==='fibroblast'){const tool=at(.33,.05);put('tool',tool.x,.48+bob,tool.z,.12,.4,.12,0x8b9e9f,['조직 복구','시설 건설'].includes(task)?Math.sin(t*8)*.6:0,angle);}
  if(selected)put('selected',p.x,.07,p.z,1,1,1,0xe5b854,Math.PI/2);
 }
 function draw(s,{selectedKind,selectedCell,paused}){
  for(const m of Object.values(batches))m.count=0;positions.length=0;const living=new Set(),t=s.time,drug=DRUGS.find(d=>d.id===s.drug);
  for(const c of s.cells.slice(0,profile.maxCells)){const p=groundPoint(c);positions.push({id:c.id,...p,cell:c});living.add(c.id);worker(p,c.kind,c.id,t,!!(c.cargo||c.recordId),selectedKind===c.kind||selectedCell===c.id,c.task,drug);}
  for(const sh of s.shipments.slice(0,profile.maxShipments)){
   const p=groundPoint(sh),id='shipment'+sh.id;living.add(id);worker({x:p.x,z:p.z+.48},'courier',id,t,true,false,'배송');
   const c=sh.kind==='drug'?0xb6c59a:sh.kind==='materials'?0xc59e68:0xe1ba78;
   put('cart',p.x,.24,p.z,.52,.33,.62,c);put('cargo',p.x,.54,p.z,.35,.28,.4,c);
   for(const side of [-1,1])put('wheels',p.x+side*.31,.16,p.z,.15,.08,.15,0x806c59,0,0,Math.PI/2);
  }
  for(const e of s.enemies.filter(e=>!e.dead).slice(0,profile.maxEnemies)){
   const p=groundPoint(e);put('enemy',p.x,.35,p.z,.38,.35,.37,e.color);
   for(let n=0;n<4;n++){const a=n*Math.PI/2;put('spikes',p.x+Math.cos(a)*.3,.62,p.z+Math.sin(a)*.3,.09,.3,.09,e.color,0,0,Math.cos(a)*.5);}
   for(const side of [-1,1])put('enemyEyes',p.x+side*.12,.42,p.z+.32,.04,.05,.03,eyeColor);
  }
  for(const e of s.debris.slice(0,80)){const p=groundPoint(e);put('debris',p.x,.09,p.z,.14,.08,.12,0xa3929e);}
  const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),direction=new T.Vector3();
  for(const fx of s.effects.slice(0,64)){const from=groundPoint(fx),to=groundPoint({x:fx.tx,y:fx.ty});a.set(from.x,.5,from.z);b.set(to.x,.5,to.z);direction.subVectors(b,a);dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.scale.set(.035,direction.length(),.035);dummy.updateMatrix();const m=batches.beam,n=m.count++;m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(fx.color));}
  for(const id of last.keys())if(!living.has(id))last.delete(id);
  for(const m of Object.values(batches)){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 }
 return {root,positions,draw};
}
