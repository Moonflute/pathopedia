import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entropy, newRound, price, reveal, candidates, guess, score, addDiscovery, restoreRound } from '../src/engine.mjs';
const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const sources=JSON.parse(readFileSync(new URL('../data/sources.json',import.meta.url),'utf8'));
const {records,drugs,categories}=data;
const make=id=>({...newRound(records,null,()=>0),targetId:id});
test('all records have complete, sourced observations and unique organism/phenotype pairs',()=>{
 assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 assert.equal(new Set(records.map(r=>r.taxonId+'/'+r.phenotypeId)).size,records.length);
 for(const r of records){
  for(const c of categories) assert.ok(r.hints[c.id]?.text);
  for(const d of drugs){const s=r.susceptibility[d.id];assert.ok(['S','I','R','NA'].includes(s.category));assert.equal(s.mic,null);assert.equal(s.breakpoint,null);assert.ok(s.sourceIds.every(id=>sources[id]));}
  assert.ok(r.sourceIds.every(id=>sources[id]));
 }
});
test('entropy quotes do not expose the selected answer',()=>{
 assert.equal(entropy(['A','A','B','B']),1);
 assert.equal(entropy(['A','A']),0);
 assert.equal(entropy([]),0);
 for(const kind of ['hint','drug'])for(const item of kind==='hint'?categories:drugs){
  const quotes=records.map(r=>price(records,make(r.id),kind,item.id).cost);
  assert.equal(new Set(quotes).size,1);
 }
 assert.ok(price(records,make('SAU-001'),'hint','morphology').cost > price(records,make('SAU-001'),'hint','geography').cost);
});
test('reveal consumes one cost only, updates candidates, and ignores invalid keys',()=>{
 const start=make('SAU-002'); const round=reveal(records,start,'hint','morphology');
 assert.equal(round.actions.length,1);assert.equal(round.actions[0].cost,33);
 assert.equal(candidates(records,round).length,4);
 assert.equal(reveal(records,round,'hint','morphology'),round);
 assert.equal(reveal(records,round,'hint','invalid'),round);
 assert.equal(score(round).score,868);
 assert.equal(start.actions.length,0);
});
test('organism AND phenotype are required; wrong hypotheses incur one penalty each',()=>{
 let round=make('SAU-002');round=guess(records,round,'SAU-001');
 assert.equal(round.status,'active');assert.equal(score(round).score,900);
 assert.equal(guess(records,round,'SAU-001'),round);
 assert.equal(guess(records,round,'not-a-record'),round);
 assert.equal(candidates(records,round).length,15);
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
test('random draws cover the pool and avoid the previous isolate',()=>{
 const ids=new Set(records.map((_,i)=>newRound(records,null,()=>i/records.length).targetId));
 assert.equal(ids.size,records.length);
 for(let i=0;i<100;i++)assert.notEqual(newRound(records,'SAU-001',()=>i/100).targetId,'SAU-001');
 const subsequent=newRound(records,'SAU-001',()=>0.5);
 assert.equal(candidates(records,subsequent).length,15);
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
