import {CITY_ENTRIES} from './city-world.mjs';
import {transformPoint,compileLayout} from './city-tile-layout.mjs';
import * as T from './vendor/three/three.module.min.js';
import {SITES,groundPoint} from './city-three-layout.mjs';
import {WALLS,FRONTS,WORKSHOP,TISSUES} from './city-frontier-data.mjs';
import {wallMaximum} from './city-frontier.mjs';
import {workStation} from './city-activity.mjs';
import {workplaceCapacity,facilityState} from './city-workplaces.mjs';
import {infectionLoad} from './city-biology.mjs';
import {CITY_ROADS} from './city-three-layout.mjs';
import {CITY_STYLE as STYLE} from './city-three-style.mjs';
import {output} from './city-engine.mjs';

const STATUS_LAMPS={heart:[3,1.3],lung:[1.7,3],gut:[-2,1.5],kidney:[-2,1.5],marrow:[1.8,-2.4],lymph:[2.8,1.5]};
const flowRoutes=new WeakMap();
export function entryFlowPoint(points,progress){
 if(!points?.length)return null;if(points.length===1)return {...points[0],dx:0,dz:1};
 let cached=flowRoutes.get(points);
 if(!cached){const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));cached={lengths,total:lengths.at(-1)};flowRoutes.set(points,cached);}
 const d=Math.max(0,Math.min(1,progress))*cached.total;let lo=1,hi=points.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(cached.lengths[mid]<d)lo=mid+1;else hi=mid;}
 const a=points[lo-1],b=points[lo],length=cached.lengths[lo]-cached.lengths[lo-1]||1,q=(d-cached.lengths[lo-1])/length;
 return {x:a.x+(b.x-a.x)*q,z:a.z+(b.z-a.z)*q,dx:(b.x-a.x)/length,dz:(b.z-a.z)/length};
}

// Seven fixed-size pools: structures, modules, stores and tiny effects share
// geometries. No particle emitters, textures, extra lights or scene graph churn.
export function createFrontierScene({detailedWalls=false}={}){
 const root=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),batches={};
 const surface=new T.MeshStandardMaterial({color:0xffffff,roughness:STYLE.roughness}),unlit=new T.MeshBasicMaterial({color:0xffffff});
 function batch(id,geometry,capacity,material=surface,shadow=false){const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=shadow;mesh.receiveShadow=material===surface;mesh.count=0;mesh.name='frontier-'+id;root.add(mesh);batches[id]=mesh;}
 batch('box',new T.BoxGeometry(1,1,1),700,surface,true);batch('post',new T.CylinderGeometry(1,1,1,6),260,surface,true);
 batch('orb',new T.IcosahedronGeometry(1,0),180);batch('roof',new T.ConeGeometry(1,1,4),40,surface,true);
 batch('glow',new T.IcosahedronGeometry(1,0),256,unlit);batch('flame',new T.ConeGeometry(1,1,5),256,unlit);batch('smoke',new T.IcosahedronGeometry(1,0),96);
 let owner=null,layout=null,poseLayout=null,flowRun=null,flowLayout=null,flowTime=0,flowClock=0;
 function put(id,x,y,z,sx,sy,sz,c,ry=0,rz=0){if(owner&&layout){const p=transformPoint(poseLayout,owner,{x,z});x=p.x;z=p.z;ry-=poseLayout.items[owner].rot*Math.PI/2;}const m=batches[id],i=m.count;if(i>=m.instanceMatrix.count)return;dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,ry,rz);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);m.setColorAt(i,color.set(c));m.count++;}
 function worldPut(...args){const was=owner;owner=null;put(...args);owner=was;}
 function store(p,count,c,limit=6){for(let i=0;i<Math.min(limit,Math.ceil(count/4));i++)put('box',p.x+i%3*.36,.17+Math.floor(i/3)*.3,p.z,.29,.28,.3,c);}
 function fire(x,z,t,index,severity=1,base=0){
  put('orb',x,.055,z,1.05*severity,.045,.85*severity,0x5d514d);
  for(let i=0;i<5;i++){
   const q=(t*1.4+i/5+index*.17)%1,a=i*2.4,spread=.5*severity,height=(1.05+Math.sin(q*Math.PI)*1.1)*severity;
   const fx=x+Math.cos(a)*spread,fz=z+Math.sin(a)*spread,y=base+.18+height*.43+q*.25;
   put('flame',fx,y,fz,.3*severity,height,.3*severity,i%2?0xffa23c:0xf46d30,0,Math.sin(t*7+i)*.17);
   put('flame',fx,y-height*.15,fz,.17*severity,height*.62,.17*severity,0xffe6a0,0,Math.sin(t*7+i)*.17);
  }
  for(let i=0;i<3;i++){const q=(t*.45+i/3+index*.21)%1,size=(.32+q*.55)*severity;put('smoke',x+q*.65,base+severity*(1.6+q*2),z+q*.25,size,size*.85,size,i%2?0x777471:0x99918a);}
 }
 function injury(x,z,t,severity=1,base=.25){
  const q=(t*1.7)%1;put('glow',x,base+.1+Math.sin(q*Math.PI)*.35,z,.16*severity,.3*severity,.16*severity,0xffa565);
  for(const side of [-1,1])put('box',x+side*.18,base,z,.06,.5*severity,.045,0x754d43,0,side*.45);
 }
 function update(s,{camera,target,selectedWall,editor}={}){
  layout=s.layout;poseLayout=editor?.preview?{...layout,items:{...layout.items,[editor.selected]:editor.preview}}:layout;owner=null;for(const m of Object.values(batches))m.count=0;const f=s.frontier;if(!f)return;
  const t=s.time,viewX=camera?camera.position.x-target.x:20,viewZ=camera?camera.position.z-target.z:32;
  const ventilation=output(s,'lung')*(s.weather.id==='dry'?.55:1);
  if(flowRun!==s||flowLayout!==layout){flowRun=s;flowLayout=layout;flowTime=t;flowClock=t*.12;}
  flowClock+=Math.max(0,Math.min(.5,t-flowTime))*.12*ventilation;flowTime=t;
  let fireCount=0;
  for(const [i,def] of WALLS.entries()){
   const w=f.walls[i],ratio=w.hp/wallMaximum(s,i),repair=w.repair,front=def.nx*viewX+def.nz*viewZ>Math.hypot(viewX,viewZ)*.3;
   const height=front?.6:1.55,dx=def.b.x-def.a.x,dz=def.b.z-def.a.z,angle=-Math.atan2(dz,dx),length=Math.hypot(dx,dz),stone=repair?0xb9ccc2:ratio<.75?0xcdab91:0xdfc8ae;
   for(let n=0;n<4;n++){
    const q=(n+.5)/4,x=def.a.x+dx*q,z=def.a.z+dz*q;
    // The respiratory portal is a dedicated protected entrance through the rim.
    if(i===1&&x>CITY_ENTRIES.airway.portal.x-1.4)continue;
    if(i===5&&n===0)continue;
   if(w.hp===0){put('box',x,.15,z,length/5,.3,.8,0x968477,angle,.23*(n%2?1:-1));if(repair?.delivered)put('box',x,.3,z,length/4-.12,.25+(1-repair.remaining/7)*.5,.23,0xa7c9bc,angle);}
    else if(!detailedWalls){put('box',x,height*.5,z,length/4-.1,height,.5,stone,angle);put('box',x,height+.06,z,length/4-.04,.12,.64,ratio<.75?0xb79480:0xf0e3ca,angle);if(ratio<.75&&n%2===0)put('box',x,height*.5,z+.27,.055,height*.65,.025,0x8e7568,0,.3);}
   }
   if(!detailedWalls)for(const p of [def.a]){put('post',p.x,height*.6,p.z,.32,height*1.2,.32,0xcfb89e);put('roof',p.x,height*1.25,p.z,.45,.3,.45,repair?0x8caf9f:0xb99581,Math.PI/4);}
   if(repair){const progress=1-repair.remaining/7;put('post',def.x-.8,1,def.z,.07,2,.07,0x977f60);put('post',def.x+.8,1,def.z,.07,2,.07,0x977f60);put('box',def.x,1.95,def.z,1.8,.12,.12,0x977f60);put('box',def.x,2.2,def.z,1.65,.13,.12,0x4d655e);if(progress>0)put('glow',def.x-(1-progress)*.8,2.2,def.z+.05,1.6*progress,.12,.12,0x83e1bd);}
   if(w.warningUntil>t||w.hp===0||selectedWall===i)put('glow',def.x,front?1.1:2.05,def.z,.14,.22,.14,w.hp===0?0xd77c63:0xe0bd72);
   if(w.hp<30&&!repair?.delivered)fire(def.x,def.z,t,fireCount++,1.1-w.hp/100);
   else if(ratio<.75&&!repair?.delivered)injury(def.x,def.z,t,1-ratio);
  }
  for(const id of [1,5,11]){
   const d=WALLS[id],w=f.walls[id],x=d.x-d.nx*1.4,z=d.z-d.nz*1.4;
   put('post',x,1,z,.12,2,.12,0xa38c67);put('box',x,1.8,z,.8,.17,.8,0xdac6a0);put('roof',x,2.25,z,.7,.6,.7,0x86a6a1,Math.PI/4);
   put('glow',x,2.1,z+.4,.15,.15,.15,w.warningUntil>t||w.hp<50?(Math.sin(t*5)>0?0xe89b68:0xe8c681):0x9fc9b7);
  }
  for(const [id,front] of Object.entries(FRONTS)){
   owner=id==='skin'?'workshop':id==='airway'?'lung':'gut';const p=front.depot,d=f.depots[id];put('box',p.x+.45,.12,p.z,2,.24,1.25,0xb9aa90);put('roof',p.x+.45,1.7,p.z,1.45,.6,1,0x92aea1,Math.PI/4);
   for(const x of [p.x-.4,p.x+1.3])put('post',x,.8,p.z-.5,.055,1.6,.055,0x9e8867);
   store({x:p.x-.3,z:p.z+.25},d.materials,0xc4a16e,6);store({x:p.x-.3,z:p.z-.25},d.food,0xd5bf80,6);
   const ammo=Object.values(d.ammo).reduce((a,b)=>a+b,0);for(let n=0;n<Math.min(4,Math.ceil(ammo/4));n++)put('post',p.x+.9+n%2*.22,.3+Math.floor(n/2)*.25,p.z+.2,.07,.25,.07,0xaab7cb);
  }
  owner='workshop';const awaiting=f.walls.filter(w=>w.repair?.materials&&!w.repair.delivered).length;
  store({x:WORKSHOP.x+.1,z:WORKSHOP.z+.65},awaiting*8,0xc7a074,6);
  owner=null;
  // Mucus rollers and a timed cilia rake at the mouth of the respiratory channel.
  for(let i=0;i<6;i++){
   const x=CITY_ENTRIES.airway.screen.x-1.1+i*.43,swing=Math.sin(t*(f.airway.boostUntil>t?7:3)+i*.6)*.32;
   put('post',x,.38,CITY_ENTRIES.airway.screen.z,.055,.65,.055,0xb7c7a0,0,swing);
   if(i<Math.ceil(f.airway.mucus))put('orb',x,.22,CITY_ENTRIES.airway.screen.z-.6,.19,.12,.27,0xb9c799);
  }
  const airway=layout?compileLayout(layout).entries.airway:[CITY_ENTRIES.airway.start,CITY_ENTRIES.airway.portal,CITY_ENTRIES.airway.screen,CITY_ENTRIES.airway.gate,SITES.lung];
  const molecules=8+Math.round(10*ventilation);
  for(let i=0;i<molecules;i++){
   const q=(flowClock+i/molecules)%1,p=entryFlowPoint(airway,q),lane=(i%3-1)*.43,y=.65+Math.sin(q*Math.PI*4)*.09;
   const x=p.x-p.dz*lane,z=p.z+p.dx*lane;
   for(const side of [-1,1])put('glow',x-p.dz*side*.16,y,z+p.dx*side*.16,.16,.16,.16,side===1?0x61e0dd:0xd2fff1);
   put('post',x,y,z,.04,.33,.04,0xc8f9ed,-Math.atan2(p.dx,-p.dz),Math.PI/2);
  }
  for(let i=0;i<4;i++){
   const p=entryFlowPoint(airway,(flowClock*.6+i/4)%1),tx=p.x+p.dx*.3,tz=p.z+p.dz*.3;
   for(const side of [-1,1]){const x=p.x-p.dx*.25-p.dz*side*.28,z=p.z-p.dz*.25+p.dx*side*.28,dx=tx-x,dz=tz-z;put('post',(tx+x)/2,.2,(tz+z)/2,.045,Math.hypot(dx,dz),.045,0x67c9c5,-Math.atan2(dz,dx),Math.PI/2);}
  }
  const mouth=CITY_ENTRIES.gut.mouth,angle=f.gut.quarantine?0:Math.PI/2;
  put('box',mouth.x-.6-Math.sin(angle)*1.3,.65,mouth.z+1.3-Math.cos(angle)*1.3,.12,1.1,2.6,f.gut.quarantine?0xb8b983:0xd8c49e,angle);
  put('glow',mouth.x-.6,1.6,mouth.z+1.6,.13,.16,.13,f.gut.quarantine?0xe8bf65:0x83d6ba);
  for(const [id,site] of Object.entries(SITES)){
   owner=id;const d=s.districts[id],state=facilityState(s,id),cap=workplaceCapacity(s,id,'oxygen');
   const biology=s.biology?.sites[id];
   if(biology){
    const load=infectionLoad(biology),tint=biology.stage==='recovering'||biology.stage==='suppressed'?0x9fb8a5:0xd79783;
    const count=Math.min(6,Math.ceil(Math.max(load,biology.inflammation)/12));
    for(let n=0;n<count;n++){const a=n*Math.PI/3+t*.12;put('orb',site.x+Math.cos(a)*1.9,.07,site.z+Math.sin(a)*1.9,.28,.025,.28,tint);}
    if(biology.isolated)for(let n=0;n<4;n++)put('box',site.x-1.5+n,.35,site.z+1.5,.8,.07,.06,0xc5ae73);
    if(biology.toxin>2)put('orb',site.x+.65,.15,site.z+.9,.3,.05,.3,0xae92b7);
    const road=layout?{points:compileLayout(layout).vascular[id]}:CITY_ROADS.find(r=>r.id===id),level=Math.max(...Object.values(biology.drugs));
    if(road?.points?.length&&level>1){const p=road.points[Math.floor((t*.15)%1*(road.points.length-1))];worldPut('glow',p.x,.18,p.z,.09,.1,.09,0x91ccc3);}
   }
   const [lx,lz]=STATUS_LAMPS[id],sx=site.x+lx,sz=site.z+lz,pulse=state.id==='normal'?1:.83+Math.sin(t*4)*.17;
   put('post',sx,.6,sz,.045,1.2,.045,STYLE.timber);put('box',sx,1.24,sz,.38,.44,.3,STYLE.plaster);
   put('glow',sx,1.25,sz+.17,.15*pulse,.18*pulse,.08,state.color);
   if(state.id==='damage')for(const side of [-1,1])put('box',sx,1.25,sz+.26,.055,.3,.035,STYLE.timber,0,side*.6);
   if(state.id==='damage')fire(site.building[0]+.6,site.building[1]+.7,t,fireCount++,.85+(55-d.hp)/90,1.2);
   else if(d.hp<85||s.enemies.some(e=>!e.dead&&e.action==='attack'&&e.attackTarget?.kind==='district'&&e.attackTarget.id===id))injury(site.x,site.z,t,1, .45);
   for(let slot=1;slot<workplaceCapacity(s,id,'dock');slot++){const p=groundPoint(workStation(id,'dock',slot,poseLayout).target);worldPut('box',p.x,.3,p.z,.85,.6,.5,0xc0ab80);worldPut('glow',p.x,.9,p.z,.07,.1,.07,state.color);}
   const dock=groundPoint(workStation(id,'dock').target);
   store({x:dock.x-.3,z:dock.z+.85},d.food,0xd8bb7c,3);
   store({x:dock.x-.3,z:dock.z+1.25},Object.values(d.ammo).reduce((a,b)=>a+b,0),0xa9bbbd,3);
   for(let slot=3;slot<cap;slot++){const p=groundPoint(workStation(id,'oxygen',slot,poseLayout).target);worldPut('post',p.x,.32,p.z,.16,.64,.16,0x89b9b1);worldPut('post',p.x,.65,p.z,.2,.08,.2,0xe9ddc4);}
   if(id==='marrow'||id==='lymph'||id==='gut'){
    const role=id==='lymph'?'produce':'fabricate';
    for(let slot=3;slot<workplaceCapacity(s,id,role);slot++){const p=groundPoint(workStation(id,role,slot,poseLayout).target);worldPut('box',p.x,.28,p.z,.7,.55,.45,0xbca580);worldPut('orb',p.x,.63,p.z,.15,.2,.15,id==='lymph'?0xa7c5bc:0xd9ba78);}
   }
   if(id==='kidney')for(let n=0;n<d.level-1;n++){const x=8.8+n*1.3;put('post',x,.4,12.4,.55,.65,.55,0xe7dac2);put('post',x,.74,12.4,.46,.03,.46,0x93bdbc);put('box',x,.8,12.4,.9,.045,.05,0x927f65,t*.3);}
   if(id==='gut')store({x:12.1,z:-2},s.rawFood,0xd8b97e,6);
   if(id==='marrow')store({x:-4.8,z:12.3},s.resources.materials/8,0xc4a074,6);
   for(const [n,kind] of f.plots[id].entries()){
    const x=site.x+2.6+n*1.1,z=site.z-2.1;
    if(kind==='sensor'){put('post',x,.9,z,.07,1.8,.07,0xa28e6a);put('roof',x,1.9,z,.45,.35,.45,0x8ca9a3,Math.PI/4);put('glow',x,1.5,z+.25,.1,.1,.1,0xd9c17f);}
    else if(kind==='supply'){put('box',x,.3,z,.8,.6,.65,0xbba37c);put('roof',x,.85,z,.65,.45,.55,0xa2b49b,Math.PI/4);}
    else if(kind==='barrier'){put('box',x,.4,z,.8,.8,.3,0xd7c0a6);put('box',x,.9,z,.9,.2,.4,0xefe1c8);}
    else{put('post',x,.4,z,.35,.8,.35,0x95bab0);put('orb',x,.95,z,.3,.3,.3,0xc2d7c6);}
   }
  }
  owner=null;
  if(s.biology){
   for(const flow of s.biology.transfers){const rid=flow.from==='heart'?flow.to:flow.from,road=layout?{points:compileLayout(layout).vascular[rid]}:CITY_ROADS.find(r=>r.id===rid);if(!road?.points?.length)continue;const q=Math.min(1,(t-flow.started)/6),index=Math.round((flow.from==='heart'?q:1-q)*(road.points.length-1)),p=road.points[index];put('orb',p.x,.25,p.z,.18,.17,.18,0xbca270);}
   owner='heart';for(let i=0;i<3;i++){const p=groundPoint(workStation('heart','rest',i).target);put('box',p.x,.2,p.z,.75,.15,.8,0xb5c8ae);put('box',p.x,.3,p.z-.25,.55,.1,.25,0xe5e2cf);}
   for(const id of ['heart','gut']){owner=id;const p=groundPoint(workStation(id,'dock').target),stock=Object.values(s.districts[id].ammo).reduce((a,b)=>a+b,0);put('post',p.x+.35,.8,p.z,.035,1.6,.035,0x97a59c);put('box',p.x+.35,1.35,p.z,.26,.38,.12,stock>0?0x9bc9bd:0xd0d4c6);}
  }
  owner='kidney';store({x:6.6,z:10.2},f.waste.stock*2,0x9f929d,6);
  put('post',7,.3,10,.5,.6,.5,0xc9c1b0);put('box',7,.67,10,1,.06,.08,0x9b8c75,f.waste.stock>0?t*.8:0);
  owner='marrow';for(let i=0;i<(s.layout?.version===2?6:3);i++){
   const p=groundPoint(workStation('marrow','spawn',i).target),r=s.recruits.find(r=>r.bay===i),progress=r?.remaining!=null?1-r.remaining/(r.duration||8):0;
   put('post',p.x,.3,p.z,.31,.6,.31,STYLE.teal);put('post',p.x,.61,p.z,.34,.08,.34,STYLE.plaster);put('orb',p.x,.76,p.z,.3,.28,.3,r?0xc9d9bd:0xa7c1b7);
   if(r){put('glow',p.x,.6+progress*.2,p.z,.13+progress*.09,.1+progress*.23,.13+progress*.09,r.remaining==null?0xd4b77b:0xe3a8a3);put('box',p.x,.08,p.z-.4,.65*Math.max(.05,progress),.05,.12,0x9ebea9);}
  }
  owner='lymph';for(const [i,item] of f.inbox.entries()){
   put('box',-12.1+i*.35,.5,1.9,.28,.12,.23,item.stage==='접수'?0xd4bd83:0xa2bfa5);
   put('glow',-12.1+i*.35,.75+Math.sin(t*3+i)*.05,1.9,.07,.08,.07,0xdcc481);
  }
  for(const [i,d] of TISSUES.entries()){
   owner='house-'+d.index;const health=f.tissues[i].hp,organ=s.districts[d.district],bad=health<55;
   put('box',d.x,.7,d.z+.72,.25,.27,.04,bad?0x7f7470:organ.food<1||organ.oxygen<20?0xafa797:0xe7cf8c);
   if(bad)fire(d.x+.4,d.z+.4,t,fireCount++,.85+(55-health)/90,1);
   else if(health<85)injury(d.x,d.z+.8,t,1,.5);
   if(health<15){put('box',d.x-.6,.2,d.z+1.2,.8,.32,.45,0x62534b,0,.25);put('post',d.x+.4,.45,d.z+1.1,.11,1.2,.11,0x615047,0,.8);}
   if(health<80)put('glow',d.x,2.6,d.z,.15,.24,.15,bad?0xff8c4e:0xe8bd63);
  }
  for(const m of Object.values(batches)){m.instanceMatrix.clearUpdateRanges();m.instanceMatrix.addUpdateRange(0,m.count*16);m.instanceMatrix.needsUpdate=m.count>0;if(m.instanceColor){m.instanceColor.clearUpdateRanges();m.instanceColor.addUpdateRange(0,m.count*3);m.instanceColor.needsUpdate=m.count>0;}}
 }
 return {root,update};
}
