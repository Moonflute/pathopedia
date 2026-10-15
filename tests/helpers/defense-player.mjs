import {readFileSync} from 'node:fs';
import {createDefenseCatalog,STAGES} from '../../src/defense-data.mjs';
import {newDefenseRun,startDefense,stageCoverage,deployDrug,tickDefense,upgradeSupply,improvePotency,controlSource,defenseResult} from '../../src/defense-engine.mjs';
export const catalog=createDefenseCatalog(JSON.parse(readFileSync(new URL('../../data/organisms.json',import.meta.url),'utf8')));
const slot=(drugId,exposure=0)=>({drugId,exposure});
export const STAGE_DECKS=[
 [slot('ampicillin')],
 [slot('ceftriaxone',1),slot('cefazolin',1)],
 [slot('cefazolin',1)],
 [slot('ceftriaxone'),slot('metronidazole')],
 [slot('ampicillin'),slot('vancomycin')],
 [slot('meropenem')],
 [slot('cefepime',1),slot('vancomycin')],
 [slot('meropenem'),slot('metronidazole')],
 [slot('ceftazavi')],
 [slot('linezolid'),slot('cefepime',1)],
 [slot('vancomycin'),slot('meropenem')],
 [slot('ceftazavi'),slot('vancomycin'),slot('metronidazole')]
];
// Ordinary controls only; no credit, HP, spawn or cooldown overrides.
export function playStage(index){
 const stage=STAGES[index],run=newDefenseRun(catalog,{stageId:stage.id,deck:STAGE_DECKS[index],renalAdjusted:true});
 startDefense(run,catalog);
 for(let frame=0;frame<3600&&run.status==='running';frame++){
  if(frame%6===0){
   if(run.sourceReadyAt===null&&!run.sourceControlled&&run.elapsed>14)controlSource(run);
   if(run.supplyLevel<2&&run.elapsed>3&&run.units.length>=2)upgradeSupply(run);
   if(run.potency<1&&run.elapsed>42&&run.units.length>=3)improvePotency(run);
   const ranked=run.deck.map(slot=>{
    const weight=stage.enemies.reduce((n,id)=>{
     if(!stageCoverage(catalog,stage,slot,id,run).factor)return n;
     const active=run.units.filter(u=>stageCoverage(catalog,stage,u,id,run).factor).reduce((s,u)=>s+Math.min(1,u.life/15),0);
     const enemies=run.enemies.filter(e=>e.pathogenId===id).reduce((s,e)=>s+e.hp*(1+(e.x/1000)*2),0);
     const core=run.cores.find(c=>c.pathogenId===id);
     return n+(enemies+(core?.hp||0)*.3+30)/(active+1);
    },0);
    return {id:slot.drugId,weight};
   }).sort((a,b)=>b.weight-a.weight);
   if(ranked[0])deployDrug(run,catalog,ranked[0].id);
  }
  tickDefense(run,catalog,.05);
 }
 return {stage:stage.id,status:run.status,...defenseResult(run),remaining:run.enemies.length,cores:run.cores.map(c=>Math.round(c.hp))};
}
