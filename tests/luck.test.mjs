import test from 'node:test';
import assert from 'node:assert/strict';
import {MODES,BOARD,MAX_CROWD,unitById,cellCenter,trackPoint} from '../src/luck-data.mjs';
import {createLuckRun,summon,summonCost,moveUnit,canMerge,craft,recipeSlots,pause,tickLuck,chooseAugment,autoMerge,synergies,traitEffects,unitPower,summonBatch,batchCost,drawOdds,unitRange,unitInterval,supportCells,currentHighlight} from '../src/luck-engine.mjs';
test('re-roll: seeded draws and both factions remain deterministic',()=>{
 for(const mode of Object.keys(MODES)){
  const a=createLuckRun(mode,1234),b=createLuckRun(mode,1234);
  for(let i=0;i<4;i++){summon(a);summon(b);}
  assert.deepEqual(a,b);
  assert.ok(a.board.filter(Boolean).every(u=>unitById(mode,u.id)));
 }
});
test('re-roll: full boards and paused games do not spend resources',()=>{
 const r=createLuckRun();r.board=r.board.map((_,i)=>({id:'pen',star:1,uid:i+1,cooldown:0,shots:0}));
 const gold=r.gold,gems=r.gems;assert.equal(summon(r),false);assert.equal(summon(r,true),false);
 assert.equal(r.gold,gold);assert.equal(r.gems,gems);pause(r);const t=r.totalTime;tickLuck(r,1/30);assert.equal(r.totalTime,t);
 assert.equal(moveUnit(r,0,1),false);
});
test('re-roll: auto-merge grows pieces, then dragging only swaps settled pieces',()=>{
 const r=createLuckRun('remedy',10);r.board.fill(null);r.fusions=[];
 r.board[0]={id:'pen',star:1,uid:100,cooldown:0};r.board[1]={id:'pen',star:1,uid:101,cooldown:0};
 const gems=r.gems,merges=r.merges;assert.ok(canMerge(r.board[0],r.board[1]));assert.equal(autoMerge(r),1);
 assert.equal(r.board[1],null);assert.ok(r.board[0].star>=2);assert.equal(r.gems,gems+1);assert.equal(r.merges,merges+1);
 assert.equal(moveUnit(r,0,2),false);r.totalTime=r.board[0].readyAt;
 r.board[2]={id:'cef',star:1,uid:102,cooldown:0};assert.ok(moveUnit(r,0,2));assert.equal(r.board[0].id,'cef');assert.equal(r.board[2].id,'pen');
});
test('re-roll: mythic crafting consumes exactly the displayed ingredients',()=>{
 for(const mode of Object.keys(MODES)){
  const r=createLuckRun(mode,55),recipe=MODES[mode].recipes[0];r.board.fill(null);
  assert.equal(craft(r,recipe.id),false);
  recipe.needs.forEach((id,i)=>r.board[i]={id,star:1,uid:100+i,cooldown:0});
  assert.deepEqual(recipeSlots(r,recipe.id),[0,1,2]);assert.ok(craft(r,recipe.id));
  assert.equal(r.board.filter(Boolean).length,1);assert.equal(r.board[0].id,recipe.id);
 }
});
test('re-roll: a free board slot cannot bypass summon currency checks',()=>{
 const r=createLuckRun();r.gold=summonCost(r)-1;const count=r.board.filter(Boolean).length;
 assert.equal(summon(r),false);assert.equal(r.board.filter(Boolean).length,count);
 r.gems=2;assert.equal(summon(r,true),false);
});
test('re-roll: crowd defeat, boss deadline and final clear terminate the run',()=>{
 const a=createLuckRun();a.board.fill(null);
 a.enemies=Array.from({length:MAX_CROWD},(_,id)=>({id,hp:1e6,maxHp:1e6,speed:0,d:0,slow:0,stun:0,hit:0,poison:0}));
 tickLuck(a,1/60);assert.equal(a.status,'lost');
 const b=createLuckRun();b.board.fill(null);b.enemies=[{id:99,boss:true,hp:1e6,maxHp:1e6,speed:0,d:0,slow:0,stun:0,hit:0,poison:0,deadline:0}];
 tickLuck(b,1/60);assert.equal(b.status,'lost');
 const c=createLuckRun();c.wave=20;c.bossSpawned=true;c.bossDefeated=20;c.spawned=c.spawnCount;c.enemies=[];tickLuck(c,1/60);assert.equal(c.status,'won');
});
test('re-roll: upgrade selection is restricted to offered choices',()=>{
 const r=createLuckRun();r.status='choice';r.choices=['wealth','haste','power'];
 assert.equal(chooseAugment(r,'bounty'),false);const gold=r.gold;assert.equal(chooseAugment(r,'wealth'),true);
 assert.ok(r.gold>=gold+180);assert.equal(r.status,'running');assert.equal(chooseAugment(r,'wealth'),false);
});

test('re-roll: automatic merges cascade, reward each pair and respect the cap',()=>{
 const r=createLuckRun('remedy',1);r.board.fill(null);r.rng=123456;r.augments=['merge'];
 r.board[0]={id:'pen',star:4,uid:100,cooldown:0};r.board[1]={id:'pen',star:4,uid:101,cooldown:0};
 r.board[2]={id:'cef',star:1,uid:102,cooldown:0};r.board[3]={id:'cef',star:1,uid:103,cooldown:0};r.board[4]={id:'cef',star:2,uid:104,cooldown:0};
 const gems=r.gems,gold=r.gold;const merged=autoMerge(r);assert.ok(merged>=2);assert.equal(r.gems,gems+merged);assert.equal(r.gold,gold+25*merged);
 assert.equal(r.board[0].star,5);assert.equal(r.board[1],null);
 for(const a of r.board)for(const b of r.board)assert.equal(canMerge(a,b),false);
 r.board[1]={id:'pen',star:5,uid:105,cooldown:0};assert.equal(autoMerge(r),0);
 pause(r);r.board[5]={id:'gen',star:1,uid:106};r.board[6]={id:'gen',star:1,uid:107};assert.equal(autoMerge(r),0);
});
test('re-roll: every summon and initial board resolves identical pairs automatically',()=>{
 for(const mode of Object.keys(MODES)){
  const r=createLuckRun(mode,456);r.gold=10000;r.gems=100;
  for(let i=0;i<30;i++){summon(r,i%3===0);for(const a of r.board)for(const b of r.board)assert.equal(canMerge(a,b),false);}
 }
});
test('re-roll: clinical families count distinct pieces and activate battle modifiers',()=>{
 const r=createLuckRun('remedy',1);r.board.fill(null);
 ['cef','cef','cefi'].forEach((id,i)=>r.board[i]={id,star:i+1,uid:100+i});
 assert.equal(synergies(r).wall,2);assert.equal(synergies(r).ceph,2);
 const effects=traitEffects(r);assert.equal(effects.power,1.12);assert.equal(effects.area,1.3);
 assert.equal(unitPower(r,r.board[0]),unitById('remedy','cef').damage*1.12);
 const c=createLuckRun('colony',1);c.board.fill(null);
 ['coli','kleb','pseudo','hydra','crypto'].forEach((id,i)=>c.board[i]={id,star:1,uid:100+i});
 assert.equal(synergies(c).negative,4);assert.equal(traitEffects(c).power,1.3);assert.equal(traitEffects(c).boss,1.3);
 for(const m of Object.values(MODES))for(const d of m.units){assert.ok(d.family);assert.ok(d.traits.length);}
});

test('re-roll: ten-draw is identical to ten singles and charges the quoted price',()=>{
 const a=createLuckRun('remedy',723),b=createLuckRun('remedy',723);a.gold=b.gold=1000;
 const price=batchCost(a),before=a.gold;assert.ok(summonBatch(a));for(let i=0;i<10;i++)assert.ok(summon(b));
 assert.equal(a.gold,before-price);assert.equal(a.summons,10);assert.deepEqual(a.board,b.board);assert.deepEqual(a.fusions,b.fusions);assert.equal(a.rng,b.rng);
});
test('re-roll: failed ten-draws cannot spend currency, consume pity or advance RNG',()=>{
 const r=createLuckRun('remedy',7);r.gold=10000;r.fusions=[];r.board.fill(null);
 r.board=r.board.map((_,i)=>({id:MODES.remedy.units[i%MODES.remedy.units.length].id,star:5,uid:100+i,cooldown:0,shots:0}));r.board[24]=null;
 const before=structuredClone(r);assert.equal(summonBatch(r),false);
 assert.deepEqual({...r,events:[]},{...before,events:[]});
 r.board.fill(null);r.gold=batchCost(r)-1;const rng=r.rng;assert.equal(summonBatch(r),false);assert.equal(r.rng,rng);
 pause(r);assert.equal(summonBatch(r),false);
});
test('re-roll: lucky draws favor high tiers, include mythics and improve with luck',()=>{
 const r=createLuckRun('remedy',1),normal=drawOdds(r),lucky=drawOdds(r,true);
 assert.ok(Math.abs(lucky.reduce((a,b)=>a+b,0)-1)<1e-10);assert.equal(lucky[0],0);
 assert.ok(Math.abs(lucky.slice(2).reduce((a,b)=>a+b,0)-.8)<1e-10);
 assert.ok(lucky[3]>normal[3]);assert.equal(lucky[4],.02);
 r.luck=4;r.augments=['luck'];assert.ok(drawOdds(r,true)[4]>lucky[4]);assert.ok(drawOdds(r,true).every(x=>x>=0));
 r.board.fill(null);r.fusions=[];r.gems=3;r.rng=1;assert.ok(summon(r,true));assert.equal(unitById(r.mode,r.board.find(Boolean).id).rarity,4);
});
test('re-roll: chained merge animations finish in order and 3-star results get a longer reveal',()=>{
 const r=createLuckRun('remedy',99);r.board.fill(null);r.fusions=[];r.rng=123456;
 [1,1,2].forEach((star,i)=>r.board[i]={id:'pen',star,uid:100+i,cooldown:0,shots:0});
 autoMerge(r);assert.ok(r.fusions.length>=1);
 for(const f of r.fusions){assert.ok(f.start>=f.aReady);assert.ok(f.start>=f.bReady);assert.ok(f.end>f.start);}
 const fancy=r.fusions.find(f=>f.star>=3);assert.ok(fancy);assert.ok(fancy.end-fancy.start>.8);
 const settled=r.board.find(Boolean);assert.equal(settled.readyAt,r.fusions.at(-1).end);
});
test('re-roll: each piece has a distinct attack or productive role with finite effects',()=>{
 const skills=new Set();
 for(const mode of Object.keys(MODES))for(const def of MODES[mode].units){
  skills.add(def.skill);const r=quietRun(mode);r.board[2]=piece(def.id);r.board[2].cooldown=0;
  r.enemies=[264,274,284].map((d,i)=>enemy(500+i,d));
  tickLuck(r,1/60);const effects=r.effects.length;
  for(let i=0;i<30;i++)tickLuck(r,1/60);
  if(def.damage>0)assert.ok(r.enemies.some(e=>e.hp<1e6),mode+':'+def.id);
  assert.ok(r.enemies.every(e=>Number.isFinite(e.hp)));assert.ok(effects>0);
  const range=unitRange(r,r.board[2]);r.augments.push('range');assert.equal(unitRange(r,r.board[2]),range*1.35);
 }
 assert.equal(skills.size,Object.values(MODES).reduce((n,m)=>n+m.units.length,0));
});
function quietRun(mode='remedy'){
 const r=createLuckRun(mode,444);r.board.fill(null);r.effects=[];r.fusions=[];r.highlights=[];r.spawned=r.spawnCount=0;r.waveTime=-100;return r;
}
function piece(id,star=1,uid=200){return{id,star,uid,cooldown:0,shots:0,readyAt:0,growthAge:0};}
function enemy(id,d=264,hp=1e6){return{id,hp,maxHp:hp,d,...trackPoint(d),speed:0,hit:0,slow:0,stun:0,poison:0,poisonDamage:0,radius:10};}
function advance(r,seconds){for(let i=0;i<Math.round(seconds*60);i++)tickLuck(r,1/60);}
test('re-roll: all 25 cells can be reached and dragging respects the new boundary',()=>{
 const r=quietRun();assert.equal(r.board.length,25);assert.equal(BOARD.cols,5);assert.equal(BOARD.rows,5);
 r.board[0]=piece('pen');assert.ok(moveUnit(r,0,24));assert.equal(r.board[24].id,'pen');assert.equal(moveUnit(r,24,25),false);
 const last=cellCenter(24);assert.ok(last.x<BOARD.width&&last.y<BOARD.height);
});
test('re-roll: producers earn on their own clock without enemies or attack-speed exploits',()=>{
 for(const [mode,id] of [['remedy','saline'],['colony','yeast']]){
  const r=quietRun(mode);r.board[12]=piece(id,2);r.board[12].cooldown=8;r.augments=['haste'];
  const gold=r.gold;advance(r,7.9);assert.equal(r.gold,gold);
  advance(r,.2);assert.equal(r.gold,gold+16);assert.equal(unitInterval(r,r.board[12],12),8);
  pause(r);advance(r,8);assert.equal(r.gold,gold+16);
 }
});
test('re-roll: support follows placement, excludes the caster and expires after a pulse',()=>{
 const r=quietRun('colony');r.board[12]=piece('plasmid');r.board[2]=piece('cocci',1,201);r.board[1]=piece('cocci',1,202);
 assert.equal(unitPower(r,r.board[2])/unitPower(r,r.board[1]),1.24);assert.equal(supportCells(r,12).length,8);
 moveUnit(r,12,6);assert.equal(unitPower(r,r.board[1])/unitPower(r,r.board[2]),1.24);
 const a=quietRun();a.board[12]=piece('adren');a.board[6]=piece('pen',1,201);a.board[0]=piece('pen',1,202);
 const interval=unitInterval(a,a.board[6],6);tickLuck(a,1/60);
 assert.ok(unitInterval(a,a.board[6],6)<interval);assert.equal(unitInterval(a,a.board[0],0),interval);
 advance(a,3.1);assert.equal(unitInterval(a,a.board[6],6),interval);
});
test('re-roll: traps arm before exploding, while iodine weakens enemies for allied attacks',()=>{
 const r=quietRun();r.board[2]=piece('peroxide');r.enemies=[enemy(500)];
 tickLuck(r,1/60);assert.equal(r.traps.length,1);assert.equal(r.enemies[0].hp,1e6);
 advance(r,.4);assert.equal(r.traps.length,0);assert.ok(r.enemies[0].hp<1e6);assert.ok(r.enemies[0].stun>0);
 const a=quietRun();a.board[2]=piece('beta');a.enemies=[enemy(500)];tickLuck(a,1/60);
 assert.ok(a.enemies[0].exposed>0);assert.equal(a.pools[0].kind,'iodine');
 a.pools=[];a.board[2]=piece('pen');const b=structuredClone(a);b.enemies[0].exposed=0;
 const hp=a.enemies[0].hp;tickLuck(a,1/60);tickLuck(b,1/60);
 assert.ok(Math.abs((hp-a.enemies[0].hp)/(hp-b.enemies[0].hp)-1.25)<1e-7);
});
test('re-roll: phage uses a lower boss execution threshold and toxin deaths trigger splash',()=>{
 for(const boss of [false,true]){
  const r=quietRun('colony');r.board[2]=piece('phage');
  r.enemies=[{...enemy(500,264,300),maxHp:2000,boss,deadline:999,skillTimer:7}];tickLuck(r,1/60);
  assert.equal(r.enemies.length,boss?1:0);
 }
 const r=quietRun('colony');r.board[2]=piece('toxin');r.enemies=[enemy(500,264),enemy(501,274)];tickLuck(r,1/60);
 assert.ok(r.enemies.every(e=>e.volatile>0));
 r.enemies[1].hp=1;r.board[2]=piece('cocci');const before=r.enemies[0].hp;tickLuck(r,1/60);
 assert.ok(r.enemies[0].hp<before-40);assert.ok(r.effects.some(e=>e.type==='toxinburst'));
});
test('re-roll: growth resolves auto-merges and reveals only after the gathering completes',()=>{
 const r=quietRun('colony');r.board[0]=piece('spore');r.board[0].growthAge=23.99;r.board[1]=piece('spore',2,201);
 tickLuck(r,1/60);assert.equal(r.board.filter(Boolean).length,1);assert.ok(r.board[0].star>=3);
 assert.equal(currentHighlight(r),null);const end=r.board[0].readyAt;r.totalTime=end;
 assert.ok(currentHighlight(r)?.star>=3);assert.ok(moveUnit(r,0,24));
 r.totalTime=end+2;assert.equal(currentHighlight(r),null);
 const a=quietRun();a.gems=3;a.rng=1;summon(a,true);assert.equal(currentHighlight(a)?.rarity,4);
});
