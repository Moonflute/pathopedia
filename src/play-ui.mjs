import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {createPlayCatalog,STAGES,THEME_STAGES,COMPANIONS,stageFor,HOSTS,REWARDS,AUGMENTS,MUSIC_TRACKS,SURVIVAL_CASES,roomAt} from './play-data.mjs';
import {newRun,tick,switchWeapon,cycleWeapon,visibleLabel,combatCoverage,chooseReward,controlSource,announce,clamp,angleDelta,ammoCount,isWeaponReady,magazineCapacity,reserveCount,reload,scanHints,equipWeapon,selectScanner,releaseScanner,remainingEnemies,throwGrenade,chooseAugment,stageReport,equipCompanion,cancelVolley} from './play-engine.mjs';
import {createPlayRenderer} from './play-renderer.mjs';
import {createReloadFoley,createCombatAudio} from './play-audio.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
// Reuse one Kontra loop: no accumulation of the library's global init subscriptions on remount.
let loop;
export function createPlayGame(database,library){
  const catalog=createPlayCatalog(database,library),foley=createReloadFoley(),combatAudio=createCombatAudio();
  let rewardStep='report',reviewPage=0;
  let themeId='virology',companion='none',information='guided',aimAssist=matchMedia('(pointer:coarse)').matches,sensitivity=1,swipeSuppressUntil=0,setupTab='mission',pauseTab='comfort',codexPage=0;
  let run=newRun(catalog),root,canvas,renderer,abort,resizeObserver,audio,master,audioOn=true,musicOn=false,music=null,musicChoice='auto',musicTrack='',reloadNoise=null,mapMode='explore',seedText='',quality=matchMedia('(pointer:coarse)').matches?'low':'retro',hard=false,hints=false,equipSlot=0,arsenalKey='',host='normal',selectedStage=0,mission='campaign',overlayKey='',uiTime=0,best=0;
  const keys=new Set(),touch={forward:0,strafe:0,fire:false},pointers=new Map();let jumpQueued=false,mouseFire=false,mouseScope=false,touchScope=false,dragLook=false,lastX=0,lastY=0,disposed=true,lookFallback=false;
  const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
  try{best=Math.max(0,Number(localStorage.getItem('pathopedia.play.best'))||0);audioOn=localStorage.getItem('pathopedia.play.sound')!=='off';musicOn=localStorage.getItem('pathopedia.play.music')==='on';musicChoice=localStorage.getItem('pathopedia.play.track')||'auto';if(!MUSIC_TRACKS.some(t=>t.id===musicChoice))musicChoice='auto';mapMode=localStorage.getItem('pathopedia.play.map')==='full'?'full':'explore';}catch{}
  const weapon=()=>catalog.weapons[run.weapon];
  const target=()=>run.enemies.find(e=>e.active&&e.state!=='Dead'&&e.id===run.aim);
  const q=selector=>root?.querySelector(selector);
function sound(kind){
 if(!audioOn||!audio||audio.state!=='running')return;
 if(kind.startsWith('shot-')||['charge','effective-hit','shield-hit','resist'].includes(kind)){try{combatAudio.play(audio,master,kind);}catch{}return;}
 if(kind==='victory'){
  try{const now=audio.currentTime;for(const [i,hz]of [392,523.25,659.25,783.99].entries()){const o=audio.createOscillator(),g=audio.createGain(),at=now+i*.115;o.type='triangle';o.frequency.value=hz;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(.07,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.4);o.connect(g);g.connect(master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(at);o.stop(at+.41);}}catch{}return;
 }
 if(['reload','reload-in','loaded'].includes(kind)){try{foley.play(audio,master,kind);}catch{}return;}
 const now=audio.currentTime,[hz,duration,volume]=({shot:[240+run.weapon*140,.075,.035],kill:[640,.1,.045],resist:[1650,.09,.035],reload:[170,.09,.045],'reload-in':[390,.075,.045],loaded:[880,.045,.04],jump:[180,.07,.02],land:[95,.06,.02],hurt:[70,.14,.045],scan:[920,.13,.025],switch:[420,.035,.025],pickup:[750,.2,.04],source:[560,.28,.04],dash:[160,.05,.02],throw:[260,.08,.025],disinfect:[120,.23,.04],ally:[380,.04,.012],pulse:[520,.08,.025],xp:[1200,.025,.008],level:[980,.25,.035]})[kind]||[440,.06,.02];
 try{
  const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=['shot','loaded'].includes(kind)?'square':'triangle';oscillator.frequency.setValueAtTime(hz,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,hz*.45),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);oscillator.connect(gain);gain.connect(master);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(now);oscillator.stop(now+duration);
  if(['reload','reload-in','loaded','disinfect'].includes(kind)){
   if(!reloadNoise){reloadNoise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.16),audio.sampleRate);const samples=reloadNoise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);}
   const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),level=audio.createGain();noise.buffer=reloadNoise;filter.type='bandpass';filter.frequency.value=kind==='reload'?850:kind==='loaded'?3000:1600;filter.Q.value=2;level.gain.setValueAtTime(.14,now);level.gain.exponentialRampToValueAtTime(.001,now+.11);noise.connect(filter);filter.connect(level);level.connect(master);noise.onended=()=>{noise.disconnect();filter.disconnect();level.disconnect();};noise.start(now);noise.stop(now+.12);
  }
 }catch{}
}
  function unlockAudio(){if(!audioOn)return;try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.65;master.connect(audio.destination);}void audio.resume().catch(()=>{});}catch{}}
function selectedTrack(){return MUSIC_TRACKS.find(t=>t.id===musicChoice)||(run.mission==='theme'?MUSIC_TRACKS[run.themeId==='virology'?3:2]:null)||MUSIC_TRACKS[(run.mission==='survival'?[4,0,3,4,1][Math.floor(run.time/105)%5]:[1,2,0,3,4,3,0,4][run.wave])];}
function syncMusic(){
 if(!musicOn||run.status!=='running'||disposed){music?.pause();return;}
 const track=selectedTrack();
 if(!music){music=new Audio();music.loop=true;music.volume=.2;music.preload='none';music.addEventListener('error',()=>{if(disposed)return;announce(run,'음원을 불러오지 못했습니다 · MUSIC을 다시 켜 주세요',4);musicOn=false;updateUI();});}
 if(musicTrack!==track.id){music.pause();musicTrack=track.id;music.src=new URL('./play-assets/'+track.file,import.meta.url).href;}
 if(music.error)music.load();if(music.paused)void music.play().catch(()=>{if(!disposed&&musicOn&&run.status==='running')announce(run,'MUSIC을 눌러 재생을 시작하세요',4);});
}
  function clearInput(){run.chargeTime=0;cancelVolley(run);keys.clear();jumpQueued=false;mouseFire=false;mouseScope=false;touchScope=false;releaseScanner(run);dragLook=false;touch.forward=0;touch.strafe=0;touch.fire=false;pointers.clear();q('.fp-stick i')?.removeAttribute('style');}
  function unlockPointer(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
  function pause(){if(run.status==='running'){run.status='paused';syncMusic();clearInput();loop?.stop();unlockPointer();updateUI(true);renderer?.render(run);}}
  function start(){
    if(!root||!['ready','paused'].includes(run.status)||document.querySelector('dialog[open]'))return;
    if(run.status==='ready'){run=newRun(catalog,{hard,hints,information,aimAssist,host,stage:selectedStage,mission,mapMode,themeId,companion,seed:seedText||undefined});const starter=mission==='survival'?'cephaPulse':['immune','scanner','efficiency'][run.seed%3];run.upgrades[starter]=1;announce(run,(REWARDS.find(r=>r.id===starter)||AUGMENTS.find(r=>r.id===starter)).title+' 장착 / '+(mission==='survival'?'검체를 모아 증강하세요 · 우클릭 스캔 · G 소독탄':stageFor(run).note),7);}
    clearInput();run.status='running';unlockAudio();syncMusic();overlayKey='';updateUI(true);canvas.focus({preventScroll:true});loop.start();
    if(!matchMedia('(pointer:coarse)').matches&&canvas.requestPointerLock){
      try{const request=canvas.requestPointerLock();request?.catch(()=>{lookFallback=true;announce(run,'마우스 드래그로 조준 · 방향키로도 회전 가능',5);});}catch{lookFallback=true;}
    }else lookFallback=true;
  }
function musicSettings(){return `<label class="fp-music-select">배경음악<select data-play-music aria-label="배경음악 선택"><option value="auto" ${musicChoice==='auto'?'selected':''}>AUTO · 구역별 분위기</option>${MUSIC_TRACKS.map(t=>`<option value="${t.id}" ${musicChoice===t.id?'selected':''}>${t.mood} · ${t.name}</option>`).join('')}</select></label><p class="fp-music-credit">${esc(selectedTrack().author)} · <a href="${selectedTrack().source}" target="_blank" rel="noopener noreferrer">CC0 음원 출처 ↗</a></p>`;}

function tabsMarkup(items,selected){return '<div class="fp-tabs" role="tablist" aria-label="Play 설정">'+items.map(([id,label])=>'<button type="button" role="tab" id="fp-tab-'+id+'" aria-controls="fp-settings-panel" data-play-tab="'+id+'" aria-selected="'+(id===selected)+'">'+label+'</button>').join('')+'</div>';}
function controlsMarkup(){return '<div class="fp-keyguide"><p><kbd>W A S D</kbd><span>이동</span><kbd>MOUSE</kbd><span>상하좌우 조준</span></p><p><kbd>1 — 9</kbd><span>약제 슬롯</span><kbd>Q / 휠</kbd><span>빠른 전환</span></p><p><kbd>RMB 유지</kbd><span>보조 스캔</span><kbd>SHIFT</kbd><span>대시</span></p><p><kbd>SPACE</kbd><span>점프</span><kbd>R / G</kbd><span>장전 / 투척</span></p><p><kbd>F</kbd><span>biofilm·오염 제거</span><kbd>M / ESC</kbd><span>지도 / 메뉴</span></p></div><p class="fp-note">터치: 좌측 이동 · 화면 드래그 조준 · 슬롯 좌우 스와이프. 광범위 약제는 선택압을 높입니다. 도감의 고정 분리주 AST를 공유하며, 조작 수치·면역 동료·환경 소독탄은 게임 표현입니다. <a href="./src/vendor/freedoom/COPYING.adoc" target="_blank" rel="noopener noreferrer">Freedoom 아트 라이선스 ↗</a></p>';}
function comfortMarkup(){
 return '<div class="fp-comfort-grid"><div>'+musicSettings()+'<div class="fp-config"><div><button type="button" data-play-action="quality">'+(quality==='low'?'LOW':'RETRO')+'</button><button type="button" data-play-action="sound">SFX '+(audioOn?'ON':'OFF')+'</button><button type="button" data-play-action="music">MUSIC '+(musicOn?'ON':'OFF')+'</button><button type="button" data-play-action="reload-preview">장전음</button></div></div></div><div>'+controlsMarkup()+'</div></div>';
}
function companionMarkup(){
 return '<label class="fp-compact-select">면역 동료<select data-play-ally aria-label="획득한 면역 동료"><option value="none" '+(run.companion==='none'?'selected':'')+'>동행 해제</option>'+COMPANIONS.filter(c=>run.companions.includes(c.id)).map(c=>'<option value="'+c.id+'" '+(run.companion===c.id?'selected':'')+'>'+c.name+' · '+c.role+'</option>').join('')+'</select></label><p class="fp-note">'+(run.companions.length?'지원 상자·보상에서 동료를 추가 획득합니다.':'면역 지원 상자·구역 보상에서 동료를 획득하세요.')+'</p>';
}
const INFORMATION=[
 ['guided','학습','이름·AST 공개 · 스캔 후 약제 힌트'],
 ['open','일반','이름·AST 공개 · 약제 힌트 없음'],
 ['identify','동정','이름 공개 · AST는 스캔으로 확인'],
 ['blind','실전','??? → 형태 → 동정 → AST']
];
function difficultyMarkup(){
 return '<div class="fp-config"><span>정보 난이도</span><div class="fp-info-levels">'+INFORMATION.map(([id,label])=>'<button type="button" data-play-information="'+id+'" aria-pressed="'+(information===id)+'">'+label+'</button>').join('')+'</div><small>'+INFORMATION.find(([id])=>id===information)[2]+'</small></div>';
}
function advancedMarkup(){
 return '<div class="fp-config"><span>숙주</span><div class="fp-host-options">'+HOSTS.map(h=>'<button type="button" data-play-host="'+h.id+'" aria-pressed="'+(host===h.id)+'">'+({normal:'일반 숙주',neutropenia:'호중구 감소',renal:'신기능 저하',allergy:'AMP 알레르기'}[h.id])+'</button>').join('')+'</div><small>'+HOSTS.find(h=>h.id===host).note+'</small></div>'+
 '<div class="fp-config"><span>미니맵 정보 · M으로 펼치기</span><div>'+mapSettings()+'</div></div>'+
 '<label class="fp-seed">맵 시드<input type="text" maxlength="32" data-play-seed value="'+esc(seedText)+'" placeholder="비우면 매번 새 맵" autocomplete="off" spellcheck="false"></label>'+
 '<div class="fp-input-options"><label class="fp-hint-setting"><input type="checkbox" data-play-assist '+(aimAssist?'checked':'')+'>터치 조준 보정</label><label class="fp-compact-select">터치 감도<select data-play-sensitivity><option value="0.7" '+(sensitivity===.7?'selected':'')+'>낮음</option><option value="1" '+(sensitivity===1?'selected':'')+'>기본</option><option value="1.35" '+(sensitivity===1.35?'selected':'')+'>빠름</option></select></label></div>';
}
function settingsMarkup(){
 let panel='';
 if(setupTab==='mission')panel='<div class="fp-config"><span>작전 종류</span><div class="fp-mission-options">'+[['campaign','CAMPAIGN'],['single','구역 연습'],['survival','ENDLESS'],['theme','테마 작전']].map(([value,label])=>'<button type="button" data-play-mission="'+value+'" aria-pressed="'+(mission===value)+'">'+label+'</button>').join('')+'</div></div>'+
 (mission==='theme'?'<div class="fp-theme-select">'+THEME_STAGES.map(s=>'<button type="button" data-play-theme="'+s.id+'" aria-pressed="'+(themeId===s.id)+'"><span><strong>'+s.label+'</strong><small>'+(s.id==='virology'?'HSV · CMV / ACV · GCV':'원충 · 연충 / MTZ · IVM')+'</small></span></button>').join('')+'</div>':mission==='survival'?'<p class="fp-mode-description">유입 → 집중 교전 → 재정비.<br>2분마다 중간보스·보스. 90초부터 철수 가능.</p>':'<div class="fp-stage-select" role="group" aria-label="시작 감염 구역">'+STAGES.map((stage,i)=>'<button type="button" data-play-stage="'+i+'" aria-pressed="'+(i===selectedStage)+'"><b>0'+(i+1)+'</b>'+stage.label+'</button>').join('')+'</div>')+difficultyMarkup();
 if(setupTab==='comfort')panel=comfortMarkup();
 if(setupTab==='advanced')panel=advancedMarkup();
 return tabsMarkup([['mission','작전·난이도'],['comfort','환경·조작'],['advanced','고급']],setupTab)+'<section class="fp-tab-panel" id="fp-settings-panel" role="tabpanel" aria-labelledby="fp-tab-'+setupTab+'">'+panel+'</section>';
}
  function mapSettings(){return [['explore','탐색하며 공개'],['full','전체 공개']].map(([value,label])=>'<button type="button" data-play-map="'+value+'" aria-pressed="'+(mapMode===value)+'">'+label+'</button>').join('');}
  function hintSetting(){const isHard=run.status==='ready'?hard:run.hard;return isHard?'':'<label class="fp-hint-setting"><input type="checkbox" data-play-hints '+(hints?'checked':'')+'><span>힌트 ON</span></label>';}
function arsenalMarkup(){return run.slots.map((i,slot)=>{const w=catalog.weapons[i];return `<button type="button" data-play-weapon="${i}" style="--tone:${w.color}" aria-label="${slot+1} ${esc(w.name)}" aria-pressed="${!run.scannerActive&&i===run.weapon}"><kbd>${slot+1}</kbd>${weaponIcon(w,i)}<strong>${w.short}</strong><span class="fp-slot-ammo">0</span><i><b></b></i><small class="fp-slot-lock"></small></button>`;}).join('');}
function loadoutMarkup(){return '<section class="fp-loadout"><h3>퀵슬롯 편집</h3><p>바꿀 슬롯을 고른 다음 보급된 약제를 선택하세요.</p><div class="fp-loadout-slots">'+run.slots.map((i,slot)=>'<button type="button" data-play-loadout-slot="'+slot+'" aria-pressed="'+(equipSlot===slot)+'">'+(slot+1)+' · '+catalog.weapons[i].short+'</button>').join('')+'</div><div class="fp-loadout-weapons">'+catalog.weapons.filter((w,i)=>run.unlocked[i]).map(w=>'<button type="button" data-play-equip="'+catalog.weapons.indexOf(w)+'" title="'+esc(w.name)+'">'+w.short+'<small>'+esc(w.name)+'</small></button>').join('')+'</div></section>';}
function codexPanel(){
 const records=catalog.enemies.filter(e=>!run.hard||run.seen.has(e.id)),pages=Math.max(1,Math.ceil(records.length/3));codexPage=clamp(codexPage,0,pages-1);
 return '<div class="fp-drug-links">'+catalog.weapons.filter((w,i)=>run.unlocked[i]).map(w=>'<button type="button" data-card-open="drug:'+w.id+'" style="--tone:'+w.color+'" title="'+esc(w.name)+'">'+w.short+' ↗</button>').join('')+'</div><h3>병원체 카드</h3><div class="fp-codex-page">'+records.slice(codexPage*3,codexPage*3+3).map(p=>'<button type="button" data-card-open="pathogen:'+p.recordId+'" '+(run.intel[p.id]<3?'disabled':'')+'><i style="background:'+p.color+'"></i><span>'+esc(visibleLabel(run,{kind:p.id}))+'</span><b>↗</b></button>').join('')+'</div><div class="fp-pagination"><button type="button" data-play-codex-page="'+(codexPage-1)+'" '+(codexPage===0?'disabled':'')+'>←</button><span>'+(codexPage+1)+' / '+pages+'</span><button type="button" data-play-codex-page="'+(codexPage+1)+'" '+(codexPage===pages-1?'disabled':'')+'>→</button></div>';
}
function reportMarkup(){
 const report=run.lastReport||stageReport(run),sum=key=>report.rows.reduce((n,r)=>n+(r[key]||0),0),first=sum('firstAttempts'),switches=sum('switchCount');
 if(!report.rows.length)return '';
 const pageSize=root?.clientWidth<700&&root?.clientHeight<720?1:2,pages=Math.max(1,Math.ceil(report.rows.length/pageSize));reviewPage=clamp(reviewPage,0,pages-1);
 const metrics='<div class="fp-learning-metrics"><span><b>'+(first?Math.round(sum('firstCorrect')/first*100)+'%':'—')+'</b>첫 유효 선택</span><span><b>'+sum('blocked')+'</b>무효 타격</span><span><b>'+sum('broad')+'</b>더 좁은 약 가능</span><span><b>'+(switches?(sum('switchTotal')/switches).toFixed(1)+'s':'—')+'</b>오답 후 전환</span></div>';
 return '<section class="fp-debrief" aria-label="스테이지 전투 복습">'+metrics+'<div class="fp-review-list">'+report.rows.slice(reviewPage*pageSize,reviewPage*pageSize+pageSize).map(row=>{
  const p=catalog.enemyById[row.kind],context=run.mission==='survival'?(SURVIVAL_CASES[p.id]||{site:run.map.site,scenarios:[]}):run.map;
  const matched=p.therapies.find(c=>c.scenarios?.some(id=>context.scenarios.includes(id)))||p.therapies.find(c=>c.sites?.includes(context.site)),therapy=matched||p.therapies.find(c=>c.learningDefault)||p.therapies[0];
  const choices=Object.keys(row.alternatives).map(id=>catalog.weaponById[id].short).join(' · ');
  const drugs=therapy?.drugIds.map(id=>database.drugs.find(d=>d.id===id)?.name||id).join(therapy.combination?' + ':' / '),source=therapy?.sourceIds.map(id=>catalog.sources[id]).find(Boolean);
  return '<article class="fp-review-row"><canvas width="96" height="96" data-play-portrait="'+p.id+'" aria-label="'+esc(p.short)+'"></canvas><div class="fp-review-body"><div class="fp-review-heading"><button type="button" data-card-open="pathogen:'+p.recordId+'">'+esc(p.short)+(p.resistant?' · '+esc(p.trait):'')+' ↗</button><span>'+row.kills+' / '+row.spawned+' 처치</span></div>'+
  '<div class="fp-review-details"><div class="fp-review-combat"><div class="fp-review-metrics"><b>유효 '+row.effective+'</b><span class="'+(row.blocked?'fp-review-blocked':'')+'">무효 '+row.blocked+'</span><span class="'+(row.broad?'fp-review-broad':'')+'">더 좁은 약 가능 '+row.broad+'</span></div>'+
  '<div class="fp-review-drugs">'+(Object.entries(row.weapons).map(([id,use])=>'<span class="fp-review-drug"><b>'+catalog.weaponById[id].short+'</b> '+use.shots+'회'+((use.shots-use.effective)?'<small class="fp-review-blocked">무효 '+(use.shots-use.effective)+'회</small>':'')+(use.broad?'<small class="fp-review-broad">좁은 약 가능 '+use.broad+'회</small>':'')+'</span>').join('')||(row.kills?'<span>보조 수단으로 처치</span>':'<span>직접 사격 없음</span>'))+'</div></div>'+
  '<div class="fp-review-treatment">'+(choices?'<p class="fp-review-alternative"><b>좁은 대안</b> '+choices+'</p>':'')+
  (therapy?'<p class="fp-review-guidance"><b>'+esc(therapy.preferenceLabel||'우선 치료')+'</b> '+(source?'<a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(therapy.context)+'">'+esc(drugs)+' ↗</a>':esc(drugs))+'</p>':'')+'</div></div></div></article>';
 }).join('')+'</div>'+(pages>1?'<nav class="fp-pagination" aria-label="병원체 복습 페이지"><button type="button" data-play-review-page="'+(reviewPage-1)+'" '+(reviewPage===0?'disabled':'')+' aria-label="이전 병원체">←</button><span>병원체 '+(reviewPage*pageSize+1)+'–'+Math.min(report.rows.length,reviewPage*pageSize+pageSize)+' / '+report.rows.length+'</span><button type="button" data-play-review-page="'+(reviewPage+1)+'" '+(reviewPage===pages-1?'disabled':'')+' aria-label="다음 병원체">→</button></nav>':'')+'</section>';
}
function rewardPreview(r){
 const level=run.upgrades[r.id]||0;
 if(r.id==='fastReload')return Math.round(weapon().reload*.8*Math.pow(.86,level)*1000)+' → '+Math.round(weapon().reload*.8*Math.pow(.86,level+1)*1000)+' ms';
 if(r.id==='rate')return '사격 간격 '+Math.round(weapon().interval*Math.pow(.86,level)*1000)+' → '+Math.round(weapon().interval*Math.pow(.86,level+1)*1000)+' ms';
 if(r.id==='efficiency')return '현재 약제 한 탄창 '+Math.floor(weapon().magazine/Math.pow(.8,level))+' → '+Math.floor(weapon().magazine/Math.pow(.8,level+1))+'발';
 if(r.id==='reserve')return '예비 용량 '+(200+level*60)+' → '+(260+level*60);
 if(r.id==='support')return 'HP '+Math.ceil(run.player.hp)+' → '+Math.min(100,Math.ceil(run.player.hp)+50);
 if(r.id==='stewardship')return '선택압 '+Math.round(run.pressure)+' → '+Math.max(0,Math.round(run.pressure)-35);
 return level?'강화 '+(level+1):'새 효과';
}
function overlay(){
 if(run.status==='running')return '';
 if(run.status==='clearing')return '<div class="fp-extraction" role="status"><span>EXTRACTION COMPLETE</span><div class="fp-success-mark">✓</div><h2>탈출 성공</h2><p>'+esc(stageFor(run).label)+'</p><strong>+'+(250+Math.round(run.player.hp)*2)+' PT</strong></div>';
 const stage=stageFor(run),survival=run.mission==='survival';
 if(run.status==='ready')return `<div class="fp-menu fp-briefing"><div class="fp-mission"><span class="fp-kicker">PATHOPEDIA / PLAY</span><h1>ISOLATION<br><em>PROTOCOL</em></h1><p class="fp-lead">보고. 판단하고. 바꾸고.<br>맞는 약제로 살아남아라.</p><div class="fp-mission-line"><span>08 STAGES + 02 THEMES + ENDLESS</span><span>${catalog.enemies.length} ISOLATES</span></div><button type="button" class="fp-primary" data-play-action="start">${mission==='survival'?'무한 생존 시작':mission==='theme'?'테마 작전 진입':mission==='single'?'구역 진입':'작전 시작'} <span>↗</span></button><p class="fp-objective"><b>${mission==='survival'?'ENDLESS / 혼합 임상 사례':mission==='theme'?THEME_STAGES.find(s=>s.id===themeId).label:'0'+(selectedStage+1)+' / '+STAGES[selectedStage].label}</b><br>${mission==='survival'?'검체를 모아 증강을 조합하세요. 새 약제와 특수 병원체는 시간이 지나며 등장합니다.':(mission==='theme'?THEME_STAGES.find(s=>s.id===themeId):STAGES[selectedStage]).note}</p></div><aside class="fp-brief-panel"><div class="fp-panel-title"><span>OPERATION SETUP</span><b>+</b></div>${settingsMarkup()}</aside></div>`;
 if(run.status==='augment')return `<div class="fp-menu fp-reward-menu"><span class="fp-kicker">LEVEL ${run.level} / AUGMENT</span><h2>다음 조합을 골라.</h2><p>${clock(run.time)} 생존 · ${run.kills} 처치 · 선택압 ${Math.floor(run.pressure)}</p><div class="fp-rewards">${run.augmentChoices.map((r,i)=>`<button type="button" data-play-augment="${r.id}"><span>0${i+1} / ${r.tag}</span><strong>${r.title}</strong><p>${r.text}</p><b>${run.upgrades[r.id]?'LV '+(run.upgrades[r.id]+1):'NEW'} · 장착 →</b></button>`).join('')}</div><p class="fp-note">스캔과 수동 약제 전환은 계속 사용할 수 있습니다. 자동 약제도 R 판정을 넘어설 수 없습니다.</p></div>`;
 if(run.status==='reward'&&rewardStep==='upgrade')return '<div class="fp-menu fp-reward-menu"><span class="fp-kicker">FIELD UPGRADE</span><h2>다음 전투를 바꿀 하나.</h2><p>다음 구역 · '+esc(STAGES[run.wave+1].label)+'</p><div class="fp-rewards">'+run.rewards.map((r,i)=>'<button type="button" data-play-reward="'+r.id+'"><span>0'+(i+1)+' / '+r.tag+'</span><strong>'+esc(r.title)+'</strong><p>'+esc(r.text)+'</p><em>'+esc(rewardPreview(r))+'</em><b>장착하고 이동 →</b></button>').join('')+'</div><div class="fp-result-actions"><button type="button" data-play-action="review">← 결과 보기</button><span>구역 기본 보급 · 체력 +28 / 약제 충전</span></div></div>';
 if(['reward','won','lost'].includes(run.status))return '<div class="fp-menu fp-result"><header class="fp-results-head"><div><span class="fp-kicker">'+(run.status==='lost'?'SIGNAL LOST':'MISSION DEBRIEF')+'</span><h2>'+(run.status==='lost'?'작전 종료':run.status==='reward'?'구역 확보':'작전 성공')+'</h2><p>'+esc(stage.label)+' · '+clock((run.lastReport||stageReport(run)).seconds)+'</p></div><strong>'+run.score.toLocaleString()+' <small>PT</small></strong></header>'+reportMarkup()+'<div class="fp-result-actions">'+(run.status==='reward'?'<button type="button" class="fp-primary" data-play-action="upgrades">강화 선택 →</button>':'<button type="button" class="fp-primary" data-play-action="new">새 작전 →</button>')+'<span>'+run.kills+' 처치 · '+clock(run.time)+(survival?' · LV '+run.level:' · '+run.completedStages+' 구역 완료')+'</span></div></div>';
 const panel=pauseTab==='equipment'?loadoutMarkup()+companionMarkup():pauseTab==='codex'?codexPanel():comfortMarkup();
 return `<div class="fp-menu fp-briefing fp-pause-layout"><div class="fp-mission"><span class="fp-kicker">${survival?'ENDLESS / MIXED CLINICAL CASES':run.mission==='theme'?'THEME / '+stage.name:'SECTOR 0'+(run.wave+1)+' / '+stage.name}</span><h2>${survival?'끝없는 격리 작전':stage.label}</h2><p class="fp-objective">${survival?'검체 수집 → 증강 선택 → 계속 생존. 90초부터 출구에서 철수할 수 있습니다.':stage.note}</p><div class="fp-pause-actions"><button type="button" class="fp-primary" data-play-action="start">전투 재개 →</button><button type="button" data-play-action="new">새 작전</button></div><div class="fp-pause-stats"><span><b>${run.kills}</b> 처치</span><span><b>${clock(run.time)}</b> 생존</span><span><b>${Math.floor(run.pressure)}</b> 선택압</span></div><div class="fp-perks"><span>${HOSTS.find(h=>h.id===run.host).name}</span><span>${COMPANIONS.find(c=>c.id===run.companion)?.name||'동료 없음'}</span><span>증강 ${Object.values(run.upgrades).reduce((a,b)=>a+b,0)}</span></div></div><aside class="fp-brief-panel"><div class="fp-panel-title"><span>FIELD TERMINAL</span><b>+</b></div>${tabsMarkup([['equipment','장비·동료'],['comfort','환경·조작'],['codex','도감']],pauseTab)}<section class="fp-tab-panel" id="fp-settings-panel" role="tabpanel" aria-labelledby="fp-tab-${pauseTab}">${panel}</section></aside></div>`;
}
  function weaponIcon(w,i){
    const barrels=i===1||i===8?'<path d="M8 10h36v5H8zm0 8h36v5H8z"/>':i===3?'<path d="M13 8h27v18H13zM5 12h8v10H5z"/>':i===6?'<path d="M7 13h38v10H7zM10 9h10v4H10zM28 9h10v4H28z"/>':'<path d="M5 12h39v8H5zM19 8h15v4H19z"/>';
    return '<svg viewBox="0 0 64 36" aria-hidden="true" focusable="false"><g fill="currentColor">'+barrels+'<path opacity=".7" d="M39 16h16v10H39zM33 22h9l-3 11h-7z"/><path fill="#dce4d4" d="M12 13h12v3H12z"/></g></svg>';
  }

function render(){return `<section class="fp-shell" aria-label="Pathopedia Play 감염 FPS"><div class="fp-viewport"><canvas class="fp-canvas" tabindex="0" aria-label="WASD 이동, 마우스 상하좌우 조준, 1부터 9 약제 전환, 우클릭 유지 스캔, G 소독탄, F 제거, R 장전, Space 점프, Escape 메뉴."></canvas><div class="fp-tools"><button type="button" data-play-action="map" aria-label="지도 표시 전환">지도 M</button><button type="button" data-play-action="quality" title="렌더링 해상도 변경">${quality==='low'?'LOW':'RETRO'}</button><button type="button" data-play-action="sound" aria-pressed="${audioOn}" aria-label="효과음">SFX ${audioOn?'ON':'OFF'}</button><button type="button" data-play-action="music" aria-pressed="${musicOn}" aria-label="배경음악">MUSIC ${musicOn?'ON':'OFF'}</button><button type="button" data-play-action="next-track" aria-label="다음 배경음악">♫ ›</button><button type="button" data-play-action="fullscreen">⛶ 전체화면</button><button type="button" data-play-action="pause" aria-label="일시정지">Ⅱ</button></div><div class="fp-scene-top"><div class="fp-wave"><strong data-fp="objective"></strong><span data-fp="contact"></span><div class="fp-pressure" title="광범위 약제 사용 시 내성 선택압 상승"><span>PRESSURE <b data-fp="pressure">0 / 100</b></span><div class="fp-meter"><i data-fp="pressure-bar"></i><b style="left:40%"></b><b style="left:70%"></b></div></div></div><div class="fp-ally-hud" hidden><i></i><span data-fp="companion"></span><small>AUTO</small></div><div class="fp-target" hidden><button type="button" data-play-action="inspect"><span data-fp="target"></span><small data-fp="target-ast"></small><small data-fp="target-trait"></small></button></div></div><div class="fp-route" data-fp="route" hidden></div><div class="fp-major" hidden><small data-fp="major-role"></small><strong data-fp="major-name"></strong><div><i data-fp="major-health"></i></div></div><div class="fp-message" role="status" data-fp="message"></div><div class="fp-hotbar-wrap"><div class="fp-selected"><span data-fp="equipped"></span><b data-fp="ammo"></b><small data-fp="ammo-status"></small><button type="button" class="fp-grenade" data-play-action="throw" title="G · 환경 소독탄, 4.5초 범위 소독 / 포자·기생충 제외">G ×<span data-fp="grenades">3</span></button></div><div class="fp-weapon-row"><button type="button" class="fp-offhand" data-play-touch="scope" aria-label="보조 스캐너, 누르고 있거나 우클릭을 유지하세요" aria-pressed="false" title="우클릭 유지 · 스캔 / 놓으면 약제로 복귀"><kbd>RMB</kbd><svg viewBox="0 0 64 36" aria-hidden="true"><path fill="currentColor" d="M11 5h37v24H11zM43 25h10v9H43z"/><path fill="#203e36" d="M15 9h29v16H15z"/><path stroke="#d9ecc4" fill="none" d="M20 17h19M29 12v10"/></svg><strong>SCAN</strong></button><div class="fp-arsenal" role="group" aria-label="1–9 항생제 퀵슬롯">${arsenalMarkup()}</div></div><div class="fp-player-health" role="progressbar" aria-label="내 체력" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div class="fp-health-track"><i data-fp="health-bar"></i></div><span>HP</span><strong><b data-fp="health">100</b><small> / 100</small></strong></div><div class="fp-xp" hidden><i data-fp="xp-bar"></i><span data-fp="xp"></span></div><div class="fp-hint-line" data-fp="hint"></div></div><div class="fp-overlay">${overlay()}</div><div class="fp-touch" aria-label="터치 게임 조작"><div class="fp-stick" role="group" aria-label="이동 조이스틱"><i></i></div><div class="fp-touch-buttons"><button type="button" data-play-touch="scope" aria-label="누르고 있는 동안 스캔">스캔</button><button type="button" data-play-action="throw">소독탄</button><button type="button" data-play-action="source">제거</button><button type="button" data-play-action="reload">장전</button><button type="button" data-play-touch="jump">점프</button><button type="button" data-play-touch="dash">대시</button><button type="button" class="fp-fire" data-play-touch="fire">FIRE</button></div></div></div></section>`;}

  function updateUI(force=false){
    if(!root)return;const put=(key,value)=>{const el=q('[data-fp="'+key+'"]');if(el&&el.textContent!==String(value))el.textContent=value;},stage=stageFor(run),room=roomAt(run.map,run.player.x,run.player.y);
    root.style.setProperty('--stage-color',stage.color);const nextArsenal=run.slots.join(',');if(arsenalKey!==nextArsenal){q('.fp-arsenal').innerHTML=arsenalMarkup();arsenalKey=nextArsenal;}
    put('health',Math.ceil(run.player.hp));put('objective',run.mission==='survival'?'ENDLESS · '+({build:'유입',surge:'집중 교전',fade:'정리',recover:'재정비'}[run.director.phase])+' · '+clock(run.time):run.exitOpen?'소탕 완료 · 출구로 탈출':'남은 적 '+remainingEnemies(run)+' / '+stage.count);
    const chasing=run.enemies.filter(e=>e.active&&['Detect','Chase','Attack','Search'].includes(e.state)).length;put('contact',run.mission==='survival'?run.kills+' 처치 · 위협 '+(run.wave+1)+(run.exitOpen?' · EXIT 철수 가능':' · 90초 후 철수 가능'):'ROOM '+run.map.rooms[room].label+' / '+(chasing?'CONTACT ×'+chasing:'탐색 중'));put('grenades',run.grenades);q('.fp-grenade').disabled=!run.grenades;const xp=q('.fp-xp');xp.hidden=run.mission!=='survival';put('xp','LV '+run.level+' · '+run.xp+' / '+run.xpNeeded+' XP');q('[data-fp="xp-bar"]').style.width=Math.min(100,run.xp/run.xpNeeded*100)+'%';
    put('pressure',String(Math.floor(run.pressure)).padStart(2,'0')+' / 100');q('.fp-pressure').title='이번 구역 선택압 기여 +'+Math.round(run.pressureAdded)+' · 실제 추가 내성 '+run.pressureReplacements+' / 엘리트 '+run.pressureElites;if(run.pressureNotice>0)put('contact','선택압 효과 · 내성 +'+run.pressureReplacements+' / 엘리트 +'+run.pressureElites);put('message',run.messageTime>0?run.message:'');
    put('equipped',run.scannerActive?'SCANNER':weapon().name);put('ammo',run.scannerActive?'2×':ammoCount(run,run.weapon)+' / '+reserveCount(run,run.weapon));put('ammo-status',run.scannerActive?'우클릭 유지 · 확대 검사':run.reloadTime>0?'RELOADING '+Math.ceil((1-run.reloadTime/run.reloadDuration)*100)+'%':run.chargeTime>0?'CHARGE '+Math.round(run.chargeTime/weapon().charge*100)+'%':weapon().fireLabel+' · R 장전');
    q('[data-fp="health-bar"]').style.width=run.player.hp+'%';q('.fp-player-health').classList.toggle('critical',run.player.hp<=30);q('.fp-player-health').setAttribute('aria-valuenow',Math.ceil(run.player.hp));
    q('[data-fp="objective"]').hidden=run.mission!=='survival'&&!run.exitOpen&&remainingEnemies(run)>3&&run.roomNotice<=0;
    q('[data-fp="contact"]').hidden=run.roomNotice<=0&&run.pressureNotice<=0;
    const major=run.enemies.find(e=>e.active&&(e.boss||e.miniboss)&&e.revealed&&['Detect','Chase','Attack','Search'].includes(e.state));q('.fp-major').hidden=!major||run.status!=='running';if(major){put('major-role',(major.boss?'STAGE BOSS':'MID BOSS')+' · PHASE '+major.phase);put('major-name',visibleLabel(run,major));q('[data-fp="major-health"]').style.width=Math.max(0,major.hp/major.maxHp*100)+'%';}
    const guide=run.guide;q('.fp-route').hidden=!guide||Boolean(major)||run.status!=='running';if(guide){const a=angleDelta(Math.atan2(guide.y-run.player.y,guide.x-run.player.x)-run.player.angle);put('route',(Math.abs(a)<.4?'↑':a>0?'→':'←')+' '+(guide.remaining?'잔여 '+guide.remaining+' · 마지막 접촉':'EXIT')+' · '+guide.distance+'m');}
    const hinted=scanHints(run);put('hint',hinted.length?'SCAN MATCH · '+hinted.map(i=>catalog.weapons[i].short).join(' / '):'');q('[data-fp="pressure-bar"]').style.width=run.pressure+'%';q('.fp-pressure').classList.toggle('hot',run.pressure>=40);
    for(const b of root.querySelectorAll('[data-play-weapon]')){const i=Number(b.dataset.playWeapon),ready=isWeaponReady(run,i);b.setAttribute('aria-pressed',String(!run.scannerActive&&run.weapon===i));b.disabled=!ready;b.classList.toggle('fp-slot-locked',!ready);b.classList.toggle('fp-slot-hint',hinted.includes(i));b.querySelector('i b').style.width=run.magazines[i]/magazineCapacity(run,i)*100+'%';b.querySelector('.fp-slot-ammo').textContent=ready?ammoCount(run,i):'—';b.querySelector('.fp-slot-lock').textContent=ready?'':run.unlocked[i]?'ALLERGY':'ST '+(catalog.weapons[i].stage+1);b.title=ready?catalog.weapons[i].name+(hinted.includes(i)?' · 검사한 표적에 유효':'')+' · '+ammoCount(run,i)+' / '+reserveCount(run,i):run.unlocked[i]?'숙주 알레르기 제한':(STAGES[catalog.weapons[i].stage]?.label||'바이러스 테마')+' 진입 시 보급';}
    q('.fp-offhand').setAttribute('aria-pressed',String(run.scannerActive));root.classList.toggle('fp-scoped',run.scoped);
    const musicButton=q('.fp-tools [data-play-action="music"]');musicButton.textContent='MUSIC '+(musicOn?'ON':'OFF');musicButton.setAttribute('aria-pressed',String(musicOn));musicButton.title=selectedTrack().name+' · '+selectedTrack().mood;if(musicOn&&run.status==='running'&&musicTrack!==selectedTrack().id)syncMusic();
    const enemy=target(),targetBox=q('.fp-target');targetBox.hidden=!enemy||run.status!=='running'||!run.scoped;
    if(enemy){put('target',(enemy.boss?'BOSS / ':enemy.miniboss?'MID / ':'')+visibleLabel(run,enemy));put('target-ast',run.intel[enemy.kind]>=3?run.slots.filter(i=>isWeaponReady(run,i)).map(i=>{const w=catalog.weapons[i],result=combatCoverage(run,w,enemy.kind);return w.short+' '+result.category+(result.category==='I'&&result.factor?'↑':'');}).join(' · '):['??? · 표적 검사 중','GRAM · 배양 확인 중','CULTURE · AST 확인 중'][run.intel[enemy.kind]]);put('target-trait',enemy.state==='Dormant'?'DORMANT · 발아 전 항생제 피해 없음 / F 제거':run.intel[enemy.kind]>=3?catalog.enemyById[enemy.kind].trait+(enemy.biofilm?' · F 보호 해체':''):'');}
    put('companion',COMPANIONS.find(c=>c.id===run.companion)?.name||'동료 없음');
    const ally=q('.fp-ally-hud');ally.style.setProperty('--ally',COMPANIONS.find(c=>c.id===run.companion)?.color||'#91a59c');ally.hidden=run.companion==='none'||run.pet.flash<=0;ally.classList.toggle('firing',run.pet.flash>0);
    const key=run.status+rewardStep+reviewPage+information+hard+hints+host+selectedStage+mission+themeId+companion+setupTab+pauseTab+run.wave+mapMode+musicChoice;
    if(force||key!==overlayKey){overlayKey=key;q('.fp-overlay').innerHTML=overlay();for(const portrait of root.querySelectorAll('[data-play-portrait]'))renderer?.paintPortrait(portrait,portrait.dataset.playPortrait);q('.fp-overlay').hidden=run.status==='running';root.classList.toggle('fp-running',run.status==='running');root.dataset.status=run.status;if(run.status!=='running')q('.fp-overlay button')?.focus({preventScroll:true});}
  }

  function handleClick(button){
    if(button.dataset.playReviewPage!==undefined){reviewPage=Number(button.dataset.playReviewPage);updateUI(true);return true;}
    if(button.dataset.playTab){if(run.status==='ready')setupTab=button.dataset.playTab;else pauseTab=button.dataset.playTab;updateUI(true);q('[data-play-tab="'+button.dataset.playTab+'"]')?.focus({preventScroll:true});return true;}
    if(button.dataset.playTheme){themeId=button.dataset.playTheme;run=newRun(catalog,{hard,hints,information,aimAssist,host,stage:selectedStage,mission,mapMode,themeId,companion,seed:seedText||undefined});renderer?.render(run);updateUI(true);return true;}
    if(button.dataset.playCompanion){if(run.status==='ready')companion=button.dataset.playCompanion;else equipCompanion(run,button.dataset.playCompanion);updateUI(true);renderer?.render(run);return true;}
    if(button.dataset.playCodexPage!==undefined){codexPage=Number(button.dataset.playCodexPage);updateUI(true);return true;}
    if(button.dataset.playMap){mapMode=button.dataset.playMap;run.mapMode=mapMode;try{localStorage.setItem('pathopedia.play.map',mapMode);}catch{}renderer?.render(run);updateUI(true);return true;}
    if(button.dataset.playStage!==undefined){selectedStage=Number(button.dataset.playStage);run=newRun(catalog,{hard,hints,information,aimAssist,host,stage:selectedStage,mission,mapMode,themeId,companion,seed:seedText||undefined});renderer?.render(run);updateUI(true);return true;}
    if(button.dataset.playMission){mission=button.dataset.playMission;run=newRun(catalog,{hard,hints,information,aimAssist,host,stage:selectedStage,mission,mapMode,themeId,companion,seed:seedText||undefined});renderer?.render(run);updateUI(true);return true;}
    if(button.dataset.playInformation){information=button.dataset.playInformation;hard=['identify','blind'].includes(information);hints=information==='guided';updateUI(true);q('[data-play-information="'+information+'"]')?.focus({preventScroll:true});return true;}
    if(button.dataset.playHost){host=button.dataset.playHost;updateUI(true);return true;}
    if(button.dataset.playLoadoutSlot!==undefined){equipSlot=Number(button.dataset.playLoadoutSlot);updateUI(true);q('.fp-loadout')?.setAttribute('open','');return true;}
    if(button.dataset.playEquip!==undefined){equipWeapon(run,equipSlot,Number(button.dataset.playEquip));updateUI(true);q('.fp-loadout')?.setAttribute('open','');renderer?.render(run);return true;}
    if(button.dataset.playWeapon!==undefined){if(performance.now()<swipeSuppressUntil)return true;switchWeapon(run,Number(button.dataset.playWeapon));updateUI();return true;}
    if(button.dataset.playReward){if(chooseReward(run,button.dataset.playReward)){rewardStep='report';reviewPage=0;renderer?.render(run);updateUI(true);};return true;}
    if(button.dataset.playAugment){if(chooseAugment(run,button.dataset.playAugment))start();return true;}
    const action=button.dataset.playAction;if(!action)return false;
    if(action==='upgrades'){rewardStep='upgrade';updateUI(true);}if(action==='review'){rewardStep='report';updateUI(true);}
    if(action==='start')start();
    if(action==='pause')pause();if(action==='map'){run.showMap=!run.showMap;renderer?.render(run);}
    if(action==='new'){pause();reviewPage=0;rewardStep='report';run=newRun(catalog,{hard,hints,information,aimAssist,host,stage:selectedStage,mission,mapMode,themeId,companion,seed:seedText||undefined});overlayKey='';renderer?.render(run);updateUI(true);}
    if(action==='reload')reload(run);if(action==='throw'){throwGrenade(run);updateUI();}if(action==='source')controlSource(run);
    if(action==='inspect'){pauseTab='codex';pause();updateUI(true);}
    if(action==='sound'){audioOn=!audioOn;if(audioOn)unlockAudio();else if(audio)void audio.suspend();try{localStorage.setItem('pathopedia.play.sound',audioOn?'on':'off');}catch{}button.textContent='SFX '+(audioOn?'ON':'OFF');button.setAttribute('aria-pressed',String(audioOn));updateUI(true);}
    if(action==='music'){musicOn=!musicOn;try{localStorage.setItem('pathopedia.play.music',musicOn?'on':'off');}catch{}syncMusic();updateUI(run.status!=='running');}
    if(action==='next-track'){musicChoice=MUSIC_TRACKS[(MUSIC_TRACKS.findIndex(t=>t.id===selectedTrack().id)+1)%MUSIC_TRACKS.length].id;try{localStorage.setItem('pathopedia.play.track',musicChoice);}catch{}syncMusic();announce(run,selectedTrack().name+' · '+selectedTrack().mood,3);updateUI(run.status!=='running');}
    if(action==='reload-preview'){unlockAudio();if(audioOn&&audio)void audio.resume().then(()=>sound('loaded')).catch(()=>{});}
    if(action==='quality'){quality=quality==='low'?'retro':'low';renderer?.resize(quality);renderer?.render(run);button.textContent=quality==='low'?'LOW':'RETRO';updateUI(true);}
    if(action==='fullscreen'){if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else if(root?.requestFullscreen)void root.requestFullscreen().catch(()=>{root?.classList.toggle('fp-theater');renderer?.resize(quality);});else{root?.classList.toggle('fp-theater');renderer?.resize(quality);}button.textContent=root?.classList.contains('fp-theater')?'⛶ 창 모드':'⛶ 전체화면';}
    return true;
  }
  function unmount(){
    disposed=true;clearInput();if(run.status==='running')run.status='paused';loop?.stop();if(loop){loop.update=()=>{};loop.render=()=>{};loop.context=null;}abort?.abort();abort=null;resizeObserver?.disconnect();resizeObserver=null;unlockPointer();renderer?.dispose();renderer=null;canvas=null;root=null;
    if(music){music.pause();music.removeAttribute('src');music.load();music=null;musicTrack='';}
    foley.dispose();combatAudio.dispose();if(audio){void audio.close().catch(()=>{});audio=null;master=null;reloadNoise=null;}
  }
  function mount(app,active){
    unmount();if(!active)return;root=app.querySelector('.fp-shell');if(!root)return;disposed=false;canvas=q('.fp-canvas');abort=new AbortController();const options={signal:abort.signal},on=(el,event,handler,extra={})=>el.addEventListener(event,handler,{...options,...extra});
    arsenalKey='';on(root,'input',e=>{if(e.target.matches('[data-play-seed]'))seedText=e.target.value;});on(root,'change',e=>{if(e.target.matches('[data-play-ally]')){equipCompanion(run,e.target.value);updateUI(true);}if(e.target.matches('[data-play-assist]')){aimAssist=e.target.checked;run.aimAssist=aimAssist;}if(e.target.matches('[data-play-sensitivity]'))sensitivity=Number(e.target.value);if(e.target.matches('[data-play-music]')){musicChoice=e.target.value;try{localStorage.setItem('pathopedia.play.track',musicChoice);}catch{}syncMusic();updateUI(true);}if(e.target.matches('[data-play-hints]')){hints=e.target.checked;run.hints=hints&&!run.hard;run.hintTime=0;updateUI();}});
    const fitViewport=()=>{if(!root)return;root.style.setProperty('--fp-height',Math.max(240,window.innerHeight-Math.max(0,root.getBoundingClientRect().top)-10)+'px');};fitViewport();on(window,'resize',fitViewport);
    renderer=createPlayRenderer(canvas,catalog,{quality,reducedMotion});renderer.render(run);
    resizeObserver=new ResizeObserver(()=>{renderer?.resize(quality);renderer?.render(run);});resizeObserver.observe(q('.fp-viewport'));
    loop ||= GameLoop({fps:60,clearCanvas:false,blur:true,context:null,render(){}});
    loop.context=canvas.getContext('2d');loop.update=dt=>{
      if(disposed||!['running','clearing'].includes(run.status))return;const before=run.status;
      const input={forward:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)+touch.forward,strafe:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.strafe,turn:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),fire:mouseFire||touch.fire,jump:jumpQueued||keys.has('Space'),dash:keys.has('ShiftLeft')||keys.has('ShiftRight'),scope:mouseScope||touchScope,source:keys.has('KeyF'),throw:keys.has('KeyG'),touchAim:pointers.size>0,look:(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0)};
      tick(run,input,dt);jumpQueued=false;if(run.events.includes('victory'))sound('victory');for(const event of run.events.filter(e=>e!=='victory').slice(0,12))sound(event);run.events.length=0;uiTime+=dt;
      if(run.status==='clearing'&&before!=='clearing'){rewardStep='report';reviewPage=0;syncMusic();clearInput();unlockPointer();updateUI(true);}
      else if(!['running','clearing'].includes(run.status)){loop.stop();syncMusic();clearInput();unlockPointer();if(['won','lost'].includes(run.status)){best=Math.max(best,run.score);try{localStorage.setItem('pathopedia.play.best',String(best));}catch{}}updateUI(true);}
      else if(uiTime>.1){uiTime=0;updateUI();}
    };
    loop.render=()=>renderer?.render(run);
    on(window,'keydown',e=>{
      if(e.target.matches('[data-play-tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.code)){e.preventDefault();const tabs=[...root.querySelectorAll('[data-play-tab]')],i=tabs.indexOf(e.target),n=e.code==='Home'?0:e.code==='End'?tabs.length-1:(i+(e.code==='ArrowRight'?1:-1)+tabs.length)%tabs.length;handleClick(tabs[n]);return;}
      if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
      if(e.code==='Escape'||e.code==='Tab'||e.code==='KeyB'){if(run.status==='running'){e.preventDefault();pause();if(e.code==='KeyB'){pauseTab='codex';updateUI(true);}}return;}
      if(run.status!=='running')return;
      if(['KeyW','KeyA','KeyS','KeyD','KeyF','KeyG','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
      if(e.code==='KeyM'&&!e.repeat){e.preventDefault();run.showMap=!run.showMap;}
      if(e.code==='Space'&&!e.repeat)jumpQueued=true;
      if((mouseScope||touchScope)&&(e.code==='KeyQ'||/^Digit[1-9]$/.test(e.code)))return;
      if(e.code==='KeyF'&&!e.repeat)controlSource(run);
      if(e.code==='KeyR'&&!e.repeat){e.preventDefault();reload(run);}
      if(e.code==='KeyG'&&!e.repeat){e.preventDefault();throwGrenade(run);}
      if(e.code==='KeyQ'){e.preventDefault();switchWeapon(run,run.scannerActive?run.weapon:run.previousWeapon);}
      if(/^Digit[1-9]$/.test(e.code)){e.preventDefault();switchWeapon(run,run.slots[Number(e.code.slice(-1))-1]);}
    });
    on(window,'keyup',e=>keys.delete(e.code));on(window,'blur',pause);on(window,'pagehide',pause);on(document,'visibilitychange',()=>{if(document.hidden)pause();});
    on(document,'fullscreenchange',()=>{q('[data-play-action="fullscreen"]').textContent=document.fullscreenElement?'⛶ 창 모드':'⛶ 전체화면';renderer?.resize(quality);renderer?.render(run);});
    on(document,'pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&!lookFallback)pause();});
    on(document,'pointerlockerror',()=>{lookFallback=true;announce(run,'마우스를 누른 채 움직여 조준 · 방향키 회전 가능',5);});
    on(document,'mousemove',e=>{if(run.status==='running'&&document.pointerLockElement===canvas){const sensitivity=run.scoped?.00125:.0025;run.player.angle=angleDelta(run.player.angle+clamp(e.movementX,-180,180)*sensitivity);run.player.pitch=clamp(run.player.pitch-clamp(e.movementY,-180,180)*sensitivity,-.55,.55);}});
    on(canvas,'pointerdown',e=>{if(run.status!=='running')return;if(document.pointerLockElement!==canvas)canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){pointers.set(e.pointerId,{kind:'look',x:e.clientX,y:e.clientY});}else{if(e.button===2)mouseScope=true;else if(e.button===0)mouseFire=true;dragLook=document.pointerLockElement!==canvas;lastX=e.clientX;lastY=e.clientY;}});
    on(canvas,'pointermove',e=>{if(run.status!=='running')return;const p=pointers.get(e.pointerId);if(p?.kind==='look'){run.player.angle=angleDelta(run.player.angle+(e.clientX-p.x)*(run.scoped?.0025:.005)*sensitivity);run.player.pitch=clamp(run.player.pitch-(e.clientY-p.y)*(run.scoped?.002:.004)*sensitivity,-.55,.55);p.x=e.clientX;p.y=e.clientY;}else if(dragLook){run.player.angle=angleDelta(run.player.angle+(e.clientX-lastX)*(run.scoped?.002:.004));run.player.pitch=clamp(run.player.pitch-(e.clientY-lastY)*(run.scoped?.002:.004),-.55,.55);lastX=e.clientX;lastY=e.clientY;}});
    on(window,'pointerup',e=>{if(e.button===2)mouseScope=false;else if(e.button===0)mouseFire=false;dragLook=false;const p=pointers.get(e.pointerId);if(p?.kind==='move'){touch.forward=touch.strafe=0;q('.fp-stick i')?.removeAttribute('style');}if(p?.kind==='fire')touch.fire=false;if(p?.kind==='scope')touchScope=false;if(p?.kind==='dash')keys.delete('ShiftLeft');if(p?.kind==='jump')keys.delete('Space');pointers.delete(e.pointerId);});
    on(window,'pointercancel',clearInput);
    on(canvas,'wheel',e=>{if(run.status!=='running'||mouseScope||touchScope)return;e.preventDefault();cycleWeapon(run,e.deltaY>0?1:-1);},{passive:false});
    on(canvas,'contextmenu',e=>e.preventDefault());
    const arsenal=q('.fp-arsenal');let swipe=null;on(arsenal,'pointerdown',e=>{if(e.pointerType==='touch'&&run.status==='running')swipe={x:e.clientX,y:e.clientY};});on(arsenal,'pointerup',e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.5){e.preventDefault();swipeSuppressUntil=performance.now()+250;cycleWeapon(run,dx<0?1:-1);updateUI();}});
    const stick=q('.fp-stick');on(stick,'pointerdown',e=>{if(run.status!=='running')return;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();pointers.set(e.pointerId,{kind:'move',x:r.left+r.width/2,y:r.top+r.height/2});});
    on(stick,'pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;touch.strafe=clamp((e.clientX-p.x)/38,-1,1);touch.forward=clamp(-(e.clientY-p.y)/38,-1,1);stick.querySelector('i').style.transform='translate('+touch.strafe*27+'px,'+-touch.forward*27+'px)';});
    for(const b of root.querySelectorAll('[data-play-touch]'))on(b,'pointerdown',e=>{if(run.status!=='running')return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{kind:b.dataset.playTouch});if(b.dataset.playTouch==='fire')touch.fire=true;else if(b.dataset.playTouch==='scope'){selectScanner(run);touchScope=true;}else{keys.add(b.dataset.playTouch==='jump'?'Space':'ShiftLeft');if(b.dataset.playTouch==='jump')jumpQueued=true;}});
    updateUI(true);if(run.status==='clearing')loop.start();
  }
  return {render,mount,handleClick,dispose:unmount};
}
