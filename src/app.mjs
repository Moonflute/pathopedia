import { RULES, newRound, reveal, guess, score, showAnswer, addDiscovery, restoreRound } from './engine.mjs';

const VERSION = '0.7.2';
const KEY = 'pathopedia.v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mobileSection = 'hints', drugPage = 0, panelRounds = {}, panelAnswers = {};
const panelFor = r => data.panels.find(p=>p.id===r.panelId);
const panelRecords = () => data.records.filter(r=>r.panelId===round.panelId);
const panelDrugs = (r=record()) => {const ids=panelFor(r).drugIds;return ids.map(id=>data.drugs.find(d=>d.id===id));};
const isRegimen = (r=record()) => r.observationType==='regimen';
const hintCategories = (r=record()) => {
 const labels = r.domain==='viruses'?{morphology:'구조 · 유전체',culture:'증식 특성',biochemistry:'진단 · 동정',virulence:'병인',resistance:'치료 · 예방'}:r.domain==='parasites'?{morphology:'형태',culture:'생활사',biochemistry:'진단 · 동정',virulence:'병인',resistance:'치료 · 병기'}:r.domain==='fungi'?{biochemistry:'진단 · 동정',resistance:'약제 반응'}:{};
 return data.categories.map(c=>({...c,ko:labels[c.id]||c.ko}));
};
const DRUG_PAGE_SIZE = 16;
const shortResult = category => ({ACT:'조건부 활성',ACTIVE:'활성 있음',INACTIVE:'활성 없음',REGIMEN:'요법에 포함',OUTSIDE_REGIMEN:'요법 외'})[category] || category;
const matchingDrugs = () => panelDrugs().filter(d=>(d.name+' '+d.family).toLowerCase().includes(filter.trim().toLowerCase()));
let data, sources, round, archive = {}, view = 'lab', tab = 'hints', mode = 'standard', selectedTaxon = '', selectedAnswer = '', archiveId = '', filter = '', notice = '', storageWarning = '', confirmNext = false;
const root = $('#app');
const symbol = '<img class="brand-icon" src="./assets/pathopedia-icon-192.png?v=0.7.2" alt="" width="27" height="27">';
const arrow = '<span aria-hidden="true">↗</span>';
const record = () => data.records.find(r => r.id === round.targetId);
const answerVisible = () => ['solved','revealed'].includes(round.status);
const has = (kind, key) => round.actions.find(a => a.kind === kind && a.key === key);

function persist() {
  try { panelRounds[round.panelId]=round;panelAnswers[round.panelId]={taxon:selectedTaxon,answer:selectedAnswer};localStorage.setItem(KEY, JSON.stringify({ datasetVersion: data.datasetVersion, round, panelRounds, panelAnswers, archive, mode })); }
  catch { storageWarning = '브라우저 저장을 사용할 수 없습니다. 이 창을 닫으면 진행 기록이 사라질 수 있습니다.'; }
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) {
      for (const [id, entry] of Object.entries(saved.archive || {})) {
        if (data.records.some(r => r.id === id) && entry && Number.isFinite(entry.bestScore) && entry.bestScore >= 0 && entry.bestScore <= 1000 && Number.isInteger(entry.solves) && entry.solves > 0) archive[id] = entry;
      }
      mode = saved.mode === 'basic' ? 'basic' : 'standard';
      if (saved.datasetVersion === data.datasetVersion) {round = restoreRound(saved.round, data.records);for(const [id,value] of Object.entries(saved.panelRounds||{})){const restored=restoreRound(value,data.records);if(restored && restored.panelId===id)panelRounds[id]=restored;}for(const [id,value] of Object.entries(saved.panelAnswers||{})){const pool=data.records.filter(r=>r.panelId===id);if(value && pool.some(r=>r.taxonId===value.taxon))panelAnswers[id]={taxon:value.taxon,answer:pool.some(r=>r.taxonId===value.taxon&&r.id===value.answer)?value.answer:''};}}
      if (!round && saved.round) notice = '데이터 갱신으로 새 검체를 열었습니다. Archive는 유지됩니다.';
    }
  } catch { notice = '이전 진행 기록을 읽을 수 없어 새 검체로 시작합니다.'; }
  round ||= newRound(data.records);selectedTaxon=panelAnswers[round.panelId]?.taxon||'';selectedAnswer=panelAnswers[round.panelId]?.answer||'';
  if (round.status === 'solved') archive = addDiscovery(archive, round);
}
function resultLabel(result) {
  if (mode === 'basic') return { S:'In vitro · Effective', I:'In vitro · Effective · 노출 증가 필요', R:'In vitro · Ineffective', ACT:'Conditional activity · 조건부 활성',ACTIVE:'Activity supported · 활성 있음',INACTIVE:'Inactive · 활성 없음',REGIMEN:'표준·대안요법에 포함',OUTSIDE_REGIMEN:'선택 지침의 요법에 없음' }[result];
  return { S:'S · Susceptible', I:'I · Increased exposure', R:'R · Resistant', ACT:'조건부 활성 · 조건 확인 필요',ACTIVE:'활성 있음 · 문헌 기반',INACTIVE:'활성 없음 · 문헌 기반',REGIMEN:'표준·대안요법에 포함',OUTSIDE_REGIMEN:'선택 지침의 요법에 없음' }[result];
}
function shell() {
  return `<header class="appbar"><a class="brand" href="#lab" aria-label="Pathopedia 동정실">${symbol}<span>PATHOPEDIA</span></a><nav class="appnav" aria-label="주 메뉴"><button data-view="lab" class="${view==='lab'?'active':''}" ${view==='lab'?'aria-current="page"':''}>동정실</button><button data-view="archive" class="${['archive','drugs'].includes(view)?'active':''}" ${['archive','drugs'].includes(view)?'aria-current="page"':''}>Archive <small>${Object.keys(archive).length}</small></button><button data-action="protocol">규칙</button></nav><span class="version">v ${VERSION}</span></header>
  ${storageWarning ? `<div class="storage-warning" role="alert">${esc(storageWarning)}</div>` : ''}
  <main id="main" class="${view==='lab'?'game-main':'archive-main'}" tabindex="-1">${view === 'lab' ? lab() : view === 'drugs' ? drugArchive() : archiveView()}</main>
  <dialog id="detail-dialog" aria-labelledby="detail-title"></dialog>
  <dialog id="protocol"><div class="dialog-top"><span class="eyebrow">PROTOCOL / 001</span><button data-action="close-modal" aria-label="규칙 닫기">✕</button></div><h2>알고 있는 만큼,<br>적게 열어보세요.</h2><p>가려진 병원체의 정보와 약제 단서를 선택하고, <strong>병원체와 표현형·임상형을 모두</strong> 동정합니다.</p><ol class="rules"><li>선택한 출제 분야 안에서 기록은 동일 확률로 출제됩니다. 분야를 바꿔도 각 분야의 진행은 보존됩니다. 직전 검체의 연속 출제는 피합니다.</li><li>공개 비용 = ⌈6 + 18 × H(예상 결과)⌉. 현재 공개된 결과와 오답을 반영한 후보군의 Shannon entropy를 사용합니다. 같은 결과를 내는 후보가 많을수록 비용이 낮습니다.</li><li>검사 전 가격은 가능한 결과의 평균 정보량입니다. 숨은 정답의 희귀도로 가격을 바꾸지 않습니다. 중복 검사는 다시 청구하지 않습니다.</li><li>점수 = max(0, 1,000 − 누적 비용 × 4 − 서로 다른 오답 × 100). 틀린 조합은 다시 제출해도 추가 감점하지 않습니다.</li><li>정답이면 전체 기록이 공개되고 Archive에 등록됩니다. 답 보기는 정답과 전체 정보를 공개하며, 해당 라운드는 점수·Archive에 기록하지 않습니다. 검체를 교체해도 미완료 검체는 Archive에 등록되지 않습니다.</li></ol><h3>분야와 약제 단서</h3><p>세균 감수성 분야는 S/I/R 및 문헌상 활성을 사용합니다. 세균 치료 단서·진균·바이러스·기생충 분야는 특정 임상 상황에 대한 지침의 표준·대안요법 포함 여부를 묻습니다. 요법 외는 내성이나 비활성을 의미하지 않습니다.</p><h3>감수성 결과의 범위</h3><p>S/I/R은 EUCAST의 범주 의미와 문헌의 내성 관계를 반영해 작성한 <strong>고정 교육용 분리주</strong>의 정성 결과입니다. 모든 실제 분리주에 동일한 결과를 약속하지 않으며, S가 곧 임상적 최선의 선택이라는 뜻은 아닙니다.</p><p>조건부 활성은 S/I/R 판정과 구분합니다. 활성 있음·없음은 문헌 기반 항균 활성로 임상 S/I/R 판정과 구분합니다. 조건부 활성은 고노출·병용 등 명시된 조건에서만 적용합니다. E. coli cefazolin 결과는 요로 유래 감염에 한정합니다. 적용 조건과 출처는 동정 또는 답 보기 후 전체 기록에서 확인할 수 있습니다. Basic의 Effective도 이 분리주의 in vitro 활성 표현입니다.</p><p>이 panel의 I는 EUCAST의 Susceptible, increased exposure입니다. 적절히 증가된 노출에서 감수성이며 R이나 CLSI의 Intermediate와 같지 않습니다. EUCAST v16.1 (2026)의 범주 의미를 사용하며, 실측 MIC 판정을 재현한 것은 아닙니다. MIC 모드는 수치·부위·노출조건을 갖춘 검증 데이터가 준비될 때 활성화합니다.</p><h3>출처와 데이터</h3><p>개인 학습 자료는 읽기 전용으로 참고했고 원문을 배포하지 않았습니다. 아래 문헌은 교육용 설정의 기전을 뒷받침하며, 실측 AST 데이터의 출처라는 뜻은 아닙니다. 현재 seed는 임상 전문가의 최종 검토 전입니다.</p>${sourceList(Object.keys(sources))}${answerVisible()?`<a class="download" href="./data/organisms.json" target="_blank" rel="noopener">게임 데이터 JSON 열기 ${arrow}</a>`:''}<p class="tiny">v ${VERSION} · 임상 미생물학 복습용 · 개인 기기 내 저장</p></dialog>`;
}
function lab() {
 const stats=score(round), done=answerVisible(), viewed=round.status==='revealed';
 return `<div class="playboard" data-mobile-section="${mobileSection}"><div class="board-toolbar"><div class="case-heading"><h1>${viewed?'정답 공개':done?'동정 완료':'미생물 동정'}</h1><label class="panel-picker"><span class="sr-only">출제 분야</span><select id="question-panel">${data.panels.map(p=>`<option value="${p.id}" ${p.id===round.panelId?'selected':''}>${esc(p.name)} · ${data.records.filter(r=>r.panelId===p.id).length}</option>`).join('')}</select></label></div><div class="session-stats" aria-label="라운드 점수"><span>점수 <b>${viewed?'—':stats.score.toLocaleString()}</b></span><span>비용 <b>${stats.cost}</b></span><span>오답 <b>−${stats.penalty}</b></span><span>공개 <b>${round.actions.length}/${data.categories.length+panelDrugs().length}</b></span></div><button class="log-trigger" data-action="log">검사 기록 ↗</button></div>
 <div class="board-upper"><aside class="identity-panel"><div class="identity-heading"><div class="sample-mark ${done?'identified':''}" aria-hidden="true">${viewed?'=':done?'✓':'?'}</div><div><span class="sample-status">${done?record().id:'UNIDENTIFIED'}</span><h2>${done?esc(record().organism):'UNKNOWN<br>PATHOGEN'}</h2>${done?`<p>${esc(record().phenotype)}</p>`:''}</div></div>${done?`<div class="solved-summary"><span class="solved-label">${viewed?'ANSWER REVEALED':'IDENTIFICATION CONFIRMED'}</span><h3>${viewed?'Archive에 저장되지 않습니다.':'Archive에 기록했습니다.'}</h3><p>${viewed?'정답을 확인한 라운드입니다.':`최종 점수 <strong>${stats.score}</strong>`}<br>사용한 정보 ${round.actions.length}개 · 오답 ${round.wrongIds.length}회</p><button class="submit-button" data-action="record">전체 organism record ↗</button></div>`:answerPanel()}<div class="specimen-actions">${!done?'<button class="show-answer" type="button" data-action="show-answer" title="정답과 전체 정보를 공개합니다. Archive에는 저장되지 않습니다.">답 보기</button>':''}<button class="replace-specimen" data-action="next">${done?'다음 검체':'새 검체로 교체'} <span>→</span></button></div></aside>
 <section class="clue-board" aria-label="병원체 정보">${hintPanel()}</section></div>
 ${drugPanel()}<nav class="mobile-sections" aria-label="동정실 화면 선택">${[['hints','정보'],['drugs','약제'],['answer',viewed?'공개된 정답':done?'동정 결과':'정답']].map(([id,label])=>`<button data-mobile-section="${id}" aria-pressed="${mobileSection===id}">${label}</button>`).join('')}</nav></div>`;
}
function hintPanel() {
 const done=answerVisible();
 return `<div class="clue-grid">${hintCategories().map(c=>{
 const action=has('hint',c.id),opened=!!action||done;
 return `<button id="clue-${c.id}" class="clue-tile ${opened?'is-revealed':''}" ${opened?`data-detail-hint="${c.id}"`:`data-hint="${c.id}"`} aria-label="${esc(opened?c.ko+': '+record().hints[c.id].text+' — 전체 보기':c.ko+' 공개')}"><span class="clue-top">${c.ko}</span>${opened?`<span class="clue-text">${esc(record().hints[c.id].text)}</span><span class="clue-bottom">${action?'공개됨':round.status==='revealed'?'정답 공개':'동정 완료'} <span>전체 보기 ↗</span></span>`:`<span class="clue-hidden" aria-hidden="true"><span class="clue-question">?</span></span>`}</button>`;
 }).join('')}</div>`;
}
function drugPanel() {
 return `<section class="assay-board" aria-label="약제 단서"><div class="assay-heading"><h2>${isRegimen()?'요법 단서':'항균제 시험'}</h2>${isRegimen()?'<p class="assay-key regimen-key">표준·대안요법 포함 여부 · 감수성 판정 아님</p><button class="regimen-help" data-action="regimen-help">판정 기준 ↗</button>':`<p class="assay-key"><span class="s">S 감수성</span><span class="i">I 노출 증가</span><span class="r">R 내성</span><span class="act" title="문헌 기반 활성 있음·없음, 조건부 활성은 임상 S/I/R과 구분합니다">활성 판정*</span></p><label class="mode-label" for="result-mode">표현 <select id="result-mode"><option value="standard" ${mode==='standard'?'selected':''}>S / I / R · 활성</option><option value="basic" ${mode==='basic'?'selected':''}>In vitro · 활성 / 비활성</option><option disabled>MIC · 준비 중</option></select></label>`}</div><div class="assay-controls"><label class="drug-search-label"><span class="sr-only">약제 검색</span><input id="drug-search" type="search" placeholder="약제·계열 검색" value="${esc(filter)}" autocomplete="off"></label><span class="drug-pagination">${drugPagination()}</span></div><div class="assay-grid">${drugRows()}</div></section>`;
}
function drugRows() {
 const done=answerVisible();
 return matchingDrugs().slice(drugPage*DRUG_PAGE_SIZE,(drugPage+1)*DRUG_PAGE_SIZE).map(d=>{
 const action=has('drug',d.id),opened=!!action||done,result=record().susceptibility[d.id];
 return `<button id="drug-${d.id}" class="drug-tile ${opened?'is-revealed '+result.category.toLowerCase():''}" ${opened?`data-detail-drug="${d.id}"`:`data-drug="${d.id}"`} aria-label="${esc(d.name+(opened?': '+resultLabel(result.category)+' — 판정 설명':' 시험'))}"><span class="drug-name">${d.name}</span>${opened?`<span class="drug-value">${mode==='standard'?shortResult(result.category):({S:'In vitro 활성',I:'활성 · 노출 ↑',R:'In vitro 비활성',ACT:'조건부 활성',ACTIVE:'활성 있음',INACTIVE:'활성 없음',REGIMEN:'요법에 포함',OUTSIDE_REGIMEN:'요법 외'})[result.category]}${done&&result.applicability==='infections-originating-from-urinary-tract'?'<small>요로 유래</small>':''}<small>↗</small></span>`:`<span class="drug-hidden">${isRegimen()?'확인':'시험'}</span>`}</button>`;
 }).join('') || '<p class="no-drugs">일치하는 약제가 없습니다.</p>';
}
function drugPagination(){
 const pages=Math.max(1,Math.ceil(matchingDrugs().length/DRUG_PAGE_SIZE));
 return `<button data-drug-page="prev" aria-label="이전 약제" ${drugPage===0?'disabled':''}>←</button><span>${drugPage+1} / ${pages}</span><button data-drug-page="next" aria-label="다음 약제" ${drugPage>=pages-1?'disabled':''}>→</button>`;
}
function answerPanel() {
 const taxa=[...new Map(panelRecords().map(r=>[r.taxonId,{id:r.taxonId,name:r.organism}])).values()];
 return `<form id="answer-form" class="compact-answer"><div><label for="taxon">Organism</label><select id="taxon" required><option value="">병원체 선택</option>${taxa.map(t=>`<option value="${t.id}" ${selectedTaxon===t.id?'selected':''}>${t.name}</option>`).join('')}</select></div><div><label for="phenotype">표현형 / 임상형</label><select id="phenotype" required ${!selectedTaxon?'disabled':''}><option value="">표현형 선택</option>${panelRecords().filter(r=>r.taxonId===selectedTaxon).map(r=>`<option value="${r.id}" ${selectedAnswer===r.id?'selected':''}>${esc(r.phenotype)}${round.wrongIds.includes(r.id)?' · 이전 오답':''}</option>`).join('')}</select></div><button class="submit-button" type="submit" ${!selectedAnswer?'disabled':''}>동정 결과 제출 <span>→</span></button><p class="answer-feedback ${notice?'has-feedback':''}" role="status">${notice?esc(notice):'병원체와 표현형·임상형을 맞히세요.'}</p></form>`;
}
function openDetail(title,content,wide=false) {
 const dialog=$('#detail-dialog');dialog.classList.toggle('wide-dialog',wide);
 dialog.innerHTML=`<div class="dialog-top"><h2 id="detail-title">${esc(title)}</h2><button data-action="close-detail" aria-label="닫기">✕</button></div>${content}`;
 dialog.showModal();
}
function logPanel() {
 const actions=round.actions;
 return `<section class="log-panel"><div class="section-heading"><span class="eyebrow">INVESTIGATION LOG</span><span class="tiny">${actions.length} observations</span></div>${actions.length?`<ol>${actions.map((a,i)=>`<li><span class="log-index">${String(i+1).padStart(2,'0')}</span><span>${a.kind==='hint'?hintCategories().find(c=>c.id===a.key).ko:data.drugs.find(d=>d.id===a.key).name}${a.kind==='drug'?` <b class="${record().susceptibility[a.key].category.toLowerCase()}"> / ${resultLabel(record().susceptibility[a.key].category)}</b>`:''}</span><span>−${a.cost}</span></li>`).join('')}</ol>`:'<p class="empty-log">아직 공개된 정보가 없습니다. 첫 번째 검사를 선택하세요.</p>'}${round.wrongIds.length?`<div class="wrong-log"><span>제외한 가설</span>${round.wrongIds.map(id=>{const r=data.records.find(x=>x.id===id);return `<p>${esc(r.organism)} / ${esc(r.phenotype)} <b>−100</b></p>`;}).join('')}</div>`:''}</section>`;
}
function solved() {
 return `<div class="success-banner"><span class="check-box">✓</span><div><span class="eyebrow">IDENTIFICATION CONFIRMED</span><h2>검체 동정 완료</h2><p>전체 기록이 공개되었습니다. Archive에 ${archive[round.targetId]?.solves>1?'복습 기록을 저장':'새 기록을 등록'}했습니다.</p></div><span class="stamp">VERIFIED<br><small>IN-GAME</small></span></div>${recordView(record())}`;
}
function sourceList(ids) {
 return `<ul class="sources">${ids.map(id=>sources[id]?`<li>${sources[id].url?`<a href="${esc(sources[id].url)}" target="_blank" rel="noopener noreferrer">${esc(sources[id].title)} ↗</a>`:`<span>${esc(sources[id].title)}</span>`}${sources[id].note?`<small>${esc(sources[id].note)}</small>`:''}</li>`:'').join('')}</ul>`;
}
function recordView(r) {
 const d=archive[r.id];
 return `<article class="organism-record"><header class="record-header"><div class="eyebrow">ORGANISM RECORD — ${r.id}</div><div class="record-name"><div><h2>${r.organism}</h2><span>${r.koreanName}</span></div><span class="record-seal">${r.phenotype}</span></div><p>${r.phenotypeDescription}</p>${d?`<div class="record-meta"><span>BEST ${d.bestScore} pt</span><span>${d.solves}회 동정</span><span>FIRST DISCOVERED ${new Date(d.firstSeen).toLocaleDateString('ko-KR')}</span></div>`:''}</header><div class="record-body"><section class="record-section"><span class="record-index">01 / CLASSIFICATION</span><h3>분류와 생물학</h3><p class="classification">${r.classification}</p><p>${r.biology}</p></section>${hintCategories(r).map((c,i)=>`<section class="record-section"><span class="record-index">${String(i+2).padStart(2,'0')} / ${c.label.toUpperCase()}</span><h3>${c.ko}</h3><p>${esc(r.hints[c.id].text)}</p></section>`).join('')}<section class="record-section"><span class="record-index">11 / DIAGNOSTICS</span><h3>진단과 해석</h3><p>${r.diagnostics}</p><aside class="clinical-pearl"><span>READ BETWEEN THE LINES</span><p>${r.pearl}</p></aside></section><section class="record-section"><span class="record-index">12 / SUSCEPTIBILITY</span><h3>${isRegimen(r)?'약제 요법 기록':'항균제 감수성 기록'}</h3><p class="tiny">${isRegimen(r)?'이 기록의 임상 상황에 대한 지침 요법 · 감수성 S/I/R 판정이 아님':'고정 교육용 분리주의 결과 · 실측 MIC 없음 · 균종 전체에 일반화하지 않음'}</p>${r.clinicalContext?`<p class="clinical-context"><strong>임상 상황</strong><br>${esc(r.clinicalContext)}</p>`:''}<div class="record-ast">${panelDrugs(r).map(dr=>`<details class="ast-note"><summary><span>${dr.name}</span><b class="${r.susceptibility[dr.id].category.toLowerCase()}">${shortResult(r.susceptibility[dr.id].category)} <span aria-hidden="true">+</span></b></summary><p>${esc(r.susceptibility[dr.id].note)}</p>${sourceList(r.susceptibility[dr.id].sourceIds)}</details>`).join('')}</div><p class="tiny">활성 있음·없음은 문헌 기반 항균 활성로 임상 S/I/R 판정과 구분합니다. 조건부 활성은 병용·노출 등 적용 조건을 확인하세요. 각 항목에 근거와 제한점을 기재했습니다.</p></section><details class="source-details"><summary>근거 자료 및 데이터 검토 상태 <span>+</span></summary><p class="tiny">EDUCATIONAL DRAFT · ${r.reviewedAt}<br>문헌 기반 교육용 기록이며, 전문가의 최종 검토 전입니다. 약제 요법 포함 여부는 임상 S/I/R 판정과 구분합니다.</p>${sourceList(r.sourceIds)}</details></div></article>`;
}
function archiveView() {
 const discovered=data.records.filter(r=>archive[r.id]);
 if (archiveId && archive[archiveId]) return `<div class="archive-detail-heading"><button data-action="archive-back">← Archive 목록</button><span class="eyebrow">RETRIEVED RECORD</span></div><div class="archive-detail">${recordView(data.records.find(r=>r.id===archiveId))}</div>`;
 return `<div class="page-heading"><div><div class="eyebrow">PERMANENT COLLECTION / LOCAL ARCHIVE</div><h1>발견한 기록<span class="heading-dot">.</span></h1></div><div class="archive-counter"><b>${String(discovered.length).padStart(2,'0')}</b><span> / ${data.records.length} RECORDS</span></div></div><div class="archive-intro"><p>동정한 병원체와 표현형·임상형이 하나의 기록으로 남습니다.</p><button class="drug-library-link" data-view="drugs">약제 도감 ${data.drugs.length} ↗</button><span>이 브라우저에 저장됨</span></div>${discovered.length?`<div class="archive-grid">${discovered.map(r=>`<button class="archive-card" data-record="${r.id}"><div class="archive-card-top"><span>${r.id}</span><span>OPEN FILE ↗</span></div><div class="card-lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><h2>${r.organism}</h2><p>${r.phenotype}</p><div class="archive-card-bottom"><span>${r.koreanName}</span><b>BEST ${archive[r.id].bestScore}</b></div></button>`).join('')}</div>`:`<div class="empty-archive"><div class="file-outline" aria-hidden="true"><span>—</span><span>—</span><span>—</span></div><span class="eyebrow">NO RECORDS DISCOVERED</span><h2>첫 번째 기록을 기다립니다.</h2><p>미지의 검체를 동정하면 완성된 연구 기록이 여기에 보관됩니다.</p><button class="submit-button" data-view="lab">동정실로 돌아가기 →</button></div>`}<div class="archive-progress"><span>COLLECTION PROGRESS</span><div>${data.records.map(r=>`<i class="${archive[r.id]?'collected':''}" title="${archive[r.id]?esc(r.organism+' / '+r.phenotype):'미발견 기록'}"></i>`).join('')}</div><p>같은 병원체도 내성 표현형이 다르면 별개의 기록으로 등록됩니다.</p></div>`;
}
function drugArchive(){
 const paragraph = value => esc(Array.isArray(value)?value.join(' · '):value||'');
 return `<div class="archive-detail-heading"><button data-view="archive">← Archive</button><span class="eyebrow">ANTIMICROBIAL REFERENCE</span></div><div class="page-heading"><h1>약제 도감</h1><span>${data.drugs.length} AGENTS</span></div><div class="drug-library">${data.drugs.map(d=>`<details class="drug-monograph"><summary><span><b>${esc(d.name)}</b><small>${esc(d.family)}</small></span><span>+</span></summary><dl>${[['mechanism','작용 기전'],['spectrum','주요 활성 범위'],['limitations','해석·사용 제한'],['resistance','내성 기전']].filter(([key])=>d[key]).map(([key,label])=>`<dt>${label}</dt><dd>${paragraph(d[key])}</dd>`).join('')}</dl>${sourceList(d.sourceIds||[])}</details>`).join('')}</div>`;
}
function render(focusSelector) {
 root.innerHTML=shell();
 if (focusSelector) $(focusSelector)?.focus({preventScroll:true});
}
function switchPanel(id){
 if(!data.panels.some(p=>p.id===id)||id===round.panelId)return;
 panelRounds[round.panelId]=round;panelAnswers[round.panelId]={taxon:selectedTaxon,answer:selectedAnswer};
 round=panelRounds[id]||newRound(data.records,null,Math.random,id);selectedTaxon=panelAnswers[id]?.taxon||'';selectedAnswer=panelAnswers[id]?.answer||'';
 filter='';drugPage=0;notice='';confirmNext=false;mobileSection='hints';persist();render('#question-panel');window.scrollTo({top:0});
}
function reset() {
 mobileSection='hints';round=newRound(data.records,round.targetId,Math.random,round.panelId); selectedTaxon='';selectedAnswer='';notice='';confirmNext=false;filter='';drugPage=0;tab='hints';persist();render();window.scrollTo({top:0,behavior:'smooth'});
}
root.addEventListener('click',e=>{
 if(e.target.closest('.brand')){e.preventDefault();view='lab';archiveId='';render();return;}
 const b=e.target.closest('button'); if (!b||b.disabled) return;
 if(b.dataset.drugPage){drugPage+=b.dataset.drugPage==='next'?1:-1;render(`[data-drug-page="${b.dataset.drugPage}"]`);return;}
 if (b.dataset.mobileSection) {mobileSection=b.dataset.mobileSection;render(`[data-mobile-section="${mobileSection}"] button[aria-pressed="true"]`);window.scrollTo({top:0});return;}
 if (b.dataset.view) {view=b.dataset.view;archiveId='';notice='';render();window.scrollTo({top:0});return;}
 if (b.dataset.tab) {tab=b.dataset.tab;render(`#${tab}-tab`);return;}
 if(b.dataset.detailHint){const c=hintCategories().find(c=>c.id===b.dataset.detailHint);openDetail(c.ko,`<p class="detail-hint-text">${esc(record().hints[c.id].text)}</p><p class="tiny">${c.ko} · 이미 공개한 정보입니다. 추가 비용 없음.</p>`);return;}
 if(b.dataset.detailDrug){const drug=data.drugs.find(d=>d.id===b.dataset.detailDrug),ast=record().susceptibility[drug.id];openDetail(drug.name,`<p class="detail-ast ${ast.category.toLowerCase()}">${resultLabel(ast.category)}</p>${answerVisible()?`<p>${esc(ast.note)}</p>${sourceList(ast.sourceIds)}`:`<p>${isRegimen()?'이 기록에 설정된 감염·병기·숙주 조건에서, 인용 지침의 표준 또는 대안요법에 이 약제가 포함되는지를 보여줍니다. 요법 외는 내성·비활성을 뜻하지 않습니다.':'이 교육용 분리주의 결과입니다. I는 증가된 노출에서 감수성이며, 문헌상 활성과 조건부 활성은 임상 S/I/R과 구분합니다.'}</p><p class="tiny">병원체별 상세 해석·적용 조건·출처는 동정 또는 답 보기 후 공개됩니다.</p>`}<p class="tiny">이미 공개한 결과입니다. 추가 비용 없음.</p>`);return;}
 if (b.dataset.hint || b.dataset.drug) {
  const kind=b.dataset.hint?'hint':'drug',key=b.dataset.hint||b.dataset.drug;
  round=reveal(data.records,round,kind,key);notice='';persist();render(`#${kind==='hint'?'clue':'drug'}-${key}`);return;
 }
 if (b.dataset.record) {archiveId=b.dataset.record;render();window.scrollTo({top:0});return;}
 switch(b.dataset.action) {
  case 'regimen-help':openDetail('요법 단서의 의미','<p>이 기록에 설정된 감염·병기·숙주 조건에서, 인용 지침의 표준 또는 대안요법에 약제가 포함되는지를 확인합니다.</p><p><strong>요법에 포함</strong>: 명시된 병용·투여 경로·환자 조건을 충족할 때 해당 요법의 구성 약제입니다.</p><p><strong>요법 외</strong>: 이 기록에서 선택한 지침의 해당 요법 목록에 없습니다. 약제의 비활성·내성이나 모든 상황에서의 사용 금지를 의미하지 않습니다.</p><p>상황과 원문 근거는 동정 또는 답 보기 후 전체 기록에서 확인합니다.</p>');break;
  case 'protocol': $('#protocol').showModal();break;
  case 'close-detail':$('#detail-dialog').close();break;
  case 'log':openDetail('검사 기록',logPanel());break;
  case 'show-answer':
   if(round.status!=='active')break;
   round=showAnswer(round);mobileSection='answer';notice='';persist();render('[data-action="record"]');window.scrollTo({top:0,behavior:'smooth'});break;
  case 'record':openDetail('Organism record',recordView(record()),true);break;
  case 'close-modal': $('#protocol').close();break;
  case 'archive-back':archiveId='';render();break;
  case 'next': if(answerVisible()||(!round.actions.length&&!round.wrongIds.length)) reset(); else openDetail('검체를 교체할까요?', '<p>진행 중인 검체는 Archive에 등록되지 않습니다.</p><div class="dialog-actions"><button data-action="cancel-next">계속 풀기</button><button class="submit-button" data-action="confirm-next">교체하기 →</button></div>');break;
  case 'confirm-next':reset();break;
  case 'cancel-next':$('#detail-dialog').close();break;
 }
});
root.addEventListener('change',e=>{
 if(e.target.id==='question-panel'){switchPanel(e.target.value);return;}
 if(e.target.id==='taxon') {selectedTaxon=e.target.value;const options=panelRecords().filter(r=>r.taxonId===selectedTaxon);selectedAnswer=options.length===1?options[0].id:'';persist();render('#phenotype');}
 if(e.target.id==='phenotype') {selectedAnswer=e.target.value;persist();render('#phenotype');}
 if(e.target.id==='result-mode') {mode=e.target.value;persist();render('#result-mode');}
});
root.addEventListener('input',e=>{if(e.target.id==='drug-search'){filter=e.target.value;drugPage=0;$('.assay-grid').innerHTML=drugRows();$('.drug-pagination').innerHTML=drugPagination();}});
root.addEventListener('submit',e=>{
 if(e.target.id!=='answer-form')return;e.preventDefault();if(round.status!=='active'||!selectedAnswer)return;
 const duplicate=round.wrongIds.includes(selectedAnswer);
 round=guess(data.records,round,selectedAnswer);
 if(round.status==='solved'){mobileSection='answer';archive=addDiscovery(archive,round);notice='';persist();render();window.scrollTo({top:0,behavior:'smooth'});}
 else{notice=duplicate?'이미 제외한 조합입니다. 추가 감점 없음.':'일치하지 않습니다. −100점. 다른 조합을 검토하세요.';persist();render('#phenotype');}
});
root.addEventListener('keydown',e=>{if(e.target.getAttribute('role')==='tab'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tab=tab==='hints'?'drugs':'hints';render(`#${tab}-tab`);}});
window.addEventListener('hashchange',()=>{if(location.hash==='#lab'){view='lab';render();}});
try {
 const responses=await Promise.all([fetch(new URL('../data/organisms.json',import.meta.url)),fetch(new URL('../data/sources.json',import.meta.url))]);
 if(responses.some(r=>!r.ok))throw Error('Data unavailable');
 [data,sources]=await Promise.all(responses.map(r=>r.json()));
  load();persist();render();
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname}).then(registration=>{
      const offerUpdate=()=>{
        if(!registration.waiting||document.querySelector('.update-banner'))return;
        const banner=document.createElement('div');banner.className='update-banner';banner.setAttribute('role','status');
        banner.innerHTML='<span>새 버전이 준비되었습니다. 진행 기록은 유지됩니다.</span><button>업데이트 적용 →</button>';
        banner.querySelector('button').onclick=()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});registration.waiting?.postMessage('ACTIVATE_UPDATE');};
        document.body.append(banner);
      };
      offerUpdate();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',offerUpdate));
    }).catch(error=>console.warn('Offline cache unavailable',error));
  }
} catch(error) {
 console.error(error);root.innerHTML='<main class="boot"><span class="eyebrow">DATA LOAD ERROR</span><h1>기록을 불러오지 못했습니다.</h1><p>연결 상태를 확인하고 다시 시도해 주세요.</p><button onclick="location.reload()">다시 불러오기</button></main>';
}
