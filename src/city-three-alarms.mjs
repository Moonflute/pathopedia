import * as T from './vendor/three/three.module.min.js';
import {WALLS} from './city-frontier-data.mjs';
import {CITY_ENTRIES} from './city-world.mjs';
import {groundPoint} from './city-three-layout.mjs';
import {siteAt} from './city-tile-layout.mjs';

export function cityAlarmPoints(s){
 const groups=new Map();
 for(const e of [...s.enemies.filter(e=>!e.dead),...s.spawn]){
  const key=e.front==='skin'?'skin:'+e.wall:e.front||'airway',inside=!!e.entered,site=e.site||(key==='gut'?'gut':'lung');
  let g=groups.get(key);if(!g){g={key,count:0,inside:0,x:0,z:0,site,wall:e.wall,front:e.front||'airway'};groups.set(key,g);}
  g.count++;if(inside){const p=groundPoint(e);g.inside++;g.x+=p.x;g.z+=p.z;}
 }
 const out=[...groups.values()].map(g=>{const p=g.inside?{x:g.x/g.inside,z:g.z/g.inside}:g.front==='skin'?WALLS[g.wall]:CITY_ENTRIES[g.front]?.portal||siteAt(s.layout,g.site),name=g.front==='skin'?WALLS[g.wall].name:g.front==='gut'?'소화기':g.front==='blood'?'혈류':'호흡기';return {...g,point:p,text:name+' · '+(g.inside?'침입 ':'접근 ')+g.count,color:g.inside?0xf45f38:0xe6a947};});
 for(const [id,b] of Object.entries(s.biology?.sites||{})){const burden=Object.values(b.strains).reduce((a,b)=>a+b,0);if(burden<8||out.some(a=>a.site===id&&a.inside))continue;out.push({key:'site:'+id,count:Math.round(burden),point:siteAt(s.layout,id),text:siteAt(s.layout,id).label+' · 감염',color:0xe47742});}
 return out.sort((a,b)=>(b.inside||0)-(a.inside||0)||b.count-a.count).slice(0,8);
}
export function createCityAlarms(map,{focus,signal}){
 const root=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),compact=matchMedia('(max-width:760px), (max-width:1100px) and (max-height:620px)');
 const rings=new T.InstancedMesh(new T.TorusGeometry(1,.055,4,40),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.72,depthWrite:false}),24);
 const beacons=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xffffff}),16);root.add(rings,beacons);
 for(const m of [rings,beacons]){m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);}root.name='infection-location-alarms';
 const feed=document.createElement('nav');feed.className='cc-infection-feed';feed.setAttribute('aria-label','감염 현장 경보');map.append(feed);
 let active=[],last=-Infinity;
 const buttons=Array.from({length:8},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='cc-alarm-location';b.addEventListener('click',()=>{focus(active[i]?.point,true);expand(false);},{signal});feed.append(b);return b;});
 const more=document.createElement('button');more.type='button';more.className='cc-alarm-more';more.setAttribute('aria-expanded','false');feed.append(more);
 function expand(value){feed.dataset.expanded=String(value);more.setAttribute('aria-expanded',String(value));more.textContent=value?'접기':active.length+'곳';more.setAttribute('aria-label',value?'감염 경보 접기':'감염 경보 '+active.length+'곳 펼치기');}
 more.addEventListener('click',()=>expand(feed.dataset.expanded!=='true'),{signal});
 feed.addEventListener('keydown',e=>{if(e.key==='Escape'&&feed.dataset.expanded==='true'){e.stopPropagation();expand(false);more.focus();}},{signal});
 function put(m,index,p,y,sx,sy,sz,tint,flat=false){dummy.position.set(p.x,y,p.z);dummy.rotation.set(flat?Math.PI/2:0,0,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();m.setMatrixAt(index,dummy.matrix);m.setColorAt(index,color.setHex(tint));}
 return {root,update(s,hidden=false){
  root.visible=!hidden;feed.hidden=hidden||!active.length;if(hidden)return;
  if(s.time<last||s.time-last>.3||last===-Infinity){active=cityAlarmPoints(s);last=s.time;feed.hidden=!active.length;for(let i=0;i<buttons.length;i++){buttons[i].hidden=!active[i];if(active[i])buttons[i].textContent='⚠ '+active[i].text+' ↗';}expand(active.length>1&&feed.dataset.expanded==='true');}more.hidden=active.length<(compact.matches?2:4);
  let n=0,k=0;
  for(const [i,a] of active.entries()){
   for(let j=0;j<3;j++){const q=(s.time*.38+i*.13+j/3)%1,r=1.5+q*(a.inside?6:4);put(rings,n++,a.point,.13+j*.018,r,r,r,a.color,true);}
   put(beacons,k++,a.point,3.9,.18,1.3,.18,a.color);put(beacons,k++,a.point,2.9,.24,.24,.24,a.color);
  }
  rings.count=n;beacons.count=k;for(const m of [rings,beacons]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 },dispose(){feed.remove();}};
}
