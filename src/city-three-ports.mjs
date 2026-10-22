import * as T from './vendor/three/three.module.min.js';
import {CITY_ENTRIES} from './city-world.mjs';
import {compileLayout} from './city-tile-layout.mjs';
import {entryFlowPoint} from './city-three-frontier.mjs';
import {entryTrackHeight} from './city-entry-tracks.mjs';
import {output} from './city-engine.mjs';

// Maritime food intake and a wind-driven respiratory inlet use the same city
// materials. Cargo unloading is driven by the real raw-supply shipment clock.
export function createCityPorts({layout,make,box,cylinder,model,newModel=null,fixed,moving}){
 const mouth=CITY_ENTRIES.gut.mouth,wood=0xad8860,ivory=0xe9d7b6,teal=0x628f84;
 const pier=new T.Group();pier.position.set(mouth.x,0,mouth.z);fixed.add(pier);
 box(2,.12,0,5,.32,3.1,wood,pier);box(2.7,.12,2,3.6,.32,1.1,wood,pier);
 for(let x=0;x<4.6;x+=.35)box(x,.3,0,.055,.025,3.05,0xd4b88c,pier);
 for(const x of [0,1.8,4.3])for(const z of [-1.3,1.3]){cylinder(x,.18,z,.1,.13,1,0x796e58,pier);cylinder(x,.72,z,.17,.17,.12,ivory,pier);}
 box(-.6,.68,-2.2,2.2,1.35,1.2,ivory,pier);const roof=make(new T.ConeGeometry(1.7,.65,4),0xad6a4f,-.6,1.65,-2.2,pier);roof.scale.z=.68;roof.rotation.y=Math.PI/4;
 box(-.6,.7,-1.58,.65,.65,.03,teal,pier);
 if(!newModel?.('harbour-crane',2.8,.3,1.1,3.2,0,pier,2.7)){cylinder(2,1.6,1.1,.12,.16,3.2,wood,pier);box(2.8,3.1,1.1,2.2,.17,.2,wood,pier);cylinder(3.7,2.3,1.1,.035,.035,1.6,0x6d7466,pier);}
 for(const [i,[x,z]] of [[.3,.7],[1.3,-.6]].entries())if(!newModel?.(i?'supply-basket':'supply-bags',x,.3,z,.62,0,pier,.75)){box(x,.61,z,.7,.65,.65,0xc5a06b,pier);box(x,.61,z,.05,.67,.68,ivory,pier);}
 newModel?.('supply-barrel',-.6,.3,.55,.75,0,pier,.65);
 newModel?.('hay-bale',2.7,.3,-.6,.55,0,pier,.8);
 model('lantern',mouth.x-.8,.02,mouth.z+2,.85);
 const ship=new T.Group();moving.add(ship);ship.name='food-cargo-ship';
 const boat=newModel?.('harbour-boat',0,-.2,0,.95,0,ship,4.9);
 if(boat){if(boat.userData.size.z>boat.userData.size.x)boat.rotation.y=Math.PI/2;newModel('harbour-anchor',-1.5,.1,.65,.48,.2,ship,.35);}
 else{const hull=make(new T.SphereGeometry(1,10,6),0x675c4c,0,.04,0,ship);hull.scale.set(2.6,.42,.88);box(0,.32,0,4.4,.12,1.35,0xc09e6d,ship);}
 box(-1.4,.7,0,.9,.8,1,ivory,ship);box(-1.4,1.15,0,1.1,.13,1.2,teal,ship);box(-1.4,.8,.51,.52,.24,.03,0x649c9b,ship);
 cylinder(-1.8,1.5,0,.06,.07,1.6,wood,ship);box(-1.5,2.1,0,.6,.35,.035,0xe3bb72,ship);
 for(let n=0;n<3;n++)if(!newModel?.('supply-bags',n*.7,.38,0,.5,n*.5,ship,.65)){box(n*.7,.65,0,.6,.55,.75,0xcba575,ship);box(n*.7,.65,0,.07,.57,.78,ivory,ship);}
 const cargo=new T.Group();moving.add(cargo);cargo.name='harbour-unloading';if(!newModel?.('supply-bags',0,0,0,.6,0,cargo,.65))box(0,.3,0,.65,.6,.65,0xd9b777,cargo);
 const wake=new T.Mesh(new T.TorusGeometry(1,.035,4,24),new T.MeshBasicMaterial({color:0xd6ece0,transparent:true,opacity:.65,depthWrite:false}));wake.rotation.x=Math.PI/2;moving.add(wake);
 const wind=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xf0fff5,transparent:true,opacity:.75,depthWrite:false}),36);
 const gusts=new T.InstancedMesh(new T.TorusGeometry(1,.045,4,28,Math.PI*1.45),new T.MeshBasicMaterial({color:0xe1fff2,transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide}),5);
 wind.name='respiratory-wind';gusts.name='respiratory-gusts';for(const mesh of [wind,gusts]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);moving.add(mesh);}
 const dummy=new T.Object3D(),normal=new T.Vector3(0,0,1),direction=new T.Vector3(),airway=layout?compileLayout(layout).entries.airway:[];
 let last=null,airClock=0;
 return {update(s){
  const dt=last==null?0:Math.max(0,Math.min(.3,s.time-last));last=s.time;const rate=output(s,'lung')*(s.weather.id==='dry'?.55:1);airClock+=dt*rate*.16;
  wind.visible=gusts.visible=airway.length>1&&rate>.02;
  if(wind.visible){
   for(let n=0;n<36;n++){const q=(airClock+n/36)%1,p=entryFlowPoint(airway,q),lane=(n%5-2)*.46;
    dummy.position.set(p.x-p.dz*lane,entryTrackHeight(airway,p)+.75+Math.sin(q*Math.PI*3+n)*.18,p.z+p.dx*lane);dummy.rotation.set(0,Math.atan2(p.dx,p.dz),0);dummy.scale.set(.075,.06,1.5+n%3*.7);dummy.updateMatrix();wind.setMatrixAt(n,dummy.matrix);
   }
   for(let n=0;n<5;n++){const q=(airClock+n/5)%1,p=entryFlowPoint(airway,q);dummy.position.set(p.x,entryTrackHeight(airway,p)+1.1,p.z);direction.set(p.dx,0,p.dz);dummy.quaternion.setFromUnitVectors(normal,direction);dummy.rotateZ(q*2);dummy.scale.setScalar(.8+Math.sin(q*Math.PI)*.3);dummy.updateMatrix();gusts.setMatrixAt(n,dummy.matrix);}
   wind.instanceMatrix.needsUpdate=gusts.instanceMatrix.needsUpdate=true;
  }
  const shipment=s.shipments.filter(sh=>sh.kind==='raw'&&sh.harbourAt!=null&&s.time-sh.harbourAt<8).sort((a,b)=>b.harbourAt-a.harbourAt)[0];
  ship.visible=cargo.visible=wake.visible=!!shipment;if(!shipment)return;
  const age=s.time-shipment.harbourAt,offset=age<3?(1-age/3)*10:age<5?0:(age-5)/3*10;
  ship.position.set(mouth.x+3.1+offset,.02+Math.sin(s.time*1.7)*.035,mouth.z+3.5);ship.rotation.y=age<5?Math.PI:0;
  wake.position.set(ship.position.x,0,ship.position.z);wake.scale.set(3.1,.95,1);cargo.visible=age>=3&&age<5;
  if(cargo.visible){const q=(age-3)/2;cargo.position.set(mouth.x+3.1-q*.7,.8+Math.sin(q*Math.PI)*1.8,mouth.z+3.5-q*3.5);}
 }};
}
