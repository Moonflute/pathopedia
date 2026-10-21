import {RULE_SPECS,ruleSpec,defaultCityRules,validateCityRules} from './city-rules.mjs';

export const RULE_VIEWS={production:'실행 · 생산',transport:'실행 · 운반',combat:'실행 · 전투',building:'실행 · 건설·충원'};
export const RULE_ENDPOINTS={gut:'장 · 영양 가공소',food:'중앙 영양분',fibroblast:'섬유아세포',materials:'건축 자재',plasma:'형질세포',antibody:'표적 항체',rbc:'적혈구',organs:'장기 구역·조직',lung:'폐 · 숨결 항구',heart:'심장 · 박동 광장',kidney:'신장 · 정화 수로',marrow:'골수 · 조혈 공방',lymph:'림프절 · 기억 서고',shipment:'물자 운반원',neutrophil:'호중구',macrophage:'대식세포',pathogens:'전체 유입 병원체',skinThreat:'피부 유입 병원체',airwayThreat:'호흡기 유입 병원체',gutThreat:'소화기 유입 병원체',bloodThreat:'혈류 유입 병원체',construction:'시설 공사',roster:'세포 인력'};
export const isRuleView=v=>v?.id?.startsWith('rules-');
const ruleNode=(id,r)=>({id:'exec-'+id,label:RULE_SPECS[id].label,kind:'rule',summary:'실행 규칙',detail:'조건·수치·연결을 검증한 뒤 게임에 적용',source:'city-rules.mjs · '+id,rule:{op:id,enabled:r.enabled,params:{...r.params}}});
function ensureEndpoint(d,id){if(!d.nodes.some(n=>n.id===id))d.nodes.push({id,label:RULE_ENDPOINTS[id],kind:id.endsWith('Threat')?'threat':'rule',summary:'게임 연결 대상',detail:'실행 규칙의 입력 또는 출력',source:'city-rules.mjs'});}
export function addRuleNode(d,id,config=defaultCityRules().entries[id]){
  const spec=RULE_SPECS[id],v=d.views.find(v=>v.id==='rules-'+spec.group),n=ruleNode(id,config);
  if(d.nodes.some(x=>x.rule?.op===id))return;
  const y=70+Object.keys(v.positions).filter(id=>id.startsWith('exec-')).length*190;
  d.nodes.push(n);v.positions[n.id]={x:370,y};
  for(const [target,x]of [[spec.source,60],[config.target,680]]){ensureEndpoint(d,target);v.positions[target]||={x,y};}
  v.edges.push({id:n.id+'-in',from:spec.source,to:n.id,label:'작업 주체',kind:'signal'},{id:n.id+'-out',from:n.id,to:config.target,label:'적용 대상',kind:spec.group==='combat'?'defend':'supply'});
}
// Replacing execution flows never rewrites the user's explanatory map.
export function setRuleGraph(d,config=defaultCityRules()){
  const ids=new Set(d.nodes.filter(n=>n.rule).map(n=>n.id));
  d.nodes=d.nodes.filter(n=>!n.rule);d.views=d.views.filter(v=>!isRuleView(v));
  for(const v of d.views){for(const id of ids)delete v.positions[id];v.edges=v.edges.filter(e=>!ids.has(e.from)&&!ids.has(e.to));}
  for(const [group,name]of Object.entries(RULE_VIEWS))d.views.push({id:'rules-'+group,name,caption:'입력 → 실행 규칙 → 대상 · 수치는 게임 단위',positions:{},edges:[]});
  for(const id of Object.keys(RULE_SPECS))addRuleNode(d,id,config.entries[id]);
  d.schema=Math.max(2,d.schema||1);return d;
}
export function setRuleTarget(d,nodeID,target){
  const n=d.nodes.find(n=>n.id===nodeID),s=RULE_SPECS[n.rule.op],v=d.views.find(v=>v.id==='rules-'+s.group),p=v.positions[nodeID];
  ensureEndpoint(d,target);
  if(!v.positions[target]){const at={x:p.x+310,y:p.y};while(Object.values(v.positions).some(q=>Math.abs(q.x-at.x)<240&&Math.abs(q.y-at.y)<120))at.y+=150;v.positions[target]=at;}
  v.edges=v.edges.filter(e=>e.from!==nodeID);v.edges.push({id:nodeID+'-out',from:nodeID,to:target,label:'적용 대상',kind:s.group==='combat'?'defend':'supply'});
}
export function compileRuleGraph(d){
  const config=defaultCityRules(),errors=[],warnings=[],seen=new Set(),nodes=new Map(d.nodes.map(n=>[n.id,n]));
  for(const r of Object.values(config.entries))r.enabled=false;
  const add=(node,text,view)=>errors.push({node,text,view});
  for(const v of d.views.filter(isRuleView)){
    for(const e of v.edges){const a=nodes.get(e.from),b=nodes.get(e.to);if(!!a?.rule===!!b?.rule)add(a?.rule?a.id:b?.rule?b.id:e.from,'연결은 작업 주체 → 규칙 → 대상 순서여야 해요.',v.id);}
    for(const id of Object.keys(v.positions)){
      const n=nodes.get(id);if(!n?.rule)continue;
      const spec=ruleSpec(n.rule.op);
      if(!spec){add(id,'지원하지 않는 실행 규칙',v.id);continue;}
      if(seen.has(n.rule.op)){add(id,spec.label+' · 규칙은 하나만 배치할 수 있어요.',v.id);continue;}seen.add(n.rule.op);
      if(v.id!=='rules-'+spec.group)add(id,spec.label+' · 해당 실행 흐름으로 옮겨 주세요.',v.id);
      const incoming=v.edges.filter(e=>e.to===id),outgoing=v.edges.filter(e=>e.from===id);
      if(incoming.length!==1||incoming[0]?.from!==spec.source)add(id,spec.label+' · 입력은 '+RULE_ENDPOINTS[spec.source]+' 1개가 필요해요.',v.id);
      if(outgoing.length!==1||!spec.targets.includes(outgoing[0]?.to))add(id,spec.label+' · 지원되는 출력 대상 1개가 필요해요.',v.id);
      config.entries[n.rule.op]={enabled:n.rule.enabled,target:outgoing[0]?.to||spec.targets[0],params:{...n.rule.params}};
    }
  }
  for(const n of d.nodes.filter(n=>n.rule))if(!d.views.some(v=>isRuleView(v)&&Object.hasOwn(v.positions,n.id)))add(n.id,'실행 규칙이 실행 흐름에 배치되지 않았어요.');
  const checked=validateCityRules(config);for(const e of checked.errors)add(d.nodes.find(n=>n.rule?.op===e.rule)?.id,e.text,'rules-'+RULE_SPECS[e.rule]?.group);
  for(const [id,r]of Object.entries(config.entries)){
    const spec=RULE_SPECS[id];if(!r.enabled)warnings.push(spec.label+' 중지'+(!seen.has(id)?' · 노드 없음':''));
    else if(spec.targets.length>1&&r.target!==spec.targets[0])warnings.push(spec.label+' 대상 제한 · '+RULE_ENDPOINTS[r.target]);
    if(r.params.minOxygen>=60)warnings.push(spec.label+' · 높은 산소 기준으로 대기할 수 있어요.');
  }
  return {ok:!errors.length,config:errors.length?null:checked.config,errors,warnings};
}
export function ruleNodeSummary(n){
  const spec=ruleSpec(n.rule?.op);if(!spec)return n.summary;
  if(!n.rule.enabled)return '중지 · 검증 후 적용';
  return Object.entries(spec.fields).slice(0,2).map(([key,f])=>`${f.label} ${n.rule.params[key]}${f.unit}`).join(' · ');
}
