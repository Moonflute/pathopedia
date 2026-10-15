import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDefenseCatalog,STAGES,MAPS} from '../src/defense-data.mjs';
import {getCoverage,stageCoverage,deckReadiness,normalizeDeck,newDefenseRun,startDefense,deployDrug,tickDefense,controlSource,pauseRun} from '../src/defense-engine.mjs';
const database=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8')),catalog=createDefenseCatalog(database);
const slot=(drugId,exposure=0)=>({drugId,exposure});
test('the deck game retains original AST, source notes and site applicability',()=>{
 for(const p of catalog.pathogens)for(const d of catalog.drugs)assert.deepEqual(p.ast[d.id],database.records.find(r=>r.id===p.recordId).susceptibility[d.id]||null);
 for(const map of MAPS)for(const p of catalog.pathogens)for(const d of catalog.drugs)if(['R','INACTIVE'].includes(p.ast[d.id]?.category))assert.equal(getCoverage(catalog,d.id,p.id,{mapId:map.id,exposure:1}).factor,0);
});
test('increased exposure addresses I only; combos do not bypass other mechanisms',()=>{
 assert.equal(getCoverage(catalog,'cefepime','pseudo').factor,0);assert.equal(getCoverage(catalog,'cefepime','pseudo',{exposure:1}).factor,1);
 assert.equal(getCoverage(catalog,'cefazolin','ecoli',{mapId:'lung',exposure:1}).factor,0);assert.equal(getCoverage(catalog,'cefazolin','ecoli',{mapId:'urinary',exposure:1}).factor,1);
 assert.equal(getCoverage(catalog,'amoxclav','klebs').factor,1);for(const id of ['mrsa','esbl','pseudo','kpc'])assert.equal(getCoverage(catalog,'amoxclav',id,{exposure:1}).factor,0);
 assert.equal(getCoverage(catalog,'ceftazavi','kpc').factor,1);assert.equal(getCoverage(catalog,'meropenem','kpc',{exposure:1}).factor,0);
 const anaerobe=getCoverage(catalog,'metronidazole','anaerobe',{mapId:'abdomen'});assert.equal(anaerobe.category,'REGIMEN');assert.equal(anaerobe.factor,1);
 assert.equal(getCoverage(catalog,'amoxclav','anaerobe',{mapId:'abdomen',source:true}).factor,0);
 assert.equal(getCoverage(catalog,'cefepime','pneumo').category,'ACTIVE');assert.equal(getCoverage(catalog,'cefepime','pneumo').factor,0);
});
test('deck validation includes budget, site, host and exposure; no universal four-drug solution',()=>{
 assert.equal(deckReadiness(catalog,STAGES[0],[]).ok,false);
 assert.equal(deckReadiness(catalog,STAGES[2],[slot('cefazolin',1)]).ok,false);
 assert.equal(deckReadiness(catalog,STAGES[2],[slot('cefazolin',1)],{renalAdjusted:true}).ok,true);
 assert.equal(stageCoverage(catalog,STAGES[1],slot('ampicillin'),'pneumo').factor,0);
 const universal=[slot('ceftazavi'),slot('vancomycin'),slot('linezolid'),slot('metronidazole')];
 assert.equal(deckReadiness(catalog,STAGES[11],universal).points,12);assert.equal(deckReadiness(catalog,STAGES[11],universal).ok,false);
 assert.equal(deckReadiness(catalog,STAGES[11],universal.filter(s=>s.drugId!=='linezolid')).ok,true);
 assert.deepEqual(normalizeDeck(catalog,[null,slot('fake'),slot('ampicillin'),slot('ampicillin',1)]),[slot('ampicillin')]);
});
test('the selected deck is copied and frozen; unselected drugs, cooldown spam and pause cannot produce units',()=>{
 const deck=[slot('ampicillin')],run=newDefenseRun(catalog,{deck});assert.equal(startDefense(run,catalog),true);deck[0].drugId='meropenem';
 assert.equal(run.deck[0].drugId,'ampicillin');assert.equal(Object.isFrozen(run.deck[0]),true);
 assert.equal(deployDrug(run,catalog,'meropenem'),false);assert.equal(deployDrug(run,catalog,'ampicillin'),true);assert.equal(deployDrug(run,catalog,'ampicillin'),false);
 pauseRun(run);const credits=run.credits;tickDefense(run,catalog,.1);assert.equal(run.credits,credits);assert.equal(deployDrug(run,catalog,'ampicillin'),false);
});
test('inactive antibiotics neither damage nor physically block resistant pathogens',()=>{
 const run=newDefenseRun(catalog,{stageId:'kpc',deck:[slot('ceftazavi')],renalAdjusted:true});startDefense(run,catalog);
 run.enemies=[{id:999,pathogenId:'kpc',x:500,speed:25,hp:100,maxHp:100,flash:0,attackCooldown:0}];
 run.units=[{id:998,drugId:'ampicillin',x:502,life:30,maxLife:30,cooldown:0,attack:0,exposure:1}];
 tickDefense(run,catalog,.1);assert.equal(run.enemies[0].x,502.5);assert.ok(run.enemies[0].hp>99.9);assert.equal(run.projectiles.length,0);
});
test('source control is a timed separate action and never changes AST',()=>{
 const run=newDefenseRun(catalog,{stageId:'abscess',deck:[slot('ceftriaxone'),slot('metronidazole')]});startDefense(run,catalog);
 const before=getCoverage(catalog,'ceftriaxone','anaerobe',{mapId:'abdomen'});
 assert.equal(controlSource(run),true);assert.equal(run.sourceControlled,false);assert.equal(controlSource(run),false);
 for(let i=0;i<41;i++)tickDefense(run,catalog,.1);assert.equal(run.sourceControlled,true);
 assert.deepEqual(getCoverage(catalog,'ceftriaxone','anaerobe',{mapId:'abdomen'}),before);
});
