// All equipment and combat values are fictional arcade mechanics.
export const RUN_DURATION = 300;
export const WORLD = Object.freeze({ width: 2800, height: 2200 });
export const LIMITS = Object.freeze({ enemies: 180, shots: 160, pickups: 320, effects: 100, hazards: 18 });
export const WEAPONS = Object.freeze([
  { id: 'bolt', name: '펄스 블래스터', short: 'PULSE', icon: '↗', color: '#a7f7d0' },
  { id: 'orbit', name: '면역 위성', short: 'ORBIT', icon: '◌', color: '#ffcf7b' },
  { id: 'nova', name: '격리 파동', short: 'NOVA', icon: '◎', color: '#86cfff' },
  { id: 'chain', name: '연쇄 방전', short: 'ARC', icon: 'ϟ', color: '#d9abff' },
]);
export const UPGRADES = Object.freeze([
  { ...WEAPONS[0], max: 5, kind: '자동 무기', description: '가까운 적에게 자동 발사. 강화하면 위력·발사 수·관통이 증가합니다.' },
  { ...WEAPONS[1], max: 5, kind: '자동 무기', description: '몸 주위를 도는 위성이 적을 타격합니다. 강화하면 위성 수와 위력이 증가합니다.' },
  { ...WEAPONS[2], max: 5, kind: '자동 무기', description: '주변을 쓸어내는 파동을 방출합니다. 강화하면 범위와 위력이 증가합니다.' },
  { ...WEAPONS[3], max: 5, kind: '자동 무기', description: '여러 적 사이로 전기가 튑니다. 강화하면 연결 수와 위력이 증가합니다.' },
  { id: 'power', name: '출력 증폭', icon: '✧', color: '#ffab95', max: 5, kind: '장비 강화', description: '모든 무기의 피해량 +20%.' },
  { id: 'haste', name: '고속 충전', icon: '»', color: '#a7f7d0', max: 5, kind: '장비 강화', description: '자동 공격 빈도 +15%. 위성의 접촉 공격도 빨라집니다.' },
  { id: 'speed', name: '가속 부츠', icon: '⇢', color: '#ffcf7b', max: 4, kind: '생존 장비', description: '이동 속도 +10%. 포위망 사이를 빠져나가세요.' },
  { id: 'magnet', name: '검체 자석', icon: '⊕', color: '#86cfff', max: 4, kind: '생존 장비', description: '경험치와 보급품 수집 반경 +35.' },
  { id: 'health', name: '강화 보호복', icon: '✚', color: '#ffab95', max: 4, kind: '생존 장비', description: '최대 체력 +25, 체력 35 회복.' },
  { id: 'repair', name: '응급 정비', icon: '♥', color: '#ffab95', max: Infinity, kind: '즉시 회복', description: '체력 45 회복. 이번 강화 대신 재정비합니다.' },
]);
export const UPGRADE_BY_ID = Object.freeze(Object.fromEntries(UPGRADES.map(upgrade => [upgrade.id, upgrade])));
export const ENEMIES = Object.freeze({
  cocci: { name: '구균 군집', hp: 18, speed: 46, radius: 15, damage: 9, xp: 2, color: '#adcf6e' },
  bacilli: { name: '간균 군집', hp: 28, speed: 61, radius: 17, damage: 11, xp: 3, color: '#e8b869' },
  virus: { name: '바이러스 군집', hp: 15, speed: 94, radius: 12, damage: 8, xp: 2, color: '#f18d9f' },
  spore: { name: '포자 군집', hp: 70, speed: 33, radius: 23, damage: 14, xp: 6, color: '#b39add' },
  elite: { name: '변이 군집', hp: 350, speed: 41, radius: 33, damage: 18, xp: 35, color: '#ffc879' },
  boss: { name: '군집의 심장', hp: 2100, speed: 38, radius: 49, damage: 23, xp: 100, color: '#ff877f' },
});
export function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}
