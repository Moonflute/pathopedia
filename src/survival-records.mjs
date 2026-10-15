import { RULESET, UPGRADE_BY_ID, UPGRADES } from './survival-data.mjs';
const safe=(n,fallback=0)=>Number.isFinite(n)&&n>=0?n:fallback;
export function normalizeSurvivalRecord(saved){
  const record={schema:2,wins:0,runs:0,bestKills:0,bestFailure:0,legacyBestTime:0,fastestWin:null,audioOn:true,history:[]};
  if(!saved||typeof saved!=='object')return record;
  for(const key of ['wins','runs','bestKills'])record[key]=Math.floor(safe(saved[key]));
  record.audioOn=saved.audioOn!==false;
  record.legacyBestTime=safe(saved.schema===2?saved.legacyBestTime:saved.bestTime);
  if(saved.schema!==2)return record; // Old "bestTime" mixed wins and failures.
  record.bestFailure=safe(saved.bestFailure);
  record.fastestWin=Number.isFinite(saved.fastestWin)&&saved.fastestWin>=300?saved.fastestWin:null;
  for(const item of Array.isArray(saved.history)?saved.history.slice(0,12):[]){
    if(!item||!['won','lost'].includes(item.status)||!Number.isInteger(item.seed)||item.seed<0||item.seed>0xffffffff)continue;
    const upgrades={};
    for(const u of UPGRADES)upgrades[u.id]=Math.min(Number.isFinite(u.max)?u.max:128,Math.floor(safe(item.upgrades?.[u.id])));
    const branches={};
    for(const [weapon,id] of Object.entries(item.branches||{}))if(UPGRADE_BY_ID[id]?.weapon===weapon)branches[weapon]=id;
    record.history.push({ruleset:item.ruleset===RULESET?RULESET:'previous',seed:item.seed,status:item.status,time:safe(item.time),kills:Math.floor(safe(item.kills)),level:Math.max(1,Math.floor(safe(item.level,1))),upgrades,branches,
      choices:(Array.isArray(item.choices)?item.choices:[]).filter(c=>c&&UPGRADE_BY_ID[c.id]).slice(0,128).map(c=>({id:c.id,time:safe(c.time),level:Math.floor(safe(c.level))}))});
  }
  return record;
}
export function saveSurvivalResult(record,run){
  if(!['won','lost'].includes(run.status))return false;
  record.runs++;record.bestKills=Math.max(record.bestKills,run.kills);
  if(run.status==='won'){record.wins++;record.fastestWin=record.fastestWin===null?run.time:Math.min(record.fastestWin,run.time);}
  else record.bestFailure=Math.max(record.bestFailure,run.time);
  record.history.unshift({ruleset:RULESET,seed:run.seed,status:run.status,time:Math.round(run.time*100)/100,kills:run.kills,level:run.level,upgrades:{...run.upgrades},branches:{...run.branches},choices:run.history.slice(0,128).map(c=>({...c}))});
  record.history=record.history.slice(0,12);return true;
}