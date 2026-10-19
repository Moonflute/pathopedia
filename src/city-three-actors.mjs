import * as T from './vendor/three/three.module.min.js';
import {groundPoint} from './city-three-layout.mjs';
import {CELL_JOBS,DRUGS} from './city-data.mjs';
import {activeActivity,activityProgress} from './city-activity.mjs';

// Shared, rigid parts: eight silhouettes and all work effects still use 16
// batches, without skeletons, particle objects, lights or per-cell DOM.
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
 const body=new T.SphereGeometry(1,profile.mobile?10:12,profile.mobile?7:8),hat=new T.SphereGeometry(1,profile.mobile?8:10,profile.mobile?5:6),small=new T.SphereGeometry(1,6,4),box=new T.BoxGeometry(1,1,1),rod=new T.CylinderGeometry(1,1,1,6),rim=new T.TorusGeometry(1,.13,4,12);
 function batch(id,geometry,limit=capacity,shadow=true,unlit=false){const m=new T.InstancedMesh(geometry,unlit?flat:standard,limit);m.name=id;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=!unlit;root.add(m);batches[id]=m;}
 batch('body',body);batch('cap',hat);batch('eyes',small,capacity*2,false);batch('feet',small,capacity*2);batch('hands',small,capacity*2,false);
 batch('box',box,capacity*5);batch('pod',small,capacity*5,false);batch('rod',rod,capacity*5,false);batch('rim',rim,capacity*2,false);batch('badge',new T.IcosahedronGeometry(1,0),capacity*4,false);
 batch('enemy',new T.IcosahedronGeometry(1,1),profile.maxEnemies);batch('spikes',new T.ConeGeometry(1,1,5),profile.maxEnemies*4);batch('enemyEyes',small,profile.maxEnemies*2,false);
 batch('debris',new T.IcosahedronGeometry(1,0),80,false);batch('selected',new T.TorusGeometry(.43,.035,4,18),capacity*2,false,true);batch('beam',rod,128,false,true);
 function put(id,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0){const m=batches[id],n=m.count;if(n>=m.instanceMatrix.count)return;dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz,'YXZ');dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(c));m.count++;}
 const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),direction=new T.Vector3();
 function line(x,y,z,tx,ty,tz,r,c){
  a.set(x,y,z);b.set(tx,ty,tz);direction.subVectors(b,a);const length=direction.length(),m=batches.beam,n=m.count;
  if(length<.001||n>=m.instanceMatrix.count)return;
  dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.normalize());dummy.scale.set(r,length,r);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(c));m.count++;
 }
 function antibody(x,y,z,size){
  line(x,y-.15*size,z,x,y+.08*size,z,.045*size,0xf6cf78);
  for(const side of [-1,1])line(x,y+.08*size,z,x+side*.16*size,y+.27*size,z,.045*size,0xf6cf78);
 }
 function worker(unit,kind,id,t,selected,drug,readability){
  const p=groundPoint(unit),look=CELL_STYLES[kind]||CELL_STYLES.courier,phase=typeof id==='number'?id:Number(id.replace('shipment',''));
  const prev=last.get(id),distance=prev?Math.hypot(p.x-prev.x,p.z-prev.z):0,movedAt=distance>.00001?t:prev?.movedAt??-1,moving=t-movedAt<.12;
  const act=activeActivity(unit,t),progress=activityProgress(act,t),at=act?groundPoint(act):null,doing=act?.kind;
  let angle=prev?.angle??.5;
  if(distance>.00001)angle=Math.atan2(p.x-prev.x,p.z-prev.z);
  else if(at&&Math.hypot(at.x-p.x,at.z-p.z)>.01)angle=Math.atan2(at.x-p.x,at.z-p.z);
  last.set(id,{x:p.x,z:p.z,angle,movedAt});
  const transfer=doing==='load'||doing==='unload',hammering=['build','repair','fabricate'].includes(doing),firing=doing==='shoot',engulf=doing==='engulf',producing=doing==='produce';
  const beat=Math.sin(progress*Math.PI),strike=hammering?(progress<.48?progress/.48:progress<.68?1-(progress-.48)/.2:0):0;
  const recoil=firing?Math.pow(1-progress,3):0,reach=engulf?Math.sin(Math.PI*progress):doing==='collect'?beat*.65:0;
  const stride=t*(kind==='macrophage'?8:kind==='platelet'?14:11)+phase;
  const waiting=!!unit.waitReason&&!moving;
  const bob=act?-beat*(hammering?.04:.018):moving?Math.abs(Math.sin(stride))*.055:Math.sin(t*(waiting?3:2)+phase)*(waiting?.025:.012);
  const base=CELL_JOBS[kind]?.color||'#d7bb8b',cs=Math.cos(angle),sn=Math.sin(angle),shift=engulf?reach*.23:firing?-recoil*.1:0;
  const part=(id,x,y,z,sx,sy,sz,c,rx=0,rz=0)=>put(id,p.x+x*cs+(z+shift)*sn,y+bob,p.z-x*sn+(z+shift)*cs,sx,sy,sz,c,rx,angle,rz);
  part('body',0,look.y,0,look.w*(1+reach*.12),look.h*(1-reach*.12),look.w*.88,base);
  if(kind==='rbc'){part('rim',0,.51,0,.25,.25,.25,look.hat,Math.PI/2);part('cap',0,.485,0,.18,.035,.16,0xc65b67);}
  else if(kind==='platelet'){part('cap',0,.36,0,.23,.055,.21,look.hat);part('box',0,.38,.01,.23,.035,.07,0xfff4da);part('box',0,.382,.01,.07,.035,.23,0xfff4da);}
  else part('cap',0,look.y+look.h*.86,0,look.w*1.05,kind==='fibroblast'?.16:.12,look.w,look.hat);
  const hands=[{x:-look.w-.025,y:look.y,z:0},{x:look.w+.025,y:look.y,z:0}];
  for(let i=0;i<2;i++){
   const side=i?1:-1,h=hands[i];
   if(transfer){h.x=side*.23;h.y=.46+beat*.16;h.z=.22+beat*.16;}
   else if(engulf||doing==='collect'){h.x=side*(.35-reach*.15);h.y=.36;h.z=.17+reach*.42;}
   else if(kind==='courier'){h.x=side*.24;h.z=.4;}
   else if(moving)h.z=Math.sin(stride+side)*.09;
   else if(waiting){h.y+=Math.sin(t*2+phase)*.035;h.z=.06;}
   if(i&&hammering){h.y=.48+strike*.2;h.z=.12;}
   if(i&&firing){h.y=.43;h.z=.25-recoil*.13;}
   if(i&&producing){h.y=.45+Math.sin(progress*Math.PI)*.06;h.z=.47+Math.sin(progress*Math.PI*4)*.07;h.x=.08+Math.cos(progress*Math.PI*4)*.09;}
   if(doing==='patch'){h.y=.16;h.z=.29+Math.sin(progress*10)*.07;}
   part('eyes',side*.09,look.face,look.w*.83,.034,.045,.027,0x41464c);
   part('feet',side*look.w*.48,.075,moving?Math.sin(stride+side)*.075:firing?side*.08:0,.09,.065,.12,0x826f61);
   part('hands',h.x,h.y,h.z,.075,.095,.075,base);
  }
  const hand=hands[1];
  if(kind==='neutrophil'){
   part('box',0,.64,.245,.2,.055,.035,0x91b3af);part('badge',0,.34,.25,.055,.06,.035,0x839da8);
   part('box',hand.x,hand.y,hand.z+.15,.12,.14,.43,drug?.color||0xaac6ad);part('rod',hand.x,hand.y,hand.z+.41,.055,.15,.055,0x697d83,Math.PI/2);
   if(firing&&progress<.36)part('badge',hand.x,hand.y,hand.z+.52,.13*(1-progress),.12,.2,0xffd68c);
  }else if(kind==='macrophage'){
   part('box',0,.32,.33,.43,.3,.045,0xf4dfbb);part('box',0,.37,-.35,.43,.4,.28,0x8c779d);
   part('rim',hand.x,hand.y,hand.z+.07,.15,.15,.15,0xb3a7bd,Math.PI/2);
   if(doing==='collect')part('pod',0,.3+beat*.15,.42-reach*.3,.13,.13,.13,0xa3929e);
   if(engulf)part('rim',0,.36,.39+reach*.22,.18+reach*.1,.18+reach*.1,.18,0xf5dfaf);
  }else if(kind==='fibroblast'){
   part('box',0,.23,.22,.39,.09,.05,0x927655);part('box',-.3,.3,.07,.22,.23,.19,0xc49455);
   // The entire hammer rotates around the gripping hand, including its head.
   const pitch=hammering?1.12-strike*1.95:.1,sy=Math.cos(pitch),sz=Math.sin(pitch);
   part('rod',hand.x,hand.y+sy*.17,hand.z+sz*.17,.04,.4,.04,0x8d745a,pitch);
   part('box',hand.x,hand.y+sy*.38,hand.z+sz*.38,.3,.15,.16,0x95a3a0,pitch);
  }else if(kind==='dendritic'){
   for(const side of [-1,1]){part('rod',side*.21,.78,-.02,.025,.34,.025,0x75936c,0,side*-.7);part('pod',side*.32,.9,-.02,.1,.12,.06,0xb5cd8c);}
   part('box',0,.35,-.25,.3,.33,.24,0xadbd86);part('pod',hand.x,hand.y,.12,.09,.14,.09,unit.recordId?0xd9c792:0xd0dfb5);
  }else if(kind==='helperT'){
   const wave=doing==='signal'?Math.sin(progress*16)*.16:0;
   part('box',0,.48,-.19,.45,.37,.045,0x6f97ad);part('rod',.31,.67,.01,.025,.62,.025,0xa48d69,0,wave);
   part('box',.44-wave*.35,.88,.01,.27,.19,.025,unit.recordId||doing==='signal'?0xe4c779:0x91c5c6,0,wave);part('badge',0,.64,.22,.07,.06,.03,0xe7cb86);
  }else if(kind==='plasma'){
   part('box',0,.31,.28,.43,.28,.04,0xf7e8d3);part('pod',0,.43,-.29,.21,.28,.17,0x91c5c6);
   part('rod',hand.x,hand.y+.09,hand.z,.06,.24,.06,producing?0xc4d6a1:0xb0bfc8,producing?.5:0);part('rim',0,.69,-.29,.1,.1,.1,0xc6b1d8,Math.PI/2);
  }else if(kind==='platelet'){
   part('box',0,.23,.25,.3,.09,.2,0xf3e7c8);part('box',0,.28,.25,.2,.018,.05,0xc88f68);
   if(doing==='patch')part('rod',hand.x,hand.y,hand.z,.035,.29,.035,0xe3c996,Math.PI/2,Math.sin(progress*10)*.4);
  }
  if(unit.materialCargo)part('box',-.3,.4,.22,.3,.3,.3,0xcba875);
  if(unit.debrisCargo)for(let i=0;i<unit.debrisCargo;i++)part('pod',-.2+i*.16,.53,-.35,.1,.11,.1,0xa6979f);
  if(unit.bornAt!=null&&t-unit.bornAt<1.2)put('badge',p.x,1+(t-unit.bornAt)*.3,p.z,.08,.14,.08,0xe5d79c);
  if(kind==='rbc'){
   if(transfer){const q=doing==='load'?1-progress:progress,arc=Math.sin(q*Math.PI)*.35;
    put('pod',(p.x-sn*.3)*(1-q)+at.x*q,.39*(1-q)+.69*q+arc,(p.z-cs*.3)*(1-q)+at.z*q,.19,.26,.19,0xa5dfd4);
    put('selected',at.x,.07,at.z,.5+beat*.35,.5+beat*.35,.5+beat*.35,0x84c8cc,Math.PI/2);
   }else if(unit.cargo){part('pod',0,.37,-.3,.19,.26,.18,0xa5dfd4);part('rim',0,.37,-.3,.2,.2,.2,0x83b5b6,Math.PI/2);}
  }
  if(kind==='courier'){
   part('box',0,.35,-.25,.27,.29,.2,0xc9a375);
   const cargoColor=unit.kind==='drug'?0xb6c59a:unit.kind==='materials'?0xc59e68:0xe1ba78;
   part('box',0,.21,.78,.58,.17,.68,0xa68c6d);
   for(const side of [-1,1]){part('rod',side*.32,.16,.78,.17,.09,.17,0x806c59,0,Math.PI/2);part('rod',side*.25,.31,.52,.035,.44,.035,0x947656,Math.PI/2);}
   if(transfer){const q=doing==='load'?1-progress:progress;
    put('box',(p.x+sn*.78)*(1-q)+at.x*q,.47+Math.sin(q*Math.PI)*.42,(p.z+cs*.78)*(1-q)+at.z*q,.38,.34,.42,cargoColor,0,angle);
    put('selected',at.x,.07,at.z,.6+beat*.25,.6+beat*.25,.6+beat*.25,cargoColor,Math.PI/2);
   }else if(unit.phase!=='pickup'&&unit.phase!=='leaving')part('box',0,.47,.78,.4,.34,.44,cargoColor);
  }
  if(hammering&&progress>.62&&progress<.9){const q=(progress-.62)/.28;
   for(const side of [-1,0,1])put('badge',at.x+side*q*.32,.55+Math.sin(q*Math.PI)*.27,at.z+side*.11,.055*readability,.07*readability,.055*readability,0xe9c77e);
  }
  if(producing){
   put('rod',at.x,.49+progress*.08,at.z,.10,.12+progress*.2,.10,0xa8d6c5);
   if(progress>.6)antibody(at.x,.95+(progress-.6)*.6,at.z,readability);
  }
  if(doing==='signal'||doing==='patch')put('selected',p.x,.08,p.z,1+beat*.6,1+beat*.6,1+beat*.6,doing==='signal'?0x85c2cb:0xe3bd82,Math.PI/2);
  if(selected){const scale=selected===2?1.3*readability:1;put('selected',p.x,.07,p.z,scale,scale,scale,selected===2?0x438f92:0xe5b854,Math.PI/2);}
  if(selected===2)put('badge',p.x,1.15,p.z,.08*readability,.14*readability,.08*readability,0x75d1cb);
 }
 function draw(s,{selectedKind,selectedCell,readability=1}={}){
  for(const m of Object.values(batches))m.count=0;positions.length=0;const living=new Set(),drug=DRUGS.find(d=>d.id===s.drug);
  for(const c of s.cells.slice(0,profile.maxCells)){const p=groundPoint(c);positions.push({id:c.id,...p,cell:c});living.add(c.id);worker(c,c.kind,c.id,s.time,selectedCell===c.id?2:selectedKind===c.kind?1:0,drug,readability);}
  for(const sh of s.shipments.slice(0,profile.maxShipments)){const id='shipment'+sh.id,p=groundPoint(sh);positions.push({id,...p,cell:sh});living.add(id);worker(sh,'courier',id,s.time,selectedCell===id?2:0,drug,readability);}
  for(const e of s.enemies.filter(e=>!e.dead).slice(0,profile.maxEnemies)){
   const p=groundPoint(e);put('enemy',p.x,.35,p.z,.38,.35,.37,e.color);
   for(let n=0;n<4;n++){const angle=n*Math.PI/2;put('spikes',p.x+Math.cos(angle)*.3,.62,p.z+Math.sin(angle)*.3,.09,.3,.09,e.color,0,0,Math.cos(angle)*.5);}
   for(const side of [-1,1])put('enemyEyes',p.x+side*.12,.42,p.z+.32,.04,.05,.03,0x41464c);
  }
  for(const e of s.debris.slice(0,80)){const p=groundPoint(e);put('debris',p.x,.09,p.z,.14,.08,.12,0xa3929e);}
  for(const fx of s.effects.slice(0,64)){
   const from=groundPoint(fx),to=groundPoint({x:fx.tx,y:fx.ty}),q=Math.max(0,Math.min(1,1-fx.life/.42));
   if(fx.kind==='engulf'){put('selected',to.x,.18,to.z,.7+q*.4,.7+q*.4,.7+q*.4,fx.color,Math.PI/2);continue;}
   const head=Math.min(1,q*2.4),tail=Math.max(0,head-.24);
   line(from.x+(to.x-from.x)*tail,.48,from.z+(to.z-from.z)*tail,from.x+(to.x-from.x)*head,.48,from.z+(to.z-from.z)*head,.055*readability,fx.color);
   if(q>.42&&q<.85)put('badge',to.x,.5,to.z,.13*readability,.13*readability,.13*readability,fx.color);
  }
  for(const id of last.keys())if(!living.has(id))last.delete(id);
  for(const m of Object.values(batches)){
   m.instanceMatrix.clearUpdateRanges();m.instanceMatrix.addUpdateRange(0,m.count*16);m.instanceMatrix.needsUpdate=m.count>0;
   if(m.instanceColor){m.instanceColor.clearUpdateRanges();m.instanceColor.addUpdateRange(0,m.count*3);m.instanceColor.needsUpdate=m.count>0;}
  }
 }
 return {root,positions,draw};
}
