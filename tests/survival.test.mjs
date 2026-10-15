import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES, LIMITS, RUN_DURATION, UPGRADE_BY_ID, WORLD } from '../src/survival-data.mjs';
import { addSurvivalPickup, chooseSurvivalUpgrade, createSurvivalRun, damageSurvivalEnemy, pauseSurvival, resumeSurvival, spawnSurvivalEnemy, startSurvival, survivalOrbitPositions, survivalStats, tickSurvival } from '../src/survival-engine.mjs';

function setup() {
  const run = createSurvivalRun({ seed: 32 });
  startSurvival(run); run.timers.spawn = 10000;
  return run;
}
function advance(run, seconds, input = {}) {
  for (let i = 0; i < Math.round(seconds * 60); i++) tickSurvival(run, input, 1 / 60);
}
function enemyAt(run, x, y, type = 'cocci') {
  const enemy = spawnSurvivalEnemy(run, type, { x, y });
  enemy.born = -1; return enemy;
}

test('movement is normalized, bounded, and frozen outside an active run', () => {
  const straight = setup(), diagonal = setup(), origin = { ...straight.player };
  advance(straight, .5, { x: 1 }); advance(diagonal, .5, { x: 1, y: 1 });
  assert.ok(Math.abs(straight.player.x - origin.x - Math.hypot(diagonal.player.x-origin.x,diagonal.player.y-origin.y)) < 1e-6);
  diagonal.player.x = WORLD.width - 24; diagonal.player.y = 24;
  tickSurvival(diagonal, { x: 1, y: -1 });
  assert.equal(diagonal.player.x, WORLD.width - 24); assert.equal(diagonal.player.y, 24);
  assert.ok(pauseSurvival(diagonal));
  const snapshot = structuredClone(diagonal);
  advance(diagonal, 3, { x: -1, y: 1 });
  assert.deepEqual(diagonal, snapshot);
  assert.ok(resumeSurvival(diagonal)); advance(diagonal, .2, { x: -1 }); assert.ok(diagonal.player.x < snapshot.player.x);
  for (const status of ['menu','upgrade','won','lost']) {
    const run = setup(); run.status = status; const before = structuredClone(run);
    advance(run, 1, { x: 1 }); assert.deepEqual(run, before);
  }
});

test('automatic projectiles kill nearby targets once and leave collectible experience', () => {
  const run = setup(), enemy = enemyAt(run, run.player.x + 120, run.player.y);
  advance(run, .5);
  assert.equal(run.kills, 1); assert.equal(enemy.hp, 0);
  assert.equal(damageSurvivalEnemy(run, enemy, 999), false); assert.equal(run.kills, 1);
  assert.equal(run.pickups.filter(p => p.type === 'xp').reduce((sum,p) => sum+p.value,0) + run.xp, ENEMIES.cocci.xp);
});

test('collecting XP pauses for three distinct choices, which cannot be forged or applied twice', () => {
  const run = setup();
  addSurvivalPickup(run, run.player.x, run.player.y, 8);
  tickSurvival(run);
  assert.equal(run.status, 'upgrade'); assert.equal(run.level, 2);
  assert.equal(run.choices.length, 3); assert.equal(new Set(run.choices).size, 3);
  const snapshot = structuredClone(run); advance(run, 5, { x: 1 }); assert.deepEqual(run, snapshot);
  assert.equal(chooseSurvivalUpgrade(run, 'not-an-upgrade'), false); assert.deepEqual(run, snapshot);
  const choice = run.choices[0], before = run.upgrades[choice];
  assert.ok(chooseSurvivalUpgrade(run, choice)); assert.equal(run.upgrades[choice], before+1);
  assert.equal(run.status, 'running'); assert.equal(chooseSurvivalUpgrade(run, choice), false);
});

test('banked XP triggers successive choices and capped upgrades are never offered', () => {
  const run = setup(); run.xp = 1000;
  for (const id of Object.keys(run.upgrades)) if (!['speed','health','repair'].includes(id)) run.upgrades[id] = UPGRADE_BY_ID[id].max;
  tickSurvival(run);
  assert.ok(run.choices.every(id => ['speed','health','repair'].includes(id)));
  assert.ok(chooseSurvivalUpgrade(run, run.choices[0]));
  assert.equal(run.status, 'upgrade'); assert.equal(run.level, 3);
  while (run.status === 'upgrade') assert.ok(chooseSurvivalUpgrade(run, run.choices[0]));
  assert.ok(run.level > 3); assert.ok(run.xp < run.nextXp);
  assert.ok(run.upgrades.speed <= 4); assert.ok(run.upgrades.health <= 4);
});

test('vitality increases actual maximum HP and healing cannot exceed it', () => {
  const run = setup(); run.status = 'upgrade'; run.choices = ['health']; run.player.hp = 95;
  chooseSurvivalUpgrade(run, 'health');
  assert.equal(survivalStats(run).maxHp, 125); assert.equal(run.player.hp,125);
  addSurvivalPickup(run,run.player.x,run.player.y,500,'health');tickSurvival(run);
  assert.equal(run.player.hp,125);
  run.status='upgrade';run.choices=['repair'];run.player.hp=15;
  chooseSurvivalUpgrade(run,'repair');assert.equal(run.player.hp,60);
});

test('orbit, nova and chained electricity each damage enemies using their geometry', () => {
  const orbit = setup(); orbit.upgrades.orbit = 1; orbit.timers.bolt = 10000;
  const point = survivalOrbitPositions(orbit)[0], target = enemyAt(orbit, point.x, point.y, 'spore'), hp = target.hp;
  tickSurvival(orbit); assert.ok(target.hp < hp);
  const after = target.hp; tickSurvival(orbit); assert.equal(target.hp, after);
  const nova = setup(); nova.upgrades.nova = 1; nova.timers.bolt = 10000;
  const near = enemyAt(nova,nova.player.x+90,nova.player.y,'spore');
  const far = enemyAt(nova,nova.player.x+220,nova.player.y,'spore');
  tickSurvival(nova); assert.ok(near.hp<near.maxHp);assert.equal(far.hp,far.maxHp);
  const chain = setup(); chain.upgrades.chain=1;chain.timers.bolt=10000;
  const a=enemyAt(chain,chain.player.x+250,chain.player.y,'spore');
  const b=enemyAt(chain,chain.player.x+410,chain.player.y,'spore');
  const c=enemyAt(chain,chain.player.x+700,chain.player.y,'spore');
  tickSurvival(chain);assert.ok(a.hp<a.maxHp);assert.ok(b.hp<b.maxHp);assert.equal(c.hp,c.maxHp);
});

test('contact damage has a grace period and death ends the run without posthumous healing', () => {
  const run=setup();run.timers.bolt=10000;
  enemyAt(run,run.player.x,run.player.y,'spore');
  tickSurvival(run);const hp=run.player.hp;
  advance(run,.4);assert.equal(run.player.hp,hp);
  advance(run,.5);assert.ok(run.player.hp<hp);
  run.player.hp=1;run.player.invulnerable=0;
  addSurvivalPickup(run,run.player.x,run.player.y,50,'health');
  tickSurvival(run);assert.equal(run.status,'lost');assert.equal(run.player.hp,0);
});

test('boss attacks telegraph before damage and pause freezes the telegraph', () => {
  const run=setup(),enemy=enemyAt(run,run.player.x+400,run.player.y,'boss');
  enemy.attackAt=0;tickSurvival(run);
  assert.equal(run.hazards.length,1);assert.equal(run.player.hp,100);
  const at=run.hazards[0].at;pauseSurvival(run);advance(run,3);
  assert.equal(run.hazards[0].at,at);assert.equal(run.player.hp,100);
  resumeSurvival(run);advance(run,1.3);assert.ok(run.player.hp<100);
});

test('a full horde cannot prevent the final boss and victory requires both objectives', () => {
  const run=setup();run.time=269.99;run.bossStage=2;
  for(let i=0;i<LIMITS.enemies;i++) spawnSurvivalEnemy(run,'cocci',{x:100+i,y:100});
  tickSurvival(run);
  assert.equal(run.enemies.length,LIMITS.enemies);
  const boss=run.enemies.find(e=>e.type==='boss');assert.ok(boss);assert.equal(run.bossStage,3);
  run.time=RUN_DURATION;tickSurvival(run);assert.equal(run.status,'running');
  damageSurvivalEnemy(run,boss,999999);tickSurvival(run);assert.equal(run.status,'won');
  const early=setup();early.time=280;early.bossStage=3;
  const earlyBoss=enemyAt(early,100,100,'boss');damageSurvivalEnemy(early,earlyBoss,999999);
  tickSurvival(early);assert.equal(early.status,'running');
  early.time=300;tickSurvival(early);assert.equal(early.status,'won');
});

test('pickup compaction and horde limits bound memory while preserving every XP point', () => {
  const run=setup();
  for(let i=0;i<2000;i++)addSurvivalPickup(run,100+i,100,2);
  assert.ok(run.pickups.length<=LIMITS.pickups);
  assert.equal(run.pickups.reduce((sum,p)=>sum+p.value,0),4000);
  addSurvivalPickup(run,120,100,14,'health');
  assert.ok(run.pickups.length<=LIMITS.pickups);
  assert.equal(run.pickups.filter(p=>p.type==='xp').reduce((sum,p)=>sum+p.value,0),4000);
  for(let i=0;i<300;i++)spawnSurvivalEnemy(run);
  assert.equal(run.enemies.length,LIMITS.enemies);
  assert.ok(run.enemies.every(e=>Math.hypot(e.x-run.player.x,e.y-run.player.y)>300));
});

test('vacuum attracts remote XP and collecting it advances progression', () => {
  const run=setup();addSurvivalPickup(run,run.player.x+700,run.player.y,8);
  addSurvivalPickup(run,run.player.x,run.player.y,1,'vacuum');
  tickSurvival(run);assert.equal(run.pickups[0].attracted,true);
  advance(run,2);assert.equal(run.status,'upgrade');assert.equal(run.level,2);
});

test('seeded runs remain deterministic and invalid frame deltas cannot advance them', () => {
  const a=createSurvivalRun({seed:20}),b=createSurvivalRun({seed:20});
  startSurvival(a);startSurvival(b);
  for(let i=0;i<900;i++){const input={x:Math.cos(i/120),y:Math.sin(i/120)};tickSurvival(a,input);tickSurvival(b,input);}
  assert.deepEqual(a,b);
  const before=structuredClone(a);for(const dt of [NaN,Infinity,-1,0])tickSurvival(a,{x:1},dt);
  assert.deepEqual(a,before);
});
