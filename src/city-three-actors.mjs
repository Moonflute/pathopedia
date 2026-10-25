import * as T from './vendor/three/three.module.min.js';
import {groundPoint} from './city-three-layout.mjs';
import {CELL_JOBS,DRUGS} from './city-data.mjs';
import {activeActivity,activityProgress} from './city-activity.mjs';
import {CITY_STYLE as STYLE} from './city-three-style.mjs';
import {pathogenDef} from './city-pathogens.mjs';
import {compileLayout,siteAt} from './city-tile-layout.mjs';
import {entryTrackHeight} from './city-entry-tracks.mjs';
import {pilotThreatView} from './city-pilot-threats.mjs';
import {residentView,RESIDENT_LIMIT} from './city-residents.mjs';

// Shared, rigid parts: sixteen cell roles and all work effects use 16
// batches, without skeletons, particle objects, lights or per-cell DOM.
export const CELL_STYLES=Object.freeze({
 rbc:{w:.30,h:.21,y:.32,face:.35,hat:0xb55261},
 neutrophil:{w:.28,h:.31,y:.39,face:.44,hat:0xf8f0d7},
 macrophage:{w:.39,h:.36,y:.43,face:.48,hat:0x997db9},
 fibroblast:{w:.25,h:.34,y:.4,face:.45,hat:0xe5b854},
 dendritic:{w:.25,h:.29,y:.37,face:.43,hat:0x789b73},
 eosinophil:{w:.29,h:.31,y:.39,face:.44,hat:0xc47862},
 basophil:{w:.27,h:.30,y:.39,face:.44,hat:0x665b9c},
 monocyte:{w:.33,h:.34,y:.41,face:.46,hat:0x9f8bb2},
 mast:{w:.34,h:.34,y:.41,face:.46,hat:0xad648f},
 nk:{w:.30,h:.32,y:.40,face:.45,hat:0x697ba7},
 bcell:{w:.27,h:.30,y:.38,face:.43,hat:0x629ab5},
 cd8:{w:.28,h:.32,y:.39,face:.44,hat:0x597f6f},
 treg:{w:.27,h:.31,y:.39,face:.44,hat:0x629d85},
 helperT:{w:.25,h:.32,y:.39,face:.44,hat:0x648a9b},
 plasma:{w:.32,h:.33,y:.4,face:.45,hat:0xb5a0cf},
 platelet:{w:.22,h:.16,y:.25,face:.29,hat:0xedcc90},
 courier:{w:.26,h:.3,y:.38,face:.43,hat:0xa48461}
});
export function createActors(profile){
 const root=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),batches={},last=new Map(),positions=[],pickPositions=[];let lastRun=null,lastLayout=null,elevation=0;
 const capacity=profile.maxCells+profile.maxShipments+RESIDENT_LIMIT,standard=new T.MeshStandardMaterial({color:0xffffff,roughness:.9}),flat=new T.MeshBasicMaterial({color:0xffffff});
 const body=new T.SphereGeometry(1,profile.mobile?10:12,profile.mobile?7:8),hat=new T.SphereGeometry(1,profile.mobile?8:10,profile.mobile?5:6),small=new T.SphereGeometry(1,6,4),box=new T.BoxGeometry(1,1,1),rod=new T.CylinderGeometry(1,1,1,6),rim=new T.TorusGeometry(1,.13,4,12);
 function batch(id,geometry,limit=capacity,shadow=true,unlit=false){const m=new T.InstancedMesh(geometry,unlit?flat:standard,limit);m.name=id;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.instanceColor=new T.InstancedBufferAttribute(new Float32Array(limit*3).fill(1),3);m.instanceColor.setUsage(T.DynamicDrawUsage);m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=!unlit;root.add(m);batches[id]=m;}
 batch('body',body);batch('cap',hat);batch('eyes',small,capacity*2,false);batch('feet',small,capacity*2);batch('hands',small,capacity*2,false);
 batch('box',box,capacity*5);batch('pod',small,capacity*8,false);batch('rod',rod,capacity*5,false);batch('rim',rim,capacity*3,false);batch('badge',new T.IcosahedronGeometry(1,0),capacity*7,false);
 batch('enemy',new T.IcosahedronGeometry(1,1),profile.maxEnemies*4);batch('spikes',new T.ConeGeometry(1,1,5),profile.maxEnemies*4);batch('enemyEyes',small,profile.maxEnemies*2,false);
 batch('debris',new T.IcosahedronGeometry(1,0),160,false);batch('selected',new T.TorusGeometry(.43,.035,4,18),capacity*4+profile.maxEnemies*2+160,false,true);batch('beam',rod,capacity*6+profile.maxEnemies*4,false,true);
 function put(id,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0){const m=batches[id],n=m.count;if(n>=m.instanceMatrix.count)return;dummy.position.set(x,y+elevation,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz,'YXZ');dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(c));m.count++;}
 const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),direction=new T.Vector3();
 function line(x,y,z,tx,ty,tz,r,c){
  a.set(x,y+elevation,z);b.set(tx,ty+elevation,tz);direction.subVectors(b,a);const length=direction.length(),m=batches.beam,n=m.count;
  if(length<.001||n>=m.instanceMatrix.count)return;
  dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction.normalize());dummy.scale.set(r,length,r);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(c));m.count++;
 }
 function antibody(x,y,z,size){
  line(x,y-.15*size,z,x,y+.08*size,z,.045*size,0xf6cf78);
  for(const side of [-1,1])line(x,y+.08*size,z,x+side*.16*size,y+.27*size,z,.045*size,0xf6cf78);
 }
 function worker(unit,kind,id,p,t,selected,drug,readability,onWater=false,visualScale=1){
  const look=CELL_STYLES[kind]||CELL_STYLES.courier,phase=typeof id==='number'?id:Number(id.replace('shipment',''));
  const prev=last.get(id),distance=prev?Math.hypot(p.x-prev.x,p.z-prev.z):0,movedAt=distance>.00001?t:prev?.movedAt??-1,moving=t-movedAt<.12;
  const act=activeActivity(unit,t),progress=activityProgress(act,t),at=act?groundPoint(act):null,doing=act?.kind;
  let angle=prev?.angle??.5;
  if(distance>.00001)angle=Math.atan2(p.x-prev.x,p.z-prev.z);
  else if(at&&Math.hypot(at.x-p.x,at.z-p.z)>.01)angle=Math.atan2(at.x-p.x,at.z-p.z);
  last.set(id,{x:p.x,z:p.z,angle,movedAt});
  const transfer=doing==='load'||doing==='unload',hammering=['build','repair','fabricate'].includes(doing),firing=doing==='shoot',engulf=doing==='engulf',striking=doing==='cytotoxic'||doing==='degranulate',producing=doing==='produce';
  const beat=Math.sin(progress*Math.PI),strike=hammering?(progress<.48?progress/.48:progress<.68?1-(progress-.48)/.2:0):0;
  const recoil=firing?Math.pow(1-progress,3):0,reach=engulf||striking?Math.sin(Math.PI*progress):doing==='collect'?beat*.65:0;
  const stride=t*(kind==='macrophage'?8:kind==='platelet'?14:11)+phase;
  const waiting=!!unit.waitReason&&!moving;
  const bob=onWater?-.12+Math.sin(t*2.2+phase)*.025:act?-beat*(hammering?.04:.018):moving?Math.abs(Math.sin(stride))*.055:Math.sin(t*(waiting?3:2)+phase)*(waiting?.025:.012);
  const base=unit.integrity<40?'#bfb9ab':kind==='rbc'?(unit.cargo>0?'#df7363':'#6697bd'):CELL_JOBS[kind]?.color||'#d7bb8b',cs=Math.cos(angle),sn=Math.sin(angle),shift=engulf||striking?reach*.43:firing?-recoil*.17:0;
  const part=(id,x,y,z,sx,sy,sz,c,rx=0,rz=0)=>put(id,p.x+(x*cs+(z+shift)*sn)*visualScale,(y+bob)*visualScale,p.z+(-x*sn+(z+shift)*cs)*visualScale,sx*visualScale,sy*visualScale,sz*visualScale,c,rx,angle,rz);
  const squeezing=unit.trafficStage==='crossing',rolling=unit.trafficStage==='rolling';
  part('body',0,look.y,0,look.w*(squeezing?.68:1+reach*.12),look.h*(squeezing?.72:1-reach*.12),look.w*(squeezing?1.35:.88),base,0,rolling?Math.sin(t*5+phase)*.27:0);
  if(kind==='rbc'){part('rim',0,.51,0,.25,.25,.25,look.hat,Math.PI/2);part('cap',0,.485,0,.18,.035,.16,0xc65b67);}
  else if(kind==='platelet'){part('cap',0,.36,0,.23,.055,.21,look.hat);part('box',0,.38,.01,.23,.035,.07,0xfff4da);part('box',0,.382,.01,.07,.035,.23,0xfff4da);}
  else part('cap',0,look.y+look.h*.86,0,look.w*1.05,kind==='fibroblast'?.16:.12,look.w,look.hat);
  const hands=[{x:-look.w-.025,y:look.y,z:0},{x:look.w+.025,y:look.y,z:0}];
  for(let i=0;i<2;i++){
   const side=i?1:-1,h=hands[i];
   if(transfer){h.x=side*.23;h.y=.46+beat*.16;h.z=.22+beat*.16;}
   else if(engulf||striking||doing==='collect'){h.x=side*(.39-reach*.16);h.y=.4+reach*.13;h.z=.17+reach*.6;}
   else if(kind==='courier'){h.x=side*.24;h.z=.4;}
   else if(moving)h.z=Math.sin((onWater?t*2:stride)+side)*(onWater?.035:.09);
   else if(waiting){h.y+=Math.sin(t*2+phase)*.035;h.z=.06;}
   if(i&&hammering){h.y=.48+strike*.2;h.z=.12;}
   if(i&&firing){h.y=.43;h.z=.25-recoil*.13;}
   if(i&&producing){h.y=.45+Math.sin(progress*Math.PI)*.06;h.z=.47+Math.sin(progress*Math.PI*4)*.07;h.x=.08+Math.cos(progress*Math.PI*4)*.09;}
   if(doing==='patch'){h.y=.16;h.z=.29+Math.sin(progress*10)*.07;}
   part('eyes',side*.09,look.face,look.w*.83,.034,.045,.027,0x41464c);
   if(!onWater)part('feet',side*look.w*.48,.075,moving?Math.sin(stride+side)*.075:firing?side*.08:0,.09,.065,.12,0x826f61);
   part('hands',h.x,h.y,h.z,.075,.095,.075,base);
  }
  const hand=hands[1];
  if(kind==='neutrophil'){
   part('box',0,.64,.245,.2,.055,.035,0x91b3af);part('badge',0,.34,.25,.055,.06,.035,0x839da8);
   if(unit.integrity==null){part('box',hand.x,hand.y,hand.z+.15,.12,.14,.43,drug?.color||0xaac6ad);part('rod',hand.x,hand.y,hand.z+.41,.055,.15,.055,0x697d83,Math.PI/2);}
   else{part('pod',hand.x,hand.y,hand.z+.1,.12,.1,.12,0xcbd7bb);if(engulf)part('rim',0,.36,.39+reach*.22,.18+reach*.1,.18+reach*.1,.18,0xe3dca5);}
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
   const tint={Tfh:0xe4c779,Th1:0x7c91bd,Th2:0xdf997e,Th17:0x98b77d}[unit.lineage]||0xb7d7dd;part('box',-.06,.76,.2,.06,.2,.04,tint);part('box',.05,.76,.2,.06,.2,.04,tint);part('box',0,.75,.2,.2,.05,.04,tint);
  }else if(kind==='eosinophil'||kind==='basophil'||kind==='mast'){
   for(let n=0;n<(kind==='mast'?6:kind==='basophil'?5:4);n++){const a=n*2.399;part('badge',Math.cos(a)*.2,.58+(n%2)*.1,Math.sin(a)*.2,.065,.07,.065,kind==='eosinophil'?0xedb98a:kind==='mast'?0xe2a6bb:0x9a8bce);}
   if(kind==='eosinophil')for(const side of [-1,1])part('pod',side*.12,.68,0,.12,.10,.1,0xa36782);
   if(kind==='mast')part('rim',0,.17,0,.4,.4,.4,0xc289a8,Math.PI/2);
  }else if(kind==='monocyte'){
   part('pod',-.08,.7,.01,.21,.1,.13,0x8c709f);part('pod',.1,.72,.05,.1,.08,.1,0xcbb6d7);part('box',0,.36,.28,.25,.08,.04,0xd8d1e4);
  }else if(kind==='nk'||kind==='cd8'){
   part('box',0,.37,.26,.3,.23,.045,kind==='nk'?0x6579a6:0x527969);
   for(let n=0;n<3;n++)part('badge',-.13+n*.13,.36,.30,.04,.05,.04,0xe3c47f);
   if(kind==='nk')part('badge',0,.75,.01,.17,.17,.17,0xc6cbea);
   else for(const y of [.69,.83])part('rim',0,y,.13,.075,.075,.075,0xe3edc6,Math.PI/2);
  }else if(kind==='bcell'){
   part('rod',0,.77,.02,.025,.22,.025,0xd8e8e7);for(const side of [-1,1])part('rod',side*.06,.88,.02,.025,.17,.025,0xd8e8e7,0,-side*.65);
   part('box',0,.38,.24,.25,.14,.04,0xd8e7ef);
  }else if(kind==='treg'){
   part('rim',0,.78,.02,.17,.17,.17,0xa7d2b5,Math.PI/2);part('box',0,.4,.26,.25,.055,.04,0xe3f3d9);
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
  if(unit.integrity<60){part('box',-.12,.45,.26,.17,.07,.03,0xf4e7d6,0,-.4);}
  if(unit.recovering)put('selected',p.x,.08,p.z,.9,.9,.9,0x86b6b5,Math.PI/2);
  if(unit.alertUntil>t){
   const lift=Math.sin(Math.min(1,(unit.alertUntil-t)/.3)*Math.PI)*.12+Math.abs(Math.sin(t*5+phase))*.06;
   const y=1.25+lift,size=Math.max(1,readability),tint=unit.alertKind==='repair'?0x86e5cb:0xffc44d;
   // A 3D exclamation stays legible at every camera rotation, without text sprites.
   line(p.x,y+.14*size,p.z,p.x,y+.54*size,p.z,.085*size,tint);
   line(p.x,y-.07*size,p.z,p.x,y+.035*size,p.z,.085*size,tint);
   const ripple=(t*.8+phase*.13)%1;
   put('selected',p.x,.06,p.z,.8+ripple,.8+ripple,.8+ripple,tint,Math.PI/2);
  }
  if(selected===2&&unit.energy!=null){put('box',p.x,.92,p.z,.62,.055,.035,0xd8d2c2);put('box',p.x-(100-unit.energy)*.0031,.925,p.z+.025,.62*unit.energy/100,.055,.035,0x8db8a0);}
  if(kind==='rbc'){
   if(transfer){const q=doing==='load'?1-progress:progress,arc=Math.sin(q*Math.PI)*.35;
    put('pod',(p.x-sn*.3)*(1-q)+at.x*q,.39*(1-q)+.69*q+arc,(p.z-cs*.3)*(1-q)+at.z*q,.19,.26,.19,0xa5dfd4);
    put('selected',at.x,.07,at.z,.5+beat*.35,.5+beat*.35,.5+beat*.35,0x84c8cc,Math.PI/2);
   }else if(unit.cargo){part('pod',0,.37,-.3,.19,.26,.18,0xa5dfd4);part('rim',0,.37,-.3,.2,.2,.2,0x83b5b6,Math.PI/2);}
  }
  if(kind==='courier'){
   part('box',0,.35,-.25,.27,.29,.2,0xc9a375);
   const cargoColor=unit.kind==='drug'?0xb6c59a:unit.kind==='materials'?0xc59e68:0xe1ba78;
   if(onWater){
    part('pod',0,.04,.37,.43,.18,1.15,0x6c6255);part('box',0,.15,.4,.62,.08,1.5,0xc2a67b);
    for(const side of [-1,1])part('rod',side*.34,.19,.4,.045,1.38,.045,0x926e52,Math.PI/2);
   }else{
    part('box',0,.21,.78,.58,.17,.68,0xa68c6d);
    for(const side of [-1,1]){part('rod',side*.32,.16,.78,.17,.09,.17,0x806c59,0,Math.PI/2);part('rod',side*.25,.31,.52,.035,.44,.035,0x947656,Math.PI/2);}
   }
   if(transfer){const q=doing==='load'?1-progress:progress;
    put('box',(p.x+sn*.78)*(1-q)+at.x*q,.47+Math.sin(q*Math.PI)*.42,(p.z+cs*.78)*(1-q)+at.z*q,.38,.34,.42,cargoColor,0,angle);
    put('selected',at.x,.07,at.z,.6+beat*.25,.6+beat*.25,.6+beat*.25,cargoColor,Math.PI/2);
   }else if(unit.phase!=='pickup'&&unit.phase!=='leaving')part('box',0,.47,.78,.4,.34,.44,cargoColor);
  }
  if(hammering&&progress>.62&&progress<.9){const q=(progress-.62)/.28;
   for(const side of [-1,0,1])put('badge',at.x+side*q*.32,.55+Math.sin(q*Math.PI)*.27,at.z+side*.11,.055*readability,.07*readability,.055*readability,0xe9c77e);
  }
  if(at&&STYLE.activity[doing]){
   const tint=STYLE.activity[doing],radius=.45*readability;
   put('selected',p.x,.055,p.z,readability,readability,readability,tint,Math.PI/2);
   put('badge',at.x+Math.cos(progress*Math.PI*2)*radius,.13,at.z+Math.sin(progress*Math.PI*2)*radius,.07*readability,.06,.07*readability,tint);
  }
  if(producing){
   put('rod',at.x,.49+progress*.08,at.z,.10,.12+progress*.2,.10,0xa8d6c5);
   if(progress>.6)antibody(at.x,.95+(progress-.6)*.6,at.z,readability);
  }
  if(unit.memory)part('badge',-.25,.81,-.1,.07,.1,.07,0xe5cc80);
  if(doing==='present'||doing==='prime'){for(const side of [-1,1])put('box',p.x+side*.13,.96+beat*.09,p.z,.12,.13,.045,doing==='present'?0xb8cd89:0x8fc9d0);}
  if(doing==='degranulate'&&at){for(let n=0;n<5;n++){const q=Math.min(1,progress*1.4),spread=(n-2)*.12;put('badge',p.x+(at.x-p.x)*q+spread,.5+Math.sin(q*Math.PI)*.5,p.z+(at.z-p.z)*q-spread,.065,.08,.065,0xe3a597);}}
  if(doing==='cytotoxic'&&at){line(p.x,.5,p.z,at.x,.3,at.z,.05,0x9299d3);put('selected',at.x,.11,at.z,.75+beat*.45,.75+beat*.45,.75+beat*.45,0xc190c2,Math.PI/2);}
  if((engulf||striking)&&at){
   put('selected',p.x+sn*.55,.45,p.z+cs*.55,1.1+reach*.65,1.1+reach*.65,1.1+reach*.65,engulf?0xffde8c:0xb6b7ef,Math.PI/2,angle);
   if(progress>.42&&progress<.8){const q=(progress-.42)/.38;for(let n=0;n<4;n++){const a=n*Math.PI/2+angle,r=.2+q*.55;line(at.x+Math.cos(a)*r,.4+q*.45,at.z+Math.sin(a)*r,at.x+Math.cos(a)*(r+.22),.55+q*.45,at.z+Math.sin(a)*(r+.22),.045,0xffe2a0);}}
  }
  if(doing==='regulate'){const r=.9+progress;put('selected',p.x,.1,p.z,r,r,r,0x87d6b6,Math.PI/2);}
  if(doing==='signal'||doing==='patch')put('selected',p.x,.08,p.z,1+beat*.6,1+beat*.6,1+beat*.6,doing==='signal'?0x85c2cb:0xe3bd82,Math.PI/2);
  if(onWater&&moving)put('selected',p.x-sn*.18,-.135,p.z-cs*.18,kind==='courier'?1.2:.85,.65,kind==='courier'?1.2:.85,0xa8d8cf,Math.PI/2);
  if(selected){const scale=selected===2?1.3*readability:1;put('selected',p.x,.07,p.z,scale,scale,scale,selected===2?0x438f92:0xe5b854,Math.PI/2);}
  if(selected===2)put('badge',p.x,1.15,p.z,.08*readability,.14*readability,.08*readability,0x75d1cb);
 }
 function resident(c,time,selected){
  const p=c.point,dead=c.dead,work=c.phase>=6&&c.phase<18,sick=c.health<35||c.infected,hit=time-c.hitAt<.7,bob=dead?0:Math.sin(time*(work?5:2)+c.variant)*.025,tint=hit?0xe3a09a:sick?0xb4a0ad:c.color;
  put('body',p.x,dead?.12:.38+bob,p.z,dead?.43:.3,dead?.1:.31,.29,tint,0,0,hit?Math.sin(time*30)*.12:0);
  if(dead){put('selected',p.x,.04,p.z,.8,.8,.8,0xb99c9a,Math.PI/2);return;}
  put('cap',p.x,.64+bob,p.z,.16,.1,.17,c.variant%2?0x8daaa0:0xd2c3a1);
  for(const side of [-1,1]){
   put('eyes',p.x+side*.09,.43+bob,p.z+.255,.032,sick?.025:.043,.025,0x46594f);
   put('feet',p.x+side*.15,.07,p.z+(!work?Math.sin(time*8+c.variant+side)*.06:0),.09,.06,.12,0x948677);
   put('hands',p.x+side*(work?.24:.33),.35+bob+(work?Math.sin(time*4+c.variant)*.1:0),p.z+(work?.25:0),.075,.09,.075,tint);
  }
  if(work){const action=c.variant%5;if(action===0)put('box',p.x,.4,p.z+.4,.2,.12,.18,0xb99b67);else if(action===1)put('pod',p.x,.48,p.z+.33,.1,.13,.1,0xc8bc78);else if(action===3)put('rod',p.x+.27,.3,p.z+.27,.035,.5,.035,0x9a8970,0,0,Math.sin(time*3)*.25);else if(action===4)put('badge',p.x,.45,p.z+.38,.14,.12,.07,0x99b9ad);}
  if(sick||selected)put('selected',p.x,.06,p.z,.9,.9,.9,sick?0xcf8e89:0x6abbb0,Math.PI/2);
 }
 function freight(sh,p,time,selected,onWater){
  const tint=sh.kind==='drug'?0xb0c7b1:sh.kind==='materials'?0xbea47d:0xe3c27c,y=onWater?-.02+Math.sin(time*2+sh.id)*.04:.24;
  if(sh.kind==='materials'||sh.kind==='drug'){put('box',p.x,y+.12,p.z,.35,.25,.38,tint);put('box',p.x,y+.13,p.z,.08,.27,.4,0xf2e6c8);}
  else for(let n=0;n<3;n++)put('pod',p.x+Math.cos(n*2.1+time*.4)*.17,y+.12+Math.sin(time+n)*.03,p.z+Math.sin(n*2.1+time*.4)*.17,.12,.13,.12,tint);
  if(selected)put('selected',p.x,.06,p.z,.9,.9,.9,0x72b7a7,Math.PI/2);
 }
 function draw(s,{selectedKind,selectedCell,hiddenCell,eyePosition,readability=1,motion,visible,canals}={}){
  if(lastRun!==s||lastLayout!==s.layout){last.clear();lastRun=s;lastLayout=s.layout;}
  const point=(unit,id)=>motion?motion.point(unit,id):groundPoint(unit),time=motion?motion.time:s.time,entries=s.layout?compileLayout(s.layout).entries:{};elevation=0;
  for(const m of Object.values(batches))m.count=0;positions.length=0;pickPositions.length=0;const living=new Set(),drug=DRUGS.find(d=>d.id===s.drug);
  for(const c of s.cells.slice(0,profile.maxCells)){if(c.id===hiddenCell)continue;const p=point(c,c.id);const proximity=eyePosition?Math.hypot(p.x-eyePosition.x,p.z-eyePosition.z,(eyePosition.y??.58)-.45):Infinity,scale=Math.min(1,Math.max(0,(proximity-.65)/1.15));if(scale<.04||visible&&!visible(p))continue;positions.push({id:c.id,...p,cell:c});living.add(c.id);worker(c,c.kind,c.id,p,time,selectedCell===c.id?2:selectedKind===c.kind?1:0,drug,readability,canals?.isWater(p),scale); }
  for(const sh of s.shipments.slice(0,profile.maxShipments)){if(sh.harbourUntil>s.time)continue;const id='shipment'+sh.id,p=point(sh,id);if(visible&&!visible(p))continue;elevation=!canals&&sh.kind==='raw'?entryTrackHeight(entries.gut,p):0;positions.push({id,...p,height:elevation+.3,cell:sh});living.add(id);freight(sh,p,time,selectedCell===id,!!canals?.isWater(p));}
  elevation=0;
  for(const c of residentView(s)){if(visible&&!visible(c.point))continue;pickPositions.push({id:c.id,...c.point,cell:c});resident(c,time,selectedCell===c.id||selectedKind==='somatic');}
  for(const e of s.enemies.filter(e=>!e.dead).slice(0,profile.maxEnemies)){
   const id='enemy'+e.id,p=point(e,id),prev=last.get(id);living.add(id);elevation=!canals&&!e.entered?entryTrackHeight(entries[e.front],p):0;
   if(!visible||visible(p))pickPositions.push({id,...p,height:elevation+.5,cell:e});
   const target=e.action==='attack'&&e.attackX!=null?groundPoint({x:e.attackX,y:e.attackY}):null;
   const moved=prev&&Math.hypot(p.x-prev.x,p.z-prev.z)>.00001;
   const angle=moved?Math.atan2(p.x-prev.x,p.z-prev.z):target&&Math.hypot(target.x-p.x,target.z-p.z)>.001?Math.atan2(target.x-p.x,target.z-p.z):prev?.angle??0;
   last.set(id,{x:p.x,z:p.z,angle});if(visible&&!visible(p))continue;
   const threat=pilotThreatView(e),winding=threat?.windup>time,def=pathogenDef(e.recordId),shape=def?.shape,bacillus=shape==='rod'||shape==='shortRod',hit=Math.max(0,(e.hitUntil||0)-time)/.28,color=winding?0xffbb77:hit>.4?0xffd49b:e.color||def?.color||'#bc856f',cs=Math.cos(angle),sn=Math.sin(angle),attacking=e.action==='attack'||e.action==='breach';
   const phase=(time*1.8+e.id*.17)%1,lunge=attacking?Math.max(0,Math.sin((phase-.2)*Math.PI*2))*.35:0,shake=hit*Math.sin(time*55+e.id)*.09,scale=1.24;
   const part=(id,x,y,z,sx,sy,sz,c,rz=0)=>put(id,p.x+(x*cs+(z+lunge)*sn)*scale+shake,(y+Math.sin(phase*Math.PI)*lunge*.35)*scale,p.z+(-x*sn+(z+lunge)*cs)*scale-shake,sx*scale,sy*scale,sz*scale,c,0,angle,rz+(attacking?Math.sin(phase*Math.PI*2)*.12:0));
   const pulse=['attack','colonize'].includes(e.action)?1+Math.sin(time*9+e.id)*.12:1,depth=bacillus?(shape==='shortRod'?.43:.57):.36;
   part('enemy',0,.35,0,(bacillus?.27:.36)*pulse,bacillus?.25:.34,depth,color);
   if(['cluster','chain','pair'].includes(shape))for(let n=0;n<(shape==='cluster'?3:shape==='chain'?3:1);n++){
    const a=shape==='cluster'?n*Math.PI*2/3:0,offset=shape==='cluster'?.24:(n+1)*.18;
    part('enemy',Math.cos(a)*offset,.34+(n%2)*.1,Math.sin(a)*offset,.24,.23,.24,color);
   }
   for(let n=0;n<4;n++){const a=n*Math.PI/2;part('spikes',Math.cos(a)*.3,.62,Math.sin(a)*depth*.85,.09,.3,.09,color,Math.cos(a)*.5);}
   for(const side of [-1,1])part('enemyEyes',side*.115,.42,depth*.91,.04,.05,.03,0x41464c);
   if(attacking)for(const side of [-1,1])line(p.x+sn*.25+cs*side*.1,.65,p.z+cs*.25-sn*side*.1,p.x+sn*.25+cs*side*.23,.7,p.z+cs*.25-sn*side*.23,.035,0x584744);
   if(def?.capsule)put('selected',p.x,.22,p.z,1.2,1.2,1.2,e.opsonized>.08?0xf1d58e:0xb5cbd3,Math.PI/2);
   if(e.action==='approach'&&e.entered&&e.attackX!=null){
    const target=groundPoint({x:e.attackX,y:e.attackY}),q=(time*.8+e.id*.13)%1;
    put('selected',target.x,.07,target.z,1.1,1.1,1.1,0xe5a373,Math.PI/2);
    for(let n=0;n<2;n++){const progress=(q+n*.5)%1;put('badge',p.x+(target.x-p.x)*progress,.2,p.z+(target.z-p.z)*progress,.07,.09,.07,0xe5a373);}
   }
   if(e.action==='attack'&&e.attackX!=null){
    const target=groundPoint({x:e.attackX,y:e.attackY}),q=(time*2+e.id*.17)%1;
    const tint=def?.toxin?0xbe8ee5:def?.anaerobic?0xff9f55:0xff7654;
    line(p.x+(target.x-p.x)*q,.38,p.z+(target.z-p.z)*q,p.x+(target.x-p.x)*Math.min(1,q+.3),.2,p.z+(target.z-p.z)*Math.min(1,q+.3),.075*readability,tint);
    put('selected',target.x,.11,target.z,(.7+q*.7)*readability,(.7+q*.7)*readability,(.7+q*.7)*readability,tint,Math.PI/2);
    put('badge',target.x,.3+Math.sin(q*Math.PI)*.35,target.z,.13*readability,.22*readability,.13*readability,tint);
   }
   if(e.opsonized>.08){antibody(p.x,.95,p.z,.55+e.opsonized*.25);put('selected',p.x,.09,p.z,.85,.85,.85,0xdac686,Math.PI/2);}
   if(e.action==='attack'){put('box',p.x,1.25,p.z,.9,.1,.1,0x674c49);put('box',p.x,1.27,p.z,.9*Math.max(0,Math.min(1,e.hp/(e.maxHp||e.hp||1))),.13,.12,0xf08461);}
  }
  elevation=0;
  if(s.immunity){
   for(const c of s.cells.filter(c=>c.kind==='dendritic'&&c.immuneState==='migrating')){
    const p=point(c,c.id),path=c.path?.slice(c.step,c.step+8).map(groundPoint)||[];
    put('badge',p.x,1.4,p.z,.22,.3,.22,0xffd678);
    for(let n=0;n<path.length;n++){const a=n?path[n-1]:p,b=path[n],q=(time*.8+n*.17)%1;put('badge',a.x+(b.x-a.x)*q,.2,a.z+(b.z-a.z)*q,.12,.09,.12,0xffd678);}
   }
   for(const [id,state] of Object.entries(s.immunity.sites))if(state.danger>2){const p=siteAt(s.layout,id),r=4+(time*.7)%2;put('selected',p.x,.1,p.z,r,r,r,0xee9c62,Math.PI/2);}
   for(const h of s.immunity.infected){const p=groundPoint(h);if(visible&&!visible(p))continue;pickPositions.push({id:'host'+h.id,...p,cell:h});const pulse=1+Math.sin(time*3+h.id)*.08;put('pod',p.x,.24,p.z,.45*pulse,.27,.4*pulse,0xb88ba6);put('rim',p.x,.52,p.z,.16,.16,.16,h.mhcI<.5?0xda9d67:0x7fc6db,Math.PI/2);put('selected',p.x,.075,p.z,1.15,1.15,1.15,0xd88b89,Math.PI/2);for(let n=0;n<3;n++)put('badge',p.x+Math.cos(n*2.1)*.2,.35,p.z+Math.sin(n*2.1)*.2,.06,.08,.06,0x9170b0);}
   for(const w of s.immunity.parasites){const p=groundPoint(w);if(visible&&!visible(p))continue;pickPositions.push({id:'parasite'+w.id,...p,cell:w});for(let n=0;n<6;n++)put('pod',p.x+(n-2.5)*.23,.16,p.z+Math.sin(time*2+n*.9)*.15,.19,.16,.17,n%2?0xd4b48b:0xb79a72);put('selected',p.x,.06,p.z,1.8,1.8,1.8,0xd8b782,Math.PI/2);}
   for(const e of s.immunity.exposures){const p=groundPoint(e);if(visible&&!visible(p))continue;for(let n=0;n<6;n++){const a=time*.7+n*Math.PI/3;put('badge',p.x+Math.cos(a)*.65,.5+Math.sin(time*2+n)*.2,p.z+Math.sin(a)*.65,.12,.13,.12,0xe3c48a);}}
   for(const net of s.immunity.nets){const p=groundPoint(net);if(visible&&!visible(p))continue;for(let n=0;n<4;n++){const a=n*Math.PI/4;line(p.x-Math.cos(a)*.85,.07,p.z-Math.sin(a)*.85,p.x+Math.cos(a)*.85,.07,p.z+Math.sin(a)*.85,.025,0xe5deb9);}put('selected',p.x,.07,p.z,1.5,1.5,1.5,0xe5deb9,Math.PI/2);}
  }
  for(const v of s.physiology?.virions||[]){const p=groundPoint(v);if(!visible||visible(p))pickPositions.push({id:'virus'+v.id,...p,height:(!canals&&!v.entered?entryTrackHeight(entries[v.front],p):0)+.5,cell:v});}
  for(const e of s.debris.slice(0,80)){const p=groundPoint(e);if(visible&&!visible(p))continue;put('debris',p.x,.11,p.z,e.cellKind?.3:.22,.14,.22,e.cellKind?0xc6bba8:0xa3929e);put('debris',p.x+.2,.08,p.z-.15,.13,.08,.12,0x766a66);}
  for(const fx of s.effects.slice(0,64)){
   const from=groundPoint(fx),to=groundPoint({x:fx.tx,y:fx.ty}),q=Math.max(0,Math.min(1,1-fx.life/.42));
   if(fx.kind==='engulf'){put('selected',to.x,.18,to.z,.7+q*.4,.7+q*.4,.7+q*.4,fx.color,Math.PI/2);continue;}
   const head=Math.min(1,q*2.4),tail=Math.max(0,head-.24);
   line(from.x+(to.x-from.x)*tail,.48,from.z+(to.z-from.z)*tail,from.x+(to.x-from.x)*head,.48,from.z+(to.z-from.z)*head,.055*readability,fx.color);
   if(q>.42&&q<.85)put('badge',to.x,.5,to.z,.13*readability,.13*readability,.13*readability,fx.color);
  }
  if(typeof selectedCell==='string'&&/^(enemy|virus|host|parasite)/.test(selectedCell)){const chosen=pickPositions.find(p=>p.id===selectedCell);if(chosen){const y=(chosen.height??.5)-.43;put('selected',chosen.x,y,chosen.z,1.3,1.3,1.3,0x64d1c0,Math.PI/2);put('badge',chosen.x,y+1.2,chosen.z,.11,.2,.11,0x64d1c0);}}
  for(const id of last.keys())if(!living.has(id))last.delete(id);
  for(const m of Object.values(batches)){
   m.instanceMatrix.clearUpdateRanges();m.instanceMatrix.addUpdateRange(0,m.count*16);m.instanceMatrix.needsUpdate=m.count>0;
   if(m.instanceColor){m.instanceColor.clearUpdateRanges();m.instanceColor.addUpdateRange(0,m.count*3);m.instanceColor.needsUpdate=m.count>0;}
  }
 }
 return {root,positions,pickPositions,draw};
}
