import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupResistanceCards,createCardStacks} from '../src/card-stacks.mjs';

const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const catalog=JSON.parse(readFileSync(new URL('../data/library.json',import.meta.url),'utf8'));

test('resistance stacks keep every card and put the susceptible base above resistant forms',()=>{
  const cards=[...data.records,...data.drugs],groups=groupResistanceCards(cards,catalog);
  assert.deepEqual(groups.flatMap(group=>group.items).map(item=>item.id).sort(),cards.map(item=>item.id).sort());
  const staph=groups.find(group=>group.id==='sau');
  assert.equal(staph.type,'stack');
  assert.equal(staph.items[0].id,'SAU-001');
  assert.deepEqual(staph.items.map(item=>item.id),['SAU-001','SAU-002','SAU-403','SAU-404']);
  assert.equal(staph.resistanceCount,3);
  assert.equal(groups.find(group=>group.id==='kpn').items[0].id,'KPN-409');
  assert.equal(groups.find(group=>group.items[0].id==='vancomycin').type,'card');
  const ungrouped=groupResistanceCards(cards,catalog,{enabled:false});
  assert.equal(ungrouped.length,cards.length);
  assert.deepEqual(ungrouped.map(group=>group.items[0].id),cards.map(item=>item.id));
});

test('search and archive subsets never gain hidden or undiscovered variants',()=>{
  const subset=data.records.filter(record=>['SAU-002','SAU-403'].includes(record.id));
  const groups=groupResistanceCards(subset,catalog);
  assert.equal(groups.length,1);
  assert.deepEqual(groups[0].items.map(item=>item.id),['SAU-002','SAU-403']);
  const onlyMrsa=groupResistanceCards([subset[0]],catalog);
  assert.equal(onlyMrsa[0].type,'card');
  const clinicalGroups=new Map();
  for(const record of data.records){
    const id=catalog.variants[record.id].pathogenId;
    if(!clinicalGroups.has(id))clinicalGroups.set(id,[]);
    clinicalGroups.get(id).push(record);
  }
  const clinicalOnly=[...clinicalGroups.values()].find(records=>records.length>1 && records.every(record=>!catalog.variants[record.id].resistance));
  assert(clinicalOnly);
  assert(groupResistanceCards(clinicalOnly,catalog).every(group=>group.type==='card'));
});

test('the global grouping preference persists and resets piles when re-enabled',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const stacks=createCardStacks(catalog,{storage});
  const staph=data.records.filter(record=>record.taxonId==='sau');
  assert.equal(stacks.enabled(),true);
  stacks.toggle('sau');
  assert.match(stacks.render(stacks.groups(staph)[0],record=>record.id),/is-expanded/);
  stacks.setEnabled(false);
  assert.equal(createCardStacks(catalog,{storage}).enabled(),false);
  assert.equal(stacks.groups(staph).length,4);
  stacks.setEnabled(true);
  assert.match(stacks.render(stacks.groups(staph)[0],record=>record.id),/is-collapsed/);
  const blocked=createCardStacks(catalog,{storage:{getItem(){throw Error('storage disabled');},setItem(){throw Error('storage disabled');}}});
  blocked.setEnabled(false);
  assert.equal(blocked.enabled(),false);
});
