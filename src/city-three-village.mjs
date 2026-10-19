import {createFrontierScene} from './city-three-frontier.mjs';
import {WALLS,WORKSHOP,AIRWAY_PATH} from './city-frontier-data.mjs';
import * as T from './vendor/three/three.module.min.js';
import {mergeGeometries} from './vendor/three/BufferGeometryUtils.js';
import {SITES,CITY_ROADS,INTAKE_ROAD,RIVER_PATH,COTTAGES,groundPoint} from './city-three-layout.mjs';
import {createFacilities} from './city-three-facilities.mjs';
import {workStation} from './city-activity.mjs';

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
 for(const r of CITY_ROADS){ribbon(r.points,r.pulmonary?2:1.6,0xbba59a,.025);ribbon(r.points,r.pulmonary?1.7:1.3,r.pulmonary?0xc99c9d:0xc68788,.035);
  const pts=r.points.map(p=>new T.Vector3(p.x,.08,p.z));
  const line=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),32,.075,4,false),new T.MeshBasicMaterial({color:r.pulmonary?0x4f9aa9:0xc89b63}));supply.add(line);
  if(r.pulmonary)for(const side of [-1,1]){const points=r.points.map((p,i)=>{const a=r.points[Math.max(0,i-1)],b=r.points[Math.min(r.points.length-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z)||1;return {x:p.x-(b.z-a.z)/l*.39*side,z:p.z+(b.x-a.x)/l*.39*side};});ribbon(points,.07,side>0?0xe1b5ad:0x7eafb3,.042);}
 }
 road(INTAKE_ROAD,1.25);road(smooth([[-12,-11],[-13,-6],[-10,-2],[-7,4],[-3,7],[3,7],[6,4],[5,0],[2,-3],[-1,-6]]),.9);
 road(AIRWAY_PATH.map(groundPoint),2.5);
 road(WALLS.map(w=>groundPoint(w.inside)).concat([groundPoint(WALLS[0].inside)]),.65);
 road([{x:-5,z:10},{x:-10,z:10},{x:WORKSHOP.x+1,z:WORKSHOP.z+.5}],.85);
 road([{x:19,z:-4},{x:15,z:-4},{x:11.7,z:-3.4},{x:8,z:-3}],1.2);
 for(const [id,site] of Object.entries(SITES)){
  disc(site.x,site.z,site.detail?2.35:1.65,0xb8b7a1,.041);disc(site.x,site.z,site.detail?2.13:1.5,0xeadfc5,.044);
  const [bx,bz]=site.building;road([{x:site.x,z:site.z},{x:bx,z:bz+1.4}],.9);
  for(const role of ['oxygen','dock',...(id==='lymph'?['produce']:id==='marrow'||id==='gut'?['fabricate']:[])])for(let slot=0;slot<(role==='dock'?1:3);slot++){const bay=workStation(id,role,slot);road([{x:site.x,z:site.z},groundPoint(bay.stand),groundPoint(bay.target)],.48);}
  districts[id]={...site,work:new T.Group(),tower:new T.Group(),level:new T.Group()};animated.add(districts[id].work,districts[id].tower,districts[id].level);
  const work=districts[id].work,siteWork=groundPoint(workStation(id,'build').target);work.position.set(siteWork.x,0,siteWork.z);
  const frame=[];
  const plank=(x,y,z,w,h,d)=>{const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);frame.push(g);};
  for(const x of [-.48,.48]){plank(x,.55,-.4,.08,1.1,.08);plank(x,.27,.4,.08,.54,.08);}
  // An open frame keeps the worker and hammer visible from the game camera.
  plank(0,1.1,-.4,1.1,.08,.08);plank(0,.2,0,.65,.4,.65);
  make(mergeGeometries(frame),0xa68355,0,0,0,work);for(const g of frame)g.dispose();
  work.userData.progress=box(0,.45,0,.64,.22,.65,0xd9b579,work);
  const tower=districts[id].tower;tower.position.set(site.x+2,0,site.z+1.5);cylinder(0,.8,0,.5,.7,1.6,0xd8caae,tower);cylinder(0,1.65,0,.7,.7,.16,0xb19a79,tower);const shield=orb(0,1.95,0,.32,site.color,tower);shield.scale.y=1.3;
  // Upgrade modules are drawn by the bounded frontier instance pools.
 }
 for(const [i,p] of COTTAGES.entries()){cottage(...p,i%3===0);if(i%3===0)model('lantern',p[0]+.85,0,p[1]+.7,.8);}
 const facilities=createFacilities({fixed,animated,make,box,cylinder,orb,model,cottage,road});
 // A protected respiratory portal emerges from the northern hillside.
 const intakeHill=orb(-6,-.7,-21,1,0xb6bda7);intakeHill.scale.set(3.9,3.7,3.2);
 box(-6,1.2,-18.25,2.6,2.4,.13,0x587a72);
 for(const x of [-7.4,-4.6])box(x,.8,-18,.4,1.6,.75,0xe3d3b6);
 const arch=make(new T.TorusGeometry(1.4,.25,6,16,Math.PI),0xe3d3b6,-6,1.5,-18);arch.castShadow=true;
 for(const x of [-7.5,-4.5]){road([{x,z:-18},{x,z:-14.2},{x,z:-11.7}],.24);box(x,.18,-15.7,.25,.36,4.2,0xc0c4a6);}
 cottage(WORKSHOP.x,WORKSHOP.z-1,1.7,.05,true);model('banner-red',WORKSHOP.x+.9,.8,WORKSHOP.z-1,.8);
 box(WORKSHOP.x+1.1,.35,WORKSHOP.z+.5,.7,.7,.65,0xb9a078);
 model('stall-green',15.8,0,-4.8,1.2,0);
 const frontier=createFrontierScene();root.add(frontier.root);
 let sceneryCount=0,seed=9127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const allRoads=[...CITY_ROADS.map(r=>r.points),INTAKE_ROAD,AIRWAY_PATH.map(groundPoint)];
 for(let i=0;i<155;i++){
  const x=-22+rand()*45,z=-21+rand()*43;
  if(x>-8.5&&x<-3.5&&z>-20&&z<-10||x>11&&x<17||Object.values(SITES).some(p=>Math.hypot(x-p.x,z-p.z)<4.1)||COTTAGES.some(p=>Math.hypot(x-p[0],z-p[1])<1.6)||allRoads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<1.5)))continue;
  if(sceneryCount>=36)break;sceneryCount++;
  if(i%4===0)model('rock-small',x,.02,z,.6+rand(),rand()*6);
  else model(i%3?'tree':'tree-high-round',x,0,z,.75+rand()*.55,rand()*6);
 }
 for(const [x,z] of [[-3.1,1],[2.8,5.5],[-11.3,-5.1],[-3.2,-10],[5.6,-4.8]]){
  disc(x,z,.6,0x9fb08b,.05);for(let i=0;i<5;i++)orb(x+Math.sin(i*2)*.4,.17,z+Math.cos(i*2)*.4,.13,i%2?0xe9ca9f:0xd6a6a8);
 }
 // Merge static geometry, including the imported modular buildings, by material.
 fixed.updateMatrixWorld(true);const batches=new Map(),vertexMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.95});
 fixed.traverse(m=>{
  if(!m.isMesh||Array.isArray(m.material))return;
  const original=m.material,colored=!original.map&&m!==ground,material=colored?vertexMaterial:original,key=material.uuid+':'+m.castShadow;
  const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);
  for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(colored){const colors=new Float32Array(g.attributes.position.count*3),c=original.color;for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
  g.clearGroups();if(!batches.has(key))batches.set(key,{material,shadow:m.castShadow,geometries:[]});batches.get(key).geometries.push(g);
 });
 root.remove(fixed);const baked=new T.Group();root.add(baked);
 for(const b of batches.values()){const geo=mergeGeometries(b.geometries),mesh=new T.Mesh(geo,b.material);mesh.castShadow=b.shadow;mesh.receiveShadow=true;baked.add(mesh);for(const g of b.geometries)g.dispose();}
 const retainedMaterials=new Set();root.traverse(m=>{if(m.material)retainedMaterials.add(m.material);});for(const m of materials.values())if(!retainedMaterials.has(m))m.dispose();
 const sources=new Set();fixed.traverse(m=>{if(m.isMesh&&!m.userData.kenney)sources.add(m.geometry);});for(const g of sources)g.dispose();
 return {root,districts,update(s,options){
  supply.visible=options.layer==='supply';
  facilities.update(s);frontier.update(s,options);
  for(const [id,d] of Object.entries(districts)){const state=s.districts[id];d.work.visible=!!state.building;d.tower.visible=state.tower>0;d.tower.scale.y=state.tower>1?1.25:1;const progress=state.building?.remaining==null?0:1-state.building.remaining/state.building.duration;d.work.userData.progress.scale.y=.3+progress*2;d.work.userData.progress.position.y=.4+d.work.userData.progress.scale.y*.11;d.level.children.forEach((m,i)=>m.visible=i<state.level-1);}
  ground.material.color.setHex(s.host==='neutropenia'?0xd7c8a7:0xc8ccb2);
 }};
}
