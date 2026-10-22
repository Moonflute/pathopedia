import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {applyTileLayout,createTileLayout,cityDistrict} from '../src/city-tile-layout.mjs';
import {exposeSite,cleanLocalDebris} from '../src/city-biology.mjs';
import {establishHost,killHost,tickHostResponse,seedBlood,bloodLoad,VIRAL_ID} from '../src/city-host-response.mjs';
import {createHostResponseScene,hostStageMarkers} from '../src/city-three-host-response.mjs';
import {cityAlarmPoints} from '../src/city-three-alarms.mjs';

const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());return s;};
const advance=(s,seconds)=>{for(let n=0;n<Math.round(seconds*10);n++)tickCity(s,.1,null,'2');};
const until=(s,condition,seconds=100)=>{for(let n=0;n<seconds*10&&!condition();n++)tickCity(s,.1,null,'2');assert.ok(condition(),'state reached within '+seconds+'s');};
const challenge=(s,front='airway')=>assert.ok(command(s,'immune-challenge',{type:'virus',front,wall:11,site:front==='gut'?'gut':'lung',amount:3}).ok);

test('an intact skin barrier blocks viral entry; a wound admits particles before epithelial infection',()=>{
 const s=city();s.cells=[];challenge(s,'skin');advance(s,10);assert.equal(s.immunity.infected.length,0);assert.ok(s.physiology.virions.every(v=>v.phase==='barrier'));
 assert.ok(command(s,'lab-wound','11').ok);until(s,()=>s.physiology.virions.some(v=>v.phase==='attachment'));
 assert.equal(s.immunity.infected.length,0);until(s,()=>s.immunity.infected.length>0);assert.equal(s.immunity.infected[0].phase,'eclipse');
 assert.equal(s.immunity.infected[0].epithelialId,'skin:11');assert.equal(s.immunity.infected[0].site,s.physiology.epithelium.find(e=>e.id==='skin:11').site);
});

test('a recruited neutrophil rolls, adheres and crosses a venule before following the tissue signal',()=>{
 const s=city(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,cityDistrict(s,'heart'),{id:c.id,kind:'neutrophil',path:[],step:0,extravascular:false});exposeSite(s,'lung','SPN-105',60);
 const stages=[];for(let n=0;n<1200&&!c.extravascular;n++){tickCity(s,.1,null,'2');if(c.trafficStage!==stages.at(-1))stages.push(c.trafficStage);}
 assert.deepEqual(stages.filter(Boolean).slice(0,5),['circulating','rolling','adhering','crossing','chemotaxis']);assert.equal(c.tissueSite,'lung');assert.ok(s.physiology.stats.extravasations>0);
});

test('soluble antigen physically reaches a lymph node without bypassing dendritic costimulation',()=>{
 const s=city();s.cells=s.cells.filter(c=>['bcell','cd8','helperT'].includes(c.kind));exposeSite(s,'lung','SPN-105',40);advance(s,5.2);
 assert.ok(s.physiology.lymphPackets.length>0);assert.equal(s.immunity.antigens['SPN-105'].lymph,0);assert.equal(s.immunity.stats.primed,0);
 until(s,()=>s.physiology.stats.lymphDelivered>0);assert.ok(s.immunity.antigens['SPN-105'].lymph>0);assert.equal(s.immunity.stats.primed,0);assert.equal(s.cells.some(c=>c.kind==='plasma'),false);
});

test('virus requires entry and an eclipse phase, then sheds particles while IFN protects neighbors',()=>{
 const s=city();s.cells=[];challenge(s);assert.equal(s.immunity.infected.length,0);advance(s,1);assert.equal(s.immunity.infected.length,0);
 until(s,()=>s.immunity.infected.length>0);const host=s.immunity.infected[0];assert.equal(host.phase,'eclipse');assert.equal(s.physiology.stats.viralProduced,0);
 until(s,()=>s.physiology.stats.viralProduced>0);assert.equal(host.phase,'productive');assert.ok(s.physiology.epithelium.some(e=>e.antiviral>0));assert.ok(s.physiology.virions.some(v=>v.phase==='spread'||v.entered));
 const protectedCell=s.physiology.epithelium.find(e=>e.state==='healthy'&&e.site==='lung'&&e.wall==null);protectedCell.antiviral=100;
 s.physiology.virions=[{id:++s.serial,recordId:VIRAL_ID,site:'lung',front:'airway',wall:null,x:protectedCell.x,y:protectedCell.y,path:[],step:0,targetId:protectedCell.id,phase:'attachment',attachedAt:s.time-3,born:s.time,until:s.time+10,entered:true}];
 const before=s.physiology.stats.neutralized;advance(s,.1);assert.equal(protectedCell.state,'healthy');assert.ok(s.physiology.stats.neutralized>before);
});

test('complement tags both bacteria but MAC damages a susceptible Gram-negative target only',()=>{
 const s=city();s.cells=[];const at=cityDistrict(s,'lung');
 s.enemies=['ECO-009','SPN-105'].map((recordId,n)=>({id:900+n,recordId,site:'lung',front:'airway',entered:true,compartment:'tissue',x:at.x,y:at.y,hp:.4,maxHp:.4}));s.immunity.sites.lung.signals.complement=60;
 const api={damage(s,e,n){e.hp-=n;if(e.hp<=0)e.dead=true;}};
 for(let n=0;n<100;n++){s.time+=.25;tickHostResponse(s,.25,api);}
 assert.ok(s.enemies.every(e=>e.c3b>.2));assert.ok(s.immunity.sites.lung.signals.c5a>0);assert.equal(s.enemies[0].dead,true);assert.equal(s.enemies[1].hp,.4);assert.equal(s.physiology.stats.macKills,1);
});

test('normal microbiota suppress C. difficile and antibiotic exposure reduces that protection',()=>{
 const healthy=city(),depleted=city();for(const s of [healthy,depleted]){s.cells=[];exposeSite(s,'gut','CDF-121',20);}assert.ok(command(depleted,'microbiome','25').ok);
 advance(healthy,20);advance(depleted,20);assert.ok(depleted.biology.sites.gut.strains['CDF-121']>healthy.biology.sites.gut.strains['CDF-121']);assert.ok(depleted.biology.sites.gut.toxin>healthy.biology.sites.gut.toxin);
 const before=healthy.physiology.microbiome;healthy.biology.lumen.vancomycin=100;advance(healthy,5);assert.ok(healthy.physiology.microbiome<before);
});

test('dead epithelium needs debris removal before regeneration and records the cause of damage',()=>{
 const s=city();s.cells=[];const ep=s.physiology.epithelium.find(e=>e.site==='lung'&&e.wall==null),h=establishHost(s,ep);killHost(s,h);s.immunity.infected=[];
 advance(s,3);assert.equal(ep.health,0);assert.equal(s.physiology.injury.lung.phase,'clearing');assert.ok(s.physiology.injury.lung.immune>0);
 cleanLocalDebris(s,s.debris[0]);s.debris=[];advance(s,3);assert.equal(ep.state,'repairing');assert.ok(ep.health>0);assert.equal(s.physiology.stats.efferocytosis,1);assert.ok(hostStageMarkers(s).some(m=>m.text.includes('상피 재생')));
});

test('resident memory responds locally to its antigen without another node priming trip',()=>{
 const s=city(),c=s.cells.find(c=>c.kind==='cd8');s.cells=[c];Object.assign(c,{...cityDistrict(s,'lung'),id:c.id,kind:'cd8',recordId:VIRAL_ID,immuneState:'memory',memory:true,tissueResident:true,residentSite:'lung',immuneSite:'lung',tissueSite:'lung',extravascular:true,path:[],step:0});
 exposeSite(s,'lung','SPN-105',10);advance(s,.2);assert.equal(s.physiology.stats.recalls,0);assert.equal(c.immuneState,'memory');
 establishHost(s,s.physiology.epithelium.find(e=>e.site==='lung'&&e.wall==null));advance(s,.2);assert.equal(s.physiology.stats.recalls,1);assert.equal(c.immuneState,'effector');assert.equal(s.immunity.stats.primed,0);assert.ok(s.immunity.sites.lung.signals.cxcl8>0);
});

test('bacteremia is separate from heart infection and systemic inflammation can impair perfusion',()=>{
 const s=city();s.cells=[];seedBlood(s,'SAU-002',80,'lung');advance(s,1);assert.ok(bloodLoad(s)>0);assert.equal(Object.keys(s.biology.sites.heart.strains).length,0);assert.equal(s.districts.heart.hp,100);
 s.physiology.blood.inflammation=80;s.districts.kidney.hp=50;advance(s,6);assert.ok(s.physiology.blood.perfusion<90);assert.equal(s.physiology.blood.sepsis,true);assert.ok(cityAlarmPoints(s).some(a=>a.key==='blood-systemic'));
});

test('new host states survive saves, reject invalid particles and use five bounded visual batches',()=>{
 const s=city();challenge(s);advance(s,6);const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,1);advance(copy,1);assert.equal(serializeCity(copy),serializeCity(s));
 const bad=JSON.parse(serializeCity(s));bad.physiology.virions[0].targetId='missing';assert.equal(restoreCity(bad),null);
 const view=createHostResponseScene();view.update(s);assert.equal(view.root.children.length,5);for(const m of view.root.children){assert.ok(m.count<=m.instanceMatrix.count);assert.ok(m.instanceMatrix.array.every(Number.isFinite));}view.dispose();
});
