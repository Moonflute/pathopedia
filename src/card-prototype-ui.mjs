import { renderReferenceCard } from './reference-card.mjs';
import { createCardCatalog } from './card-catalog.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WIDTHS = [300, 360, 420];
const VARIANTS = [
  { id:'SAU-001', label:'MSSA', taxon:'sau' },
  { id:'SAU-002', label:'MRSA', taxon:'sau' },
  { id:'EFA-006', label:'VRE', taxon:'efa' }
];
const DRUG_RUNES = [
  { id:'oxacillin', icon:'penicillin' },
  { id:'cefazolin', icon:'cephalosporin' },
  { id:'vancomycin', icon:'glycopeptide' },
  { id:'linezolid', icon:'linezolid' },
  { id:'daptomycin', icon:'daptomycin' },
  { id:'clindamycin', icon:'clindamycin' }
];
const ORGAN_RUNES = [
  { icon:'skin', label:'피부·연조직', pattern:/피부|연조직/ },
  { icon:'blood', label:'혈류', pattern:/혈류/ },
  { icon:'heart', label:'심장·판막', pattern:/심장|판막/ },
  { icon:'bone', label:'뼈', pattern:/뼈|골/ },
  { icon:'lungs', label:'폐·호흡기', pattern:/폐|호흡/ },
  { icon:'urinary', label:'요로', pattern:/요로|신장/ },
  { icon:'abdomen', label:'복강', pattern:/복강|복부/ }
];
const CATEGORY_LABELS = { S:'S · 감수성', I:'I · 증가된 노출에서 감수성', R:'R · 내성', ACTIVE:'문헌상 활성', INACTIVE:'활성 없음', ACT:'조건부 활성' };

// Presentation metadata is separate from clinical records and the shared frame.
function pathogenModel(record, variant, drugs, cardContent) {
  const isEnterococcus = variant.taxon === 'efa';
  const tropism = record.hints.tropism.text;
  return {
    kind:'pathogen', id:record.id, name:record.organism, subtitle:record.koreanName,
    lineage:'G+ · ' + (isEnterococcus ? 'Enterococcus' : 'Staphylococcus'),
    route:{ icon:'contact', label:'접촉', description:record.hints.reservoir.text },
    artwork:{ placeholder:isEnterococcus ? 'enterococcus' : 'cocci' },
    ...cardContent.pathogen(record.id),
    rightLabel:'공격받음 · 이 기록에 효과 있는 항균제',
    rightProperties:DRUG_RUNES.map(({id,icon}) => {
      const category = record.susceptibility[id]?.category;
      return {
        icon, label:drugs.find(drug => drug.id === id)?.name || id,
        active:['S','I','ACTIVE','ACT'].includes(category),
        conditional:['I','ACT'].includes(category),
        note:CATEGORY_LABELS[category] || '이 기록에 결과 없음'
      };
    }),
    leftLabel:'공격 가능 · 이 기록의 주요 친화 장기',
    leftProperties:ORGAN_RUNES.map(({icon,label,pattern}) => ({ icon, label, active:pattern.test(tropism), note:'주요 친화 장기 기록' }))
  };
}

function drugModel(drug, records, cardContent) {
  const groups = [
    { icon:'cocci', label:'MSSA', recordId:'SAU-001' },
    { icon:'resistantCocci', label:'MRSA', recordId:'SAU-002' },
    { icon:'enterococcus', label:'Enterococcus', recordId:'EFA-006' },
    // Oxacillin's monograph explicitly excludes useful Gram-negative activity.
    { icon:'rods', label:'그람음성균', category:'INACTIVE' }
  ].map(group => {
    const category = group.category || records.find(record => record.id === group.recordId)?.susceptibility[drug.id]?.category;
    return { ...group, category, note:CATEGORY_LABELS[category] || '이 기록에 결과 없음' };
  });
  return {
    kind:'drug', id:drug.id.toUpperCase(), name:drug.name, subtitle:'항포도알균 Penicillin',
    lineage:'β-lactam · ' + drug.family,
    route:{ icon:'syringe', label:'IV/IM', description:'정맥·근육 주사 (IV / IM)' },
    artwork:{ placeholder:'vial' },
    ...cardContent.drug(drug.id),
    rightLabel:'무효 · 효과 없는 계통',
    rightProperties:groups.map(group => ({ ...group, active:['R','INACTIVE'].includes(group.category) })),
    leftLabel:'유효 · 공격 가능한 병원체',
    leftProperties:groups.map(group => ({ ...group, active:['S','I','ACTIVE','ACT'].includes(group.category), conditional:['I','ACT'].includes(group.category) }))
  };
}

export function createCardPrototype(data, { render, catalog }) {
  const cardContent = createCardCatalog(catalog);
  let width = 360;
  const variants = VARIANTS.filter(variant => data.records.some(record => record.id === variant.id));
  let selectedId = variants[0]?.id;
  const drug = data.drugs.find(item => item.id === 'oxacillin');

  function renderPrototype() {
    const variant = variants.find(item => item.id === selectedId);
    const record = data.records.find(item => item.id === selectedId);
    if (!record || !drug) return '<p>대표 카드 데이터를 불러올 수 없습니다.</p><a href="#library">라이브러리로 돌아가기</a>';
    const pathogen = pathogenModel(record, variant, data.drugs, cardContent);
    const antimicrobial = drugModel(drug, data.records, cardContent);
    return `<header class="card-prototype-heading"><div><span class="eyebrow">LIBRARY / CARD PROTOTYPE</span><h1>카드 틀<span class="heading-dot">.</span></h1><p>앞면에는 핵심 컨셉을, 뒷장에는 자세한 설명과 근거를 담습니다.</p></div><a class="card-prototype-back" href="#library">← 라이브러리</a></header>
      <div class="card-prototype-toolbar">
        <div class="card-prototype-control" role="group" aria-label="카드 표시 크기"><span>표시 크기</span>${WIDTHS.map(value => `<button type="button" data-card-width="${value}" aria-pressed="${value === width}">${value} × ${value * 1.5}</button>`).join('')}</div>
        <div class="card-prototype-control" role="group" aria-label="병원체 표현형"><span>병원체</span>${variants.map(item => `<button type="button" data-card-variant="${item.id}" aria-pressed="${item.id === selectedId}">${item.label}</button>`).join('')}</div>
      </div>
      <div class="card-prototype-gallery" style="--card-width:${width}px">
        <figure class="card-prototype-item">${renderReferenceCard(pathogen)}<figcaption><span>01 / PATHOGEN</span><strong>${esc(record.organism)} · ${esc(variant.label)}</strong><small>왼쪽: 공격하는 장기 · 오른쪽: 공격받는 약제</small></figcaption></figure>
        <figure class="card-prototype-item">${renderReferenceCard(antimicrobial)}<figcaption><span>02 / ANTIMICROBIAL</span><strong>${esc(drug.name)}</strong><small>왼쪽: 유효 병원체 · 오른쪽: 무효 계통</small></figcaption></figure>
      </div>
      <div class="card-prototype-key" aria-label="기호 상태 범례"><span><i aria-hidden="true"></i>해당 속성 점등</span><span class="dim"><i aria-hidden="true"></i>비해당은 회색</span><span>기호를 누르거나 가리키면 의미 표시</span></div>
      <div class="card-prototype-spec"><span>기본 <b>360 × 540 px</b></span><span>비율 <b>2 : 3</b></span><span>사이드 기호 <b>14 px</b></span><span>경로 배지 <b>40 px</b></span><span>작은 화면 <b>비율 유지 축소</b></span></div>`;
  }

  function handleClick(button) {
    if (button.dataset.cardWidth) {
      const next = Number(button.dataset.cardWidth);
      if (WIDTHS.includes(next)) { width = next; render(`[data-card-width="${next}"]`); }
      return true;
    }
    if (button.dataset.cardVariant) {
      const next = button.dataset.cardVariant;
      if (variants.some(variant => variant.id === next)) { selectedId = next; render(`[data-card-variant="${next}"]`); }
      return true;
    }
    return false;
  }

  return { render:renderPrototype, handleClick };
}
