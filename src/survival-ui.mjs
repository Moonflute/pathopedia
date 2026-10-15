import { formatTime, RUN_DURATION, RULESET, UPGRADE_BY_ID, WEAPONS, PASSIVES, PHASES } from './survival-data.mjs';
import { chooseSurvivalUpgrade, createSurvivalRun, drainSurvivalSounds, pauseSurvival, resumeSurvival, setSurvivalPriority, setSurvivalViewport, startSurvival, survivalStats, tickSurvival } from './survival-engine.mjs';
import { upgradePreview, weaponLines } from './survival-loadout.mjs';
import { createSurvivalRenderer } from './survival-renderer.mjs';
import { createSurvivalAudio } from './survival-audio.mjs';
import { normalizeSurvivalRecord, saveSurvivalResult } from './survival-records.mjs';

const STORAGE_KEY='pathopedia.survival.v1';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,style='',extra='')=>'<button type="button" class="'+style+'" data-survival-action="'+action+'" '+extra+'>'+label+'</button>';
export function createSurvivalGame(){
  let run=createSurvivalRun(),game,canvas,renderer,observer,controller,frame=0,lastTime=0,accumulator=0,hudTime=0;
  let joystick=null,keys=new Set(),finishedSaved=false,storageAvailable=true,panel='build',lastCards=[],suspended=false;
  const audio=createSurvivalAudio();
  let record=normalizeSurvivalRecord(null);
  try{record=normalizeSurvivalRecord(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}catch{storageAvailable=false;}
  if(!record.audioOn)audio.setEnabled(false);
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(record));}catch{storageAvailable=false;}}
  function sound(kind){audio.play([kind]);}
  function equipment(){
    return '<div class="sv-loadout">'+WEAPONS.map(w=>{
      const level=run.upgrades[w.id],name=UPGRADE_BY_ID[run.branches[w.id]]?.name||w.name;
      return button('build','<span class="sv-slot-icon" style="--weapon:'+w.color+'">'+w.icon+'</span><span><small>'+w.short+'</small><b>'+name+'</b></span><em>'+(level?'Lv.'+level:'—')+'</em>','sv-slot '+(level?'equipped':''),'aria-label="'+name+' 장비 정보"');
    }).join('')+'</div><div class="sv-passives">'+PASSIVES.map(p=>button('build','<span style="color:'+p.color+'">'+p.icon+'</span><b>'+(run.upgrades[p.id]||'—')+'</b>','','title="'+p.name+' Lv.'+run.upgrades[p.id]+'" aria-label="'+p.name+' Lv.'+run.upgrades[p.id]+'"')).join('')+'</div>';
  }
  function statLines(lines){return '<dl class="sv-stat-lines">'+lines.map(([name,value])=>'<div><dt>'+esc(name)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>';}
  function buildMarkup(build=run){
    const stats=survivalStats(build);
    return '<div class="sv-build-grid">'+WEAPONS.filter(w=>build.upgrades[w.id]).map(w=>'<article><header><span style="color:'+w.color+'">'+w.icon+'</span><strong>'+w.name+'</strong><b>Lv.'+build.upgrades[w.id]+'</b></header>'+(build.branches[w.id]?'<p class="sv-branch-name">'+UPGRADE_BY_ID[build.branches[w.id]].name+'</p>':'')+statLines(weaponLines(build,w.id))+'</article>').join('')+'</div>'+
      '<div class="sv-passive-list">'+PASSIVES.filter(p=>build.upgrades[p.id]).map(p=>'<span>'+p.icon+' '+p.name+' <b>Lv.'+build.upgrades[p.id]+'</b><small>'+p.description+'</small></span>').join('')+'</div>'+
      statLines([['최대 체력',stats.maxHp],['이동 / 초',Math.round(stats.speed)],['흡입 반경',stats.magnet],['피해 배율','×'+stats.power.toFixed(1)],['공격 빈도','×'+stats.haste.toFixed(2)]]);
  }
  function recordSummary(){
    return '<div class="sv-record-grid">'+[['격리 성공',record.wins+'회'],['최단 완료',record.fastestWin===null?'—':formatTime(record.fastestWin)],['최고 처치',record.bestKills],['실패 시 생존',formatTime(record.bestFailure)]].map(([label,value])=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>').join('')+'</div>';
  }
  function recordsMarkup(){
    return recordSummary()+(record.history.length?'<div class="sv-history">'+record.history.map(item=>'<details><summary><b>'+(item.status==='won'?'격리 성공':'생존 종료')+'</b><span>'+formatTime(item.time)+' · '+item.kills+' 처치</span><small>#'+item.seed+'</small></summary>'+
      (item.ruleset===RULESET?button('seed','같은 시드 재도전','sv-secondary','data-survival-seed="'+item.seed+'"'):'<p>이전 규칙 기록</p>')+buildMarkup(item)+
      '<ol class="sv-choice-history">'+item.choices.map(c=>'<li><small>'+formatTime(c.time)+'</small> '+UPGRADE_BY_ID[c.id].icon+' '+UPGRADE_BY_ID[c.id].name+'</li>').join('')+'</ol></details>').join('')+'</div>':'<p class="sv-empty">아직 완료된 기록이 없습니다.</p>');
  }
  function observation(){
    const shapes={cocci:['◌','구형 군집'],bacilli:['▰','막대 형태'],spore:['◎','포자 형태'],virus:['✣','방사형 형태']};
    return '<div class="sv-observations">'+run.observed.map(id=>'<span><b>'+shapes[id][0]+'</b>'+shapes[id][1]+'</span>').join('')+'</div><p class="sv-footnote">게임 속 형태 모티브 · 종과 약제 감수성은 도감에서</p><a class="sv-catalog-link" href="#cards/pathogens">병원체 도감 ↗</a>';
  }
  function instructions(){return '<div class="sv-controls"><span><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> 이동</span><span><kbd>P</kbd> 정지</span><span><kbd>1 2 3</kbd> 강화</span><span>드래그 이동 · 보스 탭 우선 공격</span></div>';}
  function choiceCards(){
    if(run.status==='upgrade')lastCards=run.choices.map(id=>({id,level:run.upgrades[id],lines:upgradePreview(run,id)}));
    return '<div class="sv-choices">'+lastCards.map(({id,level,lines},index)=>{
      const u=UPGRADE_BY_ID[id],selected=run.selected===id,confirm=run.status==='confirm';
      return '<button type="button" class="sv-upgrade '+(confirm?(selected?'sv-selected':'sv-not-selected'):'')+'" data-survival-upgrade="'+id+'" style="--weapon:'+u.color+'" '+(confirm?'disabled':'')+'><span class="sv-upgrade-top"><span>'+(selected?'✓ 적용':u.kind)+'</span><kbd>'+(index+1)+'</kbd></span><span class="sv-upgrade-icon">'+u.icon+'</span><strong>'+u.name+'</strong><p>'+u.description+'</p>'+
        '<dl class="sv-upgrade-values">'+lines.map(row=>'<div><dt>'+row.label+'</dt><dd><span>'+row.before+'</span><i>→</i><b>'+row.after+'</b></dd></div>').join('')+'</dl>'+
        '<span class="sv-upgrade-level">'+(u.weapon?'분기 확정':u.max===Infinity?'즉시 적용':level?'Lv.'+level+' → Lv.'+(level+1):'NEW EQUIPMENT')+'<span>'+(selected?'✓':'↗')+'</span></span></button>';
    }).join('')+'</div>';
  }
  function overlay(){
    if(run.status==='running')return '';
    let body='',label='aria-labelledby="sv-dialog-title"';
    if(['upgrade','confirm'].includes(run.status)){body=choiceCards();label='aria-label="강화 선택"';}
    else if(run.status==='menu'){
      if(panel==='records')body='<div class="sv-panel"><h2 id="sv-dialog-title">출격 기록</h2>'+recordsMarkup()+button('menu','돌아가기','sv-secondary')+'</div>';
      else body='<div class="sv-intro"><div class="sv-intro-copy"><span class="sv-eyebrow">CONTAINMENT / SEED '+run.seed+'</span><h1 id="sv-dialog-title">survival<span>모으고, 진화하고, 살아남아라.</span></h1>'+
        button('start','생존 시작 <span>↗</span>','sv-primary')+'<div class="sv-run-label"><span>5분 생존</span><i>·</i><span>보스 제거</span><i>·</i><span>자동 공격</span></div>'+
        button('records','기록 · 같은 시드 재도전','sv-secondary')+'</div><div class="sv-mission"><div class="sv-mission-top"><span>CONTAINMENT</span><b>05:00</b></div>'+recordSummary()+'</div></div>'+instructions()+'<p class="sv-fiction">병원체 형태를 모티브로 한 가상 전투</p>';
    }else if(run.status==='paused'){
      body='<div class="sv-panel"><header class="sv-panel-heading"><h2 id="sv-dialog-title">일시정지</h2>'+button('resume','계속 생존하기 →','sv-primary')+'</header><nav class="sv-panel-tabs" aria-label="생존 정보">'+[['build','장비'],['records','기록'],['observe','형태']].map(([id,name])=>button(id,name,'', 'aria-pressed="'+(panel===id)+'"')).join('')+'</nav>'+
        (panel==='records'?recordsMarkup():panel==='observe'?observation():buildMarkup())+
        '<p class="sv-footnote">#'+run.seed+' · '+formatTime(run.time)+' · '+run.kills+' 처치</p>'+button('menu','출격 종료 · 처음으로','sv-secondary')+'</div>';
    }else{
      const won=run.status==='won';
      body='<div class="sv-result"><span class="sv-eyebrow">'+(won?'CONTAINMENT COMPLETE':'SIGNAL LOST')+'</span><h2 id="sv-dialog-title">'+(won?'격리 성공':'생존 종료')+'</h2><div class="sv-result-stats"><div><small>'+(won?'완료 시간':'생존 시간')+'</small><strong>'+formatTime(run.time)+'</strong></div><div><small>처치</small><strong>'+run.kills+'</strong></div><div><small>레벨</small><strong>'+run.level+'</strong></div></div>'+
        '<div class="sv-result-actions">'+button('restart','새 시드 출격 ↗','sv-primary')+button('seed','같은 시드 재도전','sv-secondary','data-survival-seed="'+run.seed+'"')+'</div>'+
        '<details class="sv-result-details"><summary>이번 빌드 · 강화 순서</summary>'+buildMarkup()+'<ol class="sv-choice-history">'+run.history.map(c=>'<li><small>'+formatTime(c.time)+'</small> '+UPGRADE_BY_ID[c.id].name+'</li>').join('')+'</ol></details>'+recordSummary()+button('menu','시작 화면','sv-secondary')+
        (!storageAvailable?'<p class="sv-record-note">기록은 이번 방문에만 유지됩니다.</p>':'')+'</div>';
    }
    return '<div class="sv-overlay sv-overlay--'+run.status+'"><section class="sv-dialog" role="dialog" '+label+'>'+body+'</section></div>';
  }
  function render(){
    return '<section class="sv-game" aria-label="survival 자동 공격 생존 게임"><header class="sv-hud"><div class="sv-brand"><span class="sv-brand-mark">✣</span><div><strong>survival</strong><small>ISOLATION FIELD</small></div></div><div class="sv-timer"><strong data-sv-time>'+formatTime(run.time)+'</strong><small data-sv-clock-label>/ 05:00</small></div><div class="sv-hud-right"><span class="sv-kills">처치 <b data-sv-kills>'+run.kills+'</b></span>'+
      button('sound',record.audioOn?'♫':'♩','sv-icon-button','aria-label="효과음" aria-pressed="'+record.audioOn+'"')+button('fullscreen','⛶','sv-icon-button sv-fullscreen','aria-label="게임 전체 화면"')+button('pause','Ⅱ','sv-icon-button','aria-label="일시정지"')+
      '</div></header><div class="sv-xp-track" role="progressbar" aria-label="다음 레벨 경험치" aria-valuemin="0" aria-valuemax="'+run.nextXp+'" aria-valuenow="'+run.xp+'"><i data-sv-xp></i></div><div class="sv-field"><canvas class="sv-canvas" tabindex="0" aria-label="WASD·방향키·드래그로 이동. 공격은 자동. 보스를 탭하면 우선 공격. P로 일시정지."></canvas><div class="sv-field-stats"><div class="sv-health"><span>✚</span><i><b data-sv-hp-bar></b></i><strong data-sv-hp>100 / 100</strong></div><span class="sv-level" data-sv-level>LV. 01</span></div><div class="sv-boss" hidden><span data-sv-boss-name>군집의 심장</span><i><b data-sv-boss-hp></b></i></div><div class="sv-banner" data-sv-banner role="status" hidden></div><span class="sv-phase" data-sv-phase>군집 유입</span><div class="sv-selection-status" role="status" aria-live="polite"></div><div class="sv-overlay-host">'+overlay()+'</div></div><footer class="sv-footer"><div class="sv-equipment-strip" data-sv-equipment>'+equipment()+'</div>'+button('build','장비','sv-build-button')+'</footer></section>';
  }
  function refreshHud(){
    if(!game)return;
    const stats=survivalStats(run),set=(selector,value)=>{const el=game.querySelector(selector);if(el&&el.textContent!==String(value))el.textContent=value;};
    set('[data-sv-time]',formatTime(run.time));set('[data-sv-clock-label]',run.time>=RUN_DURATION?'생존 ✓':'/ 05:00');set('[data-sv-kills]',run.kills);
    set('[data-sv-hp]',Math.ceil(run.player.hp)+' / '+stats.maxHp);set('[data-sv-level]','LV. '+String(run.level).padStart(2,'0'));set('[data-sv-phase]',PHASES[run.phase]);
    game.querySelector('[data-sv-hp-bar]').style.width=run.player.hp/stats.maxHp*100+'%';
    const xp=game.querySelector('.sv-xp-track');xp.setAttribute('aria-valuemax',run.nextXp);xp.setAttribute('aria-valuenow',Math.min(run.xp,run.nextXp));
    game.querySelector('[data-sv-xp]').style.width=Math.min(100,run.xp/run.nextXp*100)+'%';
    const boss=run.enemies.find(e=>run.priority?.id===e.id)||run.enemies.find(e=>e.elite),bossHud=game.querySelector('.sv-boss');
    bossHud.hidden=!boss;
    if(boss){set('[data-sv-boss-name]',boss.name+(run.priority?.id===boss.id?' · 표적':''));game.querySelector('[data-sv-boss-hp]').style.width=boss.hp/boss.maxHp*100+'%';}
    const banner=game.querySelector('[data-sv-banner]');
    const text=run.time>=RUN_DURATION&&!run.bossDefeated?'생존 조건 충족 · 보스 제거 필요':run.bannerUntil>run.time?run.banner:'';
    if(banner.textContent!==text)banner.textContent=text;
    banner.hidden=!text||run.status!=='running';
  }
  function saveResult(){
    if(finishedSaved||!['won','lost'].includes(run.status))return;
    finishedSaved=saveSurvivalResult(record,run);persist();sound(run.status==='won'?'won':'hurt');
  }
  function clearInput(){
    keys.clear();
    if(joystick&&canvas?.hasPointerCapture(joystick.id))canvas.releasePointerCapture(joystick.id);
    joystick=null;run.player.moving=false;
  }
  function sync(focus=true,resetInput=true){
    if(!game)return;
    if(resetInput)clearInput();
    saveResult();game.dataset.status=run.status;
    game.querySelector('.sv-overlay-host').innerHTML=overlay();
    game.querySelector('[data-sv-equipment]').innerHTML=equipment();
    for(const b of game.querySelectorAll('[data-survival-action="build"]'))b.disabled=!['running','paused'].includes(run.status);
    const pauseButton=game.querySelector('[data-survival-action="pause"]');
    pauseButton.disabled=!['running','paused'].includes(run.status);pauseButton.textContent=run.status==='paused'?'▷':'Ⅱ';
    pauseButton.setAttribute('aria-label',run.status==='paused'?'계속 생존하기':'일시정지');
    const soundButton=game.querySelector('[data-survival-action="sound"]');
    soundButton.textContent=record.audioOn?'♫':'♩';soundButton.setAttribute('aria-pressed',record.audioOn);
    soundButton.setAttribute('aria-label','효과음 '+(record.audioOn?'끄기':'켜기'));
    game.querySelector('.sv-selection-status').textContent=run.selected?UPGRADE_BY_ID[run.selected].name+' 적용 완료':'';
    refreshHud();renderer?.draw(run,null);
    if(focus&&run.status!=='confirm')queueMicrotask(()=>{if(game?.isConnected)(game.querySelector('.sv-overlay button:not(:disabled)')||canvas)?.focus({preventScroll:true});});
  }
  function choose(id){
    audio.unlock();if(!chooseSurvivalUpgrade(run,id))return;
    audio.play(drainSurvivalSounds(run));sync(false);
  }
  function pause(){clearInput();if(pauseSurvival(run)){panel='build';sync(false);}}
  function resetRun(seed){
    const view=run.view;run=createSurvivalRun(seed===undefined?{}:{seed});run.view=view;finishedSaved=false;panel='build';lastCards=[];
  }
  function handleClick(target){
    if(!game?.isConnected)return false;
    if(target.dataset.survivalUpgrade){choose(target.dataset.survivalUpgrade);return true;}
    const action=target.dataset.survivalAction;if(!action)return false;
    audio.unlock();
    if(action==='start'){startSurvival(run);sound('start');}
    else if(action==='restart'){resetRun();startSurvival(run);sound('start');}
    else if(action==='seed'){
      const seed=Number(target.dataset.survivalSeed);
      if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)return true;
      resetRun(seed);startSurvival(run);sound('start');
    }else if(action==='menu')resetRun();
    else if(action==='pause'){if(run.status==='paused')resumeSurvival(run);else{pauseSurvival(run);panel='build';}}
    else if(action==='resume')resumeSurvival(run);
    else if(['build','records','observe'].includes(action)){
      if(!['running','paused','menu'].includes(run.status))return true;
      if(run.status==='menu'&&action!=='records')return true;
      pauseSurvival(run);panel=action;
    }else if(action==='sound'){
      record.audioOn=!record.audioOn;audio.setEnabled(record.audioOn);persist();sync(false,false);return true;
    }else if(action==='fullscreen'){
      const request=document.fullscreenElement?document.exitFullscreen?.():game.requestFullscreen?.();
      if(request?.catch)void request.catch(()=>{});return true;
    }else return false;
    sync();return true;
  }
  function mount(root,active){
    cancelAnimationFrame(frame);frame=0;controller?.abort();observer?.disconnect();clearInput();
    game=null;canvas=null;renderer=null;
    if(!active){pauseSurvival(run);return;}
    game=root.querySelector('.sv-game');canvas=game?.querySelector('canvas');if(!canvas)return;
    controller=new AbortController();const options={signal:controller.signal};
    renderer=createSurvivalRenderer(canvas);
    const resize=()=>{if(!renderer)return;const size=renderer.resize();setSurvivalViewport(run,size.width,size.height);renderer.draw(run,joystick);};
    observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    if(!game.requestFullscreen)game.querySelector('.sv-fullscreen').hidden=true;
    suspended=document.hidden;
    window.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable||document.querySelector('dialog[open]'))return;
      if(event.code==='Tab'&&run.status!=='running'){
        const controls=[...game.querySelectorAll('.sv-overlay button:not(:disabled),.sv-overlay a,.sv-overlay summary')].filter(el=>el.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
      if(event.code==='Escape'||event.code==='KeyP'){
        if(!event.repeat&&['running','paused'].includes(run.status)){
          event.preventDefault();if(run.status==='running'){pauseSurvival(run);panel='build';}else resumeSurvival(run);sync();
        }return;
      }
      if(run.status==='upgrade'&&/^Digit[123]$/.test(event.code)){
        event.preventDefault();if(!event.repeat)choose(run.choices[Number(event.code.slice(-1))-1]);return;
      }
      if(['upgrade','confirm'].includes(run.status)&&event.repeat&&['Enter','Space'].includes(event.code)){event.preventDefault();return;}
      if(run.status==='running'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();keys.add(event.code);}
    },options);
    window.addEventListener('keyup',event=>keys.delete(event.code),options);
    window.addEventListener('blur',()=>{suspended=true;pause();},options);
    window.addEventListener('focus',()=>{suspended=false;lastTime=0;},options);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){suspended=true;pause();cancelAnimationFrame(frame);frame=0;lastTime=0;accumulator=0;}
      else{suspended=false;if(!frame)frame=requestAnimationFrame(animate);}
    },options);
    canvas.addEventListener('pointerdown',event=>{
      if(run.status!=='running'||event.button!==0||joystick)return;
      event.preventDefault();audio.unlock();canvas.focus({preventScroll:true});
      const box=canvas.getBoundingClientRect();
      joystick={id:event.pointerId,startX:event.clientX-box.left,startY:event.clientY-box.top,x:0,y:0,travel:0,born:performance.now()};
      canvas.setPointerCapture(event.pointerId);
    },options);
    canvas.addEventListener('pointermove',event=>{
      if(!joystick||event.pointerId!==joystick.id)return;
      const box=canvas.getBoundingClientRect(),x=event.clientX-box.left-joystick.startX,y=event.clientY-box.top-joystick.startY,length=Math.hypot(x,y);
      joystick.travel=Math.max(joystick.travel,length);joystick.x=length>4?x/Math.max(40,length):0;joystick.y=length>4?y/Math.max(40,length):0;
    },options);
    canvas.addEventListener('pointerup',event=>{
      if(!joystick||event.pointerId!==joystick.id)return;
      if(joystick.travel<10&&performance.now()-joystick.born<450){
        const point=renderer.worldPoint(joystick.startX,joystick.startY);
        const target=run.enemies.filter(e=>e.elite&&!e.dead&&Math.hypot(e.x-point.x,e.y-point.y)<e.radius+25).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
        if(target){setSurvivalPriority(run,target.id);refreshHud();}
      }
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
      joystick=null;
    },options);
    for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(joystick?.id===event.pointerId)joystick=null;},options);
    canvas.addEventListener('contextmenu',event=>event.preventDefault(),options);
    lastTime=0;accumulator=0;hudTime=0;sync(false);
    function animate(now){
      frame=0;if(!game?.isConnected||document.hidden)return;
      const dt=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;
      if(!suspended&&['running','confirm'].includes(run.status)){
        accumulator+=dt;
        const input=joystick||{x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),y:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))};
        while(accumulator>=1/60&&['running','confirm'].includes(run.status)){
          accumulator-=1/60;
          if(tickSurvival(run,input,1/60)){sync();accumulator=0;break;}
        }
        audio.play(drainSurvivalSounds(run));hudTime+=dt;
        if(hudTime>=.12){refreshHud();hudTime=0;}
      }else accumulator=0;
      if(['running','menu','confirm'].includes(run.status))renderer.draw(run,joystick,now/1000);
      frame=requestAnimationFrame(animate);
    }
    frame=requestAnimationFrame(animate);
  }
  return{render,mount,handleClick};
}