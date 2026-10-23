import {CITY_STYLE as STYLE} from './city-three-style.mjs';
import {CITY_BOUNDS,CITY_SCALE,CITY_ENTRIES} from './city-world.mjs';
import {siteAt,SQUARE_GRID,placeable,transformPoint} from './city-tile-layout.mjs';
import {createEditorOverlay} from './city-three-editor.mjs';
import * as T from './vendor/three/three.module.min.js';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {GLTFLoader} from './vendor/three/GLTFLoader.js';
import {createVillage} from './city-three-village.mjs';
import {createActors} from './city-three-actors.mjs';
import {SITES,qualityProfile,landscapeCameraRange} from './city-three-layout.mjs';
import {WALLS,FRONTS} from './city-frontier-data.mjs';
import {cityHealth} from './city-engine.mjs';
import {STAGES} from './city-biology.mjs';
import {cellObservation,createCellObserver,moveFollowCamera} from './city-cell-observer.mjs';
import {createCityMotion} from './city-three-motion.mjs';
import {createAdaptiveQuality,createFramePacer} from './city-three-performance.mjs';
import {readCityAssets,createAssetSwitch} from './city-asset-preference.mjs';
import {readCityTheme,normalizeCityTheme} from './city-theme.mjs';
import {CANAL_STYLE} from './city-three-canals.mjs';
import {loadCityBundle} from './city-three-bundle.mjs';
import {createResponseUI} from './city-response-ui.mjs';
import {compileVascularLayout} from './city-vascular-layout.mjs';
import {createCityAlarms} from './city-three-alarms.mjs';
import {createHostResponseScene} from './city-three-host-response.mjs';
import {createHomeostasisScene} from './city-three-homeostasis.mjs';
import {homeSites} from './city-homeostasis-data.mjs';
import {createPilotSurface} from './city-pilot-physics.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {createFirstPerson} from './city-first-person.mjs';
export {createThreeLoop} from './city-three-performance.mjs';

const assetRoot=new URL('../assets/city3d/',import.meta.url);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const release=root=>{const geometries=new Set(),materials=new Set(),textures=new Set();root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);if(m.map)textures.add(m.map);}});for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();};
export function createCityThreeRenderer(canvas,onSelect,onCameraChange,onEdit,onPilotChange){
 const map=canvas.parentElement,game=canvas.closest('.cc-game'),abort=new AbortController(),compactHud=matchMedia('(max-width:760px), (max-width:1100px) and (max-height:620px)');
 const status=document.createElement('div');status.className='cc-three-loading';status.setAttribute('role','status');status.textContent='작은 마을을 짓는 중…';map.append(status);
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});}
 catch{status.innerHTML='이 기기에서 3D 화면을 열 수 없습니다. <a href="#city">기존 도시 열기 →</a>';return {draw(){},zoom(){},reset(){},invalidate(){},dispose(){status.remove();},cameraInfo(){return {scale:1,min:1,max:1};}};}
 const profile=qualityProfile(map.clientWidth,devicePixelRatio),adaptive=createAdaptiveQuality(map.clientWidth,devicePixelRatio),motion=createCityMotion(profile),shouldRender=createFramePacer();let quality=adaptive.profile,interpolation=1;
 const scene=new T.Scene();scene.background=new T.Color(STYLE.sky);scene.fog=new T.Fog(STYLE.sky,105,220);
 renderer.setPixelRatio(profile.dpr);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 scene.add(new T.HemisphereLight(0xeaf3ff,0x78866c,1.7));
 const sun=new T.DirectionalLight(0xfff0dc,2.5);sun.position.set(-24,38,18);sun.castShadow=true;sun.shadow.mapSize.setScalar(profile.shadow);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:190});sun.shadow.bias=-.0007;sun.shadow.normalBias=.05;scene.add(sun);
 const camera=new T.OrthographicCamera(-20,20,15,-15,.1,260);camera.position.set(20,32,32);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.14;controls.screenSpacePanning=false;controls.panSpeed=.8;controls.rotateSpeed=.55;
 controls.minPolarAngle=Math.PI*.2;controls.maxPolarAngle=Math.PI*.36;controls.minAzimuthAngle=-.6;controls.maxAzimuthAngle=1.45;
 controls.mouseButtons={LEFT:T.MOUSE.PAN,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};controls.touches={ONE:T.TOUCH.PAN,TWO:T.TOUCH.DOLLY_ROTATE};controls.zoomToCursor=true;
 const actor=createActors(profile);scene.add(actor.root);const editOverlay=createEditorOverlay();scene.add(editOverlay.root);let assetCache=null,villageLayout=null,villageEditId=null,currentEditor=null,currentRun=null,newBundle=null,wantNewAssets=readCityAssets();
 const selection=new T.Mesh(new T.TorusGeometry(2.33,.035,4,60),new T.MeshBasicMaterial({color:0xd1ae6c}));selection.rotation.x=-Math.PI/2;scene.add(selection);
 let framed=false,village=null,homeScene=null,disposed=false,ready=false,dirty=true,lastFrame=0,lastShadow=0,lastStats=0,frames=0,minCalls=Infinity,peakCalls=0,peakTriangles=0,width=0,height=0,fit=1,zoomTarget=null,zoomAnchor=null,inset=0,lastInspect=0,inspectHeight=170,focusTarget=null;
 let theme=readCityTheme();
 const calmSky=new T.Color(theme==='2'?CANAL_STYLE.sky:STYLE.sky),illSky=new T.Color(0xd69b91),warmSun=new T.Color(0xfff0dc),illSun=new T.Color(0xffc1b2);
 const watching=createCellObserver();
 const pilot=createFirstPerson(canvas,{map,game,theme:()=>theme,selectedCell:()=>watching.id,onMode(mode){clearObservation();zoomTarget=null;zoomAnchor=null;focusTarget=null;spawnPointer=null;pointers.clear();down=panStart=null;controls.enabled=(mode==='exit'||mode==='choose')&&!currentEditor;dirty=true;onPilotChange?.(mode);}});scene.add(pilot.root);
 const labelLayer=document.createElement('div');labelLayer.className='cc-three-labels';map.append(labelLayer);
 const responseUI=createResponseUI(map,{focus,overview:reset,signal:abort.signal});
 const alarms=createCityAlarms(map,{focus,signal:abort.signal});scene.add(alarms.root);
 const hostScene=createHostResponseScene(map);scene.add(hostScene.root);abort.signal.addEventListener('abort',()=>{scene.remove(hostScene.root);hostScene.dispose();},{once:true});
 const labels=Object.entries(SITES).map(([id,s])=>{const b=document.createElement('button');b.type='button';b.className='cc-three-label'+(s.detail?' cc-three-label--main':'');b.innerHTML=`<i style="background:#${s.color.toString(16)}">${{heart:'♥',lung:'O₂',gut:'▤',kidney:'≋',marrow:'✚',lymph:'Y'}[id]}</i><span>${s.label}</span><small>${s.detail?'':'연결 거점'}</small>`;b.setAttribute('aria-label',s.label+' 선택');b.addEventListener('click',()=>onSelect(id),{signal:abort.signal});labelLayer.append(b);const stage=document.createElement('em');b.append(stage);return {id,site:s,element:b};});
 const outletLabel=document.createElement('span');outletLabel.className='cc-outlet-label';outletLabel.textContent='↗ 배출구';outletLabel.hidden=true;labelLayer.append(outletLabel);
 const inspect=document.createElement('section');inspect.className='cc-three-inspect';inspect.hidden=true;inspect.setAttribute('aria-label','선택한 세포');
 inspect.innerHTML='<header><strong data-cell-name></strong><button type="button" class="cc-cell-follow" aria-label="세포 따라가기" aria-pressed="false">◎ 따라가기 OFF</button><button type="button" class="cc-cell-close" aria-label="세포 관찰 닫기">×</button></header><dl><dt>작업</dt><dd data-cell-task></dd><dt>목적지</dt><dd data-cell-destination></dd><dt>운반 물자</dt><dd data-cell-cargo></dd><dt>항원 특이성</dt><dd data-cell-specificity></dd><dt>다음</dt><dd data-cell-next></dd><dt>대기 원인</dt><dd data-cell-waiting></dd><dt>상태</dt><dd data-cell-condition></dd></dl>';
 map.append(inspect);
 const fields=Object.fromEntries(['name','task','destination','cargo','specificity','next','waiting','condition'].map(key=>[key,inspect.querySelector('[data-cell-'+key+']')]));
 const followButton=inspect.querySelector('.cc-cell-follow');
 followButton.addEventListener('click',()=>setFollowing(!watching.following),{signal:abort.signal});
 inspect.querySelector('.cc-cell-close').addEventListener('click',clearObservation,{signal:abort.signal});
 inspect.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();clearObservation();}},{signal:abort.signal});
 const viewFrustum=new T.Frustum(),viewMatrix=new T.Matrix4(),actorSphere=new T.Sphere(new T.Vector3(),2.5);
 const actorVisible=p=>{actorSphere.center.set(p.x,1,p.z);return viewFrustum.intersectsSphere(actorSphere);};
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
  const point=motion.point(cell,watching.id);viewOffset.subVectors(camera.position,controls.target);
  // Keep the cell above the observation card and any open mobile management sheet.
  const narrow=compactHud.matches,available=height-inset-(narrow?inspectHeight+62:80);
  const focusY=narrow?Math.max(65,(Math.min(102,available*.4)+available)/2):height*.46;
  const horizontal=Math.hypot(viewOffset.x,viewOffset.z),elevation=viewOffset.y/viewOffset.length();
  const shift=(height/2-focusY)*(camera.top-camera.bottom)/(height*camera.zoom*Math.max(.2,elevation));
  followPoint.set(point.x+viewOffset.x/horizontal*shift,0,point.z+viewOffset.z/horizontal*shift);
  if(moveFollowCamera(camera.position,controls.target,followPoint,seconds))dirty=true;
 }
 function applyQuality(){
  quality=adaptive.profile;
  if(renderer.getPixelRatio()!==quality.dpr)renderer.setPixelRatio(quality.dpr);
  const shadows=quality.shadow>0;
  if(renderer.shadowMap.enabled!==shadows){
   renderer.shadowMap.enabled=shadows;sun.castShadow=shadows;
   const materials=new Set();scene.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))materials.add(m);});for(const m of materials)m.needsUpdate=true;
  }
  if(!shadows||sun.shadow.mapSize.x!==quality.shadow){sun.shadow.map?.dispose();sun.shadow.map=null;if(quality.shadow)sun.shadow.mapSize.setScalar(quality.shadow);}
  renderer.shadowMap.needsUpdate=shadows;dirty=true;
 }
 function resize(){
  const w=map.clientWidth,h=map.clientHeight;if(!w||!h||w===width&&h===height)return;
  width=w;height=h;adaptive.resize(width,devicePixelRatio,performance.now());applyQuality();renderer.setSize(w,h,false);
  // A portrait viewport starts close to the two featured districts; zoom-out reveals all.
  const vertical=h<400?17:w<h?32:27,aspect=w/h;camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();
  fit=Math.min(Math.min(w/h<1?.42:.76,w/h<1?w/h*.66:1.06)/CITY_SCALE*(44/58),h<400?vertical/120:1);controls.minZoom=fit;controls.maxZoom=3.3;camera.zoom=clamp(camera.zoom,fit,3.3);camera.updateProjectionMatrix();dirty=true;
 }
 resize();controls.target.set(-3,0,-3);camera.zoom=profile.mobile?.78:.82;camera.updateProjectionMatrix();controls.update();
 function cameraInfo(){return {scale:camera.zoom,min:controls.minZoom,max:controls.maxZoom};}
 controls.addEventListener('change',()=>{dirty=true;onCameraChange?.(cameraInfo());});
 controls.addEventListener('start',()=>{zoomTarget=null;zoomAnchor=null;focusTarget=null;});
 const observer=new ResizeObserver(resize);observer.observe(map);
 canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal:abort.signal});
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();const r=canvas.getBoundingClientRect();zoom(-clamp(e.deltaY,-200,200)*.002);if(!watching.following)zoomAnchor=new T.Vector2((e.clientX-r.left)/width*2-1,1-(e.clientY-r.top)/height*2);},{capture:true,passive:false,signal:abort.signal});
 const editorPointers=new Map();let editDrag=null,editGesture=null;
 function hitAt(x,y){const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((x-rect.left)/width*2-1,1-(y-rect.top)/height*2),camera);return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());}
 function spawnHitAt(x,y){
  const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((x-rect.left)/width*2-1,1-(y-rect.top)/height*2),camera);
  // Use the visible surface so a roof click cannot select a hidden lane behind it.
  const surface=village&&ray.intersectObject(village.root,true).find(h=>h.object.visible&&h.object.material?.opacity!==0);
  return surface?.point||ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
 }
 function gesture(){const a=[...editorPointers.values()];return {x:a.reduce((n,p)=>n+p.x,0)/a.length,y:a.reduce((n,p)=>n+p.y,0)/a.length,d:a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0};}
 function consume(e){e.preventDefault();e.stopImmediatePropagation();}
 canvas.addEventListener('pointerdown',e=>{
  if(!currentEditor)return;consume(e);canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});editorPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});editGesture=gesture();
  if(editorPointers.size>1){editDrag=null;onEdit?.('preview',null);return;}
  const hit=hitAt(e.clientX,e.clientY),id=currentEditor.isStored(currentEditor.selected)?currentEditor.selected:hit&&editOverlay.pick(currentEditor,hit);
  if(id&&e.button===0){onEdit?.('select',id);const a=currentEditor.draft.items[id];const stored=currentEditor.isStored(id);editDrag={pointer:e.pointerId,dx:stored?0:hit.x-a.col,dz:stored?0:hit.z-a.row};if(stored)onEdit?.('preview',{...SQUARE_GRID.fromWorld(hit),rot:a.rot});}else editDrag=null;
 },{capture:true,signal:abort.signal});
 canvas.addEventListener('pointermove',e=>{
  if(!currentEditor||!editorPointers.has(e.pointerId))return;consume(e);editorPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const now=gesture();
  if(editDrag&&editorPointers.size===1){const hit=hitAt(e.clientX,e.clientY);if(hit){const p=SQUARE_GRID.fromWorld({x:hit.x-editDrag.dx,z:hit.z-editDrag.dz});onEdit?.('preview',{...p,rot:currentEditor.draft.items[currentEditor.selected].rot});}}
  else if(editGesture){const before=hitAt(editGesture.x,editGesture.y);if(now.d&&editGesture.d){camera.zoom=clamp(camera.zoom*now.d/editGesture.d,fit,3.3);camera.updateProjectionMatrix();}const after=hitAt(now.x,now.y);if(before&&after){before.sub(after);controls.target.add(before);camera.position.add(before);}dirty=true;}
  editGesture=now;
 },{capture:true,signal:abort.signal});
 const finishEditPointer=e=>{if(!currentEditor||!editorPointers.has(e.pointerId))return;consume(e);if(editDrag?.pointer===e.pointerId)onEdit?.(e.type==='pointercancel'?'preview':'drop',null);editDrag=null;editorPointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);editGesture=editorPointers.size?gesture():null;};
 canvas.addEventListener('pointerup',finishEditPointer,{capture:true,signal:abort.signal});canvas.addEventListener('pointercancel',finishEditPointer,{capture:true,signal:abort.signal});
 canvas.addEventListener('keydown',e=>{if(!currentEditor)return;const key=e.key.toLowerCase();if(key==='r'){consume(e);onEdit?.('rotate',e.shiftKey?-1:1);}else if((e.ctrlKey||e.metaKey)&&key==='z'){consume(e);onEdit?.(e.shiftKey?'redo':'undo');}else if(key.startsWith('arrow')){consume(e);onEdit?.('nudge',key==='arrowleft'?[-1,0]:key==='arrowright'?[1,0]:key==='arrowup'?[0,-1]:[0,1]);}},{capture:true,signal:abort.signal});
 let down=null,panStart=null,spawnPointer=null;const pointers=new Map();
 const remainingPointer=()=>pointers.size===1?{...pointers.values().next().value}:null;
 canvas.addEventListener('pointerdown',e=>{
  if(currentEditor||pilot.busy&&!pilot.choosing)return;const modified=e.ctrlKey||e.metaKey||e.shiftKey;
  const point={x:e.clientX,y:e.clientY,id:e.pointerId,button:e.button,time:performance.now(),pan:e.pointerType==='touch'||e.button===0&&!modified||e.button===2&&modified};
  pointers.set(e.pointerId,point);down=remainingPointer();panStart=remainingPointer();
 },{signal:abort.signal});
 canvas.addEventListener('pointermove',e=>{
  if(currentEditor||pilot.busy&&!pilot.choosing)return;const point=pointers.get(e.pointerId);if(point){point.x=e.clientX;point.y=e.clientY;}
  if(pilot.choosing){spawnPointer={x:e.clientX,y:e.clientY};dirty=true;}
  if(panStart&&panStart.id===e.pointerId&&Math.hypot(e.clientX-panStart.x,e.clientY-panStart.y)>7){
   if(panStart.pan)setFollowing(false);panStart=null;down=null;
  }
 },{signal:abort.signal});
 canvas.addEventListener('pointerup',e=>{
  if(currentEditor||pilot.busy&&!pilot.choosing)return;const tap=down&&down.id===e.pointerId&&down.button===0&&performance.now()-down.time<600&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<7;pointers.delete(e.pointerId);down=null;panStart=remainingPointer();if(!tap||!ready)return;
  if(pilot.choosing){pilot.chooseSpawn(spawnHitAt(e.clientX,e.clientY));dirty=true;return;}
  const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(px/width*2-1,1-py/height*2),camera);
  const obstruction=village?ray.intersectObject(village.root,true).find(h=>h.object.visible&&h.object.material?.opacity!==0):null;
  let nearest=null,distance=22;
  for(const p of actor.positions){vec.set(p.x,.5,p.z).project(camera);const d=Math.hypot((vec.x+1)*width/2-px,(1-vec.y)*height/2-py);if(d<distance){const depth=new T.Vector3(p.x,.5,p.z).sub(ray.ray.origin).dot(ray.ray.direction);if(!obstruction||depth<obstruction.distance+.65){nearest=p;distance=d;}}}
  if(nearest){onSelect('observe');watching.select(nearest.id);lastInspect=0;dirty=true;return;}
  clearObservation();const hit=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
  if(hit){let chosen=null,dist=3.5;for(const id of Object.keys(SITES)){const s=siteAt(currentRun?.layout,id),d=Math.min(Math.hypot(hit.x-s.x,hit.z-s.z),Math.hypot(hit.x-s.building[0],hit.z-s.building[1]));if(d<dist){chosen=id;dist=d;}}for(const o of homeSites(currentRun?.layout)){const d=Math.hypot(hit.x-o.x,hit.z-(o.z-3.5));if(d<dist){chosen='home:'+o.id;dist=d;}}if(chosen)onSelect(chosen);else{const wall=WALLS.find(w=>Math.hypot(hit.x-w.x,hit.z-w.z)<2.5);if(wall)onSelect('wall:'+wall.id);}}dirty=true;
 },{signal:abort.signal});
 canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);down=null;panStart=remainingPointer();},{signal:abort.signal});
 canvas.addEventListener('pointerleave',()=>{if(!pointers.size){spawnPointer=null;pilot.previewSpawn(null);dirty=true;}},{signal:abort.signal});
 canvas.addEventListener('keydown',e=>{
  if(pilot.busy)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','=','-','Home','q','e','Q','E'].includes(e.key))e.preventDefault();
  if(e.key==='Home')reset();else if(e.key==='+'||e.key==='=')zoom(.22);else if(e.key==='-')zoom(-.22);else if(e.key.toLowerCase()==='q')rotate(-1);else if(e.key.toLowerCase()==='e')rotate(1);else if(e.key==='Escape'){clearObservation();}else if(e.key.startsWith('Arrow')){setFollowing(false);const amount=1.1/camera.zoom,dx=e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0,dz=e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0;camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;dirty=true;}
 },{signal:abort.signal});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;status.hidden=false;status.innerHTML='3D 화면이 중단되었습니다. <button type="button" data-city3d-retry>다시 열기</button> · <a href="#city">기존 도시</a>';},{signal:abort.signal});
 function zoom(delta){zoomAnchor=null;zoomTarget=clamp((zoomTarget??camera.zoom)*Math.exp(delta),fit,3.3);dirty=true;}
 function rotate(direction){const offset=camera.position.clone().sub(controls.target),spherical=new T.Spherical().setFromVector3(offset);spherical.theta=clamp(spherical.theta+direction*.22,controls.minAzimuthAngle,controls.maxAzimuthAngle);camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));controls.update();dirty=true;}
 function focus(point,closer=false){if(!point)return;setFollowing(false);focusTarget=new T.Vector3(point.x,0,point.z);if(closer)zoomTarget=Math.max(camera.zoom,width<761?1:1.08);dirty=true;}
 function home(s=currentRun){const p=siteAt(currentEditor?.draft||s?.layout,'heart')||SITES.heart;setFollowing(false);focusTarget=null;zoomAnchor=null;zoomTarget=null;controls.target.set(p.x,0,p.z+1);camera.position.set(p.x+17,30,p.z+32);camera.zoom=width<761?1:1.04;camera.updateProjectionMatrix();controls.update();dirty=true;}
 function reset(){focusTarget=null;setFollowing(false);controls.target.set(-1,0,1);camera.position.set(19,32,33);zoomAnchor=null;zoomTarget=fit;controls.update();dirty=true;}
 const frontText=id=>({skin:'보수 공방',airway:theme==='2'?'O₂ · 환기 항구':'O₂ · 환기 관문',gut:theme==='2'?'식량 부두 · 소화기':'식량 보급소 · 소화기'}[id]);
 const frontLabels=Object.entries(FRONTS).map(([id,p])=>{const b=document.createElement('button');b.type='button';b.className='cc-three-label cc-front-label';b.textContent=frontText(id);b.setAttribute('aria-label',b.textContent+' 선택');b.addEventListener('click',()=>onSelect('front:'+id),{signal:abort.signal});labelLayer.append(b);return {id,site:CITY_ENTRIES[id]?.mouth||CITY_ENTRIES[id]?.portal||p,element:b};});
 const circuitLabels=['체순환 · 심장 → 전신 → 심장','폐순환 · 심장 ⇄ 폐'].map(text=>{const e=document.createElement('span');e.className='cc-circuit-label';e.textContent=text;labelLayer.append(e);return e;});
 let labelRects=[];
 function updateLabels(s,options){
  const occupied=labelRects=[],compact=camera.zoom<.58,top=compactHud.matches?(height<330?60:102):125;
  if(!responseUI.root.hidden){const r=responseUI.root.getBoundingClientRect(),m=map.getBoundingClientRect();occupied.push({x:r.x-m.x,y:r.y-m.y,w:r.width,h:r.height});}
  const ordered=[...labels].sort((a,b)=>(b.id===options.selected?2:b.id==='heart'?1:0)-(a.id===options.selected?2:a.id==='heart'?1:0));
  for(const {id,element} of ordered){
   const site=siteAt(currentEditor?.draft||s.layout,id);vec.set(site.building[0],STYLE.labelHeight[id]||3.8,site.building[1]).project(camera);
   const x=(vec.x+1)*width/2,y=(1-vec.y)*height/2,w=compact?30:100,rect={x:x-w/2,y:y-30,w,h:30};
   const hidden=x<20||x>width-20||y<top||y>height-inset-52||occupied.some(r=>rect.x<r.x+r.w+5&&rect.x+rect.w+5>r.x&&rect.y<r.y+r.h+5&&rect.y+rect.h+5>r.y);
   element.hidden=hidden;element.dataset.compact=String(compact);
   if(hidden)continue;occupied.push(rect);element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
   element.classList.toggle('is-selected',options.selected===id);const bio=s.biology?.sites[id];element.dataset.infection=bio?.stage||'clear';element.querySelector('em').textContent=bio&&bio.stage!=='clear'?STAGES[bio.stage]:'';
   element.querySelector('small').textContent=options.layer==='supply'?`O₂ ${Math.round(s.districts[id].oxygen)}%`:'';
  }
  for(const {id,site:base,element} of frontLabels){if(element.dataset.theme!==theme){element.textContent=frontText(id);element.setAttribute('aria-label',element.textContent+' 선택');element.dataset.theme=theme;}const site=id==='skin'?transformPoint(s.layout,'workshop',base):base;vec.set(site.x,id==='airway'?6.6:id==='gut'?5:2.3,site.z).project(camera);const x=(vec.x+1)*width/2,y=(1-vec.y)*height/2;
   element.hidden=x<45||x>width-45||y<top||y>height-inset-60||(id==='skin'&&camera.zoom<.85)||occupied.some(r=>Math.abs(x-r.x-r.w/2)<85&&Math.abs(y-r.y)<40);
   if(!element.hidden)element.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
  }
  const outlet=village?.outlet;outletLabel.hidden=!outlet;if(outletLabel.dataset.theme!==theme){outletLabel.textContent=theme==='2'?'↗ 배출구':'↗ 정화 연못';outletLabel.dataset.theme=theme;}
  const vascular=theme==='2'&&s.layout?compileVascularLayout(s.layout):null;
  for(let n=0;n<circuitLabels.length;n++){const e=circuitLabels[n],path=n?vascular?.pulmonary[0].points:vascular?.systemic.arterial.points,p=path?.[Math.floor(path.length*(n?.5:.45))];e.hidden=!p;if(!p)continue;vec.set(p.x,.6,p.z).project(camera);const x=(vec.x+1)*width/2,y=(1-vec.y)*height/2;e.hidden=x<90||x>width-90||y<top||y>height-inset-65||occupied.some(r=>x>r.x-85&&x<r.x+r.w+85&&y>r.y-15&&y<r.y+r.h+15);if(!e.hidden)e.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;}
  if(outlet){vec.set(outlet.portal.x,1.7,outlet.portal.z).project(camera);const x=(vec.x+1)*width/2,y=(1-vec.y)*height/2;outletLabel.hidden=x<35||x>width-35||y<top||y>height-inset-60||occupied.some(r=>Math.abs(x-r.x-r.w/2)<65&&Math.abs(y-r.y)<35);if(!outletLabel.hidden)outletLabel.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;}
 }
 function draw(s,options={}){
  if(disposed||document.hidden)return;inset=options.inset||0;const previousRun=currentRun;currentRun=s;if(pilot.busy&&(previousRun!==s||options.editor||s.status!=='running'))pilot.exit();if(!framed){reset();framed=true;}const changedEditor=!!currentEditor!==!!options.editor;currentEditor=options.editor||null;
  if(changedEditor){clearObservation();controls.enabled=!currentEditor;editorPointers.clear();editDrag=null;}
  const layout=currentEditor?.draft||s.layout,editId=currentEditor?.selected||null;
  if(assetCache&&(layout!==villageLayout||editId!==villageEditId))rebuild(layout,editId);
  editOverlay.update(currentEditor);if(currentEditor)village?.movePreview(currentEditor.preview||currentEditor.draft.items[currentEditor.selected]);
  actor.root.visible=!currentEditor;labelLayer.hidden=!!currentEditor||pilot.busy;responseUI.update(s,pilot.busy||!!currentEditor||!game.querySelector('.cc-start')?.hidden);
  alarms.update(s,pilot.busy||!!currentEditor||!game.querySelector('.cc-start')?.hidden);
  const now=performance.now();
  if(options.frameTime!=null&&adaptive.sample(options.frameTime,ready&&!options.paused&&!currentEditor))applyQuality();
  if(!shouldRender(now,quality.fps))return;
  if(options.interpolation!=null)interpolation=options.interpolation;
  motion.prepare(s,interpolation,options.paused);
  const firstPerson=pilot.active,pilotView=firstPerson?pilot.render(now,options.paused?1:interpolation):null,renderCamera=firstPerson?pilot.camera:camera;
  if(!firstPerson){
  const cell=watching.resolve(s);
  if(followButton.getAttribute('aria-pressed')!==String(watching.following))syncFollowing();
  updateInspection(s,cell,now);
  if(zoomTarget!==null){const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);let before=null;if(zoomAnchor){ray.setFromCamera(zoomAnchor,camera);before=ray.ray.intersectPlane(plane,new T.Vector3());}camera.zoom+=(zoomTarget-camera.zoom)*.24;if(Math.abs(camera.zoom-zoomTarget)<.002){camera.zoom=zoomTarget;zoomTarget=null;}camera.updateProjectionMatrix();if(before){ray.setFromCamera(zoomAnchor,camera);const after=ray.ray.intersectPlane(plane,new T.Vector3());if(after){before.sub(after);controls.target.add(before);camera.position.add(before);}}dirty=true;}
  if(focusTarget){
   viewOffset.subVectors(camera.position,controls.target);const horizontal=Math.hypot(viewOffset.x,viewOffset.z),elevation=viewOffset.y/viewOffset.length(),focusY=Math.max(80,((compactHud.matches?(height<330?60:102):130)+height-inset-(compactHud.matches?62:110))/2),shift=(height/2-focusY)*(camera.top-camera.bottom)/(height*camera.zoom*Math.max(.2,elevation));
   followPoint.set(clamp(focusTarget.x+viewOffset.x/horizontal*shift,CITY_BOUNDS.left+3,CITY_BOUNDS.right-3),0,clamp(focusTarget.z+viewOffset.z/horizontal*shift,CITY_BOUNDS.top+2,CITY_BOUNDS.bottom-2));
   moveFollowCamera(camera.position,controls.target,followPoint,(now-lastFrame)/1000);if(controls.target.distanceTo(followPoint)<.02)focusTarget=null;dirty=true;
  }
  if(watching.following&&cell)trackCell(cell,(now-lastFrame)/1000);
  controls.update();const cx=clamp(controls.target.x,CITY_BOUNDS.left+3,CITY_BOUNDS.right-3),cz=clamp(controls.target.z,CITY_BOUNDS.top+2,CITY_BOUNDS.bottom-2);camera.position.x+=cx-controls.target.x;camera.position.z+=cz-controls.target.z;controls.target.x=cx;controls.target.z=cz;
  viewOffset.subVectors(camera.position,controls.target);const distance=viewOffset.length(),range=landscapeCameraRange(camera.top-camera.bottom,camera.zoom,viewOffset.y/distance);
  camera.position.copy(controls.target).addScaledVector(viewOffset,range.distance/distance);
  if(Math.abs(camera.far-range.far)>.01){camera.far=range.far;camera.updateProjectionMatrix();}
  scene.fog.near=range.fogNear;scene.fog.far=range.fogFar;camera.updateMatrixWorld();
  }else{scene.fog.near=35;scene.fog.far=100;}
  if(options.paused&&!dirty&&!firstPerson&&now-lastFrame<250)return;
  lastFrame=now;viewMatrix.multiplyMatrices(renderCamera.projectionMatrix,renderCamera.matrixWorldInverse);viewFrustum.setFromProjectionMatrix(viewMatrix);actor.draw(s,{...options,motion,canals:village?.canals,visible:actorVisible,hiddenCell:firstPerson?pilot.cell?.id:null,eyePosition:pilotView?{...pilotView.position,y:pilotView.eye}:null,selectedCell:watching.id,readability:firstPerson?1:clamp(30/(height*camera.zoom/(camera.top-camera.bottom)),1,1.5)});village?.update(currentEditor?{...s,layout:currentEditor.draft}:s,{...options,camera:renderCamera,target:firstPerson?renderCamera.position:controls.target});homeScene?.update(s,options.homeLoop);if(!pilot.busy)updateLabels(s,options);const site=siteAt(s.layout,options.selected);selection.visible=!!site&&!currentEditor&&!pilot.busy;selection.material.color.setHex(0xd1ae6c);if(site){selection.position.set(site.x,.08,site.z);selection.scale.setScalar(site.detail?1:.7);}
  if(pilot.choosing){if(spawnPointer&&dirty)pilot.previewSpawn(spawnHitAt(spawnPointer.x,spawnPointer.y));const point=pilot.spawnPreview;selection.visible=!!point;if(point){selection.position.set(point.x,.12,point.z);selection.scale.setScalar(.3);selection.material.color.setHex(point.valid?0x8fffd2:0xff796d);}}
  if(quality.shadow&&now-lastShadow>quality.shadowInterval){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
  const illness=clamp(Math.max((75-cityHealth(s))/65,(s.inflammation-30)/70),0,1);scene.background.copy(calmSky).lerp(illSky,illness*.8);scene.fog.color.copy(scene.background);sun.color.copy(warmSun).lerp(illSun,illness);
  const hideHost=!!currentEditor||!game.querySelector('.cc-start')?.hidden;hostScene.update(s,hideHost);hostScene.project(renderCamera,width,height,inset,hideHost||labelLayer.hidden||!!game.dataset.panel);
  homeScene?.project(s,renderCamera,width,height,inset,hideHost||labelLayer.hidden||!!currentEditor,labelRects);
  renderer.info.autoReset=false;renderer.info.reset();renderer.render(scene,renderCamera);if(firstPerson)pilot.renderHands(renderer);if(ready&&!options.paused&&!currentEditor)adaptive.rendered(performance.now()-now);dirty=false;frames++;minCalls=Math.min(minCalls,renderer.info.render.calls);peakCalls=Math.max(peakCalls,renderer.info.render.calls);peakTriangles=Math.max(peakTriangles,renderer.info.render.triangles);
  if(now-lastStats>1000){const label=game.querySelector('[data-city-performance]');if(label)label.textContent=`${options.paused?'일시정지':Math.round(frames*1000/(now-lastStats))+' fps'} · 목표 ${quality.fps} · DPR ${quality.dpr.toFixed(2)} · 그림자 ${quality.shadow||'OFF'} · ${minCalls===peakCalls?peakCalls:minCalls+'–'+peakCalls} draws · ${Math.round(peakTriangles/1000)}k tris`;lastStats=now;frames=0;minCalls=Infinity;peakCalls=0;peakTriangles=0;}
 }
 function rebuild(layout,id){const next=createVillage(assetCache,layout,id,newBundle,theme);homeScene?.dispose();homeScene=layout?createHomeostasisScene({layout,theme,bundle:newBundle,map,onSelect}):null;if(homeScene){next.root.add(homeScene.root);pilotWorld(layout,theme).setAnnexSurface(createPilotSurface(homeScene.buildings));}if(village){scene.remove(village.root);village.dispose();}village=next;villageLayout=layout;villageEditId=id;scene.add(village.root);renderer.shadowMap.needsUpdate=true;adaptive.suspend(performance.now());dirty=true;}
 function setTheme(value){const next=normalizeCityTheme(value);if(next===theme)return true;const previous=theme;theme=next;try{if(assetCache)rebuild(currentEditor?.draft||currentRun?.layout,currentEditor?.selected||null);pilot.setTheme(theme);calmSky.setHex(theme==='2'?CANAL_STYLE.sky:STYLE.sky);dirty=true;return true;}catch(error){theme=previous;console.error('City theme failed',error);return false;}}
 const assetSwitch=createAssetSwitch({load:loadCityBundle,apply(bundle){newBundle=bundle;rebuild(currentEditor?.draft||currentRun?.layout,currentEditor?.selected||null);},state(state,error){
  game.dataset.newAssets=state;const note=game.querySelector('[data-city-asset-state]');if(note)note.textContent=state==='loading'?'불러오는 중…':state==='error'?'불러오기 실패 · 다시 체크':'';
  if(error)console.error('Village asset load failed',error);
 }});
 function setNewAssets(enabled){wantNewAssets=!!enabled;if(ready)void assetSwitch.set(wantNewAssets);else game.dataset.newAssets=wantNewAssets?'loading':'off';}
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
  assetCache=assets;rebuild(currentEditor?.draft||currentRun?.layout,currentEditor?.selected||null);ready=true;dirty=true;renderer.shadowMap.needsUpdate=true;
  game.dataset.renderer='three';game.dataset.assets=failed?'partial':'ready';status.hidden=!failed;if(failed){status.classList.add('cc-three-loading--warning');status.textContent='일부 마을 소품을 불러오지 못했습니다.';}
  void assetSwitch.set(wantNewAssets);
  // Keep source models until disposal: Apply rebuilds the static mesh once.
 }
 load().catch(error=>{if(disposed)return;console.error('3D village load failed',error);status.innerHTML='마을을 불러오지 못했습니다. <button type="button" data-city3d-retry>다시 열기</button> · <a href="#city">기존 도시</a>';});
 return {draw,zoom,rotate,reset,focus,home,cameraInfo,setNewAssets,setTheme,openPilot(){if(ready&&!currentEditor&&currentRun)pilot.open(currentRun);},exitPilot:()=>pilot.exit(),updatePilot:(s,dt)=>pilot.tick(s,dt),captureMotion:s=>motion.capture(s),beginLayout(){pilot.exit();clearObservation();zoomAnchor=null;zoomTarget=Math.max(camera.zoom,width<761?.95:1);focus(siteAt(currentRun?.layout,'heart'));},invalidate(){dirty=true;},dispose(){disposed=true;pilot.dispose();scene.remove(pilot.root);abort.abort();observer.disconnect();controls.dispose();motion.reset();sun.shadow.dispose();homeScene?.dispose();village?.dispose();release(scene);assetSwitch.dispose();if(assetCache)for(const a of Object.values(assetCache))release(a);renderer.dispose();renderer.forceContextLoss();status.remove();labelLayer.remove();inspect.remove();responseUI.dispose();alarms.dispose();delete game.dataset.cellObserved;delete game.dataset.cellFollowing;delete game.dataset.newAssets;}};
}
