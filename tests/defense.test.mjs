import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDefenseCatalog,MAPS,HOSTS,PROFILE_SPECS} from '../src/defense-data.mjs';
import {newDefenseRun,wavePlan,getCoverage,towerCoverage,upkeep,unlockDrug,deployDrug,upgradeTower,sellTower,improveLab,controlSource,beginWave,pauseRun,resumeRun,tickDefense,PATH_LENGTH,pathPosition} from '../src/defense-engine.mjs';
const database=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const catalog=createDefenseCatalog(database);
const richRun=options=>({...newDefenseRun(catalog,{seed:42,...options}),credits:10000});
const advance=(run,seconds)=>{for(let i=0;i<seconds*20;i++)tickDefense(run,catalog,0.05);};

test('defense imports actual Pathopedia isolate categories, notes, sources and applicability without reauthoring AST',()=>{
 for(const profile of catalog.pathogens){
  const original=database.records.find(r=>r.id===profile.recordId);
  for(const drug of catalog.drugs){assert.deepEqual(profile.ast[drug.id],original.susceptibility[drug.id]||null);}
 }
 assert.equal(catalog.pathogens.length,PROFILE_SPECS.length);
 assert.throws(()=>createDefenseCatalog({drugs:[],records:[]}),/Missing defense drug/);
});

test('every existing R and INACTIVE interaction remains ineffective at maximum potency and exposure',()=>{
 for(const map of MAPS){
  const run=richRun({mapId:map.id});
  for(const drug of catalog.drugs){
   unlockDrug(run,catalog,drug.id);deployDrug(run,catalog,drug.id,0);
   const tower=run.towers.at(-1);upgradeTower(run,catalog,tower.id,'potency');upgradeTower(run,catalog,tower.id,'potency');upgradeTower(run,catalog,tower.id,'exposure');
   for(const profile of catalog.pathogens)if(['R','INACTIVE'].includes(profile.ast[drug.id]?.category))assert.equal(towerCoverage(run,catalog,tower,profile.id).factor,0,drug.id+' / '+profile.id);
   sellTower(run,tower.id);
  }
 }
});

test('I needs its separate exposure upgrade and then has the same coverage factor as S',()=>{
 const run=richRun();unlockDrug(run,catalog,'cefepime');deployDrug(run,catalog,'cefepime',0);const tower=run.towers[0];
 assert.equal(towerCoverage(run,catalog,tower,'pseudo').category,'I');assert.equal(towerCoverage(run,catalog,tower,'pseudo').factor,0);
 upgradeTower(run,catalog,tower.id,'potency');upgradeTower(run,catalog,tower.id,'potency');assert.equal(towerCoverage(run,catalog,tower,'pseudo').factor,0);
 upgradeTower(run,catalog,tower.id,'exposure');assert.equal(towerCoverage(run,catalog,tower,'pseudo').factor,1);
 assert.equal(towerCoverage(run,catalog,tower,'mrsa').factor,0);
});

test('inhibitor combinations use their own original results rather than rescuing every beta-lactam failure',()=>{
 assert.equal(getCoverage(catalog,'ampicillin','klebs').factor,0);
 assert.equal(getCoverage(catalog,'amoxclav','klebs').factor,1);
 for(const id of ['mrsa','esbl','pseudo','kpc'])assert.equal(getCoverage(catalog,'amoxclav',id,{exposure:1}).factor,0);
 assert.equal(getCoverage(catalog,'meropenem','kpc',{exposure:1}).factor,0);
 assert.equal(getCoverage(catalog,'ceftazavi','kpc').factor,1);
 assert.equal(getCoverage(catalog,'ceftazavi','mrsa').factor,0);
});

test('site restrictions preserve the original AST category while preventing use in an unsupported site',()=>{
 for(const mapId of ['lung','abdomen']){const result=getCoverage(catalog,'cefazolin','ecoli',{mapId,exposure:1});assert.equal(result.category,'I');assert.equal(result.factor,0);assert.match(result.reason,/요로/);}
 assert.equal(getCoverage(catalog,'cefazolin','ecoli',{mapId:'urinary',exposure:1}).factor,1);
 assert.equal(getCoverage(catalog,'cefepime','pneumo').category,'ACTIVE');assert.equal(getCoverage(catalog,'cefepime','pneumo').factor,0);
});

test('regimen clues and missing records are never converted to susceptibility or resistance',()=>{
 const context={mapId:'abdomen',wave:2};
 assert.equal(getCoverage(catalog,'metronidazole','anaerobe',context).category,'REGIMEN');assert.equal(getCoverage(catalog,'metronidazole','anaerobe',context).factor,1);
 assert.equal(getCoverage(catalog,'ceftriaxone','anaerobe',context).category,'OUTSIDE_REGIMEN');assert.equal(getCoverage(catalog,'ceftriaxone','anaerobe',context).factor,0);
 assert.equal(getCoverage(catalog,'amoxclav','anaerobe',{mapId:'abdomen',wave:8,source:true}).factor,0);
 assert.equal(getCoverage(catalog,'does-not-exist','ecoli').category,'—');
});

test('renal adjustment maintains coverage and an aminopenicillin allergy does not ban all beta-lactams',()=>{
 const renal=richRun({hostId:'renal'});deployDrug(renal,catalog,'ampicillin',0);const tower=renal.towers[0];
 assert.equal(towerCoverage(renal,catalog,tower,'pneumo').factor,0);assert.equal(upgradeTower(renal,catalog,tower.id,'exposure'),false);
 upgradeTower(renal,catalog,tower.id,'renal');assert.equal(towerCoverage(renal,catalog,tower,'pneumo').factor,1);
 const allergic=richRun({hostId:'allergy'});assert.equal(deployDrug(allergic,catalog,'ampicillin',0),false);assert.equal(unlockDrug(allergic,catalog,'amoxclav'),false);assert.equal(deployDrug(allergic,catalog,'ceftriaxone',0),true);
});

test('source control removes only source protection and cannot alter antimicrobial susceptibility',()=>{
 const run=richRun({mapId:'abdomen'});run.wave=3;beginWave(run,catalog);advance(run,1);
 const bound=run.enemies.find(e=>e.sourceBound);assert.ok(bound);bound.hp=bound.maxHp*0.22;
 advance(run,2);assert.equal(bound.hp,bound.maxHp*0.22);
 const astBefore=JSON.stringify(catalog.pathogens.map(p=>p.ast));assert.equal(controlSource(run),true);advance(run,1);assert.ok(bound.hp<bound.maxHp*0.22);assert.equal(JSON.stringify(catalog.pathogens.map(p=>p.ast)),astBefore);assert.equal(controlSource(run),false);
});

test('information upgrades, upkeep, placement, refunds and pausing use the real game economy',()=>{
 const run=newDefenseRun(catalog,{seed:42});assert.equal(improveLab(run),true);assert.equal(run.lab,1);assert.equal(run.credits,180);
 assert.equal(deployDrug(run,catalog,'ampicillin',0),true);assert.equal(deployDrug(run,catalog,'ceftriaxone',0),false);
 const fee=upkeep(run,catalog),credits=run.credits;assert.equal(beginWave(run,catalog),true);assert.equal(run.credits,credits-fee);
 advance(run,1);pauseRun(run);const snapshot=JSON.stringify(run);advance(run,10);assert.equal(JSON.stringify(run),snapshot);resumeRun(run);advance(run,1);assert.ok(run.elapsed>1);
 const tower=run.towers[0],before=run.credits;sellTower(run,tower.id);assert.equal(run.credits,before+Math.floor(tower.spent*0.7));
});

test('selection pressure chooses more existing resistant isolates, never mutating an isolate AST',()=>{
 for(const map of MAPS){
  const run=richRun({mapId:map.id});run.wave=9;const normal=wavePlan(run);run.pressure=70;const selected=wavePlan(run);
  assert.equal(selected.units.length,normal.units.length+2);assert.equal(selected.selected,true);assert.equal(selected.units.at(-1).pathogenId,'kpc');
  assert.deepEqual(wavePlan(run),selected);
 }
});

test('all map and host combinations have a viable modeled response to each scheduled profile',()=>{
 for(const map of MAPS)for(const host of HOSTS)for(let index=0;index<12;index++){
  const run=richRun({mapId:map.id,hostId:host.id});run.wave=index;const plan=wavePlan(run);
  for(const pathogenId of plan.pathogenIds){
   const working=catalog.drugs.filter(d=>!(host.id==='allergy'&&['ampicillin','amoxclav'].includes(d.id))).some(d=>getCoverage(catalog,d.id,pathogenId,{mapId:map.id,wave:index+1,source:plan.source,exposure:1}).factor>0);
   assert.ok(working,map.id+' / '+host.id+' / '+pathogenId);
  }
 }
});

test('combat can reach win and loss terminal states and stops updating afterward',()=>{
 const defended=richRun();deployDrug(defended,catalog,'ampicillin',0);defended.wave=11;beginWave(defended,catalog);defended.plan.units=[{pathogenId:'pneumo',sourceBound:false}];defended.towers[0].potency=2;
 advance(defended,65);assert.equal(defended.status,'won');assert.equal(defended.bestWave,12);const snapshot=JSON.stringify(defended);advance(defended,10);assert.equal(JSON.stringify(defended),snapshot);
 const undefended=richRun({hostId:'immune'});undefended.health=7;beginWave(undefended,catalog);advance(undefended,65);assert.equal(undefended.status,'lost');assert.equal(undefended.health,0);
 assert.ok(PATH_LENGTH>1500);assert.deepEqual(pathPosition(PATH_LENGTH),{x:930,y:465});
});