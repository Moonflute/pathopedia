import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {createPlayCatalog,STAGES,HOSTS,REWARDS,roomAt} from './play-data.mjs';
import {newRun,tick,switchWeapon,cycleWeapon,visibleLabel,combatCoverage,chooseReward,scan,controlSource,announce,clamp,angleDelta,maxAmmo,ammoCount,isWeaponReady} from './play-engine.mjs';
import {createPlayRenderer} from './play-renderer.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
// Reuse one Kontra loop: no accumulation of the library's global init subscriptions on remount.
let loop;
export function createPlayGame(database){
  const catalog=createPlayCatalog(database);
  let run=newRun(catalog),root,canvas,renderer,abort,resizeObserver,audio,master,audioOn=true,quality=matchMedia('(pointer:coarse)').matches?'low':'retro',hard=false,host='normal',selectedStage=0,mission='campaign',overlayKey='',uiTime=0,measuredFPS=60,frameCount=0,frameSince=0,best=0;
  const keys=new Set(),touch={forward:0,strafe:0,fire:false},pointers=new Map();let mouseFire=false,dragLook=false,lastX=0,disposed=true,lookFallback=false;
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
  try{best=Math.max(0,Number(localStorage.getItem('pathopedia.play.best'))||0);audioOn=localStorage.getItem('pathopedia.play.sound')!=='off';}catch{}
  const weapon=()=>catalog.weapons[run.weapon];
  const target=()=>run.enemies.find(e=>e.active&&e.state!=='Dead'&&e.id===run.aim);
  const q=selector=>root?.querySelector(selector);
  function sound(kind){
    if(!audioOn||!audio||audio.state!=='running')return;
    const now=audio.currentTime,[hz,duration,volume]=({shot:[240+run.weapon*140,.075,.035],kill:[640,.1,.045],resist:[90,.13,.025],hurt:[70,.14,.045],scan:[920,.13,.025],switch:[420,.035,.025],pickup:[750,.2,.04],source:[560,.28,.04],dash:[160,.05,.02]})[kind]||[440,.06,.02];
    try{const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=kind==='shot'?'square':'triangle';oscillator.frequency.setValueAtTime(hz,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,hz*.45),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);oscillator.connect(gain);gain.connect(master);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(now);oscillator.stop(now+duration);}catch{}
  }
  function unlockAudio(){if(!audioOn)return;try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.65;master.connect(audio.destination);}void audio.resume().catch(()=>{});}catch{}}
  function clearInput(){keys.clear();mouseFire=false;dragLook=false;touch.forward=0;touch.strafe=0;touch.fire=false;pointers.clear();q('.fp-stick i')?.removeAttribute('style');}
  function unlockPointer(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
  function pause(){if(run.status==='running'){run.status='paused';clearInput();loop?.stop();unlockPointer();updateUI(true);renderer?.render(run);}}
  function start(){
    if(!root||!['ready','paused'].includes(run.status)||document.querySelector('dialog[open]'))return;
    if(run.status==='ready'){run=newRun(catalog,{hard,host,stage:selectedStage,mission});const starter=['immune','scanner','efficiency'][run.seed%3];run.upgrades[starter]=1;announce(run,REWARDS.find(r=>r.id===starter).title+' 장착 / '+STAGES[run.wave].note,7);}
    clearInput();run.status='running';unlockAudio();overlayKey='';updateUI(true);canvas.focus({preventScroll:true});loop.start();
    if(!matchMedia('(pointer:coarse)').matches&&canvas.requestPointerLock){
      try{const request=canvas.requestPointerLock();request?.catch(()=>{lookFallback=true;announce(run,'마우스 드래그로 조준 · 방향키로도 회전 가능',5);});}catch{lookFallback=true;}
    }else lookFallback=true;
  }
  function settingsMarkup(){return `<div class="fp-config"><span>작전</span><div>${[['campaign','CAMPAIGN'],['single','SINGLE STAGE']].map(([value,label])=>`<button type="button" data-play-mission="${value}" aria-pressed="${mission===value}">${label}</button>`).join('')}</div><small>${mission==='campaign'?'선택 구역부터 마지막 봉쇄까지 · 구역 사이 3택1 보상':'선택 구역만 탐색하고 EXIT로 복귀 · 짧은 연습'}</small></div><div class="fp-stage-select" role="group" aria-label="시작 감염 구역">${STAGES.map((stage,i)=>`<button type="button" data-play-stage="${i}" aria-pressed="${i===selectedStage}"><b>0${i+1}</b>${stage.label}</button>`).join('')}</div><div class="fp-config"><span>정보 공개</span><div>${[[false,'NORMAL'],[true,'HARD']].map(([value,label])=>`<button type="button" data-play-mode="${value}" aria-pressed="${hard===value}">${label}</button>`).join('')}</div><small>${hard?'??? → 형태 → 배양 → AST · E로 검사':'이름과 AST 공개 · 빠른 무기 판단'}</small></div><div class="fp-config"><span>숙주</span><div>${HOSTS.map(h=>`<button type="button" data-play-host="${h.id}" aria-pressed="${host===h.id}">${h.name}</button>`).join('')}</div><small>${HOSTS.find(h=>h.id===host).note}</small></div>`;}

  function codex(){
    const enemyCards=catalog.enemies.filter(e=>!run.hard||run.seen.has(e.id)).map(p=>{const e={kind:p.id},level=run.intel[p.id];return `<div class="fp-record"><button type="button" data-card-open="pathogen:${p.recordId}" ${level<3?'disabled':''}><span style="--tone:${p.color}">●</span><b>${esc(visibleLabel(run,e))}</b><span>↗</span></button><div class="fp-ast">${catalog.weapons.map(w=>{const c=combatCoverage(run,w,p.id);return `<span class="${level<3?'':c.factor?'ok':'no'}" title="${level<3?'AST 미확인':esc(c.reason)}">${w.short} <b>${level<3?'?':c.category+(c.category==='I'&&c.factor?' ↑':'')}</b></span>`;}).join('')}</div></div>`;});
    return `<details class="fp-codex"><summary>PATHOPEDIA 카드 · 약제 / 확인한 병원체</summary><div class="fp-drug-links">${catalog.weapons.map(w=>`<button type="button" data-card-open="drug:${w.id}" style="--tone:${w.color}">${w.short}<span>${esc(w.name)} ↗</span></button>`).join('')}</div>${enemyCards.join('')||'<p>적을 발견하고 E로 검사하세요.</p>'}<p class="fp-note">CFZ는 증가 노출을 기본 적용합니다. 요로 한정 결과는 UTI에서만 유효합니다. ACTIVE(문헌상 활성)와 REGIMEN(해당 부위 요법)은 S/I와 구분합니다. 미확인 조합을 임의로 활성화하지 않습니다.</p></details>`;
  }
  function overlay(){
    if(run.status==='running')return '';
    const stage=STAGES[run.wave];
    if(run.status==='ready')return `<div class="fp-menu fp-briefing"><div class="fp-mission"><span class="fp-kicker">PATHOPEDIA / PLAY / CAMPAIGN</span><h1>ISOLATION<br><em>PROTOCOL</em></h1><p class="fp-lead">방을 확보하고. 병원체를 읽고.<br>맞는 약제로 다음 구역까지.</p><div class="fp-mission-line"><span>08 STAGES</span><span>13 ISOLATES</span><span>09 WEAPONS</span></div><button type="button" class="fp-primary" data-play-action="start">${mission==='single'?'구역 진입':'작전 시작'} <span>↗</span></button><p class="fp-objective"><b>0${selectedStage+1} / ${STAGES[selectedStage].label}</b><br>${STAGES[selectedStage].note}<br>적과 감염원을 정리한 뒤 EXIT로 복귀하세요.</p><div class="fp-keyguide"><p><kbd>W A S D</kbd><span>이동</span><kbd>MOUSE</kbd><span>조준 / 사격</span></p><p><kbd>1 — 9</kbd><span>퀵슬롯</span><kbd>Q / 휠</kbd><span>약제 전환</span></p><p><kbd>E / F</kbd><span>검사 / 제거</span><kbd>SHIFT</kbd><span>대시</span></p><p><kbd>ESC</kbd><span>일시정지</span><kbd>B</kbd><span>도감</span></p></div></div><aside class="fp-brief-panel"><div class="fp-panel-title"><span>OPERATION SETUP</span><b>+</b></div>${settingsMarkup()}<p class="fp-note">광범위 약제는 선택압을 높입니다. 필수 대응 약제는 해당 구역 진입 전에 보급됩니다. 수치는 게임용이며 도감의 고정 분리주 AST를 사용합니다.</p></aside></div>`;
    if(run.status==='reward')return `<div class="fp-menu fp-reward-menu"><span class="fp-kicker">SECTOR 0${run.wave+1} / SECURED</span><h2>다음 구역: ${STAGES[run.wave+1].label}</h2><p>보급 하나 선택 · 체력 회복 · 약제 전량 보급</p><div class="fp-rewards">${run.rewards.map((r,i)=>`<button type="button" data-play-reward="${r.id}"><span>0${i+1} / ${r.tag}</span><strong>${r.title}</strong><p>${r.text}</p><b>선택하고 이동 →</b></button>`).join('')}</div>${codex()}</div>`;
    if(['won','lost'].includes(run.status))return `<div class="fp-menu fp-result"><span class="fp-kicker">${run.status==='won'?'EXTRACTION COMPLETE':'SIGNAL LOST / RUN ENDED'}</span><h2>${run.status==='won'?'감염 봉쇄 성공.':'다시, 맞는 약제로.'}</h2><div class="fp-result-score">${run.score.toLocaleString()} <small>PT</small></div><div class="fp-result-stats"><span>${clock(run.time)}<small>TIME</small></span><span>${run.kills}<small>KILLS</small></span><span>${run.completedStages}<small>STAGES</small></span><span>${run.bestCombo}<small>BEST CHAIN</small></span></div><p>최고 기록 ${Math.max(best,run.score).toLocaleString()} PT</p><button type="button" class="fp-primary" data-play-action="new">새 작전 준비 →</button>${codex()}</div>`;
    return `<div class="fp-menu fp-pause-menu"><span class="fp-kicker">SECTOR 0${run.wave+1} / ${stage.name}</span><h2>${stage.label}</h2><p>${stage.note}</p><div class="fp-stage-strip">${STAGES.map((s,i)=>`<span class="${i===run.wave?'current':i<run.wave?'done':''}" title="${s.label}">0${i+1}</span>`).join('')}</div><div class="fp-pause-actions"><button type="button" class="fp-primary" data-play-action="start">전투 재개 →</button><button type="button" data-play-action="new">새 작전</button></div><div class="fp-perks"><span>${HOSTS.find(h=>h.id===run.host).name}</span>${Object.keys(run.upgrades).map(id=>`<span>+ ${REWARDS.find(r=>r.id===id)?.title||id}${run.upgrades[id]>1?' ×'+run.upgrades[id]:''}</span>`).join('')}</div><p class="fp-note">${run.kills} 처치 · ${clock(run.time)} · 선택압 ${Math.floor(run.pressure)}<br>1–9 / 휠 전환 · Q 이전 약제 · E 검사 · F 감염원·biofilm·포자 제거<br>탄약은 자동 회복되며 선택하지 않은 약제가 더 빨리 회복됩니다.</p>${codex()}</div>`;
  }
  function weaponIcon(w,i){
    const barrels=i===1||i===8?'<path d="M8 10h36v5H8zm0 8h36v5H8z"/>':i===3?'<path d="M13 8h27v18H13zM5 12h8v10H5z"/>':i===6?'<path d="M7 13h38v10H7zM10 9h10v4H10zM28 9h10v4H28z"/>':'<path d="M5 12h39v8H5zM19 8h15v4H19z"/>';
    return '<svg viewBox="0 0 64 36" aria-hidden="true" focusable="false"><g fill="currentColor">'+barrels+'<path opacity=".7" d="M39 16h16v10H39zM33 22h9l-3 11h-7z"/><path fill="#dce4d4" d="M12 13h12v3H12z"/></g></svg>';
  }

  function render(){return `<section class="fp-shell" aria-label="Pathopedia Play 감염 FPS"><header class="fp-toolbar"><div><span class="fp-live-dot"></span><b>PLAY</b><span data-fp="sector">COMMUNITY / 01</span></div><div class="fp-tools"><button type="button" data-play-action="quality" title="렌더링 해상도 변경">${quality==='low'?'480 / LOW':'640 / RETRO'}</button><button type="button" data-play-action="sound" aria-pressed="${audioOn}" aria-label="게임 소리">SOUND ${audioOn?'ON':'OFF'}</button><button type="button" data-play-action="fullscreen" aria-label="게임 전체 화면">⛶</button><button type="button" data-play-action="pause" aria-label="일시정지">Ⅱ</button></div></header><div class="fp-viewport"><canvas class="fp-canvas" tabindex="0" aria-label="WASD 이동, 마우스 조준 및 사격, 1부터 9 약제 전환, Q 이전 약제, E 검사, F 제거, Escape 일시정지."></canvas><div class="fp-scene-top"><div class="fp-wave"><small data-fp="stage-name">COMMUNITY</small><strong data-fp="wave">STAGE 01 / 08</strong><span data-fp="objective"></span><span data-fp="contact"></span></div><div class="fp-target" hidden><button type="button" data-play-action="inspect"><span data-fp="target"></span><small data-fp="target-ast"></small><small data-fp="target-trait"></small></button><div class="fp-target-bar"><i></i></div></div></div><div class="fp-message" role="status" data-fp="message"></div><div class="fp-hotbar-wrap"><div class="fp-selected"><span data-fp="equipped"></span><b data-fp="ammo"></b><small>AUTO SUPPLY</small></div><div class="fp-arsenal" role="group" aria-label="항생제 퀵슬롯">${catalog.weapons.map((w,i)=>`<button type="button" data-play-weapon="${i}" style="--tone:${w.color}" aria-label="${i+1} ${w.name}" aria-pressed="${i===run.weapon}"><kbd>${i+1}</kbd>${weaponIcon(w,i)}<strong>${w.short}</strong><span class="fp-slot-ammo">0</span><i><b></b></i><small class="fp-slot-lock"></small></button>`).join('')}</div><div class="fp-belt-guide">1 — 9 / QUICK SELECT <span>Q / PREVIOUS</span></div></div><div class="fp-overlay">${overlay()}</div><div class="fp-touch" aria-label="터치 게임 조작"><div class="fp-stick" role="group" aria-label="이동 조이스틱"><i></i></div><div class="fp-touch-buttons"><button type="button" data-play-action="scan">SCAN</button><button type="button" data-play-action="source">제거</button><button type="button" data-play-touch="dash">DASH</button><button type="button" class="fp-fire" data-play-touch="fire">FIRE</button></div></div></div><footer class="fp-hud"><div class="fp-vitals"><span>HOST</span><strong data-fp="health">100</strong><div class="fp-meter"><i data-fp="health-bar"></i></div><small data-fp="time">00:00</small></div><div class="fp-mission-hud"><span data-fp="modifier"></span><strong data-fp="loadout"></strong><small data-fp="supplies"></small></div><div class="fp-pressure"><span>RESISTANCE PRESSURE</span><strong data-fp="pressure">00 / 100</strong><div class="fp-meter"><i data-fp="pressure-bar"></i><b style="left:40%"></b><b style="left:70%"></b></div><small data-fp="pressure-note">LOW / 선택압 안정</small></div></footer><div class="fp-statusline"><span>MOVE · IDENTIFY · SWITCH · CLEAR</span><span data-fp="score">0 PT</span><span data-fp="performance">CANVAS / 640 × 360</span></div></section>`;}

  function updateUI(force=false){
    if(!root)return;const put=(key,value)=>{const el=q('[data-fp="'+key+'"]');if(el&&el.textContent!==String(value))el.textContent=value;},stage=STAGES[run.wave],room=roomAt(run.map,run.player.x,run.player.y);
    root.style.setProperty('--stage-color',stage.color);
    put('health',Math.ceil(run.player.hp));put('time',clock(run.time));put('wave','STAGE '+String(run.wave+1).padStart(2,'0')+' / 08');put('stage-name',stage.name);put('sector',stage.name+' / '+String(run.wave+1).padStart(2,'0'));put('objective','감염원 '+run.map.sources.filter(s=>!s.active).length+' / '+run.map.sources.length+' · 남은 적 '+(stage.count-run.stageKills));
    const chasing=run.enemies.filter(e=>e.active&&['Detect','Chase','Attack','Search'].includes(e.state)).length;put('contact','ROOM '+run.map.rooms[room].label+' / '+(chasing?'CONTACT ×'+chasing:'탐색 중'));put('modifier',stage.modifier+' / '+HOSTS.find(h=>h.id===run.host).name);
    put('pressure',String(Math.floor(run.pressure)).padStart(2,'0')+' / 100');put('pressure-note',run.pressure>=70?'HIGH / 내성·ELITE ↑↑':run.pressure>=40?'ELEVATED / 내성·ELITE ↑':'LOW / 선택압 안정');put('message',run.messageTime>0?run.message:'');put('loadout',weapon().name+' / '+weapon().role);put('score',run.score.toLocaleString()+' PT'+(run.combo>1?' / CHAIN ×'+run.combo:''));put('performance',Math.round(measuredFPS)+' FPS / '+canvas?.width+' × '+canvas?.height);
    put('equipped',weapon().name);put('ammo',ammoCount(run,run.weapon)+' / '+Math.floor(maxAmmo(run)/(weapon().cost*Math.pow(.8,run.upgrades.efficiency||0))));put('supplies',run.unlocked.filter(Boolean).length+' / 9 약제 보급 · 대시 '+(run.dashCooldown>0?run.dashCooldown.toFixed(1)+'s':'READY'));
    q('[data-fp="health-bar"]').style.width=run.player.hp+'%';q('[data-fp="pressure-bar"]').style.width=run.pressure+'%';q('.fp-pressure').classList.toggle('hot',run.pressure>=40);
    for(const b of root.querySelectorAll('[data-play-weapon]')){const i=Number(b.dataset.playWeapon),ready=isWeaponReady(run,i);b.setAttribute('aria-pressed',String(run.weapon===i));b.disabled=!ready;b.classList.toggle('fp-slot-locked',!ready);b.querySelector('i b').style.width=run.energy[i]/maxAmmo(run)*100+'%';b.querySelector('.fp-slot-ammo').textContent=ready?ammoCount(run,i):'—';b.querySelector('.fp-slot-lock').textContent=ready?'':run.unlocked[i]?'ALLERGY':'ST '+(catalog.weapons[i].stage+1);b.title=ready?catalog.weapons[i].name:run.unlocked[i]?'숙주 알레르기 제한':STAGES[catalog.weapons[i].stage].label+' 진입 시 보급';}
    const enemy=target(),targetBox=q('.fp-target');targetBox.hidden=!enemy||run.status!=='running';
    if(enemy){put('target',(enemy.boss?'BOSS / ':'')+visibleLabel(run,enemy));const c=combatCoverage(run,weapon(),enemy.kind);put('target-ast',run.intel[enemy.kind]>=3?weapon().short+' '+c.category+' · '+c.reason:'E / SCAN → CULTURE → AST');put('target-trait',enemy.state==='Dormant'?'DORMANT · 발아 전 항생제 피해 없음 / F 제거':run.intel[enemy.kind]>=3?catalog.enemyById[enemy.kind].trait+(enemy.biofilm?' · F 보호 해체':''):'');q('.fp-target-bar i').style.width=clamp(enemy.hp/enemy.maxHp*100,0,100)+'%';}
    const key=run.status+hard+host+selectedStage+mission+run.wave;
    if(force||key!==overlayKey){overlayKey=key;q('.fp-overlay').innerHTML=overlay();q('.fp-overlay').hidden=run.status==='running';root.classList.toggle('fp-running',run.status==='running');if(run.status!=='running')q('.fp-overlay button')?.focus({preventScroll:true});}
  }

  function handleClick(button){
    if(button.dataset.playStage!==undefined){selectedStage=Number(button.dataset.playStage);run=newRun(catalog,{hard,host,stage:selectedStage,mission});renderer?.render(run);updateUI(true);return true;}
    if(button.dataset.playMission){mission=button.dataset.playMission;updateUI(true);return true;}
    if(button.dataset.playMode!==undefined){hard=button.dataset.playMode==='true';updateUI(true);return true;}
    if(button.dataset.playHost){host=button.dataset.playHost;updateUI(true);return true;}
    if(button.dataset.playWeapon!==undefined){switchWeapon(run,Number(button.dataset.playWeapon));updateUI();return true;}
    if(button.dataset.playReward){if(chooseReward(run,button.dataset.playReward)){renderer?.render(run);updateUI(true);};return true;}
    const action=button.dataset.playAction;if(!action)return false;
    if(action==='start')start();
    if(action==='pause')pause();
    if(action==='new'){pause();run=newRun(catalog,{hard,host,stage:selectedStage,mission});overlayKey='';renderer?.render(run);updateUI(true);}
    if(action==='scan')scan(run);if(action==='source')controlSource(run);
    if(action==='inspect'){pause();q('.fp-codex')?.setAttribute('open','');}
    if(action==='sound'){audioOn=!audioOn;if(audioOn)unlockAudio();else if(audio)void audio.suspend();try{localStorage.setItem('pathopedia.play.sound',audioOn?'on':'off');}catch{}button.textContent='SOUND '+(audioOn?'ON':'OFF');button.setAttribute('aria-pressed',String(audioOn));}
    if(action==='quality'){quality=quality==='low'?'retro':'low';renderer?.resize(quality);renderer?.render(run);button.textContent=quality==='low'?'480 / LOW':'640 / RETRO';}
    if(action==='fullscreen'){if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else root?.requestFullscreen?.().catch(()=>announce(run,'이 브라우저에서는 전체 화면을 지원하지 않습니다.'));}
    return true;
  }
  function unmount(){
    disposed=true;clearInput();if(run.status==='running')run.status='paused';loop?.stop();if(loop){loop.update=()=>{};loop.render=()=>{};loop.context=null;}abort?.abort();abort=null;resizeObserver?.disconnect();resizeObserver=null;unlockPointer();renderer?.dispose();renderer=null;canvas=null;root=null;
    if(audio){void audio.close().catch(()=>{});audio=null;master=null;}
  }
  function mount(app,active){
    unmount();if(!active)return;root=app.querySelector('.fp-shell');if(!root)return;disposed=false;canvas=q('.fp-canvas');abort=new AbortController();const options={signal:abort.signal},on=(el,event,handler,extra={})=>el.addEventListener(event,handler,{...options,...extra});
    renderer=createPlayRenderer(canvas,catalog,{quality,reducedMotion});renderer.render(run);
    resizeObserver=new ResizeObserver(()=>{renderer?.resize(quality);renderer?.render(run);});resizeObserver.observe(q('.fp-viewport'));
    loop ||= GameLoop({fps:60,clearCanvas:false,blur:true,context:null,render(){}});
    loop.context=canvas.getContext('2d');loop.update=dt=>{
      if(disposed||run.status!=='running')return;
      const input={forward:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+touch.forward,strafe:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.strafe,turn:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),fire:mouseFire||touch.fire||keys.has('Space'),dash:keys.has('ShiftLeft')||keys.has('ShiftRight'),scan:keys.has('KeyE'),source:keys.has('KeyF')};
      tick(run,input,dt);for(const event of run.events)sound(event);run.events.length=0;uiTime+=dt;
      if(run.status!=='running'){loop.stop();clearInput();unlockPointer();if(['won','lost'].includes(run.status)){best=Math.max(best,run.score);try{localStorage.setItem('pathopedia.play.best',String(best));}catch{}}updateUI(true);}
      else if(uiTime>.1){uiTime=0;updateUI();}
    };
    frameSince=performance.now();frameCount=0;loop.render=()=>{renderer?.render(run);frameCount++;const now=performance.now();if(now-frameSince>=1000){measuredFPS=frameCount*1000/(now-frameSince);frameSince=now;frameCount=0;}};
    on(window,'keydown',e=>{
      if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
      if(e.code==='Escape'||e.code==='Tab'||e.code==='KeyB'){if(run.status==='running'){e.preventDefault();pause();if(e.code==='KeyB')q('.fp-codex')?.setAttribute('open','');}return;}
      if(run.status!=='running')return;
      if(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyF','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
      if(e.code==='KeyQ'){e.preventDefault();switchWeapon(run,run.previousWeapon);}
      if(/^Digit[1-9]$/.test(e.code)){e.preventDefault();switchWeapon(run,Number(e.code.slice(-1))-1);}
    });
    on(window,'keyup',e=>keys.delete(e.code));on(window,'blur',pause);on(window,'pagehide',pause);on(document,'visibilitychange',()=>{if(document.hidden)pause();});
    on(document,'pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&!lookFallback)pause();});
    on(document,'pointerlockerror',()=>{lookFallback=true;announce(run,'마우스를 누른 채 움직여 조준 · 방향키 회전 가능',5);});
    on(document,'mousemove',e=>{if(run.status==='running'&&document.pointerLockElement===canvas)run.player.angle=angleDelta(run.player.angle+clamp(e.movementX,-180,180)*.0025);});
    on(canvas,'pointerdown',e=>{if(run.status!=='running')return;if(document.pointerLockElement!==canvas)canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){pointers.set(e.pointerId,{kind:'look',x:e.clientX});}else{mouseFire=true;dragLook=document.pointerLockElement!==canvas;lastX=e.clientX;}});
    on(canvas,'pointermove',e=>{if(run.status!=='running')return;const p=pointers.get(e.pointerId);if(p?.kind==='look'){run.player.angle=angleDelta(run.player.angle+(e.clientX-p.x)*.005);p.x=e.clientX;}else if(dragLook){run.player.angle=angleDelta(run.player.angle+(e.clientX-lastX)*.004);lastX=e.clientX;}});
    on(window,'pointerup',e=>{mouseFire=false;dragLook=false;const p=pointers.get(e.pointerId);if(p?.kind==='move'){touch.forward=touch.strafe=0;q('.fp-stick i')?.removeAttribute('style');}if(p?.kind==='fire')touch.fire=false;if(p?.kind==='dash')keys.delete('ShiftLeft');pointers.delete(e.pointerId);});
    on(window,'pointercancel',clearInput);
    on(canvas,'wheel',e=>{if(run.status!=='running')return;e.preventDefault();cycleWeapon(run,e.deltaY>0?1:-1);},{passive:false});
    on(canvas,'contextmenu',e=>e.preventDefault());
    const stick=q('.fp-stick');on(stick,'pointerdown',e=>{if(run.status!=='running')return;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();pointers.set(e.pointerId,{kind:'move',x:r.left+r.width/2,y:r.top+r.height/2});});
    on(stick,'pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;touch.strafe=clamp((e.clientX-p.x)/38,-1,1);touch.forward=clamp(-(e.clientY-p.y)/38,-1,1);stick.querySelector('i').style.transform='translate('+touch.strafe*27+'px,'+-touch.forward*27+'px)';});
    for(const b of root.querySelectorAll('[data-play-touch]'))on(b,'pointerdown',e=>{if(run.status!=='running')return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{kind:b.dataset.playTouch});if(b.dataset.playTouch==='fire')touch.fire=true;else keys.add('ShiftLeft');});
    updateUI(true);
  }
  return {render,mount,handleClick,dispose:unmount};
}
