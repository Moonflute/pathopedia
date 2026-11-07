import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {FIXTURES,TILE,SOCIAL_SPOTS} from './cell-office-layout.mjs';
import {officePhase,cargoDestination} from './cell-office-life.mjs';
import {SAVE_KEY,CLOTHES,HAIR,SKIN,RESIDENTS,SITES,POINTS,createWorld,serializeWorld,tickWorld,findPath,nearestInteraction,interactionPoint,cargoName,interact,villageClock} from './cell-village-world.mjs';
import {createVillageRenderer,drawPerson} from './cell-village-renderer.mjs';

const button=(action,label,attrs='')=>`<button type="button" data-village-action="${action}" ${attrs}>${label}</button>`;
export function createCellVillage(){
  let saved=null,storageOK=true;
  try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{storageOK=false;}
  const world=createWorld(saved);
  let game,canvas,renderer,loop,abort,observer,active=false,mode='watch',paused=false,speed=1,night='auto',follow='',selected='',panel=false,draft={},toast='',toastEnd=0,saveTime=0,hudTime=0,pointer=null,pendingInteraction=null;
  const keys=new Set(),held=new Set();
  const save=()=>{try{localStorage.setItem(SAVE_KEY,serializeWorld(world));storageOK=true;}catch{storageOK=false;}};
  const notify=text=>{toast=text;toastEnd=performance.now()+4500;updateHUD();};
  function render(){return `<section class="vlg-game" aria-label="Cell City 몸속 회사" data-mode="${mode}">
    <header class="vlg-header"><div class="vlg-brand"><span class="vlg-emblem" aria-hidden="true">♥</span><div><h1>CELL CITY</h1><span>몸속 주식회사 · 1F</span></div></div><div class="vlg-clock"><span data-vlg-day>1일째</span><strong data-vlg-clock>06:00</strong></div><div class="vlg-time-controls">${button('light','☀','aria-label="시간대 자동, 누르면 낮 또는 밤으로 변경" title="시간대"')}${button('pause','Ⅱ','aria-label="업무 일시정지"')}${button('speed','1×','aria-label="재생 속도 변경"')}</div></header>
    <div class="vlg-stage"><canvas class="vlg-canvas" tabindex="0" aria-label="Cell City 사내. 구경할 때 드래그로 지도 이동. 산책할 때 WASD, 방향키 또는 바닥 클릭으로 이동. E로 인사와 작업."></canvas>
      <div class="vlg-corner"><span class="vlg-live-dot"></span><span data-vlg-mode>사내 구경 중</span><span class="vlg-corner-divider">/</span><span data-vlg-phase>아침 점검</span></div>
      <div class="vlg-life-controls">${button('event','','class="vlg-event" data-vlg-event hidden')}${button('delivery','','class="vlg-delivery" data-vlg-delivery hidden')}${button('my-desk','내 자리 ↗','class="vlg-my-desk" data-vlg-my-desk hidden')}</div>
      <div class="vlg-map-controls">${button('zoom-out','−','aria-label="건물 축소"')}${button('fit','⌖','aria-label="건물 전체 보기" title="건물 전체"')}${button('zoom-in','＋','aria-label="건물 확대"')}</div>
      <div class="vlg-pause-label" data-vlg-paused hidden>잠시 쉬는 중</div>
      <div class="vlg-follow" data-vlg-follow hidden><span></span>${button('unfollow','×','aria-label="직원 따라보기 종료"')}</div>
      <aside class="vlg-residents" aria-label="함께 일하는 직원" hidden><header><div><small>OUR LITTLE TEAM</small><h2>함께 일하는 직원 <span>8</span></h2></div>${button('residents','×','aria-label="직원 목록 닫기"')}</header><div class="vlg-resident-list">${RESIDENTS.map(r=>button('resident',`<canvas class="vlg-avatar" width="48" height="56" data-vlg-avatar="${r.id}" aria-hidden="true"></canvas><span><strong>${r.name}<small>${r.role}</small></strong><span data-vlg-activity="${r.id}">${r.work}</span></span><span class="vlg-follow-arrow" aria-hidden="true">↗</span>`,`class="vlg-resident" data-id="${r.id}" aria-label="${r.name}, ${r.role} 따라보기"`)).join('')}</div><p class="vlg-resident-note">직원을 누르면 따라가요.</p></aside>
      <div class="vlg-cargo-key" aria-label="운송 중인 물자"><span class="vlg-key-oxygen">산소 <b data-vlg-load="oxygen">0</b></span><span class="vlg-key-food">식량 <b data-vlg-load="food">0</b></span><span class="vlg-key-waste">회수 <b data-vlg-load="waste">0</b></span></div><div class="vlg-toast" role="status" data-vlg-toast hidden></div>
      <div class="vlg-walk-controls" data-vlg-walk hidden><div class="vlg-dpad" aria-label="이동 방향"><button type="button" data-vlg-dir="up" aria-label="위로 이동">▲</button><button type="button" data-vlg-dir="left" aria-label="왼쪽으로 이동">◀</button><span></span><button type="button" data-vlg-dir="right" aria-label="오른쪽으로 이동">▶</button><button type="button" data-vlg-dir="down" aria-label="아래로 이동">▼</button></div>${button('interact','인사하기','class="vlg-interact" data-vlg-interact disabled')}</div>
    </div>
    <footer class="vlg-footer"><div class="vlg-status"><span data-vlg-save>자동 저장</span><small data-vlg-help>천천히 흘러가는 하루</small></div><nav class="vlg-dock" aria-label="사내 메뉴">${button('walk','출근하기','class="vlg-primary"')}${button('residents','직원들','aria-expanded="false"')}${button('character','내 캐릭터')}</nav><span class="vlg-hint" data-vlg-hint>드래그로 둘러보기 · 휠로 확대</span></footer>
    <dialog class="vlg-character-dialog" aria-labelledby="vlg-character-title"><form class="vlg-character-form"><header><div><small>A LITTLE YOU</small><h2 id="vlg-character-title">나의 사원증</h2></div>${button('cancel-character','×','aria-label="캐릭터 만들기 닫기"')}</header><div class="vlg-character-preview"><canvas width="160" height="144" data-vlg-preview aria-label="캐릭터 미리보기"></canvas><span>오늘도 좋은 하루.</span></div><label class="vlg-name-label">이름<input name="village-name" maxlength="12" required autocomplete="off" placeholder="여행자" aria-label="캐릭터 이름"></label>${[['color','옷',CLOTHES],['hair','머리',HAIR],['skin','피부',SKIN]].map(([key,label,colors])=>`<div class="vlg-custom-row"><span>${label}</span><div class="vlg-swatches" role="group" aria-label="${label} 색상">${colors.map((color,i)=>button('swatch','',`class="vlg-swatch" style="--swatch:${color}" data-key="${key}" data-value="${key==='color'?color:i}" aria-label="${label} 색상 ${i+1}" aria-pressed="false"`)).join('')}</div></div>`).join('')}<button type="submit" class="vlg-enter">출근하기 <span aria-hidden="true">→</span></button></form></dialog>
  </section>`;}
  function updateHUD(){
    if(!active||!game)return;
    const clock=villageClock(world),q=s=>game.querySelector(s),action=s=>q(`[data-village-action="${s}"]`);
    q('[data-vlg-day]').textContent=`${clock.day}일째`;q('[data-vlg-clock]').textContent=clock.text;
    game.dataset.mode=mode;game.dataset.following=String(!!follow);q('[data-vlg-mode]').textContent=mode==='walk'?'사내 산책 중':'사내 구경 중';
    q('[data-vlg-phase]').textContent=officePhase(world.time).label;
    const event=world.life.event,eventButton=q('[data-vlg-event]');eventButton.hidden=!event;if(event)eventButton.textContent=`${event.label} ↗`;
    const carry=world.player?.carry,deliveryButton=q('[data-vlg-delivery]');deliveryButton.hidden=!carry||mode!=='walk';
    eventButton.disabled=paused||(mode==='walk'&&!!carry);deliveryButton.disabled=paused;
    if(carry)deliveryButton.textContent=`${cargoName(carry.kind)} → ${SITES.find(s=>s.id===carry.to).name}`;
    q('[data-vlg-my-desk]').hidden=!world.player||mode!=='walk'||!!carry;
    action('walk').textContent=mode==='walk'?'구경하기':'출근하기';
    action('pause').textContent=paused?'▶':'Ⅱ';action('pause').setAttribute('aria-label',paused?'업무 재생':'업무 일시정지');action('pause').setAttribute('aria-pressed',String(paused));
    action('speed').textContent=`${speed}×`;action('speed').setAttribute('aria-label',`재생 속도 ${speed}배, 눌러서 변경`);
    action('light').textContent=night==='night'?'☾':night==='day'?'☀':'◐';action('light').setAttribute('aria-label',`시간대 ${night==='auto'?'자동':night==='day'?'낮':'밤'}, 눌러서 변경`);
    q('[data-vlg-paused]').hidden=!paused;q('[data-vlg-walk]').hidden=mode!=='walk';
    q('.vlg-residents').hidden=!panel;game.querySelector('.vlg-dock [data-village-action="residents"]').setAttribute('aria-expanded',String(panel));
    const resident=world.residents.find(r=>r.id===follow),followEl=q('[data-vlg-follow]');followEl.hidden=!resident;if(resident)followEl.querySelector('span').textContent=`${resident.name} · ${resident.activity}`;
    q('[data-vlg-save]').textContent=storageOK?'자동 저장':'저장할 수 없음';q('[data-vlg-help]').textContent=`부서 작업 ${world.logistics.stats.work} · 내 배달 ${world.life.deliveries}`;
    const inTransit=[...world.logistics.parcels,...world.residents.map(r=>r.carry),world.player?.carry].filter(Boolean);
    for(const kind of ['oxygen','food','waste'])q(`[data-vlg-load="${kind}"]`).textContent=inTransit.filter(p=>kind==='waste'?['waste','sorted'].includes(p.kind):p.kind===kind).length;
    q('[data-vlg-hint]').textContent=mode==='walk'?'WASD / 방향키 · E 행동 · 클릭 이동':'드래그로 둘러보기 · 휠로 확대';
    const near=nearestInteraction(world),interactButton=q('[data-vlg-interact]');interactButton.disabled=!near||paused;interactButton.textContent=near?`${near.label}  E`:'가까이 다가가기';
    q('[data-vlg-toast]').hidden=!toast||performance.now()>toastEnd;q('[data-vlg-toast]').textContent=toast;
    for(const r of world.residents){q(`[data-vlg-activity="${r.id}"]`).textContent=r.activity;const b=q(`[data-id="${r.id}"]`);b.setAttribute('aria-pressed',String(r.id===follow));}
  }
  function drawPreview(){
    const preview=game.querySelector('[data-vlg-preview]'),c=preview.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,160,144);drawPerson(c,{...draft,direction:'down'},80,114,4);
    game.querySelectorAll('.vlg-swatch').forEach(b=>b.setAttribute('aria-pressed',String(String(draft[b.dataset.key])===b.dataset.value)));
  }
  function openCharacter(){
    draft=world.player?{...world.player}:{name:'',color:CLOTHES[1],hair:0,skin:0};keys.clear();held.clear();
    game.querySelector('[name="village-name"]').value=draft.name;drawPreview();game.querySelector('dialog').showModal();
  }
  function startWalking(){mode='walk';follow='';selected='';panel=false;paused=false;pendingInteraction=null;renderer.focus(world.player,true);canvas.focus({preventScroll:true});updateHUD();}
  function doInteraction(target=nearestInteraction(world)){if(paused||!target)return;notify(interact(world,target));save();}
  function approach(target){
    if(!world.player||paused)return;
    const point=interactionPoint(world,target);if(!point)return;
    world.player.pendingSpot=null;world.player.pose=null;world.player.seated=false;
    pendingInteraction=target;world.player.path=findPath(world.player,point);keys.clear();held.clear();
  }
  function handleClick(b){
    if(!active||!b?.hasAttribute('data-village-action'))return false;
    const action=b.dataset.villageAction;
    if(action==='walk'){if(mode==='walk'){mode='watch';keys.clear();held.clear();world.player.path=[];pendingInteraction=null;}else if(world.player)startWalking();else openCharacter();}
    if(action==='character')openCharacter();
    if(action==='cancel-character')game.querySelector('dialog').close();
    if(action==='swatch'){draft[b.dataset.key]=b.dataset.key==='color'?b.dataset.value:Number(b.dataset.value);drawPreview();}
    if(action==='pause'){paused=!paused;keys.clear();held.clear();}
    if(action==='speed')speed=speed===1?2:1;
    if(action==='light')night={auto:'day',day:'night',night:'auto'}[night];
    if(action==='residents'){panel=!panel;if(panel){keys.clear();held.clear();}}
    if(action==='resident'){follow=b.dataset.id;selected=follow;mode='watch';panel=false;keys.clear();held.clear();pendingInteraction=null;if(world.player)world.player.path=[];renderer.focus(world.residents.find(r=>r.id===follow),true);}
    if(action==='unfollow'){follow='';selected='';}
    if(action==='fit'){mode='watch';follow='';selected='';keys.clear();held.clear();pendingInteraction=null;if(world.player)world.player.path=[];renderer.fit();}
    if(action==='zoom-in')renderer.setZoom(1.25);
    if(action==='zoom-out')renderer.setZoom(.8);
    if(action==='interact')doInteraction();
    if(action==='delivery'&&world.player?.carry)approach({kind:'delivery',id:world.player.carry.to});
    if(action==='my-desk')approach({kind:'spot',id:'desk'});
    if(action==='event'&&world.life.event){
      const event=world.life.event;
      if(mode==='walk')approach(event.type==='spill'?{kind:'spill',id:'spill'}:{kind:'site',id:'gut'});
      else{follow='';selected='';renderer.focus(event.point,true);}
    }
    updateHUD();return true;
  }
  function mount(root,enabled){
    active=false;loop?.stop();abort?.abort();observer?.disconnect();renderer?.dispose();keys.clear();held.clear();pointer=null;save();
    if(!enabled)return;
    game=root.querySelector('.vlg-game');if(!game)return;active=true;canvas=game.querySelector('.vlg-canvas');abort=new AbortController();const opts={signal:abort.signal};
    renderer=createVillageRenderer(canvas);renderer.resize();renderer.overview();if(mode==='walk'&&world.player)renderer.focus(world.player,true);
    observer=new ResizeObserver(()=>{renderer.resize();if(mode==='watch'&&!follow)renderer.overview();});observer.observe(canvas);
    for(const r of RESIDENTS){const c=game.querySelector(`[data-vlg-avatar="${r.id}"]`).getContext('2d');c.imageSmoothingEnabled=false;drawPerson(c,{...r,direction:'down'},24,53,1.8);}
    game.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();const name=game.querySelector('[name="village-name"]').value.trim()||'여행자';
      world.player={...draft,name,...(world.player?{x:world.player.x,y:world.player.y}:POINTS.plaza),path:[],direction:'down',step:0,moving:false};
      game.querySelector('dialog').close();save();startWalking();
    },opts);
    game.querySelector('dialog').addEventListener('close',()=>{keys.clear();held.clear();canvas.focus({preventScroll:true});},opts);
    window.addEventListener('keydown',e=>{
      if(!active||game.querySelector('dialog').open||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
      const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
      if(movement.includes(e.code)&&mode==='walk'){e.preventDefault();keys.add(e.code);pendingInteraction=null;}
      if(e.repeat)return;
      if(e.code==='KeyE'&&mode==='walk'){e.preventDefault();doInteraction();}
      if(e.code==='Space'&&e.target===canvas){e.preventDefault();paused=!paused;updateHUD();}
      if(e.code==='Escape'){panel=false;follow='';selected='';keys.clear();held.clear();updateHUD();}
    },opts);
    window.addEventListener('keyup',e=>keys.delete(e.code),opts);
    window.addEventListener('blur',()=>{keys.clear();held.clear();pointer=null;save();},opts);
    document.addEventListener('visibilitychange',()=>{keys.clear();held.clear();pointer=null;if(document.hidden){loop?.stop();save();}else if(active)loop?.start();},opts);
    window.addEventListener('pagehide',save,opts);
    canvas.addEventListener('wheel',e=>{e.preventDefault();renderer.setZoom(e.deltaY<0?1.12:1/1.12);},{...opts,passive:false});
    canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,dragged:false};},opts);
    canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.dragged ||=Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>7;if(mode==='watch'&&pointer.dragged){follow='';selected='';renderer.pan(dx,dy);}pointer.x=e.clientX;pointer.y=e.clientY;},opts);
    canvas.addEventListener('pointerup',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;const wasDrag=pointer.dragged;pointer=null;if(wasDrag)return;
      const bounds=canvas.getBoundingClientRect(),point=renderer.toWorld(e.clientX-bounds.left,e.clientY-bounds.top);
      const resident=world.residents.find(r=>Math.hypot(point.x-r.x,point.y-(r.y-12))<17);
      if(mode==='watch'){if(resident){follow=resident.id;selected=resident.id;renderer.focus(resident,true);updateHUD();}return;}
      if(!world.player||paused)return;
      const fixture=FIXTURES.find(f=>point.x>=f.x*TILE&&point.x<(f.x+f.w)*TILE&&point.y>=f.y*TILE-10&&point.y<(f.y+f.h)*TILE);
      const site=SITES.find(s=>s.id===fixture?.room||Math.hypot(point.x-POINTS[s.id].x,point.y-POINTS[s.id].y)<18);
      const spot=SOCIAL_SPOTS.find(s=>s.id===fixture?.kind||(s.id==='bench'&&fixture?.kind==='sofa')||Math.hypot(point.x-s.x,point.y-s.y)<14);
      const delivery=world.player.carry&&Math.hypot(point.x-cargoDestination(world.player.carry).x,point.y-cargoDestination(world.player.carry).y)<22;
      const event=world.life.event,spill=event?.type==='spill'&&event.parcel&&Math.hypot(point.x-event.point.x,point.y-event.point.y)<16;
      const target=delivery?{kind:'delivery',id:world.player.carry.to}:resident?{kind:'resident',id:resident.id}:spill?{kind:'spill',id:'spill'}:spot?{kind:'spot',id:spot.id}:site?{kind:'site',id:site.id}:null;
      if(target)approach(target);else{pendingInteraction=null;world.player.pendingSpot=null;world.player.pose=null;world.player.seated=false;world.player.path=findPath(world.player,point);}
    },opts);
    canvas.addEventListener('pointercancel',()=>{pointer=null;},opts);
    for(const b of game.querySelectorAll('[data-vlg-dir]')){
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(b.dataset.vlgDir);pendingInteraction=null;},opts);
      for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>held.delete(b.dataset.vlgDir),opts);
    }
    loop=GameLoop({context:canvas.getContext('2d'),fps:30,clearCanvas:false,blur:true,
      update(dt){
        if(document.hidden)return;
        if(!paused&&!game.querySelector('dialog').open){
          const x=(keys.has('KeyD')||keys.has('ArrowRight')||held.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||held.has('left')?1:0),y=(keys.has('KeyS')||keys.has('ArrowDown')||held.has('down')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')||held.has('up')?1:0);
          tickWorld(world,dt*speed,{x:mode==='walk'?x:0,y:mode==='walk'?y:0,walk:mode==='walk'});
          if(pendingInteraction&&world.player){
            const target=interactionPoint(world,pendingInteraction);
            if(!target)pendingInteraction=null;
            else if(Math.hypot(target.x-world.player.x,target.y-world.player.y)<22){world.player.path=[];doInteraction(pendingInteraction);pendingInteraction=null;}
            else {const end=world.player.path.at(-1);if(!end||Math.hypot(end.x-target.x,end.y-target.y)>24)world.player.path=findPath(world.player,target);}
          }
        }
        hudTime+=dt;saveTime+=dt;if(hudTime>.25){hudTime=0;updateHUD();}if(saveTime>5){saveTime=0;save();}
      },render(){renderer.draw(world,{mode,follow,selected,night,paused});}
    });updateHUD();loop.start();
  }
  return {render,mount,handleClick};
}
