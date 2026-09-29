import test from 'node:test';
import { validateDataset } from '../scripts/validate-data.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entropy, newRound, price, reveal, candidates, guess, score, addDiscovery, restoreRound } from '../src/engine.mjs';
const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const sources=JSON.parse(readFileSync(new URL('../data/sources.json',import.meta.url),'utf8'));
const {records,drugs,categories}=data;
const pool = id => records.filter(r=>r.panelId===id);
const make=id=>({...newRound(records,null,()=>0,records.find(r=>r.id===id).panelId),targetId:id});
test('all records have complete, sourced observations and unique organism/phenotype pairs',()=>{
 assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 assert.equal(new Set(records.map(r=>r.taxonId+'/'+r.phenotypeId)).size,records.length);
 for(const r of records){
  for(const c of categories) assert.ok(r.hints[c.id]?.text);
  for(const drugId of data.panels.find(p=>p.id===r.panelId).drugIds){const s=r.susceptibility[drugId];assert.ok(['S','I','R','ACT','ACTIVE','INACTIVE','REGIMEN','OUTSIDE_REGIMEN'].includes(s.category));assert.notEqual(s.category,'NA');assert.ok(s.note.trim());assert.ok(s.sourceIds.length);if(s.category==='ACT'){assert.ok(['resistance-screen-negative','literature-activity','authored-isolate'].includes(s.basis));assert.ok(s.applicability);}assert.equal(s.mic,null);assert.equal(s.breakpoint,null);assert.ok(s.sourceIds.every(id=>sources[id]));}
  assert.ok(r.sourceIds.every(id=>sources[id]));
 }
});
test('entropy quotes do not expose the selected answer',()=>{
 assert.equal(entropy(['A','A','B','B']),1);
 assert.equal(entropy(['A','A']),0);
 assert.equal(entropy([]),0);
 for(const p of data.panels)for(const kind of ['hint','drug'])for(const item of kind==='hint'?categories:p.drugIds.map(id=>({id}))){
  const quotes=pool(p.id).map(r=>price(records,make(r.id),kind,item.id).cost);
  assert.equal(new Set(quotes).size,1);
 }
 assert.ok(price(records,make('SAU-001'),'hint','morphology').cost > price(records,make('SAU-001'),'hint','geography').cost);
});
test('reveal consumes one cost only, updates candidates, and ignores invalid keys',()=>{
 const start=make('SAU-002'); const round=reveal(records,start,'hint','morphology');
 assert.equal(round.actions.length,1);assert.equal(round.actions[0].cost,price(records,start,'hint','morphology').cost);
 assert.equal(candidates(records,round).length,pool(round.panelId).filter(r=>r.hints.morphology.text===records.find(r=>r.id==='SAU-002').hints.morphology.text).length);
 assert.equal(reveal(records,round,'hint','morphology'),round);
 assert.equal(reveal(records,round,'hint','invalid'),round);
 assert.equal(score(round).score,1000-4*round.actions[0].cost);
 assert.equal(start.actions.length,0);
});
test('organism AND phenotype are required; wrong hypotheses incur one penalty each',()=>{
 let round=make('SAU-002');round=guess(records,round,'SAU-001');
 assert.equal(round.status,'active');assert.equal(score(round).score,900);
 assert.equal(guess(records,round,'SAU-001'),round);
 assert.equal(guess(records,round,'not-a-record'),round);
 assert.equal(candidates(records,round).length,pool(round.panelId).length-1);
 round=guess(records,round,'SAU-002');assert.equal(round.status,'solved');
 assert.equal(reveal(records,round,'drug','vancomycin'),round);
 assert.equal(guess(records,round,'ECO-009'),round);
});
test('score clamps to zero and Archive only records completed rounds once',()=>{
 assert.equal(score({...make('SAU-001'),actions:[{cost:999}],wrongIds:[]}).score,0);
 let round=make('SAU-002');assert.deepEqual(addDiscovery({},round),{});
 round=guess(records,round,'SAU-002');let archive=addDiscovery({},round);
 assert.equal(archive['SAU-002'].bestScore,1000);assert.equal(archive['SAU-002'].solves,1);
 assert.equal(addDiscovery(archive,round),archive);
 const lower={...round,startedAt:'another-round',wrongIds:['SAU-001']};archive=addDiscovery(archive,lower);
 assert.equal(archive['SAU-002'].bestScore,1000);assert.equal(archive['SAU-002'].solves,2);
});
test('random draws cover each selected panel and avoid the previous isolate',()=>{
 for(const p of data.panels){const eligible=pool(p.id);
 const ids=new Set(eligible.map((_,i)=>newRound(records,null,()=>(i+0.5)/eligible.length,p.id).targetId));
 assert.deepEqual(ids,new Set(eligible.map(r=>r.id)));}
 for(let i=0;i<100;i++)assert.notEqual(newRound(records,'SAU-001',()=>i/100).targetId,'SAU-001');
 const subsequent=newRound(records,'SAU-001',()=>0.5);
 assert.equal(candidates(records,subsequent).length,pool(subsequent.panelId).length-1);
 assert.ok(!candidates(records,subsequent).some(r=>r.id==='SAU-001'));
});
test('all records can be uniquely identified and survive serialization',()=>{
 for(const r of records){let round=make(r.id);for(const c of categories)round=reveal(records,round,'hint',c.id);for(const d of drugs)round=reveal(records,round,'drug',d.id);
 assert.deepEqual(candidates(records,round).map(x=>x.id),[r.id]);
 assert.deepEqual(restoreRound(JSON.parse(JSON.stringify(round)),records),round);
 }
 assert.equal(restoreRound({targetId:'removed'},records),null);
 assert.equal(restoreRound({...make('SAU-001'),actions:[{kind:'hint',key:'missing',cost:2,bits:1}]},records),null);
});
test('clinically important phenotype invariants are preserved',()=>{
 const result=(id,drug)=>records.find(r=>r.id===id).susceptibility[drug].category;
 assert.equal(result('SAU-001','oxacillin'),'S');assert.equal(result('SAU-002','oxacillin'),'R');
 for(const id of ['EFA-006','EFM-008'])for(const d of ['vancomycin','teicoplanin'])assert.equal(result(id,d),'R');
 for(const d of ['piptazo','ceftazidime','cefepime','aztreonam','meropenem','imipenem','ciprofloxacin','levofloxacin'])assert.equal(result('PAE-014',d),'R');
 assert.equal(result('PAE-013','cefepime'),'I');assert.equal(result('PAE-014','ceftazavi'),'S');
 assert.equal(result('ECL-015','ceftriaxone'),'S');assert.equal(result('ECL-016','ceftriaxone'),'R');
 for(const id of ['ECL-015','ECL-016'])for(const d of ['ampicillin','cefazolin'])assert.equal(result(id,d),'R');
 assert.equal(result('ECO-010','meropenem'),'S');assert.equal(result('KPN-012','meropenem'),'R');
});

test('catalog rejects missing results, invalid categories, and empty source references',()=>{
 assert.ok(validateDataset(data,sources).results>0);
 const broken=structuredClone(data);broken.records[0].susceptibility[drugs[0].id].category='NA';
 assert.throws(()=>validateDataset(broken,sources),/invalid/);
 const empty=structuredClone(data);empty.records[0].susceptibility[drugs[0].id].sourceIds=[];
 assert.throws(()=>validateDataset(empty,sources),/missing sources/);
});

test('expanded resistance phenotypes retain distinguishing constraints',()=>{
 const ast=(id,drug)=>records.find(r=>r.id===id).susceptibility[drug].category;
 for(const id of ['EFA-401','EFM-402']){assert.equal(ast(id,'vancomycin'),'R');assert.equal(ast(id,'teicoplanin'),'S');}
 for(const id of ['ECO-405','KPN-406','PAE-411'])assert.equal(ast(id,'ceftazavi'),'R');
 assert.equal(ast('SAU-403','vancomycin'),'R');assert.equal(ast('SAU-404','linezolid'),'R');
 assert.equal(ast('GNX-202','tigecycline'),'R');
 for(const d of ['meropenem','imipenem','amikacin','gentamicin'])assert.equal(ast('GNX-213',d),'R');
});

test('anthrax activity follows CDC organism-specific exceptions',()=>{
 const r=records.find(r=>r.id==='BAN-117');
 for(const drug of ['ceftriaxone','cefepime','ceftazidime','cefazolin','ceftaroline','tmpsmx','aztreonam']){
  assert.equal(r.susceptibility[drug].category,'INACTIVE');
  assert.ok(r.susceptibility[drug].sourceIds.includes('cdc-anthrax-treatment-2023'));
 }
});

test('domain panels isolate candidates, prices, guesses, and restored progress',()=>{
 for(const p of data.panels){
  const target=pool(p.id)[0],round=make(target.id),outside=records.find(r=>r.panelId!==p.id);
  assert.deepEqual(candidates(records,round),pool(p.id));
  assert.equal(guess(records,round,outside.id),round);
  const validDrug=p.drugIds[0],opened=reveal(records,round,'drug',validDrug);
  assert.deepEqual(restoreRound(JSON.parse(JSON.stringify(opened)),records),opened);
  assert.equal(restoreRound({...opened,panelId:outside.panelId},records),null);
  assert.equal(restoreRound({...opened,wrongIds:[outside.id]},records),null);
  assert.equal(restoreRound({...opened,previousId:outside.id},records),null);
  const unavailable=drugs.find(d=>!p.drugIds.includes(d.id));
  if(unavailable)assert.equal(reveal(records,round,'drug',unavailable.id),round);
 }
});

test('restoration recomputes quotes at the time of each observation, including intervening wrong guesses',()=>{
 let round=reveal(records,make('SAU-002'),'hint','morphology');
 round=guess(records,round,'SAU-001');round=reveal(records,round,'drug','oxacillin');
 assert.deepEqual(restoreRound(structuredClone(round),records),round);
 const forged=structuredClone(round);forged.actions[0].cost=0;forged.actions[0].bits=0;
 assert.equal(restoreRound(forged,records),null);
 const shuffled=structuredClone(round);shuffled.actions[0].wrongIdsBefore=['SAU-001'];
 assert.equal(restoreRound(shuffled,records),null);
});

test('regimen data cannot silently masquerade as susceptibility or generic unknowns',()=>{
 const index=records.findIndex(r=>r.observationType==='regimen');
 const drug=Object.keys(records[index].susceptibility)[0];
 for(const edit of [a=>a.category='S',a=>a.basis='authored-isolate',a=>a.applicability='different context',a=>a.mic={value:1}]){
  const invalid=structuredClone(data);edit(invalid.records[index].susceptibility[drug]);assert.throws(()=>validateDataset(invalid,sources));
 }
 const invalid=structuredClone(data);invalid.records[0].susceptibility.oxacillin.applicability='requires-organism-specific-ast-and-clinical-context';assert.throws(()=>validateDataset(invalid,sources),/uncertainty/);
});

test('important cross-domain clinical distinctions remain explicit',()=>{
 const cell=(id,drug)=>records.find(r=>r.id===id).susceptibility[drug];
 assert.equal(cell('BGX-511','moxifloxacin').category,'REGIMEN');
 assert.equal(cell('BGX-511','levofloxacin').category,'OUTSIDE_REGIMEN');
 assert.equal(cell('BGX-537','ceftriaxone').category,'OUTSIDE_REGIMEN');
 assert.equal(cell('BGX-520','penicillin').category,'OUTSIDE_REGIMEN');
 assert.equal(cell('CAU-603','micafungin').category,'REGIMEN');
 assert.equal(cell('PJI-613','pentamidine').category,'REGIMEN');
 assert.equal(cell('PJI-613','fluconazole').category,'OUTSIDE_REGIMEN');
 assert.equal(cell('TGO-705','tmpsmx').category,'REGIMEN');
 assert.equal(cell('FHE-723','triclabendazole').category,'REGIMEN');
 assert.equal(cell('FHE-723','praziquantel').category,'OUTSIDE_REGIMEN');
 assert.equal(cell('CMV-804','ganciclovir').category,'REGIMEN');
 assert.equal(cell('CMV-804','letermovir').category,'OUTSIDE_REGIMEN');
 assert.equal(cell('CDF-121','fidaxomicin').category,'REGIMEN');
 assert.ok(!Object.hasOwn(records.find(r=>r.id==='CDF-121').susceptibility,'oxacillin'));
 for(const id of ['NOR-828','RAB-831','GNX-218'])assert.ok(Object.values(records.find(r=>r.id===id).susceptibility).every(a=>a.category==='OUTSIDE_REGIMEN'));
});
