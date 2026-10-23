import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityInfoDocument} from '../src/city-info-data.mjs';
import {CITY_INFO_KEY,createInfoEditor,parseCityInfo,loadCityInfo} from '../src/city-info-model.mjs';

test('shipped interaction map is complete and explanation/execution flows can round-trip',()=>{
  const d=createCityInfoDocument();assert.deepEqual(parseCityInfo(JSON.stringify(d)),d);
  const shown=new Set(d.views.flatMap(v=>Object.keys(v.positions)));
  assert.equal(shown.size,d.nodes.length);
  for(const id of ['lung','heart','gut','kidney','marrow','lymph','rbc','neutrophil','macrophage','fibroblast','dendritic','helperT','plasma','platelet','eosinophil','basophil','monocyte','mast','nk','bcell','cd8','treg'])assert.ok(shown.has(id),id);
});
test('content, position and connection edits survive save/load independently of the game',()=>{
  const stored=new Map([['pathopedia:cell-city:v1','existing city save']]),storage={getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)};
  const e=createInfoEditor();e.change(d=>{d.nodes.find(n=>n.id==='lung').label='새 숨결 항구';d.views[0].positions.lung={x:-80,y:120};d.views[0].edges[0].label='사용자 메모';});
  assert.equal(e.dirty,true);assert.equal(e.save(storage),true);assert.equal(e.dirty,false);
  assert.deepEqual(loadCityInfo(storage).document,e.document);assert.equal(stored.get('pathopedia:cell-city:v1'),'existing city save');assert.ok(stored.has(CITY_INFO_KEY));
});
test('deleting a node with its connections, reset, import, undo and redo preserve valid history',()=>{
  const original=createCityInfoDocument(),e=createInfoEditor(original);
  e.change(d=>{delete d.views[0].positions.lung;d.views[0].edges=d.views[0].edges.filter(x=>x.from!=='lung'&&x.to!=='lung');});
  const edited=JSON.stringify(e.document);assert.ok(parseCityInfo(edited));
  e.undo();assert.deepEqual(e.document,original);e.redo();assert.equal(JSON.stringify(e.document),edited);
  e.replace(original);e.undo();assert.equal(JSON.stringify(e.document),edited);
  const bad=structuredClone(e.document);bad.views[0].edges.push({id:'bad',from:'lung',to:'missing',kind:'supply',label:'broken'});
  assert.equal(e.replace(bad),false);assert.equal(JSON.stringify(e.document),edited);
});
test('imports reject malformed references and normalize executable-looking content as plain text',()=>{
  const d=createCityInfoDocument();d.nodes[0].label='<img src=x onerror=alert(1)>';d.nodes[0].html='<script>alert(1)</script>';
  const parsed=parseCityInfo(JSON.stringify(d));assert.equal(parsed.nodes[0].label,d.nodes[0].label);assert.equal('html' in parsed.nodes[0],false);
  for(const mutate of [x=>x.nodes[0].id='__proto__',x=>x.views[0].positions.lung.x=1e8,x=>x.views[0].edges[0].to='missing',x=>x.nodes[0].kind='url(javascript:0)',x=>x.views.pop(),x=>x.nodes[0].detail='x'.repeat(1601)]){
    const bad=createCityInfoDocument();mutate(bad);assert.equal(parseCityInfo(JSON.stringify(bad)),null);
  }
  assert.equal(parseCityInfo('not json'),null);
});
test('unavailable or full storage keeps edits unsaved and never overwrites a city save',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}},loaded=loadCityInfo(storage),e=createInfoEditor(loaded.document);
  assert.match(loaded.message,/접근 불가/);e.change(d=>{d.nodes[0].summary='수정한 설명';});assert.equal(e.save(storage),false);assert.equal(e.dirty,true);assert.equal(e.document.nodes[0].summary,'수정한 설명');
  const corrupt=loadCityInfo({getItem:()=>'{broken'});assert.match(corrupt.message,/형식 오류/);assert.equal(corrupt.document.views.length,15);
});

test('a previous information map keeps edits and gains the homeostasis view',()=>{
 const old=createCityInfoDocument();old.schema=3;old.views=old.views.filter(v=>v.id!=='homeostasis');old.nodes=old.nodes.filter(n=>n.id!=='homeostasis'&&!n.id.startsWith('home-'));old.nodes[0].label='기존 설명';old.views[0].positions.lung.x=135;
 const restored=parseCityInfo(JSON.stringify(old));assert.equal(restored.schema,4);assert.equal(restored.nodes[0].label,'기존 설명');assert.equal(restored.views[0].positions.lung.x,135);assert.ok(restored.views.some(v=>v.id==='homeostasis'));
});
