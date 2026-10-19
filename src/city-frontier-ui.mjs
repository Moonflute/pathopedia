import {DISTRICTS} from './city-data.mjs';
import {WALLS,FRONTS,INVESTMENTS,wallState} from './city-frontier-data.mjs';
import {wallMaximum,frontierAlerts} from './city-frontier.mjs';
const button=(action,id,text,extra='')=>`<button type="button" data-city-action="${action}" data-city-id="${id}" ${extra}>${text}</button>`;
export function frontierPanel(s,front,wall,page,selected){
 const f=s.frontier;if(!f)return '';
 const nav=`<nav class="cc-front-tabs" aria-label="방어 관리">${button('front-page','fronts','전선',`aria-pressed="${page==='fronts'}"`)}${button('front-page','plots','증설',`aria-pressed="${page==='plots'}"`)}${button('front-page','alerts','경고',`aria-pressed="${page==='alerts'}"`)}</nav>`;
 if(page==='alerts')return nav+'<div class="cc-front-alerts">'+(frontierAlerts(s).slice(0,3).map((a,i)=>button('front-alert',i,a.text+' ↗')).join('')||'<p>현재 위험 없음</p>')+'</div>';
 if(page==='plots'){
  const d=s.districts[selected],plots=f.plots[selected],used=plots.length;
  return nav+`<nav class="cc-front-districts" aria-label="증설 구역">${DISTRICTS.map(x=>button('plot-site',x.id,x.short,`aria-pressed="${x.id===selected}"`)).join('')}</nav><div class="cc-front-row"><strong>증설 ${used} / 2</strong><span>${d.building?'인력·자재 작업 중':plots.map(x=>INVESTMENTS[x].name).join(' · ')||'빈 자리 2칸'}</span></div><div class="cc-investments">${Object.entries(INVESTMENTS).map(([id,p])=>button('invest',selected+':'+id,`${p.name}<small>▥ ${p.cost}</small>`,`${used>=2||d.building||s.resources.materials<p.cost?'disabled':''} title="${{barrier:'가까운 장벽 3구간 내구도 +35',sensor:'상처 위험 사전 경고 +5초',supply:'구역 영양 비축 +8 · 연결 전선 비축 +8',production:'작업 자리 +1'}[id]}"`)).join('')}</div>`;
 }
 const depot=f.depots[front],incoming=s.shipments.filter(x=>x.frontDelivery?.type==='depot'&&x.frontDelivery.id===front).length;
 let work='';
 if(front==='skin'){
  const w=f.walls[wall],repair=w.repair,status=repair?(!repair.materials?'자재 배송':repair.assignee==null?'보수 인력 대기':!repair.delivered?'작업자 이동':'현장 보수'):wallState(w,wallMaximum(s,wall));
  work=`<div class="cc-wall-picker">${button('wall-step','-1','‹','aria-label="이전 피부 구간"')}${button('front-focus','skin',WALLS[wall].name+' ↗')}${button('wall-step','1','›','aria-label="다음 피부 구간"')}</div><div class="cc-front-row"><strong>${status}</strong><span>${Math.ceil(w.hp)} / ${wallMaximum(s,wall)}</span></div><meter max="${wallMaximum(s,wall)}" value="${w.hp}"></meter><div class="cc-front-actions">${button('wall-repair',wall,'장벽 보수 ▥ 8',repair||w.hp>=wallMaximum(s,wall)?'disabled':'')}${button('skin-wound',wall,'상처 발생','title="선택 구간에 상처와 감염 발생"')}</div>`;
 }else if(front==='airway')work=`<div class="cc-front-row"><strong>점액 포획 ${Math.ceil(f.airway.mucus)}</strong>${button('front-focus',front,'입구 ↗')}</div><div class="cc-front-row"><span>배출 ${f.airway.cleared} · 장벽 ${Math.round(s.barrier)}%</span><span>${f.airway.boostUntil>s.time?'배출 강화 중':'섬모 가동'}</span></div><div class="cc-front-actions">${button('airway-clear','', '섬모 배출 강화 ◈ 4',f.airway.boostUntil>s.time||s.resources.food<4?'disabled':'')}</div>`;
 else work=`<div class="cc-front-row"><strong>식재료 검역</strong>${button('front-focus',front,'입구 ↗')}</div><div class="cc-front-row"><span>검역 시 영양 생산 55%</span><span>${f.gut.quarantine?'차단 강화':'통상 반입'}</span></div><div class="cc-front-actions">${button('gut-quarantine','',f.gut.quarantine?'검역 ON':'검역 OFF',`aria-pressed="${f.gut.quarantine}"`)}</div>`;
 return nav+`<nav class="cc-front-tabs" aria-label="감염 전선">${Object.entries(FRONTS).map(([id,p])=>button('front-select',id,p.name,`aria-pressed="${front===id}"`)).join('')}</nav><div class="cc-front-work">${work}</div><div class="cc-depot"><span>전선 창고 <b>◈ ${Math.floor(depot.food)} · ▥ ${Math.floor(depot.materials)} · ⚑ ${Math.floor(depot.ammo[s.drug])}</b><small>배송 ${incoming}건</small></span>${button('front-supply',front,'보급')}</div>`;
}
