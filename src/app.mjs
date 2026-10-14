import { newRound, reveal, guess, score, showAnswer, addDiscovery, restoreRound } from './engine.mjs';
import { createTreatmentGame } from './treatment-ui.mjs';
import { createDefenseGame } from './defense-ui.mjs';
import { resolveAppRoute, cardRouteHash } from './app-routing.mjs';
import { createCardGallery } from './card-gallery-ui.mjs';
import { handleReferenceCardClick, handleCardTabKeydown, bindCardMotion, bindCardTooltips } from './reference-card.mjs';
import { createCardInspector } from './card-inspector.mjs';
import { createCardStacks } from './card-stacks.mjs';

const VERSION = '0.22.0';
const KEY = 'pathopedia.v1';
const APP_TABS = [
 {id:'lab',label:'동정실',icon:'<path d="m9 3 6 6-3 3-6-6 3-3Z"/><path d="M12 12v2M7 13a6 6 0 0 0 12 0 6 6 0 0 0-3-5M4 17h10M10 20v2M5 22h15"/>'},
 {id:'treatment',label:'항생제 선택',icon:'<rect x="4" y="7" width="16" height="10" rx="5" transform="rotate(-45 12 12)"/><path d="m9 9 6 6"/>'},
 {id:'defense',label:'디펜스',icon:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="M12 8v8M8 12h8"/>'},
 {id:'play',label:'Play',icon:'<path d="M9 4h6v4h4v8h-4v4H9v-4H5V8h4V4Z"/><path d="M9 12h6m-3-3v6"/>'},
 {id:'cards',label:'카드 도감',icon:'<rect x="6" y="5" width="13" height="16" rx="2"/><path d="M4 18V4a2 2 0 0 1 2-2h10M10 10h5M10 14h5M10 18h3"/>'}
];

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
let data, sources, treatmentGame, defenseGame, cardGallery, cardInspector, morphologyVisuals, morphologyAssets = new Map(), morphologyTaxa = new Map(), round, archive = {}, view = resolveAppRoute(location.hash)?.view || 'home', tab = 'hints', mode = 'standard', selectedTaxon = '', selectedAnswer = '', filter = '', notice = '', storageWarning = '', confirmNext = false;
let playGame, playLoading, playLoadError='';
const root = $('#app');
bindCardMotion(root);
bindCardTooltips(root);
root.addEventListener('keydown',event=>{if(handleCardTabKeydown(event))return;cardInspector?.handleKeydown(event);});
const symbol = '<img class="brand-icon" src="./assets/pathopedia-icon-192.png?v=0.22.0" alt="" width="27" height="27">';
const record = () => data.records.find(r => r.id === round.targetId);
const answerVisible = () => ['solved','revealed'].includes(round.status);
const has = (kind, key) => round.actions.find(a => a.kind === kind && a.key === key);
const morphologyVisual = (r=record()) => {
 const entry=morphologyTaxa.get(r?.taxonId),asset=entry&&morphologyAssets.get(entry.visualId);
 return entry&&asset?{entry,asset}:null;
};
function morphologyFigure(r=record(),placement='tile') {
 const visual=morphologyVisual(r);if(!visual)return '';
 const {entry,asset}=visual;
 const tag=placement==='tile'?'span':'figure',captionTag=placement==='tile'?'span':'figcaption';
 return `<${tag} class="morphology-visual morphology-visual--${placement}"><img src="${esc(asset.src)}" width="${Number(asset.width)||512}" height="${Number(asset.height)||512}" alt="${esc(asset.alt)}" loading="lazy" decoding="async"><${captionTag} class="morphology-caption">${esc(entry.caption)}<small>${esc(morphologyVisuals.illustrationNotice)}</small></${captionTag}></${tag}>`;
}

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
function home() {
 return `<section class="tab-selection" aria-label="탭 선택"><nav class="tab-choices" aria-label="학습 화면 선택">${APP_TABS.map(({id,label,icon})=>`<button type="button" class="tab-choice" data-view="${id}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg><span>${label}</span></button>`).join('')}</nav></section>`;
}
function shell() {
 const mainClass={home:'home-main',lab:'game-main',treatment:'treatment-main',defense:'defense-main',play:'play-main',cards:'card-gallery-main'}[view];
 const content=view==='home'?home():view==='lab'?lab():view==='treatment'?treatmentGame.render():view==='defense'?defenseGame.render():view==='play'?playView():cardGallery.render();
 return `<header class="appbar${view==='home'?' appbar--home':''}"><a class="brand" href="#home" aria-label="Pathopedia 탭 선택">${symbol}<span>PATHOPEDIA</span></a>${view==='home'?'':`<nav class="appnav" aria-label="주 메뉴">${APP_TABS.map(({id,label})=>`<button type="button" data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${label}</button>`).join('')}</nav>`}<span class="version">v ${VERSION}</span></header>
  ${storageWarning ? `<div class="storage-warning" role="alert">${esc(storageWarning)}</div>` : ''}
  <main id="main" class="${mainClass}" tabindex="-1">${content}</main>
  <dialog id="detail-dialog" aria-labelledby="detail-title"></dialog>${cardInspector?.markup() || ''}`;
}
function playView(){
 if(playGame)return playGame.render();
 return '<section class="boot"><span class="eyebrow">PATHOPEDIA / PLAY</span><h1>'+(playLoadError?'게임을 불러오지 못했습니다.':'격리 구역을 준비하는 중')+'</h1><p>'+(playLoadError?'연결을 확인하고 다시 시도해 주세요.':'가벼운 2.5D 전투 모듈을 불러오고 있습니다.')+'</p>'+(playLoadError?'<button type="button" data-play-retry>다시 불러오기</button>':'')+'</section>';
}
async function loadPlay(){
 if(playGame||playLoading)return;
 playLoadError='';
 const styleReady=new Promise((resolve,reject)=>{
  if(document.querySelector('link[data-play-style]'))return resolve();
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./play.css',import.meta.url).href;link.dataset.playStyle='';link.onload=resolve;link.onerror=()=>{link.remove();reject(Error('Play stylesheet unavailable'));};document.head.append(link);
 });
 playLoading=Promise.all([import('./play-ui.mjs'),styleReady]);
 try{const [{createPlayGame}]=await playLoading;playGame=createPlayGame(data);
  // On a first-ever direct visit, the worker may take control after the game imports.
  if('serviceWorker' in navigator)void navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage('CACHE_PLAY')).catch(()=>{});
 }
 catch(error){playLoadError=error.message;console.error('Play load failed',error);}
 finally{playLoading=null;if(view==='play')render();}
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
 const action=has('hint',c.id),opened=!!action||done,text=record().hints[c.id].text,figure=opened&&c.id==='morphology'?morphologyFigure(record()):'';
 return `<button id="clue-${c.id}" class="clue-tile ${opened?'is-revealed':''} ${figure?'has-morphology-visual':''}" ${opened?`data-detail-hint="${c.id}"`:`data-hint="${c.id}"`} aria-label="${esc(opened?c.ko+': '+text+' — 전체 보기':c.ko+' 공개')}"><span class="clue-top">${c.ko}</span>${opened?`<span class="clue-content">${figure}<span class="clue-text">${esc(text)}</span></span><span class="clue-bottom">${action?'공개됨':round.status==='revealed'?'정답 공개':'동정 완료'} <span>전체 보기 ↗</span></span>`:`<span class="clue-hidden" aria-hidden="true"><span class="clue-question">?</span></span>`}</button>`;
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
 return `<article class="organism-record"><header class="record-header"><div class="eyebrow">ORGANISM RECORD — ${r.id}</div><div class="record-name"><div><h2>${r.organism}</h2><span>${r.koreanName}</span></div><span class="record-seal">${r.phenotype}</span></div><p>${r.phenotypeDescription}</p>${d?`<div class="record-meta"><span>BEST ${d.bestScore} pt</span><span>${d.solves}회 동정</span><span>FIRST DISCOVERED ${new Date(d.firstSeen).toLocaleDateString('ko-KR')}</span></div>`:''}</header><div class="record-body"><section class="record-section"><span class="record-index">01 / CLASSIFICATION</span><h3>분류와 생물학</h3><p class="classification">${r.classification}</p><p>${r.biology}</p></section>${hintCategories(r).map((c,i)=>`<section class="record-section ${c.id==='morphology'&&morphologyVisual(r)?'has-morphology-visual':''}"><span class="record-index">${String(i+2).padStart(2,'0')} / ${c.label.toUpperCase()}</span><h3>${c.ko}</h3>${c.id==='morphology'?morphologyFigure(r,'record'):''}<p>${esc(r.hints[c.id].text)}</p></section>`).join('')}<section class="record-section"><span class="record-index">11 / DIAGNOSTICS</span><h3>진단과 해석</h3><p>${r.diagnostics}</p><aside class="clinical-pearl"><span>READ BETWEEN THE LINES</span><p>${r.pearl}</p></aside></section><section class="record-section"><span class="record-index">12 / SUSCEPTIBILITY</span><h3>${isRegimen(r)?'약제 요법 기록':'항균제 감수성 기록'}</h3><p class="tiny">${isRegimen(r)?'이 기록의 임상 상황에 대한 지침 요법 · 감수성 S/I/R 판정이 아님':'고정 교육용 분리주의 결과 · 실측 MIC 없음 · 균종 전체에 일반화하지 않음'}</p>${r.clinicalContext?`<p class="clinical-context"><strong>임상 상황</strong><br>${esc(r.clinicalContext)}</p>`:''}<div class="record-ast">${panelDrugs(r).map(dr=>`<details class="ast-note"><summary><span>${dr.name}</span><b class="${r.susceptibility[dr.id].category.toLowerCase()}">${shortResult(r.susceptibility[dr.id].category)} <span aria-hidden="true">+</span></b></summary><p>${esc(r.susceptibility[dr.id].note)}</p>${sourceList(r.susceptibility[dr.id].sourceIds)}</details>`).join('')}</div><p class="tiny">활성 있음·없음은 문헌 기반 항균 활성로 임상 S/I/R 범주와 구분합니다. 조건부 활성은 병용·노출 등 적용 조건을 확인하세요. 각 항목에 근거와 제한점을 기재했습니다.</p></section><details class="source-details"><summary>근거 자료 및 데이터 검토 상태 <span>+</span></summary><p class="tiny">EDUCATIONAL DRAFT · ${r.reviewedAt}<br>문헌 기반 교육용 기록이며, 전문가의 최종 검토 전입니다. 약제 요법 포함 여부는 임상 S/I/R 판정과 구분합니다.</p>${sourceList(r.sourceIds)}</details></div></article>`;
}
function render(focusSelector) {
 if(!focusSelector&&view==='defense'){
  const active=document.activeElement,attribute=active?.getAttributeNames?.().find(name=>name.startsWith('data-defense-'));
  if(active?.id==='defense-canvas')focusSelector='#defense-canvas';
  else if(attribute)focusSelector='['+attribute+'="'+active.getAttribute(attribute)+'"]';
 }
 cardInspector?.close();document.body.classList.remove('card-inspector-open');
 root.innerHTML=shell();
 defenseGame?.mount(root,view==='defense');
 playGame?.mount(root,view==='play');
 if(view==='play'&&!playGame&&!playLoadError)void loadPlay();
 if (focusSelector) $(focusSelector)?.focus({preventScroll:true});
}
function navigateTo(hash,{replace=false}={}) {
 const route=resolveAppRoute(hash);if(!route)return;
 if(view==='cards')cardGallery.rememberFaces();
 view=route.view;
 if(view==='cards')cardGallery.setRoute(route.domain,route.archiveOnly);
 if(location.hash!==route.hash)history[replace?'replaceState':'pushState'](null,'',route.hash);
 notice='';render('#main');window.scrollTo({top:0});
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
 if(e.target.closest('.brand')){e.preventDefault();navigateTo('#home');return;}
 const b=e.target.closest('button'); if (!b||b.disabled) return;
 if(b.hasAttribute('data-play-retry')){location.reload();return;}
 if(playGame?.handleClick(b))return;
 if(cardInspector?.handleClick(b))return;
 if(handleReferenceCardClick(b))return;
 if(defenseGame?.handleClick(b))return;
 if(treatmentGame?.handleClick(b))return;
 if(cardGallery?.handleClick(b))return;
 if(b.dataset.drugPage){drugPage+=b.dataset.drugPage==='next'?1:-1;render(`[data-drug-page="${b.dataset.drugPage}"]`);return;}
 if (b.dataset.mobileSection) {mobileSection=b.dataset.mobileSection;render(`[data-mobile-section="${mobileSection}"] button[aria-pressed="true"]`);window.scrollTo({top:0});return;}
 if (b.dataset.view) {navigateTo('#'+b.dataset.view);return;}
 if (b.dataset.tab) {tab=b.dataset.tab;render(`#${tab}-tab`);return;}
 if(b.dataset.detailHint){const c=hintCategories().find(c=>c.id===b.dataset.detailHint),hint=record().hints[c.id],visual=c.id==='morphology'?morphologyVisual(record()):null;openDetail(c.ko,`${visual?morphologyFigure(record(),'detail'):''}<p class="detail-hint-text">${esc(hint.text)}</p>${visual&&answerVisible()?sourceList(visual.entry.sourceIds):''}<p class="tiny">${c.ko} · 이미 공개한 정보입니다. 추가 비용 없음.</p>`);return;}
 if(b.dataset.detailDrug){const drug=data.drugs.find(d=>d.id===b.dataset.detailDrug),ast=record().susceptibility[drug.id];openDetail(drug.name,`<p class="detail-ast ${ast.category.toLowerCase()}">${resultLabel(ast.category)}</p>${answerVisible()?`<p>${esc(ast.note)}</p>${sourceList(ast.sourceIds)}`:`<p>${isRegimen()?'이 기록에 설정된 감염·병기·숙주 조건에서, 인용 지침의 표준 또는 대안요법에 이 약제가 포함되는지를 보여줍니다. 요법 외는 내성·비활성을 뜻하지 않습니다.':'이 교육용 분리주의 결과입니다. I는 증가된 노출에서 감수성이며, 문헌상 활성과 조건부 활성은 임상 S/I/R과 구분합니다.'}</p><p class="tiny">병원체별 상세 해석·적용 조건·출처는 동정 또는 답 보기 후 공개됩니다.</p>`}<p class="tiny">이미 공개한 결과입니다. 추가 비용 없음.</p>`);return;}
 if (b.dataset.hint || b.dataset.drug) {
  const kind=b.dataset.hint?'hint':'drug',key=b.dataset.hint||b.dataset.drug;
  round=reveal(data.records,round,kind,key);notice='';persist();render(`#${kind==='hint'?'clue':'drug'}-${key}`);return;
 }
 switch(b.dataset.action) {
  case 'regimen-help':openDetail('요법 단서의 의미','<p>이 기록에 설정된 감염·병기·숙주 조건에서, 인용 지침의 표준 또는 대안요법에 약제가 포함되는지를 확인합니다.</p><p><strong>요법에 포함</strong>: 명시된 병용·투여 경로·환자 조건을 충족할 때 해당 요법의 구성 약제입니다.</p><p><strong>요법 외</strong>: 이 기록에서 선택한 지침의 해당 요법 목록에 없습니다. 약제의 비활성·내성이나 모든 상황에서의 사용 금지를 의미하지 않습니다.</p><p>상황과 원문 근거는 동정 또는 답 보기 후 전체 기록에서 확인합니다.</p>');break;
  case 'close-detail':$('#detail-dialog').close();break;
  case 'log':openDetail('검사 기록',logPanel());break;
  case 'show-answer':
   if(round.status!=='active')break;
   round=showAnswer(round);mobileSection='answer';notice='';persist();render('[data-action="record"]');window.scrollTo({top:0,behavior:'smooth'});break;
  case 'record':openDetail('Organism record',recordView(record()),true);break;
  case 'next': if(answerVisible()||(!round.actions.length&&!round.wrongIds.length)) reset(); else openDetail('검체를 교체할까요?', '<p>진행 중인 검체는 Archive에 등록되지 않습니다.</p><div class="dialog-actions"><button data-action="cancel-next">계속 풀기</button><button class="submit-button" data-action="confirm-next">교체하기 →</button></div>');break;
  case 'confirm-next':reset();break;
  case 'cancel-next':$('#detail-dialog').close();break;
 }
});
root.addEventListener('change',e=>{
 if(cardInspector?.handleChange(e.target))return;
 if(treatmentGame?.handleChange(e.target))return;
 if(cardGallery?.handleChange(e.target))return;
 if(e.target.id==='question-panel'){switchPanel(e.target.value);return;}
 if(e.target.id==='taxon') {selectedTaxon=e.target.value;const options=panelRecords().filter(r=>r.taxonId===selectedTaxon);selectedAnswer=options.length===1?options[0].id:'';persist();render('#phenotype');}
 if(e.target.id==='phenotype') {selectedAnswer=e.target.value;persist();render('#phenotype');}
 if(e.target.id==='result-mode') {mode=e.target.value;persist();render('#result-mode');}
});
root.addEventListener('input',e=>{if(cardGallery?.handleInput(e.target))return;if(e.target.id==='drug-search'){filter=e.target.value;drugPage=0;$('.assay-grid').innerHTML=drugRows();$('.drug-pagination').innerHTML=drugPagination();}});
root.addEventListener('submit',e=>{
 if(cardGallery?.handleSubmit(e))return;
 if(treatmentGame?.handleSubmit(e))return;
 if(e.target.id!=='answer-form')return;e.preventDefault();if(round.status!=='active'||!selectedAnswer)return;
 const duplicate=round.wrongIds.includes(selectedAnswer);
 round=guess(data.records,round,selectedAnswer);
 if(round.status==='solved'){mobileSection='answer';archive=addDiscovery(archive,round);notice='';persist();render();window.scrollTo({top:0,behavior:'smooth'});}
 else{notice=duplicate?'이미 제외한 조합입니다. 추가 감점 없음.':'일치하지 않습니다. −100점. 다른 조합을 검토하세요.';persist();render('#phenotype');}
});
root.addEventListener('keydown',e=>{if(view==='lab'&&['hints-tab','drugs-tab'].includes(e.target.id)&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();tab=tab==='hints'?'drugs':'hints';render(`#${tab}-tab`);}});
window.addEventListener('hashchange',()=>{if(data&&treatmentGame&&cardGallery)navigateTo(location.hash,{replace:true});});
try {
 const responses=await Promise.all([fetch(new URL('../data/organisms.json',import.meta.url)),fetch(new URL('../data/sources.json',import.meta.url)),fetch(new URL('../data/treatment-questions.json',import.meta.url)),fetch(new URL('../data/library.json',import.meta.url))]);
 if(responses.some(r=>!r.ok))throw Error('Data unavailable');
 let treatmentCatalog,cardDatabase;[data,sources,treatmentCatalog,cardDatabase]=await Promise.all(responses.map(r=>r.json()));
 // An unfinished illustration catalog must not prevent the treatment game from loading.
 const morphologyResponse=await fetch(new URL('../data/morphology-visuals.json',import.meta.url)).catch(()=>null);
 if(morphologyResponse?.ok){morphologyVisuals=await morphologyResponse.json();morphologyAssets=new Map(morphologyVisuals.assets.map(asset=>[asset.id,asset]));morphologyTaxa=new Map(morphologyVisuals.taxa.map(entry=>[entry.taxonId,entry]));}
 treatmentGame=createTreatmentGame(treatmentCatalog,{render,openDetail});
 defenseGame=createDefenseGame(data,sources,{render,openDetail,openRecord:id=>{const original=data.records.find(r=>r.id===id);if(original)openDetail(original.organism,recordView(original),true);}});
 const cardStacks=createCardStacks(cardDatabase);
 cardGallery=createCardGallery(data,{catalog:cardDatabase,cardStacks,getArchive:()=>archive,onFilterChange:(domain,archiveOnly)=>{
   const hash=cardRouteHash(domain,archiveOnly);if(location.hash!==hash)history.pushState(null,'',hash);
 }});
 cardInspector=createCardInspector(data,{catalog:cardDatabase});
  load();persist();
  const initialRoute=resolveAppRoute(location.hash);
  view=initialRoute?.view || 'home';
  if(initialRoute?.view==='cards')cardGallery.setRoute(initialRoute.domain,initialRoute.archiveOnly);
  if(initialRoute && location.hash!==initialRoute.hash)history.replaceState(null,'',initialRoute.hash);
  render();
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname}).then(registration=>{
      const offerUpdate=()=>{
        if(!navigator.serviceWorker.controller||!registration.waiting||document.querySelector('.update-banner'))return;
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
