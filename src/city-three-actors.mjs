import * as T from './vendor/three/three.module.min.js';
import {groundPoint} from './city-three-layout.mjs';
import {CELL_JOBS,DRUGS} from './city-data.mjs';

// Shared parts retain batching across eight silhouettes; tiny face/limb meshes
// use fewer segments than the body. No skeleton or per-character scene graph.
export const CELL_STYLES=Object.freeze({
 rbc:{w:.30,h:.21,y:.32,face:.35,hat:0xb55261},
 neutrophil:{w:.28,h:.31,y:.39,face:.44,hat:0xf8f0d7},
 macrophage:{w:.39,h:.36,y:.43,face:.48,hat:0x997db9},
 fibroblast:{w:.25,h:.34,y:.4,face:.45,hat:0xe5b854},
 dendritic:{w:.25,h:.29,y:.37,face:.43,hat:0x789b73},
 helperT:{w:.25,h:.32,y:.39,face:.44,hat:0x648a9b},
 plasma:{w:.32,h:.33,y:.4,face:.45,hat:0xb5a0cf},
 platelet:{w:.22,h:.16,y:.25,face:.29,hat:0xedcc90},
 courier:{w:.26,h:.3,y:.38,face:.43,hat:0xa48461}
});
export function createActors(profile){
 const root=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),batches={},last=new Map(),positions=[];
 const capacity=profile.maxCells+profile.maxShipments,standard=new T.MeshStandardMaterial({color:0xffffff,roughness:.9}),flat=new T.MeshBasicMaterial({color:0xffffff});
 const body=new T.SphereGeometry(1,12,8),hat=new T.SphereGeometry(1,10,6),small=new T.SphereGeometry(1,6,4),box=new T.BoxGeometry(1,1,1),rod=new T.CylinderGeometry(1,1,1,6),rim=new T.TorusGeometry(1,.13,4,12);
 function batch(id,geometry,limit=capacity,shadow=true,unlit=false){const m=new T.InstancedMesh(geometry,unlit?flat:standard,limit);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=!unlit;root.add(m);batches[id]=m;}
 batch('body',body);batch('cap',hat);batch('eyes',small,capacity*2,false);batch('feet',small,capacity*2);batch('hands',small,capacity*2,false);
 batch('box',box,capacity*5);batch('pod',small,capacity*5,false);batch('rod',rod,capacity*5,false);batch('rim',rim,capacity*2,false);batch('badge',new T.IcosahedronGeometry(1,0),capacity*2,false);
 batch('enemy',new T.IcosahedronGeometry(1,1),profile.maxEnemies);batch('spikes',new T.ConeGeometry(1,1,5),profile.maxEnemies*4);batch('enemyEyes',small,profile.maxEnemies*2,false);
 batch('debris',new T.IcosahedronGeometry(1,0),80,false);batch('selected',new T.TorusGeometry(.43,.035,4,18),profile.maxCells,false,true);batch('beam',rod,64,false,true);
 function put(id,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0){const m=batches[id],n=m.count;if(n>=m.instanceMatrix.count)return;dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(c));m.count++;}
 function worker(p,kind,id,t,loaded,selected,task,drug){
  const look=CELL_STYLES[kind]||CELL_STYLES.courier,phase=typeof id==='number'?id:Number(id.replace('shipment',''));
  const prev=last.get(id),distance=prev?Math.hypot(p.x-prev.x,p.z-prev.z):0,movedAt=distance>.00001?t:prev?.movedAt??-1,moving=t-movedAt<.12;
  let angle=prev?.angle??.5;if(distance>.00001)angle=Math.atan2(p.x-prev.x,p.z-prev.z);
  last.set(id,{x:p.x,z:p.z,angle,movedAt});
  const stride=t*(kind==='macrophage'?8:kind==='platelet'?14:11)+phase,bob=moving?Math.abs(Math.sin(stride))*.055:Math.sin(t*2+phase)*.012;
  const base=CELL_JOBS[kind]?.color||'#d7bb8b',cs=Math.cos(angle),sn=Math.sin(angle),working=['조직 복구','시설 건설','응급 봉합','항체 생산','잔해 청소','항원 수집'].includes(task),beat=working?Math.sin(t*7+phase):0;
  const part=(id,x,y,z,sx,sy,sz,c,rx=0,rz=0)=>put(id,p.x+x*cs+z*sn,y+bob,p.z-x*sn+z*cs,sx,sy,sz,c,rx,angle,rz);
  part('body',0,look.y,0,look.w,look.h,look.w*.88,base);
  if(kind==='rbc'){part('rim',0,.51,0,.25,.25,.25,look.hat,Math.PI/2);part('cap',0,.485,0,.18,.035,.16,0xc65b67);}
  else if(kind==='platelet'){part('cap',0,.36,0,.23,.055,.21,look.hat);part('box',0,.38,.01,.23,.035,.07,0xfff4da);part('box',0,.382,.01,.07,.035,.23,0xfff4da);}
  else part('cap',0,look.y+look.h*.86,0,look.w*1.05,kind==='fibroblast'?.16:.12,look.w,look.hat);
  for(const side of [-1,1]){
   part('eyes',side*.09,look.face,look.w*.83,.034,.045,.027,0x41464c);
   part('feet',side*look.w*.48,.075,moving?Math.sin(stride+side)*.075:0,.09,.065,.12,0x826f61);
   part('hands',side*(look.w+.025),look.y+(working?beat*.045:0),working?.13:.015,.067,.09,.07,base);
  }
  if(kind==='neutrophil'){
   part('box',0,.64,.245,.2,.055,.035,0x91b3af);part('badge',0,.34,.25,.055,.06,.035,0x839da8);
   part('box',.32,.39,.2,.10,.12,.4,drug?.color||0xaac6ad);part('rod',.32,.4,.43,.047,.12,.047,0x697d83,Math.PI/2);
  }else if(kind==='macrophage'){
   part('box',0,.32,.33,.43,.3,.045,0xf4dfbb);part('box',0,.37,-.35,.43,.4,.28,0x8c779d);
   part('rim',.4,.42,.13,.11,.11,.11,0xb3a7bd,Math.PI/2);if(task==='잔해 청소')part('pod',.35,.43+beat*.07,.17,.12,.12,.12,0xa3929e);
  }else if(kind==='fibroblast'){
   part('box',0,.23,.22,.39,.09,.05,0x927655);part('box',-.3,.3,.07,.22,.23,.19,0xc49455);
   part('rod',.3,.48,.1,.035,.32,.035,0x8d745a,beat*.55);part('box',.3,.67,.1,.25,.12,.12,0x95a3a0,beat*.55);
  }else if(kind==='dendritic'){
   for(const side of [-1,1]){part('rod',side*.21,.78,-.02,.025,.34,.025,0x75936c,0,side*-.7);part('pod',side*.32,.9,-.02,.1,.12,.06,0xb5cd8c);}
   part('box',0,.35,-.25,.3,.33,.24,0xadbd86);part('pod',.29,.4,.12,.09,.14,.09,loaded?0xd9c792:0xd0dfb5);
  }else if(kind==='helperT'){
   part('box',0,.48,-.19,.45,.37,.045,0x6f97ad);part('rod',.31,.67,.01,.025,.62,.025,0xa48d69);
   part('box',.44,.88,.01,.27,.19,.025,loaded?0xe4c779:0x91c5c6);part('badge',0,.64,.22,.07,.06,.03,0xe7cb86);
  }else if(kind==='plasma'){
   part('box',0,.31,.28,.43,.28,.04,0xf7e8d3);part('pod',0,.43,-.29,.21,.28,.17,0x91c5c6);
   part('rod',.34,.46+beat*.05,.13,.055,.23,.055,loaded?0xc4d6a1:0xb0bfc8);part('rim',0,.69,-.29,.1,.1,.1,0xc6b1d8,Math.PI/2);
  }else if(kind==='platelet'){
   part('box',0,.23,.25,.3,.09,.2,0xf3e7c8);part('box',0,.28,.25,.2,.018,.05,0xc88f68);
   if(working)part('rod',.24,.18,.3,.025,.25,.025,0xe3c996,Math.PI/2,beat*.25);
  }
  if(loaded&&kind==='rbc'){part('pod',0,.34,-.27,.17,.23,.16,0xa5dfd4);part('rim',0,.34,-.27,.18,.18,.18,0x83b5b6,Math.PI/2);}
  if(kind==='courier')part('box',0,.35,-.25,.27,.29,.2,0xc9a375);
  if(selected)put('selected',p.x,.07,p.z,1,1,1,0xe5b854,Math.PI/2);
 }
 const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),direction=new T.Vector3();
 function draw(s,{selectedKind,selectedCell}={}){
  for(const m of Object.values(batches))m.count=0;positions.length=0;const living=new Set(),drug=DRUGS.find(d=>d.id===s.drug);
  for(const c of s.cells.slice(0,profile.maxCells)){const p=groundPoint(c);positions.push({id:c.id,...p,cell:c});living.add(c.id);worker(p,c.kind,c.id,s.time,!!(c.cargo||c.recordId),selectedKind===c.kind||selectedCell===c.id,c.task,drug);}
  for(const sh of s.shipments.slice(0,profile.maxShipments)){
   const p=groundPoint(sh),id='shipment'+sh.id;living.add(id);worker({x:p.x,z:p.z+.48},'courier',id,s.time,true,false,'배송');
   const c=sh.kind==='drug'?0xb6c59a:sh.kind==='materials'?0xc59e68:0xe1ba78;
   put('box',p.x,.24,p.z,.52,.33,.62,c);put('box',p.x,.54,p.z,.35,.28,.4,c);
   for(const side of [-1,1])put('rod',p.x+side*.31,.16,p.z,.15,.08,.15,0x806c59,0,0,Math.PI/2);
  }
  for(const e of s.enemies.filter(e=>!e.dead).slice(0,profile.maxEnemies)){
   const p=groundPoint(e);put('enemy',p.x,.35,p.z,.38,.35,.37,e.color);
   for(let n=0;n<4;n++){const angle=n*Math.PI/2;put('spikes',p.x+Math.cos(angle)*.3,.62,p.z+Math.sin(angle)*.3,.09,.3,.09,e.color,0,0,Math.cos(angle)*.5);}
   for(const side of [-1,1])put('enemyEyes',p.x+side*.12,.42,p.z+.32,.04,.05,.03,0x41464c);
  }
  for(const e of s.debris.slice(0,80)){const p=groundPoint(e);put('debris',p.x,.09,p.z,.14,.08,.12,0xa3929e);}
  for(const fx of s.effects.slice(0,64)){const from=groundPoint(fx),to=groundPoint({x:fx.tx,y:fx.ty});a.set(from.x,.5,from.z);b.set(to.x,.5,to.z);direction.subVectors(b,a);const length=direction.length();if(!length)continue;dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.normalize());dummy.scale.set(.035,length,.035);dummy.updateMatrix();const m=batches.beam,n=m.count++;m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(fx.color));}
  for(const id of last.keys())if(!living.has(id))last.delete(id);
  for(const m of Object.values(batches)){
   m.instanceMatrix.clearUpdateRanges();m.instanceMatrix.addUpdateRange(0,m.count*16);m.instanceMatrix.needsUpdate=m.count>0;
   if(m.instanceColor){m.instanceColor.clearUpdateRanges();m.instanceColor.addUpdateRange(0,m.count*3);m.instanceColor.needsUpdate=m.count>0;}
  }
 }
 return {root,positions,draw};
}
