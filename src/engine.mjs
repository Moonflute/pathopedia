export const RULES = Object.freeze({ initialScore: 1000, costMultiplier: 4, wrongPenalty: 100, baseCost: 6, bitCost: 18 });
export function entropy(values) {
  if (!values.length) return 0;
  const counts = new Map();
  values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.values()].reduce((h, n) => h - n / values.length * Math.log2(n / values.length), 0);
}
export function observation(record, kind, key) {
  return kind === 'hint' ? record.hints[key].text : record.susceptibility[key].category;
}
export function candidates(records, round) {
  const target = records.find(r => r.id === round.targetId);
  if (!target) return [];
  return records.filter(r => r.id !== round.previousId && !round.wrongIds.includes(r.id) && round.actions.every(a => observation(r, a.kind, a.key) === observation(target, a.kind, a.key)));
}
export function price(records, round, kind, key) {
  const bits = entropy(candidates(records, round).map(r => observation(r, kind, key)));
  return { cost: Math.ceil(RULES.baseCost + RULES.bitCost * bits), bits };
}
export function newRound(records, previousId = null, random = Math.random) {
  const pool = records.filter(r => r.id !== previousId);
  const target = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] || records[0];
  return { targetId: target.id, previousId, status: 'active', actions: [], wrongIds: [], startedAt: new Date().toISOString(), serial: Math.floor(random() * 90000) + 10000 };
}
export function reveal(records, round, kind, key) {
  if (round.status !== 'active' || round.actions.some(a => a.kind === kind && a.key === key)) return round;
  const target = records.find(r => r.id === round.targetId);
  if (!['hint', 'drug'].includes(kind) || !(kind === 'hint' ? target.hints[key] : target.susceptibility[key])) return round;
  const { cost, bits } = price(records, round, kind, key);
  return { ...round, actions: [...round.actions, { kind, key, cost, bits }] };
}
export function guess(records, round, id) {
  if (round.status !== 'active' || !records.some(r => r.id === id) || round.wrongIds.includes(id)) return round;
  return id === round.targetId ? { ...round, status: 'solved', finishedAt: new Date().toISOString() } : { ...round, wrongIds: [...round.wrongIds, id] };
}
export function score(round) {
  const cost = round.actions.reduce((s, a) => s + a.cost, 0);
  const penalty = round.wrongIds.length * RULES.wrongPenalty;
  return { cost, penalty, score: Math.max(0, RULES.initialScore - cost * RULES.costMultiplier - penalty) };
}
export function addDiscovery(archive, round) {
  if (round.status !== 'solved') return archive;
  const previous = archive[round.targetId];
  if (previous?.lastRound === round.startedAt) return archive;
  return { ...archive, [round.targetId]: { firstSeen: previous?.firstSeen || round.finishedAt, bestScore: Math.max(previous?.bestScore || 0, score(round).score), solves: (previous?.solves || 0) + 1, lastRound: round.startedAt } };
}
export function restoreRound(saved, records) {
  if (!saved || !records.some(r => r.id === saved.targetId) || !['active', 'solved', 'abandoned'].includes(saved.status) || !Array.isArray(saved.actions) || !Array.isArray(saved.wrongIds)) return null;
  const target = records.find(r => r.id === saved.targetId);
  if (saved.previousId != null && (saved.previousId === saved.targetId || !records.some(r => r.id === saved.previousId))) return null;
  if (saved.actions.some(a => !['hint','drug'].includes(a.kind) || !(a.kind === 'hint' ? target.hints[a.key] : target.susceptibility[a.key]) || !Number.isInteger(a.cost) || a.cost < 0 || !Number.isFinite(a.bits))) return null;
  if (new Set(saved.actions.map(a => a.kind + a.key)).size !== saved.actions.length || new Set(saved.wrongIds).size !== saved.wrongIds.length || saved.wrongIds.some(id => id === saved.targetId || !records.some(r => r.id === id))) return null;
  if (!Number.isInteger(saved.serial) || typeof saved.startedAt !== 'string') return null;
  return saved;
}
