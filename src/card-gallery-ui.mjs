import { createCardStacks } from './card-stacks.mjs';
import { renderCardThumbnail, renderCardLegend } from './reference-card.mjs';
import { CARD_DOMAINS, createCardModels } from './card-models.mjs';

const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE_SIZE=24;
const WIDTHS=[160,190,220];
const FILTERS=[{id:'all',label:'전체'},...Object.entries(CARD_DOMAINS).map(([id,label])=>({id,label}))];

export function createCardGallery(data,{render,catalog,cardStacks}) {
  const models=createCardModels(data,catalog);
  const stacks=cardStacks || createCardStacks(catalog);
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
  let domain='all',query='',family='all',resistanceOnly=false,page=0,width=190;
  const flipped=new Set();

  function rememberFaces() {
    for (const item of document.querySelectorAll('[data-gallery-card]')) {
      if (item.querySelector('.reference-card-slot')?.dataset.cardState==='back') flipped.add(item.dataset.galleryCard);
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

  function entryCard(entry) {
    const model=entry.kind==='drug'?models.drug(entry.id):models.pathogen(entry.id);
    return renderCardThumbnail(model,{key:entry.key,caption:entry.variant || entry.subtitle,badge:CARD_DOMAINS[entry.domain]});
  }

  function resultMarkup() {
    const matching=filtered(),groups=stacks.groups(matching);
    const pages=Math.max(1,Math.ceil(groups.length/PAGE_SIZE));
    page=Math.min(page,pages-1);
    const start=page*PAGE_SIZE,items=groups.slice(start,start+PAGE_SIZE);
    const count=matching.length
      ? '<strong>'+matching.length+'</strong>장'+(groups.length!==matching.length?' · '+groups.length+'개 목록':'')+' · '+(start+1)+'–'+Math.min(start+PAGE_SIZE,groups.length)+' · '+(page+1)+' / '+pages+' 페이지'
      : '일치하는 카드가 없습니다.';
    return '<div class="card-gallery-resultbar"><p role="status" aria-live="polite">'+count+'</p><span>작은 카드를 눌러 확대 · 묶음은 펼쳐 보기</span></div>'+
      (items.length ? '<ul class="card-gallery-grid card-collection" style="--thumbnail-min:'+width+'px">'+items.map(group=>{
        if(group.type==='stack')return stacks.render(group,entryCard,{prefix:'card-gallery',tag:'li',className:'card-gallery-item'});
        const entry=group.items[0];
        return '<li class="card-gallery-item" data-gallery-card="'+esc(entry.key)+'">'+entryCard(entry)+'</li>';
      }).join('')+'</ul>' : '<div class="card-gallery-empty"><h2>검색 조건을 바꿔보세요.</h2><p>이름, 표현형, 계열 또는 요약 속 단어로 검색할 수 있습니다.</p><button type="button" data-card-reset>필터 초기화</button></div>')+
      (pages>1?'<nav class="card-gallery-pagination" aria-label="카드 목록 페이지"><button type="button" data-card-page="prev" '+(page===0?'disabled':'')+'>← 이전</button><span>'+(page+1)+' / '+pages+'</span><button type="button" data-card-page="next" '+(page===pages-1?'disabled':'')+'>다음 →</button></nav>':'');
  }

  function renderGallery() {
    return '<header class="card-gallery-heading"><div><span class="eyebrow">PATHOPEDIA / CARD LIBRARY</span><h1>카드 도감<span class="heading-dot">.</span></h1><p>작게 훑어보고, 한 장을 골라 펼쳐보세요.</p></div><div class="card-gallery-totals"><span><b>'+data.records.length+'</b> 병원체·표현형</span><span><b>'+data.drugs.length+'</b> 약제</span></div></header>'+
      '<div class="card-gallery-filters"><div class="card-gallery-domains" role="group" aria-label="카드 분류">'+FILTERS.map(filter=>'<button type="button" data-card-domain="'+filter.id+'" aria-pressed="'+(filter.id===domain)+'">'+filter.label+'<small>'+entries.filter(entry=>filter.id==='all' || entry.domain===filter.id).length+'</small></button>').join('')+'</div>'+
      '<div class="card-gallery-controls"><label class="card-gallery-search">카드 검색<input id="card-gallery-search" type="search" autocomplete="off" placeholder="이름 · 표현형 · 계열 · 임상 특징" value="'+esc(query)+'"></label>'+
      (domain==='drugs'?'<label class="card-gallery-family">약제 계열<select id="card-gallery-family"><option value="all">모든 계열</option>'+families.map(value=>'<option value="'+esc(value)+'" '+(value===family?'selected':'')+'>'+esc(value)+'</option>').join('')+'</select></label>':'')+
      '<label class="card-gallery-size">목록 밀도<select id="card-gallery-size">'+WIDTHS.map(value=>'<option value="'+value+'" '+(value===width?'selected':'')+'>'+({160:'촘촘하게',190:'기본',220:'넓게'})[value]+'</option>').join('')+'</select></label>'+
      (domain!=='drugs'?'<label class="card-gallery-resistance"><input id="card-gallery-resistance" type="checkbox" '+(resistanceOnly?'checked':'')+'>내성 표시 카드만</label>':'')+'</div></div>'+
      (domain!=='drugs'?stacks.controls('card-gallery'):'')+renderCardLegend()+
      '<details class="card-gallery-guide"><summary>양쪽 기호와 금색 표시 읽기</summary><p>병원체: 왼쪽은 주요 감염 장기, 오른쪽은 약제입니다. 약제: 왼쪽은 유효·요법 포함 기록이 있는 병원체군, 오른쪽은 내성·비활성이 명시된 군입니다. 금색은 특정 임상 상황의 우선요법이며 감수성 S만으로 붙이지 않습니다. 약제의 전체 보기에서 금색은 그 군에 우선요법으로 사용하는 임상형이 있다는 뜻입니다. 확대 화면에서 기준을 선택하고 기호를 눌러 정확한 대상·조건을 읽으세요.</p></details>'+
      '<section id="card-gallery-results" class="card-gallery-results" tabindex="-1" aria-label="카드 목록">'+resultMarkup()+'</section>';
  }

  function refreshResults() {
    const results=document.querySelector('#card-gallery-results');
    if (results) results.innerHTML=resultMarkup();
  }

  function handleClick(button) {
    if(button.dataset.cardStackView==='card-gallery'){
      stacks.toggle(button.dataset.cardStackToggle);refreshResults();
      document.querySelector('#card-gallery-stack-'+button.dataset.cardStackToggle+'-toggle')?.focus();
      return true;
    }
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
      const pages=Math.max(1,Math.ceil(stacks.groups(filtered()).length/PAGE_SIZE));
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
    if(target.id==='card-gallery-stacks'){
      stacks.setEnabled(target.checked);page=0;refreshResults();return true;
    }
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
