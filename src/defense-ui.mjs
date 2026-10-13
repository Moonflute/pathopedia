import {GameLoop} from './vendor/kontra-10.0.2.mjs';
import {MAPS,HOSTS,PADS,PATH,WAVE_COUNT,EXTRA_SOURCES,createDefenseCatalog} from './defense-data.mjs';
import {newDefenseRun,wavePlan,getCoverage,towerCoverage,drugBlocked,upkeep,unlockDrug,deployDrug,upgradeTower,upgradeCost,sellTower,improveLab,controlSource,beginWave,pauseRun,resumeRun,tickDefense,defenseScore} from './defense-engine.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categoryLabel=category=>({REGIMEN:'요법',OUTSIDE_REGIMEN:'요법 외',ACTIVE:'활성*',INACTIVE:'비활성',ACT:'조건부*'}[category]||category||'—');
const KEY='pathopedia.defense.v1';
export function createDefenseGame(database,sources,{render:renderApp,openDetail,openRecord}) {
 const catalog=createDefenseCatalog(database,sources);
 let run=newDefenseRun(catalog),selectedDrug='ampicillin',selectedTower=null,speed=1,loop=null,ctx=null,canvas=null,scale=1,uiTime=0,finishedSaved=false,activeContainer=null,lastKnown=0;
 let history={bestScore:0,bestWave:0,wins:0},storageWarning='';
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)for(const key of ['bestScore','bestWave','wins'])if(Number.isInteger(saved[key])&&saved[key]>=0&&saved[key]<=1000000)history[key]=key==='bestWave'?Math.min(12,saved[key]):saved[key];}catch{storageWarning='최고 기록을 읽을 수 없어 이번 판만 표시합니다.';}
 const map=()=>MAPS.find(m=>m.id===run.mapId);
 const host=()=>HOSTS.find(h=>h.id===run.hostId);
 const currentPlan=()=>run.status==='prep'?wavePlan(run):run.plan;
 const editable=()=>!['won','lost'].includes(run.status);
 const knownLevel=()=>run.status==='prep'?run.lab:Math.max(run.lab,run.elapsed>=14?2:run.elapsed>=5?1:0);
 function saveResult(){
  history.bestWave=Math.max(history.bestWave,run.bestWave);
  if(['won','lost'].includes(run.status)&&!finishedSaved){history.bestScore=Math.max(history.bestScore,defenseScore(run));if(run.status==='won')history.wins++;finishedSaved=true;}
  try{localStorage.setItem(KEY,JSON.stringify(history));}catch{storageWarning='브라우저 저장을 사용할 수 없어 최고 기록이 보관되지 않습니다.';}
 }
 function restart(mapId=run.mapId){
  const choices=HOSTS.filter(h=>h.id!==run.hostId),nextHost=choices[Math.floor(Math.random()*choices.length)].id;
  run=newDefenseRun(catalog,{mapId,hostId:nextHost});selectedDrug=nextHost==='allergy'||mapId==='abdomen'?'ceftriaxone':'ampicillin';selectedTower=null;finishedSaved=false;renderApp();
 }
 function drugButton(drug){
  const unlocked=run.unlocked.includes(drug.id),blocked=drugBlocked(run,drug),price=unlocked?drug.cost:drug.unlock;
  return `<button type="button" class="df-drug ${selectedDrug===drug.id?'is-selected':''} ${!unlocked?'is-locked':''}" style="--drug-color:${drug.color}" data-defense-drug="${drug.id}" aria-pressed="${selectedDrug===drug.id}" title="${esc(blocked||drug.name+' · '+drug.spectrum+' · '+drug.limitations)}" ${blocked||!editable()?'disabled':''}><span class="df-drug-icon">${drug.combo?'⛓':drug.short}</span><span class="df-drug-copy"><strong>${esc(drug.name)}</strong><small>${blocked?'알레르기 제외':unlocked?'배치 '+price+' · 유지 '+drug.upkeep:'/ 해금 '+price}</small></span>${!unlocked?'<span class="df-lock" aria-hidden="true">+</span>':''}</button>`;
 }
 function briefing(){
  const plan=currentPlan();if(!plan)return '<p>모든 wave를 방어했습니다.</p>';
  const level=knownLevel();
  const names=level>=1?plan.pathogenIds.map(id=>{const p=catalog.pathogenById[id];return `<span class="df-pathogen" style="--pathogen-color:${p.color}"><i></i>${esc(p.name)} <b>${esc(p.phenotype)}</b><button type="button" data-defense-record="${p.recordId}" aria-label="${esc(p.name)} 원본 기록">↗</button></span>`;}).join(''):'<p class="df-muted">균종 미확인 · 기본 배양·AST 결과는 전투 중 도착합니다.</p>';
  const hints=run.mapId==='lung'?'초반: 폐렴구균·MSSA / 후반: 내성균·Pseudomonas':run.mapId==='urinary'?'초반: 장내 그람음성균 / 후반: ESBL·CRE·Pseudomonas':'장내 그람음성균 + 혐기성균 / 후반: ESBL·CRE';
  return `<div class="df-panel-title"><span>${run.status==='prep'?'NEXT WAVE':'CURRENT WAVE'}</span><b>${String(plan.number).padStart(2,'0')} / 12</b></div><div class="df-wave-tags"><span>병원체 ${plan.units.length}</span>${plan.source?'<span class="df-warning-tag">감염원 제거 필요</span>':''}${plan.selected?'<span class="df-warning-tag">선택압 · 내성 집단 증가</span>':''}</div><div class="df-pathogen-list">${names}</div>${level>=2?'<button type="button" class="df-text-button" data-defense-action="ast">감수성·현재 배치 확인 ↗</button>':`<p class="df-hint">${esc(hints)}</p>`}${run.lab>=2&&run.status==='prep'&&run.wave<11?`<p class="df-lookahead"><b>그다음 wave</b> ${wavePlan(run,run.wave+1).pathogenIds.map(id=>esc(catalog.pathogenById[id].name)).join(' · ')}</p>`:''}`;
 }
 function inspector(){
  const tower=run.towers.find(t=>t.id===selectedTower),drug=catalog.drugById[tower?.drugId||selectedDrug];
  if(!drug)return '';
  const upgrade=(kind,label,disabled)=>`<button type="button" data-defense-upgrade="${kind}" ${disabled||!editable()?'disabled':''}>${label}${disabled?'':' <b>'+upgradeCost(tower,kind)+'</b>'}</button>`;
  return `<div class="df-inspector-heading"><span class="df-chip" style="--drug-color:${drug.color}">${drug.short}</span><div><strong>${esc(drug.name)}</strong><small>${tower?'배치 '+(tower.padId+1)+' · 효율 '+tower.potency+'/2 · '+(tower.exposure?'증가 노출':'기본 노출'):'약제를 선택한 뒤 지도에서 + 지점을 누르세요.'}</small></div>${drug.combo?'<span class="df-combo-label">'+drug.combo.map(esc).join(' ↔ ')+'</span>':''}</div><p class="df-spectrum">${esc(drug.spectrum)}<br><span>${esc(drug.limitations)}</span></p>${tower?`<div class="df-upgrades">${run.hostId==='renal'&&drug.renal?upgrade('renal',tower.renalAdjusted?'신기능 투여 조정 완료':'신기능 맞춤 투여',tower.renalAdjusted):''}${upgrade('potency',tower.potency>=2?'투여 효율 MAX':'투여 효율 ↑',tower.potency>=2)}${upgrade('exposure',tower.exposure?'노출 최적화 완료':esc(drug.optimize),tower.exposure>=1)}<button type="button" data-defense-action="sell" ${!editable()?'disabled':''}>철수 <b>+${Math.floor(tower.spent*0.7)}</b></button></div>`:'<p class="df-inspector-note">강화는 기존 coverage 안에서만 적용됩니다. I는 노출 최적화, R은 약제 변경이 필요합니다.</p>'}`;
 }
 function controls(){
  const done=['won','lost'].includes(run.status);
  const main=run.status==='prep'?`<button type="button" class="df-start" data-defense-action="start">Wave ${run.wave+1} 시작 <span>유지 비용 ${upkeep(run,catalog)}</span><b>▶</b></button>`:run.status==='running'?'<button type="button" class="df-start is-pause" data-defense-action="pause">일시정지 <b>Ⅱ</b></button>':run.status==='paused'?'<button type="button" class="df-start" data-defense-action="resume">방어 재개 <b>▶</b></button>':'<button type="button" class="df-start" data-defense-action="new">다시 도전 <b>↻</b></button>';
  return `<div class="df-controls">${main}<div class="df-speed" aria-label="게임 속도">${[1,2,3].map(n=>`<button type="button" data-defense-speed="${n}" aria-pressed="${speed===n}" class="${speed===n?'active':''}">${n}×</button>`).join('')}</div><span class="df-wave-counter">${done?'방어 종료':run.status==='prep'?'배치 · 정보 · 보급':run.status==='paused'?'PAUSED':run.kills+' 제거 · '+run.enemies.length+' 이동 중'}</span></div>`;
 }
 function markup(){
  const done=['won','lost'].includes(run.status),plan=currentPlan();
  return `<section class="df-game" aria-label="항생제 타워디펜스"><div class="df-heading"><div><span class="df-eyebrow">PATHOPEDIA / TOWER DEFENSE</span><h1>항생제 디펜스 <span>PROTOTYPE</span></h1></div><div class="df-heading-actions"><span class="df-best">최고 ${history.bestWave} wave</span><button type="button" data-defense-action="guide">플레이 가이드 <span>↗</span></button><button type="button" data-defense-action="new" aria-label="새 판 시작">↻ 새 판</button></div></div><div class="df-scenario"><div class="df-map-picker" aria-label="감염 부위">${MAPS.map(m=>`<button type="button" data-defense-map="${m.id}" aria-pressed="${run.mapId===m.id}" class="${run.mapId===m.id?'active':''}">${m.name}</button>`).join('')}</div><span class="df-map-note">${esc(map().note)}</span><details class="df-host"><summary><i></i>${esc(host().name)} <span>⌄</span></summary><p>${esc(host().note)}</p></details></div><div class="df-metrics"><div class="df-health"><span>환자 상태</span><b data-df-health>${run.health}</b><span class="df-meter"><i data-df-health-bar style="width:${run.health}%"></i></span></div><div class="df-resource"><span>자원</span><b data-df-credits>${run.credits}</b></div><div><span>WAVE</span><b data-df-wave>${String(run.wave).padStart(2,'0')}<small> / 12</small></b></div><div class="df-risk"><span>내성 선택압 <b data-df-pressure>${Math.floor(run.pressure)}</b></span><span class="df-meter"><i data-df-pressure-bar style="width:${run.pressure}%"></i></span></div><div class="df-risk df-biome"><span>Microbiome 교란 <b data-df-biome>${Math.floor(run.microbiome)}</b></span><span class="df-meter"><i data-df-biome-bar style="width:${run.microbiome}%"></i></span></div></div><div class="df-layout"><div class="df-battle"><div class="df-quick-drugs" aria-label="빠른 약제 선택">${catalog.drugs.map(d=>'<button type="button" data-defense-quick-drug="'+d.id+'" style="--drug-color:'+d.color+'" class="'+(selectedDrug===d.id?'active':'')+'" aria-label="'+esc(d.name)+' '+(run.unlocked.includes(d.id)?'선택':'해금')+'" '+(drugBlocked(run,d)||done?'disabled':'')+'><strong>'+d.short+'</strong><small>'+(run.unlocked.includes(d.id)?d.cost:'해금 '+d.unlock)+'</small></button>').join('')}</div><div class="df-board"><div class="df-board-label"><span><i></i>${esc(map().subtitle)}</span><span>${run.towers.length} / ${PADS.length} 배치</span></div><canvas id="defense-canvas" width="900" height="520" role="img" aria-label="굽은 경로를 따라 병원체가 이동하는 ${esc(map().name)} 방어 지도. 아래 배치 지점 버튼으로 항생제를 배치합니다."></canvas><div class="df-pads" role="group" aria-label="항생제 배치 지점">${PADS.map(p=>{const tower=run.towers.find(t=>t.padId===p.id),drug=tower&&catalog.drugById[tower.drugId];return `<button type="button" data-defense-pad="${p.id}" class="df-pad ${tower?'occupied':''} ${tower?.id===selectedTower?'selected':''} ${tower&&!tower.renalAdjusted?'on-hold':''}" style="left:${p.x/9}%;top:${p.y/5.2}%;--drug-color:${drug?.color||'#95bf9b'}" aria-label="배치 지점 ${p.id+1}${tower?' · '+esc(drug.name)+' 선택':' · '+esc(catalog.drugById[selectedDrug].name)+' 배치'}" ${done?'disabled':''}>${tower?'<span>'+drug.short+'</span>'+(tower.exposure?'<i aria-label="노출 최적화">↑</i>':'')+(tower.potency?'<b>'+tower.potency+'</b>':''):'<span>+</span>'}</button>`;}).join('')}</div>${run.status==='paused'?'<div class="df-pause-badge">Ⅱ 일시정지 · 배치 조정 가능</div>':''}${done?`<div class="df-outcome"><span>${run.status==='won'?'DEFENSE COMPLETE':'DEFENSE ENDED'}</span><h2>${run.status==='won'?'방어 성공':'다시 전략을 짜볼까요?'}</h2><p>${run.bestWave} wave 방어 · ${run.totalKills} 제거 · ${run.totalLeaks} 돌파</p><strong>${defenseScore(run).toLocaleString()} <small>점</small></strong><button type="button" data-defense-action="new">새 숙주로 다시 도전 →</button></div>`:''}</div>${controls()}<div class="df-event" role="status">${esc(run.notice)}</div><section class="df-inspector" aria-label="선택한 항생제">${inspector()}</section><div class="df-support"><button type="button" data-defense-action="lab" ${run.lab>=2||done?'disabled':''}><span class="df-support-icon">⌕</span><span><strong>${run.lab===0?'배양실 설치':run.lab===1?'AST 추가':'배양 + AST 가동 중'}</strong><small>${run.lab===0?'다음 wave 균종 미리 확인':run.lab===1?'감수성·다음다음 wave 확인':'선제 정보 확보 · 유지 비용 8'}</small></span><b>${run.lab===0?'45':run.lab===1?'65':'✓'}</b></button><button type="button" data-defense-action="source" ${!['running','paused'].includes(run.status)||!run.plan?.source||run.sourceControlled?'disabled':''}><span class="df-support-icon">⊕</span><span><strong>${esc(map().sourceAction)}</strong><small>${run.sourceControlled&&run.status!=='prep'?'감염원 제거 완료':plan?.source?'감염원 보호 해제 · 전투 중 사용':'해당 감염원이 있는 wave에서 사용'}</small></span><b>${run.sourceControlled&&run.status!=='prep'?'✓':'70'}</b></button></div></div><aside class="df-sidebar"><section class="df-briefing">${briefing()}</section><section class="df-armory"><div class="df-panel-title"><span>ANTIBIOTICS</span><b>약제 배치</b></div><p class="df-shop-hint">약제 선택 → 지도 + 클릭<br>해금과 배치에는 각각 자원이 듭니다.</p><div class="df-drugs">${catalog.drugs.map(drugButton).join('')}</div><p class="df-key"><span>S 감수성</span><span>I 증가 노출</span><span>R 약제 변경</span></p></section></aside></div><footer class="df-footnote"><span>기존 Pathopedia 교육용 분리주·요법 자료 사용. 피해·속도·비용·선택압 수치는 게임 규칙이며 실제 임상 수치가 아닙니다.</span><span>탭 이동 시 자동 정지 · 새로고침 시 판 초기화 · 최고 기록 보관${storageWarning?' · '+esc(storageWarning):''}</span></footer></section>`;
 }
 function astDialog(){
  const plan=currentPlan();if(!plan||knownLevel()<2)return;
  const rows=plan.pathogenIds.map(id=>{const p=catalog.pathogenById[id];return `<tr><th scope="row">${esc(p.name)}<small>${esc(p.phenotype)}</small></th>${catalog.drugs.map(d=>{const result=getCoverage(catalog,d.id,id,{mapId:run.mapId,wave:plan.number,source:plan.source,exposure:1});const current=run.towers.filter(t=>t.drugId===d.id).some(t=>towerCoverage(run,catalog,t,id).factor>0);return `<td title="${esc(result.reason+' '+(result.entry?.note||''))}" class="${result.factor?'df-ast-active':''} ${current&&result.factor?'df-ast-covered':''}">${categoryLabel(result.category)}${current&&result.factor?'<small>배치 ✓</small>':result.category==='I'&&result.factor?'<small>노출 ↑ 필요</small>':''}${!result.factor&&['S','I','REGIMEN','ACTIVE'].includes(result.category)?'<small>조건 제한</small>':''}</td>`;}).join('')}</tr>`;}).join('');
  const content=`<p>Wave ${plan.number} · ${esc(map().name)} · ${esc(host().name)}. 셀의 판정은 기존 기록 그대로입니다. 체크는 현재 배치가 투여·노출·부위 조건을 충족한다는 뜻입니다.</p><div class="df-ast-scroll"><table class="df-ast"><thead><tr><th>병원체</th>${catalog.drugs.map(d=>'<th title="'+esc(d.name)+'">'+d.short+'</th>').join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="tiny">요법 포함은 S가 아니며 요법 외는 R이 아닙니다. 문헌 활성만 있는 조합은 이 프로토타입의 치료 조건을 확정하지 않아 사용하지 않습니다. I는 증가 노출로 대응하며 R은 어떤 강화에도 무효입니다.</p><div class="df-record-links">${plan.pathogenIds.map(id=>'<button type="button" data-defense-record="'+catalog.pathogenById[id].recordId+'">'+esc(catalog.pathogenById[id].name)+' 원본 ↗</button>').join('')}</div>`;
  if(pauseRun(run))renderApp();openDetail('Culture / AST',content,true);
 }
 function guide(){
  if(pauseRun(run))renderApp();
  openDetail('항생제 디펜스 · 플레이 가이드',`<div class="df-guide"><p>12개 wave 동안 환자 상태를 지키세요. 병원체는 길을 따라 이동하고 범위 안의 유효한 약제가 자동으로 공격합니다.</p><ol><li><strong>약제를 고르고 +에 배치.</strong> 첫 폐 wave는 AMP/CRO, 요로는 AMP/CFZ(증가 노출)/CRO, 복강은 CRO를 참고하세요. 잠긴 약제는 먼저 해금합니다.</li><li><strong>배치한 약제를 눌러 강화.</strong> 투여 효율은 공격을 개선합니다. 별도 노출 최적화는 I 대응을 엽니다. R은 강화해도 바뀌지 않습니다.</li><li><strong>배양·AST에 투자.</strong> 기본 결과는 전투 중 도착합니다. 배양실은 다음 균종, AST는 감수성과 한 wave 앞의 균 정보를 준비 단계에서 공개합니다.</li><li><strong>감염원과 숙주를 확인.</strong> 농양·biofilm의 보호는 적절한 배액·카테터 제거로 해제합니다. 신기능 저하에서는 신배설 약제를 맞춤 투여해야 작동합니다.</li><li><strong>필요한 만큼만 사용.</strong> 유지 비용은 매 wave 시작 시 지불합니다. 광범위 약제 사용은 선택압·microbiome 교란을 더 많이 올립니다. 선택압이 높으면 다음 wave의 기존 내성 집단이 늘고, 교란이 높으면 보급 보상이 줄어듭니다. 배치한 약제를 철수하면 투자 자원의 70%를 회수합니다.</li></ol><p>두 성분을 연결한 AMC와 CZA는 자료에 수록된 약제·inhibitor 조합입니다. 일반 강화·인접 배치로 새로운 coverage를 만들지 않습니다. CZA의 KPC 결과를 모든 CRE나 NDM에 적용하지 않습니다.</p><p class="tiny">기존 고정 교육 분리주와 임상 맥락을 사용합니다. 실측 MIC·실제 처방 용량을 생성하지 않습니다. 게임 수치는 임상 효과·위험 확률을 뜻하지 않습니다.</p><ul class="sources">${EXTRA_SOURCES.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a></li>').join('')}<li><a href="https://github.com/straker/kontra" target="_blank" rel="noopener noreferrer">Kontra.js 10.0.2 · MIT 게임 루프</a></li></ul></div>`,true);
 }
 function draw(){
  if(!ctx)return;
  ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,900,520);
  const background=ctx.createLinearGradient(0,0,900,520);background.addColorStop(0,'#182c2b');background.addColorStop(1,'#101f23');ctx.fillStyle=background;ctx.fillRect(0,0,900,520);
  ctx.strokeStyle='#99cfb309';ctx.lineWidth=1;
  for(let x=0;x<900;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,520);ctx.stroke();}
  for(let y=0;y<520;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
  ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();PATH.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle='#82baa53b';ctx.lineWidth=53;ctx.stroke();ctx.strokeStyle='#365751';ctx.lineWidth=49;ctx.stroke();ctx.strokeStyle='#284540';ctx.lineWidth=37;ctx.stroke();
  ctx.setLineDash([3,11]);ctx.strokeStyle='#97cdb62b';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  ctx.font='600 10px SUIT, sans-serif';ctx.letterSpacing='1px';ctx.fillStyle='#a0cbb7';ctx.fillText('ENTRY',12,62);ctx.fillStyle='#d8b986';ctx.fillText('PATIENT',790,501);ctx.letterSpacing='0px';
  ctx.strokeStyle=map().color+'17';ctx.lineWidth=1;ctx.beginPath();ctx.arc(612,278,46,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(612,278,61,0,Math.PI*2);ctx.stroke();ctx.font='500 13px SUIT, sans-serif';ctx.fillStyle=map().color+'4d';ctx.textAlign='center';ctx.fillText(map().name,612,283);ctx.textAlign='left';
  for(const pad of PADS){
   const tower=run.towers.find(t=>t.padId===pad.id),drug=tower&&catalog.drugById[tower.drugId];
   if(tower?.id===selectedTower){ctx.fillStyle=drug.color+'0c';ctx.strokeStyle=drug.color+'38';ctx.lineWidth=1;ctx.setLineDash([5,6]);ctx.beginPath();ctx.arc(pad.x,pad.y,drug.range,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);}
   ctx.fillStyle=tower?'#1c3334':'#1b302d';ctx.strokeStyle=tower?drug.color+'88':'#789f8766';ctx.lineWidth=tower?2:1;ctx.beginPath();ctx.arc(pad.x,pad.y,tower?27:24,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(tower){ctx.strokeStyle=drug.color+'35';ctx.lineWidth=6;ctx.beginPath();ctx.arc(pad.x,pad.y,32,-Math.PI/2,Math.PI*1.5);ctx.stroke();
    if(drug.combo){ctx.strokeStyle=drug.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pad.x-18,pad.y-29);ctx.lineTo(pad.x+18,pad.y-29);ctx.stroke();for(const offset of [-18,18]){ctx.fillStyle=drug.color;ctx.beginPath();ctx.arc(pad.x+offset,pad.y-29,5,0,Math.PI*2);ctx.fill();}}
   }
   ctx.textAlign='center';ctx.font='10px SUIT, sans-serif';ctx.fillStyle='#709184';ctx.fillText(String(pad.id+1).padStart(2,'0'),pad.x,pad.y+44);ctx.textAlign='left';
  }
  for(const effect of run.effects){ctx.globalAlpha=Math.max(0,effect.ttl/0.19);ctx.strokeStyle=effect.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(effect.x,effect.y);ctx.lineTo(effect.toX,effect.toY);ctx.stroke();ctx.fillStyle='#ebf3d7';ctx.beginPath();ctx.arc(effect.toX,effect.toY,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  for(const enemy of run.enemies){
   const p=catalog.pathogenById[enemy.pathogenId],radius=p.id==='kpc'?15:12;
   ctx.save();ctx.translate(enemy.x,enemy.y);
   if(enemy.sourceBound&&!run.sourceControlled){ctx.strokeStyle='#dfaab2bb';ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(0,0,radius+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
   ctx.fillStyle=p.color;ctx.strokeStyle='#e4eee14f';ctx.lineWidth=1.4;ctx.beginPath();
   if(p.group==='그람양성'){ctx.arc(-4,-2,radius*0.64,0,Math.PI*2);ctx.arc(5,4,radius*0.7,0,Math.PI*2);}else if(p.id==='kpc'){for(let i=0;i<6;i++){const angle=Math.PI*i/3;const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();}else{ctx.roundRect(-radius,-radius*0.64,radius*2,radius*1.28,7);}
   ctx.fill();ctx.stroke();ctx.fillStyle='#163234';ctx.font='750 8px SUIT, sans-serif';ctx.textAlign='center';ctx.fillText(knownLevel()>=1?p.short:'?',0,3);ctx.textAlign='left';
   ctx.fillStyle='#071719aa';ctx.fillRect(-16,-radius-12,32,4);ctx.fillStyle=p.color;ctx.fillRect(-16,-radius-12,32*Math.max(0,enemy.hp/enemy.maxHp),4);ctx.restore();
  }
 }
 function refreshMetrics(container){
  const values={'[data-df-health]':run.health,'[data-df-credits]':run.credits,'[data-df-pressure]':Math.floor(run.pressure),'[data-df-biome]':Math.floor(run.microbiome)};
  for(const [selector,value] of Object.entries(values)){const element=container.querySelector(selector);if(element)element.textContent=value;}
  for(const [selector,value] of [['[data-df-health-bar]',run.health],['[data-df-pressure-bar]',run.pressure],['[data-df-biome-bar]',run.microbiome]]){const element=container.querySelector(selector);if(element)element.style.width=value+'%';}
  const counter=container.querySelector('.df-wave-counter');if(counter)counter.textContent=run.kills+' 제거 · '+run.enemies.length+' 이동 중';
 }
 function mount(container,active){
  loop?.stop();ctx=null;canvas=null;activeContainer=container;
  if(!active){pauseRun(run);return;}
  canvas=container.querySelector('#defense-canvas');if(!canvas)return;
  scale=Math.min(window.devicePixelRatio||1,2);canvas.width=900*scale;canvas.height=520*scale;ctx=canvas.getContext('2d');draw();
  if(run.status!=='running')return;
  lastKnown=knownLevel();
  if(!loop)loop=GameLoop({context:ctx,clearCanvas:false,blur:true,update(dt){
   if(document.hidden){pauseRun(run);queueMicrotask(()=>renderApp());return;}
   const changed=tickDefense(run,catalog,dt*speed);uiTime+=dt;
   if(changed){saveResult();queueMicrotask(()=>renderApp());return;}
   if(knownLevel()!==lastKnown){lastKnown=knownLevel();queueMicrotask(()=>renderApp());return;}
   if(uiTime>=0.12){uiTime=0;refreshMetrics(activeContainer);}
  },render:draw});loop.context=ctx;loop.start();
 }
 function handleClick(button){
  if(button.dataset.defenseDrug||button.dataset.defenseQuickDrug){
   const id=button.dataset.defenseDrug||button.dataset.defenseQuickDrug;
   if(!run.unlocked.includes(id)&&!unlockDrug(run,catalog,id)){renderApp();return true;}
   selectedDrug=id;selectedTower=null;run.notice='선택: '+catalog.drugById[id].name+' · 빈 + 지점에 배치하세요.';renderApp();return true;
  }
  if(button.dataset.defensePad!==undefined){
   const padId=Number(button.dataset.defensePad),tower=run.towers.find(t=>t.padId===padId);
   if(tower){selectedTower=tower.id;selectedDrug=tower.drugId;}else if(deployDrug(run,catalog,selectedDrug,padId)){selectedTower=run.towers.at(-1).id;}
   renderApp();return true;
  }
  if(button.dataset.defenseUpgrade){upgradeTower(run,catalog,selectedTower,button.dataset.defenseUpgrade);renderApp();return true;}
  if(button.dataset.defenseMap){if(button.dataset.defenseMap!==run.mapId)restart(button.dataset.defenseMap);return true;}
  if(button.dataset.defenseSpeed){speed=Number(button.dataset.defenseSpeed);renderApp();return true;}
  if(button.dataset.defenseRecord){if(pauseRun(run))renderApp();openRecord(button.dataset.defenseRecord);return true;}
  const action=button.dataset.defenseAction;if(!action)return false;
  if(action==='guide'){guide();return true;}if(action==='ast'){astDialog();return true;}if(action==='new'){restart();return true;}
  if(action==='start')beginWave(run,catalog);
  if(action==='pause')pauseRun(run);
  if(action==='resume')resumeRun(run);
  if(action==='sell'){sellTower(run,selectedTower);selectedTower=null;}
  if(action==='lab')improveLab(run);
  if(action==='source')controlSource(run);
  renderApp();return true;
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&pauseRun(run)){loop?.stop();if(canvas?.isConnected)renderApp();}});
 return {render:markup,mount,handleClick};
}