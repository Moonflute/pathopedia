import * as T from './vendor/three/three.module.min.js';
import {compileCanalLayout,canalFlowPoint} from './city-canal-layout.mjs';
import {SITES,workStationPoints} from './city-three-layout.mjs';
import {WALLS} from './city-frontier-data.mjs';
import {output} from './city-engine.mjs';

export const CANAL_STYLE=Object.freeze({water:0x4caaa8,deep:0x338b91,foam:0xb6e1d2,stone:0xd9c8a8,quay:0xa39983,sky:0xd7e9e5,roofs:[0xb96146,0xc57852,0xa95643,0xcd8a60],walls:[0xf0dbb4,0xe9b5a0,0xe8cc8d,0xc5d6c7,0xf1e5cc]});

// Reuse the existing CC0 roof and chimney meshes; façades and mooring posts
// are low-poly geometry baked with the other village scenery.
export function canalHouse({box,make,model,mat,parent},x,z,size,index=0,angle=0){
 const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;g.scale.setScalar(size);parent.add(g);
 const height=index%3===1?2.05:1.68,roof=CANAL_STYLE.roofs[index%4],wall=CANAL_STYLE.walls[index%5],ivory=0xf5e4c5,shutter=0x4e7974;
 box(0,.04,0,1.35,.16,1.23,0xa29d8b,g);box(0,height/2+.12,0,1.24,height,1.12,wall,g);
 for(const y of [.19,.99,height+.12])box(0,y,0,1.32,.08,1.2,ivory,g);
 for(const px of [-.59,.59])box(px,height/2+.14,.58,.07,height,.08,ivory,g);
 const r=model('roof-gable',0,height+.19,0,1.31,0,g);
 if(r)r.traverse(m=>{if(m.isMesh)m.material=mat(roof);});
 else{const m=make(new T.ConeGeometry(.98,.6,4),roof,0,height+.48,0,g);m.rotation.y=Math.PI/4;}
 model('chimney',-.38,height+.45,-.23,.55,0,g);
 const arch=new T.Shape();arch.moveTo(-.14,0);arch.lineTo(-.14,.25);arch.absarc(0,.25,.14,Math.PI,0,true);arch.lineTo(.14,0);arch.closePath();
 function window(px,py,pz,side=false){
  const f=new T.Group();f.position.set(px,py,pz);if(side)f.rotation.y=Math.PI/2;g.add(f);
  const border=make(new T.ShapeGeometry(arch,7),ivory,0,-.025,0,f);border.scale.set(1.22,1.16,1);
  make(new T.ShapeGeometry(arch,7),0x496d70,0,0,.015,f);
  for(const s of [-1,1]){box(s*.21,.17,.02,.095,.34,.035,shutter,f);for(const y of [.09,.19,.29])box(s*.21,y,.045,.09,.017,.025,0x71948a,f);}
  box(0,.16,.04,.025,.29,.02,ivory,f);box(0,-.04,.06,.43,.055,.16,ivory,f);
 }
 for(const py of [.51,height-.5]){for(const px of [-.31,.31])window(px,py,.577);window(.635,py,-.05,true);}
 box(0,.39,.583,.27,.52,.04,0x677b69,g);box(0,.67,.61,.36,.06,.12,ivory,g);
 if(index%3!==0){box(0,1.02,.76,.92,.08,.38,ivory,g);box(0,1.29,.92,.94,.035,.035,shutter,g);for(let n=0;n<5;n++)box(-.42+n*.21,1.16,.92,.025,.26,.025,shutter,g);}
 if(index%4===0){const awning=box(0,.91,.82,.95,.055,.45,0xc39168,g);awning.rotation.x=.2;for(const px of [-.33,0,.33])box(px,.93,.83,.12,.045,.46,ivory,g);}
 for(const px of [-.78,.78]){box(px,.24,1.12,.09,.88,.09,ivory,g);for(const y of [.12,.34,.56])box(px,y,1.12,.095,.09,.095,0xab5d4d,g);}
 return g;
}

export function createCanalScenery({layout,make,box,cylinder,scope,fixed,moving,ribbon}){
 const canals=compileCanalLayout(layout);if(!canals)return null;
 function geometry(quadList){const p=[],uv=[];for(const q of quadList)for(const i of [0,2,1,0,3,2]){p.push(...q[i]);uv.push(q[i][0],q[i][2]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
 const tops=canals.rows.map(r=>[[r.x,.018,r.z],[r.x+r.w,.018,r.z],[r.x+r.w,.018,r.z+r.d],[r.x,.018,r.z+r.d]]);
 const sides=canals.edges.map(([x,z,xx,zz])=>[[x,-.48,z],[xx,-.48,zz],[xx,.018,zz],[x,.018,z]]);
 scope(null);const top=make(geometry(tops),CANAL_STYLE.stone,0,0,0);top.castShadow=false;top.name='canal-islands';
 const banks=make(geometry(sides),CANAL_STYLE.quay,0,0,0);banks.name='canal-quays';banks.material.side=T.DoubleSide;
 const rims=canals.edges.map(([x,z,xx,zz])=>{const length=Math.hypot(xx-x,zz-z),dx=-(zz-z)/length*.11,dz=(xx-x)/length*.11;return [[x,.035,z],[xx,.035,zz],[xx+dx,.035,zz+dz],[x+dx,.035,z+dz]];});
 make(geometry(rims),0xf0dfbf,0,0,0).castShadow=false;
 // Width and oxygen tint make the circulation legible from the overview.
 // Low-oxygen blood also leaves the heart for the lungs in the pulmonary artery.
 for(const bed of canals.vascular.beds)for(const points of bed.branches)ribbon(points,bed.width,0x8bb8ab,-.145);
 for(const vessel of canals.flows){
  ribbon(vessel.points,vessel.width,vessel.oxygenated?0xc58e7e:0x639ab6,-.14);
  ribbon(vessel.points,.09,vessel.oxygenated?0xd99c85:0x8cc5db,-.132);
 }
 // A narrow stone foundation supports the existing skin wall above the lagoon.
 for(const wall of WALLS)ribbon([wall.a,wall.b],1.3,0xb8ac90,-.035);
 const outlet=canals.outlet;
 let discharge=null;
 if(outlet){
  const curve=new T.CurvePath();for(let i=1;i<outlet.points.length;i++){const a=outlet.points[i-1],b=outlet.points[i];curve.add(new T.LineCurve3(new T.Vector3(a.x,.16,a.z),new T.Vector3(b.x,.16,b.z)));}
  const pipe=make(new T.TubeGeometry(curve,Math.max(12,Math.ceil(outlet.length*2)),outlet.width/2,6,false),0xb5a487,0,0,0);pipe.name='kidney-discharge-pipe';
  // A protected culvert sits through the existing wall. The wall's defensive
  // state remains intact, and blood circulation has no connection to this pipe.
  const p={x:outlet.portal.x+outlet.dx*.7,z:outlet.portal.z+outlet.dz*.7},gate=new T.Group();gate.position.set(p.x,0,p.z);gate.rotation.y=Math.atan2(outlet.dx,outlet.dz);fixed.add(gate);
  box(0,.09,0,1.5,.18,1.1,0xc8b79a,gate);
  for(const x of [-.6,.6])box(x,.42,0,.25,.75,.65,0xe4d2b2,gate);
  const arch=make(new T.TorusGeometry(.6,.15,6,16,Math.PI),0xe4d2b2,0,.76,0,gate);arch.name='kidney-outlet-arch';
  const mouth=make(new T.CircleGeometry(.49,16),0x415c55,0,.51,.35,gate);mouth.material.side=T.DoubleSide;
  for(const x of [-.28,0,.28])box(x,.5,.37,.045,.74,.055,0x9d967d,gate);
  ribbon([outlet.portal,outlet.end],.52,0x9cbcac,-.115);
  discharge=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xd4bb85}),8);discharge.name='kidney-discharge-flow';discharge.frustumCulled=false;discharge.instanceMatrix.setUsage(T.DynamicDrawUsage);moving.add(discharge);
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
 const count=canals.flows.length*16,mesh=new T.InstancedMesh(arrow,new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}),count),dummy=new T.Object3D();
 for(let i=0;i<count;i++)mesh.setColorAt(i,new T.Color(canals.flows[Math.floor(i/16)].oxygenated?0xf7d2af:0xd2f1f9));
 mesh.name='canal-current';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);moving.add(mesh);
 let lastTime=null,dischargePhase=0;
 return {canals,update(s){
  if(lastTime===s.time)return;const dt=lastTime==null?0:Math.max(0,Math.min(.3,s.time-lastTime));lastTime=s.time;
  let n=0;for(const flow of canals.flows)for(let j=0;j<16;j++){
   const point=canalFlowPoint(flow,j/16+s.time*.9/flow.length);
   dummy.position.set(point.x,-.115,point.z);dummy.rotation.set(0,point.angle,0);dummy.scale.set(.48,1,.6);dummy.updateMatrix();mesh.setMatrixAt(n++,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(discharge){
   const rate=output(s,'kidney'),working=rate>0&&(s.waste>.01||(s.frontier?.waste.stock||0)>.01);
   dischargePhase+=dt*rate*.7/outlet.length;discharge.visible=working;
   if(working){for(let i=0;i<8;i++){const p=canalFlowPoint(outlet,dischargePhase+i/8);dummy.position.set(p.x,.48,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(.075,.045,.13);dummy.updateMatrix();discharge.setMatrixAt(i,dummy.matrix);}discharge.instanceMatrix.needsUpdate=true;}
  }
 }};
}
