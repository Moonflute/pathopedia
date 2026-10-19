import {DISTRICTS,DRUGS,districtDef} from './city-data.mjs';
import {PATHOGENS,pathogenDef,EXPOSURE_ROUTES,MEDICINE_ROUTES,RESPONSE_ORDERS,STAGES,infectionLoad,medicationActivity} from './city-biology.mjs';
import {WALLS} from './city-frontier-data.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,id='',extra='')=>`<button type="button" data-city-action="${action}" data-city-id="${esc(id)}" ${extra}>${label}</button>`;
const select=(key,label,values,value)=>`<label class="cc-bio-field"><span>${label}</span><select data-city-input="${key}" aria-label="${label}">${values.map(([id,name])=>`<option value="${esc(id)}" ${String(value)===String(id)?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;
const meter=(label,n,color)=>`<div class="cc-bio-meter"><span>${label}</span><progress max="100" value="${Math.min(100,n)}" style="accent-color:${color}"></progress><b>${Math.round(n)}</b></div>`;
export const createBiologyControls=()=>({page:'medicine',record:'SAU-002',front:'skin',amount:'6',wall:'11',drug:'vancomycin',route:'iv',packs:'1',site:'lung',order:'auto'});
export function biologyPanel(s,data,c){
 const sandbox=s.scenario==='simulation',p=pathogenDef(c.record);
 let body='';
 if(c.page==='exposure'&&sandbox){
  body=select('record','병원체',PATHOGENS.filter(p=>data?.records?.some(r=>r.id===p.recordId)).map(p=>[p.recordId,p.name]),c.record)+`<div class="cc-bio-row">${select('front','유입 경로',p.routes.map(id=>[id,EXPOSURE_ROUTES[id]]),c.front)}${select('amount','노출 개체',[3,6,12].map(n=>[n,n+'개체']),c.amount)}</div>`;
  if(c.front==='skin')body+=`<div class="cc-bio-row cc-bio-skin">${select('wall','피부 구간',WALLS.map(w=>[w.id,w.name]),c.wall)}${button('lab-wound','상처 열기',c.wall)}</div>`;
  body+=button('lab-expose','선택한 경로로 유입','', 'class="cc-bio-primary"');
 }else if(c.page==='response'){
  body=`<div class="cc-bio-row">${select('site','관찰·대응 구역',DISTRICTS.map(d=>[d.id,d.short]),c.site)}${select('order','면역세포 명령',Object.entries(RESPONSE_ORDERS),c.order)}</div><div class="cc-bio-row">${button('lab-response','명령 적용')}${button('isolate',s.biology.sites[c.site].isolated?'격리 해제':'구역 격리',c.site)}${button('bio-focus','위치 보기',c.site)}</div>`;
 }else{
  body=`<div class="cc-drugs">${DRUGS.map(d=>button('bio-drug',d.short,d.id,`aria-pressed="${c.drug===d.id}" aria-label="${d.name} 보급 선택"`)).join('')}</div><div class="cc-bio-row">${select('route','투여 경로',Object.entries(MEDICINE_ROUTES).filter(([id])=>!(id==='oral'&&c.drug==='oxacillin')),c.route)}${select('packs','보급 상자',[1,2,3].map(n=>[n,n+'상자']),c.packs)}</div><div class="cc-bio-row">${button('lab-medicine','약품 보급 출발','','class="cc-bio-primary"')}${!sandbox?button('auto-medicine','자동 '+(s.biology.autoMedicine?'ON':'OFF')):''}</div><small class="cc-bio-note">${c.route==='oral'&&c.drug==='vancomycin'?'경구 VAN · 장내 작용':c.route==='oral'?'경구 · 장에서 흡수 후 혈류 분포':'정맥 · 투여대 도착 후 혈류 분포'}</small>`;
 }
 return `<div class="cc-biology"><nav class="cc-policy cc-bio-tabs">${[...(sandbox?[['exposure','병원체']]:[]),['medicine','약품 보급'],['response','감염·대응']].map(([id,name])=>button('bio-page',name,id,`aria-pressed="${c.page===id}"`)).join('')}</nav><div class="cc-bio-form">${body}</div><div data-city-biology-readout></div><small class="cc-bio-model">교육용 상대값 · 실제 용량 아님</small></div>`;
}
export function biologyReadout(s,data,c){
 const b=s.biology;
 if(c.page==='exposure'){
  const p=pathogenDef(c.record),stage=s.frontier.walls[Number(c.wall)];
  return `<div class="cc-bio-status">${c.front==='skin'?(stage.hp>0?'장벽 유지 · 침입 차단':'장벽 파손 · 침입 가능'):c.front==='airway'?'점액 포획 → 섬모 배출 → 폐':c.front==='gut'?'소화기 입구 → 장내 구역':'혈류 → 중심 순환'}</div><small>${p.lumen?'장내 증식 · 독소성 조직 손상':p.tag+' · 고정 분리주'} · 대기 ${s.spawn.length} / 활동 ${s.enemies.length}</small>`;
 }
 if(c.page==='response'){
  const d=b.sites[c.site],active=s.cells.filter(x=>['neutrophil','macrophage'].includes(x.kind)&&!x.recovering).length,recovering=s.cells.filter(x=>x.recovering).length;
  return `<div class="cc-bio-status">${districtDef(c.site).short} · ${STAGES[d.stage]}${d.isolated?' · 격리':''}</div>${meter('감염 부담',infectionLoad(d),'#be8d7b')}${meter('국소 염증',d.inflammation,'#d1aa72')}${d.toxin>0?meter('장내 독소',d.toxin,'#ae92b7'):''}<small>대응 ${active} · 회복 ${recovering} · 사멸 ${b.stats.losses}　${RESPONSE_ORDERS[b.order.mode]}</small>`;
 }
 const sh=s.shipments.filter(sh=>sh.kind==='drug'&&sh.drugId===c.drug&&sh.administration===c.route&&sh.phase!=='leaving');
 const depot=s.districts[c.route==='oral'?'gut':'heart'].ammo[c.drug];
 const phase=sh.length?sh.some(x=>x.phase==='transit')?'배송 중':'적재 대기':depot>0?'방출 중':'보급 대기';
 const a=medicationActivity(data,c.record,c.drug,c.route,c.route==='oral'?'gut':c.site);
 const evidence=a.category==='REGIMEN'?'경로 조건 있음':a.category==='S'?'분리주 S':a.category==='R'?'분리주 R':'조합 근거 제한';
 return `<div class="cc-bio-status">${phase} · 비축 ${Math.ceil(depot)} · 배송 ${sh.length}건</div>${meter('혈류 분포',b.blood[c.drug],'#83b8b1')}${meter('장내 잔류',b.lumen[c.drug],'#b7ad78')}<small>${pathogenDef(c.record).tag} / ${DRUGS.find(d=>d.id===c.drug).short} · ${evidence}</small>`;
}
