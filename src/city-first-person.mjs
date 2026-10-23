import * as T from './vendor/three/three.module.min.js';
import {createCityPilot} from './city-pilot.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {PILOT_TOOLS} from './city-pilot-state.mjs';
import {pilotStock} from './city-pilot-tasks.mjs';
import {createPilotTools,pilotToolIcon} from './city-pilot-tools.mjs';
import {groundPoint} from './city-three-layout.mjs';
import {pathogenDef} from './city-pathogens.mjs';
import {createPilotFixtures} from './city-pilot-fixtures.mjs';
import {createPilotEffects} from './city-pilot-effects.mjs';

export function createFirstPerson(canvas,{map,game,onMode,theme:readTheme,selectedCell}){
 const abort=new AbortController(),signal=abort.signal,model=createCityPilot(),camera=new T.PerspectiveCamera(74,1,.035,150),root=new T.Group();
 camera.rotation.order='YXZ';root.visible=false;
 const hud=document.createElement('section');hud.className='cc-pilot';hud.hidden=true;hud.setAttribute('aria-label','세포 직접 조종');
 const toolButtons=()=>PILOT_TOOLS.map(t=>`<button type="button" data-pilot-tool="${t.id}" aria-label="${t.key} ${t.name}" aria-pressed="false" title="${t.key} · ${t.name}"><kbd>${t.key}</kbd>${pilotToolIcon(t.id)}<strong>${t.short}</strong><small data-pilot-stock="${t.id}"></small></button>`).join('');
 hud.innerHTML=`<header class="cc-pilot-top"><div><small>CELL VIEW</small><strong data-pilot-name></strong><span data-pilot-motion></span></div><div><button type="button" data-pilot-flight aria-pressed="false" title="J · 제트팩">비행 <kbd>J</kbd></button><button type="button" class="cc-pilot-lock" data-pilot-lock>시점 고정</button><button type="button" data-pilot-pause aria-label="체험 일시정지">Ⅱ</button><button type="button" data-pilot-exit>도시로 ↗</button></div></header>
 <div class="cc-pilot-waypoint"><i data-pilot-bearing>↑</i><div><strong data-pilot-goal></strong><small data-pilot-distance></small></div><button type="button" data-pilot-destination aria-label="다음 배송지" title="R · 다음 배송지" hidden>↻ <kbd>R</kbd></button></div>
 <div class="cc-pilot-flight"><span data-pilot-altitude>0.0 m</span><progress data-pilot-fuel max="100" value="100" aria-label="제트팩 연료"></progress><small data-pilot-fuel-text></small><small data-pilot-dash-ready></small></div><button type="button" class="cc-pilot-unstuck" data-pilot-recover hidden>길로 복귀</button><div class="cc-pilot-crosshair" aria-hidden="true">＋</div><div class="cc-pilot-target"><strong data-pilot-target></strong><small data-pilot-object-status></small><progress data-pilot-target-health max="1" value="0" hidden></progress><button type="button" data-pilot-match hidden></button></div>
 <div class="cc-pilot-feedback" role="status" data-pilot-feedback></div><div class="cc-pilot-transfer"><progress data-pilot-transfer max="1" value="0"></progress><span data-pilot-action-hint></span></div>
 <div class="cc-pilot-bottom"><div class="cc-pilot-vitals"><strong data-pilot-health></strong><span data-pilot-energy></span><small data-pilot-cargo></small><small data-pilot-score></small></div><div class="cc-pilot-map"><canvas width="160" height="160" aria-label="세포 위치와 목적지 지도"></canvas></div></div>
 <div class="cc-pilot-selected"><strong data-pilot-selected></strong><small data-pilot-ready></small></div><div class="cc-pilot-hotbar" role="group" aria-label="도구 퀵슬롯">${toolButtons()}</div>
 <div class="cc-pilot-stick" role="group" aria-label="세포 이동 조이스틱"><i></i></div><div class="cc-pilot-actions" aria-label="터치 조작"><button type="button" data-pilot-toggle="sprint" aria-pressed="false">달리기</button><button type="button" data-pilot-hold="crouch">앉기</button><button type="button" data-pilot-hold="jump">점프</button><button type="button" data-pilot-hold="scope">조준</button><button type="button" data-pilot-hold="dash">돌진</button><button type="button" data-pilot-hold="use">공격</button></div>
 <div class="cc-pilot-keys">WASD 이동 · Space 점프/상승 · Ctrl 앉기/하강 · J 비행 · V 돌진 · Shift 달리기 · 휠 도구 · E 사용</div>
 <div class="cc-pilot-paused" hidden><div><button type="button" data-pilot-resume>▶ 계속하기</button><button type="button" data-pilot-recover>길로 복귀</button><button type="button" data-pilot-exit>도시로 ↗</button></div></div>
 <div class="cc-pilot-error" hidden><p>조종할 세포를 충원해 주세요</p><button type="button" data-pilot-exit>도시로 ↗</button></div>`;
 const placement=document.createElement('section');placement.className='cc-pilot-placement';placement.hidden=true;placement.setAttribute('aria-label','1인칭 시작 위치 선택');
 placement.innerHTML='<div><strong>어디서 시작할까요?</strong><span role="status">길이나 수로를 클릭하세요</span></div><button type="button" aria-label="시작 위치 선택 취소">취소 <kbd>Esc</kbd></button>';
 map.append(hud,placement);
 const q=s=>hud.querySelector(s),fields=Object.fromEntries(['altitude','fuel','fuel-text','dash-ready','name','motion','goal','distance','bearing','target','target-health','object-status','match','feedback','transfer','action-hint','health','energy','cargo','score','destination','selected','ready'].map(id=>[id,q('[data-pilot-'+id+']')]));
 const keys=new Set(),pointers=new Map(),touch={forward:0,strafe:0,use:false,jump:false,scope:false,sprint:false,crouch:false,dash:false};
 const overviewLabel=canvas.getAttribute('aria-label');let mouseUse=false,mouseScope=false,jumpQueued=false,dashQueued=false,useQueued=false,crouchToggle=false,menu='',failed=false,run=null,hadLock=false,lastHud=-Infinity,lastRender=0,lastTool='',lastWidth=0,theme='2',fallback=false;
 let choosing=false,spawnPreview=null,spawnWorld=null,preferred=null;
 const guideMaterial=new T.MeshBasicMaterial({color:0xa9f2dc,depthTest:true}),guide=new T.InstancedMesh(new T.SphereGeometry(.07,5,4),guideMaterial,100),dummy=new T.Object3D();guide.frustumCulled=false;root.add(guide);
 const beacon=new T.Mesh(new T.TorusGeometry(.55,.045,5,28),guideMaterial);beacon.rotation.x=-Math.PI/2;root.add(beacon);
 const heldTools=createPilotTools();root.add(camera);
 const fixtures=createPilotFixtures();root.add(fixtures.root);const effects=createPilotEffects();root.add(effects.root);
 const touchUI=()=>matchMedia('(pointer:coarse), (max-width:760px), (max-height:520px)').matches;
 const on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal});
 function clearInput(){keys.clear();pointers.clear();Object.assign(touch,{forward:0,strafe:0,use:false,jump:false,scope:false,sprint:false,crouch:false,dash:false});mouseUse=mouseScope=jumpQueued=dashQueued=useQueued=crouchToggle=false;q('.cc-pilot-stick i').style.transform='';model.resetMotion();for(const b of hud.querySelectorAll('[data-pilot-toggle]'))b.setAttribute('aria-pressed','false');}
 function unlock(){hadLock=false;if(document.pointerLockElement===canvas)document.exitPointerLock();}
 function lock(){
  if(touchUI()||!model.active||menu)return;
  fallback=false;
  try{const request=canvas.requestPointerLock?.();if(!canvas.requestPointerLock)fallback=true;request?.catch(()=>{fallback=true;fields.feedback.textContent='화면 클릭 · 시점 고정';});}catch{fallback=true;}
 }
 function syncMenu(){q('.cc-pilot-paused').hidden=menu!=='pause';hud.dataset.menu=menu;}
 function pause(){
  if(!model.active)return;menu='pause';clearInput();unlock();onMode('pause');syncMenu();render(performance.now(),1);q('[data-pilot-resume]')?.focus();
 }
 function resume(){if(!model.active)return;menu='';clearInput();syncMenu();onMode('resume');canvas.focus({preventScroll:true});lock();}
 function exit(){
  const wasOpen=model.active||failed||choosing;choosing=false;spawnPreview=null;spawnWorld=null;placement.hidden=true;model.stop();failed=false;menu='';clearInput();root.visible=false;hud.hidden=true;delete game.dataset.pilot;unlock();canvas.setAttribute('aria-label',overviewLabel);if(wasOpen)onMode('exit');canvas.focus({preventScroll:true});
 }
 function open(s){
  if(model.active||failed||choosing||!s.layout||s.status!=='running')return;
  run=s;theme=readTheme();preferred=selectedCell();spawnWorld=pilotWorld(s.layout,theme);choosing=true;spawnPreview=null;menu='';clearInput();syncMenu();
  placement.hidden=false;placement.dataset.invalid='false';placement.querySelector('[role="status"]').textContent=touchUI()?'길이나 수로를 터치하세요':'길이나 수로를 클릭하세요';game.dataset.pilot='choose';canvas.setAttribute('aria-label','1인칭 시작 위치 선택. 지도 이동·확대 후 길이나 수로를 클릭하세요. Escape 취소.');onMode('choose');canvas.focus({preventScroll:true});
 }
 function previewSpawn(point){if(!choosing)return;spawnPreview=point?{x:point.x,z:point.z,valid:spawnWorld.canStand(point)}:null;}
 function chooseSpawn(point){
  if(!choosing)return;previewSpawn(point);
  if(!spawnPreview?.valid){placement.dataset.invalid='true';placement.querySelector('[role="status"]').textContent='빈 길이나 수로를 선택하세요';return;}
  failed=!model.start(run,{preferred,theme,spawn:spawnPreview});choosing=false;spawnPreview=null;spawnWorld=null;placement.hidden=true;hud.hidden=false;q('.cc-pilot-error').hidden=!failed;game.dataset.pilot='explorer';if(failed)return;
  root.visible=true;lastHud=-Infinity;lastTool='';lastRender=0;canvas.setAttribute('aria-label','세포 1인칭. WASD 이동, 마우스 시점, 휠 또는 1–0과 마이너스 도구 전환, Q 직전 도구, F 맞는 도구, 클릭 또는 E 사용, J 제트팩, V 돌진, Space 점프 또는 상승, Shift 달리기, Ctrl 앉기 또는 하강, Escape 메뉴.');onMode('start');canvas.focus({preventScroll:true});render(performance.now(),1);lock();
 }
 on(placement.querySelector('button'),'click',exit);
 function switched(changed){if(!changed)return;touch.scope=mouseScope=false;lastTool='';lastHud=-Infinity;render(performance.now(),1);}
 function equip(id){switched(model.equip(id));}
 let swipe=null,swipeSuppressUntil=0;
 on(hud,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-pilot-exit'))exit();
  else if(b.hasAttribute('data-pilot-lock')){canvas.focus({preventScroll:true});lock();}
  else if(b.hasAttribute('data-pilot-resume'))resume();
  else if(b.hasAttribute('data-pilot-flight')&&!menu){touch.crouch=crouchToggle=false;model.toggleFlight();lastHud=-Infinity;}
  else if(b.hasAttribute('data-pilot-recover')){model.recoverPosition();if(menu)resume();}
  else if(b.hasAttribute('data-pilot-pause'))menu?resume():pause();
  else if(b.hasAttribute('data-pilot-match')&&!menu)switched(model.matchTool());
  else if(b.dataset.pilotTool&&!menu&&performance.now()>swipeSuppressUntil)equip(b.dataset.pilotTool);
  else if(b.hasAttribute('data-pilot-destination')){model.nextDestination();lastHud=-Infinity;}
  else if(b.dataset.pilotToggle){const kind=b.dataset.pilotToggle;touch[kind]=!touch[kind];b.setAttribute('aria-pressed',String(touch[kind]));}
 });
 on(window,'keydown',e=>{
  if(choosing){if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit();}return;}
  if(!model.active&&!failed)return;
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(failed)exit();else menu?resume():pause();return;}
  if(failed)return;
  if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(e.code==='KeyP'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)menu?resume():pause();return;}
  if(menu)return;
  const slot=PILOT_TOOLS.find(t=>e.code===(t.key==='-'?'Minus':'Digit'+t.key));if(slot){e.preventDefault();e.stopImmediatePropagation();equip(slot.id);return;}
  if(e.code==='KeyJ'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){touch.crouch=crouchToggle=false;model.toggleFlight();}return;}
  if(e.code==='KeyQ'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)switched(model.previous());return;}
  if(e.code==='KeyF'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)switched(model.matchTool());return;}
  if(e.code==='KeyR'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){model.nextDestination();lastHud=-Infinity;}return;}
  if(e.code==='KeyC'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)crouchToggle=!crouchToggle;return;}
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF','KeyV','Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpQueued=true;if(e.code==='KeyV'&&!e.repeat)dashQueued=true;}
 },{capture:true});
 on(window,'keyup',e=>keys.delete(e.code));
 on(window,'blur',()=>{if(model.active&&!menu)pause();});on(window,'pagehide',()=>{if(model.active&&!menu)pause();});
 on(document,'visibilitychange',()=>{if(document.hidden&&model.active&&!menu)pause();});
 on(document,'pointerlockchange',()=>{if(document.pointerLockElement===canvas){hadLock=true;fallback=false;}else if(hadLock&&model.active){hadLock=false;pause();}q('.cc-pilot-lock').textContent=document.pointerLockElement===canvas?'시점 고정됨':'시점 고정';});
 on(document,'pointerlockerror',()=>{fallback=true;fields.feedback.textContent='화면 클릭 · 시점 고정';});
 on(document,'mousemove',e=>{if(model.active&&!menu&&document.pointerLockElement===canvas)model.look(e.movementX,e.movementY);});
 on(canvas,'contextmenu',e=>{if(model.active)e.preventDefault();});
 on(canvas,'pointerdown',e=>{
  if(!model.active)return;e.preventDefault();e.stopImmediatePropagation();if(menu)return;canvas.focus({preventScroll:true});
  if(e.pointerType==='touch'||document.pointerLockElement!==canvas){canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{kind:'look',x:e.clientX,y:e.clientY,moved:0,button:e.button,mouse:e.pointerType==='mouse',at:performance.now()});}
  if(e.pointerType!=='touch'){if(e.button===2)mouseScope=true;else if(e.button===0){if(document.pointerLockElement!==canvas&&!touchUI()&&fallback)lock();mouseUse=document.pointerLockElement===canvas;}}
 },{capture:true});
 on(canvas,'pointermove',e=>{if(!model.active)return;e.stopImmediatePropagation();const p=pointers.get(e.pointerId);if(p?.kind==='look'&&!menu&&document.pointerLockElement!==canvas){p.moved+=Math.hypot(e.clientX-p.x,e.clientY-p.y);model.look((e.clientX-p.x)*1.5,(e.clientY-p.y)*1.5);if(p.moved>5)mouseUse=false;p.x=e.clientX;p.y=e.clientY;}},{capture:true});
 const wheel=e=>{if(model.active){e.preventDefault();e.stopImmediatePropagation();if(!menu&&e.deltaY)switched(model.cycle(e.deltaY>0?1:-1));}};
 on(canvas,'wheel',wheel,{capture:true,passive:false});on(q('.cc-pilot-hotbar'),'wheel',wheel,{passive:false});
 const hotbar=q('.cc-pilot-hotbar');
 on(hotbar,'pointerdown',e=>{if(!menu)swipe={id:e.pointerId,x:e.clientX,y:e.clientY};});
 on(window,'pointerup',e=>{if(!swipe||e.pointerId!==swipe.id)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.5){e.preventDefault();swipeSuppressUntil=performance.now()+250;switched(model.cycle(dx<0?1:-1));}});
 on(window,'pointercancel',()=>{swipe=null;});
 const release=e=>{if(e.button===2)mouseScope=false;else mouseUse=false;const p=pointers.get(e.pointerId);if(p?.kind==='look'&&p.mouse&&p.button===0&&p.moved<5&&performance.now()-p.at<160)useQueued=true;if(p?.kind==='stick'){touch.forward=touch.strafe=0;q('.cc-pilot-stick i').style.transform='';}if(['use','jump','scope','crouch','dash'].includes(p?.kind))touch[p.kind]=false;pointers.delete(e.pointerId);};
 on(window,'pointerup',release);on(window,'pointercancel',()=>clearInput());
 on(canvas,'pointerup',e=>{if(model.active){release(e);e.stopImmediatePropagation();}},{capture:true});
 const stick=q('.cc-pilot-stick');
 function moveStick(e,p){touch.strafe=Math.max(-1,Math.min(1,(e.clientX-p.x)/35));touch.forward=Math.max(-1,Math.min(1,-(e.clientY-p.y)/35));stick.querySelector('i').style.transform=`translate(${touch.strafe*26}px,${-touch.forward*26}px)`;}
 on(stick,'pointerdown',e=>{if(menu||!model.active)return;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect(),p={kind:'stick',x:r.left+r.width/2,y:r.top+r.height/2};pointers.set(e.pointerId,p);moveStick(e,p);});
 on(stick,'pointermove',e=>{const p=pointers.get(e.pointerId);if(p?.kind==='stick')moveStick(e,p);});
 for(const b of hud.querySelectorAll('[data-pilot-hold]'))on(b,'pointerdown',e=>{if(menu||!model.active)return;b.setPointerCapture(e.pointerId);const kind=b.dataset.pilotHold;pointers.set(e.pointerId,{kind});touch[kind]=true;if(kind==='jump')jumpQueued=true;if(kind==='dash')dashQueued=true;});
 function tick(s,dt){
  if(!model.active)return;if(s!==run){exit();return;}if(menu)return;
  const lookPointer=[...pointers.values()].find(p=>p.kind==='look');if(lookPointer?.mouse&&lookPointer.button===0&&lookPointer.moved<5&&performance.now()-lookPointer.at>160)mouseUse=true;
  model.step(dt,{forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+touch.forward,strafe:Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+touch.strafe,turn:Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),look:Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')),sprint:touch.sprint||keys.has('ShiftLeft')||keys.has('ShiftRight'),crouch:touch.crouch||crouchToggle||keys.has('ControlLeft')||keys.has('ControlRight'),dash:dashQueued||touch.dash||keys.has('KeyV'),jump:jumpQueued||touch.jump||keys.has('Space'),scope:mouseScope||touch.scope,use:useQueued||mouseUse||touch.use||keys.has('KeyE')});jumpQueued=dashQueued=useQueued=false;
  if(!model.active){failed=true;exit();}
 }
 function minimap(v){
  const ctx=q('.cc-pilot-map canvas').getContext('2d'),scale=1.7,at=p=>[80+p.x*scale,80+p.z*scale];ctx.clearRect(0,0,160,160);ctx.fillStyle='#183936';ctx.beginPath();ctx.arc(80,80,75,0,Math.PI*2);ctx.fill();ctx.lineWidth=1;
  for(const path of model.world.town.vascular.vessels){ctx.strokeStyle=path.oxygenated?'#b57366':'#588d9c';ctx.beginPath();path.points.forEach((p,i)=>{const [x,z]=at(p);if(i)ctx.lineTo(x,z);else ctx.moveTo(x,z);});ctx.stroke();}
  for(const s of model.world.stations){const [x,z]=at(s);ctx.fillStyle='#dcceb1';ctx.fillRect(x-2,z-2,4,4);}
  for(const e of run.enemies.filter(e=>!e.dead&&e.entered)){const [x,z]=at(groundPoint(e));ctx.fillStyle='#ec887e';ctx.fillRect(x-1.5,z-1.5,3,3);}
  const [gx,gz]=at(v.goal);ctx.strokeStyle='#f5db92';ctx.lineWidth=2;ctx.beginPath();ctx.arc(gx,gz,4,0,Math.PI*2);ctx.stroke();
  const [x,z]=at(v.position);ctx.save();ctx.translate(x,z);ctx.rotate(v.yaw);ctx.fillStyle='#c1fff0';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(0,2);ctx.lineTo(-4,4);ctx.fill();ctx.restore();
 }
 function render(now,alpha=1){
  const v=model.view(menu?1:alpha);if(!v)return null;
  const dt=lastRender?Math.min(.05,(now-lastRender)/1000):.05;lastRender=now;
  const aspect=Math.max(.1,map.clientWidth/map.clientHeight),base=Math.min(110,2*Math.atan(Math.tan(37*Math.PI/180)/Math.min(1,aspect))*180/Math.PI),fov=base+(v.scoped?-13:v.dashing?9:v.sprinting?4:v.flying?2:0);
  camera.aspect=aspect;camera.fov+=(fov-camera.fov)*(1-Math.exp(-12*dt));camera.updateProjectionMatrix();camera.position.set(v.position.x,v.eye,v.position.z);camera.rotation.set(v.pitch,-v.yaw,0,'YXZ');camera.updateMatrixWorld();heldTools.update(v,now,aspect,menu==='pause',map.clientHeight);fixtures.update(run,v);effects.update(v,run.time);
  beacon.visible=!v.goal.idle;beacon.position.set(v.goal.x,.15,v.goal.z);guide.count=0;let length=0,previous=v.position;
  for(const next of v.guide){const d=Math.hypot(next.x-previous.x,next.z-previous.z);if(length>14)break;for(let i=.6;i<d&&guide.count<100;i+=.6){if(length+i>14)break;dummy.position.set(previous.x+(next.x-previous.x)*i/d,.13,previous.z+(next.z-previous.z)*i/d);dummy.updateMatrix();guide.setMatrixAt(guide.count++,dummy.matrix);}length+=d;previous=next;}guide.instanceMatrix.needsUpdate=true;
  hud.dataset.hit=String(v.hit);hud.dataset.hurt=String(v.hurt);hud.dataset.scoped=String(v.scoped);fields.transfer.value=v.progress;
  if(lastTool!==v.inventory.tool||lastWidth!==map.clientWidth){lastWidth=map.clientWidth;lastTool=v.inventory.tool;for(const b of hud.querySelectorAll('[data-pilot-tool]')){const active=b.dataset.pilotTool===lastTool;b.setAttribute('aria-pressed',String(active));if(active)b.scrollIntoView({block:'nearest',inline:'nearest'});}q('[data-pilot-hold="use"]').textContent=v.tool.short;fields.selected.textContent=v.tool.name;}
  if(now-lastHud<100)return v;lastHud=now;
  fields.name.textContent='탐험가 #'+v.cell.id;fields.motion.textContent=v.flying?'제트팩':v.airborne?'공중':v.height>.5?'지붕 위':v.crouching?'앉기':v.sprinting?'달리기':'';
  hud.dataset.flying=String(v.flying);hud.dataset.dashing=String(v.dashing);fields.altitude.textContent=v.height.toFixed(1)+' m';fields.fuel.value=v.fuel;fields['fuel-text'].textContent='연료 '+Math.ceil(v.fuel);fields['dash-ready'].textContent=v.dashCooldown?v.dashCooldown.toFixed(1)+'초':'V · 돌진';
  q('[data-pilot-flight]').setAttribute('aria-pressed',String(v.flying));q('[data-pilot-hold=jump]').textContent=v.flying?'상승':'점프';q('[data-pilot-hold=crouch]').textContent=v.flying?'하강':'앉기';q('.cc-pilot-unstuck').hidden=!v.stuck;
  fields.goal.textContent=v.goal.name;fields.distance.textContent=v.goal.idle?'주변 탐색':v.distance<=v.tool.range?'목표 근처':Math.round(v.distance)+' · 이동';fields.bearing.style.transform=`rotate(${Math.atan2(v.next.x-v.position.x,-(v.next.z-v.position.z))-v.yaw}rad)`;
  const object=v.interaction,enemy=object?object.jobs.find(j=>j.enemy)?.enemy:v.aim;
  fields.target.textContent=object?.name||(enemy?(pathogenDef(enemy.recordId)?.name||'병원체'):'');fields['object-status'].textContent=object?.status||'';fields['target-health'].hidden=!enemy;if(enemy)fields['target-health'].value=enemy.hp/(enemy.maxHp||enemy.hp);
  fields.match.hidden=!object||object.matching||object.idle;fields.match.textContent=object?`${touchUI()?'':'F · '}${object.tool.key} ${object.tool.name}`:'';
  hud.dataset.target=object?(object.matching&&object.near?'ready':'focus'):'';
  fields.feedback.textContent=v.notice;fields['action-hint'].textContent=v.progress?'작업 중':object?.matching?(object.near?(touchUI()?'사용 길게':'클릭 / E 유지')+' · '+object.action:Math.ceil(object.standDistance)+' · 접근'):object?.idle?'지금 할 작업 없음':'';
  fields.ready.textContent=v.cooldown>0?v.cooldown.toFixed(1)+'초':(touchUI()?'슬롯 터치 · 밀어서 전환':'휠 · 1–0 / − · Q 직전 도구');
  fields.health.textContent='HP '+Math.round(v.cell.integrity);fields.energy.textContent='에너지 '+Math.round(v.cell.energy);fields.cargo.textContent='O₂ '+Math.round(v.inventory.oxygen)+' · 영양 '+Math.round(v.inventory.nutrient)+' · 잔해 '+v.inventory.debris;
  fields.score.textContent=`공격 ${v.shots} · 작업 ${v.actions}`;fields.destination.hidden=!(['oxygen','nutrient'].includes(v.inventory.tool)&&v.inventory[v.inventory.tool]>0);
  for(const el of hud.querySelectorAll('[data-pilot-stock]'))el.textContent=pilotStock(run,el.dataset.pilotStock);
  minimap(v);return v;
 }
 return {camera,root,open,exit,tick,render,previewSpawn,chooseSpawn,renderHands:renderer=>heldTools.render(renderer),get choosing(){return choosing;},get spawnPreview(){return spawnPreview;},get active(){return model.active;},get busy(){return model.active||failed||choosing;},get cell(){return model.cell;},setTheme(value){if(choosing)exit();theme=value;model.setTheme(value);clearInput();if(!model.active&&!failed&&!hud.hidden){failed=true;exit();}},dispose(){model.stop();abort.abort();unlock();guide.geometry.dispose();guideMaterial.dispose();beacon.geometry.dispose();heldTools.dispose();fixtures.dispose();effects.dispose();hud.remove();placement.remove();delete game.dataset.pilot;}};
}
