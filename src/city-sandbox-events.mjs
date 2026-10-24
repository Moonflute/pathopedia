import {pilotedCell} from './city-pilot-state.mjs';
import {biologyCommand} from './city-biology.mjs';
import {homeostasisCommand} from './city-homeostasis.mjs';

const schedules=new WeakMap();
function schedule(s){let state=schedules.get(s);if(!state){state={enabled:true,remaining:35,sequence:0};schedules.set(s,state);}return state;}
export const sandboxEventsEnabled=s=>schedule(s).enabled;
export function setSandboxEvents(s,on){schedule(s).enabled=!!on;}
// Small disturbances use the existing intake, exposure and feedback mechanisms.
// Time advances only while exploring; manual experiments retain their own rules.
export function tickSandboxEvents(s,dt,data,api){
 const q=schedule(s);if(!pilotedCell(s)||!q.enabled||s.scenario!=='simulation')return;
 q.remaining-=dt;if(q.remaining>0)return;q.remaining=55+q.sequence%3*12;
 const actions=['meal','exposure','exercise','drink','rest'],action=actions[q.sequence++%actions.length];
 if(action==='exposure'){
  if(s.enemies.some(e=>!e.dead)||s.spawn.length||Object.values(s.districts).some(d=>d.hp<70))return;
  biologyCommand(s,'expose',{recordId:'SPN-105',front:'airway',amount:3},data,api);
 }else if(s.homeostasis){const result=homeostasisCommand(s,'home-action',action);if(result?.ok)api.log(s,'현장 변화 · '+result.text);}
}
