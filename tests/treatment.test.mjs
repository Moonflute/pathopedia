import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTreatmentCatalog } from '../scripts/validate-treatment.mjs';
import { treatmentPool, newTreatmentSession, answerTreatment, nextTreatmentQuestion, treatmentStats, recordTreatmentProgress, restoreTreatmentSession, restoreTreatmentProgress } from '../src/treatment-engine.mjs';

const catalog = JSON.parse(readFileSync(new URL('../data/treatment-questions.json', import.meta.url),'utf8'));
const question = id => catalog.questions.find(q => q.id === id);
const sessionFor = id => {
  const q=question(id),s=newTreatmentSession(catalog,{track:q.track,limit:1});
  return {...s,questionIds:[id],optionOrders:{[id]:q.options.map(o=>o.id)}};
};
const correctOption = id => {const q=question(id);return q.options.find(o=>o.id===q.answerId);};

test('treatment questions have complete clinical context, choice explanations and precise guideline references',()=>{
  assert.deepEqual(validateTreatmentCatalog(catalog),{questions:32,tracks:{empiric:10,pathogen:12,disease:10},sources:21});
});
test('catalog rejects invalid answers, missing rationale, incomplete clinical context and unknown references',()=>{
  for(const mutate of [
    c=>{c.questions[0].answerId='missing';},
    c=>{c.questions[0].options[1].rationale='';},
    c=>{c.questions[0].context=[];},
    c=>{c.questions[0].sourceRefs[0].id='unknown';},
    c=>{c.questions[0].sourceRefs[0].section='';},
    c=>{c.questions[0].explanation.alternatives='';},
  ]){const broken=structuredClone(catalog);mutate(broken);assert.throws(()=>validateTreatmentCatalog(broken),/treatment catalog/);}
});
test('track-specific sets have no duplicate questions, retain all choices and shuffle answer position',()=>{
  for(const track of ['mixed',...catalog.tracks.map(t=>t.id)]){
    const s=newTreatmentSession(catalog,{track,limit:100,random:()=>0});
    assert.equal(s.questionIds.length,treatmentPool(catalog,track).length);
    assert.equal(new Set(s.questionIds).size,s.questionIds.length);
    for(const id of s.questionIds){assert.ok(track==='mixed'||question(id).track===track);assert.deepEqual([...s.optionOrders[id]].sort(),question(id).options.map(o=>o.id).sort());}
  }
  const s=newTreatmentSession(catalog,{random:()=>0});
  assert.ok(s.questionIds.some(id=>s.optionOrders[id][0]!==question(id).answerId));
  assert.throws(()=>newTreatmentSession(catalog,{track:'unknown'}));
  assert.throws(()=>newTreatmentSession(catalog,{limit:0}));
});
test('one submission locks an answer and repeated submissions cannot change an incorrect result',()=>{
  const start=sessionFor('bug-esbl-bacteremia'),q=question(start.questionIds[0]),wrong=q.options.find(o=>o.id!==q.answerId).id;
  const answered=answerTreatment(catalog,start,wrong);
  assert.equal(answered.answers[q.id].outcome,'wrong');
  assert.equal(answerTreatment(catalog,answered,q.answerId),answered);
  assert.equal(answerTreatment(catalog,answered,null,true),answered);
  assert.equal(answerTreatment(catalog,start,'invalid'),start);
  assert.equal(nextTreatmentQuestion(start),start);
  assert.equal(start.answers[q.id],undefined);
});
test('answer reveal is excluded from accuracy and marks the question for review, including after reload',()=>{
  const start=sessionFor('disease-cdi-fulminant'),s=answerTreatment(catalog,start,null,true);
  assert.deepEqual(treatmentStats(s),{correct:0,wrong:0,revealed:1,answered:0,completed:1,streak:0,accuracy:null});
  const progress=recordTreatmentProgress({},s);
  assert.equal(progress['disease-cdi-fulminant'].attempts,0);
  assert.equal(progress['disease-cdi-fulminant'].needsReview,true);
  assert.deepEqual(restoreTreatmentSession(JSON.parse(JSON.stringify(s)),catalog),s);
  assert.deepEqual(restoreTreatmentProgress(JSON.parse(JSON.stringify(progress)),catalog),progress);
});
test('review pool tracks mistakes and removes a question after a later unassisted correct answer',()=>{
  const start=sessionFor('bug-ndm'),q=question('bug-ndm'),wrong=q.options.find(o=>o.id!==q.answerId).id;
  const first=answerTreatment(catalog,start,wrong);
  let progress=recordTreatmentProgress({},first);
  assert.equal(recordTreatmentProgress(progress,first),progress);
  assert.deepEqual(treatmentPool(catalog,'mixed',true,progress).map(q=>q.id),['bug-ndm']);
  assert.equal(treatmentPool(catalog,'empiric',true,progress).length,0);
  const review=newTreatmentSession(catalog,{track:'pathogen',reviewOnly:true,progress});
  progress=recordTreatmentProgress(progress,answerTreatment(catalog,review,q.answerId));
  assert.equal(progress[q.id].attempts,2);assert.equal(progress[q.id].correct,1);assert.equal(progress[q.id].needsReview,false);
  assert.equal(newTreatmentSession(catalog,{reviewOnly:true,progress}),null);
});
test('all questions can finish a set, survive serialization and stop at completion',()=>{
  let s=newTreatmentSession(catalog,{limit:catalog.questions.length}),progress={};
  for(const id of s.questionIds){s=answerTreatment(catalog,s,question(id).answerId);progress=recordTreatmentProgress(progress,s);s=nextTreatmentQuestion(s);s=restoreTreatmentSession(JSON.parse(JSON.stringify(s)),catalog);assert.ok(s);}
  assert.equal(s.index,32);assert.equal(treatmentStats(s).accuracy,100);assert.equal(treatmentStats(s).streak,32);
  assert.equal(nextTreatmentQuestion(s),s);assert.equal(answerTreatment(catalog,s,'a'),s);
  assert.equal(Object.keys(progress).length,32);assert.equal(treatmentPool(catalog,'mixed',true,progress).length,0);
});
test('restoration rejects corrupted choices, fabricated outcomes, future answers and invalid progress',()=>{
  const s=answerTreatment(catalog,sessionFor('disease-gonorrhea'),question('disease-gonorrhea').answerId);
  for(const mutate of [
    s=>{s.optionOrders[s.questionIds[0]]=['a','a','a','a'];},
    s=>{s.answers[s.questionIds[0]].outcome='wrong';},
    s=>{s.index=-1;},
    s=>{s.questionIds.push(s.questionIds[0]);},
    s=>{s.track='empiric';},
    s=>{s.answers['extra']={outcome:'correct'};},
  ]){const broken=structuredClone(s);mutate(broken);assert.equal(restoreTreatmentSession(broken,catalog),null);}
  const progress=recordTreatmentProgress({},s);progress['disease-gonorrhea'].correct=100;
  assert.deepEqual(restoreTreatmentProgress(progress,catalog),{});
  assert.equal(restoreTreatmentSession(null,catalog),null);
  const unanswered=sessionFor('disease-gonorrhea');
  for(const value of [1,'corrupt',true,[],null]){
    assert.equal(restoreTreatmentSession({...unanswered,answers:value},catalog),null);
    assert.equal(restoreTreatmentSession({...unanswered,optionOrders:value},catalog),null);
  }
});
test('2026 AMR changes and limited clinical evidence stay explicit',()=>{
  assert.equal(catalog.sources['amr-2026'].year,2026);
  assert.match(correctOption('bug-ndm').text,/Aztreonam-avibactam/);
  assert.match(question('bug-ndm').explanation.alternatives,/Ceftazidime|ceftazidime/);
  assert.match(correctOption('bug-stenotrophomonas').text,/Cefiderocol/);
  assert.match(question('bug-stenotrophomonas').evidence,/動物|동물/);
  assert.match(question('bug-ampc').explanation.alternatives,/비중증/);
  assert.match(question('bug-crab').explanation.alternatives,/9 g\/day/);
});
test('route, site and valid alternative distinctions are not lost in explanations',()=>{
  assert.match(correctOption('bug-esbl-oral-switch').text,/TMP-SMX/);
  assert.match(question('bug-esbl-oral-switch').options.find(o=>/Nitrofurantoin/.test(o.text)).rationale,/신실질/);
  assert.match(question('bug-mrsa-pneumonia').options.find(o=>/Daptomycin/.test(o.text)).rationale,/표면활성제/);
  assert.match(correctOption('disease-cdi-fulminant').text,/IV metronidazole/);
  assert.match(question('disease-cdi-initial').options.find(o=>/^Vancomycin 125/.test(o.text)).rationale,/적절한 대안/);
  assert.match(correctOption('bug-enterococcus-ie').text,/Ampicillin \+ ceftriaxone/);
  assert.match(question('bug-enterococcus-ie').explanation.regimen,/6주/);
  assert.match(correctOption('disease-asb-diabetes').text,/투여하지/);
});
