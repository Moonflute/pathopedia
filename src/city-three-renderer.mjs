import * as T from './vendor/three/three.module.min.js';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {GLTFLoader} from './vendor/three/GLTFLoader.js';
import {createVillage} from './city-three-village.mjs';
import {createActors} from './city-three-actors.mjs';
import {SITES,qualityProfile,groundPoint} from './city-three-layout.mjs';
import {WALLS,FRONTS} from './city-frontier-data.mjs';
import {cityHealth} from './city-engine.mjs';
import {STAGES} from './city-biology.mjs';
import {cellObservation,createCellObserver,moveFollowCamera} from './city-cell-observer.mjs';

const assetRoot=new URL('../assets/city3d/',import.meta.url);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const release=root=>{const geometries=new Set(),materials=new Set(),textures=new Set();root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);if(m.map)textures.add(m.map);}});for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();};
export function createCityThreeRenderer(canvas,onSelect,onCameraChange){
 const map=canvas.parentElement,game=canvas.closest('.cc-game'),abort=new AbortController();
 const status=document.createElement('div');status.className='cc-three-loading';status.setAttribute('role','status');status.textContent='작은 마을을 짓는 중…';map.append(status);
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});}
 catch{status.innerHTML='이 기기에서 3D 화면을 열 수 없습니다. <a href="#city">기존 도시 열기 →</a>';return {draw(){},zoom(){},reset(){},invalidate(){},dispose(){status.remove();},cameraInfo(){return {scale:1,min:1,max:1};}};}
 const profile=qualityProfile(map.clientWidth,devicePixelRatio),scene=new T.Scene();scene.background=new T.Color(0xe4e6d8);scene.fog=new T.Fog(0xe4e6d8,48,110);
 renderer.setPixelRatio(profile.dpr);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 scene.add(new T.HemisphereLight(0xfff7e1,0x969f89,2.25));
 const sun=new T.DirectionalLight(0xffeacb,2.7);sun.position.set(-16,32,12);sun.castShadow=true;sun.shadow.mapSize.setScalar(profile.shadow);Object.assign(sun.shadow.camera,{left:-26,right:26,top:27,bottom:-27,near:1,far:90});sun.shadow.bias=-.0007;sun.shadow.normalBias=.05;scene.add(sun);
 const camera=new T.OrthographicCamera(-20,20,15,-15,.1,160);camera.position.set(20,32,32);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.14;controls.screenSpacePanning=false;controls.panSpeed=.8;controls.rotateSpeed=.55;
 controls.minPolarAngle=Math.PI*.2;controls.maxPolarAngle=Math.PI*.36;controls.minAzimuthAngle=-.6;controls.maxAzimuthAngle=1.45;
 controls.mouseButtons={LEFT:T.MOUSE.PAN,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};controls.touches={ONE:T.TOUCH.PAN,TWO:T.TOUCH.DOLLY_ROTATE};controls.zoomToCursor=true;
 const actor=createActors(profile);scene.add(actor.root);
 const selection=new T.Mesh(new T.TorusGeometry(2.33,.035,4,60),new T.MeshBasicMaterial({color:0xd1ae6c}));selection.rotation.x=-Math.PI/2;scene.add(selection);
 let village=null,disposed=false,ready=false,dirty=true,lastFrame=0,lastShadow=0,lastStats=0,frames=0,minCalls=Infinity,peakCalls=0,peakTriangles=0,width=0,height=0,fit=1,zoomTarget=null,zoomAnchor=null,inset=0,lastInspect=0,inspectHeight=170,focusTarget=null;
 const calmSky=new T.Color(0xe4e6d8),illSky=new T.Color(0xd69b91),warmSun=new T.Color(0xffeacb),illSun=new T.Color(0xffc1b2);
 const watching=createCellObserver();
 const labelLayer=document.createElement('div');labelLayer.className='cc-three-labels';map.append(labelLayer);
 const labels=Object.entries(SITES).map(([id,s])=>{const b=document.createElement('button');b.type='button';b.className='cc-three-label'+(s.detail?' cc-three-label--main':'');b.innerHTML=`<i style="background:#${s.color.toString(16)}"></i><span>${s.label}</span><small>${s.detail?'':'연결 거점'}</small>`;b.setAttribute('aria-label',s.label+' 선택');b.addEventListener('click',()=>onSelect(id),{signal:abort.signal});labelLayer.append(b);const stage=document.createElement('em');b.append(stage);return {id,site:s,element:b};});
 const inspect=document.createElement('section');inspect.className='cc-three-inspect';inspect.hidden=true;inspect.setAttribute('aria-label','선택한 세포');
 inspect.innerHTML='<header><strong data-cell-name></strong><button type="button" class="cc-cell-follow" aria-label="세포 따라가기" aria-pressed="false">◎ 따라가기 OFF</button><button type="button" class="cc-cell-close" aria-label="세포 관찰 닫기">×</button></header><dl><dt>작업</dt><dd data-cell-task></dd><dt>목적지</dt><dd data-cell-destination></dd><dt>운반 물자</dt><dd data-cell-cargo></dd><dt>다음</dt><dd data-cell-next></dd><dt>대기 원인</dt><dd data-cell-waiting></dd><dt>상태</dt><dd data-cell-condition></dd></dl>';
 map.append(inspect);
 const fields=Object.fromEntries(['name','task','destination','cargo','next','waiting','condition'].map(key=>[key,inspect.querySelector('[data-cell-'+key+']')]));
 const followButton=inspect.querySelector('.cc-cell-follow');
 followButton.addEventListener('click',()=>setFollowing(!watching.following),{signal:abort.signal});
 inspect.querySelector('.cc-cell-close').addEventListener('click',clearObservation,{signal:abort.signal});
 inspect.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();clearObservation();}},{signal:abort.signal});
 const vec=new T.Vector3(),viewOffset=new T.Vector3(),followPoint=new T.Vector3();
 function syncFollowing(){
  const on=watching.following;
  followButton.setAttribute('aria-pressed',String(on));followButton.textContent='◎ 따라가기 '+(on?'ON':'OFF');
  controls.zoomToCursor=!on;game.dataset.cellFollowing=String(on);
 }
 function setFollowing(on){
  watching.setFollowing(on);zoomAnchor=null;focusTarget=null;
  if(watching.following){const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;}
  syncFollowing();dirty=true;
 }
 function clearObservation(){
  if(inspect.contains(document.activeElement))canvas.focus({preventScroll:true});
  watching.select(null);inspect.hidden=true;game.dataset.cellObserved='false';syncFollowing();dirty=true;
 }
 function updateInspection(s,cell,now){
  if(!cell){if(!inspect.hidden)clearObservation();return;}
  const changed=inspect.hidden||inspect.dataset.cellId!==String(watching.id);
  if(!changed&&now-lastInspect<200)return;
  lastInspect=now;inspect.hidden=false;inspect.dataset.cellId=String(watching.id);game.dataset.cellObserved='true';
  const detail=cellObservation(s,cell);detail.name+=' #'+detail.id;
  for(const key of Object.keys(fields))if(fields[key].textContent!==detail[key])fields[key].textContent=detail[key];
  inspectHeight=inspect.offsetHeight;
 }
 function trackCell(cell,seconds){
  const point=groundPoint(cell);viewOffset.subVectors(camera.position,controls.target);
  // Keep the cell above the observation card and any open mobile management sheet.
  const narrow=width<761,available=height-inset-(narrow?inspectHeight+106:80);
  const focusY=narrow?Math.max(65,(Math.min(90,available*.4)+available)/2):height*.46;
  const horizontal=Math.hypot(viewOffset.x,viewOffset.z),elevation=viewOffset.y/viewOffset.length();
  const shift=(height/2-focusY)*(camera.top-camera.bottom)/(height*camera.zoom*Math.max(.2,elevation));
  followPoint.set(point.x+viewOffset.x/horizontal*shift,0,point.z+viewOffset.z/horizontal*shift);
  if(moveFollowCamera(camera.position,controls.target,followPoint,seconds))dirty=true;
 }
 function resize(){
  const w=map.clientWidth,h=map.clientHeight;if(!w||!h||w===width&&h===height)return;
  width=w;height=h;const p=qualityProfile(width,devicePixelRatio);renderer.setPixelRatio(p.dpr);renderer.setSize(w,h,false);
  if(sun.shadow.mapSize.x!==p.shadow){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.setScalar(p.shadow);renderer.shadowMap.needsUpdate=true;}
  // A portrait viewport starts close to the two featured districts; zoom-out reveals all.
  const vertical=h<400?17:w<h?32:27,aspect=w/h;camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();
  fit=Math.min(w/h<1?.42:.76,w/h<1?w/h*.66:1.06);controls.minZoom=fit;controls.maxZoom=3.3;camera.zoom=clamp(camera.zoom,fit,3.3);camera.updateProjectionMatrix();dirty=true;
 }
 resize();controls.target.set(-3,0,-3);camera.zoom=profile.mobile?1.25:1.22;camera.updateProjectionMatrix();controls.update();
 function cameraInfo(){return {scale:camera.zoom,min:controls.minZoom,max:controls.maxZoom};}
 controls.addEventListener('change',()=>{dirty=true;onCameraChange?.(cameraInfo());});
 controls.addEventListener('start',()=>{zoomTarget=null;zoomAnchor=null;focusTarget=null;});
 const observer=new ResizeObserver(resize);observer.observe(map);
 canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal:abort.signal});
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();const r=canvas.getBoundingClientRect();zoom(-clamp(e.deltaY,-200,200)*.002);if(!watching.following)zoomAnchor=new T.Vector2((e.clientX-r.left)/width*2-1,1-(e.clientY-r.top)/height*2);},{capture:true,passive:false,signal:abort.signal});
 let down=null,panStart=null;const pointers=new Map();
 const remainingPointer=()=>pointers.size===1?{...pointers.values().next().value}:null;
 canvas.addEventListener('pointerdown',e=>{
  const modified=e.ctrlKey||e.metaKey||e.shiftKey;
  const point={x:e.clientX,y:e.clientY,id:e.pointerId,button:e.button,time:performance.now(),pan:e.pointerType==='touch'||e.button===0&&!modified||e.button===2&&modified};
  pointers.set(e.pointerId,point);down=remainingPointer();panStart=remainingPointer();
 },{signal:abort.signal});
 canvas.addEventListener('pointermove',e=>{
  const point=pointers.get(e.pointerId);if(point){point.x=e.clientX;point.y=e.clientY;}
  if(panStart&&panStart.id===e.pointerId&&Math.hypot(e.clientX-panStart.x,e.clientY-panStart.y)>7){
   if(panStart.pan)setFollowing(false);panStart=null;down=null;
  }
 },{signal:abort.signal});
 canvas.addEventListener('pointerup',e=>{
  const tap=down&&down.id===e.pointerId&&down.button===0&&performance.now()-down.time<600;pointers.delete(e.pointerId);down=null;panStart=remainingPointer();if(!tap||!ready)return;
  const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(px/width*2-1,1-py/height*2),camera);
  const obstruction=village?ray.intersectObject(village.root,true).find(h=>h.object.visible&&h.object.material?.opacity!==0):null;
  let nearest=null,distance=22;
  for(const p of actor.positions){vec.set(p.x,.5,p.z).project(camera);const d=Math.hypot((vec.x+1)*width/2-px,(1-vec.y)*height/2-py);if(d<distance){const depth=new T.Vector3(p.x,.5,p.z).sub(ray.ray.origin).dot(ray.ray.direction);if(!obstruction||depth<obstruction.distance+.65){nearest=p;distance=d;}}}
  if(nearest){onSelect('observe');watching.select(nearest.id);lastInspect=0;dirty=true;return;}
  clearObservation();const hit=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
  if(hit){let chosen=null,dist=3.5;for(const [id,s] of Object.entries(SITES)){const d=Math.min(Math.hypot(hit.x-s.x,hit.z-s.z),Math.hypot(hit.x-s.building[0],hit.z-s.building[1]));if(d<dist){chosen=id;dist=d;}}if(chosen)onSelect(chosen);else{const wall=WALLS.find(w=>Math.hypot(hit.x-w.x,hit.z-w.z)<2.5);if(wall)onSelect('wall:'+wall.id);}}dirty=true;
 },{signal:abort.signal});
 canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);down=null;panStart=remainingPointer();},{signal:abort.signal});
 canvas.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','=','-','Home','q','e','Q','E'].includes(e.key))e.preventDefault();
  if(e.key==='Home')reset();else if(e.key==='+'||e.key==='=')zoom(.22);else if(e.key==='-')zoom(-.22);else if(e.key.toLowerCase()==='q')rotate(-1);else if(e.key.toLowerCase()==='e')rotate(1);else if(e.key==='Escape'){clearObservation();}else if(e.key.startsWith('Arrow')){setFollowing(false);const amount=1.1/camera.zoom,dx=e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0,dz=e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0;camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;dirty=true;}
 },{signal:abort.signal});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;status.hidden=false;status.innerHTML='3D 화면이 중단되었습니다. <button type="button" data-city3d-retry>다시 열기</button> · <a href="#city">기존 도시</a>';},{signal:abort.signal});
 function zoom(delta){zoomAnchor=null;zoomTarget=clamp((zoomTarget??camera.zoom)*Math.exp(delta),fit,3.3);dirty=true;}
 function rotate(direction){const offset=camera.position.clone().sub(controls.target),spherical=new T.Spherical().setFromVector3(offset);spherical.theta=clamp(spherical.theta+direction*.22,controls.minAzimuthAngle,controls.maxAzimuthAngle);camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));controls.update();dirty=true;}
 function focus(point){if(!point)return;setFollowing(false);focusTarget=new T.Vector3(point.x,0,point.z);dirty=true;}
 function reset(){focusTarget=null;setFollowing(false);controls.target.set(-1,0,1);camera.position.set(19,32,33);zoomAnchor=null;zoomTarget=fit;controls.update();dirty=true;}
 const frontLabels=Object.entries(FRONTS).map(([id,p])=>{const b=document.createElement('button');b.type='button';b.className='cc-three-label cc-front-label';b.textContent={skin:'보수 공방',airway:'호흡기 입구',gut:'검역 입구'}[id];b.setAttribute('aria-label',b.textContent+' 선택');b.addEventListener('click',()=>onSelect('front:'+id),{signal:abort.signal});labelLayer.append(b);return {site:p,element:b};});
 function updateLabels(s,options){
  for(const {site,element} of frontLabels){vec.set(site.x,2.3,site.z).project(camera);const x=(vec.x+1)*width/2,y=(1-vec.y)*height/2;element.hidden=x<45||x>width-45||y<125||y>height-inset-90||camera.zoom<.6;if(!element.hidden)element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;}
  for(const {id,site,element} of labels){vec.set(site.building[0],site.detail?3.8:2.8,site.building[1]).project(camera);const x=(vec.x+1)*width/2,y=(1-vec.y)*height/2;const hidden=x<45||x>width-45||y<35||y>height-inset-75||!site.detail&&camera.zoom<.65;element.hidden=hidden;if(!hidden){element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;element.classList.toggle('is-selected',options.selected===id);const bio=s.biology?.sites[id];element.dataset.infection=bio?.stage||'clear';element.querySelector('em').textContent=bio&&bio.stage!=='clear'?STAGES[bio.stage]:'';const small=element.querySelector('small');small.textContent=options.layer==='supply'?`O₂ ${Math.round(s.districts[id].oxygen)}%`:site.detail?'':'연결 거점';}}

 }
 function draw(s,options={}){
  if(disposed||document.hidden)return;inset=options.inset||0;
  const now=performance.now(),interval=1000/qualityProfile(width,devicePixelRatio).fps;
  if(now-lastFrame<interval*.9)return;
  const cell=watching.resolve(s);
  if(followButton.getAttribute('aria-pressed')!==String(watching.following))syncFollowing();
  updateInspection(s,cell,now);
  if(zoomTarget!==null){const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);let before=null;if(zoomAnchor){ray.setFromCamera(zoomAnchor,camera);before=ray.ray.intersectPlane(plane,new T.Vector3());}camera.zoom+=(zoomTarget-camera.zoom)*.24;if(Math.abs(camera.zoom-zoomTarget)<.002){camera.zoom=zoomTarget;zoomTarget=null;}camera.updateProjectionMatrix();if(before){ray.setFromCamera(zoomAnchor,camera);const after=ray.ray.intersectPlane(plane,new T.Vector3());if(after){before.sub(after);controls.target.add(before);camera.position.add(before);}}dirty=true;}
  if(focusTarget){
   viewOffset.subVectors(camera.position,controls.target);const horizontal=Math.hypot(viewOffset.x,viewOffset.z),elevation=viewOffset.y/viewOffset.length(),focusY=Math.max(100,(130+height-inset-110)/2),shift=(height/2-focusY)*(camera.top-camera.bottom)/(height*camera.zoom*Math.max(.2,elevation));
   followPoint.set(clamp(focusTarget.x+viewOffset.x/horizontal*shift,-18,18),0,clamp(focusTarget.z+viewOffset.z/horizontal*shift,-19,18));
   moveFollowCamera(camera.position,controls.target,followPoint,(now-lastFrame)/1000);if(controls.target.distanceTo(followPoint)<.02)focusTarget=null;dirty=true;
  }
  if(watching.following&&cell)trackCell(cell,(now-lastFrame)/1000);
  controls.update();const cx=clamp(controls.target.x,-18,18),cz=clamp(controls.target.z,-19,18);camera.position.x+=cx-controls.target.x;camera.position.z+=cz-controls.target.z;controls.target.x=cx;controls.target.z=cz;camera.updateMatrixWorld();
  if(options.paused&&!dirty&&now-lastFrame<250)return;
  lastFrame=now;actor.draw(s,{...options,selectedCell:watching.id,readability:clamp(30/(height*camera.zoom/(camera.top-camera.bottom)),1,1.5)});village?.update(s,{...options,camera,target:controls.target});updateLabels(s,options);const site=SITES[options.selected];selection.visible=!!site;if(site){selection.position.set(site.x,.08,site.z);selection.scale.setScalar(site.detail?1:.7);}
  if(now-lastShadow>200){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
  const illness=clamp(Math.max((75-cityHealth(s))/65,(s.inflammation-30)/70),0,1);scene.background.copy(calmSky).lerp(illSky,illness*.8);scene.fog.color.copy(scene.background);sun.color.copy(warmSun).lerp(illSun,illness);
  renderer.render(scene,camera);dirty=false;frames++;minCalls=Math.min(minCalls,renderer.info.render.calls);peakCalls=Math.max(peakCalls,renderer.info.render.calls);peakTriangles=Math.max(peakTriangles,renderer.info.render.triangles);
  if(now-lastStats>1000){const label=game.querySelector('[data-city-performance]');if(label)label.textContent=`${options.paused?'일시정지':Math.round(frames*1000/(now-lastStats))+' fps'} · ${minCalls===peakCalls?peakCalls:minCalls+'–'+peakCalls} draws · ${Math.round(peakTriangles/1000)}k tris`;lastStats=now;frames=0;minCalls=Infinity;peakCalls=0;peakTriangles=0;}
 }
 async function load(){
  const loader=new GLTFLoader(),assets={},response=await fetch(new URL('sources.json',assetRoot));if(!response.ok)throw Error('Asset manifest');const manifest=await response.json();
  const names=manifest.kenney.models;let sharedMaterial=null,failed=0;
  for(let i=0;i<names.length&&!disposed;i+=5)await Promise.all(names.slice(i,i+5).map(async name=>{
   try{const gltf=await loader.loadAsync(new URL(`kenney/${name}.glb`,assetRoot).href);if(disposed){release(gltf.scene);return;}
    gltf.scene.traverse(m=>{if(!m.isMesh)return;m.userData.kenney=true;m.castShadow=true;m.receiveShadow=true;
     if(!sharedMaterial){sharedMaterial=m.material;sharedMaterial.roughness=1;sharedMaterial.metalness=0;}
     else if(m.material!==sharedMaterial){m.material.map?.dispose();m.material.dispose();m.material=sharedMaterial;}
    });assets[name]=gltf.scene;
   }catch{failed++;}
  }));
  if(disposed){for(const a of Object.values(assets))release(a);return;}
  village=createVillage(assets);scene.add(village.root);ready=true;dirty=true;renderer.shadowMap.needsUpdate=true;
  game.dataset.renderer='three';game.dataset.assets=failed?'partial':'ready';status.hidden=!failed;if(failed){status.classList.add('cc-three-loading--warning');status.textContent='일부 마을 소품을 불러오지 못했습니다.';}
  // Static geometry was baked; source buffers and shared atlas remain owned by scene.
  const sourceGeometries=new Set(),retained=new Set();scene.traverse(m=>{if(m.geometry)retained.add(m.geometry);});for(const a of Object.values(assets))a.traverse(m=>{if(m.geometry)sourceGeometries.add(m.geometry);});for(const g of sourceGeometries)if(!retained.has(g))g.dispose();
 }
 load().catch(error=>{if(disposed)return;console.error('3D village load failed',error);status.innerHTML='마을을 불러오지 못했습니다. <button type="button" data-city3d-retry>다시 열기</button> · <a href="#city">기존 도시</a>';});
 return {draw,zoom,rotate,reset,focus,cameraInfo,invalidate(){dirty=true;},dispose(){disposed=true;abort.abort();observer.disconnect();controls.dispose();release(scene);renderer.dispose();renderer.forceContextLoss();status.remove();labelLayer.remove();inspect.remove();delete game.dataset.cellObserved;delete game.dataset.cellFollowing;}};
}

// Fixed simulation ticks independent of the WebGL frame rate. Never acquire a 2D context.
export function createThreeLoop({update,render}){
 let raf=0,last=0,accumulator=0,running=false;
 function frame(now){if(!running)return;const dt=last?Math.min(.2,(now-last)/1000):0;last=now;
  if(!document.hidden){accumulator+=dt;while(accumulator>=1/30){update(1/30);accumulator-=1/30;}render();}else accumulator=0;
  raf=requestAnimationFrame(frame);
 }
 return {start(){if(running)return;running=true;last=0;raf=requestAnimationFrame(frame);},stop(){running=false;cancelAnimationFrame(raf);}};
}
