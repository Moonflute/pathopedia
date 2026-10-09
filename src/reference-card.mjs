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
  artwork: '<rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-6 4 4 3-3 5 5"/>'
});

export function cardIcon(name, className = '') {
  return `<svg class="card-glyph ${esc(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CARD_ICONS[name] || CARD_ICONS.artwork}</svg>`;
}

function propertyRune(property) {
  const active = Boolean(property.active);
  const state = property.conditional && active ? 'conditional' : active ? 'lit' : 'dim';
  const status = active ? (property.conditional ? '조건부 해당' : '해당') : '비해당';
  const description = `${property.label} · ${status}${property.note ? ' · ' + property.note : ''}`;
  return `<span class="card-rune is-${state}" tabindex="0" role="img" aria-label="${esc(description)}" data-tooltip="${esc(description)}">${cardIcon(property.icon)}</span>`;
}

function propertyRail(properties, label, side) {
  return `<aside class="card-rail card-rail--${side}" aria-label="${esc(label)}"><span class="card-rail-caption" aria-hidden="true">${side === 'left' ? '+' : '−'}</span><div class="card-runes">${(properties || []).map(propertyRune).join('')}</div></aside>`;
}

// The artwork can be exchanged without replacing any card text or glyphs.
function artwork(model) {
  if (model.artwork?.src) return `<img class="card-artwork-image" src="${esc(model.artwork.src)}" alt="${esc(model.artwork.alt || model.name)}" loading="lazy" decoding="async">`;
  return `<div class="card-artwork-placeholder" aria-label="${esc(model.name)} 그림 자리"><span class="card-artwork-ring" aria-hidden="true"></span>${cardIcon(model.artwork?.placeholder || (model.kind === 'drug' ? 'vial' : 'cocci'), 'card-artwork-mark')}<span class="card-artwork-label">${esc(model.artwork?.label || 'ARTWORK')}</span><span class="card-artwork-corner top-left" aria-hidden="true"></span><span class="card-artwork-corner bottom-right" aria-hidden="true"></span></div>`;
}

const safeURL = value => /^https?:\/\//i.test(String(value || '')) ? value : '';

export function renderCardBackContent(model) {
  const back = model.back || {};
  return `<div class="card-back-prose">
    ${back.label ? `<p class="card-back-label">${esc(back.label)}</p>` : ''}
    <p class="card-back-summary">${esc(back.summary || model.summary)}</p>
    ${(back.sections || []).map(section => `<section class="card-back-section"><h3>${esc(section.title)}</h3><p>${esc(section.text)}</p></section>`).join('')}
    ${back.responses?.length ? `<details class="card-back-responses"><summary>${esc(back.responseLabel)} · ${back.responses.length}</summary><dl>${back.responses.map(response => `<div><dt>${esc(response.name)}<span>${esc(response.label)}</span></dt><dd>${esc(response.note)}${response.applicability ? `<small>적용 조건: ${esc(response.applicability)}</small>` : ''}</dd></div>`).join('')}</dl></details>` : ''}
    ${back.references?.length ? `<details class="card-back-references"><summary>근거 자료 · ${back.references.length}</summary><ul>${back.references.map(source => `<li>${safeURL(source.url) ? `<a href="${esc(safeURL(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.title || source.name || source.id)} ↗</a>` : esc(source.title || source.name || source.id)}</li>`).join('')}</ul></details>` : ''}
  </div>`;
}

/**
 * Shared card model: kind, id, name, subtitle, lineage, route, artwork,
 * summary, back, left/rightLabel, left/rightProperties[], optional resistance.
 * The same 2:3 slot holds the front and its scrollable reverse face.
 */
export function renderReferenceCard(model) {
  const kind = model.kind === 'drug' ? 'drug' : 'pathogen';
  const route = model.route || { icon:'artwork', label:'—', description:'경로 미지정' };
  const resistance = model.resistance;
  const face = model.face === 'back' ? 'back' : 'front';
  const domainClass = ['bacteria','fungi','viruses','parasites','drugs'].includes(model.domain) ? ' reference-card-domain--' + model.domain : '';
  const nameClass = model.name.length > 38 ? ' has-long-name' : '';
  const caption = model.summary || (model.features || []).join(' · ');
  const summaryUnits = [...caption].reduce((total,char)=>total+(/[가-힣一-龯]/.test(char)?1:.55),0);
  const summaryClass = summaryUnits > 100 ? ' has-long-summary' : '';
  return `<div class="reference-card-slot"><article class="reference-card reference-card--front reference-card--${kind}${domainClass}${nameClass}${summaryClass} ${resistance ? 'has-resistance' : ''}" ${face === 'back' ? 'hidden' : ''} aria-label="${esc(model.name + (resistance ? ' · ' + resistance.code : ''))}">
    <header class="card-nameplate"><h2>${esc(model.name)}</h2><p>${esc(model.subtitle || '')}</p></header>
    <span class="card-route" role="img" tabindex="0" aria-label="${esc(route.description || route.label)}" data-tooltip="${esc(route.description || route.label)}">${cardIcon(route.icon)}<span>${esc(route.label)}</span></span>
    ${propertyRail(model.leftProperties, model.leftLabel, 'left')}
    <div class="card-artwork">${artwork(model)}</div>
    ${propertyRail(model.rightProperties, model.rightLabel, 'right')}
    <div class="card-lineage"><span class="card-lineage-mark" aria-hidden="true">◆</span><span>${esc(model.lineage)}</span><span class="card-lineage-mark" aria-hidden="true">◆</span></div>
    <div class="card-text"><p class="card-summary">${esc(caption)}</p><footer><span>${esc(model.id)}</span><button type="button" class="card-turn" data-card-face="back" aria-label="${esc(model.name)} 뒷장 보기">뒷장 <span aria-hidden="true">↻</span></button></footer></div>
    ${resistance ? `<div class="card-ribbon-clip"><div class="card-resistance-ribbon"><strong>${esc(resistance.code)}</strong><span>${esc(resistance.label)}</span></div></div>` : ''}
  </article><article class="reference-card reference-card--back reference-card--${kind}${domainClass}${nameClass}" ${face === 'front' ? 'hidden' : ''} aria-label="${esc(model.name)} 뒷장">
    <header class="card-back-heading"><span>DETAILS / ${esc(model.id)}</span><h2>${esc(model.name)}</h2><p>${esc(model.subtitle || '')}</p></header>
    <div class="card-back-content" tabindex="0" role="region" aria-label="${esc(model.name)} 상세 정보">${renderCardBackContent(model)}</div>
    <footer class="card-back-footer"><span>PATHOPEDIA</span><button type="button" class="card-turn" data-card-face="front" aria-label="${esc(model.name)} 앞장 보기">앞장 <span aria-hidden="true">↺</span></button></footer>
  </article></div>`;
}

export function handleReferenceCardClick(button) {
  const face = button.dataset.cardFace;
  if (!['front','back'].includes(face)) return false;
  const slot = button.closest('.reference-card-slot');
  if (!slot) return false;
  const front = slot.querySelector('.reference-card--front'), back = slot.querySelector('.reference-card--back');
  front.hidden = face !== 'front';
  back.hidden = face !== 'back';
  (face === 'front' ? front : back).querySelector('[data-card-face]')?.focus({preventScroll:true});
  return true;
}
