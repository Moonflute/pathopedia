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
 const ivory=0xf1e6cd,brass=0xc5aa6e,wood=0x947656,teal=0x79a9a6,rose=0xdba39a,green=0xa6b57c,stone=0xb8b1c2;
 const rotors=[],pistons=[],belts=[],born=[];
 function pipe(points,r=.11,color=brass,segments=14){return make(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,6,false),color,0,0,0);}
 function rim(x,y,z,r,color=ivory){const m=make(new T.TorusGeometry(r,.09,5,18),color,x,y,z);m.rotation.x=Math.PI/2;return m;}
 scope('lung');
 // Lung: a wind-catching harbour with bellows and open intake funnels.
 for(const [x,z,s] of [[-9,-10,1],[-5.6,-12,.8]]){
  cylinder(x,1.35*s,z,.57*s,.82*s,2.7*s,ivory);make(new T.ConeGeometry(.88*s,1*s,8),teal,x,3.1*s,z);
  const rotor=new T.Group();rotor.position.set(x,2.35*s,z+.82*s);animated.add(rotor);model('windmill',0,0,0,.8*s,Math.PI/2,rotor);rotors.push({mesh:rotor,id:'lung',axis:'z',speed:-.8});
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
 model('stall-green',-4,.05,-9,1.1,.6);
 scope('heart');
 // Heart: broad pump house, paired pistons and a continuous brass manifold.
 cottage(0,-1,2.5,.15,true);
 for(const x of [-.85,.85]){
  cylinder(x,1,-.1,.42,.49,1.8,rose);orb(x,1.96,-.1,.46,0xe2a29a);cylinder(x,1.1,.6,.14,.14,1.5,brass);
  const piston=cylinder(x,1.4,.6,.25,.25,.25,0xe2ca8d,animated);pistons.push({mesh:piston,y:1.4,id:'heart'});
 }
 pipe([[-1.8,.3,1.2],[-1.8,1,1.2],[-.85,1.15,.6],[.85,1.15,.6],[1.8,1,1.2],[1.8,.3,1.2]],.14);
 const badge=orb(0,2.75,.36,.38,0xd06e75);badge.scale.set(1.1,.8,.45);orb(-.19,2.93,.36,.23,0xd06e75);orb(.19,2.93,.36,.23,0xd06e75);
 model('banner-red',1.7,.6,-.9,1.1);model('stall-red',2.5,.05,4.1,1.1,-.6);
 scope('gut');
 // Gut: grain silos, food workshop and a short working packing belt.
 const kitchen=cottage(10,-5,1.8,-.2,true);kitchen.scale.x*=1.25;kitchen.scale.z*=.8;
 for(const [x,z,h] of [[12,-5.8,2.6],[12.8,-4.5,1.9]]){cylinder(x,h/2,z,.52,.58,h,0xdbb66e);make(new T.ConeGeometry(.65,.55,8),wood,x,h+.2,z);rim(x,.5,z,.58,wood);}
 model('stall-green',9.4,.05,-2.1,1.1);
 box(10.7,.28,-2.8,2.6,.28,.65,wood);box(10.7,.45,-2.8,2.65,.08,.58,0xb8b7a1);
 for(let i=0;i<3;i++){const crate=box(9.65+i*.7,.64,-2.8,.38,.28,.36,0xdbb66e,animated);belts.push({mesh:crate,phase:i/3});}
 pipe([[11.8,1.5,-4.8],[11.8,1,-3.4],[11.5,.7,-2.8]],.16,wood);
 scope('kidney');
 // Kidney: open filtration basins beside the river, with a working waterwheel.
 box(10.6,.09,9.2,4.3,.18,4,stone);
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
 box(-6.8,.85,12,3.3,1.7,1.9,rose);const roof=cylinder(-6.8,1.8,12,.98,.98,3.5,ivory);roof.rotation.z=Math.PI/2;
 box(-6.8,.66,10.99,.95,1.3,.08,wood);box(-6.8,.67,10.93,.65,1.1,.04,0x6b7f78);
 for(const x of [-8.5,-5.1]){cylinder(x,1.2,11,.19,.19,2.3,ivory);for(const y of [.25,2.25]){orb(x-.13,y,11,.22,ivory);orb(x+.13,y,11,.22,ivory);}}
 box(-6.8,2.3,10.98,.7,.16,.08,0xd06e75);box(-6.8,2.3,10.97,.16,.7,.08,0xd06e75);
 // Production bays are instanced and follow each actual recruitment order.
 model('cart',-4.5,.05,11.4,.75,.6);model('chimney',-7.9,2.15,12.2,.8);
 scope('lymph');
 // Lymph: a green rotunda with a signal mast and antibody work benches.
 make(new T.CylinderGeometry(1.3,1.45,1.55,8),ivory,-13.6,.8,.5);
 make(new T.ConeGeometry(1.75,1.3,8),green,-13.6,2.1,.5);
 box(-13.6,.6,1.84,.7,1.2,.08,wood);cylinder(-13.6,3.03,.5,.055,.055,.9,brass);
 for(const side of [-1,1]){const branch=cylinder(-13.6+side*.18,3.42,.5,.05,.05,.48,brass);branch.rotation.z=-side*.7;}
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
  for(const r of rotors){const state=facilityState(s,r.id);r.mesh.rotation[r.axis]+=dt*r.speed*output(s,r.id)*state.speed*(state.id==='damage'&&Math.sin(s.time*5)<0?0:1)*(r.id==='lung'&&s.weather.id==='dry'?.55:1);}
  for(const p of pistons)p.mesh.position.y=p.y+Math.sin(s.time*(p.id==='lung'?2:4))*.16*output(s,p.id)*facilityState(s,p.id).speed;
  beltPhase+=dt*.16*facilityState(s,'gut').speed*(s.frontier?.gut.quarantine?.55:1);
  for(const b of belts){b.mesh.visible=s.rawFood>(b.phase*18);b.mesh.position.x=9.5+((beltPhase+b.phase)%1)*2.25;}
  for(const b of born){const busy=s.recruits.length>0;b.mesh.position.y=.85+(busy?Math.sin(s.time*4+b.phase)*.1:0);b.mesh.scale.setScalar(busy?1+Math.sin(s.time*3+b.phase)*.12:1);}
 }};
}
