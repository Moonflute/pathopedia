import {residentView} from './city-residents.mjs';
import {DISTRICTS,cityJobs,cellCap,DRUGS} from './city-data.mjs';
import {HOME_ORGANS} from './city-homeostasis-data.mjs';
import {counts,upgradeCost,cityHealth,cityOxygen} from './city-engine.mjs';
import {PATHOGENS,pathogenDef} from './city-pathogens.mjs';
import {WALLS} from './city-frontier-data.mjs';
import {wallMaximum,frontierAlerts} from './city-frontier.mjs';
import {pathogenLimit,populationLimit} from './city-world.mjs';
import {responseView} from './city-response.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,id,label,extra='')=>`<button type="button" data-city-action="${action}" data-city-id="${esc(id)}" ${extra}>${label}</button>`;
const percent=n=>Math.round(n??100)+'%';
const meter=(label,n)=>`<div class="cc-dashboard-meter"><span>${label}</span><meter min="0" max="100" value="${Math.max(0,Math.min(100,n??100))}"></meter><b>${percent(n)}</b></div>`;
const select=(key,label,values,value)=>`<label class="cc-dashboard-field"><span>${label}</span><select data-city-input="${key}" aria-label="${label}">${values.map(([id,name])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;

export function organDashboard(s,selected){
 const core=DISTRICTS.map(d=>({...d,state:s.districts[d.id],core:true})),annex=HOME_ORGANS.map(o=>({...o,short:o.name,symbol:'◈',color:o.color,state:s.homeostasis?.organs[o.id]}));
 const chosen=[...core,...annex].find(d=>d.id===selected);
 return `${chosen?`<section class="cc-organ-selected"><strong>${esc(chosen.name)}</strong><p>${esc(chosen.job||chosen.label||'기관 기능')}</p></section>`:''}<div class="cc-dashboard-summary"><strong>기관 ${core.length+annex.length}</strong><span>도시 건강 ${percent(cityHealth(s))} · 산소 ${percent(cityOxygen(s))}</span></div><div class="cc-organ-dashboard">${[...core,...annex].map(d=>{
  const q=d.state||{},job=d.core?q.building:s.homeostasis?.works?.find(w=>w.site===d.id),level=q.level||1,cost=d.core?upgradeCost(s,d.id):22+level*16;
  return `<article class="cc-organ-card${selected===d.id?' is-selected':''}" style="--organ:${d.color}"><header>${button('organ-select',d.core?d.id:'home:'+d.id,`<i>${d.symbol}</i><strong>${esc(d.short)}</strong><small>Lv.${level}</small>`)}<span>${job?(job.remaining==null?'자재 배송':job.worker==null?'복구 인력 대기':'현장 작업'):q.oxygen<30?'산소 부족':q.hp<60?'손상':'가동 중'}</span></header>${meter('건강',q.hp)}${meter('산소',q.oxygen)}<footer>${button(d.core?'upgrade':'organ-work',d.core?d.id:d.id+':upgrade',`확장 <small>${level>=4?'MAX':'▥ '+cost}</small>`,job||level>=4||s.resources.materials<cost?'disabled':'')}${button(d.core?'repair':'organ-work',d.core?d.id:d.id+':repair','복구 <small>▥ 16</small>',job||q.hp>=99&&(d.id!=='lung'||s.barrier>=99)||s.resources.materials<16?'disabled':'')}</footer></article>`;
 }).join('')}</div>`;
}

export function cellDashboard(s,selected){
 return `<div class="cc-dashboard-summary"><strong>세포 ${s.cells.length+residentView(s).filter(c=>!c.dead).length}</strong><span>혈구·지원 ${s.cells.length}/${populationLimit(s)} · 생산 대기 ${s.recruits.length}</span></div><div class="cc-cell-dashboard">${Object.entries(cityJobs(s)).map(([id,job])=>{
  const n=counts(s,id),queue=s.recruits.filter(r=>r.kind===id),source=id==='macrophage'?'monocyte':id==='plasma'?'bcell':id,derived=source!==id;
  const disabled=s.resources.food<cityJobs(s)[source].cost||s.recruits.length>=6||counts(s,source)+s.recruits.filter(r=>r.kind===source).length>=cellCap(s,source)||s.cells.length+s.recruits.length>=populationLimit(s);
  return `<article class="cc-cell-card" style="--cell:${job.color}">${button('inspect-kind',id,`<i>${job.glyph||'●'}</i><strong>${job.name}</strong><b>${n}</b>`,`aria-pressed="${selected===id}" aria-label="${job.name} 전체 위치 표시"`)}<small>${queue.length?'생산 대기 '+queue.length:job.task}</small>${button('recruit',source,derived?(id==='macrophage'?'단핵구 생산':'B세포 생산'):'추가 생산',`${disabled?'disabled':''} title="영양 ${cityJobs(s)[source].cost}${derived?' · '+job.name+'로 분화':''}"`)}</article>`;
 }).join('')}<article class="cc-cell-card" style="--cell:#b9ba99">${button('inspect-kind','somatic','<i>◉</i><strong>체세포</strong><b>'+residentView(s).filter(c=>!c.dead).length+'</b>',`aria-pressed="${selected==='somatic'}"`)}<small>기관·조직에서 생활 · 손상·재생</small>${button('resident-recruit','','추가 생산',`${!residentView(s).some(c=>(c.dead||c.health<25)&&!c.growUntil)||s.resources.food<20?'disabled':''} title="영양 20 · 손상된 체세포 재생"`)}</article></div>`;
}

export function defenseDashboard(s){
 const f=s.frontier,skin=f.walls.reduce((sum,w)=>sum+w.hp,0)/f.walls.reduce((sum,_,i)=>sum+wallMaximum(s,i),0)*100,alerts=frontierAlerts(s);
 const rows=[['skin','피부',skin,f.walls.some(w=>w.repair)?'보수 진행 중':f.walls.some(w=>w.hp<=0)?'장벽 파손':'장벽 유지'],['airway','호흡기',s.barrier,'점액 '+Math.round(f.airway.mucus)+' · 배출 '+f.airway.cleared],['gut','소화기',s.physiology?.microbiome??100,f.gut.quarantine?'검역 강화 중':'위산·점액·정상균총']];
 const response=responseView(s);
 return `<div class="cc-defense-alerts">${alerts.length?alerts.map((a,i)=>button('front-alert',i,esc(a.text)+' ↗')).join(''):'<span class="cc-dashboard-ok">현재 장벽 경고 없음</span>'}</div><div class="cc-barrier-dashboard">${rows.map(([id,name,hp,status])=>`<article><header>${button('front-focus',id,'<strong>'+name+'</strong>')}<span>${status}</span></header>${meter('방어 상태',hp)}${button('barrier-strengthen',id,'강화',id==='airway'&&f.airway.boostUntil>s.time?'disabled':'')}</article>`).join('')}</div><section class="cc-defense-response"><h3>실시간 면역 대응</h3>${response?`<strong>${esc(response.name)} · ${response.route}</strong><ol>${response.steps.map(step=>`<li data-response-state="${step.state}"><b>${step.name}</b><span>${esc(step.detail)}</span></li>`).join('')}</ol>`:'<p>감염 유입 대기</p>'}</section>`;
}

export function medicineForm(s,c){
 return `<section class="cc-defense-medicine"><h3>항생제 보급</h3>${select('drug','항생제',DRUGS.map(d=>[d.id,d.name]),c.drug)}<div class="cc-dashboard-form-row">${select('route','투여 경로',c.drug==='oxacillin'?[['iv','정맥']]:[['iv','정맥'],['oral','경구']],c.route)}${select('packs','보급 상자',[[1,'1상자'],[2,'2상자'],[3,'3상자']],c.packs)}</div>${button('lab-medicine','','보급 출발','class="cc-dashboard-primary"')}<div data-city-medicine-status></div></section>`;
}

export function infectionForm(s,data,c){
 const profile=pathogenDef(c.record),routes=profile?.routes||['airway','gut','skin'];
 const entries=routes.flatMap(id=>id==='skin'?WALLS.map(w=>['skin:'+w.id,'피부 · '+w.name]):[[id,{airway:'호흡기 입구',gut:'소화기 입구',blood:'혈류 · 정맥 투여대'}[id]]]);
 return `<section class="cc-infection-form"><h3>침투 조건</h3>${select('record','병원체 종류',[...PATHOGENS.filter(p=>!data?.records||data.records.some(r=>r.id===p.recordId)).map(p=>[p.recordId,p.name]),['IMM-VIRUS','바이러스 · 상피 감염']],c.record)}<label class="cc-dashboard-field"><span>병원체 개수</span><input type="number" inputmode="numeric" min="1" max="${c.record==='IMM-VIRUS'?192:pathogenLimit(s)}" step="1" data-city-input="amount" aria-label="병원체 개수" value="${esc(c.amount)}"></label>${select('entry','침투 위치',entries,c.front==='skin'?'skin:'+c.wall:c.front)}${button('infection-pick','',c.picking?'모델에서 입구 선택 중 · 취소':'모델에서 입구 선택',`aria-pressed="${!!c.picking}"`)}${button('lab-expose','','침투 시작','class="cc-dashboard-primary"')}</section>`;
}

export function infectionStatus(s){
 const groups=new Map();
 const add=(id,key)=>{if(!groups.has(id))groups.set(id,{pending:0,active:0,hosts:0,hp:0});groups.get(id)[key]++;};
 for(const p of s.spawn)add(p.recordId,'pending');for(const p of s.enemies)if(!p.dead){add(p.recordId,'active');groups.get(p.recordId).hp+=p.hp;}
 for(const p of s.physiology?.virions||[])add(p.recordId,'active');for(const p of s.immunity?.infected||[])add(p.recordId,'hosts');for(const p of s.immunity?.parasites||[])add(p.recordId,'active');
 for(const site of Object.values(s.biology?.sites||{}))for(const [id,n] of Object.entries(site.strains))if(n>.1&&!groups.has(id))groups.set(id,{pending:0,active:0,hosts:0,hp:0});
 return `<div class="cc-dashboard-summary"><strong>병원체 현황</strong><span>활동 ${[...groups.values()].reduce((n,g)=>n+g.active,0)} · 감염 세포 ${s.immunity?.infected.length||0}</span></div>${groups.size?`<table class="cc-infection-table"><thead><tr><th>병원체</th><th>대기</th><th>활동</th><th>감염 세포</th></tr></thead><tbody>${[...groups].map(([id,g])=>`<tr><th>${button('observe-pathogen',id,esc(pathogenDef(id)?.name|| (id==='IMM-VIRUS'?'바이러스':id)),g.active+g.hosts===0?'disabled':'')}</th><td>${g.pending}</td><td>${g.active}</td><td>${g.hosts}</td></tr>`).join('')}</tbody></table>`:'<p class="cc-dashboard-ok">현재 활동 중인 병원체 없음</p>'}`;
}

export function operationSummary(s){
 return `<div class="cc-operation-summary">${[['도시 건강',percent(cityHealth(s))],['산소',percent(cityOxygen(s))],['세포',s.cells.length+residentView(s).filter(c=>!c.dead).length],['영양분',Math.floor(s.resources.food)],['자재',Math.floor(s.resources.materials)],['노폐물',percent(s.waste)]].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
}
