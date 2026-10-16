import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {MODES,RARITIES,TRAITS,AUGMENTS,MAX_CROWD,MAX_STAR,LAST_WAVE,WAVE_SECONDS,unitById} from './luck-data.mjs';
import {createLuckRun,summon,summonCost,moveOrMerge,canMerge,sell,sellValue,upgrade,upgradeCost,recipeSlots,craft,chooseAugment,burst,pause,resume,tickLuck,synergies,drainEvents,unitPower} from './luck-engine.mjs';
import {createLuckRenderer} from './luck-renderer.mjs';
import {createSurvivalAudio} from './survival-audio.mjs';
import {cardArtwork} from './card-art.mjs';
const KEY='pathopedia:reroll:v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,cls='',extra='')=>'<button type="button" class="'+cls+'" data-luck-action="'+action+'" '+extra+'>'+label+'</button>';
export function createLuckGame(){
 let saved={mode:'remedy',sound:true,records:{}},storageOK=true;
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v){saved.mode=MODES[v.mode]?v.mode:'remedy';saved.sound=v.sound!==false;for(const m of Object.keys(MODES)){const r=v.records?.[m];if(r&&Number.isFinite(r.wave)&&Number.isFinite(r.wins)&&Number.isFinite(r.kills))saved.records[m]={wave:Math.min(20,Math.max(0,r.wave)),wins:Math.max(0,r.wins),kills:Math.max(0,r.kills)};}}}catch{storageOK=false;}
 let mode=saved.mode,run=null,game=null,loop=null,observer=null,bindings=null,renderer=null,selected=-1,speed=1,sheet='',active=false,
  lastVersion=-1,hudTime=0,lastStatus='',resultSaved=false,toastTimer=0,suppressClick=false,drag=null;
 const audio=createSurvivalAudio();audio.setEnabled(saved.sound);
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{storageOK=false;}}
 function art(def,kind=mode){return cardArtwork(kind==='remedy'?'drug':'pathogen',def.art);}
 function portrait(def,kind=mode,cls=''){const a=art(def,kind);return a?'<img class="'+cls+'" src="'+esc(a.src)+'" alt="" draggable="false" decoding="async">':'<span class="ll-fallback" aria-hidden="true">✦</span>';}
 const stars=n=>'★'.repeat(n);
 function best(m){const r=saved.records[m];return r?'최고 W'+String(r.wave).padStart(2,'0')+' · '+r.wins+'승':'첫 기록을 남겨봐';}
 function header(){
  return '<header class="ll-header"><button type="button" class="ll-wordmark" data-luck-action="'+(run?'pause':'menu')+'" aria-label="'+(run?'일시정지':'re-roll 시작 화면')+'">re<span>-</span>roll<i>✦</i></button><div class="ll-header-tools">'+
   (run?'<span class="ll-faction-dot">'+MODES[mode].name+'</span>':'<span class="ll-edition">LUCK IS A SKILL.</span>')+
   button('collection','▦','ll-icon','aria-label="유닛과 합성 도감"')+
   button('sound',saved.sound?'♫':'♩','ll-icon','aria-label="효과음 '+(saved.sound?'끄기':'켜기')+'" aria-pressed="'+saved.sound+'"')+
   (run?button('pause',run.status==='paused'?'▶':'Ⅱ','ll-icon','aria-label="일시정지"'):'')+'</div></header>';
 }
 function menu(){
  return '<div class="ll-lobby"><div class="ll-lobby-title"><span class="ll-kicker">PATHOPEDIA ARCADE / 01</span><h1>운을 굴려.<br><em>판을 뒤집어.</em></h1><p>소환하고. 합치고. 끝까지 버티고.</p></div>'+
   '<div class="ll-mode-grid">'+Object.values(MODES).map(m=>{
    const featured=[m.units[7],m.units[4],m.units[3]];
    return '<button type="button" data-luck-mode="'+m.id+'" class="ll-mode '+(mode===m.id?'is-selected':'')+'" aria-pressed="'+(mode===m.id)+'" style="--faction:'+m.color+'"><span class="ll-mode-top"><small>'+m.subtitle+'</small><i>'+(mode===m.id?'✓':'↗')+'</i></span><div class="ll-mode-art">'+featured.map((u,i)=>'<span class="ll-mode-orbit orbit-'+i+'">'+portrait(u,m.id)+'</span>').join('')+'<span class="ll-mode-rune">✦</span></div><span class="ll-mode-bottom"><strong>'+m.name+'</strong><small>'+best(m.id)+'</small></span></button>';
   }).join('')+'</div><div class="ll-launch">'+button('start','<span>한 판 시작</span><b>↗</b>','ll-start')+
   '<div class="ll-launch-meta"><span>20 WAVES</span><i>·</i><span>15 SLOTS</span><i>·</i><span>2 FACTIONS</span></div></div>'+
   '<div class="ll-how"><span><b>01</b> 랜덤 소환</span><span><b>02</b> 같은 유닛 합성</span><span><b>03</b> 신화 완성</span></div>'+
   '<span class="ll-fiction">의학에서 모티브를 얻은 판타지 디펜스</span></div>';
 }
 function boardMarkup(){
  return run.board.map((u,i)=>{
   const def=u&&unitById(mode,u.id),rarity=def&&RARITIES[def.rarity];
   const can=selected>=0&&canMerge(run.board[selected],u);
   return '<button type="button" class="ll-cell '+(u?'has-unit':'is-empty')+(selected===i?' is-selected':'')+(can?' can-merge':'')+'" data-luck-cell="'+i+'" '+(u?'style="--rarity:'+rarity.color+'"':'')+
    ' aria-label="'+(i+1)+'번 칸'+(u?' '+def.name+' '+u.star+'성 '+rarity.name:' 비어 있음')+'" aria-pressed="'+(selected===i)+'">'+
    (u?'<span class="ll-rarity-mark">'+rarity.mark+'</span>'+portrait(def)+'<span class="ll-cell-stars">'+stars(u.star)+'</span>':'<span class="ll-cell-plus">+</span>')+'</button>';
  }).join('');
 }
 function traitsMarkup(){
  const syn=synergies(run);
  return Object.entries(TRAITS).map(([id,t])=>'<span class="ll-trait '+(syn[id]>=2?'is-on':'')+'" style="--trait:'+t.color+'" title="'+t.bonus+'"><i>◆</i>'+t.name+' <b>'+syn[id]+'/2</b></span>').join('');
 }
 function selectedMarkup(){
  const u=run.board[selected];
  if(!u)return '<div class="ll-selection-empty"><span>↔</span><div><strong>유닛을 눌러봐</strong><small>같은 유닛끼리 합성 · 다른 칸으로 이동</small></div></div>';
  const d=unitById(mode,u.id),r=RARITIES[d.rarity];
  return '<div class="ll-selected-art" style="--rarity:'+r.color+'">'+portrait(d)+'</div><div class="ll-selected-copy"><small style="color:'+r.color+'">'+r.name+' · '+stars(u.star)+'</small><strong>'+d.name+'</strong><span>'+d.description+'</span><small>피해 '+Math.round(unitPower(run,u))+' · '+TRAITS[d.trait].name+'</small></div>'+
   button('sell','판매<br><b>'+sellValue(run,u)+'G</b>','ll-sell','aria-label="'+d.name+' 판매 '+sellValue(run,u)+'골드"');
 }
 function recipesMarkup(){
  return MODES[mode].recipes.map(recipe=>{
   const d=unitById(mode,recipe.id),ready=!!recipeSlots(run,recipe.id);
   return '<article class="ll-recipe '+(ready?'is-ready':'')+'"><div class="ll-recipe-head"><span class="ll-recipe-portrait">'+portrait(d)+'</span><div><small>MYTHIC</small><strong>'+d.name+'</strong></div>'+button('craft',ready?'합성 ✦':'조합','ll-craft','data-luck-id="'+recipe.id+'" '+(!ready||run.status!=='running'?'disabled':''))+'</div><div class="ll-ingredients">'+
    recipe.needs.map(id=>{const def=unitById(mode,id),owned=run.board.some(u=>u?.id===id);return '<span class="'+(owned?'is-owned':'')+'">'+portrait(def)+'<small>'+def.name+'</small><i>'+(owned?'✓':'+')+'</i></span>';}).join('')+'</div></article>';
  }).join('');
 }
 function controls(){
  return '<div class="ll-controls"><div class="ll-wallet"><span>◆ <b data-ll-gold>'+run.gold+'</b><small>G</small></span><span class="ll-gems">✧ <b data-ll-gems>'+run.gems+'</b></span><small class="ll-pity" data-ll-pity>희귀 보장까지 '+(12-run.pity)+'회</small></div><div class="ll-actions">'+
   button('summon','<span>소환</span><b data-ll-summon-cost>'+summonCost(run)+'G</b>','ll-summon','aria-label="랜덤 소환"')+
   button('lucky','<span>행운 뽑기</span><b>✧ 3</b>','ll-lucky','aria-label="행운 뽑기 행운석 3개" title="희귀 52% · 영웅 40% · 전설 8%"')+
   button('burst','<span>ϟ 필살기</span><b data-ll-burst>READY</b>','ll-burst','aria-label="'+MODES[mode].burst+'"')+'</div></div>';
 }
 function battle(){
  return '<div class="ll-battle"><div class="ll-left"><div class="ll-scorebar"><div><small>WAVE</small><strong data-ll-wave>'+String(run.wave).padStart(2,'0')+'</strong><span>/ 20</span></div><div class="ll-crowd"><span>적 <b data-ll-crowd>'+run.enemies.length+'</b> / 60</span><i><b data-ll-crowd-bar></b></i></div>'+
   button('speed','×'+speed,'ll-speed','aria-label="전투 속도 전환"')+'</div><div class="ll-wave-track"><i data-ll-wave-bar></i></div>'+
   '<div class="ll-arena"><canvas class="ll-canvas" aria-label="자동 전투 전장"></canvas><div class="ll-board" role="group" aria-label="15칸 소환 보드">'+boardMarkup()+'</div>'+
   '<div class="ll-arena-caption"><span>MERGE TO SURVIVE</span><span data-ll-kills>'+run.kills+' KILLS</span></div><div class="ll-toast" role="status" aria-live="polite" hidden></div></div>'+controls()+
   '<div class="ll-selection">'+selectedMarkup()+'</div></div><aside class="ll-sidebar"><section class="ll-synergies"><div class="ll-section-label"><strong>시너지</strong><span>서로 다른 유닛 2종</span></div><div class="ll-traits">'+traitsMarkup()+'</div></section>'+
   '<section class="ll-upgrades"><div class="ll-section-label"><strong>연구 강화</strong><span>이번 판에만 적용</span></div><div class="ll-upgrade-row">'+
   button('power','<span>⚔ 공격력 <b data-ll-power-level>Lv.'+run.power+'</b></span><strong data-ll-power-cost>'+upgradeCost(run,'power')+'G</strong>','ll-upgrade')+
   button('luck','<span>✧ 행운 <b data-ll-luck-level>Lv.'+run.luck+'</b></span><strong data-ll-luck-cost>'+upgradeCost(run,'luck')+'G</strong>','ll-upgrade')+'</div></section>'+
   '<section><div class="ll-section-label"><strong>신화 조합</strong><span>각 유닛 1개씩 소모</span></div><div class="ll-recipes">'+recipesMarkup()+'</div></section>'+
   '<div class="ll-augments">'+run.augments.map(id=>{const a=AUGMENTS.find(x=>x.id===id);return '<span title="'+a.text+'">'+a.icon+' '+a.name+'</span>';}).join('')+'</div>'+
   '<details class="ll-guide"><summary>플레이 팁 · 조작</summary><p>같은 종류·같은 별의 유닛 2개를 차례로 누르면 합성. 다른 유닛은 자리 교환. 드래그도 가능.</p><p>합성은 별 +1, 대성공은 +2. 최대 5성. 합성·웨이브 보상으로 행운석 획득. 행운 뽑기는 희귀 이상 확정.</p><p>적 60마리가 쌓이거나 보스 제한 시간이 끝나면 패배. 20웨이브를 모두 막으면 승리!</p><p>Q 소환 · E 행운 · R 필살기 · Space 일시정지</p></details></aside></div>';
 }
 function collection(){
  return '<div class="ll-modal-head"><div><small>THE COLLECTION</small><h2 id="ll-dialog-title">'+MODES[mode].name+' 유닛</h2></div>'+button('close','✕','ll-icon','aria-label="도감 닫기"')+'</div><div class="ll-collection">'+
   MODES[mode].units.map(d=>'<article style="--rarity:'+RARITIES[d.rarity].color+'">'+portrait(d)+'<small>'+RARITIES[d.rarity].name+' · '+TRAITS[d.trait].name+'</small><strong>'+d.name+'</strong><p>'+d.description+'</p></article>').join('')+'</div><p class="ll-modal-note">합성 대성공 '+(12+(run?.luck||0)*2)+'% · 신화는 조합으로 획득</p>';
 }
 function overlay(){
  let body='',cls='';
  if(sheet==='collection'){body=collection();cls='ll-modal--collection';}
  else if(!run)return '';
  else if(run.status==='paused'){
   body='<span class="ll-dialog-symbol">Ⅱ</span><small class="ll-kicker">TAKE YOUR TIME</small><h2 id="ll-dialog-title">잠깐 숨 돌리기</h2>'+button('resume','계속하기 ↗','ll-start')+button('menu','진영 선택으로','ll-text-button')+'<small class="ll-modal-note">진행 중인 판은 종료됩니다.</small>';
  }else if(run.status==='choice'){
   body='<small class="ll-kicker">EXPERIMENT COMPLETE</small><h2 id="ll-dialog-title">판을 바꿀 한 수</h2><div class="ll-choices">'+run.choices.map(id=>{
    const a=AUGMENTS.find(x=>x.id===id);return button('augment','<span>'+a.icon+'</span><strong>'+a.name+'</strong><small>'+a.text+'</small>','ll-choice','data-luck-id="'+id+'"');
   }).join('')+'</div>';cls='ll-modal--choices';
  }else if(['won','lost'].includes(run.status)){
   const win=run.status==='won';
   body='<span class="ll-result-emblem">'+(win?'✦':'↻')+'</span><small class="ll-kicker">'+(win?'ALL WAVES CLEARED':'ONE MORE ROLL?')+'</small><h2 id="ll-dialog-title">'+(win?'운도 실력이야.':'다음 판엔 뜬다.')+'</h2><p class="ll-result-reason">'+(win?'20 웨이브 격파':run.reason)+'</p>'+
    '<div class="ll-result-stats"><span><b>'+run.wave+'</b>웨이브</span><span><b>'+run.kills+'</b>처치</span><span><b>'+run.merges+'</b>합성</span></div>'+
    button('restart','다시 굴리기 ↗','ll-start')+button('retry-seed','같은 운으로 재도전','ll-text-button')+button('menu','진영 선택','ll-text-button')+
    '<small class="ll-modal-note">'+best(mode)+(storageOK?'':' · 기록 저장을 사용할 수 없습니다.')+'</small>';
  }else return '';
  return '<div class="ll-overlay"><section class="ll-modal '+cls+'" role="dialog" aria-modal="true" aria-labelledby="ll-dialog-title">'+body+'</section></div>';
 }
 function content(){return header()+(run?battle():menu())+'<div class="ll-overlay-host">'+overlay()+'</div>';}
 function render(){return '<section class="ll-game" data-mode="'+mode+'" aria-label="re-roll 랜덤 디펜스">'+content()+'</section>';}
 function updateBoard(){
  if(!game||!run)return;
  game.querySelector('.ll-board').innerHTML=boardMarkup();
  game.querySelector('.ll-selection').innerHTML=selectedMarkup();
  game.querySelector('.ll-traits').innerHTML=traitsMarkup();
  game.querySelector('.ll-recipes').innerHTML=recipesMarkup();
  lastVersion=run.version;
 }
 function refreshHud(){
  if(!game||!run)return;
  const set=(s,v)=>{const el=game.querySelector(s);if(el&&el.textContent!==String(v))el.textContent=v;};
  set('[data-ll-gold]',Math.floor(run.gold));set('[data-ll-gems]',run.gems);set('[data-ll-wave]',String(run.wave).padStart(2,'0'));
  set('[data-ll-crowd]',run.enemies.length);set('[data-ll-kills]',run.kills+' KILLS');set('[data-ll-summon-cost]',summonCost(run)+'G');
  set('[data-ll-pity]','희귀 보장까지 '+(12-run.pity)+'회');set('[data-ll-burst]',run.burstCooldown>0?Math.ceil(run.burstCooldown)+'s':'READY');
  for(const kind of ['power','luck']){
   const max=run[kind]>=(kind==='power'?8:4);set('[data-ll-'+kind+'-level]','Lv.'+run[kind]);set('[data-ll-'+kind+'-cost]',max?'MAX':upgradeCost(run,kind)+'G');
   game.querySelector('[data-luck-action="'+kind+'"]').disabled=run.status!=='running'||max||run.gold<upgradeCost(run,kind);
  }
  const full=run.board.every(Boolean);
  game.querySelector('[data-luck-action="summon"]').disabled=run.status!=='running'||full||run.gold<summonCost(run);
  game.querySelector('[data-luck-action="lucky"]').disabled=run.status!=='running'||full||run.gems<3;
  game.querySelector('[data-luck-action="burst"]').disabled=run.status!=='running'||run.burstCooldown>0;
  game.querySelector('[data-ll-crowd-bar]').style.width=Math.min(100,run.enemies.length/MAX_CROWD*100)+'%';
  game.querySelector('.ll-crowd').classList.toggle('is-danger',run.enemies.length>=40);
  game.querySelector('[data-ll-wave-bar]').style.width=Math.min(100,run.waveTime/WAVE_SECONDS*100)+'%';
  if(lastVersion!==run.version)updateBoard();
 }
 function processEvents(){
  const sounds={hit:'boltHit',heavyhit:'novaHit',summon:'pickup',merge:'upgrade',jackpot:'won',mythic:'won',wave:'start',boss:'warning',bosskill:'won',burst:'nova',income:'pickup',upgrade:'upgrade',lost:'hurt',won:'won',choice:'upgrade'};
  for(const e of drainEvents(run)){
   if(sounds[e.kind])audio.play([sounds[e.kind]]);
   if(e.text){const el=game?.querySelector('.ll-toast');if(el){clearTimeout(toastTimer);el.textContent=e.text;el.dataset.kind=e.kind;el.hidden=false;toastTimer=setTimeout(()=>{if(el.isConnected)el.hidden=true;},e.kind==='mythic'?2600:1700);}}
  }
 }
 function recordResult(){
  if(resultSaved||!run||!['won','lost'].includes(run.status))return;
  const r=saved.records[mode]||{wave:0,wins:0,kills:0};r.wave=Math.max(r.wave,run.wave);r.wins+=run.status==='won'?1:0;r.kills=Math.max(r.kills,run.kills);saved.records[mode]=r;resultSaved=true;persist();
 }
 function syncOverlay(focus=true){
  recordResult();if(!game)return;
  game.querySelector('.ll-overlay-host').innerHTML=overlay();
  const pauseBtn=game.querySelector('.ll-header [data-luck-action="pause"].ll-icon');if(pauseBtn){pauseBtn.textContent=run?.status==='paused'?'▶':'Ⅱ';pauseBtn.setAttribute('aria-label',run?.status==='paused'?'계속하기':'일시정지');}
  if(focus&&game.querySelector('.ll-overlay'))queueMicrotask(()=>game?.querySelector('.ll-overlay button:not(:disabled)')?.focus({preventScroll:true}));
  lastStatus=run?.status||'';
 }
 function rebuild(){if(!game)return;game.dataset.mode=mode;game.innerHTML=content();attach();}
 function start(seed){mode=saved.mode;run=createLuckRun(mode,seed);selected=-1;sheet='';resultSaved=false;lastVersion=-1;rebuild();processEvents();}
 function cell(index){
  if(!run||run.status!=='running'||sheet)return;
  if(selected<0){if(run.board[index])selected=index;}
  else if(selected===index)selected=-1;
  else {moveOrMerge(run,selected,index);selected=run.board[index]?index:-1;processEvents();}
  updateBoard();refreshHud();
 }
 function handleClick(b){
  const ds=b.dataset;
  if(!('luckAction'in ds)&&!('luckCell'in ds)&&!('luckMode'in ds))return false;
  if(suppressClick&&'luckCell'in ds){suppressClick=false;return true;}
  audio.unlock();
  if(ds.luckMode&&!run){mode=ds.luckMode;saved.mode=mode;persist();rebuild();return true;}
  if('luckCell'in ds){cell(Number(ds.luckCell));return true;}
  const action=ds.luckAction;
  if(action==='sound'){
   saved.sound=!saved.sound;audio.setEnabled(saved.sound);persist();
   const btn=game.querySelector('[data-luck-action="sound"]');btn.textContent=saved.sound?'♫':'♩';btn.setAttribute('aria-pressed',saved.sound);btn.setAttribute('aria-label','효과음 '+(saved.sound?'끄기':'켜기'));return true;
  }
  if(action==='start'||action==='restart'){start();return true;}
  if(action==='retry-seed'){start(run.seed);return true;}
  if(action==='menu'){run=null;sheet='';selected=-1;rebuild();return true;}
  if(action==='collection'){if(run)pause(run);sheet='collection';syncOverlay();return true;}
  if(action==='close'){sheet='';syncOverlay();return true;}
  if(!run)return true;
  if(action==='pause'){if(sheet)return true;if(run.status==='running')pause(run);else if(run.status==='paused')resume(run);syncOverlay();refreshHud();return true;}
  if(action==='resume'){resume(run);syncOverlay();refreshHud();return true;}
  if(action==='speed'){speed=speed===1?2:1;b.textContent='×'+speed;return true;}
  if(action==='summon')summon(run);
  if(action==='lucky')summon(run,true);
  if(action==='burst')burst(run);
  if(action==='power'||action==='luck')upgrade(run,action);
  if(action==='sell'){sell(run,selected);selected=-1;}
  if(action==='craft'){craft(run,ds.luckId);selected=-1;}
  if(action==='augment'){chooseAugment(run,ds.luckId);rebuild();}
  processEvents();refreshHud();return true;
 }
 function detach(){loop?.stop();observer?.disconnect();bindings?.abort();clearTimeout(toastTimer);drag=null;}
 function attach(){
  detach();if(!game)return;bindings=new AbortController();const opts={signal:bindings.signal};
  const autoPause=()=>{if(run&&pause(run)){syncOverlay(false);refreshHud();}};
  window.addEventListener('blur',autoPause,opts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();},opts);
  window.addEventListener('keydown',e=>{
   if(!active||e.repeat||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
   const modal=game.querySelector('.ll-overlay');
   if(e.key==='Tab'&&modal){
    const items=[...modal.querySelectorAll('button:not(:disabled),summary,a[href]')],first=items[0],last=items.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;
   }
   if(e.code==='Escape'&&sheet){e.preventDefault();handleClick({dataset:{luckAction:'close'}});return;}
   if(modal&&run?.status!=='paused')return;
   const action={KeyQ:'summon',KeyE:'lucky',KeyR:'burst',Space:'pause',Escape:'pause'}[e.code];
   if(e.code==='Space'&&e.target.closest('button'))return;
   if(action&&run){e.preventDefault();handleClick({dataset:{luckAction:action}});}
  },opts);
  const canvas=game.querySelector('canvas');
  if(!canvas){syncOverlay(false);return;}
  renderer=createLuckRenderer(canvas);observer=new ResizeObserver(()=>{renderer.resize();renderer.draw(run);});observer.observe(canvas);renderer.resize();
  const board=game.querySelector('.ll-board');
  board.addEventListener('pointerdown',e=>{
   const el=e.target.closest('[data-luck-cell]');if(!el||run.status!=='running'||e.button!==0)return;
   const index=Number(el.dataset.luckCell);if(!run.board[index])return;
   drag={id:e.pointerId,index,x:e.clientX,y:e.clientY,moved:false};
  },opts);
  board.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>10){drag.moved=true;if(!board.hasPointerCapture(e.pointerId))board.setPointerCapture(e.pointerId);board.classList.add('is-dragging');const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-luck-cell]');for(const b of board.children)b.classList.toggle('is-drop-target',b===target);}
  },opts);
  board.addEventListener('pointerup',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   if(drag.moved){
    const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-luck-cell]');
    if(el){moveOrMerge(run,drag.index,Number(el.dataset.luckCell));selected=Number(el.dataset.luckCell);processEvents();}
    suppressClick=true;setTimeout(()=>suppressClick=false,100);updateBoard();refreshHud();
   }
   board.classList.remove('is-dragging');for(const b of board.children)b.classList.remove('is-drop-target');
   if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);drag=null;
  },opts);
  board.addEventListener('pointercancel',()=>{drag=null;board.classList.remove('is-dragging');},opts);
  loop=GameLoop({context:canvas.getContext('2d'),clearCanvas:false,blur:true,update(dt){
   if(!active||!run||document.hidden)return;
   if(run.status==='running'&&!sheet){for(let i=0;i<speed;i++)tickLuck(run,dt);processEvents();}
   hudTime+=dt;if(hudTime>.1){hudTime=0;refreshHud();}
   if(lastStatus!==run.status){syncOverlay();refreshHud();}
  },render(){if(run&&active)renderer.draw(run);}});
  lastVersion=-1;refreshHud();lastStatus=run.status;renderer.draw(run);loop.start();syncOverlay();
 }
 function mount(root,isActive){
  detach();active=isActive;if(!active){if(run)pause(run);game=null;return;}
  game=root.querySelector('.ll-game');if(game)attach();
 }
 return{render,mount,handleClick};
}
