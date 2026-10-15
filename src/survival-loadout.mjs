import { WEAPONS, UPGRADE_BY_ID } from './survival-data.mjs';

export function survivalStats(run) {
  const u = run.upgrades;
  return { maxHp: 100 + u.health * 25, speed: 180 * (1 + u.speed * .1), power: 1 + u.power * .2, haste: 1 + u.haste * .15, magnet: 90 + u.magnet * 35 };
}
export function weaponStats(run, id) {
  const level = run.upgrades[id] || 0, s = survivalStats(run), b = run.branches?.[id];
  if (!level) return { damage: 0, count: 0, pierce: 0, radius: 0, cooldown: 0, knockback: 0 };
  let value;
  if (id === 'bolt') {
    value = { damage: 20 + (level - 1) * 8, count: 1 + Math.floor(level / 2), pierce: Math.floor(level / 3), radius: 460, cooldown: .64 - (level - 1) * .045, knockback: 22 };
    if (b === 'bolt_fan') { value.count += 2; value.damage *= .82; }
    if (b === 'bolt_lance') { value.count = 1; value.pierce += 3; value.damage *= 1.55; }
  } else if (id === 'orbit') {
    value = { damage: 10 + level * 5, count: level + 1, pierce: 0, radius: 65 + level * 5, cooldown: .38, knockback: 45 };
    if (b === 'orbit_guard') { value.count++; value.radius *= .8; value.damage *= 1.4; }
    if (b === 'orbit_reach') { value.radius *= 1.7; value.damage *= .9; }
  } else if (id === 'nova') {
    value = { damage: 22 + level * 12, count: 1, pierce: 0, radius: 115 + level * 25, cooldown: 4.2, knockback: 150 };
    if (b === 'nova_quick') { value.cooldown *= .55; value.damage *= .7; value.radius *= .9; }
    if (b === 'nova_heavy') { value.cooldown *= 1.3; value.damage *= 1.8; value.radius *= 1.35; value.knockback = 250; }
  } else {
    value = { damage: 25 + level * 10, count: 2 + level, pierce: 0, radius: 390, hop: 210, cooldown: 2.1, knockback: 0 };
    if (b === 'chain_web') { value.count += 4; value.damage *= .8; }
    if (b === 'chain_surge') { value.count = 2; value.damage *= 2; value.cooldown *= 1.2; }
  }
  value.damage *= s.power; value.cooldown /= s.haste;
  return value;
}
export function canUpgrade(run, id) {
  const u = UPGRADE_BY_ID[id];
  return !!u && run.upgrades[id] < u.max && (!u.weapon || run.upgrades[u.weapon] >= u.requires && !run.branches[u.weapon]);
}
export function upgradedLoadout(run, id) {
  const u = UPGRADE_BY_ID[id], copy = { ...run, upgrades: { ...run.upgrades }, branches: { ...run.branches } };
  copy.upgrades[id]++;
  if (u.weapon) copy.branches[u.weapon] = id;
  return copy;
}
const number = n => String(Math.round(n * 10) / 10);
export function weaponLines(run, id) {
  const s = weaponStats(run, id);
  const countLabel = { bolt: '발사체', orbit: '위성', nova: '파동', chain: '연결' }[id];
  const lines = [['피해', number(s.damage)], [countLabel, String(s.count)], [id === 'orbit' ? '궤도' : '범위', Math.round(s.radius) + ''], ['간격', s.cooldown.toFixed(2) + '초']];
  if (id === 'bolt') lines.splice(2, 0, ['추가 관통', String(s.pierce)]);
  if (id === 'nova') lines.push(['밀쳐내기', String(s.knockback)]);
  return lines;
}
export function upgradePreview(run, id) {
  const u = UPGRADE_BY_ID[id], after = upgradedLoadout(run, id), weapon = u.weapon || (WEAPONS.some(w => w.id === id) ? id : null);
  if (weapon) {
    const before = weaponLines(run, weapon);
    return weaponLines(after, weapon).map(([label, value], i) => ({ label, before: before[i][1], after: value }));
  }
  if (id === 'power' || id === 'haste') return WEAPONS.filter(w => run.upgrades[w.id]).map(w => ({
    label: w.short + (id === 'power' ? ' 피해' : ' 간격'),
    before: id === 'power' ? number(weaponStats(run,w.id).damage) : weaponStats(run,w.id).cooldown.toFixed(2) + '초',
    after: id === 'power' ? number(weaponStats(after,w.id).damage) : weaponStats(after,w.id).cooldown.toFixed(2) + '초',
  }));
  const a = survivalStats(run), b = survivalStats(after);
  if (id === 'speed') return [{ label: '이동 / 초', before: number(a.speed), after: number(b.speed) }];
  if (id === 'magnet') return [{ label: '흡입 반경', before: String(a.magnet), after: String(b.magnet) }];
  if (id === 'health') return [{ label: '최대 체력', before: String(a.maxHp), after: String(b.maxHp) }, { label: '체력', before: number(run.player.hp), after: number(Math.min(b.maxHp, run.player.hp + 35)) }];
  if (id === 'repair') return [{ label: '체력', before: number(run.player.hp), after: number(Math.min(a.maxHp,run.player.hp + 45)) }];
  if (id === 'vacuum') return [{ label: '회수 검체', before: '0', after: String(run.pickups.filter(p => p.type === 'xp').reduce((sum,p) => sum+p.value,0)) }];
  return [{ label: '보호 시간', before: '0초', after: '5초' }];
}