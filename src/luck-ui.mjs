import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {MODES,RARITIES,TRAITS,AUGMENTS,MAX_CROWD,WAVE_SECONDS,unitById} from './luck-data.mjs';
import {createLuckRun,summon,summonBatch,summonCost,batchCost,drawOdds,moveUnit,sell,sellValue,upgrade,upgradeCost,recipeSlots,craft,chooseAugment,pause,resume,tickLuck,synergies,drainEvents,unitPower,unitRange,unitInterval} from './luck-engine.mjs';
import {createLuckRenderer} from './luck-renderer.mjs';
import {createSurvivalAudio} from './survival-audio.mjs';
import {cardArtwork} from './card-art.mjs';
import {icon} from './luck-icons.mjs';
const KEY='pathopedia:reroll:v1';
const PANELS={traits:'특성',upgrades:'강화',recipes:'조합'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,cls='',extra='')=>'<button type="button" class="'+cls+'" data-luck-action="'+action+'" '+extra+'>'+label+'</button>';
export function createLuckGame(){
 let saved={mode:'remedy',sound:true,records:{}},storageOK=true;
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v){saved.mode=MODES[v.mode]?v.mode:'remedy';saved.sound=v.sound!==false;for(const m of Object.keys(MODES)){const r=v.records?.[m];if(r&&Number.isFinite(r.wave)&&Number.isFinite(r.wins)&&Number.isFinite(r.kills))saved.records[m]={wave:Math.min(20,Math.max(0,r.wave)),wins:Math.max(0,r.wins),kills:Math.max(0,r.kills)};}}}catch{storageOK=false;}
 let mode=saved.mode,run=null,game=null,loop=null,observer=null,bindings=null,renderer=null,selected=-1,selectedUid=0,speed=1,sheet='',panel='traits',active=false,
  page=0,collectionResume=false,lastVersion=-1,hudTime=0,lastStatus='',resultSaved=false,toastTimer=0,suppressClick=false,drag=null;
 const audio=createSurvivalAudio();audio.setEnabled(saved.sound);
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{storageOK=false;}}
 function art(def,kind=mode){return cardArtwork(kind==='remedy'?'drug':'pathogen',def.art);}
 function portrait(def,kind=mode,cls=''){const a=art(def,kind);return a?'<img class="'+cls+'" src="'+esc(a.src)+'" alt="" draggable="false" decoding="async">':'<span class="ll-fallback" aria-hidden="true">✦</span>';}
 const stars=n=>'★'.repeat(n);
 function best(m){const r=saved.records[m];return r?'최고 W'+String(r.wave).padStart(2,'0')+' · '+r.wins+'승':'';}
 function header(){
  return '<header class="ll-header"><h1 class="ll-wordmark">re<span>-</span>roll</h1><div class="ll-header-tools">'+
   (run?'<span class="ll-faction-dot">'+MODES[mode].name+'</span>':'')+
   button('collection',icon('layout-grid'),'ll-icon','aria-label="기물 도감"')+
   button('sound',icon(saved.sound?'volume-2':'volume-x'),'ll-icon','aria-label="효과음 '+(saved.sound?'끄기':'켜기')+'" aria-pressed="'+saved.sound+'"')+
   (run?button('pause',icon(run.status==='paused'?'play':'pause'),'ll-icon','aria-label="'+(run.status==='paused'?'계속하기':'일시정지')+'"'):'')+'</div></header>';
 }
 function menu(){
  return '<div class="ll-lobby"><div class="ll-mode-grid">'+Object.values(MODES).map(m=>{
   const featured=m.id==='remedy'?['mero','van','dox']:['pseudo','kleb','cand'];
   return '<button type="button" data-luck-mode="'+m.id+'" class="ll-mode '+(mode===m.id?'is-selected':'')+'" aria-pressed="'+(mode===m.id)+'" style="--faction:'+m.color+'"><span class="ll-mode-top"><small>'+m.subtitle+'</small><i>'+(mode===m.id?'✓':'')+'</i></span><div class="ll-mode-art">'+featured.map((id,i)=>'<span class="ll-mode-orbit orbit-'+i+'">'+portrait(unitById(m.id,id),m.id)+'</span>').join('')+'</div><span class="ll-mode-bottom"><strong>'+m.name+'</strong>'+(best(m.id)?'<small>'+best(m.id)+'</small>':'')+'</span></button>';
  }).join('')+'</div>'+button('start','시작 '+icon('play'),'ll-start ll-launch')+'</div>';
 }
 function boardMarkup(){
  return run.board.map((u,i)=>{
   const d=u&&unitById(mode,u.id),r=d&&RARITIES[d.rarity],beat=u ? .85+(u.uid%5)*.11 : 1;
   return '<button type="button" class="ll-cell '+(u?'has-unit'+((u.readyAt||0)>run.totalTime?' is-merging':''):'is-empty')+(selected===i?' is-selected':'')+'" data-luck-cell="'+i+'" '+(u?'data-tier="'+d.rarity+'" data-unit-uid="'+u.uid+'" style="--rarity:'+r.color+';--beat:'+beat+'s;--phase:-'+((run.totalTime+u.uid*.21)%beat)+'s"':'')+
    ' aria-label="'+(i+1)+'번 칸'+(u?' '+d.name+' '+u.star+'성 '+r.name:' 비어 있음')+'" aria-pressed="'+(selected===i)+'">'+
    (u?'<span class="ll-tier-marker">'+r.mark+'</span><span class="ll-unit-shadow"></span><span class="ll-unit-body">'+portrait(d)+'</span><span class="ll-cell-stars">'+stars(u.star)+'</span>':'<span class="ll-cell-plus">·</span>')+'</button>';
  }).join('');
 }
 function traitsMarkup(){
  const counts=synergies(run),ids=[...new Set(MODES[mode].units.flatMap(d=>d.traits))];
  return '<div class="ll-panel-heading"><strong>특성</strong><small>전체 기물에 적용</small></div><div class="ll-traits">'+ids.map(id=>{
   const t=TRAITS[id],count=counts[id],tier=t.thresholds.findLastIndex(n=>count>=n);
   return '<div class="ll-trait '+(tier>=0?'is-on':'')+'" style="--trait:'+t.color+'"><div><strong>'+t.name+'</strong><b>'+count+'</b></div><span class="ll-trait-tiers">'+t.thresholds.map(n=>'<i class="'+(count>=n?'is-on':'')+'">'+n+'</i>').join('')+'</span><small>'+t.bonuses[Math.max(0,tier)]+'</small></div>';
  }).join('')+'</div>';
 }
 function selectedMarkup(){
  const u=run.board[selected];if(!u)return '';
  const d=unitById(mode,u.id),r=RARITIES[d.rarity],range=unitRange(run,u);
  return '<div class="ll-selected-art">'+portrait(d)+'</div><div class="ll-selected-copy"><div><strong>'+d.name+'</strong><b class="ll-tier-label" style="--rarity:'+r.color+'">'+r.name+'</b><small class="ll-info-stars">'+stars(u.star)+'</small></div>'+
   '<span class="ll-unit-stats">피해 '+Math.round(unitPower(run,u))+' · '+unitInterval(run,u,selected).toFixed(2)+'초 · 사거리 '+(range>=700?'전체':Math.round(range))+'</span>'+
   '<span class="ll-unit-skill" style="color:'+d.attack.color+'">'+d.attack.name+' · '+d.description+'</span>'+
   '<span>'+d.traits.map(id=>'<i style="color:'+TRAITS[id].color+'">'+TRAITS[id].name+'</i>').join('')+'</span></div>'+
   button('sell','판매 <b>'+sellValue(run,u)+'G</b>','ll-sell','aria-label="'+d.name+' 판매 '+sellValue(run,u)+'골드" '+((u.readyAt||0)>run.totalTime?'disabled':''));
 }
 function recipesMarkup(){
  return '<div class="ll-panel-heading"><strong>신화 조합</strong></div><div class="ll-recipes">'+MODES[mode].recipes.map(recipe=>{
   const d=unitById(mode,recipe.id),ready=!!recipeSlots(run,recipe.id);
   return '<article class="ll-recipe '+(ready?'is-ready':'')+'"><div class="ll-recipe-head"><span class="ll-recipe-portrait">'+portrait(d)+'</span><strong>'+d.name+'</strong>'+button('craft','조합','ll-craft','data-luck-id="'+recipe.id+'" '+(!ready||run.status!=='running'?'disabled':''))+'</div><div class="ll-ingredients">'+
    recipe.needs.map(id=>{const def=unitById(mode,id),owned=run.board.some(u=>u?.id===id);return '<span class="'+(owned?'is-owned':'')+'">'+portrait(def)+'<small>'+def.name+'</small><i>'+(owned?'✓':'+')+'</i></span>';}).join('')+'</div></article>';
  }).join('')+'</div>';
 }
 function upgradesMarkup(){
  return '<div class="ll-panel-heading"><strong>강화</strong></div><div class="ll-upgrade-row">'+
   button('power','<span>공격력 <b data-ll-power-level>Lv.'+run.power+'</b></span><strong data-ll-power-cost>'+upgradeCost(run,'power')+'G</strong>','ll-upgrade')+
   button('luck','<span>행운 <b data-ll-luck-level>Lv.'+run.luck+'</b></span><strong data-ll-luck-cost>'+upgradeCost(run,'luck')+'G</strong>','ll-upgrade')+'</div>'+
   (run.augments.length?'<div class="ll-panel-heading ll-augment-heading"><strong>증강</strong></div><div class="ll-augments">'+run.augments.map(id=>{const a=AUGMENTS.find(x=>x.id===id);return '<span title="'+a.text+'">'+a.icon+' '+a.name+'</span>';}).join('')+'</div>':'');
 }
 function panelMarkup(id){return id==='traits'?traitsMarkup():id==='recipes'?recipesMarkup():upgradesMarkup();}
 function oddsLabel(){
  return drawOdds(run||{luck:0,augments:[]},true).map((n,i)=>n?RARITIES[i].name+' '+Number((n*100).toFixed(1))+'%':'').filter(Boolean).join(' · ');
 }
 function controls(){
  return '<div class="ll-controls"><div class="ll-wallet"><span>◆ <b data-ll-gold>'+run.gold+'</b><small>G</small></span><span class="ll-gems">✧ <b data-ll-gems>'+run.gems+'</b></span><small class="ll-pity" data-ll-pity>희귀 보장 '+(12-run.pity)+'</small></div><div class="ll-actions">'+
   button('summon','<span>소환</span><b data-ll-summon-cost>'+summonCost(run)+'G</b>','ll-summon','aria-label="랜덤 소환"')+
   button('multi','<span>10회 소환</span><b data-ll-multi-cost>'+batchCost(run)+'G</b>','ll-multi','aria-label="10회 한 번에 소환"')+
   button('lucky','<span>행운 뽑기</span><b>✧ 3</b>','ll-lucky','aria-label="행운 뽑기 행운석 3개" title="'+oddsLabel()+'"')+'</div></div>';
 }
 function battle(){
  return '<div class="ll-battle"><div class="ll-left"><div class="ll-scorebar"><div><small>WAVE</small><strong data-ll-wave>'+String(run.wave).padStart(2,'0')+'</strong><span>/ 20</span></div><div class="ll-crowd"><span>적 <b data-ll-crowd>'+run.enemies.length+'</b> / 60</span><i><b data-ll-crowd-bar></b></i></div>'+
   button('speed','×'+speed,'ll-speed','aria-label="전투 속도 전환"')+'</div><div class="ll-wave-track"><i data-ll-wave-bar></i></div>'+
   '<div class="ll-field-wrap"><div class="ll-arena"><canvas class="ll-canvas" aria-label="자동 전투 전장"></canvas><div class="ll-board" role="group" aria-label="15칸 소환 보드">'+boardMarkup()+'</div><canvas class="ll-canvas ll-effects" aria-hidden="true"></canvas>'+
   '<div class="ll-arena-caption"><span>자동 합성</span><span data-ll-kills>'+run.kills+' KILLS</span></div><div class="ll-toast" role="status" aria-live="polite" hidden></div></div></div>'+
   '<div class="ll-selection">'+selectedMarkup()+'</div>'+controls()+'</div><aside class="ll-sidebar"><nav class="ll-panel-tabs" aria-label="전투 관리">'+
   Object.entries(PANELS).map(([id,label])=>button('panel',label,'','data-luck-id="'+id+'" aria-pressed="'+(panel===id)+'"')).join('')+'</nav><div class="ll-panel-body">'+panelMarkup(panel)+'</div></aside></div>';
 }
 function collectionPageSize(){return window.innerHeight<500?2:4;}
 function collection(){
  const units=MODES[mode].units,size=collectionPageSize(),pages=Math.ceil(units.length/size);page=Math.min(page,pages-1);
  return '<div class="ll-modal-head"><h2 id="ll-dialog-title">'+MODES[mode].name+' 도감</h2>'+button('close',icon('x'),'ll-icon','aria-label="도감 닫기"')+'</div><div class="ll-collection">'+
   units.slice(page*size,(page+1)*size).map(d=>'<article style="--rarity:'+RARITIES[d.rarity].color+'"><div class="ll-collection-identity">'+portrait(d)+'<div><small>'+RARITIES[d.rarity].name+'</small><strong>'+d.name+'</strong></div></div><span class="ll-family">'+d.family+'</span><div class="ll-tags">'+d.traits.map(id=>'<span style="--trait:'+TRAITS[id].color+'">'+TRAITS[id].name+'</span>').join('')+'</div><p>'+d.description+'</p></article>').join('')+'</div><p class="ll-draw-odds">행운 · '+oddsLabel()+'</p><nav class="ll-pagination" aria-label="도감 페이지">'+
   button('page-prev',icon('chevron-left'),'ll-icon','aria-label="이전 페이지" '+(page===0?'disabled':''))+'<span>'+(page+1)+' / '+pages+'</span>'+
   button('page-next',icon('chevron-right'),'ll-icon','aria-label="다음 페이지" '+(page===pages-1?'disabled':''))+'</nav>';
 }
 function overlay(){
  let body='',cls='';
  if(sheet==='collection'){body=collection();cls='ll-modal--collection';}
  else if(run&&PANELS[sheet]){
   body='<div class="ll-modal-head"><h2 id="ll-dialog-title">'+PANELS[sheet]+'</h2>'+button('close',icon('x'),'ll-icon','aria-label="'+PANELS[sheet]+' 닫기"')+'</div><div class="ll-sheet-panel">'+panelMarkup(sheet)+'</div>';cls='ll-modal--panel';
  }else if(!run)return '';
  else if(run.status==='paused'){
   body='<span class="ll-dialog-symbol">'+icon('pause')+'</span><h2 id="ll-dialog-title">일시정지</h2>'+button('resume','계속하기 '+icon('play'),'ll-start')+button('menu','진영 선택','ll-text-button');
  }else if(run.status==='choice'){
   body='<h2 id="ll-dialog-title">증강 선택</h2><div class="ll-choices">'+run.choices.map(id=>{
    const a=AUGMENTS.find(x=>x.id===id);return button('augment','<span>'+a.icon+'</span><strong>'+a.name+'</strong><small>'+a.text+'</small>','ll-choice','data-luck-id="'+id+'"');
   }).join('')+'</div>';cls='ll-modal--choices';
  }else if(['won','lost'].includes(run.status)){
   const win=run.status==='won';
   body='<h2 id="ll-dialog-title">'+(win?'클리어':'패배')+'</h2><p class="ll-result-reason">'+(win?'20 웨이브':run.reason)+'</p>'+
    '<div class="ll-result-stats"><span><b>'+run.wave+'</b>웨이브</span><span><b>'+run.kills+'</b>처치</span><span><b>'+run.merges+'</b>합성</span></div>'+
    button('restart','다시 시작','ll-start')+'<div class="ll-result-links">'+button('retry-seed','같은 시드','ll-text-button')+button('menu','진영 선택','ll-text-button')+'</div>'+
    (storageOK?'':'<small class="ll-modal-note">기록 저장 불가</small>');
  }else return '';
  return '<div class="ll-overlay"><section class="ll-modal '+cls+'" role="dialog" aria-modal="true" aria-labelledby="ll-dialog-title">'+body+'</section></div>';
 }
 function content(){return header()+(run?battle():menu())+'<div class="ll-overlay-host">'+overlay()+'</div>';}
 function render(){return '<section class="ll-game" data-mode="'+mode+'" data-status="'+(run?.status||'menu')+'" aria-label="re-roll 랜덤 디펜스">'+content()+'</section>';}
 function updatePanels(){
  const desktop=game.querySelector('.ll-panel-body');if(desktop)desktop.innerHTML=panelMarkup(panel);
  const mobile=game.querySelector('.ll-sheet-panel');if(mobile&&PANELS[sheet])mobile.innerHTML=panelMarkup(sheet);
  for(const b of game.querySelectorAll('[data-luck-action="panel"]'))b.setAttribute('aria-pressed',b.dataset.luckId===panel);
 }
 function updateBoard(){
  if(!game||!run)return;
  for(const f of run.fusions)if(f.fromUid===selectedUid)selectedUid=f.toUid;
  selected=run.board.findIndex(x=>x?.uid===selectedUid);if(selected<0)selectedUid=0;
  game.querySelector('.ll-board').innerHTML=boardMarkup();
  game.querySelector('.ll-selection').innerHTML=selectedMarkup();updatePanels();lastVersion=run.version;
 }
 function refreshHud(){
  if(!game||!run)return;
  if(lastVersion!==run.version)updateBoard();
  const set=(s,v)=>{for(const el of game.querySelectorAll(s))if(el.textContent!==String(v))el.textContent=v;};
  set('[data-ll-gold]',Math.floor(run.gold));set('[data-ll-gems]',run.gems);set('[data-ll-wave]',String(run.wave).padStart(2,'0'));
  set('[data-ll-crowd]',run.enemies.length);set('[data-ll-kills]',run.kills+' KILLS');set('[data-ll-summon-cost]',summonCost(run)+'G');
  set('[data-ll-pity]','희귀 보장 '+(12-run.pity));set('[data-ll-multi-cost]',batchCost(run)+'G');
  game.querySelector('[data-luck-action="lucky"]').title=oddsLabel();
  for(const kind of ['power','luck']){
   const max=run[kind]>=(kind==='power'?8:4);set('[data-ll-'+kind+'-level]','Lv.'+run[kind]);set('[data-ll-'+kind+'-cost]',max?'MAX':upgradeCost(run,kind)+'G');
   for(const b of game.querySelectorAll('[data-luck-action="'+kind+'"]'))b.disabled=run.status!=='running'||max||run.gold<upgradeCost(run,kind);
  }
  for(const b of game.querySelectorAll('[data-luck-action="craft"]'))b.disabled=run.status!=='running'||!recipeSlots(run,b.dataset.luckId);
  const full=run.board.every(Boolean);
  game.querySelector('[data-luck-action="summon"]').disabled=run.status!=='running'||full||run.gold<summonCost(run);
  game.querySelector('[data-luck-action="lucky"]').disabled=run.status!=='running'||full||run.gems<3;
  game.querySelector('[data-luck-action="multi"]').disabled=run.status!=='running'||full||run.gold<batchCost(run);
  const selectedUnit=run.board[selected],sellButton=game.querySelector('[data-luck-action="sell"]');if(sellButton)sellButton.disabled=run.status!=='running'||(selectedUnit?.readyAt||0)>run.totalTime;
  game.querySelector('[data-ll-crowd-bar]').style.width=Math.min(100,run.enemies.length/MAX_CROWD*100)+'%';
  game.querySelector('.ll-crowd').classList.toggle('is-danger',run.enemies.length>=40);
  game.querySelector('[data-ll-wave-bar]').style.width=Math.min(100,run.waveTime/WAVE_SECONDS*100)+'%';
  game.dataset.status=run.status;
 }
 function processEvents(){
  const sounds={hit:'boltHit',heavyhit:'novaHit',summon:'pickup',merge:'upgrade',jackpot:'won',mythic:'won',wave:'start',boss:'warning',bosskill:'won',income:'pickup',upgrade:'upgrade',lost:'hurt',won:'won',choice:'upgrade'};
  for(const e of drainEvents(run)){
   if(sounds[e.kind])audio.play([sounds[e.kind]]);
   if(e.text){const el=game?.querySelector('.ll-toast');if(el){clearTimeout(toastTimer);el.textContent=e.text;el.dataset.kind=e.kind;el.hidden=false;toastTimer=setTimeout(()=>{if(el.isConnected)el.hidden=true;},e.kind==='mythic'?2200:1400);}}
  }
 }
 function recordResult(){
  if(resultSaved||!run||!['won','lost'].includes(run.status))return;
  const r=saved.records[mode]||{wave:0,wins:0,kills:0};r.wave=Math.max(r.wave,run.wave);r.wins+=run.status==='won'?1:0;r.kills=Math.max(r.kills,run.kills);saved.records[mode]=r;resultSaved=true;persist();
 }
 function syncOverlay(focus=true){
  recordResult();if(!game)return;
  // Boss choices and results take precedence over a strategy sheet.
  if(run&&['choice','won','lost'].includes(run.status))sheet='';
  game.querySelector('.ll-overlay-host').innerHTML=overlay();game.dataset.status=run?.status||'menu';
  const pauseBtn=game.querySelector('.ll-header [data-luck-action="pause"]');if(pauseBtn){pauseBtn.innerHTML=icon(run?.status==='paused'?'play':'pause');pauseBtn.setAttribute('aria-label',run?.status==='paused'?'계속하기':'일시정지');}
  if(focus&&game.querySelector('.ll-overlay'))queueMicrotask(()=>game?.querySelector('.ll-overlay button:not(:disabled)')?.focus({preventScroll:true}));
  lastStatus=run?.status||'';
 }
 function rebuild(){if(!game)return;game.dataset.mode=mode;game.innerHTML=content();attach();}
 function start(seed){mode=saved.mode;run=createLuckRun(mode,seed);selected=-1;selectedUid=0;sheet='';collectionResume=false;resultSaved=false;lastVersion=-1;rebuild();processEvents();}
 function cell(index){
  if(!run||run.status!=='running'||sheet)return;
  selectedUid=run.board[index]?.uid||0;selected=selectedUid?index:-1;
  updateBoard();refreshHud();
 }
 function visualState(){
  const board=game?.querySelector('.ll-board');if(!board||!run)return;
  for(const b of board.children){
   const u=run.board[Number(b.dataset.luckCell)];
   b.classList.toggle('is-merging',!!u&&(u.readyAt||0)>run.totalTime);
   b.classList.toggle('is-firing',!!u&&run.totalTime-(u.lastAttackAt??-1)<.13);
   b.classList.toggle('is-drag-source',!!drag?.moved&&drag.uid===u?.uid);
  }
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
   const btn=game.querySelector('[data-luck-action="sound"]');btn.innerHTML=icon(saved.sound?'volume-2':'volume-x');btn.setAttribute('aria-pressed',saved.sound);btn.setAttribute('aria-label','효과음 '+(saved.sound?'끄기':'켜기'));return true;
  }
  if(action==='start'||action==='restart'){start();return true;}
  if(action==='retry-seed'){start(run.seed);return true;}
  if(action==='menu'){run=null;sheet='';selected=-1;selectedUid=0;collectionResume=false;rebuild();return true;}
  if(action==='collection'){collectionResume=run?pause(run):false;sheet='collection';page=0;syncOverlay();refreshHud();return true;}
  if(action==='close'){
   const wasCollection=sheet==='collection';sheet='';
   if(wasCollection&&collectionResume&&run)resume(run);collectionResume=false;
   syncOverlay();refreshHud();game.querySelector('.ll-header [data-luck-action="'+(wasCollection?'collection':'pause')+'"]')?.focus({preventScroll:true});return true;
  }
  if(action==='page-prev'||action==='page-next'){page+=action==='page-next'?1:-1;page=Math.max(0,page);syncOverlay(false);return true;}
  if(!run)return true;
  if(action==='panel'){
   if(!PANELS[ds.luckId])return true;panel=ds.luckId;
   if(matchMedia('(max-width:760px)').matches){sheet=panel;syncOverlay();}else updatePanels();
   refreshHud();return true;
  }
  if(action==='pause'){if(sheet)return true;if(run.status==='running')pause(run);else if(run.status==='paused')resume(run);syncOverlay();refreshHud();return true;}
  if(action==='resume'){resume(run);syncOverlay();refreshHud();return true;}
  if(action==='speed'){speed=speed===1?2:1;b.textContent='×'+speed;return true;}
  if(action==='summon')summon(run);
  if(action==='lucky')summon(run,true);
  if(action==='multi')summonBatch(run);
  if(action==='power'||action==='luck')upgrade(run,action);
  if(action==='sell'){if(sell(run,selected)){selected=-1;selectedUid=0;}}
  if(action==='craft'){craft(run,ds.luckId);selected=-1;selectedUid=0;}
  if(action==='augment'){chooseAugment(run,ds.luckId);rebuild();}
  processEvents();refreshHud();return true;
 }
 function detach(){loop?.stop();observer?.disconnect();bindings?.abort();clearTimeout(toastTimer);drag=null;}
 function attach(){
  detach();if(!game)return;bindings=new AbortController();const opts={signal:bindings.signal};
  const autoPause=()=>{if(run&&pause(run)){collectionResume=false;syncOverlay(false);refreshHud();}};
  window.addEventListener('blur',autoPause,opts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();},opts);
  window.addEventListener('resize',()=>{if(sheet==='collection')syncOverlay(false);},opts);
  window.addEventListener('keydown',e=>{
   if(!active||e.repeat||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
   const modal=game.querySelector('.ll-overlay');
   if(e.key==='Tab'&&modal){
    const items=[...modal.querySelectorAll('button:not(:disabled),a[href]')],first=items[0],last=items.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;
   }
   if(e.code==='Escape'&&sheet){e.preventDefault();handleClick({dataset:{luckAction:'close'}});return;}
   if(modal&&(sheet||run?.status!=='paused'))return;
   const action={KeyQ:'summon',KeyE:'lucky',KeyW:'multi',Space:'pause',Escape:'pause'}[e.code];
   if(e.code==='Space'&&e.target.closest('button'))return;
   if(action&&run){e.preventDefault();handleClick({dataset:{luckAction:action}});}
  },opts);
  const canvas=game.querySelector('canvas');
  if(!canvas){syncOverlay(false);return;}
  renderer=createLuckRenderer(canvas,game.querySelector('.ll-effects'));
  const field=game.querySelector('.ll-field-wrap'),arena=game.querySelector('.ll-arena');
  const fit=()=>{
   const {width,height}=field.getBoundingClientRect();
   arena.style.width=Math.max(0,Math.min(width,height*600/560,600))+'px';
   renderer.resize();renderer.draw(run,selected,drag);
  };
  observer=new ResizeObserver(fit);observer.observe(field);fit();
  const board=game.querySelector('.ll-board');
  board.addEventListener('pointerdown',e=>{
   const el=e.target.closest('[data-luck-cell]');if(!el||run.status!=='running'||e.button!==0)return;
   const index=Number(el.dataset.luckCell);if(!run.board[index]||(run.board[index].readyAt||0)>run.totalTime)return;
   drag={id:e.pointerId,index,uid:run.board[index].uid,x:e.clientX,y:e.clientY,moved:false};
  },opts);
  board.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){drag.moved=true;if(!board.hasPointerCapture(e.pointerId))board.setPointerCapture(e.pointerId);board.classList.add('is-dragging');const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-luck-cell]');for(const b of board.children)b.classList.toggle('is-drop-target',b===target);const rect=arena.getBoundingClientRect();drag.point={x:(e.clientX-rect.left)/rect.width*600,y:(e.clientY-rect.top)/rect.height*560};}
  },opts);
  board.addEventListener('pointerup',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   if(drag.moved){
    const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-luck-cell]');
    if(el){const from=run.board.findIndex(x=>x?.uid===drag.uid);if(moveUnit(run,from,Number(el.dataset.luckCell)))selectedUid=drag.uid;processEvents();}
    suppressClick=true;setTimeout(()=>suppressClick=false,100);updateBoard();refreshHud();
   }
   board.classList.remove('is-dragging');for(const b of board.children)b.classList.remove('is-drop-target');
   if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);drag=null;
  },opts);
  board.addEventListener('pointercancel',()=>{drag=null;board.classList.remove('is-dragging');},opts);
  loop=GameLoop({context:canvas.getContext('2d'),clearCanvas:false,blur:true,update(dt){
   if(!active||!run||document.hidden)return;
   if(run.status==='running'){for(let i=0;i<speed;i++)tickLuck(run,dt);processEvents();}
   hudTime+=dt;if(hudTime>.1){hudTime=0;refreshHud();}
   if(lastStatus!==run.status){syncOverlay();refreshHud();}
  },render(){if(run&&active){visualState();renderer.draw(run,selected,drag);}}});
  lastVersion=-1;refreshHud();lastStatus=run.status;renderer.draw(run,selected,drag);loop.start();syncOverlay();
 }
 function mount(root,isActive){
  detach();active=isActive;document.body.classList.toggle('reroll-active',active);
  if(!active){if(run)pause(run);game=null;return;}
  game=root.querySelector('.ll-game');if(game)attach();
 }
 return{render,mount,handleClick};
}
