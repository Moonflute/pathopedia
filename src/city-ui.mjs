import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {icon} from './luck-icons.mjs';
import {DISTRICTS,CELL_JOBS as JOBS,cityJobs,cellCap,DRUGS,WAVES,POLICIES,SCENARIOS,districtDef} from './city-data.mjs';
import {createCity,upgradeVillage,tickCity,command,cityHealth,cityOxygen,upgradeCost,counts,output,drugActivity,serializeCity,restoreCity,objectiveState} from './city-engine.mjs';
import {frontierPanel} from './city-frontier-ui.mjs';
import {frontierAlerts} from './city-frontier.mjs';
import {FRONTS,WALLS} from './city-frontier-data.mjs';
import {biologyPanel,biologyReadout,createBiologyControls} from './city-biology-ui.mjs';
import {pathogenDef,STAGES} from './city-biology.mjs';
import {SITES} from './city-three-layout.mjs';
import {createCityRenderer} from './city-renderer.mjs';

const KEY='pathopedia:cell-city:v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,extra='')=>`<button type="button" data-city-action="${action}" ${extra}>${label}</button>`;
const time=n=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
const card=(kind,id,label)=>id?`<button type="button" class="cc-card-link" data-card-open="${kind}:${id}" aria-label="${esc(label)} 도감 열기">↗</button>`:'';
export function createCityGame(data,options={}){
  const is3d=options.mode==='3d',saveKey=options.saveKey||KEY;
  const newCity=(host,scenario)=>createCity(host,scenario,{workCrews:is3d,specialists:is3d});
  let run,storageFailed=false,restored=false;
  try{const raw=localStorage.getItem(saveKey);run=restoreCity(raw);restored=!!run;storageFailed=!!raw&&!run;}catch{storageFailed=true;}
  run ||= newCity('normal','steady');if(is3d)upgradeVillage(run);
  let atStart=true,started=restored,choice=SCENARIOS[run.scenario]?run.scenario:'steady',selectedKind='',workersPage=0;
  let front='skin',wall=11,frontPage='fronts';
  const biology=createBiologyControls();
  let speed=0,selected='lung',layer='city',panel='',cityPage='log',logPage=0,active=false,game=null,loop=null,renderer=null,abort=null,hud=0,saveClock=0,toast='',toastUntil=0,resetArmed=false;
  const markupCache=new WeakMap();
  const sheetLayout=matchMedia('(max-width:619px), (max-width:760px) and (min-height:621px)');
  const save=()=>{if(!started)return;try{localStorage.setItem(saveKey,serializeCity(run));storageFailed=false;}catch{storageFailed=true;}};
  function render(){
    return `<section class="cc-game${is3d?' cc-three':''}" aria-label="세포도시 경영 게임" data-panel="${panel}">
      <header class="cc-header"><div class="cc-title"><span class="cc-mark" aria-hidden="true">✣</span><h1>CELL CITY <small>${is3d?'3D VILLAGE':'세포도시'}</small></h1><a class="cc-view-switch" href="#${is3d?'city':'city3d'}">${is3d?'2D ↗':'3D 시범 ↗'}</a></div>
      <div class="cc-time-controls"><span data-city-time>${time(run.time)}</span>${button('menu','시나리오','class="cc-menu-button"')}${button('speed',icon('pause'),'data-city-id="0" aria-label="일시정지"')}${[1,2,3].map(n=>button('speed',n+'×',`data-city-id="${n}" aria-label="${n}배속"`)).join('')}</div></header>
      <div class="cc-stage"><div class="cc-map"><canvas id="city-canvas" tabindex="0" aria-label="세포도시 조감도. 드래그로 이동, 휠 또는 두 손가락으로 확대·축소. 구역을 누르면 관리합니다. 방향키로 이동, 더하기·빼기로 확대·축소, Home으로 전체 보기.${is3d?' 오른쪽 드래그 또는 Q·E로 회전.':''}"></canvas>
          <div class="cc-scenario"><div><strong data-city-objective></strong><span data-city-objective-detail></span><progress data-city-objective-progress max="1" value="0"></progress></div>${button('wave','감염 유입 →','class="cc-wave"')}</div>
          <div class="cc-map-label"><span>${is3d?'THE LIVING CITY / 3D VILLAGE':'THE LIVING CITY / AERIAL VIEW'}</span><strong data-city-weather>평온한 환경</strong></div>
      ${is3d?button('front-alert','','class="cc-front-warning" data-city-warning hidden'):''}<div class="cc-resources" aria-label="도시 자원">
        ${[['health','♥','건강'],['oxygen','O₂','산소'],['food','◈','영양분'],['materials','▥','건축 자재'],['waste','≋','노폐물']].map(([id,glyph,label])=>`<div class="cc-resource cc-resource--${id}"><span>${glyph}</span><div><small>${label}</small><strong data-city-value="${id}">—</strong></div><i data-city-meter="${id}"></i></div>`).join('')}
      </div>
          <div class="cc-map-tools">${button('layer','산소·물류','aria-pressed="false"')}${button('zoom','−','data-city-id="-1" aria-label="도시 축소"')}<output data-city-zoom aria-label="도시 배율">72%</output>${button('zoom','+','data-city-id="1" aria-label="도시 확대"')}${button('fit','전체','aria-label="도시 전체 보기"')}${is3d?button('rotate','↶','data-city-id="-1" aria-label="도시 왼쪽 회전"')+button('rotate','↷','data-city-id="1" aria-label="도시 오른쪽 회전"'):''}</div>
          <div class="cc-pause" data-city-paused hidden>${icon('pause')}<span>일시정지</span></div>
          <div class="cc-result" data-city-result hidden></div>
          <div class="cc-toast" role="status" data-city-toast hidden></div>
          <div class="cc-unit-selection" data-city-unit-selection hidden></div><div class="cc-map-caption"><span>● 적혈구　◈ 물자　✦ 면역세포</span><span>${is3d?'이동: 드래그 · 줌: 휠/두 손가락 · 회전: 우클릭/Q·E':'드래그 · 휠 / 두 손가락'}</span></div>
        </div><aside class="cc-sidebar" id="city-management" aria-label="도시 관리" ${panel?'':'hidden'}>
          <header class="cc-panel-heading"><div><span>MANAGEMENT</span><h2 data-city-panel-title>구역 관리</h2></div>${button('close',icon('x'),'aria-label="관리 패널 닫기"')}</header>
          <section class="cc-panel" data-city-panel="district"><nav class="cc-districts" aria-label="장기 구역 선택">${DISTRICTS.map(d=>button('select',`<span style="--organ:${d.color}">${d.symbol}</span><strong>${d.short}</strong>`,`data-city-id="${d.id}" aria-pressed="${d.id===selected}"`)).join('')}</nav><div class="cc-detail" data-city-detail></div></section>
          <section class="cc-panel" data-city-panel="workers" hidden><div class="cc-section-label">세포 인력 <span data-city-population></span></div><div class="cc-workers" data-city-workers></div><div class="cc-policy" role="group" aria-label="도시 운영 방침">${Object.entries(POLICIES).map(([id,name])=>button('policy',name,`data-city-id="${id}" aria-pressed="${id===run.policy}"`)).join('')}</div></section>
          <section class="cc-panel cc-armory" data-city-panel="armory" hidden><div class="cc-section-label">항생제 장비 <span data-city-rally></span></div><div class="cc-drugs">${DRUGS.map(d=>button('drug',`<span style="color:${d.color}">●</span> ${d.short}`,`data-city-id="${d.id}" title="${d.name} · 영양 ${d.cost} → 18 보급" aria-label="${d.name} 장비 선택" aria-pressed="${d.id===run.drug}"`)).join('')}</div><div data-city-ammo></div><div class="cc-ast" data-city-ast></div><div class="cc-antibody" data-city-antibody></div></section>
          ${is3d?'<section class="cc-panel cc-frontier" data-city-panel="frontier" hidden><div data-city-frontier></div></section>':''}<section class="cc-panel cc-journal" data-city-panel="city" hidden><div class="cc-policy cc-pages" aria-label="도시 운영 메뉴">${button('city-page','도시 기록','data-city-id="log"')}${button('city-page','환경·설정','data-city-id="settings"')}</div><div data-city-page="log"><ol data-city-log></ol><div class="cc-pagination">${button('log-page','←','data-city-id="-1" aria-label="이전 기록 페이지"')}<span data-city-log-page></span>${button('log-page','→','data-city-id="1" aria-label="다음 기록 페이지"')}</div></div><div class="cc-settings" data-city-page="settings" hidden><div>${button('lifecycle','게임 수명 OFF','aria-pressed="false"')}${button('weather','건조 환경 35초')}</div><div>${button('menu','시나리오 선택')}${button('reset','새 도시','class="cc-reset"')}</div><small>수명 ON · 종료된 세포는 골수에서 자동 보충</small><small>생리·전투 수치는 게임용. 장비 감수성은 고정 분리주 기록.</small><small>${is3d?'Three.js · MIT / Kenney · CC0':'Kontra.js · MIT / Lucide · ISC'}</small>${is3d?'<small data-city-performance></small>':''}</div></section>
        </aside></div>
      <footer class="cc-command-bar"><div class="cc-status"><i></i><span data-city-save>자동 저장</span><small data-city-last-log></small></div><nav class="cc-dock" aria-label="도시 관리 메뉴">${[['district','▦','구역'],['workers','✦','세포'],...(is3d?[['frontier','⬡','방어']]:[]),['armory','⚑',is3d?'치료':'장비'],['city','☷','운영']].map(([id,glyph,name])=>button('panel',`<span>${glyph}</span><strong>${name}</strong>`,`data-city-id="${id}" aria-label="${name} 관리" aria-controls="city-management" aria-expanded="${panel===id}"`)).join('')}</nav><span class="cc-view-label">${is3d?'LIVING CITY <b>3D VILLAGE</b>':'BODY DISTRICT 01 <b>2.5D</b>'}</span></footer>${startScreen()}</section>`;
  }
  function startScreen(){return `<section class="cc-start" aria-label="시나리오 선택">
    <div class="cc-start-heading"><span>CELL CITY / ${is3d?'3D VILLAGE':'PROTOTYPE'}</span><h2>${is3d?'작은 세포들의 마을':'작은 세포, 하나의 도시'}</h2><p>${is3d?'여섯 구역 · 여덟 종류의 세포':'오늘의 도시를 선택하세요'}</p></div>
    <div class="cc-scenario-cards">${Object.entries(SCENARIOS).filter(([,p])=>!p.only3d||is3d).map(([id,p])=>button('scenario',`<span class="cc-scenario-art cc-scenario-art--${p.terrain}"><b>${p.symbol}</b><i></i></span><span class="cc-scenario-copy"><small>${p.tag}</small><strong>${p.name}</strong><span>${p.goal}</span><em>${p.detail}</em></span>`,`data-city-id="${id}" aria-pressed="${choice===id}"`)).join('')}</div>
    <div class="cc-start-actions">${button('resume','이어하기',`${started?'':'hidden'}`)}${button('start',is3d?'마을 들어가기':'선택한 도시 시작','class="cc-start-primary"')}</div>
  </section>`;}
  function region(selector,html){
    const el=game?.querySelector(selector);if(!el||markupCache.get(el)===html)return;
    const focus=document.activeElement,restore=el.contains(focus)&&focus?.dataset.cityAction?{action:focus.dataset.cityAction,id:focus.dataset.cityId}:null;
    el.innerHTML=html;markupCache.set(el,html);
    if(restore)el.querySelector(`[data-city-action="${restore.action}"]${restore.id?`[data-city-id="${restore.id}"]`:''}`)?.focus({preventScroll:true});
  }
  function detail(){
    const def=districtDef(selected),d=run.districts[selected],cost=upgradeCost(run,selected),b=d.building;
    const status=b?(b.remaining==null?'자재 배송 중':run.workCrews&&!run.cells.some(c=>c.buildSite===selected&&c.task==='시설 건설')?'작업자 이동 중':`작업 중 · ${Math.ceil(b.remaining)}초`):d.oxygen<20?'산소 공급 부족':d.food<1?'영양 배송 대기':d.supportUntil>run.time?'방어 지원 활성':'정상 가동';
    return `<div class="cc-overview"><div class="cc-detail-head"><div class="cc-organ-icon" style="--organ:${def.color}">${def.symbol}</div><div><span>DISTRICT ${String(DISTRICTS.indexOf(def)+1).padStart(2,'0')} · Lv.${d.level}</span><h2>${def.name}</h2></div>${card('immune-element',def.card,def.short)}</div><p>${def.job}</p>
      <div class="cc-state"><strong>${status}${run.biology&&run.biology.sites[selected].stage!=='clear'?' · '+STAGES[run.biology.sites[selected].stage]:''}</strong><span>Lv.${d.level} · 가동 ${Math.round(output(run,selected)*100)}%</span></div>
      <div class="cc-local-stats"><div><span>건강</span><b>${Math.round(d.hp)}%</b></div><div><span>산소</span><b>${Math.round(d.oxygen)}%</b></div><div><span>영양 재고</span><b>${Math.floor(d.food)}</b></div></div>
      ${selected==='lung'?`<div class="cc-barrier"><span>호흡기 장벽</span><meter value="${run.barrier}" max="100">${Math.round(run.barrier)}%</meter><b>${Math.round(run.barrier)}%</b></div>`:''}
      </div><div class="cc-construction">${button('upgrade',`<span>${def.upgrade} ${d.level>=4?'완성':'확장'}</span><b>${d.level>=4?'MAX':'▥ '+cost}</b>`,`data-city-id="${selected}" class="cc-primary" title="${def.effect}" ${b||d.level>=4||run.resources.materials<cost?'disabled':''}`)}
      <div class="cc-upgrade-hint">${def.effect}</div><div class="cc-build-actions">${button('tower',`초소 ${d.tower}/2 <b>▥ ${30+d.tower*20}</b>`,`data-city-id="${selected}" ${b||d.tower>=2||run.resources.materials<30+d.tower*20?'disabled':''}`)}${button('repair','복구 <b>▥ 16</b>',`data-city-id="${selected}" ${b||run.resources.materials<16||d.hp>=99&&(selected!=='lung'||run.barrier>=99)?'disabled':''}`)}</div>
      ${button('rally',run.rally===selected?'⚑ 방어 집결 구역':'⚑ 이 구역에 집결',`data-city-id="${selected}" class="cc-rally" aria-pressed="${run.rally===selected}"`)}${selected==='marrow'?button('panel','세포 생산 · 대기 '+run.recruits.length+'/3','data-city-id="workers" class="cc-production"'):''}</div>`;
  }
  function workers(){const jobs=Object.entries(cityJobs(run)),pages=is3d?Math.ceil(jobs.length/4):1;workersPage=Math.min(workersPage,pages-1);return (is3d?jobs.slice(workersPage*4,workersPage*4+4):jobs).map(([id,job])=>{
    const n=counts(run,id),queued=run.recruits.filter(r=>r.kind===id),status=queued.length?`충원 ${queued.length} · ${queued[0].remaining==null?'배송 중':Math.ceil(queued[0].remaining)+'초'}`:run.lifecycle?`게임 수명 ${job.life/60}분 · 교체 ${run.turnover[id]||0}`:job.task;
    return `<div class="cc-worker">${button('inspect-kind',job.glyph||(id==='rbc'?'●':id==='dendritic'?'✳':'✦'),`class="cc-worker-icon" style="--cell:${job.color}" data-city-id="${id}" aria-label="${job.name} 위치 표시" aria-pressed="${selectedKind===id}"`)}<div><strong>${job.name} <b>${n}</b></strong><small>${status}</small></div>${card('immune-element',job.card,job.name)}${button('recruit','+ '+job.cost,`data-city-id="${id}" aria-label="${job.name} 충원 영양 ${job.cost}" ${run.resources.food<job.cost||run.recruits.length>=3||n+queued.length>=cellCap(run,id)||is3d&&run.cells.length+run.recruits.length>=96?'disabled':''}`)}</div>`;
  }).join('')+(pages>1?`<div class="cc-worker-pages">${button('workers-page','←',`data-city-id="-1" aria-label="이전 세포 종류" ${workersPage===0?'disabled':''}`)}<span>${workersPage+1} / ${pages}</span>${button('workers-page','→',`data-city-id="1" aria-label="다음 세포 종류" ${workersPage===pages-1?'disabled':''}`)}</div>`:'');}
  function updateCamera(camera=renderer?.cameraInfo()){
    if(!game||!camera)return;
    const label=game.querySelector('[data-city-zoom]'),value=Math.round(camera.scale*100)+'%';
    if(label.textContent!==value)label.textContent=value;
    for(const b of game.querySelectorAll('[data-city-action="zoom"]'))b.disabled=Number(b.dataset.cityId)>0?camera.scale>=camera.max:camera.scale<=camera.min;
  }
  function update(){
    if(!game)return;
    game.dataset.panel=panel;game.dataset.start=String(atStart);
    game.querySelector('.cc-start').hidden=!atStart;
    for(const el of game.children)if(!el.classList.contains('cc-start'))el.inert=atStart;
    game.querySelector('[data-city-action="resume"]').hidden=!started;
    for(const el of game.querySelectorAll('[data-city-action="scenario"]'))el.setAttribute('aria-pressed',String(el.dataset.cityId===choice));
    const lifeButton=game.querySelector('[data-city-action="lifecycle"]');lifeButton.textContent='게임 수명 '+(run.lifecycle?'ON':'OFF');lifeButton.setAttribute('aria-pressed',String(run.lifecycle));
    game.querySelector('.cc-sidebar').hidden=!panel;
    for(const el of game.querySelectorAll('[data-city-panel]'))el.hidden=el.dataset.cityPanel!==panel;
    for(const el of game.querySelectorAll('[data-city-page]'))el.hidden=el.dataset.cityPage!==cityPage;
    for(const el of game.querySelectorAll('[data-city-action="panel"]'))el.setAttribute('aria-expanded',String(el.dataset.cityId===panel));
    for(const el of game.querySelectorAll('[data-city-action="city-page"]'))el.setAttribute('aria-pressed',String(el.dataset.cityId===cityPage));
    const set=(sel,value)=>{const e=game.querySelector(sel);if(e&&e.textContent!==String(value))e.textContent=value;};
    set('[data-city-panel-title]',{district:'구역 관리',workers:'세포',armory:is3d?(run.scenario==='simulation'?'면역·감염 실험':'치료·감염 대응'):'방어 장비',city:'도시 운영',frontier:'장벽·전선'}[panel]||'도시 관리');
    const stats={health:cityHealth(run),oxygen:cityOxygen(run),food:run.resources.food,materials:run.resources.materials,waste:run.waste};
    for(const [id,n]of Object.entries(stats)){set(`[data-city-value="${id}"]`,Math.floor(n)+(['health','oxygen','waste'].includes(id)?'%':''));game.querySelector(`[data-city-meter="${id}"]`)?.style.setProperty('--fill',Math.min(100,n)+'%');}
    set('[data-city-time]',time(run.time));set('[data-city-population]',run.cells.length+'명');set('[data-city-rally]',districtDef(run.rally).short+' 보급');
    updateCamera();
    const threat=run.enemies.length+run.spawn.length,objective=objectiveState(run);
    set('[data-city-objective]',run.endless?'자유 운영':objective.title);
    set('[data-city-objective-detail]',(run.endless?'도시 관찰':objective.detail)+(threat?' · 감염 '+threat:''));
    game.querySelector('[data-city-objective-progress]').value=objective.progress;
    const selection=game.querySelector('[data-city-unit-selection]');selection.hidden=!selectedKind;
    if(selectedKind)selection.textContent=JOBS[selectedKind].name+' '+counts(run,selectedKind)+' · 위치 표시';
    set('[data-city-phase]',run.status==='won'?'세 차례 감염 방어 완료':run.status==='lost'?'도시 기능 정지':run.endless?'자유 운영':threat?`${run.wave}/3차 감염 대응`:`${run.wave}/3 방어 · 도시 운영`);
    set('[data-city-threat]',threat?`병원체 ${threat}`:run.wave<3?`다음 유입 ${Math.max(0,Math.ceil(run.nextWave-run.time))}초`: '회복과 정비');
    set('[data-city-weather]',run.inflammation>65?'염증 폭풍':run.weather.id==='dry'?`건조한 공기 · ${Math.ceil(run.weather.until-run.time)}초`:run.weather.id==='fever'?`발열 · ${Math.ceil(run.weather.until-run.time)}초`:run.host==='neutropenia'?'호중구 감소 숙주':'평온한 환경');
    set('[data-city-save]',storageFailed?'저장 불가':restored&&speed===0?'저장한 도시 · 재개 가능':'자동 저장');
    set('[data-city-last-log]',run.log[0]?.text||'');
    for(const b of game.querySelectorAll('[data-city-action="speed"]'))b.setAttribute('aria-pressed',String(Number(b.dataset.cityId)===speed));
    for(const b of game.querySelectorAll('[data-city-action="select"]'))b.setAttribute('aria-pressed',String(b.dataset.cityId===selected));
    for(const a of ['policy','drug'])for(const b of game.querySelectorAll(`[data-city-action="${a}"]`))b.setAttribute('aria-pressed',String(b.dataset.cityId===run[a]));
    for(const d of DISTRICTS)set(`[data-city-level="${d.id}"]`,'Lv.'+run.districts[d.id].level);
    game.querySelector('[data-city-action="wave"]').disabled=run.scenario==='simulation'?false:!!threat||run.status!=='running';
    set('[data-city-action="wave"]',run.scenario==='simulation'?'실험 조작 →':'감염 유입 →');
    game.querySelector('[data-city-paused]').hidden=speed!==0||run.status!=='running';
    game.querySelector('[data-city-action="layer"]').setAttribute('aria-pressed',String(layer==='supply'));
    if(is3d){const alerts=frontierAlerts(run),warning=game.querySelector('[data-city-warning]');warning.hidden=!alerts.length;warning.dataset.cityId='0';warning.textContent=alerts[0]?.text+' ↗';if(panel==='frontier')region('[data-city-frontier]',frontierPanel(run,front,wall,frontPage,selected));}
    if(panel==='district')region('[data-city-detail]',detail());
    if(panel==='workers')region('[data-city-workers]',workers());
    if(panel==='armory'){
    if(is3d){
      if(run.scenario!=='simulation'&&biology.page==='exposure')biology.page='medicine';
      region('[data-city-biology]',biologyPanel(run,data,biology));region('[data-city-biology-readout]',biologyReadout(run,data,biology));
    }else{
    const ammo=run.districts[run.rally].ammo[run.drug],shipping=run.shipments.some(x=>x.kind==='drug'&&x.to===run.rally&&x.drugId===run.drug),drug=DRUGS.find(d=>d.id===run.drug);
    region('[data-city-ammo]',`<div class="cc-ammo"><strong>${drug.name}</strong>${card('drug',drug.id,drug.name)}<span>${Math.floor(ammo)} 보급${shipping?' · 배송 중':''}</span></div>`);
    region('[data-city-ast]',WAVES.map(w=>{const a=drugActivity(data,w.recordId,run.drug);return `<div><span>${w.tag} · ${w.name.replace('황색포도알균 · ','')}</span>${card('pathogen',w.recordId,w.name)}<b class="${a.active?'cc-effective':''}">${esc(a.category)}</b></div>`;}).join('')+'<small>고정 분리주 · S 장비 작동 / R 장비 비활성</small>');
    const known=Object.entries(run.antibodies);
    region('[data-city-antibody]',known.length?known.map(([id,value])=>`<div><span>Y ${WAVES.find(w=>w.recordId===id)?.tag||''} 항체</span><progress max="100" value="${value}"></progress><b>${Math.round(value)}%</b></div>`).join(''):'<span>Y 항원 전달 대기</span>');
    }
    }
    const pages=Math.max(1,Math.ceil(run.log.length/3));logPage=Math.min(logPage,pages-1);
    if(panel==='city')region('[data-city-log]',run.log.slice(logPage*3,logPage*3+3).map(l=>`<li><time>${time(l.time)}</time><span>${esc(l.text)}</span></li>`).join(''));
    set('[data-city-log-page]',`${logPage+1} / ${pages}`);
    for(const el of game.querySelectorAll('[data-city-action="log-page"]'))el.disabled=Number(el.dataset.cityId)<0?logPage===0:logPage===pages-1;
    const overlay=game.querySelector('[data-city-result]');overlay.hidden=run.status==='running';
    if(run.status!=='running')region('[data-city-result]',`<div><span>${run.status==='won'?'CITY PROTECTED':'CITY OFFLINE'}</span><h2>${run.status==='won'?(SCENARIOS[run.scenario]?.kind==='restore'?'도시 복구 완료':'도시 유지 성공'):(run.endReason||'도시가 멈췄다')}</h2><p>방어 ${run.stats.defeated} · 배송 ${run.stats.deliveries} · ${time(run.time)}</p>${run.status==='won'?button('continue','계속 운영하기'):button('restart','다시 시작하기')}</div>`);
    const notification=game.querySelector('[data-city-toast]');notification.hidden=!toast||performance.now()>toastUntil;if(!notification.hidden)notification.textContent=toast;
  }
  function paint(){renderer?.draw(run,{selected,layer,paused:atStart||speed===0||run.status!=='running',selectedKind,selectedWall:panel==='frontier'&&front==='skin'?wall:null,inset:panel&&sheetLayout.matches?308:0});}
  function select(id){if(id==='observe'){panel='';update();return;}if(is3d&&(id.startsWith('front:')||id.startsWith('wall:'))){if(id.startsWith('wall:')){wall=Number(id.split(':')[1]);front='skin';}else front=id.split(':')[1];panel='frontier';frontPage='fronts';update();renderer?.invalidate();paint();return;}if(!districtDef(id))return;selected=id;panel='district';update();renderer?.invalidate();paint();}
  function handleClick(b){
    const action=b.dataset.cityAction,id=b.dataset.cityId;if(!action||!active||!game)return false;
    if(action!=='reset'&&resetArmed){resetArmed=false;game.querySelector('[data-city-action="reset"]').textContent='새 도시';}
    if(action==='bio-page')biology.page=id;
    else if(action==='bio-drug'){biology.drug=id;if(id==='oxacillin')biology.route='iv';run.drug=id;}
    else if(action==='bio-focus')renderer?.focus?.(SITES[id]);
    else if(['lab-expose','lab-medicine','lab-response'].includes(action)){
      const key=action==='lab-expose'?'expose':action==='lab-medicine'?'medicine':'response';
      const payload=key==='expose'?{recordId:biology.record,front:biology.front,amount:Number(biology.amount),wall:Number(biology.wall)}:key==='medicine'?{drugId:biology.drug,route:biology.route,packs:Number(biology.packs)}:biology.order+':'+biology.site;
      const result=command(run,key,payload,data);if(result.text){toast=result.text;toastUntil=performance.now()+3500;}save();
    }
    else if(action==='wave'&&run.scenario==='simulation'){panel='armory';biology.page='exposure';}
    else if(action==='front-page')frontPage=id;
    else if(action==='plot-site')selected=id;
    else if(action==='front-select')front=id;
    else if(action==='wall-step')wall=(wall+Number(id)+WALLS.length)%WALLS.length;
    else if(action==='front-focus')renderer?.focus?.(id==='skin'?WALLS[wall]:FRONTS[id]);
    else if(action==='front-alert'){const a=frontierAlerts(run)[Number(id)||0];if(a){renderer?.focus?.(a.point);if(a.kind==='skin'&&a.id!=null){wall=a.id;front='skin';}else if(FRONTS[a.kind])front=a.kind;panel=a.kind==='district'?'district':'frontier';if(a.kind==='district')selected=a.id;frontPage='fronts';}}
    else if(action==='select')select(id);
    else if(action==='inspect-kind')selectedKind=selectedKind===id?'':id;
    else if(action==='workers-page')workersPage=Math.max(0,workersPage+Number(id));
    else if(action==='scenario'){if(SCENARIOS[id])choice=id;}
    else if(action==='menu'){atStart=true;speed=0;save();}
    else if(action==='resume'){if(started){atStart=false;speed=0;}}
    else if(action==='start'){run=newCity(SCENARIOS[choice].host,choice);started=true;atStart=false;speed=1;selected='lung';selectedKind='';panel=choice==='simulation'?'armory':'';biology.page=choice==='simulation'?'exposure':'medicine';restored=false;save();}
    else if(action==='panel')panel=panel===id?'':id;
    else if(action==='close'){const last=panel;panel='';game.querySelector(`[data-city-action="panel"][data-city-id="${last}"]`)?.focus({preventScroll:true});}
    else if(action==='city-page')cityPage=id;
    else if(action==='log-page')logPage=Math.max(0,logPage+Number(id));
    else if(action==='speed'){if(!atStart)speed=Number(id);restored=false;}
    else if(action==='zoom')renderer?.zoom(Number(id)*.22);
    else if(action==='fit')renderer?.reset();
    else if(action==='rotate')renderer?.rotate?.(Number(id));
    else if(action==='layer')layer=layer==='city'?'supply':'city';
    else if(action==='reset'||action==='restart'){
      if(action==='reset'&&!resetArmed){resetArmed=true;b.textContent='현재 도시 초기화';toast='한 번 더 누르면 새 도시를 시작합니다.';toastUntil=performance.now()+5000;}
      else{run=newCity(run.host,run.scenario);speed=1;selected='lung';restored=false;resetArmed=false;renderer?.reset();game.querySelector('[data-city-action="reset"]').textContent='새 도시';save();}
    }else{const result=command(run,action,id,data);if(result.text){toast=result.text;toastUntil=performance.now()+3000;}if(action==='continue')speed=1;save();}
    update();renderer?.invalidate();paint();return true;
  }
  function detach(){loop?.stop();loop=null;renderer?.dispose();renderer=null;abort?.abort();abort=null;if(active){speed=0;save();}game=null;}
  function mount(root,isActive){
    detach();active=isActive;if(!active)return;game=root.querySelector('.cc-game');if(!game)return;
    const canvas=game.querySelector('canvas');renderer=(options.renderer||createCityRenderer)(canvas,select,updateCamera);abort=new AbortController();
    if(is3d){const container=document.createElement('div');container.dataset.cityBiology='';game.querySelector('[data-city-panel="armory"]').prepend(container);}
    game.addEventListener('change',e=>{
      const key=e.target.dataset.cityInput;if(!key||!Object.hasOwn(biology,key))return;
      biology[key]=e.target.value;
      if(key==='record'&&!pathogenDef(biology.record).routes.includes(biology.front))biology.front=pathogenDef(biology.record).routes[0];
      update();
    },{signal:abort.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){speed=0;save();update();}},{signal:abort.signal});
    window.addEventListener('pagehide',save,{signal:abort.signal});
    game.addEventListener('keydown',e=>{if(!atStart&&e.code==='Space'&&e.target===canvas){e.preventDefault();speed=speed?0:1;renderer.invalidate();update();}if(e.key==='Escape'){resetArmed=false;game.querySelector('[data-city-action="reset"]').textContent='새 도시';if(panel){const last=panel;panel='';update();game.querySelector(`[data-city-action="panel"][data-city-id="${last}"]`)?.focus({preventScroll:true});}}},{signal:abort.signal});
    game.addEventListener('click',e=>{if(e.target.closest('[data-card-open]')){speed=0;save();}},{signal:abort.signal});
    const callbacks={update(dt){
      if(!active||document.hidden)return;
      if(!atStart&&run.status==='running')for(let n=0;n<speed;n++)tickCity(run,dt,data);
      hud+=dt;saveClock+=dt;if(hud>.4){hud=0;update();}if(saveClock>5){saveClock=0;save();}
    },render:paint};
    loop=options.loop?options.loop(callbacks):GameLoop({context:canvas.getContext('2d'),clearCanvas:false,blur:true,...callbacks});
    update();paint();loop.start();
  }
  return {render,mount,handleClick};
}
