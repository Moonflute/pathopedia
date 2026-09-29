import { RULES, newRound, reveal, guess, score, addDiscovery, restoreRound } from './engine.mjs';

const VERSION = '0.3.2';
const KEY = 'pathopedia.v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, sources, round, archive = {}, view = 'lab', tab = 'hints', mode = 'standard', selectedTaxon = '', selectedAnswer = '', archiveId = '', filter = '', notice = '', storageWarning = '', confirmNext = false;
const root = $('#app');
const symbol = '<img class="brand-icon" src="./assets/pathopedia-icon-192.png?v=0.3.2" alt="" width="27" height="27">';
const arrow = '<span aria-hidden="true">↗</span>';
const record = () => data.records.find(r => r.id === round.targetId);
const has = (kind, key) => round.actions.find(a => a.kind === kind && a.key === key);

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ datasetVersion: data.datasetVersion, round, archive, mode })); }
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
      if (saved.datasetVersion === data.datasetVersion) round = restoreRound(saved.round, data.records);
      if (!round && saved.round) notice = '데이터가 갱신되었거나 이전 진행 기록을 읽을 수 없어 새 검체를 열었습니다. 유효한 Archive는 유지했습니다.';
    }
  } catch { notice = '이전 진행 기록을 읽을 수 없어 새 검체로 시작합니다.'; }
  round ||= newRound(data.records);
  if (round.status === 'solved') archive = addDiscovery(archive, round);
}
function resultLabel(result) {
  if (mode === 'basic') return { S:'Effective', I:'Effective · 노출 증가 필요', R:'Ineffective', NA:'판정 대상 아님' }[result];
  return { S:'S · Susceptible', I:'I · Increased exposure', R:'R · Resistant', NA:'NA · Not interpreted' }[result];
}
function shell() {
  return `<header class="appbar"><a class="brand" href="#lab" aria-label="Pathopedia 동정실">${symbol}<span>PATHOPEDIA</span></a><nav class="appnav" aria-label="주 메뉴"><button data-view="lab" class="${view==='lab'?'active':''}" ${view==='lab'?'aria-current="page"':''}>동정실</button><button data-view="archive" class="${view==='archive'?'active':''}" ${view==='archive'?'aria-current="page"':''}>Archive <small>${Object.keys(archive).length}</small></button><button data-action="protocol">규칙</button></nav><span class="version">v ${VERSION}</span></header>
  ${storageWarning ? `<div class="storage-warning" role="alert">${esc(storageWarning)}</div>` : ''}
  <main id="main" class="${view==='lab'?'game-main':'archive-main'}" tabindex="-1">${view === 'lab' ? lab() : archiveView()}</main>
  <dialog id="detail-dialog" aria-labelledby="detail-title"></dialog>
  <dialog id="protocol"><div class="dialog-top"><span class="eyebrow">PROTOCOL / 001</span><button data-action="close-modal" aria-label="규칙 닫기">✕</button></div><h2>알고 있는 만큼,<br>적게 열어보세요.</h2><p>가려진 검체의 정보나 항균제 반응을 선택하고, <strong>균종과 phenotype을 모두</strong> 동정합니다.</p><ol class="rules"><li>모든 기록은 동일 확률로 출제됩니다. 직전 검체의 연속 출제는 피합니다.</li><li>공개 비용 = ⌈6 + 18 × H(예상 결과)⌉. 현재 공개된 결과와 오답을 반영한 후보군의 Shannon entropy를 사용합니다. 같은 결과를 내는 후보가 많을수록 비용이 낮습니다.</li><li>검사 전 가격은 가능한 결과의 평균 정보량입니다. 숨은 정답의 희귀도로 가격을 바꾸지 않습니다. 중복 검사는 다시 청구하지 않습니다.</li><li>점수 = max(0, 1,000 − 누적 비용 × 4 − 서로 다른 오답 × 100). 틀린 조합은 다시 제출해도 추가 감점하지 않습니다.</li><li>정답이면 전체 기록이 공개되고 Archive에 등록됩니다. 검체를 교체하면 미완료 검체는 Archive에 등록되지 않습니다.</li></ol><h3>감수성 결과의 범위</h3><p>S/I/R은 EUCAST의 범주 의미와 문헌의 내성 관계를 반영해 작성한 <strong>고정 교육용 분리주</strong>의 정성 결과입니다. 모든 실제 분리주에 동일한 결과를 약속하지 않으며, S가 곧 임상적 최선의 선택이라는 뜻은 아닙니다.</p><p>NA는 이 panel에서 판정하지 않는 조합입니다. R과 구분합니다. Basic의 Effective도 이 분리주의 in vitro 활성 표현입니다.</p><p>이 panel의 I는 EUCAST의 Susceptible, increased exposure입니다. 적절히 증가된 노출에서 감수성이며 R이나 CLSI의 Intermediate와 같지 않습니다. EUCAST v16.1 (2026)의 범주 의미를 사용하며, 실측 MIC 판정을 재현한 것은 아닙니다. MIC 모드는 수치·부위·노출조건을 갖춘 검증 데이터가 준비될 때 활성화합니다.</p><h3>출처와 데이터</h3><p>개인 학습 자료는 읽기 전용으로 참고했고 원문을 배포하지 않았습니다. 아래 문헌은 교육용 설정의 기전을 뒷받침하며, 실측 AST 데이터의 출처라는 뜻은 아닙니다. 현재 seed는 임상 전문가의 최종 검토 전입니다.</p>${sourceList(Object.keys(sources))}<a class="download" href="./data/organisms.json" target="_blank" rel="noopener">게임 데이터 JSON 열기 ${arrow}</a><p class="tiny">v ${VERSION} · 임상 미생물학 복습용 · 개인 기기 내 저장</p></dialog>`;
}
function lab() {
 const stats=score(round), done=round.status==='solved';
 return `<div class="playboard"><div class="board-toolbar"><div class="case-heading"><h1>${done?'동정 완료':'미생물 동정'}</h1><span>CASE ${round.serial}</span></div><div class="session-stats" aria-label="라운드 점수"><span>점수 <b>${stats.score.toLocaleString()}</b></span><span>비용 <b>${stats.cost}</b></span><span>오답 <b>−${stats.penalty}</b></span><span>공개 <b>${round.actions.length}/25</b></span></div><button class="log-trigger" data-action="log">검사 기록 ↗</button></div>
 <div class="board-upper"><aside class="identity-panel"><div class="identity-heading"><div class="sample-mark ${done?'identified':''}" aria-hidden="true">${done?'✓':'?'}</div><div><span class="sample-status">${done?record().id:'UNIDENTIFIED'}</span><h2>${done?esc(record().organism):'UNKNOWN<br>ORGANISM'}</h2>${done?`<p>${esc(record().phenotype)}</p>`:''}</div></div>${done?`<div class="solved-summary"><span class="solved-label">IDENTIFICATION CONFIRMED</span><h3>Archive에 기록했습니다.</h3><p>최종 점수 <strong>${stats.score}</strong><br>사용한 정보 ${round.actions.length}개 · 오답 ${round.wrongIds.length}회</p><button class="submit-button" data-action="record">전체 organism record ↗</button></div>`:answerPanel()}<button class="replace-specimen" data-action="next">${done?'다음 검체':'새 검체로 교체'} <span>→</span></button></aside>
 <section class="clue-board" aria-label="병원체 정보">${hintPanel()}</section></div>
 ${drugPanel()}</div>`;
}
function hintPanel() {
 const done=round.status==='solved';
 return `<div class="clue-grid">${data.categories.map(c=>{
 const action=has('hint',c.id),opened=!!action||done;
 return `<button id="clue-${c.id}" class="clue-tile ${opened?'is-revealed':''}" ${opened?`data-detail-hint="${c.id}"`:`data-hint="${c.id}"`} aria-label="${esc(opened?c.label+': '+record().hints[c.id].text+' — 전체 보기':c.label+' 공개')}"><span class="clue-top"><span>${c.ko}</span><small>${c.number}</small></span>${opened?`<span class="clue-text">${esc(record().hints[c.id].text)}</span><span class="clue-bottom">${action?'공개됨':'동정 완료'} <span>전체 보기 ↗</span></span>`:`<span class="clue-hidden"><span>${c.label}</span><strong>열람</strong></span>`}</button>`;
 }).join('')}</div>`;
}
function drugPanel() {
 return `<section class="assay-board" aria-label="항균제 감수성 시험"><div class="assay-heading"><h2>항균제 시험</h2><p class="assay-key"><span class="s">S 감수성</span><span class="i">I 노출 증가</span><span class="r">R 내성</span><span>NA 미판정</span></p><label class="mode-label" for="result-mode">표현 <select id="result-mode"><option value="standard" ${mode==='standard'?'selected':''}>S / I / R</option><option value="basic" ${mode==='basic'?'selected':''}>Effective / Ineffective</option><option disabled>MIC · 준비 중</option></select></label></div><div class="assay-grid">${drugRows()}</div></section>`;
}
function drugRows() {
 const done=round.status==='solved';
 return data.drugs.map(d=>{
 const action=has('drug',d.id),opened=!!action||done,result=record().susceptibility[d.id];
 return `<button id="drug-${d.id}" class="drug-tile ${opened?'is-revealed '+result.category.toLowerCase():''}" ${opened?`data-detail-drug="${d.id}"`:`data-drug="${d.id}"`} aria-label="${esc(d.name+(opened?': '+resultLabel(result.category)+' — 판정 설명':' 시험'))}"><span class="drug-name">${d.name}</span>${opened?`<span class="drug-value">${mode==='standard'?result.category:({S:'Effective',I:'Effective · 노출 ↑',R:'Ineffective',NA:'미판정'})[result.category]}<small>↗</small></span>`:`<span class="drug-hidden">시험</span>`}</button>`;
 }).join('');
}
function answerPanel() {
 const taxa=[...new Map(data.records.map(r=>[r.taxonId,{id:r.taxonId,name:r.organism}])).values()];
 return `<form id="answer-form" class="compact-answer"><div><label for="taxon">Organism</label><select id="taxon" required><option value="">균종 선택</option>${taxa.map(t=>`<option value="${t.id}" ${selectedTaxon===t.id?'selected':''}>${t.name}</option>`).join('')}</select></div><div><label for="phenotype">Resistance phenotype</label><select id="phenotype" required ${!selectedTaxon?'disabled':''}><option value="">표현형 선택</option>${data.records.filter(r=>r.taxonId===selectedTaxon).map(r=>`<option value="${r.id}" ${selectedAnswer===r.id?'selected':''}>${esc(r.phenotype)}${round.wrongIds.includes(r.id)?' · 이전 오답':''}</option>`).join('')}</select></div><button class="submit-button" type="submit" ${!selectedAnswer?'disabled':''}>동정 결과 제출 <span>→</span></button><p class="answer-feedback ${notice?'has-feedback':''}" role="status">${notice?esc(notice):'균종과 표현형을 모두 맞히세요.'}</p></form>`;
}
function openDetail(title,content,wide=false) {
 const dialog=$('#detail-dialog');dialog.classList.toggle('wide-dialog',wide);
 dialog.innerHTML=`<div class="dialog-top"><h2 id="detail-title">${esc(title)}</h2><button data-action="close-detail" aria-label="닫기">✕</button></div>${content}`;
 dialog.showModal();
}
function logPanel() {
 const actions=round.actions;
 return `<section class="log-panel"><div class="section-heading"><span class="eyebrow">INVESTIGATION LOG</span><span class="tiny">${actions.length} observations</span></div>${actions.length?`<ol>${actions.map((a,i)=>`<li><span class="log-index">${String(i+1).padStart(2,'0')}</span><span>${a.kind==='hint'?data.categories.find(c=>c.id===a.key).label:data.drugs.find(d=>d.id===a.key).name}${a.kind==='drug'?` <b class="${record().susceptibility[a.key].category.toLowerCase()}"> / ${resultLabel(record().susceptibility[a.key].category)}</b>`:''}</span><span>−${a.cost}</span></li>`).join('')}</ol>`:'<p class="empty-log">아직 공개된 정보가 없습니다. 첫 번째 검사를 선택하세요.</p>'}${round.wrongIds.length?`<div class="wrong-log"><span>제외한 가설</span>${round.wrongIds.map(id=>{const r=data.records.find(x=>x.id===id);return `<p>${esc(r.organism)} / ${esc(r.phenotype)} <b>−100</b></p>`;}).join('')}</div>`:''}</section>`;
}
function solved() {
 return `<div class="success-banner"><span class="check-box">✓</span><div><span class="eyebrow">IDENTIFICATION CONFIRMED</span><h2>검체 동정 완료</h2><p>전체 기록이 공개되었습니다. Archive에 ${archive[round.targetId]?.solves>1?'복습 기록을 저장':'새 기록을 등록'}했습니다.</p></div><span class="stamp">VERIFIED<br><small>IN-GAME</small></span></div>${recordView(record())}`;
}
function sourceList(ids) {
 return `<ul class="sources">${ids.map(id=>sources[id]?`<li>${sources[id].url?`<a href="${esc(sources[id].url)}" target="_blank" rel="noopener noreferrer">${esc(sources[id].title)} ↗</a>`:`<span>${esc(sources[id].title)}</span>`}${sources[id].note?`<small>${esc(sources[id].note)}</small>`:''}</li>`:'').join('')}</ul>`;
}
function recordView(r) {
 const d=archive[r.id];
 return `<article class="organism-record"><header class="record-header"><div class="eyebrow">ORGANISM RECORD — ${r.id}</div><div class="record-name"><div><h2>${r.organism}</h2><span>${r.koreanName}</span></div><span class="record-seal">${r.phenotype}</span></div><p>${r.phenotypeDescription}</p>${d?`<div class="record-meta"><span>BEST ${d.bestScore} pt</span><span>${d.solves}회 동정</span><span>FIRST DISCOVERED ${new Date(d.firstSeen).toLocaleDateString('ko-KR')}</span></div>`:''}</header><div class="record-body"><section class="record-section"><span class="record-index">01 / CLASSIFICATION</span><h3>분류와 생물학</h3><p class="classification">${r.classification}</p><p>${r.biology}</p></section>${data.categories.map((c,i)=>`<section class="record-section"><span class="record-index">${String(i+2).padStart(2,'0')} / ${c.label.toUpperCase()}</span><h3>${c.ko}</h3><p>${esc(r.hints[c.id].text)}</p></section>`).join('')}<section class="record-section"><span class="record-index">11 / DIAGNOSTICS</span><h3>진단과 해석</h3><p>${r.diagnostics}</p><aside class="clinical-pearl"><span>READ BETWEEN THE LINES</span><p>${r.pearl}</p></aside></section><section class="record-section"><span class="record-index">12 / SUSCEPTIBILITY</span><h3>항균제 감수성 기록</h3><p class="tiny">고정 교육용 분리주의 결과 · 실측 MIC 없음 · 균종 전체에 일반화하지 않음</p><div class="record-ast">${data.drugs.map(dr=>`<details class="ast-note"><summary><span>${dr.name}</span><b class="${r.susceptibility[dr.id].category.toLowerCase()}">${r.susceptibility[dr.id].category} <span aria-hidden="true">+</span></b></summary><p>${esc(r.susceptibility[dr.id].note)}</p></details>`).join('')}</div><p class="tiny">NA: 이 panel에서 임상 범주를 부여하지 않은 조합. R과 다릅니다.</p></section><details class="source-details"><summary>근거 자료 및 데이터 검토 상태 <span>+</span></summary><p class="tiny">EDUCATIONAL DRAFT · ${r.reviewedAt}<br>문헌 기반 관계를 적용한 교육용 분리주이며, 전문가 최종 검토 전입니다. 원본 spectrum의 variable/conditional을 자동으로 S로 변환하지 않았습니다.</p>${sourceList(r.sourceIds)}</details></div></article>`;
}
function archiveView() {
 const discovered=data.records.filter(r=>archive[r.id]);
 if (archiveId && archive[archiveId]) return `<div class="archive-detail-heading"><button data-action="archive-back">← Archive 목록</button><span class="eyebrow">RETRIEVED RECORD</span></div><div class="archive-detail">${recordView(data.records.find(r=>r.id===archiveId))}</div>`;
 return `<div class="page-heading"><div><div class="eyebrow">PERMANENT COLLECTION / LOCAL ARCHIVE</div><h1>발견한 기록<span class="heading-dot">.</span></h1></div><div class="archive-counter"><b>${String(discovered.length).padStart(2,'0')}</b><span> / ${data.records.length} RECORDS</span></div></div><div class="archive-intro"><p>동정한 균종과 표현형이 하나의 기록으로 남습니다.</p><span>이 브라우저에 저장됨</span></div>${discovered.length?`<div class="archive-grid">${discovered.map(r=>`<button class="archive-card" data-record="${r.id}"><div class="archive-card-top"><span>${r.id}</span><span>OPEN FILE ↗</span></div><div class="card-lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><h2>${r.organism}</h2><p>${r.phenotype}</p><div class="archive-card-bottom"><span>${r.koreanName}</span><b>BEST ${archive[r.id].bestScore}</b></div></button>`).join('')}</div>`:`<div class="empty-archive"><div class="file-outline" aria-hidden="true"><span>—</span><span>—</span><span>—</span></div><span class="eyebrow">NO RECORDS DISCOVERED</span><h2>첫 번째 기록을 기다립니다.</h2><p>미지의 검체를 동정하면 완성된 연구 기록이 여기에 보관됩니다.</p><button class="submit-button" data-view="lab">동정실로 돌아가기 →</button></div>`}<div class="archive-progress"><span>COLLECTION PROGRESS</span><div>${data.records.map(r=>`<i class="${archive[r.id]?'collected':''}" title="${archive[r.id]?esc(r.organism+' / '+r.phenotype):'미발견 기록'}"></i>`).join('')}</div><p>같은 균종도 내성 표현형이 다르면 별개의 기록으로 등록됩니다.</p></div>`;
}
function render(focusSelector) {
 root.innerHTML=shell();
 if (focusSelector) $(focusSelector)?.focus({preventScroll:true});
}
function reset() {
 round=newRound(data.records,round.targetId); selectedTaxon='';selectedAnswer='';notice='';confirmNext=false;filter='';tab='hints';persist();render();window.scrollTo({top:0,behavior:'smooth'});
}
root.addEventListener('click',e=>{
 if(e.target.closest('.brand')){e.preventDefault();view='lab';archiveId='';render();return;}
 const b=e.target.closest('button'); if (!b||b.disabled) return;
 if (b.dataset.view) {view=b.dataset.view;archiveId='';notice='';render();return;}
 if (b.dataset.tab) {tab=b.dataset.tab;render(`#${tab}-tab`);return;}
 if(b.dataset.detailHint){const c=data.categories.find(c=>c.id===b.dataset.detailHint);openDetail(c.label,`<p class="detail-hint-text">${esc(record().hints[c.id].text)}</p><p class="tiny">${c.ko} · 이미 공개한 정보입니다. 추가 비용 없음.</p>`);return;}
 if(b.dataset.detailDrug){const drug=data.drugs.find(d=>d.id===b.dataset.detailDrug),ast=record().susceptibility[drug.id];openDetail(drug.name,`<p class="detail-ast ${ast.category.toLowerCase()}">${resultLabel(ast.category)}</p><p>${esc(ast.note)}</p><p class="tiny">이미 공개한 결과입니다. 추가 비용 없음.</p>`);return;}
 if (b.dataset.hint || b.dataset.drug) {
  const kind=b.dataset.hint?'hint':'drug',key=b.dataset.hint||b.dataset.drug;
  round=reveal(data.records,round,kind,key);notice='';persist();render(`#${kind==='hint'?'clue':'drug'}-${key}`);return;
 }
 if (b.dataset.record) {archiveId=b.dataset.record;render();window.scrollTo({top:0});return;}
 switch(b.dataset.action) {
  case 'protocol': $('#protocol').showModal();break;
  case 'close-detail':$('#detail-dialog').close();break;
  case 'log':openDetail('검사 기록',logPanel());break;
  case 'record':openDetail('Organism record',recordView(record()),true);break;
  case 'close-modal': $('#protocol').close();break;
  case 'archive-back':archiveId='';render();break;
  case 'next': if(round.status==='solved'||(!round.actions.length&&!round.wrongIds.length)) reset(); else openDetail('검체를 교체할까요?', '<p>진행 중인 검체는 Archive에 등록되지 않습니다.</p><div class="dialog-actions"><button data-action="cancel-next">계속 풀기</button><button class="submit-button" data-action="confirm-next">교체하기 →</button></div>');break;
  case 'confirm-next':reset();break;
  case 'cancel-next':$('#detail-dialog').close();break;
 }
});
root.addEventListener('change',e=>{
 if(e.target.id==='taxon') {selectedTaxon=e.target.value;selectedAnswer='';render('#phenotype');}
 if(e.target.id==='phenotype') {selectedAnswer=e.target.value;render('#phenotype');}
 if(e.target.id==='result-mode') {mode=e.target.value;persist();render('#result-mode');}
});
root.addEventListener('input',e=>{if(e.target.id==='drug-search'){filter=e.target.value;$('#drug-rows').innerHTML=drugRows();}});
root.addEventListener('submit',e=>{
 if(e.target.id!=='answer-form')return;e.preventDefault();if(!selectedAnswer)return;
 const duplicate=round.wrongIds.includes(selectedAnswer);
 round=guess(data.records,round,selectedAnswer);
 if(round.status==='solved'){archive=addDiscovery(archive,round);notice='';persist();render();window.scrollTo({top:0,behavior:'smooth'});}
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
