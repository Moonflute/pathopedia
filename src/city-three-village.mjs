import {PLACEABLES,placeable,transformPoint,compileLayout,occupiedTiles,riverX} from './city-tile-layout.mjs';
import {createFrontierScene} from './city-three-frontier.mjs';
import {WALLS,WORKSHOP,AIRWAY_PATH} from './city-frontier-data.mjs';
import * as T from './vendor/three/three.module.min.js';
import {mergeGeometries} from './vendor/three/BufferGeometryUtils.js';
import {SITES,CITY_ROADS,INTAKE_ROAD,RIVER_PATH,COTTAGES,groundPoint} from './city-three-layout.mjs';
import {createFacilities} from './city-three-facilities.mjs';
import {workStation} from './city-activity.mjs';
import {bundleModel,createBundleWalls} from './city-three-bundle.mjs';

// All decorative meshes are baked once by material. Only working machinery moves.
export function createVillage(assets,layout=null,editId=null,newAssets=null){
 const root=new T.Group(),fixed=new T.Group(),moving=new T.Group(),supply=new T.Group(),districts={};root.add(fixed,moving,supply);supply.visible=false;
 root.userData.bundleModels={};
 let owner=null;const owners={fixed:new Map(),moving:new Map()};
 function scope(id){owner=id;}
 function group(type,id=owner){const parent=type==='fixed'?fixed:moving;if(!id)return parent;let g=owners[type].get(id);if(!g){g=new T.Group();g.userData.layoutId=id;parent.add(g);owners[type].set(id,g);}return g;}
 const animated={add(...objects){group('moving').add(...objects);}};
 const staticParent=p=>p===fixed?group('fixed'):p===animated?group('moving'):p;
 const network=layout?compileLayout(layout):null;
 const roads=network?Object.entries(network.vascular).map(([id,points])=>({id,points,pulmonary:id==='lung'})):CITY_ROADS;
 const intake=network?network.entries.gut:INTAKE_ROAD;
 function applyTransform(g,id,a=layout?.items[id]){if(!a)return;g.visible=a.col>=-40;const d=placeable(id),q=transformPoint({items:{[id]:a}},id,{x:0,z:0});g.position.set(q.x,0,q.z);g.rotation.y=-a.rot*Math.PI/2;}

 const materials=new Map();
 const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.95}));return materials.get(color);};
 const make=(geo,color,x,y,z,parent=fixed)=>{const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;staticParent(parent).add(m);return m;};
 const box=(x,y,z,w,h,d,c,parent)=>make(new T.BoxGeometry(w,h,d),c,x,y,z,parent);
 const cylinder=(x,y,z,rt,rb,h,c,parent)=>make(new T.CylinderGeometry(rt,rb,h,12),c,x,y,z,parent);
 const orb=(x,y,z,r,c,parent)=>make(new T.IcosahedronGeometry(r,1),c,x,y,z,parent);
 const model=(name,x,y,z,size=1,angle=0,parent=fixed)=>{
  const proto=assets[name];if(!proto)return null;const g=proto.clone(true);g.position.set(x,y,z);g.rotation.y=angle;g.scale.setScalar(size);staticParent(parent).add(g);return g;
 };
 const newModel=newAssets?((name,x,y,z,height=1,angle=0,parent=fixed,maxWidth=Infinity)=>{const g=bundleModel(newAssets,name,height,maxWidth);if(!g)return null;g.name='bundle-'+name;root.userData.bundleModels[name]=(root.userData.bundleModels[name]||0)+1;g.position.set(x,y,z);g.rotation.y=angle;staticParent(parent).add(g);return g;}):null;
 const disc=(x,z,r,c,y=.012)=>{const m=make(new T.CircleGeometry(r,32),c,x,y,z);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;};
 function ribbon(points,width,color,height=.025){
  if(points.length<2)return;
  points=points.filter((p,i)=>!i||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.001);
  const rounded=[points[0]];for(let i=1;i<points.length-1;i++){const a=points[i-1],p=points[i],b=points[i+1],la=Math.hypot(p.x-a.x,p.z-a.z),lb=Math.hypot(b.x-p.x,b.z-p.z),dot=((p.x-a.x)*(b.x-p.x)+(p.z-a.z)*(b.z-p.z))/(la*lb);if(Math.abs(dot)>.96){rounded.push(p);continue;}const r=Math.min(.28,la*.22,lb*.22),u={x:p.x-(p.x-a.x)*r/la,z:p.z-(p.z-a.z)*r/la},v={x:p.x+(b.x-p.x)*r/lb,z:p.z+(b.z-p.z)*r/lb};rounded.push(u);for(let j=1;j<=3;j++){const t=j/3;rounded.push({x:(1-t)**2*u.x+2*t*(1-t)*p.x+t*t*v.x,z:(1-t)**2*u.z+2*t*(1-t)*p.z+t*t*v.z});}}rounded.push(points.at(-1));points=rounded;
  const pos=[],idx=[];
  for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z)||1,dx=-(b.z-a.z)/length*width/2,dz=(b.x-a.x)/length*width/2;pos.push(p.x+dx,height,p.z+dz,p.x-dx,height,p.z-dz);if(i<points.length-1){const n=i*2;idx.push(n,n+2,n+1,n+1,n+2,n+3);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));for(let i=0;i<idx.length;i+=3){const [a,b,c]=idx.slice(i,i+3).map(n=>n*3),cross=(pos[b+2]-pos[a+2])*(pos[c]-pos[a])-(pos[b]-pos[a])*(pos[c+2]-pos[a+2]);if(cross<0)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];}geo.setIndex(idx);const normals=new Float32Array(pos.length);for(let i=1;i<normals.length;i+=3)normals[i]=1;geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));const m=make(geo,color,0,0,0);m.castShadow=false;return m;
 }
 const smooth=points=>new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z))).getPoints(90).map(p=>({x:p.x,z:p.z}));
 function road(points,width=1.4){ribbon(points,width+.38,newAssets?0xa4b18e:0xb2b49e,.025);ribbon(points,width,newAssets?0xe0cba5:0xe5dcc5,.035);}
 function cottage(x,z,size=1.5,angle=0,large=false){
  if(newModel){const variant=owner?.startsWith('house-')&&Number(owner.slice(6))%3?'house-b':'house-a',g=newModel(variant,x,.02,z,size*1.8,angle,fixed,size*1.55);g.scale.y*=1.25;return g;}
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;g.scale.setScalar(size);group('fixed').add(g);
  box(0,.08,0,1.12,.16,1.12,0xadae9b,g);
  if(assets.wall){for(let i=0;i<4;i++)model(i===3?'wall-wood-door':i%2?'wall-wood-window-shutters':'wall-window-glass',0,.13,0,1,i*Math.PI/2,g);model(large?'roof-gable':'roof-point',0,1.12,0,1,0,g);model('chimney',-.22,1.37,-.14,.65,0,g);}
  else{box(0,.65,0,1,1.1,1,0xf3e8cc,g);const roof=make(new T.ConeGeometry(.85,.6,4),0xa47368,0,1.5,0,g);roof.rotation.y=Math.PI/4;}
  return g;
 }
 // Ground extends into the landscape: no floating square board or map edge.
 const meadowColor=newAssets?0xb3c499:0xc8ccb2,ground=disc(0,0,100,meadowColor,-.035);ground.name='meadow';
 const terrain=[];
 for(let i=0;i<13;i++){const x=-33+i*5.1,z=-26-Math.sin(i*.8)*5;const hill=orb(x,-2,z,1,newAssets?(i%2?0x9fb28e:0xabbc98):(i%2?0xadb8a0:0xb8bda7));hill.scale.set(5+i%3,5+i%4,4.6);terrain.push(hill);}
 for(let i=0;i<7;i++){const hill=orb(-26-i%2*3,-1,-14+i*6,1,newAssets?0xaabd97:0xb9c2a7);hill.scale.set(5,3.5+i%3,5);terrain.push(hill);}
 const river=smooth(RIVER_PATH);ribbon(river,4.1,0xaeb8a6,-.005);ribbon(river,3.25,0x84b5b4,.004);ribbon(river,1.7,0x94c7c0,.006);
 for(const r of roads.filter(r=>r.points.length>1)){ribbon(r.points,r.pulmonary?2:1.6,newAssets?0xb4a386:0xbba59a,.025);ribbon(r.points,r.pulmonary?1.7:1.3,newAssets?(r.pulmonary?0xb6c2a9:0xd8bda1):(r.pulmonary?0xc99c9d:0xc68788),.035);
  const pts=r.points.map(p=>new T.Vector3(p.x,.08,p.z));
  const line=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),32,.075,4,false),new T.MeshBasicMaterial({color:r.pulmonary?0x4f9aa9:newAssets?0xc77f77:0xc89b63}));supply.add(line);
  if(r.pulmonary)for(const side of [-1,1]){const points=r.points.map((p,i)=>{const a=r.points[Math.max(0,i-1)],b=r.points[Math.min(r.points.length-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z)||1;return {x:p.x-(b.z-a.z)/l*.39*side,z:p.z+(b.x-a.x)/l*.39*side};});ribbon(points,.07,side>0?0xe1b5ad:0x7eafb3,.042);}
 }
 road(intake,1.05);if(network){for(const c of network.connections)if(c.kind==='walk')road(c.points,.65);}else road(smooth([[-12,-11],[-13,-6],[-10,-2],[-7,4],[-3,7],[3,7],[6,4],[5,0],[2,-3],[-1,-6]]),.9);
 road(network?network.entries.airway:AIRWAY_PATH.map(groundPoint),1.8);
 road(WALLS.map(w=>groundPoint(w.inside)).concat([groundPoint(WALLS[0].inside)]),.65);
 if(!layout)road([{x:-5,z:10},{x:-10,z:10},{x:WORKSHOP.x+1,z:WORKSHOP.z+.5}],.85);
 if(!layout)road([{x:19,z:-4},{x:15,z:-4},{x:11.7,z:-3.4},{x:8,z:-3}],1.2);
 for(const [id,site] of Object.entries(SITES)){
  scope(id);
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
 for(const [i,p] of COTTAGES.entries()){scope('house-'+i);cottage(...p,i%3===0);if(i%3===0)model('lantern',p[0]+.85,0,p[1]+.7,.8);}
 const facilities=createFacilities({fixed,animated,make,box,cylinder,orb,model,newModel,cottage,road,scope});
 scope(null);
 // A protected respiratory portal emerges from the northern hillside.
 const intakeHill=orb(-6,-.7,-21,1,0xb6bda7);intakeHill.scale.set(3.9,3.7,3.2);
 if(newModel)newModel('gate',-6,0,-18,3.4,0,fixed,3.6);
 else{box(-6,1.2,-18.25,2.6,2.4,.13,0x587a72);
  for(const x of [-7.4,-4.6])box(x,.8,-18,.4,1.6,.75,0xe3d3b6);
  const arch=make(new T.TorusGeometry(1.4,.25,6,16,Math.PI),0xe3d3b6,-6,1.5,-18);arch.castShadow=true;}
 for(const x of [-7.5,-4.5]){road([{x,z:-18},{x,z:-14.2},{x,z:-11.7}],.24);box(x,.18,-15.7,.25,.36,4.2,0xc0c4a6);}
 scope('workshop');
 if(newModel){
  newModel('workshop',WORKSHOP.x,0,WORKSHOP.z-1,2.8,.05,fixed,3.1);
  newModel('logs',WORKSHOP.x-1.5,.03,WORKSHOP.z+.1,.7,.2,fixed,1.1);
  newModel('crate',WORKSHOP.x+1.1,.03,WORKSHOP.z+.5,.7,.1,fixed,.75);
  newModel('table',WORKSHOP.x+.7,.03,WORKSHOP.z+1.4,.65,0,fixed,1.1);
  newModel('hammer',WORKSHOP.x+.7,.7,WORKSHOP.z+1.4,.24,.6,fixed,.4);
  newModel('bucket',WORKSHOP.x-.7,.03,WORKSHOP.z+1.1,.45,0,fixed,.5);
  newModel('cart',WORKSHOP.x+1.9,.03,WORKSHOP.z+2,.8,.4,fixed,1.5);
  newModel('palisade',WORKSHOP.x-1.9,.02,WORKSHOP.z+1.1,.9,Math.PI/2,fixed,2.4);
 }else{cottage(WORKSHOP.x,WORKSHOP.z-1,1.7,.05,true);box(WORKSHOP.x+1.1,.35,WORKSHOP.z+.5,.7,.7,.65,0xb9a078);}
 model('banner-red',WORKSHOP.x+.9,.8,WORKSHOP.z-1,.8);
 if(newModel){scope('heart');newModel('bench',-2,.04,3.6,.65,.15,fixed,1.5);}
 scope(null);model('stall-green',15.8,0,-4.8,1.2,0);
 const frontier=createFrontierScene({detailedWalls:!!newAssets}),bundleWalls=newAssets?createBundleWalls(newAssets):null;root.add(frontier.root);if(bundleWalls)root.add(bundleWalls.root);
 let sceneryCount=0,seed=9127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const allRoads=[...roads.map(r=>r.points),intake,network?network.entries.airway:AIRWAY_PATH.map(groundPoint)];
 for(let i=0;i<155;i++){
  const x=-22+rand()*45,z=-21+rand()*43;
  if(x>-8.5&&x<-3.5&&z>-20&&z<-10||x>11&&x<17||Object.values(SITES).some(p=>Math.hypot(x-p.x,z-p.z)<4.1)||COTTAGES.some(p=>Math.hypot(x-p[0],z-p[1])<1.6)||allRoads.some(r=>r.some(p=>Math.hypot(x-p.x,z-p.z)<1.5)))continue;
  if(layout&&Object.entries(layout.items).some(([id,a])=>occupiedTiles(id,a).some(p=>Math.abs(x-p.col)<1&&Math.abs(z-p.row)<1)))continue;
  if(sceneryCount>=26)break;sceneryCount++;
  if(i%4===0)model('rock-small',x,.02,z,.6+rand(),rand()*6);
  else if(newModel)newModel(i%5===0?'bush':i%3?'tree-cube':'tree-round',x,0,z,i%5===0?.65:2.2+rand()*.8,rand()*6,fixed,2.5);
  else model(i%3?'tree':'tree-high-round',x,0,z,.75+rand()*.55,rand()*6);
 }
 for(const [x,z] of [[-3.1,1],[2.8,5.5],[-11.3,-5.1],[-3.2,-10],[5.6,-4.8]]){
  disc(x,z,.6,0x9fb08b,.05);for(let i=0;i<5;i++)orb(x+Math.sin(i*2)*.4,.17,z+Math.cos(i*2)*.4,.13,i%2?0xe9ca9f:0xd6a6a8);
 }
 // Subtle square paving uses the same tiny grid as placement, not one mesh per tile.
 if(layout){for(const d of PLACEABLES){scope(d.id);const [x0,z0,x1,z1]=d.bounds;for(let x=x0;x<x1;x++)for(let z=z0;z<z1;z++){const tile=make(new T.PlaneGeometry(.97,.97),((x+z)&1)?0xd5d5bd:0xd9d8c1,d.origin.x+x,.017,d.origin.z+z);tile.rotation.x=-Math.PI/2;tile.castShadow=false;}}
 scope(null);const water=transformPoint(layout,'kidney',{x:13,z:9});const drain=[{x:riverX(water.z),z:water.z},water];ribbon(drain,.6,0xb4bcb0,.14);ribbon(drain,.38,0x91bfba,.15);
 }
 for(const [id,g] of owners.fixed)applyTransform(g,id);for(const [id,g] of owners.moving)applyTransform(g,id);
 // Selected geometry stays separate during editing, so dragging moves it without rebuilding.
 const preview=owners.fixed.get(editId);if(preview){fixed.remove(preview);root.add(preview);}
 // Merge static geometry, including the imported modular buildings, by material.
 fixed.updateMatrixWorld(true);const batches=new Map(),vertexMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.95});
 fixed.traverse(m=>{
  if(!m.isMesh||Array.isArray(m.material))return;let ancestor=m;while(ancestor){if(!ancestor.visible)return;ancestor=ancestor.parent;}
  const original=m.material,colored=!original.map&&m!==ground,material=colored?vertexMaterial:original,key=material.uuid+':'+m.castShadow;
  const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);
  for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  if(colored){const colors=new Float32Array(g.attributes.position.count*3),c=original.color;for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}
  g.clearGroups();if(!batches.has(key))batches.set(key,{material,shadow:m.castShadow,geometries:[]});batches.get(key).geometries.push(g);
 });
 root.remove(fixed);const baked=new T.Group();root.add(baked);
 for(const b of batches.values()){const geo=mergeGeometries(b.geometries),mesh=new T.Mesh(geo,b.material);mesh.castShadow=b.shadow;mesh.receiveShadow=true;baked.add(mesh);for(const g of b.geometries)g.dispose();}
 // Bake the selected facility in its own local frame: only two small meshes
 // move during a drag, rather than dozens of imported wall pieces and tiles.
 if(preview){const visible=preview.visible;preview.visible=true;preview.updateMatrixWorld(true);const inverse=preview.matrixWorld.clone().invert(),parts=new Map(),discard=new Set();
  preview.traverse(m=>{if(!m.isMesh||Array.isArray(m.material))return;const original=m.material,colored=!original.map,material=colored?vertexMaterial:original,key=material.uuid+':'+m.castShadow;
   const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld).applyMatrix4(inverse);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
   if(colored){const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=original.color.r;colors[i+1]=original.color.g;colors[i+2]=original.color.b;}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}g.clearGroups();if(!parts.has(key))parts.set(key,{material,shadow:m.castShadow,geometries:[]});parts.get(key).geometries.push(g);if(!m.userData.kenney&&!m.userData.cityAsset)discard.add(m.geometry);
  });preview.clear();for(const p of parts.values()){const g=mergeGeometries(p.geometries),m=new T.Mesh(g,p.material);m.castShadow=p.shadow;m.receiveShadow=true;preview.add(m);for(const part of p.geometries)part.dispose();}for(const g of discard)g.dispose();preview.visible=visible;
 }
 const retainedMaterials=new Set();root.traverse(m=>{if(m.material)retainedMaterials.add(m.material);});for(const m of materials.values())if(!retainedMaterials.has(m))m.dispose();
 const sources=new Set();fixed.traverse(m=>{if(m.isMesh&&!m.userData.kenney&&!m.userData.cityAsset)sources.add(m.geometry);});for(const g of sources)g.dispose();
 return {root,districts,movePreview(a){if(preview)applyTransform(preview,editId,a);const g=owners.moving.get(editId);if(g)applyTransform(g,editId,a);},dispose(){const gs=new Set(),ms=new Set();root.traverse(m=>{if(m.isInstancedMesh)m.dispose();if(m.geometry&&!m.userData.kenney&&!m.userData.cityAsset)gs.add(m.geometry);if(m.material&&!m.userData.kenney&&!m.userData.cityAsset)ms.add(m.material);});for(const g of gs)g.dispose();for(const m of ms)if(!m.map)m.dispose();},update(s,options){
  moving.visible=true;frontier.root.visible=true;supply.visible=!options.editor&&options.layer==='supply';
  facilities.update(s);frontier.update(s,options);bundleWalls?.update(s,options);
  for(const [id,d] of Object.entries(districts)){const state=s.districts[id];d.work.visible=!!state.building;d.tower.visible=state.tower>0;d.tower.scale.y=state.tower>1?1.25:1;const progress=state.building?.remaining==null?0:1-state.building.remaining/state.building.duration;d.work.userData.progress.scale.y=.3+progress*2;d.work.userData.progress.position.y=.4+d.work.userData.progress.scale.y*.11;d.level.children.forEach((m,i)=>m.visible=i<state.level-1);}
  ground.material.color.setHex(s.host==='neutropenia'?0xd7c8a7:meadowColor);
 }};
}
