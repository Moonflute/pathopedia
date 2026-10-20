// Declarative, bounded game rules. The graph is compiled once when applied;
// the simulation only reads this small table (no graph traversal or eval).
export const CITY_RULES_KEY='pathopedia:cell-city:rules:v1';
const field=(label,value,min,max,unit='')=>({label,value,min,max,unit});
const oxygen=()=>field('최소 산소',0,0,95,'%');
const districts=['lung','heart','gut','kidney','marrow','lymph'];
const threats=['pathogens','skinThreat','airwayThreat','gutThreat','bloodThreat'];
export const RULE_SPECS=Object.freeze({
  food:{label:'영양 가공',group:'production',source:'gut',targets:['food'],fields:{rate:field('초당 가공량',1.8,.1,9,'/초'),minOxygen:oxygen()}},
  materials:{label:'자재 제작',group:'production',source:'fibroblast',targets:['materials'],fields:{amount:field('기본 생산량',1.4,.1,7),cost:field('영양 비용',.6,.1,5),interval:field('생산 간격',4,1,20,'초'),reserve:field('시작 영양 기준',1,0,100),minOxygen:oxygen()}},
  antibody:{label:'항체 생산',group:'production',source:'plasma',targets:['antibody'],fields:{amount:field('기본 생산량',1,.1,5),cost:field('지역 영양 비용',.2,.05,5),duration:field('작업 시간',1.2,.3,4,'초'),interval:field('작업 후 대기',.8,.2,10,'초'),minOxygen:oxygen()}},
  oxygen:{label:'산소 운반',group:'transport',source:'rbc',targets:['organs',...districts.filter(id=>id!=='lung')],fields:{amount:field('기본 적재량',32,4,64),duration:field('적재·하역 시간',.75,.25,4,'초'),minOxygen:oxygen()}},
  supply:{label:'영양 배송',group:'transport',source:'shipment',targets:['organs',...districts],fields:{amount:field('기본 배송량',8,1,24),interval:field('주문 간격',2.5,1,20,'초'),threshold:field('현장 재고 미만',22,1,32),reserve:field('배송 후 중앙 비축',0,0,200),minOxygen:oxygen()}},
  freight:{label:'물류 이동',group:'transport',source:'heart',targets:['shipment'],fields:{speed:field('기본 이동 속도',85,20,170),duration:field('물자 적재·하역',.85,.25,4,'초')}},
  neutrophil:{label:'호중구 전투',group:'combat',source:'neutrophil',targets:threats,fields:{damage:field('기본 피해량',4,.5,20),interval:field('공격 간격',1.3,.6,6,'초'),range:field('공격 거리',34,20,70),minOxygen:oxygen()}},
  macrophage:{label:'대식세포 전투',group:'combat',source:'macrophage',targets:threats,fields:{damage:field('기본 피해량',8,1,32),interval:field('공격 간격',1.8,.6,8,'초'),range:field('공격 거리',34,20,70),minOxygen:oxygen()}},
  construction:{label:'시설 건설',group:'building',source:'fibroblast',targets:['construction',...districts],fields:{speed:field('작업 속도 배율',1,.25,3,'배'),minOxygen:oxygen()}},
  recruit:{label:'세포 충원',group:'building',source:'marrow',targets:['roster'],fields:{speed:field('생산 속도 배율',1,.25,3,'배'),minOxygen:oxygen()}}
});
export const ruleSpec=id=>Object.hasOwn(RULE_SPECS,id)?RULE_SPECS[id]:null;
export function defaultCityRules(){return {schema:1,entries:Object.fromEntries(Object.entries(RULE_SPECS).map(([id,s])=>[id,{enabled:true,target:s.targets[0],params:Object.fromEntries(Object.entries(s.fields).map(([k,f])=>[k,f.value]))}]))};}
export function validateCityRules(value){
  const errors=[];const add=(rule,text)=>errors.push({rule,text});
  if(!value||value.schema!==1||!value.entries||Array.isArray(value.entries))return {ok:false,errors:[{text:'실행 규칙 형식 오류'}]};
  for(const id of Object.keys(value.entries))if(!Object.hasOwn(RULE_SPECS,id))add(id,'지원하지 않는 규칙');
  const entries={};
  for(const [id,s]of Object.entries(RULE_SPECS)){
    const r=value.entries[id];if(!r||typeof r.enabled!=='boolean'||!s.targets.includes(r.target)||!r.params||Array.isArray(r.params)){add(id,s.label+' · 작동 상태·목적지 오류');continue;}
    const params={};for(const [key,f]of Object.entries(s.fields)){const v=r.params[key];if(typeof v!=='number'||!Number.isFinite(v)||v<f.min||v>f.max)add(id,`${s.label} · ${f.label}: ${f.min}~${f.max}${f.unit}`);else params[key]=v;}
    if(Object.keys(r.params).some(k=>!Object.hasOwn(s.fields,k)))add(id,s.label+' · 지원하지 않는 수치');
    entries[id]={enabled:r.enabled,target:r.target,params};
  }
  return {ok:!errors.length,errors,config:errors.length?null:{schema:1,entries}};
}
const defaults=defaultCityRules();
export const cityRule=(s,id)=>s.specialists&&s.rules?.entries?.[id]||defaults.entries[id];
export function ruleReady(s,id,site){const r=cityRule(s,id);return r.enabled&&(!site||s.districts[site].oxygen>=(r.params.minOxygen||0));}
export function ruleTarget(s,id,site){const target=cityRule(s,id).target;return ['organs','construction'].includes(target)||target===site;}
export function ruleEnemy(s,id,e){const t=cityRule(s,id).target;return t==='pathogens'||e.front===t.replace('Threat','');}
export function ruleFingerprint(config){const result=validateCityRules(config);return result.ok?JSON.stringify(result.config):'';}
export function ruleChanges(before,after){
  const changes=[];for(const [id,s]of Object.entries(RULE_SPECS)){const a=before.entries[id],b=after.entries[id];
    if(a.enabled!==b.enabled)changes.push({rule:id,field:'작동',from:a.enabled?'켜짐':'꺼짐',to:b.enabled?'켜짐':'꺼짐'});
    if(a.target!==b.target)changes.push({rule:id,field:'연결 대상',from:a.target,to:b.target});
    for(const [k,f]of Object.entries(s.fields))if(a.params[k]!==b.params[k])changes.push({rule:id,field:f.label,from:a.params[k],to:b.params[k]});
  }return changes;
}
export function loadRuleProfile(storage){
  try{const raw=storage?.getItem(CITY_RULES_KEY);if(!raw||raw.length>32000)return null;const p=JSON.parse(raw),current=validateCityRules(p.current),previous=p.previous?validateCityRules(p.previous):null;return p.schema===1&&current.ok?{schema:1,current:current.config,previous:previous?.ok?previous.config:null}:null;}catch{return null;}
}
// Persist first. A quota failure must never leave a half-applied running game.
export function storeRuleProfile(storage,current,previous){
  const a=validateCityRules(current),b=validateCityRules(previous);if(!a.ok||!b.ok)return false;
  try{storage.setItem(CITY_RULES_KEY,JSON.stringify({schema:1,current:a.config,previous:b.config}));return true;}catch{return false;}
}
export function applyCityRules(s,config){
  const checked=validateCityRules(config);if(!s.specialists||!checked.ok)return {ok:false,text:'규칙 검증 실패'};
  s.rules=checked.config;
  // Paid deliveries and batches keep their cargo/yield. Only subsequent jobs
  // take new settings; clocks are bounded so changing a rule takes effect soon.
  s.supplyClock=Math.min(s.supplyClock,cityRule(s,'supply').params.interval);
  return {ok:true,text:'게임 규칙 적용 완료'};
}
