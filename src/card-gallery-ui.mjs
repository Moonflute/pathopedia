import { createCardStacks } from './card-stacks.mjs';
import { createCardSearch } from './card-search.mjs';
import { createCardGuide } from './card-guide.mjs';
import { renderCardThumbnail, renderCardLegend, cardIcon } from './reference-card.mjs';
import { CARD_DOMAINS, IMMUNE_CATEGORY_ICONS, createCardModels } from './card-models.mjs';
import { sortPathogenRecords } from './card-pathogen-order.mjs';
import { DRUG_ORDER, drugClassification, sortDrugRecords } from './card-drug-order.mjs';
import { CARD_FILTERS as FILTERS } from './app-routing.mjs';
import { cardArtwork } from './card-art.mjs';

const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BATCH_SIZE=24;
const LAYOUT_STORAGE_KEY='pathopedia:card-layout';
const FAN_STEP=42;
const WIDTHS=[160,190,220];
const DECKS=[
  {id:'pathogens',kind:'pathogen',label:'병원체',icon:'bacteria'},
  {id:'drugs',kind:'drug',label:'약제',icon:'capsule'},
  {id:'diseases',kind:'disease',label:'질병',icon:'clinical'},
  {id:'immunity',kind:'immune-element',label:'면역계',icon:'immunity'}
];

export function createCardGallery(data,{catalog,cardStacks,getArchive=()=>({}),onFilterChange=()=>{}}) {
  const models=createCardModels(data,catalog);
  const guide=createCardGuide(models);
  const search=createCardSearch(data,catalog);
  const stacks=cardStacks || createCardStacks(catalog);
  const drugFilters=new Set(DRUG_ORDER.flatMap(group=>['group:'+group.id,...group.classes.map(drugClass=>'class:'+drugClass.id)]));
  const diseaseCategories=Object.values(catalog.diseaseCategories);
  const immuneCategories=Object.values(catalog.immuneCategories || {});
  const entries=[
    ...sortPathogenRecords(data.records,catalog).map(record=>({
      key:'pathogen:'+record.id,id:record.id,kind:'pathogen',domain:record.domain,
      name:record.organism,subtitle:record.koreanName,variant:record.phenotype,
      resistance:catalog.variants[record.id]?.resistance
    })),
    ...sortDrugRecords(data.drugs).map(drug=>({
      key:'drug:'+drug.id,id:drug.id,kind:'drug',domain:'drugs',name:drug.name,
      subtitle:drug.family,drugGroup:drugClassification(drug.id)?.group,
      drugClass:drugClassification(drug.id)?.drugClass,variant:''
    })),
    ...Object.values(catalog.diseases || {}).map(disease=>({key:'disease:'+disease.id,id:disease.id,kind:'disease',domain:'diseases',name:disease.name,subtitle:disease.englishName,category:disease.category,variant:''})),
    ...Object.values(catalog.immuneElements || {}).sort((a,b)=>a.sortOrder-b.sortOrder).map(element=>({
      key:'immune-element:'+element.id,id:element.id,kind:'immune-element',domain:'immunity',
      name:element.name,subtitle:element.englishName,category:element.category,variant:''
    }))
  ];
  let diseaseCategory='all',immuneCategory='all';
  let domain='all',archiveOnly=false,query='',drugFilter='all',resistanceOnly=false,visibleCount=BATCH_SIZE,width=190;
  let moreObserver=null,selectedFanKey='',tappedFanKey='',lastFanPointerType='';
  let layout='grid';
  try{
    layout=globalThis.localStorage?.getItem(LAYOUT_STORAGE_KEY)==='fan'?'fan':'grid';
  }catch{}
  const flipped=new Set();
  const entryByKey=new Map(entries.map(entry=>[entry.key,entry]));

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
      && (domain!=='drugs' || drugFilter==='all' || drugFilter==='group:'+entry.drugGroup || drugFilter==='class:'+entry.drugClass)
      && (domain!=='diseases' || diseaseCategory==='all' || entry.category===diseaseCategory)
      && (domain!=='immunity' || immuneCategory==='all' || entry.category===immuneCategory)
      && search.matches(entry.kind,entry.id,query));
  }

  function entryCard(entry) {
    const model=models.get(entry.kind,entry.id);
    const found=entry.kind==='pathogen'?getArchive()[entry.id]:null;
    return renderCardThumbnail(model,{key:entry.key,caption:entry.variant || entry.subtitle,badge:found?'동정 완료 · 최고 '+found.bestScore+'점 · '+found.solves+'회 동정':CARD_DOMAINS[entry.domain]});
  }

  function setRoute(nextDomain='all',nextArchiveOnly=false,{resetOverview=true}={}) {
    if(!FILTERS.some(filter=>filter.id===nextDomain) || nextArchiveOnly && ['drugs','diseases','immunity'].includes(nextDomain))return false;
    rememberFaces();domain=nextDomain;archiveOnly=nextArchiveOnly;visibleCount=BATCH_SIZE;selectedFanKey='';tappedFanKey='';
    if(domain==='all' && !archiveOnly && resetOverview){
      query='';drugFilter='all';diseaseCategory='all';immuneCategory='all';resistanceOnly=false;
    }
    if(['drugs','diseases','immunity'].includes(domain))resistanceOnly=false;
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
    return '<div class="card-gallery-deck-nav"><button type="button" data-card-decks aria-label="덱 선택으로 돌아가기">← 덱</button><span>'+esc(label)+'</span></div>';
  }

  function groupMarkup(group) {
    if(group.type==='stack')return stacks.render(group,entryCard,{prefix:'card-gallery',tag:'li',className:'card-gallery-item'});
    const entry=group.items[0];
    return '<li class="card-gallery-item" data-gallery-card="'+esc(entry.key)+'">'+entryCard(entry)+'</li>';
  }


  function layoutSwitchMarkup() {
    return '<div class="card-gallery-layout" role="group" aria-label="카드 보기 방식">'+
      '<button type="button" data-card-layout="grid" aria-pressed="'+(layout==='grid')+'">개별 보기</button>'+
      '<button type="button" data-card-layout="fan" aria-pressed="'+(layout==='fan')+'">호 보기</button></div>';
  }

  function fanTileMarkup(entry,index,total) {
    const offset=total===1?0:index/(total-1)*2-1;
    const art=cardArtwork(entry.kind,entry.kind==='pathogen'?catalog.variants[entry.id]?.pathogenId:entry.id);
    const icon=entry.kind==='drug'?'capsule':entry.kind==='disease'?'clinical':entry.kind==='immune-element'?IMMUNE_CATEGORY_ICONS[entry.category]:entry.domain==='viruses'?'virus':entry.domain==='fungi'?'fungi':entry.domain==='parasites'?'parasite':'bacteria';
    const active=selectedFanKey===entry.key;
    const picture=art?.src?'<img src="'+esc(art.src)+'" alt="" loading="'+(active?'eager':'lazy')+'" decoding="async">':cardIcon(icon);
    return '<li class="card-fan-item'+(active?' is-active':'')+'" data-card-key="'+esc(entry.key)+'" data-fan-domain="'+esc(entry.domain)+'" style="--fan-x:'+(30+index*FAN_STEP)+'px;--fan-y:'+Math.round(46*offset*offset)+'px;--fan-angle:'+(offset*11).toFixed(2)+'deg;--fan-order:'+index+'">'+
      '<button type="button" class="card-fan-card'+(active?' is-active':'')+'" data-card-fan-key="'+esc(entry.key)+'" data-card-fan-index="'+index+'" aria-pressed="'+active+'" aria-label="'+esc((index+1)+' / '+total+' · '+entry.name+(entry.variant?' · '+entry.variant:''))+'">'+
      '<span class="card-fan-corner" aria-hidden="true">◆</span><span class="card-fan-art">'+picture+'</span>'+
      '<span class="card-fan-name">'+esc(entry.name)+'</span><span class="card-fan-index">'+(index+1)+'</span></button></li>';
  }

  function fanFeatureMarkup(entry,index,total) {
    const model=models.get(entry.kind,entry.id);
    return '<div class="card-fan-feature-card">'+entryCard(entry)+'</div>'+
      '<div class="card-fan-mobile-summary"><strong>'+esc(entry.name)+'</strong><small>'+esc(entry.variant || entry.subtitle || model.lineage)+'</small><p>'+esc(model.summary || '')+'</p></div>'+
      '<div class="card-fan-feature-footer"><span>'+(index+1)+' / '+total+'</span>'+
      '<button type="button" data-card-open="'+esc(entry.key)+'">카드 열기 ↗</button></div>';
  }

  function fanMarkup(matching) {
    if(!matching.some(entry=>entry.key===selectedFanKey))selectedFanKey=matching[0].key;
    const index=matching.findIndex(entry=>entry.key===selectedFanKey);
    return '<div class="card-fan" data-card-fan-collection data-card-fan-count="'+matching.length+'">'+
      '<div class="card-fan-feature" data-card-fan-feature>'+fanFeatureMarkup(matching[index],index,matching.length)+'</div>'+
      '<div class="card-fan-controls"><button type="button" data-card-fan-move="-1" aria-label="이전 카드">←</button>'+
      '<span>카드 '+matching.length+'장</span><button type="button" data-card-fan-move="1" aria-label="다음 카드">→</button></div>'+
      '<div class="card-fan-track" tabindex="0" aria-label="카드 호 · 좌우로 스크롤 또는 방향키 이동">'+
      '<ul class="card-fan-arc" style="--fan-core-width:'+(FAN_STEP*(matching.length-1)+184)+'px">'+
      matching.map((entry,index)=>fanTileMarkup(entry,index,matching.length)).join('')+'</ul></div></div>';
  }

  function selectFan(button,{scroll=false}={}) {
    const key=button?.dataset.cardFanKey,entry=entryByKey.get(key);
    if(!entry)return false;
    const item=button.closest('.card-fan-item'),old=globalThis.document?.querySelector('.card-fan-card.is-active');
    if(old!==button){
      old?.classList.remove('is-active');old?.setAttribute('aria-pressed','false');
      old?.closest('.card-fan-item')?.classList.remove('is-active');
      button.classList.add('is-active');button.setAttribute('aria-pressed','true');
      item?.classList.add('is-active');selectedFanKey=key;
      const feature=globalThis.document?.querySelector('[data-card-fan-feature]');
      const total=Number(button.closest('[data-card-fan-collection]')?.dataset.cardFanCount);
      if(feature)feature.innerHTML=fanFeatureMarkup(entry,Number(button.dataset.cardFanIndex),total);
    }
    if(scroll){
      const track=button.closest('.card-fan-track');
      if(track&&item)track.scrollTo?.({left:item.offsetLeft+item.offsetWidth/2-track.clientWidth/2,behavior:'smooth'});
    }
    return true;
  }

  function moveFan(direction) {
    const buttons=[...(globalThis.document?.querySelectorAll('.card-fan-card') || [])];
    const index=buttons.findIndex(button=>button.dataset.cardFanKey===selectedFanKey);
    const next=buttons[Math.max(0,Math.min(buttons.length-1,index+direction))];
    if(!next)return false;
    tappedFanKey='';
    selectFan(next,{scroll:true});next.focus({preventScroll:true});
    return true;
  }

  function handlePointerMove(event) {
    if(event.pointerType!=='mouse' && event.pointerType!=='pen')return false;
    const track=event.target.closest?.('.card-fan-track');
    if(!track || !event.target.closest('.card-fan-card'))return false;
    const index=Math.max(0,Math.min(Number(track.closest('[data-card-fan-collection]')?.dataset.cardFanCount)-1,
      Math.floor((event.clientX-track.getBoundingClientRect().left+track.scrollLeft-30-(globalThis.innerWidth<=599?globalThis.innerWidth/2-92:0))/FAN_STEP)));
    const button=track.querySelector('[data-card-fan-index="'+index+'"]');
    if(button?.dataset.cardFanKey===selectedFanKey)return true;
    tappedFanKey='';return selectFan(button);
  }

  function handlePointerDown(event) {
    if(event.target.closest?.('.card-fan-card'))lastFanPointerType=event.pointerType;
  }

  function handleWheel(event) {
    const track=event.target.closest?.('.card-fan-track');
    if(!track || Math.abs(event.deltaY)<=Math.abs(event.deltaX))return false;
    const step=event.deltaMode===1?16:event.deltaMode===2?track.clientWidth:1;
    const next=Math.max(0,Math.min(track.scrollWidth-track.clientWidth,track.scrollLeft+event.deltaY*step));
    if(Math.abs(next-track.scrollLeft)<1)return false;
    event.preventDefault();track.scrollLeft=next;
    return true;
  }

  function handleFocusIn(event) {
    const button=event.target.closest?.('.card-fan-card');
    return button?selectFan(button):false;
  }

  function handleKeydown(event) {
    if(!event.target.closest?.('.card-fan-track') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return false;
    event.preventDefault();
    if(event.key==='Home' || event.key==='End'){
      const buttons=[...document.querySelectorAll('.card-fan-card')],next=buttons[event.key==='Home'?0:buttons.length-1];
      if(next){tappedFanKey='';selectFan(next,{scroll:true});next.focus({preventScroll:true});}
    }else moveFan(event.key==='ArrowRight'?1:-1);
    return true;
  }

  function statusMarkup(matching,groups) {
    return matching.length
      ? layout==='fan'?'<strong>'+matching.length+'</strong>장 · 호 보기':'<strong>'+matching.length+'</strong>장'+(groups.length!==matching.length?' · '+groups.length+'개 목록':'')+' · '+Math.min(visibleCount,groups.length)+'/'+groups.length+'개 표시'
      : '일치하는 카드가 없습니다.';
  }

  function resultMarkup() {
    if(isDeckOverview())return deckOverviewMarkup();
    const matching=filtered(),groups=layout==='fan'?[]:stacks.groups(matching),items=groups.slice(0,visibleCount);
    const archive=getArchive(),found=data.records.filter(record=>Object.hasOwn(archive,record.id)).length;
    const progress=archiveOnly?'<div class="card-gallery-discoveries"><span>발견 '+found+' / '+data.records.length+'</span><progress value="'+found+'" max="'+data.records.length+'" aria-label="병원체 발견 진행률"></progress></div>':'';
    const empty=archiveOnly && !found
      ? '<div class="card-gallery-empty"><h2>첫 번째 기록을 기다립니다.</h2><p>동정실에서 맞힌 병원체의 최고점과 동정 횟수를 여기에서 확인할 수 있습니다.</p><button type="button" data-view="lab">동정실로 이동 →</button></div>'
      : '<div class="card-gallery-empty"><h2>검색 조건을 바꿔보세요.</h2><p>이름, 분류 또는 요약 속 단어로 검색할 수 있습니다.</p><button type="button" data-card-reset>필터 초기화</button></div>';
    return deckNavigationMarkup()+progress+'<p class="card-gallery-status" role="status" aria-live="polite">'+statusMarkup(matching,groups)+'</p>'+layoutSwitchMarkup()+
      (matching.length?(layout==='fan'?fanMarkup(matching):'<ul class="card-gallery-grid card-collection" style="--thumbnail-min:'+width+'px">'+items.map(groupMarkup).join('')+'</ul>'):empty)+
      (layout==='grid' && visibleCount<groups.length?'<div class="card-gallery-more"><button type="button" data-card-more>카드 더 보기</button></div>':'');
  }

  function watchMore() {
    moreObserver?.disconnect();moreObserver=null;
    const button=globalThis.document?.querySelector('[data-card-more]');
    if(!button || typeof globalThis.IntersectionObserver!=='function')return;
    moreObserver=new IntersectionObserver(changes=>{
      if(changes.some(entry=>entry.isIntersecting && entry.target===globalThis.document?.querySelector('[data-card-more]')))loadMore();
    },{rootMargin:'400px 0px'});
    moreObserver.observe(button);
  }

  function loadMore() {
    const results=globalThis.document?.querySelector('#card-gallery-results');
    const grid=results?.querySelector('.card-gallery-grid');
    if(!grid)return false;
    const matching=filtered(),groups=stacks.groups(matching);
    if(visibleCount>=groups.length)return false;
    const next=groups.slice(visibleCount,visibleCount+BATCH_SIZE);
    visibleCount+=next.length;
    grid.insertAdjacentHTML('beforeend',next.map(groupMarkup).join(''));
    const status=results.querySelector('.card-gallery-status');
    if(status)status.innerHTML=statusMarkup(matching,groups);
    if(visibleCount>=groups.length)results.querySelector('[data-card-more]')?.remove();
    watchMore();
    return true;
  }

  function drugOptions() {
    return DRUG_ORDER.map(group=>'<optgroup label="'+esc(group.label)+'">'+
      '<option value="group:'+group.id+'" '+(drugFilter==='group:'+group.id?'selected':'')+'>'+esc(group.label)+' 전체</option>'+
      group.classes.map(drugClass=>'<option value="class:'+drugClass.id+'" '+(drugFilter==='class:'+drugClass.id?'selected':'')+'>'+esc(drugClass.label)+'</option>').join('')+
      '</optgroup>').join('');
  }

  function diseaseOptions() {
    return diseaseCategories.map(category=>{
      const before=category.id==='gastrointestinal'?'<optgroup label="소화기">':category.id==='obstetric'?'<optgroup label="산과·생식기">':'';
      const after=category.id==='hepatobiliary' || category.id==='sti'?'</optgroup>':'';
      return before+'<option value="'+esc(category.id)+'" '+(category.id===diseaseCategory?'selected':'')+'>'+esc(category.label)+'</option>'+after;
    }).join('');
  }

  function immuneOptions() {
    return immuneCategories.map(category=>'<option value="'+esc(category.id)+'" '+(category.id===immuneCategory?'selected':'')+'>'+esc(category.label)+'</option>').join('');
  }

  function optionsContent() {
    return '<header class="card-gallery-options-heading"><h2 id="card-gallery-options-title">보기 설정</h2><button type="button" data-card-options="close" aria-label="설정 닫기">✕</button></header>'+
      '<div class="card-gallery-domains" role="group" aria-label="수록 범위"><button type="button" data-card-collection="all" aria-pressed="'+!archiveOnly+'">전체 수록</button><button type="button" data-card-collection="archive" aria-pressed="'+archiveOnly+'">발견 기록</button></div>'+
      '<div class="card-gallery-domains" role="group" aria-label="카드 분류">'+FILTERS.filter(filter=>!archiveOnly || !['drugs','diseases','immunity'].includes(filter.id)).map(filter=>'<button type="button" data-card-domain="'+filter.id+'" aria-pressed="'+(filter.id===domain)+'">'+filter.label+'</button>').join('')+'</div>'+
      '<div class="card-gallery-controls">'+
      (domain==='drugs'?'<label class="card-gallery-family">약제 분류<select id="card-gallery-drug-class"><option value="all">모든 약제</option>'+drugOptions()+'</select></label>':'')+
      (domain==='diseases'?'<label class="card-gallery-family">질환 분류<select id="card-gallery-disease-category"><option value="all">모든 감염질환</option>'+diseaseOptions()+'</select></label>':'')+
      (domain==='immunity'?'<label class="card-gallery-family">면역계 분류<select id="card-gallery-immune-category"><option value="all">모든 면역계 요소</option>'+immuneOptions()+'</select></label>':'')+
      (layout==='grid'?'<label class="card-gallery-size">목록 밀도<select id="card-gallery-size">'+WIDTHS.map(value=>'<option value="'+value+'" '+(value===width?'selected':'')+'>'+({160:'촘촘하게',190:'기본',220:'넓게'})[value]+'</option>').join('')+'</select></label>':'')+
      (!['drugs','diseases','immunity'].includes(domain)?'<label class="card-gallery-resistance"><input id="card-gallery-resistance" type="checkbox" '+(resistanceOnly?'checked':'')+'>내성 표시 카드만</label>'+(layout==='grid'?'<label class="card-gallery-resistance"><input id="card-gallery-stacks" type="checkbox" '+(stacks.enabled()?'checked':'')+'>내성형 겹쳐 보기</label>':''):'')+
      '</div><button type="button" class="card-gallery-options-reset" data-card-reset>필터 초기화</button>'+(domain==='immunity'?'':renderCardLegend());
  }

  function renderGallery() {
    return '<section id="card-gallery-results" class="card-gallery-results'+(isDeckOverview()?' is-deck-overview':'')+'" tabindex="-1" aria-label="카드 도감">'+resultMarkup()+'</section>'+
      '<form id="card-gallery-search-form" class="card-gallery-searchbar" role="search" aria-label="카드 검색">'+
      '<label class="card-gallery-search-field" for="card-gallery-search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="card-gallery-search" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="카드 이름·분류 검색" placeholder="한글·영문 이름 검색" value="'+esc(query)+'"></label>'+
      '<button type="button" class="card-gallery-options-open" data-card-options="open" aria-label="카드 보기 설정" aria-haspopup="dialog" aria-controls="card-gallery-options"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="18" r="2" fill="currentColor"/></svg><span>'+filterLabel()+'</span></button><button type="button" class="card-gallery-info" data-card-guide="open" aria-label="예시 카드로 읽는 법 보기" aria-haspopup="dialog" aria-expanded="false" aria-controls="card-guide"><span aria-hidden="true">i</span></button>'+
      '</form>'+
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
    watchMore();
    const input=document.querySelector('#card-gallery-search');
    if(input && input.value!==query)input.value=query;
    const label=document.querySelector('[data-card-options="open"] span');
    if(label)label.textContent=filterLabel();
  }

  function filterLabel() {
    return archiveOnly?'발견 기록':domain==='all'?'필터':FILTERS.find(filter=>filter.id===domain).label;
  }

  function handleClick(button,event) {
    if(guide.handleClick(button,domain))return true;
    if(button.dataset.cardLayout){
      if(!['grid','fan'].includes(button.dataset.cardLayout))return true;
      layout=button.dataset.cardLayout;tappedFanKey='';
      try{globalThis.localStorage?.setItem(LAYOUT_STORAGE_KEY,layout);}catch{}
      refreshResults();refreshOptions();
      document.querySelector('[data-card-layout="'+layout+'"]')?.focus({preventScroll:true});
      return true;
    }
    if(button.dataset.cardFanMove){moveFan(Number(button.dataset.cardFanMove));return true;}
    if(button.dataset.cardFanKey){
      const touch=event?.pointerType==='touch' || (!event?.pointerType && lastFanPointerType==='touch');
      lastFanPointerType='';
      selectFan(button,{scroll:touch});
      if(touch && tappedFanKey!==button.dataset.cardFanKey){
        tappedFanKey=button.dataset.cardFanKey;return true;
      }
      tappedFanKey='';
      document.querySelector('.card-fan-feature-footer [data-card-open]')?.click();
      return true;
    }
    if(button.dataset.cardDeck){
      if(!DECKS.some(deck=>deck.id===button.dataset.cardDeck))return true;
      query='';drugFilter='all';diseaseCategory='all';immuneCategory='all';resistanceOnly=false;
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
      setRoute(next && ['drugs','diseases','immunity'].includes(domain)?'all':domain,next);onFilterChange(domain,archiveOnly);
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
        setRoute(next,['drugs','diseases','immunity'].includes(next)?false:archiveOnly,{resetOverview:false});onFilterChange(domain,archiveOnly);
        refreshResults();refreshOptions('[data-card-domain="'+next+'"]');
      }
      return true;
    }
    if (Object.hasOwn(button.dataset,'cardMore')) {loadMore();return true;}
    if (Object.hasOwn(button.dataset,'cardReset')) {
      rememberFaces();domain='all';archiveOnly=false;query='';drugFilter='all';diseaseCategory='all';immuneCategory='all';resistanceOnly=false;visibleCount=BATCH_SIZE;onFilterChange(domain,archiveOnly);
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
      if(target.value==='all' || catalog.diseaseCategories[target.value]){rememberFaces();diseaseCategory=target.value;visibleCount=BATCH_SIZE;refreshResults();}
      return true;
    }
    if(target.id==='card-gallery-immune-category'){
      if(target.value==='all' || catalog.immuneCategories?.[target.value]){rememberFaces();immuneCategory=target.value;visibleCount=BATCH_SIZE;refreshResults();}
      return true;
    }
    if(target.id==='card-gallery-stacks'){
      stacks.setEnabled(target.checked);visibleCount=BATCH_SIZE;refreshResults();return true;
    }
    if (target.id==='card-gallery-size') {
      const next=Number(target.value);
      if (WIDTHS.includes(next)) {rememberFaces();width=next;refreshResults();}
      return true;
    }
    if (target.id==='card-gallery-drug-class') {
      if (target.value==='all' || drugFilters.has(target.value)) {rememberFaces();drugFilter=target.value;visibleCount=BATCH_SIZE;refreshResults();}
      return true;
    }
    if (target.id==='card-gallery-resistance') {
      rememberFaces();resistanceOnly=target.checked;visibleCount=BATCH_SIZE;refreshResults();return true;
    }
    return false;
  }

  function handleInput(target) {
    if (target.id!=='card-gallery-search') return false;
    rememberFaces();query=target.value;visibleCount=BATCH_SIZE;refreshResults();return true;
  }

  function handleSubmit(event) {
    if(event.target.id!=='card-gallery-search-form')return false;
    event.preventDefault();
    const input=document.querySelector('#card-gallery-search');
    if(input){handleInput(input);input.blur();}
    document.querySelector('#card-gallery-results')?.scrollIntoView({block:'start',behavior:'instant'});
    return true;
  }

  return {render:renderGallery,mount:watchMore,handleClick,handleChange,handleInput,handleSubmit,handlePointerMove,handlePointerDown,handleWheel,handleFocusIn,handleKeydown,rememberFaces,setRoute};
}
