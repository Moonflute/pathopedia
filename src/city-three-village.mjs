import * as T from './vendor/three/three.module.min.js';
import {mergeGeometries} from './vendor/three/BufferGeometryUtils.js';
import {SITES,CITY_ROADS,INTAKE_ROAD,RIVER_PATH,COTTAGES,groundPoint} from './city-three-layout.mjs';
import {ENTRANCE,districtDef} from './city-data.mjs';
import {createFacilities} from './city-three-facilities.mjs';

// All decorative meshes are baked once by material. Only working machinery moves.
export function createVillage(assets){
 const root=new T.Group(),fixed=new T.Group(),animated=new T.Group(),supply=new T.Group(),districts={};root.add(fixed,animated,supply);supply.visible=false;
 const materials=new Map();
 const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.95}));return materials.get(color);};
 const make=(geo,color,x,y,z,parent=fixed)=>{const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(x,y,z,w,h,d,c,parent)=>make(new T.BoxGeometry(w,h,d),c,x,y,z,parent);
 const cylinder=(x,y,z,rt,rb,h,c,parent)=>make(new T.CylinderGeometry(rt,rb,h,12),c,x,y,z,parent);
 const orb=(x,y,z,r,c,parent)=>make(new T.IcosahedronGeometry(r,1),c,x,y,z,parent);
 const model=(name,x,y,z,size=1,angle=0,parent=fixed)=>{
  const proto=assets[name];if(!proto)return null;const g=proto.clone(true);g.position.set(x,y,z);g.rotation.y=angle;g.scale.setScalar(size);parent.add(g);return g;
 };
 const disc=(x,z,r,c,y=.012)=>{const m=make(new T.CircleGeometry(r,32),c,x,y,z);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;};
 function ribbon(points,width,color,height=.025){
  const pos=[],idx=[];
  for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z)||1,dx=-(b.z-a.z)/length*width/2,dz=(b.x-a.x)/length*width/2;pos.push(p.x+dx,height,p.z+dz,p.x-dx,height,p.z-dz);if(i<points.length-1){const n=i*2;idx.push(n,n+2,n+1,n+1,n+2,n+3);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();const m=make(geo,color,0,0,0);m.castShadow=false;return m;
 }
 const smooth=points=>new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z))).getPoints(90).map(p=>({x:p.x,z:p.z}));
 function road(points,width=1.4){ribbon(points,width+.38,0xb2b49e,.025);ribbon(points,width,0xe5dcc5,.035);}
 function cottage(x,z,size=1.5,angle=0,large=false){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;g.scale.setScalar(size);fixed.add(g);
  box(0,.08,0,1.12,.16,1.12,0xadae9b,g);
  if(assets.wall){for(let i=0;i<4;i++)model(i===3?'wall-wood-door':i%2?'wall-wood-window-shutters':'wall-window-glass',0,.13,0,1,i*Math.PI/2,g);model(large?'roof-gable':'roof-point',0,1.12,0,1,0,g);model('chimney',-.22,1.37,-.14,.65,0,g);}
  else{box(0,.65,0,1,1.1,1,0xf3e8cc,g);const roof=make(new T.ConeGeometry(.85,.6,4),0xa47368,0,1.5,0,g);roof.rotation.y=Math.PI/4;}
  return g;
 }
 // Ground extends into the landscape: no floating square board or map edge.
 const ground=disc(0,0,100,0xc8ccb2,-.035);ground.name='meadow';
 const terrain=[];
 for(let i=0;i<13;i++){const x=-33+i*5.1,z=-26-Math.sin(i*.8)*5;const hill=orb(x,-2,z,1,i%2?0xadb8a0:0xb8bda7);hill.scale.set(5+i%3,5+i%4,4.6);terrain.push(hill);}
 for(let i=0;i<7;i++){const hill=orb(-26-i%2*3,-1,-14+i*6,1,0xb9c2a7);hill.scale.set(5,3.5+i%3,5);terrain.push(hill);}
 const river=smooth(RIVER_PATH);ribbon(river,4.1,0xaeb8a6,-.005);ribbon(river,3.25,0x84b5b4,.004);ribbon(river,1.7,0x94c7c0,.006);
 for(const r of CITY_ROADS){road(r.points,r.pulmonary?1.8:1.35);
  const pts=r.points.map(p=>new T.Vector3(p.x,.08,p.z));
  const line=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),32,.075,4,false),new T.MeshBasicMaterial({color:r.pulmonary?0x4f9aa9:0xc89b63}));supply.add(line);
  if(r.pulmonary)for(const side of [-1,1]){const points=r.points.map((p,i)=>{const a=r.points[Math.max(0,i-1)],b=r.points[Math.min(r.points.length-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z)||1;return {x:p.x-(b.z-a.z)/l*.39*side,z:p.z+(b.x-a.x)/l*.39*side};});ribbon(points,.07,side>0?0xbc9b94:0x91b0b1,.042);}
 }
 road(INTAKE_ROAD,1.25);road(smooth([[-12,-11],[-13,-6],[-10,-2],[-7,4],[-3,7],[3,7],[6,4],[5,0],[2,-3],[-1,-6]]),.9);
 const entrance=groundPoint(ENTRANCE);road(smooth([[entrance.x-1,entrance.z-5],[entrance.x,entrance.z],[-7.6,-10],[-6,-7]]),1.6);
 for(const [id,site] of Object.entries(SITES)){
  disc(site.x,site.z,site.detail?2.35:1.65,0xb8b7a1,.041);disc(site.x,site.z,site.detail?2.13:1.5,0xeadfc5,.044);
  const [bx,bz]=site.building;road([{x:site.x,z:site.z},{x:bx,z:bz}],.9);
  districts[id]={...site,work:new T.Group(),tower:new T.Group(),level:new T.Group()};animated.add(districts[id].work,districts[id].tower,districts[id].level);
  const work=districts[id].work,def=districtDef(id),siteWork=groundPoint({x:def.x+25,y:def.y+38});work.position.set(siteWork.x+.6,0,siteWork.z);
  for(const x of [-.55,.55])for(const z of [-.55,.55])box(x,1,z,.09,2,.09,0xa68355,work);
  box(0,1.65,0,1.35,.1,1.3,0xc0a06b,work);box(0,.2,0,.7,.4,.7,0xd9b579,work);
  const hammer=box(.7,1.2,.2,.12,.7,.12,0xb28553,work);box(.7,1.6,.2,.45,.15,.2,0x819498,work);work.userData.hammer=hammer;
  const tower=districts[id].tower;tower.position.set(site.x+2,0,site.z+1.5);cylinder(0,.8,0,.5,.7,1.6,0xd8caae,tower);cylinder(0,1.65,0,.7,.7,.16,0xb19a79,tower);const shield=orb(0,1.95,0,.32,site.color,tower);shield.scale.y=1.3;
  for(let i=0;i<3;i++){const extra=cylinder(bx+1.6+i*.5,.35,bz-1,.18,.2,.7,site.color,districts[id].level);extra.visible=false;}
 }
 for(const [i,p] of COTTAGES.entries()){cottage(...p,i%3===0);if(i%3===0)model('lantern',p[0]+.85,0,p[1]+.7,.8);}
 const facilities=createFacilities({fixed,animated,make,box,cylinder,orb,model,cottage,road});
 // Gate, palisade, small gardens and trees integrate the perimeter into the valley.
 for(let i=0;i<10;i++)model('fence',-15+i*1.65,.05,-13.8+Math.sin(i*.5)*.8,1.7);
 for(const x of [-9.4,-7.2]){cylinder(x,1,-14.3,.42,.55,2,0xe1d4b6);make(new T.ConeGeometry(.65,.7,6),0x779f9c,x,2.3,-14.3);}
 box(-8.3,1.8,-14.3,2.1,.2,.25,0xb59b73);
 let sceneryCount=0,seed=9127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const allRoads=[...CITY_ROADS.map(r=>r.points),INTAKE_ROAD];
 for(let i=0;i<155;i++){
  const x=-22+rand()*45,z=-21+rand()*43;
  if(x>11&&x<17||Object.values(SITES).some(p=>Math.hypot(x-p.x,z-p.z)<4.1)||COTTAGES.some(p=>Math.hypot(x-p[0],z-p[1])<1.6)||allRoads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<1.5)))continue;
  if(sceneryCount>=50)break;sceneryCount++;
  if(i%4===0)model('rock-small',x,.02,z,.6+rand(),rand()*6);
  else model(i%3?'tree':'tree-high-round',x,0,z,.75+rand()*.55,rand()*6);
 }
 for(const [x,z] of [[-3.1,1],[2.8,5.5],[-11.3,-5.1],[-3.2,-10],[5.6,-4.8]]){
  disc(x,z,.6,0x9fb08b,.05);for(let i=0;i<5;i++)orb(x+Math.sin(i*2)*.4,.17,z+Math.cos(i*2)*.4,.13,i%2?0xe9ca9f:0xd6a6a8);
 }
 // Merge static geometry, including the imported modular buildings, by material.
 fixed.updateMatrixWorld(true);const batches=new Map();
 fixed.traverse(m=>{if(!m.isMesh)return;const material=m.material;if(Array.isArray(material))return;const key=material.uuid+':'+m.castShadow;const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone());g.applyMatrix4(m.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));g.clearGroups();if(!batches.has(key))batches.set(key,{material,shadow:m.castShadow,geometries:[]});batches.get(key).geometries.push(g);});
 root.remove(fixed);const baked=new T.Group();root.add(baked);
 for(const b of batches.values()){const geo=mergeGeometries(b.geometries);const mesh=new T.Mesh(geo,b.material);mesh.castShadow=b.shadow;mesh.receiveShadow=true;baked.add(mesh);for(const g of b.geometries)g.dispose();}
 const sources=new Set();fixed.traverse(m=>{if(m.isMesh&&!m.userData.kenney)sources.add(m.geometry);});for(const g of sources)g.dispose();
 return {root,districts,update(s,options){
  supply.visible=options.layer==='supply';
  const t=s.time;
  facilities.update(s);
  for(const [id,d] of Object.entries(districts)){const state=s.districts[id];d.work.visible=!!state.building;d.tower.visible=state.tower>0;d.tower.scale.y=state.tower>1?1.25:1;d.work.userData.hammer.rotation.z=state.building?.remaining!=null&&s.cells.some(c=>c.buildSite===id&&c.task==='시설 건설')?Math.sin(t*9)*.7:0;d.level.children.forEach((m,i)=>m.visible=i<state.level-1);}
  ground.material.color.setHex(s.host==='neutropenia'?0xd7c8a7:0xc8ccb2);
 }};
}
