import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {createPlayCatalog,STAGES,HOSTS,REWARDS,roomAt} from './play-data.mjs';
import {newRun,tick,switchWeapon,cycleWeapon,visibleLabel,combatCoverage,chooseReward,controlSource,announce,clamp,angleDelta,ammoCount,isWeaponReady,magazineCapacity,reserveCount,reload,scanHints,equipWeapon,selectScanner} from './play-engine.mjs';
import {createPlayRenderer} from './play-renderer.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
// Reuse one Kontra loop: no accumulation of the library's global init subscriptions on remount.
let loop;
export function createPlayGame(database){
  const catalog=createPlayCatalog(database);
  let run=newRun(catalog),root,canvas,renderer,abort,resizeObserver,audio,master,audioOn=true,musicOn=false,music=null,mapMode='explore',seedText='',quality=matchMedia('(pointer:coarse)').matches?'low':'retro',hard=false,hints=false,equipSlot=0,arsenalKey='',host='normal',selectedStage=0,mission='campaign',overlayKey='',uiTime=0,best=0;
  const keys=new Set(),touch={forward:0,strafe:0,fire:false},pointers=new Map();let jumpQueued=false,mouseFire=false,mouseScope=false,touchScope=false,dragLook=false,lastX=0,disposed=true,lookFallback=false;
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
  try{best=Math.max(0,Number(localStorage.getItem('pathopedia.play.best'))||0);audioOn=localStorage.getItem('pathopedia.play.sound')!=='off';musicOn=localStorage.getItem('pathopedia.play.music')==='on';mapMode=localStorage.getItem('pathopedia.play.map')==='full'?'full':'explore';}catch{}
  const weapon=()=>catalog.weapons[run.weapon];
  const target=()=>run.enemies.find(e=>e.active&&e.state!=='Dead'&&e.id===run.aim);
  const q=selector=>root?.querySelector(selector);
  function sound(kind){
    if(!audioOn||!audio||audio.state!=='running')return;
    const now=audio.currentTime,[hz,duration,volume]=({shot:[240+run.weapon*140,.075,.035],kill:[640,.1,.045],resist:[1650,.09,.035],reload:[240,.1,.03],loaded:[720,.065,.03],jump:[180,.07,.02],land:[95,.06,.02],hurt:[70,.14,.045],scan:[920,.13,.025],switch:[420,.035,.025],pickup:[750,.2,.04],source:[560,.28,.04],dash:[160,.05,.02]})[kind]||[440,.06,.02];
    try{const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=kind==='shot'?'square':'triangle';oscillator.frequency.setValueAtTime(hz,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,hz*.45),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);oscillator.connect(gain);gain.connect(master);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(now);oscillator.stop(now+duration);}catch{}
  }
  function unlockAudio(){if(!audioOn)return;try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.65;master.connect(audio.destination);}void audio.resume().catch(()=>{});}catch{}}
  function syncMusic(){
    if(!musicOn||run.status!=='running'||disposed){music?.pause();return;}
    if(!music){music=new Audio(new URL('./play-assets/hallow-quest-8bit.ogg',import.meta.url).href);music.loop=true;music.volume=.2;music.preload='none';music.addEventListener('error',()=>{if(disposed)return;announce(run,'음원을 불러오지 못했습니다 · MUSIC을 다시 켜 주세요',4);musicOn=false;updateUI();});}
    if(music.error)music.load();void music.play().catch(()=>{if(!disposed&&musicOn&&run.status==='running')announce(run,'음악 재생을 시작하려면 MUSIC을 다시 눌러 주세요',4);});
  }
  function clearInput(){keys.clear();jumpQueued=false;mouseFire=false;mouseScope=false;touchScope=false;run.scoped=false;dragLook=false;touch.forward=0;touch.strafe=0;touch.fire=false;pointers.clear();q('.fp-stick i')?.removeAttribute('style');}
  function unlockPointer(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
  function pause(){if(run.status==='running'){run.status='paused';syncMusic();clearInput();loop?.stop();unlockPointer();updateUI(true);renderer?.render(run);}}
  function start(){
    if(!root||!['ready','paused'].includes(run.status)||document.querySelector('dialog[open]'))return;
    if(run.status==='ready'){run=newRun(catalog,{hard,hints,host,stage:selectedStage,mission,mapMode,seed:seedText||undefined});const starter=['immune','scanner','efficiency'][run.seed%3];run.upgrades[starter]=1;announce(run,REWARDS.find(r=>r.id===starter).title+' 장착 / '+STAGES[run.wave].note,7);}
    clearInput();run.status='running';unlockAudio();syncMusic();overlayKey='';updateUI(true);canvas.focus({preventScroll:true});loop.start();
    if(!matchMedia('(pointer:coarse)').matches&&canvas.requestPointerLock){
      try{const request=canvas.requestPointerLock();request?.catch(()=>{lookFallback=true;announce(run,'마우스 드래그로 조준 · 방향키로도 회전 가능',5);});}catch{lookFallback=true;}
    }else lookFallback=true;
  }
  function settingsMarkup(){return `<div class="fp-config"><span>작전</span><div>${[['campaign','CAMPAIGN'],['single','SINGLE STAGE']].map(([value,label])=>`<button type="button" data-play-mission="${value}" aria-pressed="${mission===value}">${label}</button>`).join('')}</div></div><div class="fp-stage-select" role="group" aria-label="시작 감염 구역">${STAGES.map((stage,i)=>`<button type="button" data-play-stage="${i}" aria-pressed="${i===selectedStage}"><b>0${i+1}</b>${stage.label}</button>`).join('')}</div><div class="fp-config"><div class="fp-difficulty">${[[false,'EASY'],[true,'HARD']].map(([value,label])=>`<button type="button" data-play-mode="${value}" aria-pressed="${hard===value}">${label}</button>`).join('')}${hintSetting()}</div><small>${hard?'스캐너로 형태 → 배양 → AST 확인':'병원체 이름과 AST 공개'}</small></div><div class="fp-config"><span>숙주</span><div>${HOSTS.map(h=>`<button type="button" data-play-host="${h.id}" aria-pressed="${host===h.id}">${h.name}</button>`).join('')}</div><small>${HOSTS.find(h=>h.id===host).note}</small></div><div class="fp-config"><span>미니맵</span><div>${mapSettings()}</div></div><label class="fp-seed">맵 시드<input type="text" maxlength="32" data-play-seed value="${esc(seedText)}" placeholder="비우면 매번 새 맵" autocomplete="off" spellcheck="false"></label>`;}
  function mapSettings(){return [['explore','탐색하며 공개'],['full','전체 공개']].map(([value,label])=>'<button type="button" data-play-map="'+value+'" aria-pressed="'+(mapMode===value)+'">'+label+'</button>').join('');}
  function hintSetting(){const isHard=run.status==='ready'?hard:run.hard;return isHard?'':'<label class="fp-hint-setting"><input type="checkbox" data-play-hints '+(hints?'checked':'')+'><span>힌트 ON</span></label>';}
  function arsenalMarkup(){return run.slots.map((i,slot)=>{const w=catalog.weapons[i];return '<button type="button" data-play-weapon="'+i+'" style="--tone:'+w.color+'" aria-label="'+(slot+1)+' '+esc(w.name)+'" aria-pressed="'+(!run.scannerActive&&i===run.weapon)+'"><kbd>'+(slot+1)+'</kbd>'+weaponIcon(w,i)+'<strong>'+w.short+'</strong><span class="fp-slot-ammo">0</span><i><b></b></i><small class="fp-slot-lock"></small></button>';}).join('')+'<button type="button" class="fp-scanner-slot" data-play-action="scanner" aria-label="0 스캐너, 우클릭 유지로 확대 검사" aria-pressed="'+run.scannerActive+'" style="--tone:#a6dfcc"><kbd>0</kbd><svg viewBox="0 0 64 36" aria-hidden="true"><path fill="currentColor" d="M11 5h37v24H11zM43 25h10v9H43z"/><path fill="#203e36" d="M15 9h29v16H15z"/><path stroke="#d9ecc4" fill="none" d="M20 17h19M29 12v10"/></svg><strong>SCN</strong></button>';}
  function loadoutMarkup(){return '<details class="fp-loadout"><summary>퀵슬롯 편집 · 보급된 약제 '+run.unlocked.filter(Boolean).length+'종</summary><p>바꿀 슬롯을 고른 다음 약제를 선택하세요.</p><div class="fp-loadout-slots">'+run.slots.map((i,slot)=>'<button type="button" data-play-loadout-slot="'+slot+'" aria-pressed="'+(equipSlot===slot)+'">'+(slot+1)+' · '+catalog.weapons[i].short+'</button>').join('')+'</div><div class="fp-loadout-weapons">'+catalog.weapons.filter((w,i)=>run.unlocked[i]).map(w=>'<button type="button" data-play-equip="'+catalog.weapons.indexOf(w)+'">'+w.short+' · '+esc(w.name)+'</button>').join('')+'</div></details>';}

  function codex(){
    const enemyCards=catalog.enemies.filter(e=>!run.hard||run.seen.has(e.id)).map(p=>{const e={kind:p.id},level=run.intel[p.id];return `<div class="fp-record"><button type="button" data-card-open="pathogen:${p.recordId}" ${level<3?'disabled':''}><span style="--tone:${p.color}">●</span><b>${esc(visibleLabel(run,e))}</b><span>↗</span></button><div class="fp-ast">${catalog.weapons.map(w=>{const c=combatCoverage(run,w,p.id);return `<span class="${level<3?'':c.factor?'ok':'no'}" title="${level<3?'AST 미확인':esc(c.reason)}">${w.short} <b>${level<3?'?':c.category+(c.category==='I'&&c.factor?' ↑':'')}</b></span>`;}).join('')}</div></div>`;});
    return `<details class="fp-codex"><summary>PATHOPEDIA 카드 · 약제 / 확인한 병원체</summary><div class="fp-drug-links">${catalog.weapons.map(w=>`<button type="button" data-card-open="drug:${w.id}" style="--tone:${w.color}">${w.short}<span>${esc(w.name)} ↗</span></button>`).join('')}</div>${enemyCards.join('')||'<p>적을 발견하고 0번 + 우클릭으로 검사하세요.</p>'}<p class="fp-note">CFZ는 증가 노출을 기본 적용합니다. 요로 한정 결과는 UTI에서만 유효합니다. ACTIVE(문헌상 활성)와 REGIMEN(해당 부위 요법)은 S/I와 구분합니다. 미확인 조합을 임의로 활성화하지 않습니다.</p></details>`;
  }
  function overlay(){
    if(run.status==='running')return '';
    const stage=STAGES[run.wave];
    if(run.status==='ready')return `<div class="fp-menu fp-briefing"><div class="fp-mission"><span class="fp-kicker">PATHOPEDIA / PLAY / CAMPAIGN</span><h1>ISOLATION<br><em>PROTOCOL</em></h1><p class="fp-lead">방을 확보하고. 병원체를 읽고.<br>맞는 약제로 다음 구역까지.</p><div class="fp-mission-line"><span>08 STAGES</span><span>${catalog.enemies.length} ISOLATES</span><span>${catalog.weapons.length} WEAPONS + SCANNER</span></div><button type="button" class="fp-primary" data-play-action="start">${mission==='single'?'구역 진입':'작전 시작'} <span>↗</span></button><p class="fp-objective"><b>0${selectedStage+1} / ${STAGES[selectedStage].label}</b><br>${STAGES[selectedStage].note}<br>감염원을 제거하고 먼 출구로 탈출하세요. 남은 적은 우회할 수 있습니다.</p><div class="fp-keyguide"><p><kbd>W A S D</kbd><span>이동</span><kbd>MOUSE</kbd><span>조준 / 사격</span></p><p><kbd>1 — 9</kbd><span>퀵슬롯</span><kbd>Q / 휠</kbd><span>약제 전환</span></p><p><kbd>0 + RMB</kbd><span>확대 검사</span><kbd>SHIFT</kbd><span>대시</span></p><p><kbd>SPACE</kbd><span>점프</span><kbd>R</kbd><span>재장전</span></p><p><kbd>F</kbd><span>감염원 제거</span><kbd>ESC / B</kbd><span>메뉴 / 도감</span></p></div></div><aside class="fp-brief-panel"><div class="fp-panel-title"><span>OPERATION SETUP</span><b>+</b></div>${settingsMarkup()}<p class="fp-note">광범위 약제는 선택압을 높입니다. 필수 대응 약제는 해당 구역 진입 전에 보급됩니다. 수치는 게임용이며 도감의 고정 분리주 AST를 사용합니다.</p></aside></div>`;
    if(run.status==='reward')return `<div class="fp-menu fp-reward-menu"><span class="fp-kicker">SECTOR 0${run.wave+1} / SECURED</span><h2>다음 구역: ${STAGES[run.wave+1].label}</h2><p>보급 하나 선택 · 체력 회복 · 약제 전량 보급</p><div class="fp-rewards">${run.rewards.map((r,i)=>`<button type="button" data-play-reward="${r.id}"><span>0${i+1} / ${r.tag}</span><strong>${r.title}</strong><p>${r.text}</p><b>선택하고 이동 →</b></button>`).join('')}</div>${codex()}</div>`;
    if(['won','lost'].includes(run.status))return `<div class="fp-menu fp-result"><span class="fp-kicker">${run.status==='won'?'EXTRACTION COMPLETE':'SIGNAL LOST / RUN ENDED'}</span><h2>${run.status==='won'?'감염 봉쇄 성공.':'다시, 맞는 약제로.'}</h2><div class="fp-result-score">${run.score.toLocaleString()} <small>PT</small></div><div class="fp-result-stats"><span>${clock(run.time)}<small>TIME</small></span><span>${run.kills}<small>KILLS</small></span><span>${run.completedStages}<small>STAGES</small></span><span>${run.bestCombo}<small>BEST CHAIN</small></span></div><p>최고 기록 ${Math.max(best,run.score).toLocaleString()} PT</p><button type="button" class="fp-primary" data-play-action="new">새 작전 준비 →</button>${codex()}</div>`;
    return `<div class="fp-menu fp-pause-menu"><span class="fp-kicker">SECTOR 0${run.wave+1} / ${stage.name}</span><h2>${stage.label}</h2><p>${stage.note}</p><div class="fp-stage-strip">${STAGES.map((s,i)=>`<span class="${i===run.wave?'current':i<run.wave?'done':''}" title="${s.label}">0${i+1}</span>`).join('')}</div><div class="fp-pause-actions"><button type="button" class="fp-primary" data-play-action="start">전투 재개 →</button><button type="button" data-play-action="new">새 작전</button></div><div class="fp-perks"><span>${HOSTS.find(h=>h.id===run.host).name}</span>${Object.keys(run.upgrades).map(id=>`<span>+ ${REWARDS.find(r=>r.id===id)?.title||id}${run.upgrades[id]>1?' ×'+run.upgrades[id]:''}</span>`).join('')}</div><p class="fp-note">${run.kills} 처치 · ${clock(run.time)} · 선택압 ${Math.floor(run.pressure)}<br>1–9 / 휠 전환 · Q 이전 약제 · 0 + 우클릭 검사 · F 감염원·biofilm·포자 제거<br>R 재장전 · SPACE 점프 · 예비 탄약은 자동 보급됩니다.<br>${esc(run.map.layout)} · 그람양성: 보라 / 그람음성: 분홍 / 혐기성: 회색 / 녹농균: 초록</p>${hintSetting()}<div class="fp-config"><span>미니맵</span><div>${mapSettings()}</div></div><p class="fp-run-seed">SEED <b>${run.seed}</b> · 같은 시드와 구역은 같은 맵</p><p class="fp-note">MUSIC: Hallow Quest (8-bit) · Zane Little Music · CC0</p>${loadoutMarkup()}${codex()}</div>`;
  }
  function weaponIcon(w,i){
    const barrels=i===1||i===8?'<path d="M8 10h36v5H8zm0 8h36v5H8z"/>':i===3?'<path d="M13 8h27v18H13zM5 12h8v10H5z"/>':i===6?'<path d="M7 13h38v10H7zM10 9h10v4H10zM28 9h10v4H28z"/>':'<path d="M5 12h39v8H5zM19 8h15v4H19z"/>';
    return '<svg viewBox="0 0 64 36" aria-hidden="true" focusable="false"><g fill="currentColor">'+barrels+'<path opacity=".7" d="M39 16h16v10H39zM33 22h9l-3 11h-7z"/><path fill="#dce4d4" d="M12 13h12v3H12z"/></g></svg>';
  }

  function render(){return `<section class="fp-shell" aria-label="Pathopedia Play 감염 FPS"><div class="fp-viewport"><canvas class="fp-canvas" tabindex="0" aria-label="WASD 이동, 마우스 조준과 사격, 1부터 9 약제 전환, 0 스캐너와 우클릭 검사, F 제거, R 재장전, Space 점프, Escape 메뉴."></canvas><div class="fp-tools"><button type="button" data-play-action="quality" title="렌더링 해상도 변경">${quality==='low'?'LOW':'RETRO'}</button><button type="button" data-play-action="sound" aria-pressed="${audioOn}" aria-label="효과음">SFX ${audioOn?'ON':'OFF'}</button><button type="button" data-play-action="music" aria-pressed="${musicOn}" aria-label="배경음악">MUSIC ${musicOn?'ON':'OFF'}</button><button type="button" data-play-action="fullscreen">⛶ 전체화면</button><button type="button" data-play-action="pause" aria-label="일시정지">Ⅱ</button></div><div class="fp-scene-top"><div class="fp-wave"><strong data-fp="objective"></strong><span data-fp="contact"></span><div class="fp-pressure" title="광범위 약제 사용 시 내성 선택압 상승"><span>PRESSURE <b data-fp="pressure">0 / 100</b></span><div class="fp-meter"><i data-fp="pressure-bar"></i><b style="left:40%"></b><b style="left:70%"></b></div></div></div><div class="fp-target" hidden><button type="button" data-play-action="inspect"><span data-fp="target"></span><small data-fp="target-ast"></small><small data-fp="target-trait"></small></button></div></div><div class="fp-message" role="status" data-fp="message"></div><div class="fp-hotbar-wrap"><div class="fp-selected"><span data-fp="equipped"></span><b data-fp="ammo"></b><small data-fp="ammo-status"></small></div><div class="fp-arsenal" role="group" aria-label="1–9 항생제, 0 스캐너">${arsenalMarkup()}</div><div class="fp-player-health" role="progressbar" aria-label="내 체력" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="fp-health-track"><i data-fp="health-bar"></i></div><span>HP</span><strong><b data-fp="health">100</b><small> / 100</small></strong></div><div class="fp-hint-line" data-fp="hint"></div></div><div class="fp-overlay">${overlay()}</div><div class="fp-touch" aria-label="터치 게임 조작"><div class="fp-stick" role="group" aria-label="이동 조이스틱"><i></i></div><div class="fp-touch-buttons"><button type="button" data-play-action="scanner">0 SCAN</button><button type="button" data-play-touch="scope">확대</button><button type="button" data-play-action="source">제거</button><button type="button" data-play-action="reload">장전</button><button type="button" data-play-touch="jump">점프</button><button type="button" data-play-touch="dash">대시</button><button type="button" class="fp-fire" data-play-touch="fire">FIRE</button></div></div></div></section>`;}

  function updateUI(force=false){
    if(!root)return;const put=(key,value)=>{const el=q('[data-fp="'+key+'"]');if(el&&el.textContent!==String(value))el.textContent=value;},stage=STAGES[run.wave],room=roomAt(run.map,run.player.x,run.player.y);
    root.style.setProperty('--stage-color',stage.color);const nextArsenal=run.slots.join(',');if(arsenalKey!==nextArsenal){q('.fp-arsenal').innerHTML=arsenalMarkup();arsenalKey=nextArsenal;}
    put('health',Math.ceil(run.player.hp));put('objective',run.exitOpen?'EXIT OPEN · 출구로 탈출':'감염원 '+run.map.sources.filter(s=>!s.active).length+' / '+run.map.sources.length+(stage.boss&&!run.bossDefeated?' · BOSS':''));
    const chasing=run.enemies.filter(e=>e.active&&['Detect','Chase','Attack','Search'].includes(e.state)).length;put('contact','ROOM '+run.map.rooms[room].label+' / '+(chasing?'CONTACT ×'+chasing:'탐색 중'));
    put('pressure',String(Math.floor(run.pressure)).padStart(2,'0')+' / 100');put('message',run.messageTime>0?run.message:'');
    put('equipped',run.scannerActive?'SCANNER':weapon().name);put('ammo',run.scannerActive?'2×':ammoCount(run,run.weapon)+' / '+reserveCount(run,run.weapon));put('ammo-status',run.scannerActive?'우클릭 유지 · 확대 검사':run.reloadTime>0?'RELOADING '+Math.ceil((1-run.reloadTime/run.reloadDuration)*100)+'%':'R · 장전');
    q('[data-fp="health-bar"]').style.width=run.player.hp+'%';q('.fp-player-health').classList.toggle('critical',run.player.hp<=30);q('.fp-player-health').setAttribute('aria-valuenow',Math.ceil(run.player.hp));
    const hinted=scanHints(run);put('hint',hinted.length?'SCAN MATCH · '+hinted.map(i=>catalog.weapons[i].short).join(' / '):run.hints&&!run.hard?'0 + 우클릭 · 유효 약제 표시':'');q('[data-fp="pressure-bar"]').style.width=run.pressure+'%';q('.fp-pressure').classList.toggle('hot',run.pressure>=40);
    for(const b of root.querySelectorAll('[data-play-weapon]')){const i=Number(b.dataset.playWeapon),ready=isWeaponReady(run,i);b.setAttribute('aria-pressed',String(!run.scannerActive&&run.weapon===i));b.disabled=!ready;b.classList.toggle('fp-slot-locked',!ready);b.classList.toggle('fp-slot-hint',hinted.includes(i));b.querySelector('i b').style.width=run.magazines[i]/magazineCapacity(run,i)*100+'%';b.querySelector('.fp-slot-ammo').textContent=ready?ammoCount(run,i):'—';b.querySelector('.fp-slot-lock').textContent=ready?'':run.unlocked[i]?'ALLERGY':'ST '+(catalog.weapons[i].stage+1);b.title=ready?catalog.weapons[i].name+(hinted.includes(i)?' · 검사한 표적에 유효':'')+' · '+ammoCount(run,i)+' / '+reserveCount(run,i):run.unlocked[i]?'숙주 알레르기 제한':STAGES[catalog.weapons[i].stage].label+' 진입 시 보급';}
    q('[data-play-action="scanner"]').setAttribute('aria-pressed',String(run.scannerActive));root.classList.toggle('fp-scoped',run.scoped);
    const musicButton=q('[data-play-action="music"]');musicButton.textContent='MUSIC '+(musicOn?'ON':'OFF');musicButton.setAttribute('aria-pressed',String(musicOn));
    const enemy=target(),targetBox=q('.fp-target');targetBox.hidden=!enemy||run.status!=='running'||!run.scoped;
    if(enemy){put('target',(enemy.boss?'BOSS / ':'')+visibleLabel(run,enemy));put('target-ast',run.intel[enemy.kind]>=3?run.slots.filter(i=>isWeaponReady(run,i)).map(i=>{const w=catalog.weapons[i],result=combatCoverage(run,w,enemy.kind);return w.short+' '+result.category+(result.category==='I'&&result.factor?'↑':'');}).join(' · '):['??? · 표적 검사 중','GRAM · 배양 확인 중','CULTURE · AST 확인 중'][run.intel[enemy.kind]]);put('target-trait',enemy.state==='Dormant'?'DORMANT · 발아 전 항생제 피해 없음 / F 제거':run.intel[enemy.kind]>=3?catalog.enemyById[enemy.kind].trait+(enemy.biofilm?' · F 보호 해체':''):'');}
    const key=run.status+hard+hints+host+selectedStage+mission+run.wave+mapMode;
    if(force||key!==overlayKey){overlayKey=key;q('.fp-overlay').innerHTML=overlay();q('.fp-overlay').hidden=run.status==='running';root.classList.toggle('fp-running',run.status==='running');if(run.status!=='running')q('.fp-overlay button')?.focus({preventScroll:true});}
  }

  function handleClick(button){
    if(button.dataset.playMap){mapMode=button.dataset.playMap;run.mapMode=mapMode;try{localStorage.setItem('pathopedia.play.map',mapMode);}catch{}renderer?.render(run);updateUI(true);return true;}
    if(button.dataset.playStage!==undefined){selectedStage=Number(button.dataset.playStage);run=newRun(catalog,{hard,hints,host,stage:selectedStage,mission,mapMode,seed:seedText||undefined});renderer?.render(run);updateUI(true);return true;}
    if(button.dataset.playMission){mission=button.dataset.playMission;updateUI(true);return true;}
    if(button.dataset.playMode!==undefined){hard=button.dataset.playMode==='true';updateUI(true);return true;}
    if(button.dataset.playHost){host=button.dataset.playHost;updateUI(true);return true;}
    if(button.dataset.playLoadoutSlot!==undefined){equipSlot=Number(button.dataset.playLoadoutSlot);updateUI(true);q('.fp-loadout')?.setAttribute('open','');return true;}
    if(button.dataset.playEquip!==undefined){equipWeapon(run,equipSlot,Number(button.dataset.playEquip));updateUI(true);q('.fp-loadout')?.setAttribute('open','');renderer?.render(run);return true;}
    if(button.dataset.playWeapon!==undefined){switchWeapon(run,Number(button.dataset.playWeapon));updateUI();return true;}
    if(button.dataset.playReward){if(chooseReward(run,button.dataset.playReward)){renderer?.render(run);updateUI(true);};return true;}
    const action=button.dataset.playAction;if(!action)return false;
    if(action==='start')start();
    if(action==='pause')pause();
    if(action==='new'){pause();run=newRun(catalog,{hard,hints,host,stage:selectedStage,mission,mapMode,seed:seedText||undefined});overlayKey='';renderer?.render(run);updateUI(true);}
    if(action==='reload')reload(run);if(action==='scanner'){selectScanner(run);updateUI();}if(action==='source')controlSource(run);
    if(action==='inspect'){pause();q('.fp-codex')?.setAttribute('open','');}
    if(action==='sound'){audioOn=!audioOn;if(audioOn)unlockAudio();else if(audio)void audio.suspend();try{localStorage.setItem('pathopedia.play.sound',audioOn?'on':'off');}catch{}button.textContent='SFX '+(audioOn?'ON':'OFF');button.setAttribute('aria-pressed',String(audioOn));}
    if(action==='music'){musicOn=!musicOn;try{localStorage.setItem('pathopedia.play.music',musicOn?'on':'off');}catch{}syncMusic();updateUI();}
    if(action==='quality'){quality=quality==='low'?'retro':'low';renderer?.resize(quality);renderer?.render(run);button.textContent=quality==='low'?'LOW':'RETRO';}
    if(action==='fullscreen'){if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else if(root?.requestFullscreen)void root.requestFullscreen().catch(()=>{root?.classList.toggle('fp-theater');renderer?.resize(quality);});else{root?.classList.toggle('fp-theater');renderer?.resize(quality);}button.textContent=root?.classList.contains('fp-theater')?'⛶ 창 모드':'⛶ 전체화면';}
    return true;
  }
  function unmount(){
    disposed=true;clearInput();if(run.status==='running')run.status='paused';loop?.stop();if(loop){loop.update=()=>{};loop.render=()=>{};loop.context=null;}abort?.abort();abort=null;resizeObserver?.disconnect();resizeObserver=null;unlockPointer();renderer?.dispose();renderer=null;canvas=null;root=null;
    if(music){music.pause();music.removeAttribute('src');music.load();music=null;}
    if(audio){void audio.close().catch(()=>{});audio=null;master=null;}
  }
  function mount(app,active){
    unmount();if(!active)return;root=app.querySelector('.fp-shell');if(!root)return;disposed=false;canvas=q('.fp-canvas');abort=new AbortController();const options={signal:abort.signal},on=(el,event,handler,extra={})=>el.addEventListener(event,handler,{...options,...extra});
    arsenalKey='';on(root,'input',e=>{if(e.target.matches('[data-play-seed]'))seedText=e.target.value;});on(root,'change',e=>{if(e.target.matches('[data-play-hints]')){hints=e.target.checked;run.hints=hints&&!run.hard;run.hintTime=0;updateUI();}});
    renderer=createPlayRenderer(canvas,catalog,{quality,reducedMotion});renderer.render(run);
    resizeObserver=new ResizeObserver(()=>{renderer?.resize(quality);renderer?.render(run);});resizeObserver.observe(q('.fp-viewport'));
    loop ||= GameLoop({fps:60,clearCanvas:false,blur:true,context:null,render(){}});
    loop.context=canvas.getContext('2d');loop.update=dt=>{
      if(disposed||run.status!=='running')return;
      const input={forward:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+touch.forward,strafe:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.strafe,turn:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),fire:mouseFire||touch.fire,jump:jumpQueued||keys.has('Space'),dash:keys.has('ShiftLeft')||keys.has('ShiftRight'),scope:mouseScope||touchScope,source:keys.has('KeyF')};
      tick(run,input,dt);jumpQueued=false;for(const event of run.events)sound(event);run.events.length=0;uiTime+=dt;
      if(run.status!=='running'){loop.stop();syncMusic();clearInput();unlockPointer();if(['won','lost'].includes(run.status)){best=Math.max(best,run.score);try{localStorage.setItem('pathopedia.play.best',String(best));}catch{}}updateUI(true);}
      else if(uiTime>.1){uiTime=0;updateUI();}
    };
    loop.render=()=>renderer?.render(run);
    on(window,'keydown',e=>{
      if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
      if(e.code==='Escape'||e.code==='Tab'||e.code==='KeyB'){if(run.status==='running'){e.preventDefault();pause();if(e.code==='KeyB')q('.fp-codex')?.setAttribute('open','');}return;}
      if(run.status!=='running')return;
      if(['KeyW','KeyA','KeyS','KeyD','KeyF','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
      if(e.code==='Space'&&!e.repeat)jumpQueued=true;
      if(e.code==='Digit0'&&!e.repeat){e.preventDefault();selectScanner(run);}if(e.code==='KeyF'&&!e.repeat)controlSource(run);
      if(e.code==='KeyR'&&!e.repeat){e.preventDefault();reload(run);}
      if(e.code==='KeyQ'){e.preventDefault();switchWeapon(run,run.scannerActive?run.weapon:run.previousWeapon);}
      if(/^Digit[1-9]$/.test(e.code)){e.preventDefault();switchWeapon(run,run.slots[Number(e.code.slice(-1))-1]);}
    });
    on(window,'keyup',e=>keys.delete(e.code));on(window,'blur',pause);on(window,'pagehide',pause);on(document,'visibilitychange',()=>{if(document.hidden)pause();});
    on(document,'fullscreenchange',()=>{q('[data-play-action="fullscreen"]').textContent=document.fullscreenElement?'⛶ 창 모드':'⛶ 전체화면';renderer?.resize(quality);renderer?.render(run);});
    on(document,'pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&!lookFallback)pause();});
    on(document,'pointerlockerror',()=>{lookFallback=true;announce(run,'마우스를 누른 채 움직여 조준 · 방향키 회전 가능',5);});
    on(document,'mousemove',e=>{if(run.status==='running'&&document.pointerLockElement===canvas)run.player.angle=angleDelta(run.player.angle+clamp(e.movementX,-180,180)*(run.scoped?.00125:.0025));});
    on(canvas,'pointerdown',e=>{if(run.status!=='running')return;if(document.pointerLockElement!==canvas)canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){pointers.set(e.pointerId,{kind:'look',x:e.clientX});}else{if(e.button===2)mouseScope=true;else if(e.button===0)mouseFire=true;dragLook=document.pointerLockElement!==canvas;lastX=e.clientX;}});
    on(canvas,'pointermove',e=>{if(run.status!=='running')return;const p=pointers.get(e.pointerId);if(p?.kind==='look'){run.player.angle=angleDelta(run.player.angle+(e.clientX-p.x)*.005);p.x=e.clientX;}else if(dragLook){run.player.angle=angleDelta(run.player.angle+(e.clientX-lastX)*.004);lastX=e.clientX;}});
    on(window,'pointerup',e=>{if(e.button===2)mouseScope=false;else if(e.button===0)mouseFire=false;dragLook=false;const p=pointers.get(e.pointerId);if(p?.kind==='move'){touch.forward=touch.strafe=0;q('.fp-stick i')?.removeAttribute('style');}if(p?.kind==='fire')touch.fire=false;if(p?.kind==='scope')touchScope=false;if(p?.kind==='dash')keys.delete('ShiftLeft');if(p?.kind==='jump')keys.delete('Space');pointers.delete(e.pointerId);});
    on(window,'pointercancel',clearInput);
    on(canvas,'wheel',e=>{if(run.status!=='running')return;e.preventDefault();cycleWeapon(run,e.deltaY>0?1:-1);},{passive:false});
    on(canvas,'contextmenu',e=>e.preventDefault());
    const stick=q('.fp-stick');on(stick,'pointerdown',e=>{if(run.status!=='running')return;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();pointers.set(e.pointerId,{kind:'move',x:r.left+r.width/2,y:r.top+r.height/2});});
    on(stick,'pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;touch.strafe=clamp((e.clientX-p.x)/38,-1,1);touch.forward=clamp(-(e.clientY-p.y)/38,-1,1);stick.querySelector('i').style.transform='translate('+touch.strafe*27+'px,'+-touch.forward*27+'px)';});
    for(const b of root.querySelectorAll('[data-play-touch]'))on(b,'pointerdown',e=>{if(run.status!=='running')return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{kind:b.dataset.playTouch});if(b.dataset.playTouch==='fire')touch.fire=true;else if(b.dataset.playTouch==='scope'){selectScanner(run);touchScope=true;}else{keys.add(b.dataset.playTouch==='jump'?'Space':'ShiftLeft');if(b.dataset.playTouch==='jump')jumpQueued=true;}});
    updateUI(true);
  }
  return {render,mount,handleClick,dispose:unmount};
}
