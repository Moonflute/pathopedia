import {pilotInventory,pilotTool,pilotCooldowns,pilotPose} from './city-pilot-state.mjs';
import {pilotJobs,pilotFoodCapacity} from './city-pilot-tasks.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {cleanLocalDebris} from './city-biology.mjs';
import {beginActivity} from './city-activity.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {sandboxCellWork} from './city-sandbox.mjs';

// All tools operate on the same city objects used by autonomous workers.
export function pilotWork(s,c,action,id,api){
 const i=pilotInventory(s),def=pilotTool(action),timers=pilotCooldowns(s);
 if(action!==i.tool||action==='engulf')return {ok:false};
 if((timers[action]||0)>s.time)return {ok:false};
 const job=pilotJobs(s,action).find(j=>j.id===id),pose=pilotPose(s),p={...groundPoint(c),y:pose.eye};
 const height=(job?.cell||job?.resident)?.45:job?.enemy?.43:job?.debris?.12:.5,range=action==='tractor'&&job?.site?2.5:def.range;
 if(!job||Math.hypot(p.x-job.x,p.z-job.z,pose.eye-height)>range)return {ok:false,text:'작업 대상 가까이 이동'};
 if(action==='tractor'&&job.debris&&Math.hypot(p.x-job.x,p.z-job.z)>1.1)return {ok:false};
 if(!pilotWorld(s.layout,pose.theme).clear(p,{...job,y:height}))return {ok:false,text:'장애물 옆으로 이동'};
 if(job.cell||job.resident){const result=sandboxCellWork(s,c,job,api);if(result.ok)timers[action]=s.time+Math.max(.8,def.interval);return result;}
 let result,kind='collect';
 if(action==='oxygen'){
  const d=s.districts[job.site],amount=Math.min(32,100-d.oxygen);if(amount<=0)return {ok:false};
  d.oxygen+=amount;s.stats.oxygen+=amount;i.target=job.site;kind='unload';result={delivered:amount,text:'산소 +'+Math.round(amount)};
 }else if(action==='nutrient'){
  const d=s.districts[job.site],amount=Math.min(20,pilotFoodCapacity(s,job.site)-d.food);if(amount<=0)return {ok:false};
  d.food+=amount;s.stats.deliveries++;kind='unload';result={delivered:amount,text:'영양 +'+Math.round(amount)};
 }else if(action==='repair'){
  const amount=Math.min(8,100-(job.barrier?s.barrier:job.entity.hp));if(amount<=0)return {ok:false,text:'복구 완료'};
  if(job.barrier)s.barrier+=amount;else job.entity.hp+=amount;kind=job.wall||job.barrier?'patch':'repair';result={amount,text:(job.barrier?'폐 장벽 복구':job.wall?'장벽 복구':'복구')+' +'+Math.round(amount)};
 }else if(action==='tractor'){
  if(job.site==='kidney'){
   const amount=Math.min(i.debris,Math.floor(24-(s.frontier?.waste.stock||0)));if(amount<1)return {ok:false,text:'집하장 처리 대기'};
   if(s.frontier)s.frontier.waste.stock+=amount;else{s.waste=Math.max(0,s.waste-amount*1.4);s.inflammation=Math.max(0,s.inflammation-amount*1.8);}
   i.debris-=amount;kind='unload';result={amount,text:'잔해 '+amount+' 하역'};
  }else{
   if(i.debris>=6)return {ok:false,text:'흡입기 가득 참 · 신장으로'};
   cleanLocalDebris(s,job.debris);s.debris=s.debris.filter(d=>d!==job.debris);i.debris++;result={amount:1,text:'잔해 수거 '+i.debris+'/6'};
  }
 }
 if(!result)return {ok:false};
 timers[action]=s.time+def.interval;
 beginActivity(s,c,kind,Math.max(.4,def.duration),groundCoordinate(job.target||job),job.site||null);
 return {ok:true,...result};
}
