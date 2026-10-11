import { createCardStacks } from './card-stacks.mjs';
import { createCardSearch } from './card-search.mjs';
import { createCardGuide } from './card-guide.mjs';
import { renderCardThumbnail, renderCardLegend, cardIcon } from './reference-card.mjs';
import { CARD_DOMAINS, createCardModels } from './card-models.mjs';
import { CARD_FILTERS as FILTERS } from './app-routing.mjs';

const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE_SIZE=24;
const WIDTHS=[160,190,220];
const DECKS=[
  {id:'pathogens',kind:'pathogen',label:'병원체',icon:'bacteria'},
  {id:'drugs',kind:'drug',label:'항생제',icon:'capsule'},
  {id:'diseases',kind:'disease',label:'질병',icon:'clinical'}
];

export function createCardGallery(data,{catalog,cardStacks,getArchive=()=>({}),onFilterChange=()=>{}}) {
  const models=createCardModels(data,catalog);
  const guide=createCardGuide(models);
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
    })),
    ...Object.values(catalog.diseases || {}).map(disease=>({key:'disease:'+disease.id,id:disease.id,kind:'disease',domain:'diseases',name:disease.name,subtitle:disease.englishName,category:disease.category,variant:''}))
  ];
  let diseaseCategory='all';
  let domain='all',archiveOnly=false,query='',family='all',resistanceOnly=false,page=0,width=190;
  const flipped=new Set();

  function rememberFaces() {
    for (const item of document.querySelectorAll('[data-gallery-card]')) {
      if (item.querySelector('.reference-card-slot')?.dataset.cardState==='back') flipped.add(item.dataset.galleryCard);
      else flipped.delete(item.dataset.galleryCard);
    }
  }

  function filtered() {
    const archive=getArchive();
    return entries.filter(entry=>(domain==='all' || entry.domain===domain || domain==='pathogens' && entry.kind==='pathogen')
      && (!archiveOnly || entry.kind==='pathogen' && Object.hasOwn(archive,entry.id))
      && (!resistanceOnly || entry.resistance)
      && (domain!=='drugs' || family==='all' || entry.family===family)
      && (domain!=='diseases' || diseaseCategory==='all' || entry.category===diseaseCategory)
      && search.matches(entry.kind,entry.id,query));
  }

  function entryCard(entry) {
    const model=models.get(entry.kind,entry.id);
    const found=entry.kind==='pathogen'?getArchive()[entry.id]:null;
    return renderCardThumbnail(model,{key:entry.key,caption:entry.variant || entry.subtitle,badge:found?'동정 완료 · 최고 '+found.bestScore+'점 · '+found.solves+'회 동정':CARD_DOMAINS[entry.domain]});
  }

  function setRoute(nextDomain='all',nextArchiveOnly=false,{resetOverview=true}={}) {
    if(!FILTERS.some(filter=>filter.id===nextDomain) || nextArchiveOnly && ['drugs','diseases'].includes(nextDomain))return false;
    rememberFaces();domain=nextDomain;archiveOnly=nextArchiveOnly;page=0;
    if(domain==='all' && !archiveOnly && resetOverview){
      query='';family='all';diseaseCategory='all';resistanceOnly=false;
    }
    if(['drugs','diseases'].includes(domain))resistanceOnly=false;
    return true;
  }

  function isDeckOverview() {
    return domain==='all' && !archiveOnly && !query.trim() && !resistanceOnly;
  }

  function deckOverviewMarkup() {
    return '<ul class="card-decks" aria-label="도감 덱">'+DECKS.map(deck=>{
      const count=entries.filter(entry=>entry.kind===deck.kind).length;
      return '<li><button type="button" class="card-deck" data-card-deck="'+deck.id+'" aria-label="'+deck.label+' 덱 열기 · '+count+'장">'+
        '<span class="card-deck-stack" aria-hidden="true"><span class="card-deck-layer card-deck-layer--far"></span><span class="card-deck-layer card-deck-layer--near"></span>'+
        '<span class="card-deck-layer card-deck-cover"><span class="card-deck-crest">◆</span><span class="card-deck-emblem">'+cardIcon(deck.icon)+'</span><span class="card-deck-crest card-deck-crest--bottom">◆</span></span></span>'+
        '<span class="card-deck-label">'+deck.label+'</span></button></li>';
    }).join('')+'</ul>';
  }

  function deckNavigationMarkup() {
    const label=archiveOnly?'발견 기록':domain==='all'?(query.trim()?'검색 결과':'내성형'):DECKS.find(deck=>deck.id===domain)?.label || FILTERS.find(filter=>filter.id===domain)?.label;
    return '<div class="card-gallery-deck-nav"><button type="button" data-card-decks aria-label="세 덱 선택으로 돌아가기">← 덱</button><span>'+esc(label)+'</span></div>';
  }

  function resultMarkup() {
    if(isDeckOverview())return deckOverviewMarkup();
    const matching=filtered(),groups=stacks.groups(matching);
    const pages=Math.max(1,Math.ceil(groups.length/PAGE_SIZE));
    page=Math.min(page,pages-1);
    const start=page*PAGE_SIZE,items=groups.slice(start,start+PAGE_SIZE);
    const count=matching.length
      ? '<strong>'+matching.length+'</strong>장'+(groups.length!==matching.length?' · '+groups.length+'개 목록':'')+' · '+(start+1)+'–'+Math.min(start+PAGE_SIZE,groups.length)+' · '+(page+1)+' / '+pages+' 페이지'
      : '일치하는 카드가 없습니다.';
    const archive=getArchive(),found=data.records.filter(record=>Object.hasOwn(archive,record.id)).length;
    const progress=archiveOnly?'<div class="card-gallery-discoveries"><span>발견 '+found+' / '+data.records.length+'</span><progress value="'+found+'" max="'+data.records.length+'" aria-label="병원체 발견 진행률"></progress></div>':'';
    const empty=archiveOnly && !found
      ? '<div class="card-gallery-empty"><h2>첫 번째 기록을 기다립니다.</h2><p>동정실에서 맞힌 병원체의 최고점과 동정 횟수를 여기에서 확인할 수 있습니다.</p><button type="button" data-view="lab">동정실로 이동 →</button></div>'
      : '<div class="card-gallery-empty"><h2>검색 조건을 바꿔보세요.</h2><p>이름, 표현형, 계열 또는 요약 속 단어로 검색할 수 있습니다.</p><button type="button" data-card-reset>필터 초기화</button></div>';
    return deckNavigationMarkup()+progress+'<p class="card-gallery-status" role="status" aria-live="polite">'+count+'</p>'+
      (items.length ? '<ul class="card-gallery-grid card-collection" style="--thumbnail-min:'+width+'px">'+items.map(group=>{
        if(group.type==='stack')return stacks.render(group,entryCard,{prefix:'card-gallery',tag:'li',className:'card-gallery-item'});
        const entry=group.items[0];
        return '<li class="card-gallery-item" data-gallery-card="'+esc(entry.key)+'">'+entryCard(entry)+'</li>';
      }).join('')+'</ul>' : empty)+
      (pages>1?'<nav class="card-gallery-pagination" aria-label="카드 목록 페이지"><button type="button" data-card-page="prev" '+(page===0?'disabled':'')+'>← 이전</button><span>'+(page+1)+' / '+pages+'</span><button type="button" data-card-page="next" '+(page===pages-1?'disabled':'')+'>다음 →</button></nav>':'');
  }

  function optionsContent() {
    return '<header class="card-gallery-options-heading"><h2 id="card-gallery-options-title">보기 설정</h2><button type="button" data-card-options="close" aria-label="설정 닫기">✕</button></header>'+
      '<div class="card-gallery-domains" role="group" aria-label="수록 범위"><button type="button" data-card-collection="all" aria-pressed="'+!archiveOnly+'">전체 수록</button><button type="button" data-card-collection="archive" aria-pressed="'+archiveOnly+'">발견 기록</button></div>'+
      '<div class="card-gallery-domains" role="group" aria-label="카드 분류">'+FILTERS.filter(filter=>!archiveOnly || !['drugs','diseases'].includes(filter.id)).map(filter=>'<button type="button" data-card-domain="'+filter.id+'" aria-pressed="'+(filter.id===domain)+'">'+filter.label+'</button>').join('')+'</div>'+
      '<div class="card-gallery-controls">'+
      (domain==='drugs'?'<label class="card-gallery-family">약제 계열<select id="card-gallery-family"><option value="all">모든 계열</option>'+families.map(value=>'<option value="'+esc(value)+'" '+(value===family?'selected':'')+'>'+esc(value)+'</option>').join('')+'</select></label>':'')+
      (domain==='diseases'?'<label class="card-gallery-family">질환 분류<select id="card-gallery-disease-category"><option value="all">모든 감염질환</option>'+Object.values(catalog.diseaseCategories).map(category=>'<option value="'+esc(category.id)+'" '+(category.id===diseaseCategory?'selected':'')+'>'+esc(category.label)+'</option>').join('')+'</select></label>':'')+
      '<label class="card-gallery-size">목록 밀도<select id="card-gallery-size">'+WIDTHS.map(value=>'<option value="'+value+'" '+(value===width?'selected':'')+'>'+({160:'촘촘하게',190:'기본',220:'넓게'})[value]+'</option>').join('')+'</select></label>'+
      (!['drugs','diseases'].includes(domain)?'<label class="card-gallery-resistance"><input id="card-gallery-resistance" type="checkbox" '+(resistanceOnly?'checked':'')+'>내성 표시 카드만</label><label class="card-gallery-resistance"><input id="card-gallery-stacks" type="checkbox" '+(stacks.enabled()?'checked':'')+'>내성형 겹쳐 보기</label>':'')+
      '</div><button type="button" class="card-gallery-options-reset" data-card-reset>필터 초기화</button>'+renderCardLegend();
  }

  function renderGallery() {
    return '<section id="card-gallery-results" class="card-gallery-results'+(isDeckOverview()?' is-deck-overview':'')+'" tabindex="-1" aria-label="카드 도감">'+resultMarkup()+'</section>'+
      '<form id="card-gallery-search-form" class="card-gallery-searchbar" role="search" aria-label="카드 검색">'+
      '<label class="card-gallery-search-field" for="card-gallery-search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="card-gallery-search" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="카드 이름·표현형·계열 검색" placeholder="한글·영문 이름 검색" value="'+esc(query)+'"></label>'+
      '<button type="button" class="card-gallery-options-open" data-card-options="open" aria-label="카드 보기 설정" aria-haspopup="dialog" aria-controls="card-gallery-options"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="18" r="2" fill="currentColor"/></svg><span>'+filterLabel()+'</span></button><button type="button" class="card-gallery-info" data-card-guide="open" aria-label="예시 카드로 읽는 법 보기" aria-haspopup="dialog" aria-expanded="false" aria-controls="card-guide"><span aria-hidden="true">i</span></button></form>'+
      guide.markup()+'<dialog id="card-gallery-options" class="card-gallery-options" aria-labelledby="card-gallery-options-title">'+optionsContent()+'</dialog>';
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
    if(results){results.classList.toggle('is-deck-overview',isDeckOverview());results.innerHTML=resultMarkup();}
    const input=document.querySelector('#card-gallery-search');
    if(input && input.value!==query)input.value=query;
    const label=document.querySelector('[data-card-options="open"] span');
    if(label)label.textContent=filterLabel();
  }

  function filterLabel() {
    return archiveOnly?'발견 기록':domain==='all'?'필터':FILTERS.find(filter=>filter.id===domain).label;
  }

  function handleClick(button) {
    if(guide.handleClick(button,domain))return true;
    if(button.dataset.cardDeck){
      if(!DECKS.some(deck=>deck.id===button.dataset.cardDeck))return true;
      query='';family='all';diseaseCategory='all';resistanceOnly=false;
      setRoute(button.dataset.cardDeck,false);onFilterChange(domain,archiveOnly);
      refreshResults();refreshOptions();
      document.querySelector('#card-gallery-results')?.focus({preventScroll:true});
      return true;
    }
    if(Object.hasOwn(button.dataset,'cardDecks')){
      const previousDeck=DECKS.find(deck=>deck.id===domain)?.id || 'pathogens';
      setRoute('all',false);onFilterChange(domain,archiveOnly);
      refreshResults();refreshOptions();
      document.querySelector('[data-card-deck="'+previousDeck+'"]')?.focus({preventScroll:true});
      return true;
    }
    if(button.dataset.cardCollection){
      const next=button.dataset.cardCollection==='archive';
      setRoute(next && ['drugs','diseases'].includes(domain)?'all':domain,next);onFilterChange(domain,archiveOnly);
      refreshResults();refreshOptions('[data-card-collection="'+button.dataset.cardCollection+'"]');
      return true;
    }
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
        setRoute(next,['drugs','diseases'].includes(next)?false:archiveOnly,{resetOverview:false});onFilterChange(domain,archiveOnly);
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
      rememberFaces();domain='all';archiveOnly=false;query='';family='all';diseaseCategory='all';resistanceOnly=false;page=0;onFilterChange(domain,archiveOnly);
      const input=document.querySelector('#card-gallery-search');
      if(input)input.value='';
      refreshResults();refreshOptions('[data-card-reset]');
      if(!document.querySelector('#card-gallery-options')?.open)input?.focus({preventScroll:true});
      return true;
    }
    return false;
  }

  function handleChange(target) {
    if(target.id==='card-gallery-disease-category'){
      if(target.value==='all' || catalog.diseaseCategories[target.value]){rememberFaces();diseaseCategory=target.value;page=0;refreshResults();}
      return true;
    }
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

  return {render:renderGallery,handleClick,handleChange,handleInput,handleSubmit,rememberFaces,setRoute};
}
