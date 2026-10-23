import * as T from './vendor/three/three.module.min.js';
import {bundleModel} from './city-three-bundle.mjs';
import {HOME_LOOPS,HOME_SIGNALS,HOME_PHASES,homeSites} from './city-homeostasis-data.mjs';
import {homePoint,homePacketPosition,homeTransferPath} from './city-homeostasis-paths.mjs';
import {WALLS} from './city-frontier-data.mjs';
import {CITY_ENTRIES} from './city-world.mjs';

export function createHomeostasisScene({layout,theme='1',bundle=null,map=null,onSelect=()=>{}}){
 const root=new T.Group(),buildings=new T.Group(),dynamic=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),up=new T.Vector3(0,1,0),delta=new T.Vector3();
 root.name='homeostasis-neighbourhoods';root.add(buildings,dynamic);const sites=homeSites(layout),pools={},materials=new Set(),geometries=new Set(),tags=[];
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1}),bright=new T.MeshBasicMaterial({color:0xffffff}),soft=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false});materials.add(material);materials.add(bright);materials.add(soft);
 function pool(id,g,n,parent=dynamic,m=material){geometries.add(g);const mesh=new T.InstancedMesh(g,m,n);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.name='home-'+id;parent.add(mesh);pools[id]=mesh;return mesh;}
 pool('masonry',new T.BoxGeometry(1,1,1),230,buildings);pool('roofs',new T.ConeGeometry(1,1,4),40,buildings);
 pool('work',new T.BoxGeometry(1,1,1),160);pool('packets',new T.IcosahedronGeometry(1,0),160,dynamic,bright);pool('signals',new T.CylinderGeometry(1,1,1,5),2400,dynamic,soft);pool('rings',new T.TorusGeometry(1,.06,4,24),72,dynamic,soft);pool('vapour',new T.IcosahedronGeometry(1,1),72,dynamic,soft);
 function put(id,x,y,z,sx,sy,sz,tint,rx=0,ry=0){const m=pools[id],i=m.count;if(i>=m.instanceMatrix.count)return;dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);m.setColorAt(i,color.set(tint));m.count++;}
 function line(a,b,y,width,tint){const m=pools.signals,i=m.count;if(i>=m.instanceMatrix.count)return;delta.set(b.x-a.x,0,b.z-a.z);if(delta.length()<.01)return;dummy.position.set((a.x+b.x)/2,y,(a.z+b.z)/2);dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());dummy.scale.set(width,delta.length(),width);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);m.setColorAt(i,color.set(tint));m.count++;}
 for(const o of sites){
  put('masonry',o.x,.06,o.z-3.4,6.6,.12,5.2,theme==='2'?0xd9c8aa:0xd8d7bb);
  const model=bundleModel(bundle,o.model,o.id==='brain'?3.9:3.1,4.8);
  if(model){model.position.set(o.x,.12,o.z-3.5);buildings.add(model);}
  else{put('masonry',o.x,1.2,o.z-3.5,3.9,2.2,3,0xe6d5b9);put('roofs',o.x,2.9,o.z-3.5,3.05,1.35,2.4,o.color,0,Math.PI/4);for(const x of [-1.1,1.1])put('masonry',o.x+x,1.35,o.z-1.97,.5,.65,.06,0x6c8e89);put('masonry',o.x,.7,o.z-1.94,.68,1.25,.08,0x987a5b);}
  // Low courtyard fittings identify each working neighbourhood at human scale.
  put('masonry',o.x-2.5,.48,o.z-1.7,.75,.85,.85,o.color);put('masonry',o.x+2.5,.45,o.z-1.7,.75,.8,.85,0xa9bd94);
  put('masonry',o.x,.07,o.z-.9,1.1,.14,1.6,0xc5b998);
  if(map){const b=document.createElement('button');b.type='button';b.className='cc-home-marker';b.style.setProperty('--home-color',o.color);b.setAttribute('aria-label',o.name+' 항상성 관찰');b.addEventListener('click',()=>onSelect('home:'+o.id));b.hidden=true;map.append(b);tags.push({o,b});}
 }
 for(const id of ['masonry','roofs']){pools[id].instanceMatrix.needsUpdate=true;pools[id].instanceColor&&(pools[id].instanceColor.needsUpdate=true);}
 let last=-Infinity,run=null,selectedLoop=null;
 const point=id=>homePoint(layout,id),projected=new T.Vector3();
 return {root,buildings,pools,update(s,selected=null){
  selectedLoop=selected;if(!s.homeostasis)return;const h=s.homeostasis;
  if(run===s&&s.time>=last&&s.time-last<.1&&root.userData.loop===selected)return;run=s;last=s.time;root.userData.loop=selected;
  for(const [id,m] of Object.entries(pools))if(!['masonry','roofs'].includes(id))m.count=0;
  const loop=HOME_LOOPS.find(l=>l.id===selected);
  if(loop?.id==='digestion')for(const [from,kind,tint] of [['pancreas','enzyme','#d9b567'],['liver','bile','#aabd76']]){const path=homeTransferPath(layout,theme,from,'gut',kind);for(let i=1;i<path.points.length;i++)line(path.points[i-1],path.points[i],.85,.07,tint);}
  if(loop)for(let n=1;n<loop.sites.length;n++){
   const path=homeTransferPath(layout,theme,loop.sites[n-1],loop.sites[n]);for(let i=1;i<path.points.length;i++)line(path.points[i-1],path.points[i],.32,.055,loop.color);
  }
  for(const p of h.packets){
   const signal=HOME_SIGNALS[p.kind];if(signal&&selected&&p.loop!==selected)continue;
   const at=homePacketPosition(layout,theme,p),tint=signal?.color||{nutrient:'#e0bd67',water:'#65bfdd',calcium:'#d6d4bd',heme:'#ad7485',iron:'#c99964',bile:'#b4cc76',enzyme:'#efd184'}[p.kind];
   if(signal&&p.amount<.05)continue;
   const radius=selected===p.loop?.32:.18;put('packets',at.x,signal?.neural?1.05:['bile','enzyme'].includes(p.kind)?.85:.48,at.z,radius,radius*1.25,radius,tint);
  }
  for(const o of sites){const state=h.organs[o.id],active=loop?.sites.includes(o.id),phase=h.loops[o.loop].phase;
   if(active||phase!=='stable'){const r=1.05+(s.time*.33%1)*1.3;put('rings',o.x,.17,o.z,r,r,r,o.color,Math.PI/2);}
   put('work',o.x,3.8,o.z-3.5,3,.09,.17,0xc9cbb6);put('work',o.x-1.5+1.5*state.oxygen/100,3.81,o.z-3.5,Math.max(.02,3*state.oxygen/100),.13,.2,state.oxygen<25?0xc98569:0x89b5ab);
  }
  const liver=point('liver'),fat=point('fat'),bone=point('bone'),muscle=point('muscle'),pancreas=point('pancreas'),kidney=point('kidney');
  for(let i=0;i<12;i++){const x=liver.x-2+(i%4)*1.2,z=liver.z-1+Math.floor(i/4)*.65;put('work',x,.32,z,.54,.25+Math.min(1,h.glycogen/120)*.55,.5,0xd5b46e);}
  for(let i=0;i<9;i++)put('work',fat.x-1.6+i%3*1.6,.35,fat.z-1+Math.floor(i/3)*.65,.8,.3+h.fat/200,.5,0xd5bd73);
  for(let i=0;i<10;i++)put('work',bone.x-2+i%5,.35,bone.z-1+Math.floor(i/5)*.7,.65,.15+h.boneMineral/150,.5,0xdbd5bd);
  for(let i=0;i<4;i++)put('work',muscle.x-1.8+i*1.2,.5+Math.abs(Math.sin(s.time*(2+h.exercise*5)+i))*(.06+h.exercise*.3),muscle.z-1,.5,.5,.5,0xbb8d79);
  put('work',pancreas.x-1,.55,pancreas.z-1,.6,.2+h.hormones.insulin,.6,0xe4b954);put('work',pancreas.x+1,.55,pancreas.z-1,.6,.2+h.hormones.glucagon,.6,0xd58a71);
  put('work',liver.x+2,.4,liver.z-1,.65,.1+h.digestive.bileStore/55,.6,0xa8b968);
  // ADH opens a return stream into the renal blood supply; urine remains separate.
  for(let i=0;i<Math.ceil(h.effectors.adh*9);i++){const t=(s.time*.22+i/9)%1;put('packets',kidney.x-2+t*3,.5,kidney.z+1,.14,.14,.14,0x6ac1d2);}
  const lung=point('lung'),air=CITY_ENTRIES.airway.portal;
  for(let i=0;i<12;i++){const t=(s.time*.09*h.ventilation+i/12)%1,x=lung.x+(air.x-lung.x)*t,z=lung.z+(air.z-lung.z)*t;put('vapour',x+.6*Math.sin(i),1.8+t, z,.18+t*.16,.12,.38,0xbbc4c6);}
  if(h.sweat>.08)for(const w of WALLS){const t=(s.time*.5+w.id*.17)%1;put('vapour',w.x-w.nx*1.5,1+t,w.z-w.nz*1.5,.16,.22,.16,0x8dc6d5);}
  for(const [id,m] of Object.entries(pools))if(!['masonry','roofs'].includes(id)){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 },project(s,camera,width,height,inset,hidden=false,reserved=[]){
  const h=s.homeostasis,loop=HOME_LOOPS.find(l=>l.id===selectedLoop),max=loop?(width<761?3:6):(width<761?1:3),occupied=[];let shown=0;
  const sorted=[...tags].sort((a,b)=>(loop?.sites.includes(b.o.id)?2:0)-(loop?.sites.includes(a.o.id)?2:0));
  for(const {o,b} of sorted){
   b.hidden=true;if(hidden||!h||shown>=max)continue;projected.set(o.x,4.7,o.z-3).project(camera);const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
   if(projected.z<-1||projected.z>1||x<58||x>width-58||y<(width<761?108:135)||y>height-inset-65||reserved.some(p=>x+75>p.x&&x-75<p.x+p.w&&y>p.y&&y-44<p.y+p.h)||occupied.some(p=>Math.abs(p.x-x)<150&&Math.abs(p.y-y)<48))continue;
   b.hidden=false;b.classList.toggle('is-active',!!loop?.sites.includes(o.id));b.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
   const phase=h.loops[loop?.sites.includes(o.id)?loop.id:o.loop].phase,text=o.name+'<small>'+HOME_PHASES[phase]+' · O₂ '+Math.round(h.organs[o.id].oxygen)+'%</small>';if(b.innerHTML!==text)b.innerHTML=text;occupied.push({x,y});shown++;
  }
 },dispose(){for(const {b} of tags)b.remove();for(const m of Object.values(pools))m.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();}};
}
