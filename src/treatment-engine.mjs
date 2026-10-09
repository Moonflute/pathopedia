export function treatmentPool(catalog, track = 'mixed', reviewOnly = false, progress = {}) {
  return catalog.questions.filter(q => (track === 'mixed' || q.track === track) && (!reviewOnly || progress[q.id]?.needsReview === true));
}

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function newTreatmentSession(catalog, { track = 'mixed', reviewOnly = false, progress = {}, limit = 10, random = Math.random } = {}) {
  if (track !== 'mixed' && !catalog.tracks.some(t => t.id === track)) throw new Error('Unknown treatment track');
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid treatment session length');
  const questions = shuffle(treatmentPool(catalog, track, reviewOnly, progress), random).slice(0, limit);
  if (!questions.length) return null;
  return {
    id: globalThis.crypto.randomUUID(), createdAt: new Date().toISOString(), track, reviewOnly,
    questionIds: questions.map(q => q.id),
    optionOrders: Object.fromEntries(questions.map(q => [q.id, shuffle(q.options.map(o => o.id), random)])),
    index: 0, answers: {},
  };
}

export function answerTreatment(catalog, session, selectedId, reveal = false) {
  if (!session || session.index >= session.questionIds.length) return session;
  const questionId = session.questionIds[session.index];
  if (session.answers[questionId]) return session;
  const q = catalog.questions.find(q => q.id === questionId);
  if (!q || (!reveal && !q.options.some(o => o.id === selectedId))) return session;
  const answer = {
    selectedId: reveal ? null : selectedId,
    outcome: reveal ? 'revealed' : selectedId === q.answerId ? 'correct' : 'wrong',
    answeredAt: new Date().toISOString(),
  };
  return { ...session, answers: { ...session.answers, [questionId]: answer } };
}

export function nextTreatmentQuestion(session) {
  if (!session || session.index >= session.questionIds.length || !session.answers[session.questionIds[session.index]]) return session;
  return { ...session, index: session.index + 1 };
}

export function treatmentStats(session) {
  const answers = session ? session.questionIds.map(id => session.answers[id]).filter(Boolean) : [];
  const correct = answers.filter(a => a.outcome === 'correct').length;
  const wrong = answers.filter(a => a.outcome === 'wrong').length;
  const revealed = answers.filter(a => a.outcome === 'revealed').length;
  let streak = 0;
  for (const a of answers) streak = a.outcome === 'correct' ? streak + 1 : 0;
  return { correct, wrong, revealed, answered: correct + wrong, completed: answers.length, streak, accuracy: correct + wrong ? Math.round(100 * correct / (correct + wrong)) : null };
}

export function recordTreatmentProgress(progress, session) {
  if (!session) return progress;
  const questionId = session.questionIds[session.index], answer = session.answers[questionId];
  if (!answer) return progress;
  const attemptId = `${session.id}/${questionId}`;
  const previous = progress[questionId];
  if (previous?.lastAttemptId === attemptId) return progress;
  return { ...progress, [questionId]: {
    attempts: (previous?.attempts || 0) + (answer.outcome === 'revealed' ? 0 : 1),
    correct: (previous?.correct || 0) + (answer.outcome === 'correct' ? 1 : 0),
    seen: (previous?.seen || 0) + 1, lastOutcome: answer.outcome,
    needsReview: answer.outcome !== 'correct', lastAttemptId: attemptId,
  } };
}

export function restoreTreatmentSession(saved, catalog) {
  if (!saved || typeof saved !== 'object' || typeof saved.id !== 'string' || !saved.id || typeof saved.createdAt !== 'string' || !Number.isFinite(Date.parse(saved.createdAt))) return null;
  if (saved.track !== 'mixed' && !catalog.tracks.some(t => t.id === saved.track)) return null;
  if (typeof saved.reviewOnly !== 'boolean' || !Array.isArray(saved.questionIds) || !saved.questionIds.length || new Set(saved.questionIds).size !== saved.questionIds.length) return null;
  if (!Number.isInteger(saved.index) || saved.index < 0 || saved.index > saved.questionIds.length) return null;
  if (!saved.optionOrders || typeof saved.optionOrders !== 'object' || Array.isArray(saved.optionOrders) || !saved.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers)) return null;
  const questions = new Map(catalog.questions.map(q => [q.id, q]));
  for (let i = 0; i < saved.questionIds.length; i++) {
    const id = saved.questionIds[i], q = questions.get(id), order = saved.optionOrders[id], answer = saved.answers[id];
    if (!q || (saved.track !== 'mixed' && q.track !== saved.track)) return null;
    if (!Array.isArray(order) || order.length !== q.options.length || new Set(order).size !== order.length || order.some(optionId => !q.options.some(o => o.id === optionId))) return null;
    if (i < saved.index && !answer || i > saved.index && answer) return null;
    if (answer) {
      if (!['correct', 'wrong', 'revealed'].includes(answer.outcome) || typeof answer.answeredAt !== 'string' || !Number.isFinite(Date.parse(answer.answeredAt))) return null;
      if (answer.outcome === 'revealed') { if (answer.selectedId !== null) return null; }
      else if (!q.options.some(o => o.id === answer.selectedId) || answer.outcome !== (answer.selectedId === q.answerId ? 'correct' : 'wrong')) return null;
    }
  }
  if (Object.keys(saved.answers).some(id => !saved.questionIds.includes(id)) || Object.keys(saved.optionOrders).length !== saved.questionIds.length) return null;
  return saved;
}

export function restoreTreatmentProgress(saved, catalog) {
  const result = {};
  for (const q of catalog.questions) {
    const entry = saved?.[q.id];
    if (!entry || ![entry.attempts, entry.correct, entry.seen].every(n => Number.isSafeInteger(n) && n >= 0) || entry.correct > entry.attempts || entry.attempts > entry.seen) continue;
    if (!['correct', 'wrong', 'revealed'].includes(entry.lastOutcome) || entry.needsReview !== (entry.lastOutcome !== 'correct') || typeof entry.lastAttemptId !== 'string') continue;
    result[q.id] = entry;
  }
  return result;
}
