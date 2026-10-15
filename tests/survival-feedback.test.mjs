import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, WORLD, UPGRADE_BY_ID } from '../src/survival-data.mjs';
import { createSurvivalRun, startSurvival, tickSurvival, chooseSurvivalUpgrade, spawnSurvivalEnemy, damageSurvivalEnemy, survivalCamera, setSurvivalViewport, setSurvivalPriority, weaponStats, survivalUpgradeChoices } from '../src/survival-engine.mjs';
import { canUpgrade, upgradePreview } from '../src/survival-loadout.mjs';
import { normalizeSurvivalRecord, saveSurvivalResult } from '../src/survival-records.mjs';
const advance=(r,seconds,input={})=>{for(let n=0;n<Math.ceil(seconds*60);n++)tickSurvival(r,input,1/60);};
function isolated(){const r=createSurvivalRun({seed:17});startSurvival(r);r.pickups=[];r.timers.spawn=10000;r.timers.bolt=10000;return r;}
function enemy(r,type,x=200,y=0){const e=spawnSurvivalEnemy(r,type,{x:r.player.x+x,y:r.player.y+y});e.born=-1;return e;}

test('the starter trail provides collection and the first choice within a short walk',()=>{
  const r=createSurvivalRun({seed:19});startSurvival(r);r.timers.spawn=10000;
  for(let i=0;i<240&&r.status==='running';i++){
    const p=r.pickups.filter(p=>p.starter).sort((a,b)=>Math.hypot(a.x-r.player.x,a.y-r.player.y)-Math.hypot(b.x-r.player.x,b.y-r.player.y))[0];
    tickSurvival(r,p?{x:p.x-r.player.x,y:p.y-r.player.y}:{},1/60);
  }
  assert.equal(r.status,'upgrade');assert.equal(r.level,2);
  assert.ok(r.growth.firstPickupAt<1);assert.ok(r.growth.firstLevelAt<4);
  assert.equal(r.growth.collected,6);
});
test('weapon branches are mutually exclusive and previews use the actual combat values',()=>{
  const r=isolated();r.upgrades.bolt=3;r.status='upgrade';r.choices=['bolt_fan','bolt_lance','power'];
  const preview=upgradePreview(r,'bolt_fan');assert.ok(chooseSurvivalUpgrade(r,'bolt_fan'));
  const actual=weaponStats(r,'bolt');
  assert.equal(Number(preview.find(x=>x.label==='발사체').after),actual.count);
  assert.equal(Number(preview.find(x=>x.label==='피해').after),Math.round(actual.damage*10)/10);
  assert.equal(canUpgrade(r,'bolt_lance'),false);advance(r,.5);
  for(let n=0;n<30;n++)assert.ok(!survivalUpgradeChoices(r).includes('bolt_lance'));
  r.upgrades.nova=3;
  assert.ok(upgradePreview(r,'nova_heavy').find(x=>x.label==='밀쳐내기').after>weaponStats(r,'nova').knockback);
});
test('a confirmed choice cannot double-apply, freezes combat, then protects input recovery',()=>{
  const r=isolated();r.status='upgrade';r.choices=['speed','power','health'];
  const e=enemy(r,'spore',0,0),before=r.time;
  chooseSurvivalUpgrade(r,'speed');
  assert.equal(chooseSurvivalUpgrade(r,'power'),false);advance(r,.4);
  assert.equal(r.time,before);assert.equal(r.player.hp,100);assert.equal(r.status,'confirm');
  advance(r,.2);assert.equal(r.status,'running');assert.equal(r.player.hp,100);
  e.speed=0;advance(r,.6);assert.equal(r.player.hp,100);advance(r,.8);assert.ok(r.player.hp<100);
});
test('desktop and portrait spawn points stay outside the camera even at world edges',()=>{
  for(const size of [[1180,760],[390,580],[844,350]])for(const position of [[1400,1100],[24,24],[2776,2176]]){
    const r=isolated();setSurvivalViewport(r,...size);[r.player.x,r.player.y]=position;
    const c=survivalCamera(r);
    assert.ok(c.x-r.view.width/2>=-1e-6&&c.y-r.view.height/2>=-1e-6);
    assert.ok(c.x+r.view.width/2<=WORLD.width+1e-6&&c.y+r.view.height/2<=WORLD.height+1e-6);
    for(let i=0;i<20;i++){
      const e=spawnSurvivalEnemy(r);assert.ok(e);
      assert.ok(Math.abs(e.x-c.x)>r.view.width/2+45||Math.abs(e.y-c.y)>r.view.height/2+45);
      assert.ok(Math.hypot(e.x-r.player.x,e.y-r.player.y)>240);
    }
  }
});
test('crowds separate without awarding kills and far ordinary enemies are retired',()=>{
  const r=isolated(),a=enemy(r,'cocci',200),b=enemy(r,'cocci',200);a.speed=0;b.speed=0;
  advance(r,.5);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>15);
  const far=spawnSurvivalEnemy(r,'spore',{x:40,y:40}),boss=spawnSurvivalEnemy(r,'boss',{x:80,y:80});far.speed=0;boss.speed=0;boss.attackAt=0;
  advance(r,9);
  assert.ok(!r.enemies.includes(far));assert.ok(r.enemies.includes(boss));assert.equal(r.kills,0);assert.equal(r.hazards.length,0);
});
test('charger commits to its telegraphed direction instead of steering during a dash',()=>{
  const r=isolated(),e=enemy(r,'charger',250);e.attackAt=0;
  tickSurvival(r);assert.equal(e.state,'windup');assert.equal(r.hazards[0].type,'lane');assert.equal(r.player.hp,100);
  const y=e.y;r.player.y+=180;advance(r,1.15);
  assert.equal(e.state,'charge');assert.ok(Math.abs(e.y-y)<1);assert.ok(e.x<r.player.x+200);
});
test('ranged, area denial, splitting, and elite attacks have different mechanics',()=>{
  for(const [type,hazard] of [['ranger','bullet'],['blocker','zone'],['warden','ring']]){
    const r=isolated(),e=enemy(r,type,250);e.attackAt=0;tickSurvival(r);
    assert.equal(r.hazards[0].type,hazard);assert.ok(r.hazards[0].at>r.time);assert.equal(r.player.hp,100);
  }
  const r=isolated(),e=enemy(r,'splitter');damageSurvivalEnemy(r,e,999);
  assert.equal(r.pending.length,3);advance(r,.3);assert.equal(r.enemies.filter(e=>e.type==='fragment').length,0);
  advance(r,.3);assert.equal(r.enemies.filter(e=>e.type==='fragment').length,3);
  for(const [type,pattern,hazard] of [['elite',0,'lane'],['warden',1,'bullet'],['boss',0,'ring'],['boss',1,'bullet'],['boss',2,'lane']]){
    const b=isolated(),boss=enemy(b,type,200);boss.attackAt=0;boss.pattern=pattern;tickSurvival(b);assert.equal(b.hazards[0].type,hazard);
  }
});
test('priority targets affect auto aim only while alive and within the same weapon range',()=>{
  const r=isolated();r.timers.bolt=0;enemy(r,'cocci',80);
  const boss=enemy(r,'boss',0,260);
  assert.ok(setSurvivalPriority(r,boss.id));tickSurvival(r);
  assert.ok(Math.abs(r.shots[0].vx)<1);assert.ok(r.shots[0].vy>0);
  r.time=11;tickSurvival(r);assert.equal(r.priority,null);
  boss.x=r.player.x+1000;setSurvivalPriority(r,boss.id);r.timers.bolt=0;r.shots=[];
  tickSurvival(r);assert.ok(r.shots[0].vx>0);
});
test('wave phases include recovery windows and sites give bounded repeatable objectives',()=>{
  const r=isolated();r.bossStage=3;
  for(const [time,phase] of [[0,'influx'],[10,'clash'],[22,'collect'],[28,'rest']]){r.time=time;tickSurvival(r);assert.equal(r.phase,phase);}
  const supply=r.sites.find(s=>s.type==='supply');r.player.x=supply.x;r.player.y=supply.y;r.player.hp=30;
  tickSurvival(r);assert.equal(r.player.hp,70);tickSurvival(r);assert.equal(r.player.hp,70);
  const haven=r.sites.find(s=>s.type==='haven');r.player.x=haven.x;r.player.y=haven.y;tickSurvival(r);assert.ok(haven.activeUntil>r.time);
  enemy(r,'spore',0,0);advance(r,.2);assert.equal(r.player.hp,70);
  const cache=r.sites.find(s=>s.type==='cache');r.player.x=cache.x;r.player.y=cache.y;tickSurvival(r);
  assert.equal(cache.visits,1);assert.ok(r.pending.length>=4);assert.ok(r.pickups.length<=LIMITS.pickups);
});
test('winning, fastest completion, failed survival and seeded build history stay separate',()=>{
  const record=normalizeSurvivalRecord({wins:2,bestTime:999,bestKills:80,audioOn:false});
  assert.equal(record.bestFailure,0);assert.equal(record.legacyBestTime,999);assert.equal(record.fastestWin,null);assert.equal(record.audioOn,false);
  const r=isolated();r.status='lost';r.time=280;r.kills=100;saveSurvivalResult(record,r);
  r.status='won';r.time=315;r.upgrades.bolt=3;r.branches.bolt='bolt_lance';r.history=[{id:'bolt_lance',time:90,level:8}];saveSurvivalResult(record,r);
  r.time=302;saveSurvivalResult(record,r);
  assert.equal(record.fastestWin,302);assert.equal(record.bestFailure,280);assert.equal(record.wins,4);assert.equal(record.bestKills,100);
  const restored=normalizeSurvivalRecord(JSON.parse(JSON.stringify(record)));
  assert.deepEqual(restored.history,record.history);assert.equal(restored.history[0].seed,17);assert.equal(restored.history[0].branches.bolt,'bolt_lance');
  for(let i=0;i<20;i++)saveSurvivalResult(record,r);assert.equal(record.history.length,12);
  const corrupt=normalizeSurvivalRecord({schema:2,history:[{seed:'<script>',status:'won'},{seed:12,status:'lost',upgrades:{bolt:999},branches:{bolt:'missing'},choices:[{id:'bad'}]}]});
  assert.equal(corrupt.history.length,1);assert.equal(corrupt.history[0].upgrades.bolt,UPGRADE_BY_ID.bolt.max);assert.deepEqual(corrupt.history[0].branches,{});
});