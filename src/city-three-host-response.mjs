import * as T from './vendor/three/three.module.min.js';
import {groundPoint} from './city-three-layout.mjs';
import {siteAt,cityDistrict,compileLayout} from './city-tile-layout.mjs';
import {hostPaths,TRAFFIC_LABELS} from './city-immune-traffic.mjs';
import {HEALING_LABELS,bloodLoad} from './city-host-response.mjs';
import {entryTrackHeight} from './city-entry-tracks.mjs';

export function hostStageMarkers(s){
 const p=s.physiology;if(!p)return [];const out=[],add=(point,text,color,priority)=>out.push({point:groundPoint(point),text,color,priority});
 if(p.blood.sepsis)add(cityDistrict(s,'heart'),'전신 · 관류 저하','#b8505e',10);
 const recaller=s.cells.find(c=>c.recallUntil>s.time);if(recaller)add(recaller,'기억 · 현장 재경보','#268f84',9);
 const crossing=s.cells.find(c=>['adhering','crossing','rolling'].includes(c.trafficStage));if(crossing)add(crossing,'② '+TRAFFIC_LABELS[crossing.trafficStage],'#be7737',8);
 const dc=s.cells.find(c=>c.trafficStage==='lymph');if(dc)add(dc,'③ 림프관 · 항원 운반','#308e78',7);
 const priming=s.cells.find(c=>['priming','germinal'].includes(c.immuneState));if(priming)add(priming,'④ 항원 선택 · 증식','#4d88b5',6);
 const host=s.immunity?.infected.find(h=>h.phase==='productive')||s.immunity?.infected[0];if(host)add(host,host.phase==='eclipse'?'① 세포 내 감염':'① 바이러스 생산','#a064a5',5);
 const colony=s.enemies.find(e=>e.action==='colonize');if(colony)add(colony,'① 표면 부착 · 정착','#b78c47',5);
 const complement=s.enemies.find(e=>!e.dead&&e.mac>.5)||s.enemies.find(e=>!e.dead&&e.c3b>.2);if(complement)add(complement,complement.mac>.5?'② MAC · 세균막 손상':'② C3b 표지 · 포식 유도','#b39b45',7);
 const virion=p.virions.find(v=>v.phase==='attachment'||v.phase==='entry');if(virion)add(virion,virion.phase==='attachment'?'① 상피 부착':'① 바이러스 유입','#a064a5',4);
 const healing=p.epithelium.find(e=>e.state==='repairing');if(healing)add(healing,'⑥ 상피 재생 '+Math.round(healing.health)+'%','#2a967b',8);
 const cleaning=s.cells.find(c=>c.task==='사멸 세포 수거');if(cleaning)add(cleaning,'⑤ 사멸 세포 청소','#798b7a',7);
 for(const [site,state] of Object.entries(p.injury))if(['resolving','remodeling'].includes(state.phase)){
  const point=state.x!=null?state:s.physiology.epithelium.find(e=>e.site===site);if(point)add(point,'⑥ '+HEALING_LABELS[state.phase],'#469c84',3);
 }
 if(p.microbiome<50&&s.enemies.some(e=>e.front==='gut'))add(cityDistrict(s,'gut'),'① 정상균총 저하','#a88d57',4);
 const injured=Object.entries(p.injury).find(([,v])=>v.phase==='fighting');if(injured){const [site,state]=injured,cause=['pathogen','toxin','immune','ischemia'].sort((a,b)=>state[b]-state[a])[0];add(state.x!=null?state:cityDistrict(s,site),'손상 · '+{pathogen:'병원체',toxin:'독소',immune:'면역 반응',ischemia:'저관류'}[cause],'#bf775d',4);}
 return out.sort((a,b)=>b.priority-a.priority);
}

export function createHostResponseScene(map=null){
 const root=new T.Group(),batches={},dummy=new T.Object3D(),color=new T.Color(),up=new T.Vector3(0,1,0),delta=new T.Vector3();root.name='host-response-stages';
 const flat=new T.MeshBasicMaterial({color:0xffffff}),soft=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.42,depthWrite:false});
 function pool(id,geometry,cap,material=flat){const m=new T.InstancedMesh(geometry,material,cap);m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);batches[id]=m;root.add(m);}
 pool('lymphatic-conduits',new T.CylinderGeometry(1,1,1,5),2400,soft);
 pool('response-rings',new T.TorusGeometry(1,.055,4,28),420,soft);
 pool('antigen-packets',new T.IcosahedronGeometry(1,0),900);
 pool('epithelial-tiles',new T.CylinderGeometry(1,1,1,6),100);
 pool('viral-particles',new T.IcosahedronGeometry(1,1),192);
 const tags=map?Array.from({length:4},()=>{const e=document.createElement('span');e.className='cc-world-stage';e.hidden=true;map.append(e);return e;}):[],projected=new T.Vector3();
 let last=-Infinity,run=null,markers=[];
 function put(id,p,y,xs,ys,zs,tint,flat=false){const m=batches[id],n=m.count;if(n>=m.instanceMatrix.count)return;dummy.position.set(p.x,y,p.z);dummy.rotation.set(flat?Math.PI/2:0,0,0);dummy.scale.set(xs,ys,zs);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(tint));m.count++;}
 function line(a,b,width,tint){const m=batches['lymphatic-conduits'],n=m.count;if(n>=m.instanceMatrix.count)return;delta.set(b.x-a.x,0,b.z-a.z);if(delta.length()<.001)return;dummy.position.set((a.x+b.x)/2,.18,(a.z+b.z)/2);dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());dummy.scale.set(width,delta.length(),width);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);m.setColorAt(n,color.set(tint));m.count++;}
 return {root,update(s,hidden=false){
  root.visible=!hidden;if(hidden){for(const tag of tags)tag.hidden=true;return;}
  if(run===s&&s.time>=last&&s.time-last<.12)return;run=s;last=s.time;for(const m of Object.values(batches))m.count=0;
  const p=s.physiology;if(!p)return;const time=s.time,entries=s.layout?compileLayout(s.layout).entries:{};
  const activeWalls=new Set([...s.enemies,...p.virions].filter(e=>!e.dead&&e.front==='skin').map(e=>e.wall));
  for(const path of hostPaths(s)?.lymph||[]){
   if(path.key.startsWith('skin:')&&!activeWalls.has(Number(path.key.slice(5))))continue;
   const points=path.points.map(groundPoint);for(let n=1;n<points.length;n++)line(points[n-1],points[n],.055,'#71ac8b');
  }
  for(const q of p.lymphPackets){const at=groundPoint(q);put('antigen-packets',at,.56,.19,.25,.19,0xf0d275);put('response-rings',at,.2,.4,.4,.4,0x6ed5a5,true);}
  for(const ep of p.epithelium){
   const at=groundPoint(ep),tint=ep.state==='infected'?0xbc7caa:ep.state==='dead'?0x7e726c:ep.state==='repairing'?0x6fc2a1:ep.antiviral>12?0x86b9de:0xa5c4a4;
   put('epithelial-tiles',at,.1,.46,.11,.46,tint);
   if(ep.antiviral>12){const r=.6+(time*.25+ep.antiviral*.002)%1*.18;put('response-rings',at,.15,r,r,r,0x87bce2,true);}
   if(ep.state==='repairing'){put('antigen-packets',at,.35+ep.health*.003,.09,.25,.09,0xbce9cd);put('response-rings',at,.2,.72,.72,.72,0x7bd9b4,true);}
  }
  for(const v of p.virions){const at=groundPoint(v),height=map?.closest('.cc-game')?.dataset.theme!=='2'&&!v.entered?entryTrackHeight(entries[v.front],at):0,scale=v.phase==='attachment'?.27:.2;put('viral-particles',at,height+.48,scale,scale,scale,v.phase==='expelled'?0x90bcb4:0x9b72ba);
   for(let n=0;n<3;n++){const a=time*1.8+n*Math.PI*2/3;put('antigen-packets',{x:at.x+Math.cos(a)*scale,z:at.z+Math.sin(a)*scale},height+.48,.065,.1,.065,0xcba4d8);}
  }
  for(const c of s.cells){
   const at=groundPoint(c);
   if(c.transit&&c.trafficStage!=='circulating'){const g=groundPoint(c.transit.gate),r=.7+Math.sin(time*3)*.12;put('response-rings',g,.22,r,r,r,0xe2ad60,true);line(g,groundPoint(c.transit.exit),.075,'#e3c58a');}
   if(c.tissueResident){put('response-rings',at,.12,.5,.5,.5,c.recallUntil>time?0xf4cf6e:0x67b6a5,true);put('antigen-packets',at,1.2,.1,.18,.1,0x68c3b1);}
   if(c.immuneState==='priming'||c.immuneState==='germinal'){for(const side of [-1,1]){const q=(time*.5+c.id*.07)%1;put('antigen-packets',{x:at.x+side*q*.55,z:at.z},.9,.09,.12,.09,0x7bc2d5);}}
  }
  for(const e of s.enemies){
   if(e.dead)continue;
   const at=groundPoint(e);
   if(e.c3b>.1)for(let n=0;n<4;n++){const a=n*Math.PI/2;put('antigen-packets',{x:at.x+Math.cos(a)*.47,z:at.z+Math.sin(a)*.47},.43,.09,.12,.09,0xf3ce71);}
   if(e.mac>.3)put('response-rings',at,.46,.48,.48,.48,0x73d8d3,false);
   if(e.action==='colonize')put('response-rings',at,.15,.7,.7,.7,0xe4b867,true);
  }
  for(const [site,state] of Object.entries(p.injury))if(state.phase==='fighting'){
   const at=groundPoint(state.x!=null?state:cityDistrict(s,site)),cause=['pathogen','toxin','immune','ischemia'].sort((a,b)=>state[b]-state[a])[0],tint={pathogen:0xe89067,toxin:0xb886cd,immune:0xe5b85d,ischemia:0x9b8f9e}[cause],r=1.4+(time*.5)%1;
   put('response-rings',at,.19,r,r,r,tint,true);for(let n=0;n<3;n++){const a=n*2.1,q=(time*.6+n*.3)%1;put('antigen-packets',{x:at.x+Math.cos(a)*.5,z:at.z+Math.sin(a)*.5},.3+q*1.3,.12,.2,.12,tint);}
  }
  const gut=siteAt(s.layout,'gut');for(let n=0;n<12;n++)put('antigen-packets',{x:gut.x-2+(n%6)*.32,z:gut.z+5+Math.floor(n/6)*.34},.23,.12,.14,.12,n<p.microbiome/100*12?0x83b570:0xbab5a1);
  if(bloodLoad(s)>1||p.blood.perfusion<80){const heart=siteAt(s.layout,'heart'),r=2.3+(time*.4)%1;put('response-rings',heart,.18,r,r,r,p.blood.sepsis?0xe67573:0xd9ad60,true);}
  for(const e of p.events)if(time-e.time<2.5&&['memory-recall','neutralized','lymph-arrival','epithelial-repair','extravasation'].includes(e.kind)){const at=groundPoint(e),r=.4+(time-e.time)*.6;put('response-rings',at,.23,r,r,r,e.kind==='neutralized'?0xe1cc87:e.kind==='memory-recall'?0x62d3bc:0xa0dbc2,true);}
  markers=hostStageMarkers(s);
  for(const m of Object.values(batches)){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 },project(camera,width,height,inset=0,hidden=false){
  const compact=width<=760||height<=620&&width<=1100,shown=[];let index=0;
  for(const marker of markers){if(index>=(compact?2:4))break;projected.set(marker.point.x,1.6,marker.point.z).project(camera);const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
   if(hidden||projected.z< -1||projected.z>1||x<85||x>width-85||y<(compact?125:155)||y>height-inset-95||shown.some(p=>Math.abs(p.x-x)<175&&Math.abs(p.y-y)<42))continue;
   const tag=tags[index++];if(!tag)break;tag.hidden=false;tag.textContent=marker.text;tag.style.setProperty('--stage-color',marker.color);tag.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;shown.push({x,y});
  }
  for(;index<tags.length;index++)tags[index].hidden=true;
 },dispose(){for(const tag of tags)tag.remove();for(const m of Object.values(batches)){m.geometry.dispose();m.dispose();}flat.dispose();soft.dispose();}};
}
