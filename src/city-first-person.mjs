import * as T from './vendor/three/three.module.min.js';
import {createCityPilot} from './city-pilot.mjs';
import {cityDistricts} from './city-tile-layout.mjs';
import {groundPoint} from './city-three-layout.mjs';

export function createFirstPerson(canvas,{map,game,onMode,theme:readTheme,selectedCell}){
 const abort=new AbortController(),signal=abort.signal,model=createCityPilot(),camera=new T.PerspectiveCamera(74,1,.035,150),root=new T.Group();
 camera.rotation.order='YXZ';root.visible=false;
 const hud=document.createElement('section');hud.className='cc-pilot';hud.hidden=true;hud.setAttribute('aria-label','세포 직접 조종');
 hud.innerHTML=`<div class="cc-pilot-picker" role="dialog" aria-modal="true" aria-label="조종할 세포 선택"><header><div><small>CELL VIEW</small><h2>세포로 들어가기</h2></div><button type="button" data-pilot-exit aria-label="세포 선택 닫기">×</button></header><div class="cc-pilot-roles"><button type="button" data-pilot-role="neutrophil"><i>✦</i><strong>호중구</strong><span>감염 대응</span><small data-pilot-count="neutrophil"></small></button><button type="button" data-pilot-role="rbc"><i>O₂</i><strong>적혈구</strong><span>산소 배송</span><small data-pilot-count="rbc"></small></button></div><p data-pilot-picker-note role="status"></p></div>
 <div class="cc-pilot-screen" hidden><header class="cc-pilot-top"><div><small>CELL VIEW · 1×</small><strong data-pilot-name></strong></div><div><button type="button" class="cc-pilot-lock" data-pilot-lock>시선 고정</button><button type="button" data-pilot-pause>Ⅱ 멈춤</button><button type="button" data-pilot-exit>도시로 ↗</button></div></header>
 <div class="cc-pilot-waypoint"><i data-pilot-bearing>↑</i><div><strong data-pilot-goal></strong><small data-pilot-distance></small></div></div>
 <div class="cc-pilot-crosshair" aria-hidden="true">＋</div><div class="cc-pilot-target"><strong data-pilot-target></strong><progress data-pilot-target-health max="1" value="0" hidden></progress></div>
 <div class="cc-pilot-feedback" role="status" data-pilot-feedback></div><div class="cc-pilot-transfer"><progress data-pilot-transfer max="1" value="0"></progress><span data-pilot-action-hint></span></div>
 <div class="cc-pilot-bottom"><div class="cc-pilot-vitals"><strong data-pilot-health></strong><span data-pilot-energy></span><small data-pilot-score></small><label class="cc-pilot-destination">배송지 <select aria-label="산소 배송지" data-pilot-destination></select></label></div><div class="cc-pilot-map"><canvas width="160" height="160" aria-label="세포 위치와 목적지 지도"></canvas><small>↑ 바라보는 방향</small></div></div>
 <div class="cc-pilot-stick" role="group" aria-label="세포 이동 조이스틱"><i></i></div><div class="cc-pilot-actions"><button type="button" data-pilot-hold="interact">E · 산소 작업</button><button type="button" data-pilot-hold="fire">공격</button></div>
 <div class="cc-pilot-keys">WASD 이동 · 마우스/드래그 시선 · Shift 가속 · Esc 도시로</div><div class="cc-pilot-paused" hidden><div><button type="button" data-pilot-pause>▶ 계속하기</button><button type="button" data-pilot-exit>도시로 ↗</button></div></div></div>`;
 map.append(hud);
 const q=s=>hud.querySelector(s),fields=Object.fromEntries(['name','goal','distance','bearing','target','target-health','feedback','transfer','action-hint','health','energy','score','destination'].map(id=>[id,q('[data-pilot-'+id+']')]));
 const keys=new Set(),pointers=new Map(),touch={forward:0,strafe:0,fire:false,interact:false};const overviewLabel=canvas.getAttribute('aria-label');let mouseFire=false,paused=false,choosing=false,run=null,hadLock=false,lastHud=0,theme='2';
 const guideMaterial=new T.MeshBasicMaterial({color:0xa9f2dc,depthTest:true}),guide=new T.InstancedMesh(new T.SphereGeometry(.07,5,4),guideMaterial,100),dummy=new T.Object3D();guide.frustumCulled=false;root.add(guide);
 const beacon=new T.Mesh(new T.TorusGeometry(.55,.045,5,28),guideMaterial);beacon.rotation.x=-Math.PI/2;root.add(beacon);
 // Existing procedural cell vocabulary, viewed from inside the selected cell.
 const hands=new T.Group(),handMaterial=new T.MeshBasicMaterial({color:0xffefca,depthTest:false}),handGeometry=new T.SphereGeometry(1,10,7);
 for(const side of [-1,1]){const hand=new T.Mesh(handGeometry,handMaterial);hand.position.set(side*.23,-.22,-.43);hand.scale.set(.07,.08,.11);hand.renderOrder=20;hands.add(hand);}camera.add(hands);root.add(camera);
 const touchUI=()=>matchMedia('(pointer:coarse), (max-width:760px), (max-height:520px)').matches;
 const on=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal});
 function clearInput(){keys.clear();pointers.clear();Object.assign(touch,{forward:0,strafe:0,fire:false,interact:false});mouseFire=false;q('.cc-pilot-stick i').style.transform='';}
 function lock(){try{const result=canvas.requestPointerLock?.();result?.catch?.(()=>{});}catch{}}
 function exit(){const wasOpen=model.active||choosing;model.stop();choosing=false;paused=false;clearInput();root.visible=false;hud.hidden=true;delete game.dataset.pilot;hadLock=false;if(document.pointerLockElement===canvas)document.exitPointerLock();canvas.setAttribute('aria-label',overviewLabel);if(wasOpen)onMode('exit');canvas.focus({preventScroll:true});}
 function open(s){if(model.active||choosing||s.status!=='running')return;run=s;theme=readTheme();choosing=true;hud.hidden=false;q('.cc-pilot-picker').hidden=false;q('.cc-pilot-screen').hidden=true;game.dataset.pilot='choose';q('[data-pilot-picker-note]').textContent='';
  for(const kind of ['neutrophil','rbc']){const n=s.cells.filter(c=>c.kind===kind&&!c.lost&&(c.integrity??100)>0).length;q('[data-pilot-role="'+kind+'"]').disabled=!n;q('[data-pilot-count="'+kind+'"]').textContent=n?n+'개 세포':'도시에서 세포 충원 필요';}onMode('choose');q('[data-pilot-role]:not(:disabled)')?.focus();
 }
 function start(kind){if(!model.start(run,kind,selectedCell(),theme)){q('[data-pilot-picker-note]').textContent='지금 조종 가능한 세포가 없어요';return;}choosing=false;paused=false;root.visible=true;q('.cc-pilot-picker').hidden=true;q('.cc-pilot-screen').hidden=false;game.dataset.pilot=kind;
  fields.destination.replaceChildren(...cityDistricts(run).filter(d=>d.id!=='lung').map(d=>{const option=document.createElement('option');option.value=d.id;option.textContent=d.short;return option;}));q('.cc-pilot-destination').hidden=kind!=='rbc';q('[data-pilot-hold="interact"]').hidden=kind!=='rbc';q('[data-pilot-hold="fire"]').hidden=kind!=='neutrophil';handMaterial.color.setHex(kind==='rbc'?0xe9847a:0xffefca);canvas.setAttribute('aria-label','세포 1인칭 시점. WASD 이동, 드래그 시선, 클릭 또는 F 공격, E 산소 작업, Escape 도시 복귀.');q('.cc-pilot-paused').hidden=true;q('.cc-pilot-top [data-pilot-pause]').textContent='Ⅱ 멈춤';onMode('start');canvas.focus({preventScroll:true});render(0);}
 function togglePause(){if(!model.active)return;paused=!paused;clearInput();if(paused&&document.pointerLockElement===canvas){hadLock=false;document.exitPointerLock();}onMode(paused?'pause':'resume');q('.cc-pilot-paused').hidden=!paused;q('.cc-pilot-top [data-pilot-pause]').textContent=paused?'▶ 재개':'Ⅱ 멈춤';if(!paused){canvas.focus({preventScroll:true});}}
 on(hud,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-pilot-lock')){canvas.focus({preventScroll:true});lock();}else if(b.hasAttribute('data-pilot-exit'))exit();else if(b.dataset.pilotRole)start(b.dataset.pilotRole);else if(b.hasAttribute('data-pilot-pause'))togglePause();});
 on(fields.destination,'change',()=>model.chooseDestination(fields.destination.value));
 on(window,'keydown',e=>{
  if(!model.active&&!choosing)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();exit();return;}
  if(choosing)return;
  if(e.target.closest?.('select,input,textarea,button'))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF','Space','ShiftLeft','ShiftRight','KeyP'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(e.code==='KeyP'){if(!e.repeat)togglePause();return;}keys.add(e.code);}
 },{capture:true});
 on(window,'keyup',e=>keys.delete(e.code));
 on(window,'blur',()=>{clearInput();if(model.active&&!paused)togglePause();});
 on(document,'visibilitychange',()=>{if(document.hidden){clearInput();if(model.active&&!paused)togglePause();}});
 on(document,'pointerlockchange',()=>{if(document.pointerLockElement===canvas)hadLock=true;else if(hadLock&&model.active){hadLock=false;exit();}});
 on(document,'mousemove',e=>{if(model.active&&!paused&&document.pointerLockElement===canvas)model.look(e.movementX,e.movementY);});
 on(canvas,'pointerdown',e=>{if(!model.active)return;e.preventDefault();e.stopImmediatePropagation();canvas.focus({preventScroll:true});if(paused)return;
  if(e.pointerType==='touch'||document.pointerLockElement!==canvas){canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{kind:'look',x:e.clientX,y:e.clientY});}if(e.pointerType!=='touch'&&e.button===0)mouseFire=true;
 },{capture:true});
 on(canvas,'pointermove',e=>{if(!model.active)return;e.stopImmediatePropagation();const p=pointers.get(e.pointerId);if(p?.kind==='look'&&!paused&&document.pointerLockElement!==canvas){model.look((e.clientX-p.x)*1.5,(e.clientY-p.y)*1.5);p.x=e.clientX;p.y=e.clientY;}},{capture:true});
 on(canvas,'wheel',e=>{if(model.active||choosing){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
 const release=e=>{mouseFire=false;const p=pointers.get(e.pointerId);if(p?.kind==='stick'){touch.forward=touch.strafe=0;q('.cc-pilot-stick i').style.transform='';}if(p?.kind==='fire'||p?.kind==='interact')touch[p.kind]=false;pointers.delete(e.pointerId);};
 on(window,'pointerup',release);on(window,'pointercancel',release);
 on(canvas,'pointerup',e=>{if(model.active){release(e);e.stopImmediatePropagation();}},{capture:true});
 const stick=q('.cc-pilot-stick');on(stick,'pointerdown',e=>{if(paused)return;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();pointers.set(e.pointerId,{kind:'stick',x:r.left+r.width/2,y:r.top+r.height/2});touch.strafe=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));touch.forward=Math.max(-1,Math.min(1,-(e.clientY-r.top-r.height/2)/35));stick.querySelector('i').style.transform=`translate(${touch.strafe*26}px,${-touch.forward*26}px)`;});
 on(stick,'pointermove',e=>{const p=pointers.get(e.pointerId);if(p?.kind!=='stick')return;touch.strafe=Math.max(-1,Math.min(1,(e.clientX-p.x)/35));touch.forward=Math.max(-1,Math.min(1,-(e.clientY-p.y)/35));stick.querySelector('i').style.transform=`translate(${touch.strafe*26}px,${-touch.forward*26}px)`;});
 for(const b of hud.querySelectorAll('[data-pilot-hold]'))on(b,'pointerdown',e=>{if(paused)return;b.setPointerCapture(e.pointerId);const kind=b.dataset.pilotHold;pointers.set(e.pointerId,{kind});touch[kind]=true;});
 function tick(s,dt){if(!model.active)return;if(s!==run){exit();return;}if(paused)return;model.step(dt,{forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+touch.forward,strafe:Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+touch.strafe,turn:Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),look:Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),fire:mouseFire||touch.fire||keys.has('KeyF')||keys.has('Space'),interact:touch.interact||keys.has('KeyE')});if(!model.active)exitAfterLoss();}
 function exitAfterLoss(){choosing=true;exit();}
 function minimap(v){const ctx=q('.cc-pilot-map canvas').getContext('2d'),scale=1.7,at=p=>[80+p.x*scale,80+p.z*scale];ctx.clearRect(0,0,160,160);ctx.fillStyle='#183936';ctx.beginPath();ctx.arc(80,80,75,0,Math.PI*2);ctx.fill();ctx.lineWidth=1;
  for(const path of model.world.town.vascular.vessels){ctx.strokeStyle=path.oxygenated?'#b57366':'#588d9c';ctx.beginPath();path.points.forEach((p,i)=>{const [x,z]=at(p);if(i)ctx.lineTo(x,z);else ctx.moveTo(x,z);});ctx.stroke();}
  for(const s of model.world.stations){const [x,z]=at(s);ctx.fillStyle='#dcceb1';ctx.fillRect(x-2,z-2,4,4);}
  for(const e of run.enemies.filter(e=>!e.dead&&e.entered)){const [x,z]=at(groundPoint(e));ctx.fillStyle='#ec887e';ctx.fillRect(x-1.5,z-1.5,3,3);}
  const [gx,gz]=at(v.goal);ctx.strokeStyle='#f5db92';ctx.lineWidth=2;ctx.beginPath();ctx.arc(gx,gz,4,0,Math.PI*2);ctx.stroke();const [x,z]=at(v.position);ctx.save();ctx.translate(x,z);ctx.rotate(v.yaw);ctx.fillStyle='#c1fff0';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(0,2);ctx.lineTo(-4,4);ctx.fill();ctx.restore();
 }
 function render(now){const v=model.view();if(!v)return null;
  const aspect=Math.max(.1,map.clientWidth/map.clientHeight);if(camera.aspect!==aspect){camera.aspect=aspect;camera.fov=Math.min(110,2*Math.atan(Math.tan(37*Math.PI/180)/Math.min(1,aspect))*180/Math.PI);camera.updateProjectionMatrix();}camera.position.set(v.position.x,v.water?.48:.58,v.position.z);camera.rotation.set(v.pitch,-v.yaw,0);camera.updateMatrixWorld();hands.position.z=v.hit?.06:0;
  beacon.position.set(v.goal.x,.15,v.goal.z);guide.count=0;let length=0,previous=v.position;
  for(const next of v.guide){const d=Math.hypot(next.x-previous.x,next.z-previous.z);if(length>14)break;for(let i=.6;i<d&&guide.count<100;i+=.6){if(length+i>14)break;dummy.position.set(previous.x+(next.x-previous.x)*i/d,.13,previous.z+(next.z-previous.z)*i/d);dummy.updateMatrix();guide.setMatrixAt(guide.count++,dummy.matrix);}length+=d;previous=next;}guide.instanceMatrix.needsUpdate=true;
  hud.dataset.hit=String(v.hit);hud.dataset.hurt=String(v.hurt);fields.transfer.value=v.progress;
  if(now-lastHud<100)return v;lastHud=now;fields.name.textContent=(v.cell.kind==='rbc'?'적혈구':'호중구')+' #'+v.cell.id;fields.goal.textContent=v.goal.name;fields.distance.textContent=v.distance<2.5?(v.cell.kind==='rbc'?(touchUI()?'접안 · 작업 버튼 길게':'접안 · 멈춰서 E 누르기'):'목표 근처'):Math.round(v.distance)+' · 이동';fields.bearing.style.transform=`rotate(${Math.atan2(v.next.x-v.position.x,-(v.next.z-v.position.z))-v.yaw}rad)`;
  fields.target.textContent=v.aim?pathogenName(v.aim):'';fields['target-health'].hidden=!v.aim;if(v.aim)fields['target-health'].value=v.aim.hp/(v.aim.maxHp||v.aim.hp);
  fields.feedback.textContent=v.notice;fields['action-hint'].textContent=v.cell.kind==='rbc'?((touchUI()?'작업 버튼 길게 · ':'E 누르기 · ')+(v.cell.cargo?'산소 하역':'산소 적재')):(touchUI()?'조준 후 공격 버튼':'클릭 / F · 포식 공격');q('[data-pilot-hold="interact"]').textContent=touchUI()?'산소 작업':'E · 산소 작업';
  fields.health.textContent=v.cell.kind==='rbc'?'O₂ '+Math.round(v.cell.cargo):'HP '+Math.round(v.cell.integrity);fields.energy.textContent=v.cell.kind==='rbc'?'적재량':'에너지 '+Math.round(v.cell.energy);fields.score.textContent=v.cell.kind==='rbc'?`배송 ${v.deliveries} · 산소 +${Math.round(v.oxygen)}`:`유효 공격 ${v.shots}`;fields.destination.value=v.cell.target;minimap(v);return v;
 }
 function pathogenName(e){return e.name||e.tag||'병원체';}
 return {camera,root,open,exit,tick,render,get active(){return model.active;},get busy(){return model.active||choosing;},get cell(){return model.cell;},setTheme(value){theme=value;model.setTheme(value);clearInput();if(!model.active&&!choosing&&!hud.hidden)exitAfterLoss();},dispose(){model.stop();abort.abort();if(document.pointerLockElement===canvas)document.exitPointerLock();guide.geometry.dispose();guideMaterial.dispose();beacon.geometry.dispose();handGeometry.dispose();handMaterial.dispose();hud.remove();delete game.dataset.pilot;}};
}
