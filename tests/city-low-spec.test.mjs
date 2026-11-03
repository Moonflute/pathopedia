import test from 'node:test';
import assert from 'node:assert/strict';
import {readCityQuality,storeCityQuality,CITY_QUALITY_KEY} from '../src/city-quality.mjs';
import {qualityProfile} from '../src/city-three-layout.mjs';
import {createAdaptiveQuality} from '../src/city-three-performance.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {createResidentView,residentView,ensureResidents} from '../src/city-residents.mjs';
import {createCity,tickCity,serializeCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';

const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true,workCrews:true});applyTileLayout(s,createTileLayout());ensureResidents(s);return s;};
const dispose=actor=>{const materials=new Set();for(const m of actor.root.children){m.dispose();m.geometry.dispose();materials.add(m.material);}for(const m of materials)m.dispose();};

test('graphics preferences survive reopening and handle unavailable or invalid storage',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 assert.equal(readCityQuality(storage),'auto');
 for(const mode of ['standard','low','minimum','auto']){assert.equal(storeCityQuality(mode,storage),true);assert.equal(readCityQuality(storage),mode);}
 saved.set(CITY_QUALITY_KEY,'unknown');assert.equal(readCityQuality(storage),'auto');
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(readCityQuality(blocked),'auto');assert.equal(storeCityQuality('low',blocked),false);
});

test('manual modes retain their target, auto restores adaptive control, and pixel budgets cover large screens',()=>{
 const q=createAdaptiveQuality(3840,2,'low',2160);
 assert.equal(q.profile.fps,60);assert.equal(q.profile.actorShadows,false);assert.equal(q.profile.residentStride,2);assert.equal(q.profile.rbcSkip,4);
 for(let n=0;n<600;n++)assert.equal(q.sample(n*40),false);
 assert.equal(q.profile.level,2);
 q.setMode('minimum',25000);assert.equal(q.profile.fps,30);assert.equal(q.profile.shadow,0);
 q.setMode('standard',26000);assert.equal(q.profile.residentStride,1);assert.equal(q.profile.rbcSkip,0);
 q.setMode('auto',27000);for(let n=0;n<300;n++)q.sample(27000+n*40);assert.ok(q.profile.level>=2);assert.equal(q.profile.residentStride,2);
 for(const mode of ['auto','standard','low','minimum'])for(const [w,h] of [[390,844],[844,390],[3840,2160]]){
  const p=qualityProfile(w,3,0,mode,h);assert.ok(w*h*p.dpr*p.dpr<=p.maxPixels+1);assert.ok(p.dpr>0&&p.dpr<=3);assert.equal(p.maxCells,256);
 }
});

test('sparse cell rendering preserves jobs, stable identities, selection, type highlights and full detail on return',()=>{
 const s=city(),before=serializeCity(s),standard=qualityProfile(1280,1,0,'standard'),low=qualityProfile(1280,1,0,'low'),actor=createActors(standard);
 actor.draw(s,{quality:standard,pixelScale:100});const allParts=actor.root.children.reduce((n,m)=>n+m.count,0),allResidents=actor.stats.residents;
 assert.equal(actor.stats.cells,s.cells.length);assert.equal(allResidents,s.somatic.people.length);
 actor.draw(s,{quality:low,pixelScale:10});const ids=()=>actor.positions.map(p=>p.id).sort((a,b)=>a-b),shown=ids();
 assert.ok(actor.stats.residents>=allResidents*.45&&actor.stats.residents<=allResidents*.55);
 const rbc=s.cells.filter(c=>c.kind==='rbc'),hidden=rbc.find(c=>!shown.includes(c.id));assert.ok(hidden);
 assert.ok(s.cells.filter(c=>c.kind!=='rbc').every(c=>shown.includes(c.id)));
 assert.ok(actor.root.children.reduce((n,m)=>n+m.count,0)<allParts*.6);assert.equal(actor.root.children.find(m=>m.name==='body').castShadow,false);
 const original=s.cells;s.cells=[...s.cells].reverse();actor.draw(s,{quality:low,pixelScale:10});assert.deepEqual(ids(),shown);s.cells=original;
 actor.draw(s,{quality:low,pixelScale:10,selectedCell:hidden.id});assert.ok(ids().includes(hidden.id));assert.equal(actor.root.children.find(m=>m.name==='body').count,1,'observed cell keeps its complete model');
 actor.draw(s,{quality:low,pixelScale:10,selectedKind:'rbc'});assert.ok(rbc.every(c=>ids().includes(c.id)));
 const resident=residentView(s).find(c=>c.id.endsWith(':1'));
 actor.draw(s,{quality:low,pixelScale:10,selectedCell:resident.id});assert.ok(actor.pickPositions.some(p=>p.id===resident.id));assert.equal(actor.root.children.find(m=>m.name==='body').count,1);
 actor.draw(s,{quality:low,pixelScale:10,selectedKind:'somatic'});assert.equal(actor.stats.residents,allResidents);
 actor.draw(s,{quality:standard,pixelScale:100});assert.equal(actor.stats.cells,s.cells.length);assert.equal(actor.stats.residents,allResidents);assert.equal(actor.stats.simple,0);assert.equal(actor.root.children.reduce((n,m)=>n+m.count,0),allParts);assert.equal(actor.root.children.find(m=>m.name==='body').castShadow,true);
 assert.equal(actor.root.children.length,16);assert.equal(serializeCity(s),before);dispose(actor);
});

test('resident presentation reuses objects while keeping observations independent and refreshing replaced health state',()=>{
 const s=city(),present=createResidentView(),first=present(s),entry=first[0],point=entry.point,snapshot=residentView(s),oldX=snapshot[0].point.x;
 s.time+=2;present(s);assert.equal(present(s)[0],entry);assert.equal(entry.point,point);assert.equal(snapshot[0].point.x,oldX);
 const index=s.somatic.people.findIndex(p=>p.id===entry.id);s.somatic.people[index].health=12;assert.equal(present(s)[0].health,12);
 s.somatic.people=s.somatic.people.map(p=>({...p,health:80}));assert.equal(present(s)[0].health,80);
 const before=serializeCity(s),all=residentView(s),sparse=present(s,{stride:2});
 assert.deepEqual(new Set(sparse.map(p=>p.organ)),new Set(all.map(p=>p.organ)),'every populated area retains residents');
 assert.equal(serializeCity(s),before);
 const next=city();next.somatic.people[0].health=21;assert.equal(present(next)[0].health,21);
});

test('resident recovery advances once per valid simulation tick and never while stopped',()=>{
 const s=city(),view=residentView(s).find(p=>p.organ==='heart'),p=s.somatic.people.find(p=>p.id===view.id);
 s.time=10;p.health=50;p.hitAt=-100;
 const rate=s.cells.some(c=>c.kind==='fibroblast'&&c.target===view.site)?1.2:.2;
 tickCity(s,.1,null,'1');assert.ok(Math.abs(p.health-(50+.1*rate))<1e-8);
 const health=p.health;tickCity(s,0,null,'1');assert.equal(p.health,health);s.status='won';tickCity(s,.1,null,'1');assert.equal(p.health,health);
});
