import {CITY_STYLE as STYLE} from './city-three-style.mjs';
import {facilityState} from './city-workplaces.mjs';
import * as T from './vendor/three/three.module.min.js';
import {groundPoint} from './city-three-layout.mjs';
import {DISTRICTS} from './city-data.mjs';
import {output} from './city-engine.mjs';
import {workStation} from './city-activity.mjs';
import {SITES} from './city-three-layout.mjs';

// CC0 modular walls, roofs, mills, stalls and carts share the existing atlas.
// Bespoke organ machinery uses the same small palette and only moving parts
// remain outside the static geometry bake.
export function createFacilities({fixed,animated,make,box,cylinder,orb,model,newModel=null,cottage,road,scope=()=>{}}){
 const {plaster:ivory,brass,timber:wood,teal,rose,sage:green,stone}=STYLE;
 const rotors=[],pistons=[],belts=[],born=[],pumps=[];
 function pipe(points,r=.11,color=brass,segments=14){return make(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,6,false),color,0,0,0);}
 function rim(x,y,z,r,color=ivory){const m=make(new T.TorusGeometry(r,.09,5,18),color,x,y,z);m.rotation.x=Math.PI/2;return m;}
 scope('lung');
 // Lung: a wind-catching harbour with bellows and open intake funnels.
 for(const [x,z,s] of [[-9,-10,1],[-5.6,-12,.8]]){
  if(newModel)newModel('tower',x,0,z,3.3*s,0,fixed,1.7*s);
  cylinder(x,1.5*s,z,.65*s,.8*s,3*s,ivory);rim(x,.45*s,z,.8*s,teal);rim(x,2.8*s,z,.7*s,teal);
  make(new T.ConeGeometry(.92*s,.7*s,8),teal,x,3.25*s,z);
  const guard=make(new T.TorusGeometry(.76*s,.08*s,6,20),ivory,x,2.12*s,z+.76*s);
  const rotor=new T.Group();rotor.position.set(x,2.12*s,z+.84*s);animated.add(rotor);
  for(let i=0;i<4;i++){const blade=new T.Group();blade.rotation.z=i*Math.PI/2;rotor.add(blade);box(0,.38*s,0,.25*s,.58*s,.06*s,teal,blade);}
  orb(0,0,.05,.15*s,brass,rotor);rotors.push({mesh:rotor,id:'lung',axis:'z',speed:-1.05});
  box(x,.4,z+.7,.37,.8,.15,wood);model('banner-green',x+.75,1.3,z,.75);
 }
 cottage(-10.8,-10.5,1.4,.3,true);
 for(const x of [-8,-6.6]){
  if(newModel)newModel('tank',x,.03,-8.2,1.45,0,fixed,.9);
  else{cylinder(x,.65,-8.2,.42,.42,1.3,0xa0c9c5);cylinder(x,1.36,-8.2,.25,.35,.15,ivory);}
  const b=box(x,.55,-7.7,.65,.7,.35,wood,animated);pistons.push({mesh:b,y:.55,id:'lung'});
  const funnel=make(new T.CylinderGeometry(.55,.18,.7,8,1,true),teal,x,1.9,-8.25);funnel.rotation.x=-.6;
  pipe([[x,1.45,-8.2],[x,1.65,-8.2],[x,1.75,-8.15]],.13,teal);
 }
 if(newModel)newModel('market',-4,.02,-9,1.5,.6,fixed,1.8);else model('stall-green',-4,.05,-9,1.1,.6);
 scope('heart');
 // Heart: broad pump house, paired pistons and a continuous brass manifold.
 if(newModel)newModel('hall',0,.02,-1.5,2.6,0,fixed,3.8);
 else cottage(0,-1.5,1.8,0,true);
 box(0,.14,-.25,4.15,.28,2.45,stone);
 for(const x of [-1,1]){
  cylinder(x,1.35,-.25,.57,.64,2.4,rose);rim(x,.32,-.25,.64,brass);rim(x,2.35,-.25,.59,ivory);
  const dome=orb(x,2.58,-.25,.63,rose,animated);dome.scale.y=.7;pumps.push(dome);
  cylinder(x,.95,.48,.11,.11,1.55,brass);
  const piston=cylinder(x,1.35,.48,.3,.3,.26,ivory,animated);pistons.push({mesh:piston,y:1.35,id:'heart'});
  const gauge=cylinder(x,1.88,.37,.23,.23,.1,ivory);gauge.rotation.x=Math.PI/2;
  const needle=box(x,1.88,.44,.035,.28,.03,STYLE.roofs[0],animated);rotors.push({mesh:needle,id:'heart',axis:'z',speed:.6,gauge:true});
 }
 pipe([[-1.8,.3,.5],[-1.8,2.75,.5],[-1,3.15,-.25],[1,3.15,-.25],[1.8,2.75,.5],[1.8,.3,.5]],.17,brass,20);
 const flywheel=new T.Group();flywheel.position.set(0,1.15,.65);animated.add(flywheel);
 make(new T.TorusGeometry(.47,.085,6,16),teal,0,0,0,flywheel);
 for(let i=0;i<4;i++){const spoke=box(0,0,0,.055,.87,.055,brass,flywheel);spoke.rotation.z=i*Math.PI/4;}
 orb(0,0,.02,.13,ivory,flywheel);rotors.push({mesh:flywheel,id:'heart',axis:'z',speed:1.25});
 const heart=new T.Shape();heart.moveTo(0,-.48);heart.bezierCurveTo(-1,.1,-.66,.72,-.22,.55);heart.quadraticCurveTo(0,.48,0,.3);heart.quadraticCurveTo(0,.48,.22,.55);heart.bezierCurveTo(.66,.72,1,.1,0,-.48);
 cylinder(0,3.3,-.3,.08,.1,.6,brass);
 make(new T.ExtrudeGeometry(heart,{depth:.18,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:1,steps:1,curveSegments:5}),STYLE.roofs[0],0,3.8,-.3);
 model('banner-red',-1.85,.3,-1.2,.8);
 if(newModel){newModel('market',2.55,.02,4.1,1.15,-.35,fixed,1.3);newModel('crate',2.45,.03,2.65,.45,0,fixed,.55);}
 else model('stall-red',2.55,.05,4.1,.8,-.35);
 scope('gut');
 // Gut: grain silos, food workshop and a short working packing belt.
 if(newModel){newModel('house-b',10,.02,-5,2.9,-.2,fixed,3.2);newModel('silo',12.6,.02,-5.4,2.8,0,fixed,1.3);}
 else{const kitchen=cottage(10,-5,1.8,-.2,true);kitchen.scale.x*=1.25;kitchen.scale.z*=.8;
  for(const [x,z,h] of [[12,-5.8,2.6],[12.8,-4.5,1.9]]){cylinder(x,h/2,z,.52,.58,h,0xdbb66e);make(new T.ConeGeometry(.65,.55,8),wood,x,h+.2,z);rim(x,.5,z,.58,wood);}}
 cylinder(12.6,1.35,-5.4,.57,.6,2.7,ivory);rim(12.6,2.5,-5.4,.59,brass);make(new T.ConeGeometry(.75,.65,8),STYLE.roofs[2],12.6,3,-5.4);
 for(const x of [9.35,10.65]){const hopper=make(new T.CylinderGeometry(.6,.24,.8,8),brass,x,2.4,-4.75);rim(x,2.82,-4.75,.61,ivory);orb(x,2.85,-4.75,.42,0xe2c57d);}
 box(10,1.3,-3.8,2.6,1.45,.2,ivory);box(10,1.6,-3.67,2.7,.2,.28,STYLE.roofs[2]);
 const mill=new T.Group();mill.position.set(10.6,1.12,-3.55);animated.add(mill);make(new T.TorusGeometry(.37,.1,6,12),brass,0,0,0,mill);box(0,0,0,.65,.09,.08,wood,mill);box(0,0,0,.09,.65,.08,wood,mill);rotors.push({mesh:mill,id:'gut',axis:'z',speed:.75});
 if(newModel)newModel('market',9.4,.02,-2.1,1.45,0,fixed,1.5);else model('stall-green',9.4,.05,-2.1,1.1);
 box(10.7,.28,-2.8,2.6,.28,.65,wood);box(10.7,.45,-2.8,2.65,.08,.58,0xb8b7a1);
 for(let i=0;i<3;i++){const crate=box(9.65+i*.7,.64,-2.8,.38,.28,.36,0xdbb66e,animated);belts.push({mesh:crate,phase:i/3});}
 pipe([[11.8,1.5,-4.8],[11.8,1,-3.4],[11.5,.7,-2.8]],.16,wood);
 scope('kidney');
 // Kidney: open filtration basins beside the river, with a working waterwheel.
 box(10.6,.09,9.2,4.3,.18,4,stone);
 if(newModel)newModel('workshop',11.9,.02,7.3,1.7,Math.PI/2,fixed,1.8);
 for(const x of [9.5,12.1]){cylinder(x,1.25,7.3,.33,.44,2.5,ivory);for(const y of [.45,1.2,1.95]){cylinder(x,y,7.3,.36,.36,.34,teal);rim(x,y+.19,7.3,.37,ivory);}cylinder(x,2.75,7.3,.61,.23,.7,teal);rim(x,3.12,7.3,.62,ivory);}
 pipe([[9.5,2.4,7.3],[9.5,3.25,7.3],[12.1,3.25,7.3],[12.1,2.4,7.3]],.12,teal);
 for(const [x,z] of [[9.8,8.2],[11.2,10.3]]){
  cylinder(x,.45,z,.95,1.04,.8,ivory);cylinder(x,.87,z,.81,.81,.035,0x84b5b4);rim(x,.89,z,.9,stone);
  const rake=new T.Group();rake.position.set(x,.94,z);animated.add(rake);box(0,0,0,1.6,.06,.08,wood,rake);rotors.push({mesh:rake,id:'kidney',axis:'y',speed:.3});
 }
 pipe([[9.8,.8,8.2],[10.4,1.2,8.9],[11.2,.8,10.3]],.12,teal);
 box(13,.18,9,2.1,.25,.7,stone);box(13,.32,9,2.2,.03,.4,0x84b5b4);
 const wheel=new T.Group();wheel.position.set(12.5,.94,8.9);animated.add(wheel);model('watermill',0,0,0,1,0,wheel);rotors.push({mesh:wheel,id:'kidney',axis:'z',speed:.45});
 for(const x of [8.9,12.3]){cylinder(x,.85,11,.08,.1,1.7,wood);box(x,1.8,11,.7,.16,.7,teal);}
 road([{x:8,z:8},{x:9,z:9.3},{x:10,z:9.3}],.75);
 scope('marrow');
 // Marrow: a bone-framed nursery, with production pods beside the exit.
 if(newModel){const nursery=newModel('house-a',-6.8,.02,12,2.8,Math.PI,fixed,3.6);nursery.scale.y*=1.1;}
 else{box(-6.8,.85,12,3.3,1.7,1.9,rose);const roof=cylinder(-6.8,1.8,12,.98,.98,3.5,ivory);roof.rotation.z=Math.PI/2;
  box(-6.8,.66,10.99,.95,1.3,.08,wood);box(-6.8,.67,10.93,.65,1.1,.04,0x6b7f78);}
 for(const x of [-8.5,-5.1]){cylinder(x,1.55,11,.22,.22,3.1,ivory);for(const y of [.25,2.95]){orb(x-.16,y,11,.3,ivory);orb(x+.16,y,11,.3,ivory);}}
 box(-6.8,3.08,11,3.5,.3,.32,ivory);
 const nurseryRoof=cylinder(-6.8,2,12,.83,.83,3.5,ivory);nurseryRoof.rotation.z=Math.PI/2;
 box(-6.8,3.12,10.79,.8,.18,.08,STYLE.roofs[4]);box(-6.8,3.12,10.78,.18,.8,.08,STYLE.roofs[4]);
 for(let i=0;i<3;i++){const p=groundPoint(workStation('marrow','spawn',i).target);cylinder(p.x,.34,p.z,.28,.34,.68,teal);rim(p.x,.7,p.z,.29,ivory);const bud=orb(p.x,.85,p.z,.24,rose,animated);born.push({mesh:bud,phase:i*1.4});}
 // Production bays are instanced and follow each actual recruitment order.
 model('cart',-4.5,.05,11.4,.75,.6);model('chimney',-7.9,2.15,12.2,.8);
 scope('lymph');
 // Lymph: a green rotunda with a signal mast and antibody work benches.
 if(newModel)newModel('tower',-15.25,.02,.1,2.8,0,fixed,1.1);
 make(new T.CylinderGeometry(1.3,1.45,1.7,10),ivory,-13.6,.9,.5);
 make(new T.ConeGeometry(1.65,.9,10),green,-13.6,2.15,.5);box(-13.6,.65,1.86,.65,1.3,.08,wood);
 for(const side of [-1,1]){box(-13.6+side*.88,1.1,1.57,.35,.55,.08,teal);box(-13.6+side*.88,1.1,1.63,.05,.55,.03,ivory);}
 cylinder(-13.6,3.05,.5,.1,.12,1.25,brass);
 for(const side of [-1,1]){const branch=cylinder(-13.6+side*.3,3.72,.5,.09,.09,.9,brass);branch.rotation.z=-side*.7;orb(-13.6+side*.59,4.06,.5,.18,green);}
 model('banner-green',-12.2,1,.6,.8);
 // Bench and dock coordinates are also the workers' real interaction targets.
 // Fixed fittings join the static bake; moving cargo/vials use actor instances.
 for(const [id,role] of [['lymph','produce'],['marrow','fabricate'],['gut','fabricate']])for(let i=0;i<3;i++){
  scope(id);const p=groundPoint(workStation(id,role,i).target);
  if(newModel)newModel('station',p.x,.02,p.z,.4,0,fixed,.7);
  else{box(p.x,.34,p.z,.62,.12,.43,wood);for(const x of [-.22,.22])box(p.x+x,.16,p.z,.055,.3,.32,wood);}
  if(newModel&&role==='produce')newModel('jar',p.x-.2,.44,p.z-.08,.18,0,fixed,.2);
  if(role==='produce'){cylinder(p.x,.45,p.z,.14,.16,.12,ivory);cylinder(p.x+.22,.52,p.z,.05,.05,.25,teal);}
  else{box(p.x,.46,p.z,.32,.12,.22,ivory);box(p.x-.2,.46,p.z,.06,.12,.33,brass);}
 }
 for(const d of DISTRICTS){
  scope(d.id);
  const site=SITES[d.id],dock=groundPoint(workStation(d.id,'dock').target);
  road([{x:site.x,z:site.z},dock],.65);
  box(dock.x,.19,dock.z,.67,.38,.68,wood);box(dock.x,.4,dock.z,.78,.06,.78,ivory);
  box(dock.x,.445,dock.z,.23,.035,.23,d.id==='gut'?brass:teal);
  const ports=[];
  for(let slot=0;slot<3;slot++){
   const p=groundPoint(workStation(d.id,'oxygen',slot).target);ports.push(p);
   make(new T.CylinderGeometry(.14,.18,.64,8),teal,p.x,.32,p.z);make(new T.CylinderGeometry(.19,.19,.08,8),ivory,p.x,.65,p.z);
  }
  const first=ports[0],last=ports[2];pipe([[first.x,.14,first.z],[last.x,.14,last.z]],.065,teal,1);
  pipe([[first.x,.14,first.z],[first.x,.14,site.building[1]],[site.building[0],.14,site.building[1]]],.065,teal,6);
 }
 scope(null);
 let last=0,beltPhase=0;
 return {update(s){
  const dt=Math.max(0,Math.min(.3,s.time-last));last=s.time;
  for(const r of rotors){const state=facilityState(s,r.id);if(r.gauge){r.mesh.rotation.z=-.8+output(s,r.id)*state.speed*1.6;continue;}r.mesh.rotation[r.axis]+=dt*r.speed*output(s,r.id)*state.speed*(state.id==='damage'&&Math.sin(s.time*5)<0?0:1)*(r.id==='lung'&&s.weather.id==='dry'?.55:1);}
  for(const p of pumps){const beat=Math.sin(s.time*4)*.055*output(s,'heart')*facilityState(s,'heart').speed;p.scale.set(1+beat,.7+beat,1+beat);}
  for(const p of pistons)p.mesh.position.y=p.y+Math.sin(s.time*(p.id==='lung'?2:4))*.16*output(s,p.id)*facilityState(s,p.id).speed;
  beltPhase+=dt*.16*facilityState(s,'gut').speed*(s.frontier?.gut.quarantine?.55:1);
  for(const b of belts){b.mesh.visible=s.rawFood>(b.phase*18);b.mesh.position.x=9.5+((beltPhase+b.phase)%1)*2.25;}
  for(const b of born){const busy=s.recruits.length>0;b.mesh.position.y=.85+(busy?Math.sin(s.time*4+b.phase)*.1:0);b.mesh.scale.setScalar(busy?1+Math.sin(s.time*3+b.phase)*.12:1);}
 }};
}
