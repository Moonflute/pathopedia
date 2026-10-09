import { treatmentPool, newTreatmentSession, answerTreatment, nextTreatmentQuestion, treatmentStats, recordTreatmentProgress, restoreTreatmentSession, restoreTreatmentProgress } from './treatment-engine.mjs';

const KEY = 'pathopedia.treatment.v1';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const outcomeLabel = {correct:'정답',wrong:'오답',revealed:'답 확인'};

export function createTreatmentGame(catalog, { render, openDetail }) {
  let track = 'mixed', reviewOnly = false, sessions = {}, selections = {}, progress = {}, warning = '';
  const key = () => `${track}:${reviewOnly ? 'review' : 'all'}`;
  const session = () => sessions[key()];
  const question = () => catalog.questions.find(q => q.id === session()?.questionIds[session().index]);
  const countReview = () => treatmentPool(catalog,track,true,progress).length;
  const trackName = id => id === 'mixed' ? '전체 혼합' : catalog.tracks.find(t => t.id === id)?.name;
  const findQuestion = id => catalog.questions.find(q => q.id === id);

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ datasetVersion:catalog.datasetVersion, track, reviewOnly, sessions, selections, progress })); }
    catch { warning = '브라우저 저장을 사용할 수 없어 이 창을 닫으면 항생제 선택 진행이 사라질 수 있습니다.'; }
  }
  function ensureSession() {
    if (!sessions[key()]) sessions[key()] = newTreatmentSession(catalog, {track,reviewOnly,progress});
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.datasetVersion === catalog.datasetVersion) {
      track = saved.track === 'mixed' || catalog.tracks.some(t => t.id === saved.track) ? saved.track : 'mixed';
      reviewOnly = saved.reviewOnly === true;
      progress = restoreTreatmentProgress(saved.progress, catalog);
      for (const [sessionKey, value] of Object.entries(saved.sessions || {})) {
        const restored = restoreTreatmentSession(value, catalog);
        if (restored && sessionKey === `${restored.track}:${restored.reviewOnly ? 'review' : 'all'}`) {
          sessions[sessionKey] = restored;
          const q = findQuestion(restored.questionIds[restored.index]), selected = saved.selections?.[sessionKey];
          if (q?.options.some(o => o.id === selected)) selections[sessionKey] = selected;
        }
      }
    } else if (saved) warning = '치료 문항이 갱신되어 새 세트로 시작합니다. 동정실 Archive는 계속 사용할 수 있습니다.';
  } catch { warning = '이전 항생제 선택 진행을 읽을 수 없어 새 세트로 시작합니다.'; }
  ensureSession(); save();

  function sources(q) {
    return `<ul class="treatment-sources">${q.sourceRefs.map(ref => {
      const source = catalog.sources[ref.id];
      return `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.organization)} ${source.year} · ${esc(source.title)} ↗</a><span>${esc(ref.section)} · ${esc(source.region)}</span></li>`;
    }).join('')}</ul>`;
  }
  function explanation(q, answer) {
    return `<div class="treatment-explanation"><section><h3>왜 이 요법인가</h3>${q.explanation.reasoning.map(p => `<p>${esc(p)}</p>`).join('')}</section>
      <section><h3>선택지별 해석</h3><dl class="treatment-rationales">${q.options.map(o => `<div class="${o.id===q.answerId?'is-correct':''}"><dt>${o.id===q.answerId?'<span class="answer-tag">정답</span>':''}${o.id===answer?.selectedId?'<span class="answer-tag selected-tag">내 선택</span>':''}${esc(o.text)}</dt><dd>${esc(o.rationale)}</dd></div>`).join('')}</dl></section>
      <div class="treatment-plan"><section><h3>요법 · 투여 조건</h3><p>${esc(q.explanation.regimen)}</p></section><section><h3>대안 · 적용 한계</h3><p>${esc(q.explanation.alternatives)}</p></section><section><h3>재평가 · 치료 축소</h3><p>${esc(q.explanation.reassess)}</p></section></div>
      <aside class="treatment-pearl"><span>기억할 판단</span><p>${esc(q.explanation.pearl)}</p></aside>
      <section class="treatment-evidence"><h3>근거와 적용 범위</h3><p>${esc(q.evidence)}</p>${sources(q)}<small>문헌 확인 ${catalog.checkedAt} · 교육용 초안 · 전문 임상 검토 전</small></section></div>`;
  }
  function questionView() {
    const s = session(), q = question();
    if (!s) return `<section class="treatment-empty"><span class="eyebrow">REVIEW CLEAR</span><h2>이 트랙에 복습할 문제가 없습니다.</h2><p>오답과 답을 확인한 문항이 여기에 모입니다. 직접 맞히면 복습 목록에서 빠집니다.</p><button class="submit-button" data-treatment-action="pool" data-value="all">전체 문제 풀기 →</button></section>`;
    if (!q) return completedView();
    const answer = s.answers[q.id], selected = selections[key()] || '', stats = treatmentStats(s);
    return `<div class="treatment-session-bar"><span>${esc(trackName(track))}${reviewOnly?' · 오답 복습':''}</span><span><b>${s.index+1}</b> / ${s.questionIds.length}</span></div><progress class="treatment-progress" value="${stats.completed}" max="${s.questionIds.length}" aria-label="완료 문항"></progress>
      <article class="treatment-case"><header><span class="eyebrow">CLINICAL CASE / ${esc(q.id)}</span><span class="treatment-topic">${esc(q.topic)}</span><h2 id="treatment-case-title" tabindex="-1">${esc(q.title)}</h2></header><p class="treatment-vignette">${esc(q.case)}</p><dl class="treatment-context">${q.context.map(c => `<div><dt>${esc(c.label)}</dt><dd>${esc(c.value)}</dd></div>`).join('')}</dl>
      <form id="treatment-answer-form"><fieldset><legend>${esc(q.prompt)}</legend><div class="treatment-options">${s.optionOrders[q.id].map((id,index) => {
        const o = q.options.find(o => o.id === id), isCorrect = answer && id === q.answerId, isSelected = (answer?.selectedId || selected) === id;
        return `<label class="treatment-option ${isCorrect?'is-correct':''} ${answer&&isSelected&&answer.outcome==='wrong'?'is-wrong':''} ${isSelected?'is-selected':''}"><input type="radio" name="treatment-option" value="${id}" ${isSelected?'checked':''} ${answer?'disabled':''}><span class="option-letter">${'ABCD'[index]}</span><span class="option-copy">${esc(o.text)}</span>${isCorrect?'<span class="option-result">✓ 정답</span>':answer&&isSelected?'<span class="option-result">내 선택</span>':''}</label>`;
      }).join('')}</div></fieldset>${!answer?`<div class="treatment-actions"><button class="submit-button" type="submit" ${!selected?'disabled':''}>정답 확인 →</button><button type="button" class="treatment-reveal" data-treatment-action="reveal">답과 해설 보기</button><small>직접 답을 보면 정답률에서 제외하고 복습에 남깁니다.</small></div>`:''}</form></article>
      ${answer?`<section class="treatment-feedback ${answer.outcome}" tabindex="-1" aria-labelledby="treatment-feedback-title"><div class="treatment-feedback-heading"><div role="status"><span class="eyebrow">${answer.outcome==='correct'?'REASONING CONFIRMED':answer.outcome==='wrong'?'REVIEW THE DECISION':'ANSWER REVEALED'}</span><h2 id="treatment-feedback-title">${answer.outcome==='correct'?'정답입니다.':answer.outcome==='wrong'?'선택의 근거를 다시 살펴보세요.':'정답과 해설을 공개했습니다.'}</h2><p>이 문항의 정답: <strong>${esc(q.options.find(o => o.id===q.answerId).text)}</strong></p></div><button class="submit-button" data-treatment-action="next">${s.index+1===s.questionIds.length?'세트 결과':'다음 문제'} →</button></div>${explanation(q,answer)}<div class="treatment-bottom-action"><button class="submit-button" data-treatment-action="next">${s.index+1===s.questionIds.length?'세트 결과 보기':'다음 문제'} →</button></div></section>`:''}`;
  }
  function completedView() {
    const s = session(), stats = treatmentStats(s);
    return `<section class="treatment-complete"><span class="eyebrow">SESSION COMPLETE</span><h2>이번 세트의 판단을 돌아보세요.</h2><div class="treatment-result-stats"><div><b>${stats.correct} / ${stats.answered}</b><span>직접 답한 문항 정답</span></div><div><b>${stats.accuracy===null?'—':stats.accuracy+'%'}</b><span>정답률</span></div><div><b>${stats.revealed}</b><span>답 확인 · 정답률 제외</span></div></div><p>오답과 답을 확인한 문항은 복습 목록에 남습니다. 다시 직접 맞히면 복습 목록에서 빠집니다.</p><div class="treatment-actions"><button class="submit-button" data-treatment-action="restart">새 세트 풀기 →</button><button class="treatment-secondary" data-treatment-action="review" ${!countReview()?'disabled':''}>오답 복습 ${countReview()}</button></div></section>
      <section class="treatment-session-review"><h2>문항별 복습</h2>${s.questionIds.map(id => { const q = findQuestion(id), a = s.answers[id]; return `<details><summary><span class="review-result ${a.outcome}">${outcomeLabel[a.outcome]}</span><span>${esc(q.title)}</span><span aria-hidden="true">+</span></summary><p class="review-answer">정답: ${esc(q.options.find(o=>o.id===q.answerId).text)}</p>${explanation(q,a)}</details>`; }).join('')}</section>`;
  }
  function renderView() {
    const stats = treatmentStats(session()), seen = Object.keys(progress).length, mastered = Object.values(progress).filter(p => p.lastOutcome === 'correct').length;
    return `<div class="treatment-heading"><div><span class="eyebrow">ANTIMICROBIAL DECISION PRACTICE</span><h1>항생제 선택<span class="heading-dot">.</span></h1><p>증상 · 병원체 · 질병에서, 조건에 맞는 치료 요법으로.</p></div><button class="treatment-source-button" data-treatment-action="sources">근거와 출제 범위 ↗<small>${catalog.questions.length}문항 · ${Object.keys(catalog.sources).length}개 근거 문서</small></button></div>
      ${warning?`<p class="treatment-warning" role="status">${esc(warning)}</p>`:''}
      <div class="treatment-layout"><aside class="treatment-sidebar"><div class="treatment-sidebar-label">출제 트랙</div><nav class="treatment-tracks" aria-label="항생제 선택 출제 트랙">${[{id:'mixed',name:'전체 혼합',description:'세 가지 판단을 한 세트에서 복습합니다.'},...catalog.tracks].map((t,index) => `<button data-treatment-action="track" data-value="${t.id}" class="${track===t.id?'active':''}" aria-pressed="${track===t.id}"><span class="track-index">${String(index).padStart(2,'0')}</span><span><b>${esc(t.name)}</b><small>${esc(t.description)}</small></span><span class="track-count">${treatmentPool(catalog,t.id).length}</span></button>`).join('')}</nav><div class="treatment-pool" role="group" aria-label="문제 범위"><button data-treatment-action="pool" data-value="all" aria-pressed="${!reviewOnly}">전체 문제</button><button data-treatment-action="pool" data-value="review" aria-pressed="${reviewOnly}">오답 복습 <b>${countReview()}</b></button></div>
      <div class="treatment-stats"><h2>이번 세트</h2><dl><div><dt>정답</dt><dd>${stats.correct} / ${stats.answered}</dd></div><div><dt>정답률</dt><dd>${stats.accuracy===null?'—':stats.accuracy+'%'}</dd></div><div><dt>연속 정답</dt><dd>${stats.streak}</dd></div><div><dt>답 확인</dt><dd>${stats.revealed}</dd></div></dl><button data-treatment-action="restart">새 세트 시작 ↗</button></div>
      <div class="treatment-collection"><span>학습한 문항 <b>${seen} / ${catalog.questions.length}</b></span><span>최근 직접 정답 <b>${mastered}</b></span><small>트랙별 세트와 학습 기록은 이 브라우저에 저장됩니다.</small></div><p class="treatment-scope-note">명시한 임상 조건과 지침 버전에서 선택합니다. 성인 용량·기간의 예는 환자별 조정이 필요합니다.<br><span>문헌 확인 ${catalog.checkedAt} · 전문 임상 검토 전</span></p></aside><div class="treatment-workspace">${questionView()}</div></div>`;
  }
  function submitAnswer(reveal = false) {
    const before = session(), next = answerTreatment(catalog,before,selections[key()],reveal);
    if (next === before) return;
    sessions[key()] = next; progress = recordTreatmentProgress(progress,next); save(); render('.treatment-feedback');
  }
  return {
    render:renderView,
    rules:() => `<p>임상 조건을 읽고 제시된 네 선택지 중 지침에 맞는 요법을 고릅니다. 각 트랙과 전체 혼합에서 최대 10문항을 무작위 출제합니다.</p><ol class="rules"><li>답을 고른 뒤 정답 확인을 누르면 한 번만 채점합니다. 제출 후 선택을 바꿀 수 없습니다.</li><li>정답과 오답 모두 해설을 공개합니다. 인정되는 대안은 선택지별 해석에서 구분합니다.</li><li>답과 해설을 직접 보면 정답률에 포함하지 않으며 복습 목록에 남깁니다.</li><li>오답과 답 확인 문항만 다시 풀 수 있습니다. 이후 직접 맞히면 복습 목록에서 빠집니다.</li><li>분야별 세트와 학습 기록은 이 브라우저에 저장됩니다. 새 세트 시작은 기존 학습 기록을 지우지 않습니다.</li></ol><p class="tiny">${esc(catalog.scope)}</p>`,
    handleClick(button) {
      const action = button.dataset.treatmentAction;
      if (!action) return false;
      switch (action) {
        case 'track': if (button.dataset.value==='mixed'||catalog.tracks.some(t=>t.id===button.dataset.value)) track=button.dataset.value; ensureSession(); save(); render('#treatment-case-title'); break;
        case 'pool': reviewOnly=button.dataset.value==='review'; ensureSession(); save(); render('#treatment-case-title'); break;
        case 'review': reviewOnly=true; delete sessions[key()]; delete selections[key()]; ensureSession(); save(); render('#treatment-case-title'); break;
        case 'restart': delete sessions[key()]; delete selections[key()]; ensureSession(); save(); render('#treatment-case-title'); break;
        case 'reveal': submitAnswer(true); break;
        case 'next': { const next=nextTreatmentQuestion(session()); if(next!==session()){sessions[key()]=next;delete selections[key()];save();render('#treatment-case-title');} break; }
        case 'sources': openDetail('항생제 선택 · 근거와 출제 범위',`<p>${esc(catalog.scope)}</p><p class="tiny">문헌 확인 ${catalog.checkedAt}. 출판 연도와 적용 지역을 구분합니다. 오래된 지침이 현재 목록에 남아 있어도 최신 지역 내성률·허가/공급을 뜻하지 않습니다.</p><div class="treatment-source-guide">${Object.values(catalog.sources).map(s=>`<section><h3><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.organization)} ${s.year} · ${esc(s.title)} ↗</a></h3><p>${esc(s.note)}</p><small>${esc(s.region)} · 확인 ${s.accessedAt}</small></section>`).join('')}</div>`,true); break;
      }
      if (action !== 'sources' && action !== 'reveal') window.scrollTo({top:0,behavior:'smooth'});
      return true;
    },
    handleChange(target) {
      if (target.name !== 'treatment-option') return false;
      const q = question();
      if (q && !session().answers[q.id] && q.options.some(o => o.id===target.value)) { selections[key()]=target.value; save(); render(`input[name="treatment-option"][value="${target.value}"]`); }
      return true;
    },
    handleSubmit(event) { if(event.target.id!=='treatment-answer-form')return false;event.preventDefault();submitAnswer();return true; },
  };
}
