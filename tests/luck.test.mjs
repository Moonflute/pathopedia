import test from 'node:test';
import assert from 'node:assert/strict';
import {MODES,MAX_CROWD,unitById} from '../src/luck-data.mjs';
import {createLuckRun,summon,summonCost,moveOrMerge,canMerge,craft,recipeSlots,pause,tickLuck,chooseAugment} from '../src/luck-engine.mjs';
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
 assert.equal(moveOrMerge(r,0,1),false);
});
test('re-roll: merge frees one slot, grows the unit and grants a stone',()=>{
 const r=createLuckRun('remedy',10);r.board.fill(null);r.board[0]={id:'pen',star:1,uid:100,cooldown:0};r.board[1]={id:'pen',star:1,uid:101,cooldown:0};
 const gems=r.gems;assert.ok(canMerge(r.board[0],r.board[1]));assert.ok(moveOrMerge(r,0,1));
 assert.equal(r.board[0],null);assert.ok(r.board[1].star>=2);assert.equal(r.gems,gems+1);assert.equal(r.merges,1);
 r.board[2]={id:'cef',star:1,uid:102,cooldown:0};assert.ok(moveOrMerge(r,1,2));assert.equal(r.board[1].id,'cef');
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
