import { renderReferenceCard } from './reference-card.mjs';
import { CARD_DOMAINS, createCardModels } from './card-models.mjs';

const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE_SIZE=12;
const WIDTHS=[300,360,420];
const FILTERS=[{id:'all',label:'전체'},...Object.entries(CARD_DOMAINS).map(([id,label])=>({id,label}))];

export function createCardGallery(data,{render,catalog}) {
  const models=createCardModels(data,catalog);
  const families=[...new Set(data.drugs.map(drug=>drug.family))].sort((a,b)=>a.localeCompare(b));
  const entries=[
    ...data.records.map(record=>({
      key:'pathogen:'+record.id,id:record.id,kind:'pathogen',domain:record.domain,
      name:record.organism,subtitle:record.koreanName,variant:record.phenotype,
      resistance:catalog.variants[record.id]?.resistance,
      search:[record.id,record.organism,record.koreanName,record.phenotype,record.phenotypeDescription,record.classification,...(record.aliases || []),catalog.variants[record.id]?.summary,catalog.variants[record.id]?.resistance?.code].join(' ').toLowerCase()
    })),
    ...data.drugs.map(drug=>({
      key:'drug:'+drug.id,id:drug.id,kind:'drug',domain:'drugs',name:drug.name,
      subtitle:drug.family,family:drug.family,variant:'',
      search:[drug.id,drug.name,drug.family,drug.mechanism,catalog.drugs[drug.id]?.summary].join(' ').toLowerCase()
    }))
  ];
  let domain='all',query='',family='all',resistanceOnly=false,page=0,width=360;
  const flipped=new Set();

  function rememberFaces() {
    for (const item of document.querySelectorAll('[data-gallery-card]')) {
      if (item.querySelector('.reference-card--back')?.hidden===false) flipped.add(item.dataset.galleryCard);
      else flipped.delete(item.dataset.galleryCard);
    }
  }

  function filtered() {
    const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter(entry=>(domain==='all' || entry.domain===domain)
      && (!resistanceOnly || entry.resistance)
      && (domain!=='drugs' || family==='all' || entry.family===family)
      && words.every(word=>entry.search.includes(word)));
  }

  function resultMarkup() {
    const matching=filtered();
    const pages=Math.max(1,Math.ceil(matching.length/PAGE_SIZE));
    page=Math.min(page,pages-1);
    const start=page*PAGE_SIZE;
    const items=matching.slice(start,start+PAGE_SIZE);
    return '<div class="card-gallery-resultbar"><p role="status" aria-live="polite">'+
      (matching.length ? '<strong>'+matching.length+'</strong>개 중 '+(start+1)+'–'+Math.min(start+PAGE_SIZE,matching.length)+' · '+(page+1)+' / '+pages+' 페이지' : '일치하는 카드가 없습니다.')+
      '</p><span>카드의 <b>뒷장</b>을 눌러 상세 보기</span></div>'+
      (items.length ? '<ul class="card-gallery-grid" style="--card-width:'+width+'px">'+items.map(entry=>{
        const model=entry.kind==='drug'?models.drug(entry.id):models.pathogen(entry.id);
        return '<li class="card-gallery-item" data-gallery-card="'+esc(entry.key)+'">'+renderReferenceCard({...model,face:flipped.has(entry.key)?'back':'front'})+
          '<div class="card-gallery-caption"><span>'+esc(CARD_DOMAINS[entry.domain])+' · '+esc(entry.id)+'</span><strong>'+esc(entry.name)+'</strong><small>'+esc(entry.variant || entry.subtitle)+'</small></div></li>';
      }).join('')+'</ul>' : '<div class="card-gallery-empty"><h2>검색 조건을 바꿔보세요.</h2><p>이름, 표현형, 계열 또는 요약 속 단어로 검색할 수 있습니다.</p><button type="button" data-card-reset>필터 초기화</button></div>')+
      (pages>1?'<nav class="card-gallery-pagination" aria-label="카드 목록 페이지"><button type="button" data-card-page="prev" '+(page===0?'disabled':'')+'>← 이전</button><span>'+(page+1)+' / '+pages+'</span><button type="button" data-card-page="next" '+(page===pages-1?'disabled':'')+'>다음 →</button></nav>':'');
  }

  function renderGallery() {
    return '<header class="card-gallery-heading"><div><span class="eyebrow">PATHOPEDIA / CARD LIBRARY</span><h1>카드 도감<span class="heading-dot">.</span></h1><p>앞면의 핵심 컨셉부터, 뒷장의 자세한 기록까지.</p></div><div class="card-gallery-totals"><span><b>'+data.records.length+'</b> 병원체·표현형</span><span><b>'+data.drugs.length+'</b> 약제</span></div></header>'+
      '<div class="card-gallery-filters"><div class="card-gallery-domains" role="group" aria-label="카드 분류">'+FILTERS.map(filter=>'<button type="button" data-card-domain="'+filter.id+'" aria-pressed="'+(filter.id===domain)+'">'+filter.label+'<small>'+entries.filter(entry=>filter.id==='all' || entry.domain===filter.id).length+'</small></button>').join('')+'</div>'+
      '<div class="card-gallery-controls"><label class="card-gallery-search">카드 검색<input id="card-gallery-search" type="search" autocomplete="off" placeholder="이름 · 표현형 · 계열 · 핵심 컨셉" value="'+esc(query)+'"></label>'+
      (domain==='drugs'?'<label class="card-gallery-family">약제 계열<select id="card-gallery-family"><option value="all">모든 계열</option>'+families.map(value=>'<option value="'+esc(value)+'" '+(value===family?'selected':'')+'>'+esc(value)+'</option>').join('')+'</select></label>':'')+
      '<label class="card-gallery-size">표시 크기<select id="card-gallery-size">'+WIDTHS.map(value=>'<option value="'+value+'" '+(value===width?'selected':'')+'>'+value+' × '+value*1.5+'</option>').join('')+'</select></label>'+
      (domain!=='drugs'?'<label class="card-gallery-resistance"><input id="card-gallery-resistance" type="checkbox" '+(resistanceOnly?'checked':'')+'>내성 표시 카드만</label>':'')+'</div></div>'+
      '<div class="card-gallery-legend" aria-label="카드 기호 설명"><span><i class="lit" aria-hidden="true"></i>해당</span><span><i class="conditional" aria-hidden="true"></i>노출·병용·임상 조건</span><span><i class="dim" aria-hidden="true"></i>비해당·기록 없음</span><span>기호에 마우스를 올리거나 누르면 의미 표시</span></div>'+
      '<details class="card-gallery-guide"><summary>양쪽 기호 읽기</summary><p>병원체의 왼쪽은 주요 친화 장기, 오른쪽은 효과 있는 약제 또는 해당 임상형의 요법 구성 약제입니다. 약제의 왼쪽은 활성·요법 포함 기록이 있는 병원체 계통, 오른쪽은 내성·비활성이 명시된 계통입니다. 같은 계통이라도 표현형별 판정이 달라 양쪽 모두 켜질 수 있습니다. 요법 목록 밖은 무효로 표시하지 않습니다. 전체 약제 반응과 적용 조건은 뒷장에서 확인합니다.</p></details>'+
      '<section id="card-gallery-results" class="card-gallery-results" tabindex="-1" aria-label="카드 목록">'+resultMarkup()+'</section>';
  }

  function refreshResults() {
    const results=document.querySelector('#card-gallery-results');
    if (results) results.innerHTML=resultMarkup();
  }

  function handleClick(button) {
    if (button.dataset.cardDomain) {
      const next=button.dataset.cardDomain;
      if (FILTERS.some(filter=>filter.id===next)) {
        rememberFaces();domain=next;page=0;
        if (next==='drugs') resistanceOnly=false;
        render('[data-card-domain="'+next+'"]');
      }
      return true;
    }
    if (button.dataset.cardPage) {
      rememberFaces();
      const pages=Math.max(1,Math.ceil(filtered().length/PAGE_SIZE));
      page=Math.max(0,Math.min(pages-1,page+(button.dataset.cardPage==='next'?1:-1)));
      refreshResults();
      const results=document.querySelector('#card-gallery-results');
      results?.focus({preventScroll:true});results?.scrollIntoView({block:'start',behavior:'instant'});
      return true;
    }
    if (Object.hasOwn(button.dataset,'cardReset')) {
      rememberFaces();domain='all';query='';family='all';resistanceOnly=false;page=0;
      render('#card-gallery-search');
      return true;
    }
    return false;
  }

  function handleChange(target) {
    if (target.id==='card-gallery-size') {
      const next=Number(target.value);
      if (WIDTHS.includes(next)) {rememberFaces();width=next;refreshResults();}
      return true;
    }
    if (target.id==='card-gallery-family') {
      if (target.value==='all' || families.includes(target.value)) {rememberFaces();family=target.value;page=0;refreshResults();}
      return true;
    }
    if (target.id==='card-gallery-resistance') {
      rememberFaces();resistanceOnly=target.checked;page=0;refreshResults();return true;
    }
    return false;
  }

  function handleInput(target) {
    if (target.id!=='card-gallery-search') return false;
    rememberFaces();query=target.value;page=0;refreshResults();return true;
  }

  return {render:renderGallery,handleClick,handleChange,handleInput,rememberFaces};
}
