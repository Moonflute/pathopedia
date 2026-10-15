// Combat roles and equipment are fictional arcade mechanics, not antibiotic coverage.
export const RULESET = 'survival-2';
export const RUN_DURATION = 300;
export const WORLD = Object.freeze({ width: 2800, height: 2200 });
export const LIMITS = Object.freeze({ enemies: 180, shots: 160, pickups: 320, effects: 100, hazards: 18, waves: 8, arcs: 8, pending: 16, sounds: 24 });
export const WEAPONS = Object.freeze([
  { id: 'bolt', name: '펄스 블래스터', short: 'PULSE', icon: '↗', color: '#a7f7d0' },
  { id: 'orbit', name: '면역 위성', short: 'ORBIT', icon: '◌', color: '#ffcf7b' },
  { id: 'nova', name: '격리 파동', short: 'NOVA', icon: '◎', color: '#86cfff' },
  { id: 'chain', name: '연쇄 방전', short: 'ARC', icon: 'ϟ', color: '#d9abff' },
]);
export const PASSIVES = Object.freeze([
  { id: 'power', name: '출력 증폭', icon: '✧', color: '#ffab95', max: 5, kind: '장비', description: '모든 무기 피해 증가' },
  { id: 'haste', name: '고속 충전', icon: '»', color: '#a7f7d0', max: 5, kind: '장비', description: '공격·접촉 간격 단축' },
  { id: 'speed', name: '가속 부츠', icon: '⇢', color: '#ffcf7b', max: 4, kind: '장비', description: '이동 속도 증가' },
  { id: 'magnet', name: '검체 자석', icon: '⊕', color: '#86cfff', max: 4, kind: '장비', description: '검체·보급품 흡입 반경 증가' },
  { id: 'health', name: '강화 보호복', icon: '✚', color: '#ffab95', max: 4, kind: '장비', description: '최대 체력 증가 · 체력 35 회복' },
]);
const branch = (weapon, id, name, description) => ({ ...WEAPONS.find(w => w.id === weapon), id, weapon, name, description, max: 1, requires: 3, kind: '진화 · 택1' });
export const BRANCHES = Object.freeze([
  branch('bolt', 'bolt_fan', '산개 펄스', '발사체 +2 · 피해 ×0.82'),
  branch('bolt', 'bolt_lance', '관통 랜스', '1발 집중 · 추가 관통 +3 · 피해 ×1.55'),
  branch('orbit', 'orbit_guard', '밀착 호위', '위성 +1 · 궤도 축소 · 접촉 피해 ×1.4'),
  branch('orbit', 'orbit_reach', '외곽 공전', '궤도 ×1.7 · 접촉 피해 ×0.9'),
  branch('nova', 'nova_quick', '연속 파동', '간격 ×0.55 · 피해 ×0.7 · 범위 ×0.9'),
  branch('nova', 'nova_heavy', '중력 충격파', '피해 ×1.8 · 범위 ×1.35 · 강한 밀쳐내기'),
  branch('chain', 'chain_web', '방전 그물', '연결 +4 · 피해 ×0.8'),
  branch('chain', 'chain_surge', '집중 과전류', '최대 2명 · 피해 ×2 · 간격 ×1.2'),
]);
export const UPGRADES = Object.freeze([
  ...WEAPONS.map(w => ({ ...w, max: 5, kind: '무기', description: { bolt: '자동 조준 · Lv.3부터 진화', orbit: '접촉 타격 · Lv.3부터 진화', nova: '퍼지는 충격파 · Lv.3부터 진화', chain: '순차 연결 · Lv.3부터 진화' }[w.id] })),
  ...PASSIVES, ...BRANCHES,
  { id: 'repair', name: '응급 정비', icon: '♥', color: '#ffab95', max: Infinity, kind: '즉시', description: '체력 45 회복' },
  { id: 'vacuum', name: '광역 회수', icon: '⊕', color: '#86cfff', max: Infinity, kind: '즉시', description: '전장 검체 전부 흡입' },
  { id: 'shield', name: '긴급 보호막', icon: '◇', color: '#a7f7d0', max: Infinity, kind: '즉시', description: '재개 후 5초 보호' },
]);
export const UPGRADE_BY_ID = Object.freeze(Object.fromEntries(UPGRADES.map(u => [u.id, u])));
export const ENEMIES = Object.freeze({
  cocci: { name: '구균 군집', shape: 'cocci', role: '추격', hp: 18, speed: 54, radius: 15, damage: 8, xp: 2, color: '#adcf6e' },
  bacilli: { name: '간균 군집', shape: 'bacilli', role: '추격', hp: 28, speed: 67, radius: 17, damage: 10, xp: 3, color: '#e8b869' },
  virus: { name: '바이러스 군집', shape: 'virus', role: '추격', hp: 15, speed: 98, radius: 12, damage: 7, xp: 2, color: '#f18d9f' },
  spore: { name: '포자 군집', shape: 'spore', role: '추격', hp: 65, speed: 39, radius: 23, damage: 12, xp: 6, color: '#b39add' },
  charger: { name: '돌진체', shape: 'bacilli', role: '돌진', hp: 42, speed: 62, radius: 18, damage: 13, xp: 5, color: '#ff9c75' },
  ranger: { name: '투사체', shape: 'virus', role: '원거리', hp: 35, speed: 54, radius: 17, damage: 10, xp: 5, color: '#fa92bb' },
  blocker: { name: '격벽 포자', shape: 'spore', role: '구역 차단', hp: 65, speed: 35, radius: 22, damage: 11, xp: 7, color: '#c7a0ed' },
  splitter: { name: '분열 군집', shape: 'cocci', role: '분열', hp: 52, speed: 49, radius: 24, damage: 11, xp: 4, color: '#90d5a1' },
  fragment: { name: '분열체', shape: 'cocci', role: '추격', hp: 10, speed: 96, radius: 9, damage: 5, xp: 1, color: '#b8dfa0' },
  elite: { name: '쇄도 핵', shape: 'cocci', role: '돌진 · 소환', hp: 390, speed: 45, radius: 33, damage: 17, xp: 32, color: '#ffc879' },
  warden: { name: '봉쇄 핵', shape: 'spore', role: '고리 · 부채꼴', hp: 650, speed: 36, radius: 37, damage: 18, xp: 40, color: '#df9dff' },
  boss: { name: '군집의 심장', shape: 'virus', role: '복합 패턴', hp: 2400, speed: 44, radius: 49, damage: 21, xp: 100, color: '#ff877f' },
});
export const PHASES = Object.freeze({ influx: '군집 유입', clash: '집중 교전', collect: '검체 회수', rest: '재정비' });
export function formatTime(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
}