import { createCardCatalog } from './card-catalog.mjs';
import { renderCardThumbnail, renderCardLegend } from './reference-card.mjs';
import { createCardModels } from './card-models.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase();
const PAGE_SIZE = 24;
const DOMAINS = { bacteria:'세균', fungi:'진균', viruses:'바이러스', parasites:'기생충' };
const SECTIONS = [
  { id:'organisms', view:'library', name:'병원체' },
  { id:'drugs', view:'drugs', name:'약제 도감' },
  { id:'archive', view:'archive', name:'발견 기록' }
];

export function createLibrary(data, { getArchive, render, openDetail, catalog }) {
  const cardContent = createCardCatalog(catalog);
  const models = createCardModels(data,catalog);
  let section = 'organisms';
  const filters = Object.fromEntries(SECTIONS.map(({id}) => [id, { query:'', category:'all', page:0 }]));
  const state = () => filters[section];
  const records = [...data.records].sort((a,b) => a.organism.localeCompare(b.organism) || a.id.localeCompare(b.id));
  const drugs = [...data.drugs].sort((a,b) => a.name.localeCompare(b.name));
  const discoveries = () => records.filter(r => getArchive()[r.id]);
  const taxonCount = list => new Set(list.map(r => r.taxonId)).size;

  function matchingItems() {
    const { query, category } = state(), term = normalize(query.trim());
    const list = section === 'drugs' ? drugs : section === 'archive' ? discoveries() : records;
    return list.filter(item => {
      const group = section === 'drugs' ? item.family : item.domain;
      const summary = cardContent.summary(section === 'drugs' ? 'drug' : 'pathogen',item.id);
      const text = section === 'drugs' ? [item.name,item.family,item.mechanism] : [item.organism,item.koreanName,item.phenotype,item.phenotypeDescription,item.classification,item.id];
      return (category === 'all' || group === category) && normalize([...text,summary].join(' ')).includes(term);
    });
  }

  function categoryOptions() {
    if (section === 'drugs') return [...new Set(drugs.map(d => d.family))].sort().map(family => [family,family]);
    return Object.entries(DOMAINS);
  }

  function recordCard(record) {
    const found=getArchive()[record.id];
    return renderCardThumbnail(models.pathogen(record.id),{key:'pathogen:'+record.id,caption:record.phenotype,badge:found?'동정 완료 · 최고 '+found.bestScore+'점':DOMAINS[record.domain]+' · '+record.koreanName});
  }
  function drugCard(drug) {
    return renderCardThumbnail(models.drug(drug.id),{key:'drug:'+drug.id,caption:drug.family});
  }

  function results() {
    const items = matchingItems(), pages = Math.max(1,Math.ceil(items.length/PAGE_SIZE));
    state().page = Math.min(state().page,pages-1);
    const start = state().page*PAGE_SIZE, visible = items.slice(start,start+PAGE_SIZE);
    const title = section === 'drugs' ? '약제 정보' : section === 'archive' ? '발견한 기록' : '병원체 기록';
    const count = section === 'drugs' ? `${items.length}개 약제` : `${items.length}개 기록 · ${taxonCount(items)}종·군`;
    let content;
    if (section === 'archive' && !discoveries().length) {
      content = '<div class="library-empty"><span class="eyebrow">NO RECORDS DISCOVERED</span><h3>첫 번째 기록을 기다립니다.</h3><p>동정실에서 맞힌 병원체의 기록과 최고 점수를 여기에서 확인할 수 있습니다.</p><button class="submit-button" data-view="lab">동정실로 이동 →</button></div>';
    } else if (!items.length) {
      content = '<div class="library-empty"><h3>검색 결과가 없습니다.</h3><p>다른 검색어나 분류로 찾아보세요.</p><button class="library-reset" data-library-action="reset">검색 조건 초기화</button></div>';
    } else {
      content = `<div class="card-collection library-card-collection">${visible.map(section==='drugs'?drugCard:recordCard).join('')}</div>`;
    }
    return `<div class="library-result-heading"><h2 id="library-result-title" tabindex="-1">${title}</h2><span role="status" aria-live="polite">${count}</span></div>${content}
      ${items.length?`<nav class="library-pagination" aria-label="라이브러리 페이지"><span>${start+1}–${Math.min(start+PAGE_SIZE,items.length)} / ${items.length}</span><div><button data-library-action="page" data-library-direction="prev" aria-label="이전 페이지" ${state().page===0?'disabled':''}>←</button><span>${state().page+1} / ${pages}</span><button data-library-action="page" data-library-direction="next" aria-label="다음 페이지" ${state().page>=pages-1?'disabled':''}>→</button></div></nav>`:''}`;
  }

  function renderLibrary(view) {
    section = SECTIONS.find(s => s.view === view)?.id || 'organisms';
    const found = discoveries().length;
    return `<header class="library-heading"><div><span class="eyebrow">PATHOPEDIA / STUDY COLLECTION</span><h1>라이브러리<span class="heading-dot">.</span></h1><p>카드를 골라 확대하고, 뒤집어 임상 특징과 근거를 읽어보세요.</p></div><dl class="library-totals"><div><dt>병원체</dt><dd>${taxonCount(records)}<small>종·군</small></dd></div><div><dt>약제</dt><dd>${drugs.length}<small>개</small></dd></div></dl></header>
      <a class="card-prototype-link" href="#cards">병원체·약제를 한 번에 보기 <span aria-hidden="true">↗</span></a>
      <nav class="library-sections" aria-label="라이브러리 분류">${SECTIONS.map(s => `<button data-view="${s.view}" class="${section===s.id?'active':''}" ${section===s.id?'aria-current="page"':''}>${s.name}<small>${s.id==='drugs'?drugs.length:s.id==='archive'?found:records.length}</small></button>`).join('')}</nav>
      <p class="library-description">${section==='organisms'?'수록된 모든 병원체의 분류, 형태, 진단, 약제 반응과 근거를 열람할 수 있습니다.':section==='drugs'?'약제별 작용 기전, 활성 범위, 사용 제한과 내성 기전을 확인하세요.':'직접 동정한 병원체와 표현형·임상형별 기록입니다. 이 브라우저에 저장됩니다.'}</p>
      ${section==='archive'?`<div class="library-collection"><span>발견 ${found} / ${records.length}</span><progress value="${found}" max="${records.length}" aria-label="병원체 발견 진행률"></progress></div>`:''}
      <div class="library-controls"><label class="library-search-label" for="library-search"><span>검색</span><input id="library-search" type="search" placeholder="${section==='drugs'?'약제 이름·계열·기전 검색':'병원체 이름·한글명·표현형 검색'}" value="${esc(state().query)}" autocomplete="off"></label><label for="library-filter"><span>${section==='drugs'?'계열':'분류'}</span><select id="library-filter"><option value="all">전체 ${section==='drugs'?'계열':'분류'}</option>${categoryOptions().map(([id,label]) => `<option value="${esc(id)}" ${state().category===id?'selected':''}>${esc(label)}</option>`).join('')}</select></label></div>
      ${renderCardLegend()}
      <section id="library-results" aria-labelledby="library-result-title">${results()}</section>`;
  }

  function handleClick(button) {
    if (button.dataset.libraryAction === 'reset') {
      Object.assign(state(),{query:'',category:'all',page:0});
      render('#library-search');
      return true;
    }
    if (button.dataset.libraryAction === 'page') {
      const direction = button.dataset.libraryDirection;
      const pages = Math.max(1,Math.ceil(matchingItems().length/PAGE_SIZE));
      state().page = Math.max(0,Math.min(pages-1,state().page+(direction==='next'?1:-1)));
      render('#library-result-title');
      document.querySelector('#library-results')?.scrollIntoView({block:'start'});
      return true;
    }
    return false;
  }

  function handleChange(input) {
    if (input.id !== 'library-filter') return false;
    state().category = input.value;
    state().page = 0;
    render('#library-filter');
    return true;
  }

  function handleInput(input) {
    if (input.id !== 'library-search') return false;
    state().query = input.value;
    state().page = 0;
    document.querySelector('#library-results').innerHTML = results();
    return true;
  }

  return { render:renderLibrary, handleClick, handleChange, handleInput };
}
