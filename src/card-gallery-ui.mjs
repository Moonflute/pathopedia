import { createCardStacks } from './card-stacks.mjs';
import { createCardSearch } from './card-search.mjs';
import { renderCardThumbnail } from './reference-card.mjs';
import { CARD_DOMAINS, createCardModels } from './card-models.mjs';

const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE_SIZE=24;
const WIDTHS=[160,190,220];
const FILTERS=[{id:'all',label:'전체'},...Object.entries(CARD_DOMAINS).map(([id,label])=>({id,label}))];

export function createCardGallery(data,{render,catalog,cardStacks}) {
  const models=createCardModels(data,catalog);
  const search=createCardSearch(data,catalog);
  const stacks=cardStacks || createCardStacks(catalog);
  const families=[...new Set(data.drugs.map(drug=>drug.family))].sort((a,b)=>a.localeCompare(b));
  const entries=[
    ...data.records.map(record=>({
      key:'pathogen:'+record.id,id:record.id,kind:'pathogen',domain:record.domain,
      name:record.organism,subtitle:record.koreanName,variant:record.phenotype,
      resistance:catalog.variants[record.id]?.resistance
    })),
    ...data.drugs.map(drug=>({
      key:'drug:'+drug.id,id:drug.id,kind:'drug',domain:'drugs',name:drug.name,
      subtitle:drug.family,family:drug.family,variant:''
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
    return entries.filter(entry=>(domain==='all' || entry.domain===domain)
      && (!resistanceOnly || entry.resistance)
      && (domain!=='drugs' || family==='all' || entry.family===family)
      && search.matches(entry.kind,entry.id,query));
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
    return '<p class="card-gallery-status" role="status" aria-live="polite">'+count+'</p>'+
      (items.length ? '<ul class="card-gallery-grid card-collection" style="--thumbnail-min:'+width+'px">'+items.map(group=>{
        if(group.type==='stack')return stacks.render(group,entryCard,{prefix:'card-gallery',tag:'li',className:'card-gallery-item'});
        const entry=group.items[0];
        return '<li class="card-gallery-item" data-gallery-card="'+esc(entry.key)+'">'+entryCard(entry)+'</li>';
      }).join('')+'</ul>' : '<div class="card-gallery-empty"><h2>검색 조건을 바꿔보세요.</h2><p>이름, 표현형, 계열 또는 요약 속 단어로 검색할 수 있습니다.</p><button type="button" data-card-reset>필터 초기화</button></div>')+
      (pages>1?'<nav class="card-gallery-pagination" aria-label="카드 목록 페이지"><button type="button" data-card-page="prev" '+(page===0?'disabled':'')+'>← 이전</button><span>'+(page+1)+' / '+pages+'</span><button type="button" data-card-page="next" '+(page===pages-1?'disabled':'')+'>다음 →</button></nav>':'');
  }

  function optionsContent() {
    return '<header class="card-gallery-options-heading"><h2 id="card-gallery-options-title">보기 설정</h2><button type="button" data-card-options="close" aria-label="설정 닫기">✕</button></header>'+
      '<div class="card-gallery-domains" role="group" aria-label="카드 분류">'+FILTERS.map(filter=>'<button type="button" data-card-domain="'+filter.id+'" aria-pressed="'+(filter.id===domain)+'">'+filter.label+'</button>').join('')+'</div>'+
      '<div class="card-gallery-controls">'+
      (domain==='drugs'?'<label class="card-gallery-family">약제 계열<select id="card-gallery-family"><option value="all">모든 계열</option>'+families.map(value=>'<option value="'+esc(value)+'" '+(value===family?'selected':'')+'>'+esc(value)+'</option>').join('')+'</select></label>':'')+
      '<label class="card-gallery-size">목록 밀도<select id="card-gallery-size">'+WIDTHS.map(value=>'<option value="'+value+'" '+(value===width?'selected':'')+'>'+({160:'촘촘하게',190:'기본',220:'넓게'})[value]+'</option>').join('')+'</select></label>'+
      (domain!=='drugs'?'<label class="card-gallery-resistance"><input id="card-gallery-resistance" type="checkbox" '+(resistanceOnly?'checked':'')+'>내성 표시 카드만</label><label class="card-gallery-resistance"><input id="card-gallery-stacks" type="checkbox" '+(stacks.enabled()?'checked':'')+'>내성형 겹쳐 보기</label>':'')+
      '</div><button type="button" class="card-gallery-options-reset" data-card-reset>필터 초기화</button>';
  }

  function renderGallery() {
    return '<section id="card-gallery-results" class="card-gallery-results" tabindex="-1" aria-label="카드 도감">'+resultMarkup()+'</section>'+
      '<form id="card-gallery-search-form" class="card-gallery-searchbar" role="search" aria-label="카드 검색">'+
      '<label class="card-gallery-search-field" for="card-gallery-search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="card-gallery-search" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="카드 이름·표현형·계열 검색" placeholder="한글·영문 이름 검색" value="'+esc(query)+'"></label>'+
      '<button type="button" class="card-gallery-options-open" data-card-options="open" aria-label="카드 보기 설정" aria-haspopup="dialog" aria-controls="card-gallery-options"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="18" r="2" fill="currentColor"/></svg><span>필터</span></button></form>'+
      '<dialog id="card-gallery-options" class="card-gallery-options" aria-labelledby="card-gallery-options-title">'+optionsContent()+'</dialog>';
  }

  function refreshOptions(focusSelector) {
    const host=document.querySelector('#card-gallery-options');
    if(!host)return;
    host.innerHTML=optionsContent();
    if(host.open && focusSelector)host.querySelector(focusSelector)?.focus({preventScroll:true});
    else if(focusSelector)document.querySelector('[data-card-options="open"]')?.focus({preventScroll:true});
  }

  function openOptions() {
    const host=document.querySelector('#card-gallery-options');
    if(!host || host.open)return;
    host.addEventListener('close',()=>document.querySelector('[data-card-options="open"]')?.focus({preventScroll:true}),{once:true});
    host.onclick=event=>{
      if(event.target!==host)return;
      const rect=host.getBoundingClientRect();
      if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)host.close();
    };
    host.showModal();
  }

  function refreshResults() {
    const results=document.querySelector('#card-gallery-results');
    if (results) results.innerHTML=resultMarkup();
  }

  function handleClick(button) {
    if(button.dataset.cardOptions){
      if(button.dataset.cardOptions==='open')openOptions();
      else document.querySelector('#card-gallery-options')?.close();
      return true;
    }
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
        refreshResults();refreshOptions('[data-card-domain="'+next+'"]');
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
      const input=document.querySelector('#card-gallery-search');
      if(input)input.value='';
      refreshResults();refreshOptions('[data-card-reset]');
      if(!document.querySelector('#card-gallery-options')?.open)input?.focus({preventScroll:true});
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

  function handleSubmit(event) {
    if(event.target.id!=='card-gallery-search-form')return false;
    event.preventDefault();
    const input=document.querySelector('#card-gallery-search');
    if(input){handleInput(input);input.blur();}
    document.querySelector('#card-gallery-results')?.scrollIntoView({block:'start',behavior:'instant'});
    return true;
  }

  return {render:renderGallery,handleClick,handleChange,handleInput,handleSubmit,rememberFaces};
}
