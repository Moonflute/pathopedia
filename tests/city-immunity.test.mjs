import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {establishHost} from '../src/city-host-response.mjs';
import {CELL_JOBS} from '../src/city-data.mjs';
import {applyTileLayout,createTileLayout,cityDistrict} from '../src/city-tile-layout.mjs';
import {IMMUNE_CHALLENGES,validateImmunity} from '../src/city-immunity.mjs';
import {createActors,CELL_STYLES} from '../src/city-three-actors.mjs';
import {qualityProfile} from '../src/city-three-layout.mjs';
const advance=(s,seconds)=>{for(let n=0;n<seconds*20;n++)tickCity(s,.05,null);};
const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());return s;};
const challenge=(s,type,amount=3,site=type==='helminth'?'gut':'lung')=>assert.ok(command(s,'immune-challenge',{type,amount,site}).ok);
const place=(s,c,site)=>Object.assign(c,{x:cityDistrict(s,site).x,y:cityDistrict(s,site).y,target:site,path:[],step:0,immuneMove:null});

test('all requested cell lineages have real populations, distinct appearances and correct recruitment origins',()=>{
 const s=city();for(const kind of ['neutrophil','eosinophil','basophil','monocyte','macrophage','mast','dendritic','nk','bcell','helperT','cd8','treg']){assert.ok(s.cells.some(c=>c.kind===kind),kind);assert.ok(CELL_STYLES[kind],kind);}
 assert.equal(Object.keys(CELL_JOBS).length,16);assert.equal(s.cells.filter(c=>c.kind==='plasma').length,0);assert.equal(command(s,'recruit','plasma').ok,false);assert.equal(command(s,'recruit','macrophage').ok,false);
 const old=JSON.parse(serializeCity(s));delete old.immunity;old.cells=old.cells.filter(c=>!['eosinophil','basophil','monocyte','mast','nk','bcell','cd8','treg'].includes(c.kind));old.cells.find(c=>c.kind==='dendritic').recordId='SPN-105';old.cells.find(c=>c.kind==='helperT').recordId='SPN-105';old.time=37;old.resources.food=83;const copy=restoreCity(old);assert.ok(copy?.immunity);assert.equal(copy.time,37);assert.equal(copy.resources.food,83);assert.equal(copy.cells.find(c=>c.kind==='dendritic').immuneState,'migrating');assert.ok(copy.cells.find(c=>c.kind==='helperT').memory);
});

test('an inflammatory monocyte becomes a macrophage in tissue with the same identity',()=>{
 const s=city(),c=s.cells.find(c=>c.kind==='monocyte'),id=c.id;s.cells=[c];place(s,c,'lung');s.biology.sites.lung.strains['SPN-105']=20;s.immunity.sites.lung.signals.ccl2=8;s.immunity.sites.lung.signals.mcsf=4;
 advance(s,1);assert.equal(c.kind,'monocyte');assert.equal(c.immuneState,'differentiating');advance(s,5);assert.equal(c.kind,'macrophage');assert.equal(c.id,id);assert.equal(c.origin,'monocyte');assert.ok(validateImmunity(s));
});

test('antigen availability alone cannot prime T cells or produce antibodies without a presenting dendritic cell',()=>{
 const s=city();s.cells=s.cells.filter(c=>!['dendritic','nk','monocyte'].includes(c.kind));challenge(s,'virus');s.antigens['IMM-VIRUS']=true;
 advance(s,38);assert.equal(s.immunity.stats.primed,0);assert.equal(s.stats.antibodyBatches,0);assert.equal(s.cells.some(c=>c.kind==='plasma'),false);
 assert.ok(s.immunity.response.episodes.every(e=>e.seen[3]==null));
});

test('viral presentation drives cognate CD4/CD8 priming, T–B help, antibody class switching and memory',()=>{
 const s=city();challenge(s,'virus');
 // Allow travel through the expanded airway, lymph node and return circuit.
 for(let elapsed=0;elapsed<180&&!(s.immunity.stats.cd8Kills>0&&s.immunity.antibodies['IMM-VIRUS']?.IgA>0&&s.cells.some(c=>c.kind==='bcell'&&c.memory));elapsed+=5)advance(s,5);
 assert.ok(s.immunity.stats.presented>0);assert.ok(s.immunity.stats.primed>0);assert.ok(s.immunity.stats.clones>0);assert.ok(s.immunity.stats.nkKills>0);assert.ok(s.immunity.stats.cd8Kills>0);
 assert.ok(s.cells.some(c=>c.kind==='plasma'&&c.licensed&&c.recordId==='IMM-VIRUS'&&c.isotype==='IgA'));assert.ok(s.cells.some(c=>c.kind==='bcell'&&c.memory));assert.ok(s.immunity.antibodies['IMM-VIRUS'].IgA>0);assert.ok(restoreCity(serializeCity(s)));
 const stages=s.immunity.response.episodes.find(e=>e.recordId==='IMM-VIRUS').seen;assert.ok(stages[1]<=stages[2]&&stages[2]<=stages[3]);assert.ok(stages.slice(0,4).every(t=>t!=null));
});

test('NK and CD8 inspect different host-cell signals and never attack unmatched or healthy self',()=>{
 for(const [kind,mhcI,record,kills]of [['nk',.15,'IMM-VIRUS',1],['nk',.95,'IMM-VIRUS',0],['cd8',.95,'IMM-VIRUS',1],['cd8',.95,'SAU-001',0],['cd8',.15,'IMM-VIRUS',0]]){
  const s=city(),c=s.cells.find(c=>c.kind===kind);const h=establishHost(s,s.physiology.epithelium.find(e=>e.site==='lung'&&e.wall==null));h.mhcI=mhcI;s.cells=[c];Object.assign(c,{x:h.x,y:h.y,recordId:record,immuneState:'effector',immuneSite:'lung',activatedAt:0,cooldown:0,path:[],step:0});
  advance(s,7);assert.equal(s.immunity.stats[kind==='nk'?'nkKills':'cd8Kills'],kills,kind+' '+mhcI+' '+record);
 }
});

test('B-cell loss prevents plasma differentiation even when dendritic and helper T cells respond',()=>{
 const s=city();s.cells=s.cells.filter(c=>c.kind!=='bcell');challenge(s,'allergen');advance(s,60);assert.ok(s.immunity.stats.primed>0);assert.equal(s.cells.filter(c=>c.kind==='plasma').length,0);assert.equal(s.stats.antibodyBatches,0);
});

test('IgE sensitization is antigen specific and mast-cell degranulation requires re-exposure',()=>{
 const s=city();challenge(s,'allergen',6);advance(s,8);assert.equal(s.immunity.stats.degranulations,0);advance(s,72);
 assert.ok(s.immunity.antibodies['IMM-ALLERGEN']?.IgE>5);assert.equal(s.immunity.stats.degranulations,0);assert.ok(s.cells.some(c=>c.kind==='bcell'&&c.memory));challenge(s,'allergen',6);advance(s,12);assert.ok(s.immunity.stats.degranulations>0);assert.ok(s.immunity.sites.lung.signals.histamine>0);
 const other=city(),mast=other.cells.find(c=>c.kind==='mast'&&c.residentSite==='lung');other.cells=[mast];place(other,mast,'lung');other.immunity.antibodies['IMM-HELMINTH']={IgM:0,IgG:0,IgA:0,IgE:80};challenge(other,'allergen',6);advance(other,9);assert.equal(other.immunity.stats.degranulations,0);
});

test('eosinophil granules damage helminths while neutrophils do not become universal cytotoxic cells',()=>{
 const s=city(),e=s.cells.find(c=>c.kind==='eosinophil');s.cells=[e];challenge(s,'helminth');s.immunity.parasites=s.immunity.parasites.slice(0,1);const worm=s.immunity.parasites[0];Object.assign(e,{x:worm.x,y:worm.y,target:'gut'});s.immunity.sites.gut.signals.il5=25;advance(s,12);assert.equal(s.immunity.parasites.length,0);assert.equal(s.immunity.stats.parasites,1);
 const n=city();n.cells=n.cells.filter(c=>c.kind==='neutrophil');establishHost(n,n.physiology.epithelium.find(e=>e.site==='lung'&&e.wall==null));const hp=n.immunity.infected.reduce((v,h)=>v+h.hp,0);advance(n,8);assert.equal(n.immunity.stats.nkKills+n.immunity.stats.cd8Kills,0);assert.equal(n.immunity.infected.reduce((v,h)=>v+h.hp,0),hp);
});

test('Tregs lower local inflammation through feedback without directly removing a pathogen',()=>{
 const s=city(),c=s.cells.find(c=>c.kind==='treg');s.cells=[c];place(s,c,'lung');s.biology.sites.lung.inflammation=45;s.immunity.sites.lung.signals.il2=20;const control=restoreCity(serializeCity(s));control.cells=[];
 advance(s,12);advance(control,12);assert.ok(s.immunity.stats.regulation>0);assert.ok(s.biology.sites.lung.inflammation<control.biology.sites.lung.inflammation);assert.equal(s.stats.defeated,0);
});

test('saving during priming preserves signals, host targets, clones, specificity and the next simulation steps',()=>{
 const s=city();challenge(s,'virus');advance(s,18);const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,12);advance(copy,12);assert.equal(serializeCity(copy),serializeCity(s));
 const bad=JSON.parse(serializeCity(s));bad.immunity.infected[0].mhcI=2;assert.equal(restoreCity(bad),null);
});

test('sixteen cell roles and immune targets stay in sixteen bounded renderer pools',()=>{
 const s=city();challenge(s,'virus',32);challenge(s,'helminth',32);challenge(s,'allergen',32);const actors=createActors(qualityProfile(390,1));actors.draw(s);assert.equal(actors.root.children.length,16);assert.equal(actors.positions.length,s.cells.length);
 for(const m of actors.root.children){assert.ok(m.count<=m.instanceMatrix.count,m.name);assert.ok(m.instanceMatrix.array.every(Number.isFinite),m.name);}
});
