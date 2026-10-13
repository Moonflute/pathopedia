// A deliberately simple player: fixed legal sites, paid AST, supply units, and no in-wave actions except source control.
// It sees only the current disclosed wave; it does not search paths, merge, move, retry, or tune enemy stats.
import {readFileSync} from 'node:fs';
import {createDefenseCatalog,MAPS,HOSTS} from '../../src/defense-data.mjs';
import * as E from '../../src/defense-engine.mjs';
const c=createDefenseCatalog(JSON.parse(readFileSync(new URL('../../data/organisms.json',import.meta.url),'utf8')));
const points=[[360,150],[545,270],[410,300],[540,170],[100,180],[820,300],[240,420],[630,280],[365,420],[630,180],[820,170],[100,300],[100,420],[510,420]].map(([x,y])=>({x,y}));
export function playReferenceCampaign(mapId,hostId,seed){
 const run=E.newDefenseRun(c,{mapId,hostId,seed}),reports=[];
 E.improveLab(run);E.improveLab(run);
 for(let wave=0;wave<12;wave++){
  if(run.draft.length)E.chooseSupply(run,c,'unit');
  if(E.waveIntel(run)<2)throw Error('Reference player requires disclosed AST');
  const plan=E.wavePlan(run),reserve=()=>E.upkeep(run,c)+(plan.source?70:0)+10;
  const power=id=>run.towers.filter(t=>E.towerCoverage(run,c,t,id).factor).reduce((v,t)=>v+E.POTENCY_DAMAGE[t.potency],0);
  for(let attempt=0;attempt<30;attempt++){
   const id=[...plan.pathogenIds].sort((a,b)=>power(a)-power(b))[0];
   if(power(id)>= (wave<2?3.6:wave<5?5.5:wave<9?7.8:10))break;
   const ops=[];
   for(const t of run.towers){
    const cover=E.towerCoverage(run,c,t,id);
    if(cover.factor&&t.potency<2)ops.push({type:'upgrade',tower:t,kind:'potency',cost:run.kits?0:E.upgradeCost(t,'potency'),value:1.5});
    if(!cover.factor&&E.getCoverage(c,t.drugId,id,{mapId,wave:wave+1,source:plan.source,exposure:1}).factor){if(!t.renalAdjusted)ops.push({type:'upgrade',tower:t,kind:'renal',cost:20,value:2});else if(!t.exposure)ops.push({type:'upgrade',tower:t,kind:'exposure',cost:45,value:2});}
   }
   for(const d of c.drugs){
    if(E.drugBlocked(run,d))continue;const cov=E.getCoverage(c,d.id,id,{mapId,wave:wave+1,source:plan.source,exposure:1});if(!cov.factor)continue;
    const cost=(run.unlocked.includes(d.id)?0:d.unlock)+(run.freeUnits[d.id]?0:d.cost)+(hostId==='renal'&&d.renal?20:0)+(cov.category==='I'?45:0);
    const point=points.find(p=>E.placementCheck(run,p).ok);if(point)ops.push({type:'deploy',drug:d,point,cost,value:1,cov});
   }
   const op=ops.filter(o=>o.cost+reserve()+(o.type==='deploy'?o.drug.upkeep:0)<=run.credits).sort((a,b)=>a.cost/a.value-b.cost/b.value)[0];if(!op)break;
   if(op.type==='upgrade')E.upgradeTower(run,c,op.tower.id,op.kind);
   else {E.unlockDrug(run,c,op.drug.id);E.deployDrug(run,c,op.drug.id,op.point);const t=run.towers.at(-1);if(!t.renalAdjusted)E.upgradeTower(run,c,t.id,'renal');if(op.cov.category==='I')E.upgradeTower(run,c,t.id,'exposure');}
  }
  if(!E.beginWave(run,c)){reports.push('stalled');break;}if(plan.source)E.controlSource(run);
  for(let i=0;i<3000&&run.status==='running';i++)E.tickDefense(run,c,.05);
  reports.push({wave:wave+1,hp:run.health,cash:run.credits,leaks:run.leaks,towers:run.towers.length});
  if(run.status!=='prep')break;
 }
 return {mapId,hostId,seed,status:run.status,wave:run.bestWave,hp:run.health,reports};
}
