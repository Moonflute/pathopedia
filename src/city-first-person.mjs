import * as T from './vendor/three/three.module.min.js';
import {createCityPilot} from './city-pilot.mjs';
import {PILOT_TOOLS} from './city-pilot-state.mjs';
import {cityDistricts} from './city-tile-layout.mjs';
import {groundPoint} from './city-three-layout.mjs';
import {pathogenDef} from './city-pathogens.mjs';

export function createFirstPerson(canvas,{map,game,onMode,theme:readTheme,selectedCell}){
 const abort=new AbortController(),signal=abort.signal,model=createCityPilot(),camera=new T.PerspectiveCamera(74,1,.035,150),root=new T.Group();
 camera.rotation.order='YXZ';root.visible=false;
 const hud=document.createElement('section');hud.className='cc-pilot';hud.hidden=true;hud.setAttribute('aria-label','세포 직접 조종');
 const toolButtons=(inventory=false)=>PILOT_TOOLS.map(t=>`<button type="button" data-pilot-tool="${t.id}" aria-label="${t.key} ${t.name}" aria-pressed="false"><kbd>${t.key}</kbd><i>${t.symbol}</i><strong>${inventory?t.name:t.short}</strong>${inventory?`<small>${t.id==='oxygen'?'폐 적재 · 장기 배송':'조준 · 포식 공격'}</small>`:''}</button>`).join('');
 hud.innerHTML=`<header class="cc-pilot-top"><div><small>CELL VIEW</small><strong data-pilot-name></strong><span data-pilot-motion></span></div><div><button type="button" class="cc-pilot-lock" data-pilot-lock>시점 고정</button><button type="button" data-pilot-inventory>도구함 <kbd>I</kbd></button><button type="button" data-pilot-pause aria-label="체험 일시정지">Ⅱ</button><button type="button" data-pilot-exit>도시로 ↗</button></div></header>
 <div class="cc-pilot-waypoint"><i data-pilot-bearing>↑</i><div><strong data-pilot-goal></strong><small data-pilot-distance></small></div></div>
 <div class="cc-pilot-crosshair" aria-hidden="true">＋</div><div class="cc-pilot-target"><strong data-pilot-target></strong><progress data-pilot-target-health max="1" value="0" hidden></progress></div>
 <div class="cc-pilot-feedback" role="status" data-pilot-feedback></div><div class="cc-pilot-transfer"><progress data-pilot-transfer max="1" value="0"></progress><span data-pilot-action-hint></span></div>
 <div class="cc-pilot-bottom"><div class="cc-pilot-vitals"><strong data-pilot-health></strong><span data-pilot-energy></span><small data-pilot-cargo></small><small data-pilot-score></small></div><div class="cc-pilot-map"><canvas width="160" height="160" aria-label="세포 위치와 목적지 지도"></canvas></div></div>
 <div class="cc-pilot-hotbar" role="group" aria-label="도구 퀵슬롯">${toolButtons()}</div>
 <div class="cc-pilot-stick" role="group" aria-label="세포 이동 조이스틱"><i></i></div><div class="cc-pilot-actions" aria-label="터치 조작"><button type="button" data-pilot-toggle="sprint" aria-pressed="false">달리기</button><button type="button" data-pilot-toggle="crouch" aria-pressed="false">앉기</button><button type="button" data-pilot-hold="jump">점프</button><button type="button" data-pilot-hold="scope">조준</button><button type="button" data-pilot-hold="use">공격</button></div>
 <div class="cc-pilot-keys">1·2 / 휠 도구 · WASD 이동 · Shift 달리기 · Space 점프 · Ctrl 앉기 · I 도구함 · Esc 메뉴</div>
 <div class="cc-pilot-paused" hidden><div><button type="button" data-pilot-resume>▶ 계속하기</button><button type="button" data-pilot-exit>도시로 ↗</button></div></div>
 <div class="cc-pilot-inventory" role="dialog" aria-modal="true" aria-label="세포 도구함" hidden><header><div><small>INVENTORY</small><h2>도구함</h2></div><button type="button" data-pilot-inventory aria-label="도구함 닫기">×</button></header><div class="cc-pilot-items">${toolButtons(true)}</div><div class="cc-pilot-stock"><strong data-pilot-stock></strong><label>배송지 <select aria-label="산소 배송지" data-pilot-destination></select></label></div><button type="button" class="cc-pilot-inventory-resume" data-pilot-resume>장착하고 계속 ↗</button></div>
 <div class="cc-pilot-error" hidden><p>조종할 세포를 충원해 주세요</p><button type="button" data-pilot-exit>도시로 ↗</button></div>`;
 map.append(hud);
 const q=s=>hud.querySelector(s),fields=Object.fromEntries(['name','motion','goal','distance','bearing','target','target-health','feedback','transfer','action-hint','health','energy','cargo','score','destination','stock'].map(id=>[id,q('[data-pilot-'+id+']')]));
 const keys=new Set(),pointers=new Map(),touch={forward:0,strafe:0,use:false,jump:false,scope:false,sprint:false,crouch:false};
 const overviewLabel=canvas.getAttribute('aria-label');let mouseUse=false,mouseScope=false,jumpQueued=false,crouchToggle=false,menu='',failed=false,run=null,hadLock=false,lastHud=-Infinity,lastRender=0,lastTool='',theme='2',fallback=false;
 const guideMaterial=new T.MeshBasicMaterial({color:0xa9f2dc,depthTest:true}),guide=new T.InstancedMesh(new T.SphereGeometry(.07,5,4),guideMaterial,100),dummy=new T.Object3D();guide.frustumCulled=false;root.add(guide);
 const beacon=new T.Mesh(new T.TorusGeometry(.55,.045,5,28),guideMaterial);beacon.rotation.x=-Math.PI/2;root.add(beacon);
 const hands=new T.Group(),handMaterial=new T.MeshBasicMaterial({color:0xffefca,depthTest:false}),handGeometry=new T.SphereGeometry(1,10,7);
 for(const side of [-1,1]){const hand=new T.Mesh(handGeometry,handMaterial);hand.position.set(side*.23,-.22,-.43);hand.scale.set(.07,.08,.11);hand.renderOrder=20;hands.add(hand);}
 const carrier=new T.Group(),tankGeometry=new T.CylinderGeometry(.055,.055,.19,10),tankMaterial=new T.MeshBasicMaterial({color:0xc8ece1,depthTest:false}),capGeometry=new T.BoxGeometry(.055,.035,.055),capMaterial=new T.MeshBasicMaterial({color:0xdb7769,depthTest:false});
 for(const side of [-1,1]){const tank=new T.Mesh(tankGeometry,tankMaterial);tank.position.set(side*.065,-.19,-.4);tank.renderOrder=21;carrier.add(tank);const cap=new T.Mesh(capGeometry,capMaterial);cap.position.set(side*.065,-.08,-.4);cap.renderOrder=22;carrier.add(cap);}hands.add(carrier);camera.add(hands);root.add(camera);
 const touchUI=()=>matchMedia('(pointer:coarse), (max-width:760px), (max-height:520px)').matches;
 const on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal});
 function clearInput(){keys.clear();pointers.clear();Object.assign(touch,{forward:0,strafe:0,use:false,jump:false,scope:false,sprint:false,crouch:false});mouseUse=mouseScope=jumpQueued=crouchToggle=false;q('.cc-pilot-stick i').style.transform='';model.resetMotion();for(const b of hud.querySelectorAll('[data-pilot-toggle]'))b.setAttribute('aria-pressed','false');}
 function unlock(){hadLock=false;if(document.pointerLockElement===canvas)document.exitPointerLock();}
 function lock(){
  if(touchUI()||!model.active||menu)return;
  fallback=false;
  try{const request=canvas.requestPointerLock?.();if(!canvas.requestPointerLock)fallback=true;request?.catch(()=>{fallback=true;fields.feedback.textContent='화면 클릭 · 시점 고정';});}catch{fallback=true;}
 }
 function syncMenu(){q('.cc-pilot-paused').hidden=menu!=='pause';q('.cc-pilot-inventory').hidden=menu!=='inventory';hud.dataset.menu=menu;}
 function pause(kind='pause'){
  if(!model.active)return;menu=kind;clearInput();unlock();onMode('pause');syncMenu();render(performance.now(),1);
  if(kind==='inventory')q('.cc-pilot-items [aria-pressed="true"]')?.focus();else q('[data-pilot-resume]')?.focus();
 }
 function resume(){if(!model.active)return;menu='';clearInput();syncMenu();onMode('resume');canvas.focus({preventScroll:true});lock();}
 function exit(){
  const wasOpen=model.active||failed;model.stop();failed=false;menu='';clearInput();root.visible=false;hud.hidden=true;delete game.dataset.pilot;unlock();canvas.setAttribute('aria-label',overviewLabel);if(wasOpen)onMode('exit');canvas.focus({preventScroll:true});
 }
 function open(s){
  if(model.active||failed||s.status!=='running')return;
  run=s;theme=readTheme();const preferred=selectedCell();onMode('choose');hud.hidden=false;menu='';syncMenu();
  failed=!model.start(s,{preferred,theme});q('.cc-pilot-error').hidden=!failed;game.dataset.pilot='explorer';if(failed)return;
  fields.destination.replaceChildren(...cityDistricts(s).filter(d=>d.id!=='lung').map(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.short;return o;}));
  root.visible=true;lastHud=-Infinity;lastTool='';lastRender=0;canvas.setAttribute('aria-label','세포 1인칭. WASD 이동, 마우스 시점, 1·2 도구, 클릭 또는 E 사용, Space 점프, Shift 달리기, Ctrl 앉기, I 도구함, Escape 메뉴.');onMode('start');canvas.focus({preventScroll:true});render(performance.now(),1);lock();
 }
 function equip(id){model.equip(id);touch.use=mouseUse=false;lastTool='';lastHud=-Infinity;render(performance.now(),1);}
 on(hud,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-pilot-exit'))exit();
  else if(b.hasAttribute('data-pilot-lock')){canvas.focus({preventScroll:true});lock();}
  else if(b.hasAttribute('data-pilot-resume'))resume();
  else if(b.hasAttribute('data-pilot-inventory'))menu==='inventory'?resume():pause('inventory');
  else if(b.hasAttribute('data-pilot-pause'))menu?resume():pause();
  else if(b.dataset.pilotTool)equip(b.dataset.pilotTool);
  else if(b.dataset.pilotToggle){const kind=b.dataset.pilotToggle;touch[kind]=!touch[kind];b.setAttribute('aria-pressed',String(touch[kind]));}
 });
 on(fields.destination,'change',()=>{model.chooseDestination(fields.destination.value);lastHud=-Infinity;render(performance.now(),1);});
 on(window,'keydown',e=>{
  if(!model.active&&!failed)return;
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(failed)exit();else menu?resume():pause();return;}
  if(failed)return;
  if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(['KeyI','Tab','KeyP'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.code==='KeyP')menu?resume():pause();else menu==='inventory'?resume():pause('inventory');return;}
  if(menu)return;
  if(/^Digit[12]$/.test(e.code)){e.preventDefault();e.stopImmediatePropagation();equip(PILOT_TOOLS[Number(e.code.at(-1))-1].id);return;}
  if(e.code==='KeyQ'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){model.cycle();lastTool='';}return;}
  if(e.code==='KeyC'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)crouchToggle=!crouchToggle;return;}
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF','Space','ShiftLeft','ShiftRight','ControlLeft','ControlRight'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpQueued=true;}
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
  if(e.pointerType==='touch'||document.pointerLockElement!==canvas){canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{kind:'look',x:e.clientX,y:e.clientY});}
  if(e.pointerType!=='touch'){if(e.button===2)mouseScope=true;else if(e.button===0){if(document.pointerLockElement!==canvas&&!touchUI()&&fallback)lock();mouseUse=true;}}
 },{capture:true});
 on(canvas,'pointermove',e=>{if(!model.active)return;e.stopImmediatePropagation();const p=pointers.get(e.pointerId);if(p?.kind==='look'&&!menu&&document.pointerLockElement!==canvas){model.look((e.clientX-p.x)*1.5,(e.clientY-p.y)*1.5);p.x=e.clientX;p.y=e.clientY;}},{capture:true});
 on(canvas,'wheel',e=>{if(model.active){e.preventDefault();e.stopImmediatePropagation();if(!menu){model.cycle(e.deltaY>0?1:-1);lastTool='';}}},{capture:true,passive:false});
 const release=e=>{if(e.button===2)mouseScope=false;else mouseUse=false;const p=pointers.get(e.pointerId);if(p?.kind==='stick'){touch.forward=touch.strafe=0;q('.cc-pilot-stick i').style.transform='';}if(['use','jump','scope'].includes(p?.kind))touch[p.kind]=false;pointers.delete(e.pointerId);};
 on(window,'pointerup',release);on(window,'pointercancel',()=>clearInput());
 on(canvas,'pointerup',e=>{if(model.active){release(e);e.stopImmediatePropagation();}},{capture:true});
 const stick=q('.cc-pilot-stick');
 function moveStick(e,p){touch.strafe=Math.max(-1,Math.min(1,(e.clientX-p.x)/35));touch.forward=Math.max(-1,Math.min(1,-(e.clientY-p.y)/35));stick.querySelector('i').style.transform=`translate(${touch.strafe*26}px,${-touch.forward*26}px)`;}
 on(stick,'pointerdown',e=>{if(menu||!model.active)return;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect(),p={kind:'stick',x:r.left+r.width/2,y:r.top+r.height/2};pointers.set(e.pointerId,p);moveStick(e,p);});
 on(stick,'pointermove',e=>{const p=pointers.get(e.pointerId);if(p?.kind==='stick')moveStick(e,p);});
 for(const b of hud.querySelectorAll('[data-pilot-hold]'))on(b,'pointerdown',e=>{if(menu||!model.active)return;b.setPointerCapture(e.pointerId);const kind=b.dataset.pilotHold;pointers.set(e.pointerId,{kind});touch[kind]=true;if(kind==='jump')jumpQueued=true;});
 function tick(s,dt){
  if(!model.active)return;if(s!==run){exit();return;}if(menu)return;
  model.step(dt,{forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+touch.forward,strafe:Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+touch.strafe,turn:Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),look:Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')),sprint:touch.sprint||keys.has('ShiftLeft')||keys.has('ShiftRight'),crouch:touch.crouch||crouchToggle||keys.has('ControlLeft')||keys.has('ControlRight'),jump:jumpQueued||touch.jump||keys.has('Space'),scope:mouseScope||touch.scope,use:mouseUse||touch.use||keys.has('KeyF')||keys.has('KeyE')});jumpQueued=false;
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
  const aspect=Math.max(.1,map.clientWidth/map.clientHeight),base=Math.min(110,2*Math.atan(Math.tan(37*Math.PI/180)/Math.min(1,aspect))*180/Math.PI),fov=base+(v.scoped?-13:v.sprinting?4:0);
  camera.aspect=aspect;camera.fov+=(fov-camera.fov)*(1-Math.exp(-12*dt));camera.updateProjectionMatrix();camera.position.set(v.position.x,v.eye,v.position.z);camera.rotation.set(v.pitch,-v.yaw,0);camera.updateMatrixWorld();hands.position.z=v.hit?.06:0;
  carrier.visible=v.inventory.tool==='oxygen';handMaterial.color.setHex(carrier.visible?0xe9847a:0xffefca);
  beacon.position.set(v.goal.x,.15,v.goal.z);guide.count=0;let length=0,previous=v.position;
  for(const next of v.guide){const d=Math.hypot(next.x-previous.x,next.z-previous.z);if(length>14)break;for(let i=.6;i<d&&guide.count<100;i+=.6){if(length+i>14)break;dummy.position.set(previous.x+(next.x-previous.x)*i/d,.13,previous.z+(next.z-previous.z)*i/d);dummy.updateMatrix();guide.setMatrixAt(guide.count++,dummy.matrix);}length+=d;previous=next;}guide.instanceMatrix.needsUpdate=true;
  hud.dataset.hit=String(v.hit);hud.dataset.hurt=String(v.hurt);hud.dataset.scoped=String(v.scoped);fields.transfer.value=v.progress;
  if(lastTool!==v.inventory.tool){lastTool=v.inventory.tool;for(const b of hud.querySelectorAll('[data-pilot-tool]'))b.setAttribute('aria-pressed',String(b.dataset.pilotTool===lastTool));q('[data-pilot-hold="use"]').textContent=lastTool==='oxygen'?'산소 작업':'공격';}
  if(now-lastHud<100)return v;lastHud=now;
  fields.name.textContent='탐험가 #'+v.cell.id;fields.motion.textContent=v.airborne?'점프':v.crouching?'앉기':v.sprinting?'달리기':'';
  fields.goal.textContent=v.goal.name;fields.distance.textContent=v.distance<2.5?(v.inventory.tool==='oxygen'?'접안 · 사용 길게':'목표 근처'):Math.round(v.distance)+' · 이동';fields.bearing.style.transform=`rotate(${Math.atan2(v.next.x-v.position.x,-(v.next.z-v.position.z))-v.yaw}rad)`;
  fields.target.textContent=v.aim?(pathogenDef(v.aim.recordId)?.name||v.aim.tag||'병원체'):'';fields['target-health'].hidden=!v.aim;if(v.aim)fields['target-health'].value=v.aim.hp/(v.aim.maxHp||v.aim.hp);
  fields.feedback.textContent=v.notice;fields['action-hint'].textContent=v.inventory.tool==='oxygen'?(v.inventory.oxygen?'산소 하역':'산소 적재'):(touchUI()?'조준 · 공격':'클릭 / E 사용 · 우클릭 조준');
  fields.health.textContent='HP '+Math.round(v.cell.integrity);fields.energy.textContent='에너지 '+Math.round(v.cell.energy);fields.cargo.textContent='O₂ '+Math.round(v.inventory.oxygen);fields.stock.textContent='O₂ '+Math.round(v.inventory.oxygen)+' 적재';
  fields.score.textContent=v.inventory.tool==='oxygen'?`배송 ${v.deliveries} · +${Math.round(v.oxygen)}`:`유효 공격 ${v.shots}`;fields.destination.value=v.inventory.target;minimap(v);return v;
 }
 return {camera,root,open,exit,tick,render,get active(){return model.active;},get busy(){return model.active||failed;},get cell(){return model.cell;},setTheme(value){theme=value;model.setTheme(value);clearInput();if(!model.active&&!failed&&!hud.hidden){failed=true;exit();}},dispose(){model.stop();abort.abort();unlock();guide.geometry.dispose();guideMaterial.dispose();beacon.geometry.dispose();handGeometry.dispose();handMaterial.dispose();tankGeometry.dispose();tankMaterial.dispose();capGeometry.dispose();capMaterial.dispose();hud.remove();delete game.dataset.pilot;}};
}
