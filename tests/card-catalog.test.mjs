import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCardCatalog } from '../scripts/validate-cards.mjs';
import { compileLibraryCatalog } from '../scripts/seed-cards.mjs';
import { createCardCatalog } from '../src/card-catalog.mjs';
import { createCardGallery } from '../src/card-gallery-ui.mjs';
import { createCardStacks } from '../src/card-stacks.mjs';
import { createCardModels } from '../src/card-models.mjs';
import { createCardSearch } from '../src/card-search.mjs';
import { CARD_ICONS, renderReferenceCard } from '../src/reference-card.mjs';
import { resolveAppRoute } from '../src/app-routing.mjs';
import { compileImmuneElements } from '../scripts/compile-immune-elements.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const data=read('data/organisms.json'),db=read('data/library.json');
const diseaseIndex=read('content/diseases/index.json');
const authored={
  pathogens:Object.fromEntries(Object.entries(db.pathogens).map(([id,item])=>[id,item.summary])),
  drugs:Object.fromEntries(Object.entries(db.drugs).map(([id,item])=>[id,item.summary])),
  variants:Object.fromEntries(Object.entries(db.variants).map(([id,item])=>[id,{summary:item.summary,...(item.resistance?{resistance:item.resistance}:{})}])),
  therapyContexts:Object.values(db.therapyContexts),
  diseaseContent:{index:diseaseIndex,entities:diseaseIndex.files.flatMap(file=>read('content/diseases/'+file).entities)},
  immuneContent:read('content/cards/immune-elements.json')
};

test('card DB retains every game record, response and clinical relationship',()=>{
  const counts=validateCardCatalog(db,data);
  assert.equal(counts.variants,data.records.length);
  assert.equal(counts.drugs,data.drugs.length);
  assert.equal(counts.responses,data.records.reduce((sum,record)=>sum+Object.keys(record.susceptibility).length,0));
  assert.equal(counts.therapyContexts,Object.keys(db.therapyContexts).length);
});

test('immune element cards keep 97 fixed IDs, source links and proposed order',()=>{
  assert.equal(db.counts.immuneElements,97);
  assert.equal(Object.keys(db.immuneElements).length,97);
  assert.equal(db.immuneElements['IMM-069'].name,'CRP');
  assert.equal(db.immuneElements['IMM-097'].name,'TGF-β');
  const card=createCardCatalog(db).immuneElement('IMM-069');
  assert.equal(card.kind,'immune-element');
  assert.equal(card.sortOrder,69);
  assert.equal(card.back.label,'보체·방어 단백질');
  assert(card.back.references.some(reference=>reference.url.startsWith('https://')));
});

test('immune element deck uses the shared card frame, search and direct route',()=>{
  const model=createCardModels(data,db).immuneElement('IMM-069');
  const markup=renderReferenceCard(model);
  assert.match(markup,/reference-card--immune-element/);
  assert.match(markup,/IMM-069/);
  assert.match(markup,/CRP/);
  assert.match(markup,/실제 역할/);
  assert.match(markup,/data-card-related="immune-element:IMM-084"/);
  assert.match(markup,/data-card-back-tab="responses"/);
  assert.match(markup,/card-back-references/);
  assert.equal(createCardSearch(data,db).matches('immune-element','IMM-069','C-reactive protein'),true);
  assert.deepEqual(resolveAppRoute('#cards/immunity'),{view:'cards',domain:'immunity',archiveOnly:false,hash:'#cards/immunity'});
  assert.equal(resolveAppRoute('#cards/archive/immunity'),null);
  const previousDocument=globalThis.document;
  globalThis.document={querySelectorAll:()=>[],querySelector:()=>null};
  try{
    const gallery=createCardGallery(data,{catalog:db});
    assert.match(gallery.render(),/data-card-deck="immunity"/);
    assert.equal(gallery.setRoute('immunity'),true);
    const grid=gallery.render();
    assert.match(grid,/97<\/strong>장/);
    assert.match(grid,/data-card-open="immune-element:IMM-001"/);
    assert.match(grid,/id="card-gallery-immune-category"/);
    gallery.handleChange({id:'card-gallery-immune-category',value:'antibody'});
    assert.match(gallery.render(),new RegExp('<strong>'+Object.values(db.immuneElements).filter(element=>element.category==='antibody').length+'</strong>장'));
    gallery.handleChange({id:'card-gallery-immune-category',value:'all'});
    gallery.handleClick({dataset:{cardLayout:'fan'},closest:()=>null});
    const fan=gallery.render();
    const keys=[...fan.matchAll(/data-card-fan-key="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(keys.length,97);
    assert.equal(keys[0],'immune-element:IMM-001');
    assert.equal(keys.at(-1),'immune-element:IMM-097');
  }finally{
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
});

test('immune interactions preserve direction, intermediaries and reciprocal lookup',()=>{
  const cards=createCardCatalog(db);
  const induction=cards.immuneInteractions('IMM-069',{direction:'incoming',type:'induces'}).find(relation=>relation.fromId==='IMM-084');
  assert.equal(induction.mode,'mediated');
  assert.match(induction.via,/간세포/);
  assert.equal(induction.counterpart.name,'IL-6');
  const binding=cards.immuneInteractions('IMM-069',{direction:'outgoing',type:'binds'}).find(relation=>relation.toId==='IMM-057');
  assert.equal(binding.mode,'direct');
  assert.equal(binding.relationType.symmetric,true);
  assert.equal(cards.immuneInteractions('IMM-057').find(relation=>relation.id===binding.id).counterpart.name,'CRP');
  const cgas=cards.immuneInteractions('IMM-042',{direction:'outgoing',type:'activates'})[0];
  assert.equal(cgas.toId,'IMM-043');assert.match(cgas.via,/cGAMP/);
  const models=createCardModels(data,db);
  for(const element of Object.values(db.immuneElements)){
    const model=models.immuneElement(element.id);
    assert.equal(model.back.sections.length,4);
    assert(model.back.sections.reduce((sum,section)=>sum+[...section.text].length,0)>=240);
    assert(model.leftProperties.length>0 && model.rightProperties.length>0);
    assert([...model.leftProperties,...model.rightProperties].every(property=>CARD_ICONS[property.icon]));
    const markup=renderReferenceCard(model);
    assert.match(markup,/card-rail--left/);assert.match(markup,/card-rail--right/);
  }
});

test('immune authoring rejects broken edges and missing mechanism context',()=>{
  for(const [mutate,pattern]of [
    [copy=>{copy.interactions[0].toId='IMM-999';},/invalid interaction endpoints/],
    [copy=>{copy.interactions.push(structuredClone(copy.interactions[0]));},/duplicate interaction/],
    [copy=>{delete copy.interactions.find(relation=>relation.mode==='mediated').via;},/invalid context or mode/],
    [copy=>{copy.entities[0].functionIds=['made-up-role'];},/invalid codes/]
  ]){
    const copy=structuredClone(authored.immuneContent);mutate(copy);
    assert.throws(()=>compileImmuneElements(copy,db.sources),pattern);
  }
  const copy=structuredClone(db);copy.immuneElements['IMM-069'].interactionIds.pop();
  assert.throws(()=>validateCardCatalog(copy,data),/asymmetric immune interaction/);
});

test('card validation blocks dangling IDs, missing sources, altered responses and inconsistent totals',()=>{
  const record=data.records[0],drugId=Object.keys(record.susceptibility)[0],therapy=Object.values(db.therapyContexts)[0];
  const sourceId=Object.keys(db.sources)[0];
  const corruptions=[
    [copy=>{delete copy.sources[sourceId].title;},/source.*title is empty/],
    [copy=>{delete copy.sources[sourceId].url;delete copy.sources[sourceId].note;},/source.*note is empty/],
    [copy=>{copy.variants[record.id].pathogenId='missing';},/pathogen reference/],
    [copy=>{copy.variants[record.id].panelId='missing';},/panel reference/],
    [copy=>{copy.responses[record.id][drugId]='rsp_missing';},/missing response profile/],
    [copy=>{copy.pathogens[record.taxonId].back.sections[0].sourceIds=['missing'];},/missing sources/],
    [copy=>{copy.responseProfiles[copy.responses[record.id][drugId]].note='altered';},/response differs/],
    [copy=>{copy.variants[therapy.recordIds[0]].therapyIds=[];},/asymmetric therapy references/],
    [copy=>{copy.responseProfiles.rsp_deadbeefdeadbeef=structuredClone(Object.values(copy.responseProfiles)[0]);},/unreferenced response profile/],
    [copy=>{copy.counts.responses++;},/stored counts/],
    [copy=>{copy.sourceDatasetVersion='outdated';},/source dataset version mismatch/]
  ];
  for(const [mutate,message]of corruptions){
    const copy=structuredClone(db);mutate(copy);
    assert.throws(()=>validateCardCatalog(copy,data),message);
  }
});

test('new detail categories and their own sources reach the portable card without losing response sources',()=>{
  const expanded=structuredClone(data),sources=structuredClone(db.sources);
  expanded.categories.push({id:'testExtension',label:'Extra detail',ko:'확장 상세',number:99});
  sources['test-detail']={title:'Fixture detail source',url:'https://example.com/detail'};
  sources['test-response']={title:'Fixture response source',url:'https://example.com/response'};
  for(const record of expanded.records)record.hints.testExtension={text:'확장된 상세 내용',sourceIds:record.sourceIds};
  const record=expanded.records[0],drugId=Object.keys(record.susceptibility)[0];
  record.hints.testExtension.sourceIds=['test-detail'];
  record.susceptibility[drugId].sourceIds.push('test-response');
  const compiled=compileLibraryCatalog(expanded,sources,structuredClone(authored));
  const card=createCardCatalog(compiled).pathogen(record.id);
  assert.equal(card.back.sections.find(section=>section.id==='testExtension').title,'확장 상세');
  assert.equal(card.back.sections.find(section=>section.id==='testExtension').text,'확장된 상세 내용');
  assert(card.back.references.some(reference=>reference.id==='test-detail'));
  assert(card.back.references.some(reference=>reference.id==='test-response'));
  const reordered=structuredClone(expanded);reordered.records.reverse();reordered.drugs.reverse();
  assert.deepEqual(compileLibraryCatalog(reordered,sources,structuredClone(authored)).responses,compiled.responses);
});

test('duplicate game IDs cannot silently overwrite cards during generation',()=>{
  const duplicated=structuredClone(data);duplicated.records.push(structuredClone(data.records[0]));
  assert.throws(()=>compileLibraryCatalog(duplicated,db.sources,structuredClone(authored)),/duplicate record IDs/);
});

test('discovery collection keeps scores and only exposes discovered variants inside each classification',()=>{
  const previousDocument=globalThis.document;
  globalThis.document={querySelectorAll:()=>[],querySelector:()=>null};
  try{
    const resistant=data.records.find(record=>record.id==='SAU-002');
    const fungus=data.records.find(record=>record.domain==='fungi');
    let archive={[resistant.id]:{bestScore:820,solves:3},[fungus.id]:{bestScore:700,solves:1}};
    const snapshot=structuredClone(archive);
    const stacks=createCardStacks(db,{storage:{getItem:()=>null,setItem:()=>{}}});
    const gallery=createCardGallery(data,{catalog:db,cardStacks:stacks,getArchive:()=>archive});
    assert.equal(gallery.setRoute('all',true),true);
    const all=gallery.render();
    assert.match(all,/최고 820점/);assert.match(all,/3회 동정/);
    assert.match(all,new RegExp('발견 2 / '+data.records.length));
    assert.match(all,new RegExp('data-card-open="pathogen:'+fungus.id+'"'));
    assert.doesNotMatch(all,/data-card-open="pathogen:SAU-001"/);
    assert.equal(gallery.setRoute('bacteria',true),true);
    const bacteria=gallery.render();
    assert.match(bacteria,/data-card-open="pathogen:SAU-002"/);
    assert.doesNotMatch(bacteria,new RegExp('data-card-open="pathogen:'+fungus.id+'"'));
    assert.equal(gallery.setRoute('drugs',true),false);
    assert.deepEqual(archive,snapshot);
    archive={};
    assert.match(gallery.render(),/첫 번째 기록을 기다립니다/);
  }finally{
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
});


test('arc view keeps every filtered card in one ordered row and remembers the chosen mode',()=>{
  const previousDocument=globalThis.document,previousStorage=globalThis.localStorage;
  const values=new Map();
  globalThis.document={querySelectorAll:()=>[],querySelector:()=>null};
  globalThis.localStorage={getItem:key=>values.get(key) || null,setItem:(key,value)=>values.set(key,value)};
  try{
    const gallery=createCardGallery(data,{catalog:db});
    gallery.setRoute('pathogens');
    assert.match(gallery.render(),/data-card-more/);
    gallery.handleClick({dataset:{cardLayout:'fan'},closest:()=>null});
    const pathogens=gallery.render();
    const keys=[...pathogens.matchAll(/data-card-fan-key="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(keys.length,data.records.length);
    assert.equal(new Set(keys).size,data.records.length);
    assert.match(pathogens,/data-card-fan-collection/);
    assert.doesNotMatch(pathogens,/data-card-more/);
    assert.equal(values.get('pathopedia:card-layout'),'fan');
    gallery.setRoute('drugs');
    assert.equal([...gallery.render().matchAll(/data-card-fan-key="/g)].length,data.drugs.length);
    gallery.handleClick({dataset:{cardLayout:'grid'},closest:()=>null});
    assert.match(gallery.render(),/data-card-more/);
  }finally{
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
    if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;
  }
});
