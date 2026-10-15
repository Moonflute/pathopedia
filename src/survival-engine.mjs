import { ENEMIES, LIMITS, RUN_DURATION, UPGRADE_BY_ID, UPGRADES, WORLD } from './survival-data.mjs';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function random(run) {
  run.randomState = (run.randomState + 0x6D2B79F5) >>> 0;
  let n = Math.imul(run.randomState ^ (run.randomState >>> 15), 1 | run.randomState);
  n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}
export function createSurvivalRun({ seed = Date.now() } = {}) {
  return {
    status: 'menu', randomState: seed >>> 0, time: 0, kills: 0, level: 1, xp: 0, nextXp: 8,
    player: { x: WORLD.width / 2, y: WORLD.height / 2, hp: 100, radius: 14, invulnerable: 0, angle: -Math.PI / 2, moving: false },
    upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, u.id === 'bolt' ? 1 : 0])),
    timers: { spawn: 0, bolt: 0, nova: 0, chain: 0 }, enemies: [], shots: [], pickups: [], effects: [], hazards: [],
    choices: [], bossStage: 0, bossDefeated: false, nextId: 1, hurt: 0, banner: '', bannerUntil: 0,
  };
}
export function survivalStats(run) {
  return {
    maxHp: 100 + run.upgrades.health * 25,
    speed: 180 * (1 + run.upgrades.speed * .1),
    power: 1 + run.upgrades.power * .2,
    haste: 1 + run.upgrades.haste * .15,
    magnet: 65 + run.upgrades.magnet * 35,
  };
}
export function startSurvival(run) {
  if (run.status !== 'menu') return false;
  run.status = 'running';
  run.banner = '이동에 집중하세요. 공격은 자동입니다.';
  run.bannerUntil = 5;
  return true;
}
export function pauseSurvival(run) {
  if (run.status !== 'running') return false;
  run.status = 'paused';
  run.player.moving = false;
  return true;
}
export function resumeSurvival(run) {
  if (run.status !== 'paused') return false;
  run.status = 'running';
  return true;
}
function effect(run, value) {
  if (run.effects.length >= LIMITS.effects) run.effects.shift();
  run.effects.push({ id: run.nextId++, born: run.time, life: .4, ...value });
}
export function addSurvivalPickup(run, x, y, value, type = 'xp') {
  if (run.pickups.length >= LIMITS.pickups) {
    const sameType = run.pickups.filter(p => p.type === type);
    const nearest = sameType.reduce((best, p) => !best || Math.hypot(p.x-x,p.y-y) < Math.hypot(best.x-x,best.y-y) ? p : best, null);
    if (nearest) { nearest.value += value; return nearest; }
    // Make space without losing accumulated XP.
    const xp = run.pickups.filter(p => p.type === 'xp');
    if (xp.length > 1) {
      xp[1].value += xp[0].value;
      run.pickups.splice(run.pickups.indexOf(xp[0]), 1);
    } else return null;
  }
  const pickup = { id: run.nextId++, x, y, value, type, attracted: false };
  run.pickups.push(pickup);
  return pickup;
}
export function spawnSurvivalEnemy(run, type = 'cocci', position) {
  if (!ENEMIES[type] || run.enemies.length >= LIMITS.enemies) return null;
  let point = position;
  if (!point) {
    for (let attempt = 0; attempt < 32; attempt++) {
      const angle = random(run) * Math.PI * 2, radius = 460 + random(run) * 120;
      point = { x: clamp(run.player.x + Math.cos(angle) * radius, 40, WORLD.width - 40), y: clamp(run.player.y + Math.sin(angle) * radius, 40, WORLD.height - 40) };
      if (distance(point, run.player) > 300) break;
    }
    if (distance(point, run.player) <= 300) return null;
  }
  const model = ENEMIES[type], elite = type === 'elite' || type === 'boss';
  const hp = model.hp * (type === 'boss' ? 1 : 1 + run.time / (elite ? 300 : 150));
  const enemy = { ...model, ...point, id: run.nextId++, type, hp, maxHp: hp, elite, born: run.time, hitUntil: 0, orbitUntil: 0, attackAt: run.time + 3, dead: false };
  run.enemies.push(enemy);
  return enemy;
}
export function damageSurvivalEnemy(run, enemy, damage) {
  if (!enemy || enemy.dead || !Number.isFinite(damage) || damage <= 0) return false;
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hitUntil = run.time + .09;
  if (enemy.hp > 0) return false;
  enemy.dead = true;
  run.kills++;
  effect(run, { type: 'burst', x: enemy.x, y: enemy.y, color: enemy.color, radius: enemy.radius, life: .45 });
  addSurvivalPickup(run, enemy.x, enemy.y, enemy.xp);
  if (enemy.type === 'boss') {
    run.bossDefeated = true;
    run.banner = run.time < RUN_DURATION ? '군집의 심장 제거 · 격리가 끝날 때까지 생존하세요' : '군집의 심장 제거';
    run.bannerUntil = run.time + 5;
  }
  if (enemy.elite || run.kills % 24 === 0) addSurvivalPickup(run, enemy.x + 15, enemy.y + 15, enemy.elite ? 35 : 14, 'health');
  if (run.kills % 75 === 0) addSurvivalPickup(run, enemy.x - 15, enemy.y, 1, 'vacuum');
  return true;
}
function hurtPlayer(run, damage) {
  if (run.player.invulnerable > 0) return;
  run.player.hp = Math.max(0, run.player.hp - damage);
  run.player.invulnerable = .75;
  run.hurt = .3;
  if (run.player.hp === 0) run.status = 'lost';
}
export function survivalUpgradeChoices(run) {
  const pool = UPGRADES.filter(u => u.id !== 'repair' && run.upgrades[u.id] < u.max).map(u => u.id);
  if (run.player.hp < survivalStats(run).maxHp || pool.length < 3) pool.push('repair');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random(run) * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Early levels always offer a new weapon so the first run can build a loadout.
  const fresh = pool.find(id => ['orbit', 'nova', 'chain'].includes(id) && !run.upgrades[id]);
  if (run.level <= 5 && fresh) return [fresh, ...pool.filter(id => id !== fresh)].slice(0, 3);
  return pool.slice(0, 3);
}
function levelUp(run) {
  if (run.xp < run.nextXp || run.status !== 'running') return false;
  run.xp -= run.nextXp;
  run.level++;
  run.nextXp = Math.floor(8 + (run.level - 1) * 5 + Math.pow(run.level - 1, 1.5));
  run.choices = survivalUpgradeChoices(run);
  run.status = 'upgrade';
  run.player.moving = false;
  return true;
}
export function chooseSurvivalUpgrade(run, id) {
  if (run.status !== 'upgrade' || !run.choices.includes(id)) return false;
  const upgrade = UPGRADE_BY_ID[id];
  if (!upgrade || run.upgrades[id] >= upgrade.max) return false;
  run.upgrades[id]++;
  if (id === 'health' || id === 'repair') run.player.hp = Math.min(survivalStats(run).maxHp, run.player.hp + (id === 'repair' ? 45 : 35));
  run.choices = [];
  run.status = 'running';
  levelUp(run); // Banked XP produces another real choice instead of silently skipping levels.
  return true;
}
export function survivalOrbitPositions(run) {
  const level = run.upgrades.orbit;
  if (!level) return [];
  return Array.from({ length: level + 1 }, (_, i) => {
    const angle = run.time * 2.4 + i * Math.PI * 2 / (level + 1), radius = 65 + level * 5;
    return { x: run.player.x + Math.cos(angle) * radius, y: run.player.y + Math.sin(angle) * radius };
  });
}
function nearEnemies(run, origin, radius) {
  return run.enemies.filter(e => !e.dead && run.time - e.born >= .6 && distance(e, origin) < radius).sort((a, b) => distance(a, origin) - distance(b, origin));
}
function autoAttack(run, stats) {
  const targets = nearEnemies(run, run.player, 420), target = targets[0];
  if (target && run.timers.bolt <= 0) {
    const level = run.upgrades.bolt, count = 1 + Math.floor(level / 2);
    for (let i = 0; i < count && run.shots.length < LIMITS.shots; i++) {
      const aim = targets[i % targets.length], angle = Math.atan2(aim.y - run.player.y, aim.x - run.player.x);
      run.player.angle = angle;
      run.shots.push({ id: run.nextId++, x: run.player.x, y: run.player.y, vx: Math.cos(angle) * 510, vy: Math.sin(angle) * 510, life: 1.5, damage: (20 + (level - 1) * 8) * stats.power, remaining: 1 + Math.floor(level / 3), hit: new Set() });
    }
    run.timers.bolt = Math.max(.2, .64 - (run.upgrades.bolt - 1) * .045) / stats.haste;
  }
  const orbit = survivalOrbitPositions(run);
  for (const enemy of run.enemies) {
    if (enemy.dead || run.time - enemy.born < .6 || enemy.orbitUntil > run.time) continue;
    if (orbit.some(p => distance(p, enemy) < enemy.radius + 11)) {
      damageSurvivalEnemy(run, enemy, (10 + run.upgrades.orbit * 5) * stats.power);
      enemy.orbitUntil = run.time + .38 / stats.haste;
    }
  }
  if (run.upgrades.nova && run.timers.nova <= 0 && nearEnemies(run, run.player, 100 + run.upgrades.nova * 24).length) {
    const radius = 100 + run.upgrades.nova * 24;
    for (const enemy of nearEnemies(run, run.player, radius)) damageSurvivalEnemy(run, enemy, (22 + run.upgrades.nova * 12) * stats.power);
    effect(run, { type: 'nova', x: run.player.x, y: run.player.y, radius, color: '#86cfff', life: .55 });
    run.timers.nova = 4.2 / stats.haste;
  }
  if (run.upgrades.chain && run.timers.chain <= 0 && target && distance(target, run.player) < 370) {
    let from = run.player;
    const used = new Set(), points = [{ x: from.x, y: from.y }];
    for (let i = 0; i < 2 + run.upgrades.chain; i++) {
      const next = nearEnemies(run, from, i ? 200 : 370).find(e => !used.has(e.id));
      if (!next) break;
      used.add(next.id);
      points.push({ x: next.x, y: next.y });
      damageSurvivalEnemy(run, next, (25 + run.upgrades.chain * 10) * stats.power);
      from = next;
    }
    effect(run, { type: 'chain', points, color: '#d9abff', life: .25 });
    run.timers.chain = 2.1 / stats.haste;
  }
}
function segmentDistance(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / length, 0, 1) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
function updateShots(run, dt) {
  for (const shot of run.shots) {
    const previous = { x: shot.x, y: shot.y };
    shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
    const hits = run.enemies.filter(e => !e.dead && !shot.hit.has(e.id) && run.time - e.born >= .6 && segmentDistance(e, previous, shot) < e.radius + 4).sort((a,b) => distance(a,previous)-distance(b,previous));
    for (const enemy of hits) {
      damageSurvivalEnemy(run, enemy, shot.damage);
      shot.hit.add(enemy.id);
      if (--shot.remaining <= 0) { shot.life = 0; break; }
    }
  }
  run.shots = run.shots.filter(s => s.life > 0);
}
function collectPickups(run, dt, stats) {
  const retained = [];
  for (const pickup of run.pickups) {
    const d = distance(pickup, run.player);
    if (d < stats.magnet) pickup.attracted = true;
    if (d < run.player.radius + 9 || (pickup.attracted && d < 480 * dt)) {
      if (pickup.type === 'xp') run.xp += pickup.value;
      if (pickup.type === 'health') run.player.hp = Math.min(stats.maxHp, run.player.hp + pickup.value);
      if (pickup.type === 'vacuum') for (const other of run.pickups) if (other.type === 'xp') other.attracted = true;
      continue;
    }
    if (pickup.attracted && d) {
      const step = Math.min(d, (480 + d * 2) * dt);
      pickup.x += (run.player.x - pickup.x) / d * step;
      pickup.y += (run.player.y - pickup.y) / d * step;
    }
    retained.push(pickup);
  }
  run.pickups = retained;
}
function spawnWave(run) {
  if (run.timers.spawn <= 0) {
    const count = run.time < .1 ? 6 : 1 + Math.floor(run.time / 85);
    for (let i = 0; i < count; i++) {
      const roll = random(run);
      const type = run.time > 100 && roll < .19 ? 'spore' : run.time > 35 && roll < .42 ? 'virus' : run.time > 15 && roll < .7 ? 'bacilli' : 'cocci';
      spawnSurvivalEnemy(run, type);
    }
    run.timers.spawn = Math.max(.3, 1.05 - run.time / 420);
  }
  const thresholds = [90, 180, 270];
  if (run.bossStage < thresholds.length && run.time >= thresholds[run.bossStage]) {
    // Reserve room for the required boss even if the ordinary horde reaches its cap.
    if (run.enemies.length >= LIMITS.enemies) {
      const index = run.enemies.findIndex(e => !e.elite);
      if (index >= 0) run.enemies.splice(index, 1);
    }
    const final = run.bossStage === 2, boss = spawnSurvivalEnemy(run, final ? 'boss' : 'elite');
    if (boss) {
      run.bossStage++;
      run.banner = final ? '경보 · 군집의 심장 출현' : '경보 · 변이 군집 접근';
      run.bannerUntil = run.time + 4;
    }
  }
}
function updateEnemies(run, dt) {
  for (const enemy of run.enemies) {
    if (enemy.dead || run.time - enemy.born < .6) continue;
    const d = distance(enemy, run.player);
    if (d > 1) {
      const speed = enemy.speed * (1 + Math.min(run.time / 1100, .3));
      enemy.x += (run.player.x - enemy.x) / d * speed * dt;
      enemy.y += (run.player.y - enemy.y) / d * speed * dt;
    }
    if (enemy.elite && run.time >= enemy.attackAt && run.hazards.length < LIMITS.hazards) {
      run.hazards.push({ id: run.nextId++, x: run.player.x, y: run.player.y, radius: enemy.type === 'boss' ? 85 : 60, at: run.time + 1.15, until: run.time + 1.55, damage: enemy.damage });
      enemy.attackAt = run.time + (enemy.type === 'boss' ? 2.7 : 4.5);
    }
    if (distance(enemy, run.player) < enemy.radius + run.player.radius - 3) hurtPlayer(run, enemy.damage);
    if (run.status === 'lost') return;
  }
  for (const hazard of run.hazards) if (run.time >= hazard.at && run.time <= hazard.until && distance(hazard, run.player) < hazard.radius + run.player.radius) hurtPlayer(run, hazard.damage);
  run.hazards = run.hazards.filter(h => h.until > run.time);
}
export function tickSurvival(run, input = {}, delta = 1 / 60) {
  if (run.status !== 'running' || !Number.isFinite(delta) || delta <= 0) return false;
  const dt = Math.min(delta, .05), before = run.status, stats = survivalStats(run);
  run.time += dt;
  run.player.invulnerable = Math.max(0, run.player.invulnerable - dt);
  run.hurt = Math.max(0, run.hurt - dt);
  let x = Number.isFinite(input.x) ? input.x : 0, y = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  run.player.moving = length > .05;
  if (run.player.moving) {
    run.player.x = clamp(run.player.x + x * stats.speed * dt, 24, WORLD.width - 24);
    run.player.y = clamp(run.player.y + y * stats.speed * dt, 24, WORLD.height - 24);
    run.player.angle = Math.atan2(y, x);
  }
  for (const key of Object.keys(run.timers)) run.timers[key] -= dt;
  spawnWave(run);
  autoAttack(run, stats);
  updateShots(run, dt);
  run.enemies = run.enemies.filter(e => !e.dead);
  updateEnemies(run, dt);
  run.effects = run.effects.filter(e => run.time - e.born < e.life);
  if (run.status === 'lost') return true;
  collectPickups(run, dt, stats);
  if (run.time >= RUN_DURATION && run.bossDefeated) run.status = 'won';
  else levelUp(run);
  return before !== run.status;
}
