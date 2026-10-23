import {pilotInventory,pilotTool,pilotCooldowns} from './city-pilot-state.mjs';
import {pilotJobs,pilotFoodCapacity} from './city-pilot-tasks.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {cityRule,ruleReady,ruleTarget} from './city-rules.mjs';
import {cleanLocalDebris} from './city-biology.mjs';
import {receiveAntigen} from './city-frontier.mjs';
import {beginActivity} from './city-activity.mjs';

// All tools operate on the same city objects used by autonomous workers.
export function pilotWork(s,c,action,id,api){
 const i=pilotInventory(s),def=pilotTool(action),timers=pilotCooldowns(s);
 if(action!==i.tool||action==='engulf')return {ok:false};
 if((timers[action]||0)>s.time)return {ok:false};
 const job=pilotJobs(s,action).find(j=>j.id===id),p=groundPoint(c);
 if(!job||Math.hypot(p.x-job.x,p.z-job.z)>def.range)return {ok:false,text:'작업 대상 가까이 이동'};
 let result,kind='collect';
 if(action==='oxygen'){
  const target=job.site,d=s.districts[target],rule=cityRule(s,'oxygen');
  if(!ruleReady(s,'oxygen',target)||i.oxygen&&!ruleTarget(s,'oxygen',target))return {ok:false,text:'현재 산소 운반 규칙에서 작업 불가'};
  if(i.oxygen){const amount=Math.min(i.oxygen,100-d.oxygen);d.oxygen+=amount;s.stats.oxygen+=amount;i.oxygen=Math.max(0,i.oxygen-amount);i.target=target;kind='unload';result={delivered:amount,text:'산소 +'+Math.round(amount)};}
  else{i.oxygen=rule.params.amount*(1+(d.level-1)*.25)*api.output(s,'lung')*(s.weather.id==='dry'?.55:1);kind='load';result={loaded:i.oxygen,text:'산소 적재 완료'};}
 }else if(action==='nutrient'){
  if(i.nutrient){const d=s.districts[job.site],amount=Math.min(i.nutrient,pilotFoodCapacity(s,job.site)-d.food);d.food+=amount;i.nutrient=Math.max(0,i.nutrient-amount);s.stats.deliveries++;kind='unload';result={delivered:amount,text:'영양 +'+Math.round(amount)};}
  else{const amount=Math.min(20,s.resources.food);if(amount<1)return {ok:false,text:'창고 영양 부족'};s.resources.food-=amount;i.nutrient=amount;kind='load';result={loaded:amount,text:'영양 '+Math.round(amount)+' 적재'};}
 }else if(action==='repair'){
  const amount=Math.min(8,100-job.entity.hp),cost=Math.ceil(amount/4);
  if(s.resources.materials<cost)return {ok:false,text:'재료 부족'};
  if(c.energy<2)return {ok:false,text:'에너지 부족 · 심장에서 회복'};
  s.resources.materials-=cost;c.energy-=2;job.entity.hp+=amount;kind='repair';result={amount,text:'복구 +'+Math.round(amount)+' · 재료 −'+cost};
 }else if(action==='cleanup'){
  if(job.site==='kidney'){
   const amount=Math.min(i.debris,Math.floor(24-(s.frontier?.waste.stock||0)));if(amount<1)return {ok:false,text:'집하장 처리 대기'};
   if(s.frontier)s.frontier.waste.stock+=amount;else{s.waste=Math.max(0,s.waste-amount*1.4);s.inflammation=Math.max(0,s.inflammation-amount*1.8);}
   i.debris-=amount;kind='unload';result={amount,text:'잔해 '+amount+' 하역'};
  }else{
   if(i.debris>=6)return {ok:false,text:'흡입기 가득 참 · 신장으로'};
   cleanLocalDebris(s,job.debris);s.debris=s.debris.filter(d=>d!==job.debris);i.debris++;result={amount:1,text:'잔해 수거 '+i.debris+'/6'};
  }
 }else if(action==='patch'){
  if(c.energy<4)return {ok:false,text:'에너지 부족 · 심장에서 회복'};
  c.energy-=4;const amount=job.entity?Math.min(12,25-job.entity.hp):Math.min(4,100-s.barrier);
  if(job.entity)job.entity.hp+=amount;else s.barrier+=amount;
  s.stats.clots=(s.stats.clots||0)+1;kind='patch';result={amount,text:job.entity?'응급 봉합 +'+Math.round(amount):'폐 장벽 +'+Math.round(amount)};
 }else if(action==='antigen'){
  if(i.antigen){receiveAntigen(s,i.antigen,api);i.antigen=null;kind='present';result={text:'림프절 · 항원 접수'};}
  else{if(c.energy<2)return {ok:false,text:'에너지 부족 · 심장에서 회복'};c.energy-=2;i.antigen=job.recordId;result={text:'항원 채집 · 림프절로'};}
 }else if(action==='signal'){
  if(c.energy<10)return {ok:false,text:'에너지 부족 · 심장에서 회복'};
  c.energy-=10;s.rally=job.site;s.districts[job.site].supportUntil=s.time+15;s.stats.signals=(s.stats.signals||0)+1;kind='signal';result={text:'방어 지원 · 15초'};
 }else if(action==='scanner'){
  const e=job.enemy,d=job.entity;
  result={text:e?`${job.name} · HP ${Math.ceil(e.hp)}/${Math.ceil(e.maxHp||e.hp)}`:`${job.name.replace(' · 진단','')} · HP ${Math.round(d.hp)} · O₂ ${Math.round(d.oxygen)} · 영양 ${Math.round(d.food)}`,scan:job};
 }
 if(!result)return {ok:false};
 timers[action]=s.time+def.interval;
 if(action!=='scanner')beginActivity(s,c,kind,Math.max(.4,def.duration),groundCoordinate(job),job.site||null);
 return {ok:true,...result};
}
