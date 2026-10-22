import * as T from './vendor/three/three.module.min.js';
import {compileCanalLayout,canalFlowPoint} from './city-canal-layout.mjs';
import {SITES,workStationPoints} from './city-three-layout.mjs';
import {WALLS} from './city-frontier-data.mjs';
import {output} from './city-engine.mjs';
import {wallPieces} from './city-boundary.mjs';

export const CANAL_STYLE=Object.freeze({water:0x4caaa8,deep:0x338b91,foam:0xb6e1d2,stone:0xd9c8a8,quay:0xa39983,sky:0xd7e9e5,roofs:[0xb96146,0xc57852,0xa95643,0xcd8a60],walls:[0xf0dbb4,0xe9b5a0,0xe8cc8d,0xc5d6c7,0xf1e5cc]});

// Reuse the existing CC0 roof and chimney meshes; façades and mooring posts
// are low-poly geometry baked with the other village scenery.
export function canalHouse({box,make,model,mat,parent},x,z,size,index=0,angle=0,floors=2){
 const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;g.scale.setScalar(size);parent.add(g);
 const height=floors===3?2.85:index%3===1?2.05:1.68,roof=CANAL_STYLE.roofs[index%4],wall=CANAL_STYLE.walls[index%5],ivory=0xf5e4c5,shutter=0x4e7974;
 box(0,.04,0,1.35,.16,1.23,0xa29d8b,g);box(0,height/2+.12,0,1.24,height,1.12,wall,g);
 for(const y of [.19,.99,height+.12])box(0,y,0,1.32,.08,1.2,ivory,g);
 for(const px of [-.59,.59])box(px,height/2+.14,.58,.07,height,.08,ivory,g);
 const r=model('roof-gable',0,height+.19,0,1.31,0,g);
 if(r)r.traverse(m=>{if(m.isMesh)m.material=mat(roof);});
 else{const m=make(new T.ConeGeometry(.98,.6,4),roof,0,height+.48,0,g);m.rotation.y=Math.PI/4;}
 model('chimney',-.38,height+.45,-.23,.55,0,g);
 const arch=new T.Shape();arch.moveTo(-.14,0);arch.lineTo(-.14,.25);arch.absarc(0,.25,.14,Math.PI,0,true);arch.lineTo(.14,0);arch.closePath();
 function window(px,py,pz,angle=0){
  const f=new T.Group();f.position.set(px,py,pz);f.rotation.y=angle;g.add(f);
  const border=make(new T.ShapeGeometry(arch,7),ivory,0,-.025,0,f);border.scale.set(1.22,1.16,1);
  make(new T.ShapeGeometry(arch,7),0x496d70,0,0,.015,f);
  for(const s of [-1,1]){box(s*.21,.17,.02,.095,.34,.035,shutter,f);for(const y of [.09,.19,.29])box(s*.21,y,.045,.09,.017,.025,0x71948a,f);}
  box(0,.16,.04,.025,.29,.02,ivory,f);box(0,-.04,.06,.43,.055,.16,ivory,f);
 }
 for(const py of floors===3?[.51,1.43,2.35]:[.51,height-.5]){
  for(const px of [-.31,.31]){window(px,py,.577);window(px,py,-.577,Math.PI);}
  window(.635,py,-.05,Math.PI/2);window(-.635,py,-.05,-Math.PI/2);
 }
 box(0,.39,.583,.27,.52,.04,0x677b69,g);box(0,.67,.61,.36,.06,.12,ivory,g);
 if(index%3!==0){box(0,1.02,.76,.92,.08,.38,ivory,g);box(0,1.29,.92,.94,.035,.035,shutter,g);for(let n=0;n<5;n++)box(-.42+n*.21,1.16,.92,.025,.26,.025,shutter,g);}
 if(index%4===0){const awning=box(0,.91,.82,.95,.055,.45,0xc39168,g);awning.rotation.x=.2;for(const px of [-.33,0,.33])box(px,.93,.83,.12,.045,.46,ivory,g);}
 for(const px of [-.78,.78]){box(px,.24,1.12,.09,.88,.09,ivory,g);for(const y of [.12,.34,.56])box(px,y,1.12,.095,.09,.095,0xab5d4d,g);}
 return g;
}

export function createCanalScenery({layout,make,box,cylinder,model,mat,scope,fixed,moving,ribbon}){
 const canals=compileCanalLayout(layout);if(!canals)return null;
 function geometry(quadList){const p=[],uv=[];for(const q of quadList)for(const i of [0,2,1,0,3,2]){p.push(...q[i]);uv.push(q[i][0],q[i][2]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
 const tops=canals.rows.map(r=>[[r.x,.018,r.z],[r.x+r.w,.018,r.z],[r.x+r.w,.018,r.z+r.d],[r.x,.018,r.z+r.d]]);
 const sides=canals.edges.map(([x,z,xx,zz])=>[[x,-.48,z],[xx,-.48,zz],[xx,.018,zz],[x,.018,z]]);
 scope(null);const top=make(geometry(tops),CANAL_STYLE.stone,0,0,0);top.castShadow=false;top.name='canal-islands';
 const banks=make(geometry(sides),CANAL_STYLE.quay,0,0,0);banks.name='canal-quays';banks.material.side=T.DoubleSide;
 const rims=canals.edges.map(([x,z,xx,zz])=>{const length=Math.hypot(xx-x,zz-z),dx=-(zz-z)/length*.11,dz=(xx-x)/length*.11;return [[x,.035,z],[xx,.035,zz],[xx+dx,.035,zz+dz],[x+dx,.035,z+dz]];});
 make(geometry(rims),0xf0dfbf,0,0,0).castShadow=false;
 // Continuous waterfront façades use the same CC0 roofs as the playable town.
 // Infill is rebuilt around real placements and never covers transport water.
 for(const b of canals.blocks.frontages){
  const g=canalHouse({box,make,model,mat,parent:fixed},b.x,b.z,1,b.variant,b.angle,b.variant%4===0?3:2);
  g.scale.set(b.w/1.35,1.15+(b.variant%3)*.1,b.d/1.4);g.name='canal-frontage';
 }
 for(const p of canals.blocks.gardens){
  const g=new T.Group();g.position.set(p.x,0,p.z);fixed.add(g);g.name='canal-court';
  box(0,.035,0,3.5,.06,3.5,0xe5d8bb,g);
  for(const x of [-1.6,1.6])box(x,.075,0,.1,.04,3.3,0xb8ab8e,g);
  for(const z of [-1.6,1.6])box(0,.075,z,3.3,.04,.1,0xb8ab8e,g);
  for(const [x,z] of [[-.8,-.7],[.8,.7]]){
   box(x,.16,z,.85,.28,.85,0xc5b28c,g);box(x,.31,z,.7,.025,.7,0x87966d,g);
   cylinder(x,.82,z,.05,.08,1.1,0x877056,g);
   for(let i=0;i<3;i++)make(new T.ConeGeometry(.48-i*.1,.95,7),[0x6f8b69,0x839b77,0x91a582][i],x,1.05+i*.53,z,g);
  }
  for(const z of [-1.25,1.25]){box(0,.27,z,1.25,.12,.32,0x9b8060,g);for(const x of [-.45,.45])box(x,.13,z,.11,.24,.24,0xb4a386,g);}
 }
 // Width and oxygen tint make the circulation legible from the overview.
 // Low-oxygen blood also leaves the heart for the lungs in the pulmonary artery.
 for(const bed of canals.vascular.beds)for(const points of bed.branches)ribbon(points,bed.width,0x8bb8ab,-.145);
 for(const vessel of canals.flows){
  ribbon(vessel.points,vessel.width,vessel.oxygenated?0xd86b5a:0x508fca,-.14);
  ribbon(vessel.points,.14,vessel.oxygenated?0xf2b095:0x9dd8ec,-.132);
 }
 for(const path of canals.patrol)ribbon(path.points,Math.min(.8,path.width),0xc8b493,.065);
 // A narrow stone foundation supports the existing skin wall above the lagoon.
 for(const wall of WALLS)for(const p of wallPieces(wall))ribbon([p.a,p.b],1.3,0xb8ac90,-.035);
 const outlet=canals.outlet;
 let discharge=null,dischargeFlow=null;
 if(outlet){
  // An exposed utility pipe makes the kidney's separate waste route legible.
  const inlet=outlet.points[0];box(inlet.x,.06,inlet.z,.8,.1,.8,0xb6a98e);
  for(const x of [-.22,0,.22])box(inlet.x+x,.12,inlet.z,.06,.025,.54,0x65716b);
  dischargeFlow=outlet;
  const up=new T.Vector3(0,1,0),direction=new T.Vector3();
  for(let i=1;i<outlet.points.length-1;i++){
   const a=outlet.points[i-1],b=outlet.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.02)continue;
   const pipe=make(new T.CylinderGeometry(.25,.25,length,10),0x708c7a,(a.x+b.x)/2,.38,(a.z+b.z)/2);pipe.name='renal-drain-pipe';direction.set(b.x-a.x,0,b.z-a.z).normalize();pipe.quaternion.setFromUnitVectors(up,direction);
   const steps=Math.max(1,Math.ceil(length/3));for(let j=0;j<=steps;j++){
    const q=j/steps,x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q;
    const band=make(new T.CylinderGeometry(.3,.3,.12,10),0xb4a57e,x,.38,z);band.quaternion.copy(pipe.quaternion);box(x,.12,z,.55,.22,.55,0xb9aa8f);
   }
  }
  // A protected culvert sits through the existing wall. The wall's defensive
  // state remains intact, and blood circulation has no connection to this pipe.
  const p={x:outlet.portal.x+outlet.dx*.7,z:outlet.portal.z+outlet.dz*.7},gate=new T.Group();gate.position.set(p.x,0,p.z);gate.rotation.y=Math.atan2(outlet.dx,outlet.dz);fixed.add(gate);
  box(-.8,.55,-2.7,1.05,1.1,1.3,0xe4d2b2,gate);box(-.8,1.16,-2.7,1.25,.14,1.5,0xac6550,gate);
  box(-.8,.55,-1.99,.42,.6,.04,0x577b73,gate);box(-.8,.2,-1.9,.65,.18,.3,0xb9a585,gate);
  for(const x of [-.5,.5])box(x,.21,-1.85,.14,.28,1.45,0xd9c7a6,gate);
  cylinder(.8,.7,-2.6,.075,.09,1.4,0x6f8074,gate);
  const valve=make(new T.TorusGeometry(.32,.055,5,12),0x6f8074,.8,1.2,-2.6,gate);valve.rotation.x=Math.PI/2;
  box(0,.09,0,1.5,.18,1.1,0xc8b79a,gate);
  for(const x of [-.6,.6])box(x,.42,0,.25,.75,.65,0xe4d2b2,gate);
  const arch=make(new T.TorusGeometry(.6,.15,6,16,Math.PI),0xe4d2b2,0,.76,0,gate);arch.name='kidney-outlet-arch';
  const mouth=make(new T.CircleGeometry(.49,16),0x415c55,0,.51,.35,gate);mouth.material.side=T.DoubleSide;
  for(const x of [-.28,0,.28])box(x,.5,.37,.045,.74,.055,0x9d967d,gate);
  ribbon([outlet.portal,outlet.end],.8,0x9cbcac,-.115);
  discharge=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xe0ce9a}),24);discharge.name='kidney-discharge-flow';discharge.frustumCulled=false;discharge.instanceMatrix.setUsage(T.DynamicDrawUsage);moving.add(discharge);
 }
 for(const [id] of Object.entries(SITES)){
  scope(id);
  for(const role of ['oxygen','dock']){
   const bay=workStationPoints(id,role),p=bay.target;
   box(p.x,.035,p.z,.68,.09,.6,0xb29468);
   for(const side of [-1,1]){
    cylinder(p.x+side*.39,.21,p.z,.065,.085,.73,0xf0dcc0);
    cylinder(p.x+side*.39,.24,p.z,.069,.069,.12,id==='lung'?0x699d9c:0xb96550);
    cylinder(p.x+side*.39,.48,p.z,.069,.069,.10,id==='lung'?0x699d9c:0xb96550);
   }
  }
 }
 scope(null);
 const arrow=new T.BufferGeometry();arrow.setAttribute('position',new T.Float32BufferAttribute([-.45,0,-.35,0,0,.45,.45,0,-.35,.45,0,-.35,0,0,.12,-.45,0,-.35],3));arrow.computeVertexNormals();
 const flowSlots=canals.flows.map(f=>Math.max(1,Math.ceil(f.length/12))),count=flowSlots.reduce((a,b)=>a+b,0),mesh=new T.InstancedMesh(arrow,new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}),count),dummy=new T.Object3D();
 let slot=0;for(const [i,flow] of canals.flows.entries())for(let j=0;j<flowSlots[i];j++){
  const point=canalFlowPoint(flow,(j+.5)/flowSlots[i]);dummy.position.set(point.x,-.08,point.z);dummy.rotation.set(0,point.angle,0);dummy.scale.set(.58,1,.8);dummy.updateMatrix();mesh.setMatrixAt(slot,dummy.matrix);mesh.setColorAt(slot++,new T.Color(flow.oxygenated?0xf4b29c:0xa8d6e9));
 }
 mesh.name='canal-current';mesh.frustumCulled=false;moving.add(mesh);
 let lastTime=null,dischargePhase=0;
 return {canals,update(s){
  if(lastTime===s.time)return;const dt=lastTime==null?0:Math.max(0,Math.min(.3,s.time-lastTime));lastTime=s.time;
  if(discharge){
   const rate=output(s,'kidney'),working=rate>0&&(s.waste>.01||(s.frontier?.waste.stock||0)>.01);
   dischargePhase+=dt*rate*2/dischargeFlow.length;discharge.visible=working;
   if(working){for(let i=0;i<24;i++){const q=(dischargePhase+i/24)%1,p=canalFlowPoint(dischargeFlow,q),fall=Math.max(0,(q*dischargeFlow.length-(dischargeFlow.length-2))/2);dummy.position.set(p.x,.67-fall*.8,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(.12,.06,.24);dummy.updateMatrix();discharge.setMatrixAt(i,dummy.matrix);}discharge.instanceMatrix.needsUpdate=true;}
  }
 }};
}
