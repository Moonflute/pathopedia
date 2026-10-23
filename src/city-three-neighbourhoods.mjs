import * as T from './vendor/three/three.module.min.js';
import {CITY_STYLE as S} from './city-three-style.mjs';

// Public rooms reuse shared models and bake into the town's regional meshes.
// The middle cross stays open; tall objects remain inside each reserved lot.
export function createNeighbourhoodCourts({blocks,theme,box,make,cylinder,newModel,fixed,ribbon}){
 const water=theme==='2',stone=water?0xe6d7b7:S.plaza,wood=S.timber;
 function tree(g,x,z,variant=0){
  box(x,.12,z,.9,.2,.9,water?0xc8b18a:0x849a73,g);
  if(newModel?.(variant%2?'tree-cube':'tree-round',x,.2,z,2.25,variant*.7,g,1.4))return;
  cylinder(x,.9,z,.06,.09,1.5,wood,g);
  for(let n=0;n<3;n++)make(new T.IcosahedronGeometry(.58-n*.1,0),S.foliage[(variant+n)%3],x+(n===1?.25:0),1.3+n*.35,z,g);
 }
 function bench(g,x,z,angle=0){
  if(newModel?.('garden-bench',x,.08,z,.55,angle,g,1.3))return;
  const b=new T.Group();b.position.set(x,0,z);b.rotation.y=angle;g.add(b);
  box(0,.34,0,1.3,.12,.35,wood,b);box(0,.62,-.18,1.3,.35,.06,wood,b);
  for(const x of [-.45,.45])box(x,.18,0,.08,.3,.28,S.stone,b);
 }
 function stall(g,x,z,tint){
  const b=new T.Group();b.position.set(x,0,z);g.add(b);
  for(const x of [-.67,.67])for(const z of [-.36,.36])box(x,.68,z,.06,1.2,.06,wood,b);
  box(0,.5,0,1.45,.18,.75,wood,b);
  const canopy=box(0,1.3,0,1.65,.09,1.05,tint,b);canopy.rotation.x=water?.12:0;
  for(const x of [-.52,0,.52])box(x,1.36,0,.23,.035,1.06,0xf4e6c9,b);
  if(!newModel?.('supply-basket',-.36,.6,0,.3,0,b,.4))box(-.36,.69,0,.4,.18,.4,S.brass,b);
  newModel?.('supply-bags',.33,.59,0,.4,0,b,.5);
 }
 function planter(g,x,z,tint=S.sage){
  box(x,.17,z,1.45,.26,.65,water?0xd0b18b:wood,g);box(x,.31,z,1.27,.035,.49,0x82795b,g);
  for(const dx of [-.42,0,.42])make(new T.IcosahedronGeometry(.2,0),tint,x+dx,.48,z,g);
 }
 for(const p of blocks.gardens){
  const g=new T.Group();g.name='district-court-'+p.kind;g.position.set(p.x,0,p.z);g.scale.set(p.w/5.5,1,p.d/4.5);g.userData.district=p.district;fixed.add(g);
  if(p.kind==='grove'){
   g.scale.set(p.w/2.4,1,p.d/2.4);box(0,.055,0,2.35,.08,2.35,water?stone:S.grassLight,g);tree(g,-.25,-.25,p.variant%2);
   newModel?.('garden-shrub',.65,.1,.55,.55,0,g,.6);continue;
  }
  box(0,.043,0,5.5,.07,4.5,water?stone:S.grassLight,g);
  box(0,.088,0,5.25,.025,1.05,stone,g);box(0,.089,0,1.1,.025,4.25,stone,g);
  for(const x of [-2.64,2.64])for(const z of [-1.35,1.35])box(x,.11,z,.12,.12,1.52,S.trim,g);
  for(const z of [-2.14,2.14])for(const x of [-1.65,1.65])box(x,.11,z,1.9,.12,.12,S.trim,g);
  if(water)for(const x of [-.42,.42])box(x,.106,0,.055,.018,4.1,0xbeaa84,g);
  switch(p.kind){
   case 'market':
    stall(g,-1.5,-1.2,water?0xa5634f:S.rose);stall(g,1.5,-1.2,water?0x789c97:S.teal);
    bench(g,-1.4,1.4);planter(g,1.5,1.4,S.rose);break;
   case 'wind': {
    tree(g,-1.7,-1.3,1);tree(g,1.7,1.3,0);bench(g,-1.5,1.4);
    cylinder(1.6,1.15,-1.25,.045,.07,2.1,wood,g);
    const vane=make(new T.ConeGeometry(.27,.95,4),S.teal,1.95,2.06,-1.25,g);vane.rotation.z=-Math.PI/2;
    box(1.6,2.06,-1.25,.09,.48,.08,stone,g);break;
   }
   case 'harvest':
    stall(g,-1.5,-1.2,S.sage);planter(g,1.5,-1.25);planter(g,1.5,1.25,S.rose);
    if(!newModel?.('hay-bale',-1.55,.08,1.2,.65,.2,g,1.15))box(-1.55,.36,1.2,1.05,.6,.75,S.brass,g);
    newModel?.('supply-barrel',-2.2,.08,.8,.48,0,g,.45);break;
   case 'water':
    for(const x of [-1.55,1.55]){
     box(x,.15,-1.2,1.5,.22,1.05,S.stone,g);box(x,.27,-1.2,1.25,.035,.8,S.water,g);
     newModel?.(water?'canal-reed':'garden-flower',x+.45,.28,-1.25,.55,0,g,.4);
    }
    bench(g,-1.5,1.4);tree(g,1.6,1.3,1);break;
   case 'workshop':
    stall(g,-1.5,-1.2,S.lavender);tree(g,1.6,1.3,0);
    if(!newModel?.('repair-planks',1.5,.08,-1.25,.35,0,g,1.35))box(1.5,.22,-1.25,1.4,.25,.75,wood,g);
    if(!newModel?.('table',-1.5,.08,1.2,.55,0,g,1.3))box(-1.5,.4,1.2,1.3,.16,.65,wood,g);
    newModel?.('hammer',-1.5,.66,1.2,.23,.2,g,.4);break;
   case 'cloister':
    for(const x of [-2.3,2.3]){
     for(const z of [-1.65,1.65])box(x,1.15,z,.13,2.1,.13,water?stone:wood,g);
     box(x,2.2,0,.52,.12,3.75,water?0xc49b74:wood,g);
     for(const z of [-1.6,-.8,0,.8,1.6])box(x,2.28,z,.8,.08,.1,wood,g);
    }
    planter(g,-1.5,-1.25);planter(g,1.5,1.25);bench(g,1.5,-1.4,Math.PI);bench(g,-1.5,1.4);break;
   default:
    tree(g,-1.6,-1.3,p.variant%2);tree(g,1.6,1.3,(p.variant+1)%2);bench(g,-1.5,1.4);planter(g,1.5,-1.25);
  }
  const tint={heart:S.rose,lung:S.teal,gut:S.brass,kidney:S.lavender,marrow:S.rose,lymph:S.sage}[p.district];
  cylinder(2.3,.9,-1.8,.04,.065,1.7,wood,g);box(2.3,1.76,-1.8,.3,.32,.3,tint,g);box(2.3,1.96,-1.8,.42,.07,.42,wood,g);
 }
 for(const walk of blocks.walks||[]){ribbon(walk.points,walk.width+.15,water?0xb9a384:S.roadEdge,.06);ribbon(walk.points,walk.width,stone,.075);}
}
