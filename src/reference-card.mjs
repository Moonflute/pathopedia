const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Small, reusable glyphs. Their light/dim state belongs to data, not to artwork.
export const CARD_ICONS = Object.freeze({
  contact: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v6c0 4-2 6-6 6h-2c-2 0-3-1-4-3l-4-5a1.6 1.6 0 0 1 2-2l2 1Z"/>',
  syringe: '<path d="m15 3 6 6M17 5 7 15l2 2L19 7M7 15l-2 4-2 2M10 12l2 2M13 9l2 2M4 12l8 8"/>',
  vial: '<path d="M9 3h6v4l3 3v10H6V10l3-3V3ZM8 3h8M6 12h12M10 15h4M12 13v6"/>',
  penicillin: '<path d="m12 2 8 6-3 10H7L4 8l8-6ZM4 8h16M7 18l-2 4M17 18l2 4M12 2v10l-5 6M12 12l5 6"/>',
  cephalosporin: '<path d="m12 2 8 5v10l-8 5-8-5V7l8-5ZM4 7l8 5 8-5M12 12v10M8 5v4M16 15v4"/>',
  glycopeptide: '<path d="M5 3v6l4 3-4 3v6M19 3v6l-4 3 4 3v6M5 5h14M5 19h14M9 12h6M8 3v4M16 17v4"/>',
  linezolid: '<path d="m12 3 7 4v10l-7 4-7-4V7l7-4ZM5 7l7 5 7-5M12 12v9M8 5l4 7 4-7"/>',
  daptomycin: '<circle cx="12" cy="12" r="7"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M7 7l10 10M7 17 17 7"/>',
  clindamycin: '<path d="M5 3h14M8 3v7l-4 9 2 2h12l2-2-4-9V3M6 16h12M10 8h4"/>',
  cocci: '<circle cx="8" cy="7" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="6" cy="15" r="3"/><circle cx="13" cy="15" r="3"/><circle cx="19" cy="17" r="2"/>',
  resistantCocci: '<circle cx="8" cy="7" r="3"/><circle cx="7" cy="16" r="3"/><circle cx="17" cy="7" r="3"/><path d="m15 12 6 2v4l-3 4-3-4v-4ZM16 16h4"/>',
  enterococcus: '<circle cx="5" cy="6" r="3"/><circle cx="10" cy="12" r="3"/><circle cx="16" cy="17" r="3"/><path d="m18 3 3 3-3 3M3 18l3 3"/>',
  rods: '<rect x="3" y="4" width="7" height="15" rx="3.5" transform="rotate(-25 6.5 11.5)"/><rect x="14" y="6" width="7" height="15" rx="3.5" transform="rotate(20 17.5 13.5)"/>',
  skin: '<path d="M3 7c3-4 6 4 9 0s6 4 9 0M3 12h18M3 17h18M7 12v5M17 12v5M12 3v4"/>',
  blood: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM9 15a3 3 0 0 0 3 3"/>',
  heart: '<path d="M12 21 4 13C-1 7 7 1 12 7c5-6 13 0 8 6l-8 8ZM3 12h5l2-4 3 8 2-4h6"/>',
  bone: '<path d="M7 3a3 3 0 0 1 4 4l6 6a3 3 0 1 1 4 4 3 3 0 1 1-4 4l-6-6a3 3 0 1 1-4-4 3 3 0 0 1 0-8Z"/>',
  lungs: '<path d="M12 2v8M12 8l-4 4M12 8l4 4M9 7C5 6 2 13 2 18c0 4 7 3 7 0V7ZM15 7c4-1 7 6 7 11 0 4-7 3-7 0V7Z"/>',
  urinary: '<path d="M8 3C2 3 1 14 5 15c4 1 5-5 2-6M16 3c6 0 7 11 3 12-4 1-5-5-2-6M8 13v4l4 4 4-4v-4M12 21v2"/>',
  abdomen: '<path d="M7 3C4 5 3 7 3 12s1 8 4 9M17 3c3 2 4 4 4 9s-1 8-4 9M8 7h6a2 2 0 0 1 0 4H9a2 2 0 0 0 0 4h5a2 2 0 0 1 0 4H8"/>',
  bacteria: "<circle cx=\"12\" cy=\"12\" r=\"7\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M7 9h1M15 14h1M9 16l3-6\"/>",
  chain: "<circle cx=\"4\" cy=\"5\" r=\"2.5\"/><circle cx=\"9\" cy=\"10\" r=\"2.5\"/><circle cx=\"14\" cy=\"15\" r=\"2.5\"/><circle cx=\"19\" cy=\"20\" r=\"2.5\"/>",
  nonfermenter: "<rect x=\"7\" y=\"4\" width=\"8\" height=\"16\" rx=\"4\"/><path d=\"M15 7c7-2 7 4 3 5s-4 5 2 7M10 8h2M10 12h2\"/>",
  fungus: "<path d=\"M12 21V8M12 14l-5-4M12 17l5-5M12 8l4-5M7 10 4 6M17 12l4-3\"/><ellipse cx=\"12\" cy=\"6\" rx=\"3\" ry=\"4\"/><circle cx=\"5\" cy=\"8\" r=\"3\"/><circle cx=\"19\" cy=\"10\" r=\"3\"/>",
  virus: "<path d=\"m12 5 6 3v8l-6 3-6-3V8l6-3ZM12 1v4M12 19v4M2 6l4 2M18 16l4 2M2 18l4-2M18 8l4-2\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/>",
  parasite: "<path d=\"M4 5c3-5 6 2 10 0s7 1 6 5c-1 5-8 1-11 5s-2 7-6 6M5 10l3 2M15 4l-1 4M13 14l2 3\"/><circle cx=\"5\" cy=\"5\" r=\"1\"/>",
  spiral: "<path d=\"M3 3c8-3-2 9 6 6s-2 9 6 6-2 9 6 6\"/>",
  brain: "<path d=\"M12 4C8 0 3 4 5 8c-5 3-3 8 0 8-1 5 5 7 7 3 2 4 8 2 7-3 3 0 5-5 0-8 2-4-3-8-7-4ZM12 4v15M5 8l3 2M19 8l-3 2M5 16l3-3M19 16l-3-3\"/>",
  liver: "<path d=\"M3 8c5-5 14-6 18-2v7c-6 3-8 8-13 8-4 0-6-7-5-13ZM13 5l-1 10M12 15l9-2\"/>",
  eye: "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  vector: "<path d=\"M12 7v13M9 10l-6-5M15 10l6-5M9 14l-6 4M15 14l6 4M9 18l-3 5M15 18l3 5M12 7l-4-5M12 7l4-5\"/><ellipse cx=\"12\" cy=\"13\" rx=\"3\" ry=\"6\"/>",
  vertical: "<circle cx=\"12\" cy=\"5\" r=\"3\"/><circle cx=\"12\" cy=\"19\" r=\"3\"/><path d=\"M12 9v6m-3-3 3 3 3-3\"/>",
  routes: "<path d=\"M12 21v-9M12 12 5 5M12 12l7-7M2 5h6V2M16 2v6h6\"/>",
  environment: "<path d=\"m2 20 7-12 4 6 3-4 6 10H2ZM4 4h4M6 2v4M18 3v3M16 5h4\"/>",
  capsule: "<rect x=\"7\" y=\"2\" width=\"10\" height=\"20\" rx=\"5\" transform=\"rotate(35 12 12)\"/><path d=\"m8 9 8 6\"/>",
  carbapenem: "<path d=\"m12 2 8 6-3 10H7L4 8l8-6ZM7 18l5-8 5 8M8 5h8M12 2v8M7 22h10\"/>",
  quinolone: "<path d=\"m7 3 6 4v7l-6 4-5-4V7l5-4ZM13 7l6-4 3 6-3 6-6-1M7 18v4M19 15v5\"/>",
  macrolide: "<path d=\"m12 2 7 3 3 7-3 7-7 3-7-3-3-7 3-7 7-3ZM12 2v5M22 12h-5M12 22v-5M2 12h5\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  aminoglycoside: "<path d=\"m7 2 5 3v6l-5 3-5-3V5l5-3ZM12 11l5-3 5 3v6l-5 3-5-3v-6ZM7 14v7M17 8V3\"/>",
  antifungal: "<path d=\"m12 2 8 6-3 10H7L4 8l8-6ZM12 7v10M8 12h8M4 22l16-20\"/>",
  antifolate: "<path d=\"m6 3 5 3v6l-5 3-4-3V6l4-3ZM13 12l5-3 4 3v6l-4 3-5-3v-6ZM11 9l2 6M6 15v6\"/>",
  antiviral: "<path d=\"m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6l8-4ZM8 12l3 3 5-6\"/>",
  antiparasitic: "<path d=\"M4 4c8-4 2 7 9 7s-1 10 7 9M3 21 21 3M15 3h6v6\"/>",
  clinical: '<path d="M8 3h8v5h5v8h-5v5H8v-5H3V8h5V3Z"/>',
  immunity: '<path d="M12 2 20 5v6c0 5-3.5 8.6-8 11-4.5-2.4-8-6-8-11V5l8-3Z"/><path d="m8 9 4 4 4-4M12 13v5"/>',
  lymphocyte: '<circle cx="12" cy="12" r="9"/><circle cx="13" cy="12" r="5"/><path d="M5 8h2M5 16h2"/>',
  receptor: '<path d="M3 19h18M12 19v-8m0 0L7 5m5 6 5-6"/><circle cx="7" cy="4" r="2"/><circle cx="17" cy="4" r="2"/>',
  antibody: '<path d="M12 21V11m0 0L5 4m7 7 7-7M3 2l4 4m14-4-4 4"/><circle cx="12" cy="21" r="1"/>',
  signal: '<circle cx="4" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><path d="m6 10 4-4m4 0 4 4m0 4-4 4m-4 0-4-4"/>',
  development: '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v4m0 0-7 4m7-4 7 4"/>',
  presentation: '<path d="M4 21V9h16v12M7 9V5h10v4"/><circle cx="10" cy="5" r="1"/><circle cx="14" cy="5" r="1"/><path d="M8 14h8M8 17h5"/>',
  phagocyte: '<path d="M21 13a9 9 0 1 1-8-10l-1 5 5 1 4 4Z"/><circle cx="9" cy="15" r="3"/><circle cx="19" cy="5" r="2"/>',
  cytotoxic: '<path d="M5 3h5l2 7 7 2v5M3 21l7-7M3 16v5h5M16 3l5 5m0-5-5 5"/><circle cx="16" cy="17" r="4"/>',
  activation: '<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>',
  recruitment: '<circle cx="5" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><path d="M10 12h12m-5-5 5 5-5 5M8 8l4 4-4 4"/>',
  opsonin: '<circle cx="12" cy="12" r="5"/><path d="M12 1v4m-3-3 3 3 3-3M1 12h4m-3-3 3 3-3 3M23 12h-4m3-3-3 3 3 3M12 23v-4m-3 3 3-3 3 3"/>',
  complement: '<path d="m12 2 8 5v10l-8 5-8-5V7l8-5ZM12 2v6m8-1-5 3m5 7-5-3m-3 8v-6m-8 1 5-3M4 7l5 3"/><circle cx="12" cy="12" r="4"/>',
  regulation: '<path d="m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6l8-4ZM8 12h8"/>',
  memory: '<path d="M4 8a9 9 0 1 1 0 8M4 3v5h5"/><circle cx="13" cy="12" r="4"/><path d="M13 9v3l2 2"/>',
  artwork: '<rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-6 4 4 3-3 5 5"/>'
});

export function cardIcon(name, className = '') {
  return `<svg class="card-glyph ${esc(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CARD_ICONS[name] || CARD_ICONS.artwork}</svg>`;
}

function tooltipAttributes({title,body=''}) {
  const description=title+(body && body!=='—'?' · '+body.replaceAll('\n',' · '):'');
  return 'aria-label="'+esc(description)+'" data-tooltip-title="'+esc(title)+'" data-tooltip-body="'+esc(body)+'"';
}
function propertyRune(property, preview=false) {
  const active=Boolean(property.active);
  const state=active ? property.negative ? 'blocked' : property.preferred ? 'preferred' : 'lit' : 'dim';
  const tooltip=property.tooltip || {title:property.label,body:property.note || ''};
  const tag=preview?'span':'button';
  return '<'+tag+(preview?'':' type="button" data-card-property')+' class="card-rune is-'+state+(property.conditional&&active?' has-condition':'')+'" '+(preview?'':tooltipAttributes(tooltip))+'>'+cardIcon(property.icon)+(property.shortLabel?'<small>'+esc(property.shortLabel)+'</small>':'')+'</'+tag+'>';
}
function propertyRail(properties, label, side, heading, preview) {
  return '<aside class="card-rail card-rail--'+side+'" aria-label="'+esc(label)+'"><span class="card-rail-caption" aria-hidden="true">'+esc(heading || (side==='left'?'유효':'약제'))+'</span><div class="card-runes">'+(properties || []).map(property=>propertyRune(property,preview)).join('')+'</div></aside>';
}

// The artwork can be exchanged without replacing any card text or glyphs.
function artwork(model) {
  if (model.artwork?.src) return `<img class="card-artwork-image" src="${esc(model.artwork.src)}" alt="${esc(model.artwork.alt || model.name)}" loading="lazy" decoding="async">`;
  return `<div class="card-artwork-placeholder" aria-label="${esc(model.kind==='immune-element'?model.artwork?.label || model.name:model.name+' 그림 자리')}"><span class="card-artwork-ring" aria-hidden="true"></span>${cardIcon(model.artwork?.placeholder || (model.kind === 'drug' ? 'vial' : 'cocci'), 'card-artwork-mark')}<span class="card-artwork-label">${esc(model.artwork?.label || 'ARTWORK')}</span><span class="card-artwork-corner top-left" aria-hidden="true"></span><span class="card-artwork-corner bottom-right" aria-hidden="true"></span></div>`;
}


export function renderCardBackContent(model) {
  const back = model.back || {};
  return `<div class="card-back-prose">
    ${back.label ? `<p class="card-back-label">${esc(back.label)}</p>` : ''}
    <p class="card-back-summary">${esc(back.summary || model.summary)}</p>
    ${(back.sections || []).map(section => `<section class="card-back-section"><h3>${esc(section.title)}</h3><p>${esc(section.text)}</p></section>`).join('')}
    ${back.responses?.length ? `<details class="card-back-responses"><summary>${esc(back.responseLabel)}</summary><dl>${back.responses.map(response => `<div><dt>${esc(response.name)}<span>${esc(response.label)}</span></dt><dd>${esc(response.note)}${response.applicability ? `<small>적용 조건: ${esc(response.applicability)}</small>` : ''}</dd></div>`).join('')}</dl></details>` : ''}
  </div>`;
}


function relatedButton(kind,id,name,subtitle='') {
  return '<button type="button" class="card-related-link" data-card-related="'+esc(kind+':'+id)+'"><span>'+esc(name)+'</span>'+(subtitle?'<small>'+esc(subtitle)+'</small>':'')+'<i aria-hidden="true">↗</i></button>';
}
function relatedDiseasesMarkup(items=[]) {
  if(!items.length)return '';
  const links='<div class="card-related-list">'+items.map(item=>relatedButton('disease',item.id,item.name,item.subtitle)).join('')+'</div>';
  return items.length>8?'<details class="card-related-diseases"><summary>감염질환</summary>'+links+'</details>':'<section class="card-back-section card-related-diseases"><h3>감염질환</h3>'+links+'</section>';
}
const RANK_LABELS={preferred:'우선 선택',alternative:'대안',conditional:'조건부 선택'};
function diseaseConnections(model) {
  const causes='<section class="card-back-section"><h3>원인 병원체</h3><div class="card-related-list">'+model.etiologies.map(cause=>
    cause.cardId?relatedButton('pathogen',cause.cardId,cause.name,cause.context):
      '<div class="card-related-name"><b>'+esc(cause.name)+'</b>'+(cause.context?'<small>'+esc(cause.context)+'</small>':'')+'</div>'
  ).join('')+'</div></section>';
  const selected=model.selectedTreatment;
  const mode=(selected?.coverage==='component'?'전체 요법의 일부 · ':'')+(selected?.mode==='sequence'?'순서대로 사용':selected?.mode==='combination'?'함께 사용하는 병합 요법':'단일 약제');
  const treatment=selected?'<section class="card-back-section card-disease-treatment"><h3>치료 상황</h3>'+
    '<label class="card-treatment-select"><select data-disease-treatment aria-label="치료 상황 선택">'+model.treatments.map(item=>'<option value="'+esc(item.id)+'" '+(item.id===selected.id?'selected':'')+'>'+esc(item.context)+'</option>').join('')+'</select></label>'+
    '<p class="card-treatment-context">'+esc(selected.context)+'</p><p class="card-treatment-mode">'+esc(RANK_LABELS[selected.rank]+' · '+mode)+'</p>'+
    '<div class="card-related-list">'+selected.components.map(component=>component.drugId?
      relatedButton('drug',component.drugId,component.name,component.role==='adjunct'?'보조 약제':''):
      '<div class="card-related-name"><b>'+esc(component.name)+'</b>'+(component.role==='adjunct'?'<small>보조 약제</small>':'')+'</div>'
    ).join('')+'</div></section>':
    '<section class="card-back-section"><h3>'+esc(model.supportiveCare?'대증치료':'치료·관리')+'</h3><p>'+esc(model.back.sections.find(section=>section.id==='management')?.text || '')+'</p></section>';
  return causes+treatment+relatedDiseasesMarkup(model.back.relatedDiseases);
}


function renderBackTabs(model,tabs) {
  const active=tabs.some(([id])=>id===model.backTab)?model.backTab:'clinical';
  const prefix='card-back-'+model.kind+'-'+model.id;
  return '<div class="card-back-tabs" role="tablist" aria-label="카드 뒷면 내용">'+tabs.map(([id,label])=>'<button type="button" role="tab" data-card-back-tab="'+id+'" id="'+esc(prefix+'-'+id)+'-tab" aria-controls="'+esc(prefix+'-'+id)+'" aria-selected="'+(id===active)+'" tabindex="'+(id===active?'0':'-1')+'">'+label+'</button>').join('')+'</div><div class="card-back-content">'+tabs.map(([id,,markup])=>'<div class="card-back-pane card-back-prose" id="'+esc(prefix+'-'+id)+'" data-card-back-pane="'+id+'" role="tabpanel" aria-labelledby="'+esc(prefix+'-'+id)+'-tab" tabindex="0" '+(id!==active?'hidden':'')+'>'+markup+'</div>').join('')+'</div>';
}

function renderBackPanels(model) {
  if(model.guide){
    return '<div class="card-back-tabs card-guide-back-label">기호 읽는 법</div><div class="card-back-content"><div class="card-back-pane card-back-prose" tabindex="0" aria-label="예시 카드 설명">'+model.guide.notes.map((note,index)=>'<section class="card-back-section card-guide-description" data-card-guide-description="'+esc(note.id)+'" tabindex="-1"><h3><span>'+(index+1)+'</span>'+esc(note.title)+'</h3><p>'+esc(note.text)+'</p></section>').join('')+'</div></div>';
  }
  if(model.kind==='immune-element'){
    const back=model.back,properties=model.properties;
    const description=back.sections.map(section=>'<section class="card-back-section"><h3>'+esc(section.title)+'</h3><p>'+esc(section.text)+'</p></section>').join('');
    const sourceLink=reference=>'<a href="'+esc(reference.url)+'" target="_blank" rel="noopener noreferrer">'+esc(reference.title)+'</a>';
    const connections='<p class="card-back-label">연결 '+back.interactions.length+'개</p>'+back.interactions.map(relation=>
      '<section class="card-immune-relation">'+relatedButton('immune-element',relation.counterpart.id,relation.counterpart.name,relation.relationType.label)+
      '<p class="card-immune-direction">'+esc(relation.from.name)+(relation.relationType.symmetric?' ↔ ':' → ')+esc(relation.to.name)+'</p>'+
      '<p>'+esc(relation.context)+'</p>'+(relation.via?'<small>매개: '+esc(relation.via)+'</small>':'')+
      '<div class="card-immune-relation-sources">'+relation.references.map(reference=>'<a href="'+esc(reference.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(reference.title)+'">['+(back.references.findIndex(item=>item.id===reference.id)+1)+']</a>').join(' ')+'</div></section>'
    ).join('');
    const facts='<dl class="card-immune-facts"><div><dt>종류</dt><dd>'+esc(properties.entityType.label)+'</dd></div><div><dt>면역</dt><dd>'+esc(properties.arms.map(item=>item.label).join(' · '))+'</dd></div><div><dt>위치</dt><dd>'+esc(properties.locations.map(item=>item.label).join(' · '))+'</dd></div></dl>'+
      '<section class="card-back-section"><h3>왼쪽 · 역할</h3><ul class="card-property-list">'+model.leftProperties.map(property=>'<li>'+propertyRune(property,true)+'<div><b>'+esc(property.label)+'</b></div></li>').join('')+'</ul></section>'+
      '<section class="card-back-section"><h3>오른쪽 · 연관 요소</h3><p>대표 연결을 표시합니다. 전체 관계와 작용 조건은 연결 탭에서 확인합니다.</p></section>'+
      '<section class="card-back-section card-back-references"><h3>출처</h3><ol>'+back.references.map(reference=>'<li>'+sourceLink(reference)+'</li>').join('')+'</ol></section>';
    return renderBackTabs(model,[['clinical','설명',description],['responses','연결',connections],['icons','분류·근거',facts]]);
  }
  const back=model.back || {},sections=back.sections || [];
  const disease=model.kind==='disease';
  const coreIds=new Set(disease?['presentation','diagnostics','management','redFlags']:model.kind==='drug'?['spectrum','limitations']:['clinicalContext','diseases','pearl','diagnostics']);
  const core=sections.filter(section=>coreIds.has(section.id)).sort((a,b)=>[...coreIds].indexOf(a.id)-[...coreIds].indexOf(b.id)),other=sections.filter(section=>!coreIds.has(section.id));
  const sectionMarkup=items=>items.map(section=>'<section class="card-back-section"><h3>'+esc(section.title)+'</h3><p>'+esc(section.text)+'</p></section>').join('');
  const therapy=model.therapyContext;
  const clinical='<p class="card-back-summary">'+esc(model.summary)+'</p>'+
    (therapy?'<section class="card-back-section card-therapy-note"><h3>금색 표시의 기준</h3><p>'+esc(therapy.context)+'</p><p>'+esc(therapy.note)+'</p></section>':'')+
    sectionMarkup(core)+(other.length?'<details><summary>구조·기전·추가 특징</summary>'+sectionMarkup(other)+'</details>':'');
  const responses=disease?diseaseConnections(model):relatedDiseasesMarkup(back.relatedDiseases)+
    ((back.responses || []).length?'<p class="card-back-label">'+esc(back.responseLabel)+'</p><dl class="card-response-list">'+back.responses.map(response=>'<div><dt>'+esc(response.name)+'<span>'+esc(response.label)+'</span></dt><dd>'+esc(response.note)+(response.applicability?'<small>'+esc(response.applicability)+'</small>':'')+'</dd></div>').join('')+'</dl>':'<p>수록된 약제 반응이 없습니다.</p>');
  const properties=[{label:model.leftLabel,items:model.leftProperties},{label:model.rightLabel,items:model.rightProperties}].map(rail=>'<section class="card-back-section"><h3>'+esc(rail.label)+'</h3><ul class="card-property-list">'+(rail.items || []).map(property=>'<li>'+propertyRune(property,true)+'<div><b>'+esc(property.label)+'</b><p>'+esc(property.note || (property.active?'해당':'—'))+'</p></div></li>').join('')+'</ul></section>').join('');
  const tabs=[['clinical','임상',clinical],['responses',disease?'연결':model.kind==='drug'?'대상':'약제',responses],['icons','기호',properties]];
  return renderBackTabs(model,tabs);
}

function guideMarkers(model) {
  if(!model.guide)return '';
  return '<div class="card-guide-markers" aria-label="카드 구성 설명">'+model.guide.notes.map((note,index)=>'<button type="button" class="card-guide-pin card-guide-pin--'+esc(note.id)+'" data-card-guide-note="'+esc(note.id)+'" aria-label="'+esc((index+1)+'. '+note.title)+'"><span aria-hidden="true">'+(index+1)+'</span></button>').join('')+'</div>';
}

/** Shared 2:3 geometry; both faces stay mounted for the physical flip. */
export function renderReferenceCard(model) {
  const kind=['pathogen','drug','disease','immune-element'].includes(model.kind)?model.kind:'pathogen',preview=Boolean(model.preview);
  const route=model.route || {icon:'artwork',label:'—',description:'경로 미지정'};
  const resistance=model.resistance,face=model.face==='back'&&!preview?'back':'front';
  const domainClass=['bacteria','fungi','viruses','parasites','drugs','diseases','immunity'].includes(model.domain)?' reference-card-domain--'+model.domain:'';
  const nameClass=model.name.length>38?' has-long-name':'';
  const caption=model.summary || (model.features || []).join(' · ');
  const units=[...caption].reduce((total,char)=>total+(/[가-힣一-龯]/.test(char)?1:.55),0);
  const classes='reference-card--'+kind+domainClass+nameClass;
  return '<div class="reference-card-slot '+(face==='back'?'is-flipped':'')+'" data-card-state="'+face+'" '+(preview?'data-card-preview':'')+'><div class="reference-card-tilt"><div class="reference-card-rotor"><article class="reference-card reference-card--front '+classes+(units>100?' has-long-summary':'')+(resistance?' has-resistance':'')+'" aria-label="'+esc(model.name+(resistance?' · '+resistance.code:''))+'" aria-hidden="'+(face==='back')+'" '+(face==='back'?'inert':'')+'>'+
    '<header class="card-nameplate"><h2>'+esc(model.name)+'</h2><p>'+esc(model.subtitle || '')+'</p></header>'+
    '<'+(preview?'span':'button type="button" data-card-property')+' class="card-route" '+(preview?'':tooltipAttributes({title:route.label,body:route.description || ''}))+'>'+cardIcon(route.icon)+'<span>'+esc(route.label)+'</span></'+(preview?'span':'button')+'>'+
    propertyRail(model.leftProperties,model.leftLabel,'left',model.leftHeading,preview)+
    '<div class="card-artwork'+(model.artwork?.transparent?' card-artwork--transparent':'')+'">'+artwork(model)+'</div>'+
    propertyRail(model.rightProperties,model.rightLabel,'right',model.rightHeading,preview)+
    '<div class="card-lineage"><span class="card-lineage-mark" aria-hidden="true">◆</span><span>'+esc(model.lineage)+'</span><span class="card-lineage-mark" aria-hidden="true">◆</span></div>'+
    '<div class="card-text"><p class="card-summary">'+esc(caption)+'</p><footer><span'+(model.supportiveCare?' class="card-care-label"':'')+'>'+esc(model.supportiveCare?'대증치료':model.id)+'</span>'+(preview?'<span>확대 ↗</span>':'<button type="button" class="card-turn" data-card-face="back" aria-label="'+esc(model.name)+' 뒷장 보기">뒷장 <span aria-hidden="true">↻</span></button>')+'</footer></div>'+
    (resistance?'<div class="card-ribbon-clip"><div class="card-resistance-ribbon"><strong>'+esc(resistance.code)+'</strong><span>'+esc(resistance.label)+'</span></div></div>':'')+
    guideMarkers(model)+'</article>'+(preview?'':'<article class="reference-card reference-card--back '+classes+'" aria-label="'+esc(model.name)+' 뒷장" aria-hidden="'+(face==='front')+'" '+(face==='front'?'inert':'')+'><header class="card-back-heading"><span>DETAILS / '+esc(model.id)+'</span><h2>'+esc(model.name)+'</h2><p>'+esc(model.subtitle || '')+'</p></header>'+renderBackPanels(model)+'<footer class="card-back-footer"><span>PATHOPEDIA</span><button type="button" class="card-turn" data-card-face="front" aria-label="'+esc(model.name)+' 앞장 보기">앞장 <span aria-hidden="true">↺</span></button></footer></article>')+'</div></div></div>';
}
export function renderCardLegend() {
  return '<div class="card-gallery-legend" aria-label="카드 기호 설명"><span><i class="preferred" aria-hidden="true"></i>우선요법</span><span><i class="lit" aria-hidden="true"></i>유효·요법 포함</span><span><i class="blocked" aria-hidden="true"></i>내성·비활성</span><span><i class="dim" aria-hidden="true"></i>비해당·기록 없음</span><span><i class="condition-dot" aria-hidden="true"></i>병용·노출 등 조건</span></div>';
}

export function renderCardThumbnail(model,{key,badge='',caption=''}={}) {
  return '<div class="card-mini"><div class="card-mini-visual" aria-hidden="true" inert>'+renderReferenceCard({...model,preview:true})+'</div><div class="card-mini-caption" aria-hidden="true"><strong>'+esc(model.name)+'</strong><span>'+esc(caption || model.subtitle || model.lineage)+'</span>'+(badge?'<small>'+esc(badge)+'</small>':'')+'</div><button type="button" class="card-mini-open" data-card-open="'+esc(key || model.kind+':'+(model.entityId || model.id))+'" aria-label="'+esc(model.name+' · '+(caption || model.subtitle || '')+(badge?' · '+badge:'')+' 확대 보기')+'"></button></div>';
}
export function setReferenceCardFace(slot,face,{focus=true}={}) {
  if(!slot || !['front','back'].includes(face) || slot.hasAttribute('data-card-preview'))return false;
  slot.dataset.cardState=face;slot.classList.toggle('is-flipped',face==='back');
  slot.dispatchEvent(new Event('card-face-change',{bubbles:true}));
  for(const side of ['front','back']){
    const article=slot.querySelector('.reference-card--'+side);
    if(article){article.setAttribute('aria-hidden',String(side!==face));article.inert=side!==face;}
  }
  if(focus)slot.querySelector('.reference-card--'+face+' [data-card-face]')?.focus({preventScroll:true});
  return true;
}
export function handleReferenceCardClick(button) {
  const slot=button.closest('.reference-card-slot');
  if(button.hasAttribute('data-card-property')){button.focus({preventScroll:true});return true;}
  if(button.dataset.cardBackTab && slot){
    const selected=button.dataset.cardBackTab;
    for(const tab of slot.querySelectorAll('[data-card-back-tab]')){
      const active=tab.dataset.cardBackTab===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    }
    for(const pane of slot.querySelectorAll('[data-card-back-pane]'))pane.hidden=pane.dataset.cardBackPane!==selected;
    return true;
  }
  return setReferenceCardFace(slot,button.dataset.cardFace);
}
export function handleCardTabKeydown(event) {
  if(!event.target.dataset?.cardBackTab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return false;
  const tabs=[...event.target.closest('.card-back-tabs').querySelectorAll('button')];
  const index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  event.preventDefault();handleReferenceCardClick(tabs[next]);tabs[next].focus();return true;
}
export function bindCardMotion(root) {
  let pressed=null,pending=null,frame=0;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const findSlot=target=>target.closest?.('.reference-card-slot') || target.closest?.('.card-mini')?.querySelector('.reference-card-slot');
  const reset=slot=>{if(slot){slot.style.setProperty('--card-tilt-x','0deg');slot.style.setProperty('--card-tilt-y','0deg');slot.classList.remove('is-handled');}};
  const tilt=(slot,x,y)=>{
    const rect=slot.getBoundingClientRect();
    slot.style.setProperty('--card-tilt-x',Math.max(-6,Math.min(6,(.5-(y-rect.top)/rect.height)*12))+'deg');
    slot.style.setProperty('--card-tilt-y',Math.max(-7,Math.min(7,((x-rect.left)/rect.width-.5)*14))+'deg');
  };
  root.addEventListener('pointermove',event=>{
    const slot=findSlot(event.target);
    if(!slot || reduced() || (event.pointerType!=='mouse'&&pressed?.slot!==slot))return;
    pending={slot,x:event.clientX,y:event.clientY};
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(pending){tilt(pending.slot,pending.x,pending.y);pending=null;}});
  });
  root.addEventListener('pointerout',event=>{
    const slot=findSlot(event.target);
    if(slot && slot!==findSlot(event.relatedTarget || {})){if(pending?.slot===slot)pending=null;reset(slot);}
  });
  root.addEventListener('pointerdown',event=>{
    const slot=findSlot(event.target);
    if(!slot || slot.hasAttribute('data-card-preview') || event.button!==0 || event.target.closest('button,a,input,select,summary,.card-rune,.card-route,.card-back-content'))return;
    pressed={slot,id:event.pointerId,x:event.clientX,y:event.clientY};
    if(!reduced())slot.classList.add('is-handled');
    slot.setPointerCapture?.(event.pointerId);
  });
  const release=event=>{
    if(!pressed || event.pointerId!==pressed.id)return;
    const {slot,x,y}=pressed;pressed=null;pending=null;
    if(slot.hasPointerCapture?.(event.pointerId))slot.releasePointerCapture(event.pointerId);
    if(event.type==='pointerup' && Math.abs(event.clientX-x)>45 && Math.abs(event.clientX-x)>Math.abs(event.clientY-y)*1.5)setReferenceCardFace(slot,slot.dataset.cardState==='front'?'back':'front');
    reset(slot);
  };
  root.addEventListener('pointerup',release);root.addEventListener('pointercancel',release);
}


// A single tooltip lives outside the tilted card so its text stays still.
// Pointer and keyboard focus share it; touch opens it and outside taps dismiss it.
export function bindCardTooltips(root) {
  let hovered=null,focused=null,shown=null,tooltip=null,pointerType='mouse';
  const target=element=>element?.closest?.('[data-tooltip-title]');
  function hide() {
    shown?.removeAttribute('aria-describedby');shown=null;
    if(tooltip)tooltip.hidden=true;
  }
  function clear() {hovered=null;focused=null;hide();}
  function update() {
    const button=hovered?.isConnected?hovered:focused?.isConnected?focused:null;
    if(!button || button.closest('[inert]')){hide();return;}
    if(!tooltip){
      tooltip=document.createElement('div');tooltip.id='card-property-tooltip';
      tooltip.className='reference-card-tooltip';tooltip.setAttribute('role','tooltip');
      tooltip.append(document.createElement('strong'),document.createElement('span'));
    }
    const host=button.closest('dialog') || root;
    if(tooltip.parentElement!==host || !tooltip.isConnected)host.append(tooltip);
    if(shown!==button)shown?.removeAttribute('aria-describedby');
    shown=button;button.setAttribute('aria-describedby',tooltip.id);
    tooltip.children[0].textContent=button.dataset.tooltipTitle;
    tooltip.children[1].textContent=button.dataset.tooltipBody || '';
    tooltip.children[1].hidden=!button.dataset.tooltipBody;
    tooltip.hidden=false;
    const rect=button.getBoundingClientRect(),width=tooltip.offsetWidth,height=tooltip.offsetHeight;
    const onRight=button.closest('.card-rail--right');
    const left=onRight?rect.left-width-12:rect.right+12;
    tooltip.style.left=Math.max(12,Math.min(window.innerWidth-width-12,left))+'px';
    tooltip.style.top=Math.max(12,Math.min(window.innerHeight-height-12,rect.top+(rect.height-height)/2))+'px';
  }
  root.addEventListener('pointerover',event=>{
    if(event.pointerType!=='mouse' && event.pointerType!=='pen')return;
    hovered=target(event.target);update();
  });
  root.addEventListener('pointerout',event=>{
    const previous=target(event.target),next=target(event.relatedTarget);
    if(previous && previous!==next){hovered=next;update();}
  });
  root.addEventListener('pointerdown',event=>{pointerType=event.pointerType || 'mouse';if(!target(event.target))clear();});
  root.addEventListener('focusin',event=>{const button=target(event.target);focused=button?.matches(':focus-visible')?button:null;update();});
  root.addEventListener('focusout',event=>{focused=target(event.relatedTarget);update();});
  root.addEventListener('click',event=>{
    const button=target(event.target);
    if(button){focused=pointerType!=='mouse' || event.detail===0?button:null;update();}else clear();
  });
  root.addEventListener('keydown',event=>{if(event.key==='Escape')clear();});
  root.addEventListener('card-face-change',clear);
  root.addEventListener('close',clear,true);
  window.addEventListener('resize',clear);
  window.addEventListener('scroll',clear,true);
}
