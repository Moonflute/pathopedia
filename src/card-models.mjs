import { createCardCatalog } from './card-catalog.mjs';

export const CARD_DOMAINS = Object.freeze({
  bacteria:'세균', fungi:'진균', viruses:'바이러스', parasites:'기생충', drugs:'약제'
});
const POSITIVE = new Set(['S','I','ACT','ACTIVE','REGIMEN']);
const NEGATIVE = new Set(['R','INACTIVE']);
const CONDITIONAL = new Set(['I','ACT','REGIMEN']);
const RESULTS = {
  S:'S · 감수성', I:'I · 노출 증가 필요', R:'R · 내성',
  ACT:'조건부 활성', ACTIVE:'문헌상 활성', INACTIVE:'활성 없음',
  REGIMEN:'해당 임상형의 요법에 포함', OUTSIDE_REGIMEN:'선택된 요법 목록 밖'
};
const ORGANS = [
  {icon:'skin',label:'피부·연조직',pattern:/피부|연조직|피하/},
  {icon:'blood',label:'혈류',pattern:/혈류|혈액|혈중|혈관|적혈구|혈증/},
  {icon:'heart',label:'심장·판막',pattern:/심장|판막|심내막|심근/},
  {icon:'bone',label:'뼈·관절',pattern:/뼈|골수|골막|관절/},
  {icon:'lungs',label:'폐·호흡기',pattern:/폐|호흡|기도|인두|비강/},
  {icon:'urinary',label:'비뇨·생식기',pattern:/요로|신장|비뇨|생식|질\s*점막|질·|태반/},
  {icon:'abdomen',label:'소화기·복강',pattern:/복강|복부|장관|위장|대장|소장|장상피|식도|구강/},
  {icon:'brain',label:'중추·신경계',pattern:/뇌|신경|수막|CNS/},
  {icon:'liver',label:'간·담도·비장',pattern:/간[·\s]|간내|간세포|간비장|담도|비장/},
  {icon:'eye',label:'눈·각막',pattern:/눈|안구|각막|망막/}
];
const TRANSMISSION = [
  {icon:'lungs',label:'호흡',pattern:/비말|공기|흡입|호흡기 전파|aerosol|droplet/i},
  {icon:'abdomen',label:'섭취',pattern:/분변|대변|경구|섭취|식품|음식|음용|fecal|ingestion/i},
  {icon:'vector',label:'매개',pattern:/모기|진드기|벼룩|이\s*[;·]|매개|모래파리|체체|vector/i},
  {icon:'blood',label:'혈액',pattern:/혈액|혈액매개|수혈|주사|blood/i},
  {icon:'urinary',label:'성접촉',pattern:/성접촉|성 접촉|성매개|sexual/i},
  {icon:'vertical',label:'수직',pattern:/수직|분만|주산기|태반|vertical/i},
  {icon:'contact',label:'접촉',pattern:/접촉|contact/i}
];
const PREFERRED_DRUGS = {
  'bacterial-ast':['oxacillin','cefazolin','ampicillin','vancomycin','linezolid','daptomycin','clindamycin','tmpsmx'],
  'bacterial-clinical':['ceftriaxone','penicillin','doxycycline','azithromycin','rifampicin','tmpsmx','metronidazole','amoxicillin'],
  'fungal-clinical':['fluconazole','voriconazole','amphotericinb','micafungin','flucytosine','itraconazole','tmpsmx','terbinafine'],
  'viral-clinical':['acyclovir','ganciclovir','oseltamivir','remdesivir','nirmatrelvir-ritonavir','tenofovir','entecavir','ribavirin'],
  'parasitic-clinical':['albendazole','ivermectin','praziquantel','metronidazole','tmpsmx','artemetherlumefantrine','primaquine','amphotericinb']
};
const NEGATIVE_AST = ['ceftriaxone','cefepime','meropenem','piptazo','aztreonam','ciprofloxacin','gentamicin','tmpsmx'];
const GROUPS = [
  {id:'staph',icon:'cocci',label:'포도알균',matches:r=>/^Staphylococcus /i.test(r.organism)},
  {id:'strep',icon:'chain',label:'사슬알균',matches:r=>/^Streptococcus /i.test(r.organism)},
  {id:'entero',icon:'enterococcus',label:'장알균',matches:r=>/^Enterococcus /i.test(r.organism)},
  {id:'enterics',icon:'rods',label:'장내세균목',matches:r=>r.domain==='bacteria' && /Enterobacterales|Enterobacteriaceae/i.test(r.classification)},
  {id:'nonfermenters',icon:'nonfermenter',label:'Pseudomonas·Acinetobacter·Stenotrophomonas',matches:r=>/^(Pseudomonas|Acinetobacter|Stenotrophomonas) /i.test(r.organism)},
  {id:'other',icon:'bacteria',label:'그 밖의 세균'},
  {id:'fungi',icon:'fungus',label:'진균',matches:r=>r.domain==='fungi'},
  {id:'viruses',icon:'virus',label:'바이러스',matches:r=>r.domain==='viruses'},
  {id:'parasites',icon:'parasite',label:'기생충',matches:r=>r.domain==='parasites'}
];

export function drugGlyph(drug) {
  const family = drug.family.toLowerCase();
  if (/cephalosporin/.test(family)) return 'cephalosporin';
  if (/penicillin|monobactam/.test(family)) return 'penicillin';
  if (/carbapenem/.test(family)) return 'carbapenem';
  if (/glycopeptide/.test(family)) return 'glycopeptide';
  if (/oxazolidinone/.test(family)) return 'linezolid';
  if (/lipopeptide/.test(family)) return 'daptomycin';
  if (/lincosamide/.test(family)) return 'clindamycin';
  if (/quinolone/.test(family)) return 'quinolone';
  if (/macrolide|rifamycin/.test(family)) return 'macrolide';
  if (/aminoglycoside/.test(family)) return 'aminoglycoside';
  if (/azole|echinocandin|polyene|allylamine/.test(family)) return 'antifungal';
  if (/antifolate|sulfonamide/.test(family)) return 'antifolate';
  if (/nucleoside|nucleotide|virus|viral|neuraminidase|endonuclease|integrase|terminase/.test(family)) return 'antiviral';
  if (/benzimidazole|antimalarial|artemisinin|quinoline|pyrethroid|lactone/.test(family)) return 'antiparasitic';
  return 'vial';
}

function pathogenArt(record) {
  if (record.domain==='fungi') return 'fungus';
  if (record.domain==='viruses') return 'virus';
  if (record.domain==='parasites') return 'parasite';
  const morphology = record.hints.morphology.text;
  if (/Enterococcus/i.test(record.organism)) return 'enterococcus';
  if (/cocci|구균|알균/i.test(morphology)) return /chain|사슬/i.test(morphology) ? 'chain' : 'cocci';
  if (/spiral|spirochete|나선/i.test(morphology)) return 'spiral';
  return 'rods';
}

function pathogenLineage(record) {
  const morphology = record.hints.morphology.text;
  const genus = record.organism.split(' ')[0];
  if (record.domain==='bacteria') {
    const gram = /Gram[ -]positive|그람양성|그람 양성/i.test(morphology) ? 'G+' :
      /Gram[ -]negative|그람음성|그람 음성/i.test(morphology) ? 'G−' :
      /acid[ -]fast|항산/i.test(morphology) ? '항산균' : '세균';
    return gram + ' · ' + genus;
  }
  if (record.domain==='fungi') return (/효모|yeast/i.test(morphology) ? '효모' : /균사|mold|hypha/i.test(morphology) ? '사상균' : '진균') + ' · ' + genus;
  if (record.domain==='viruses') {
    const genome = morphology.match(/(?:[ds]{2})?RNA|(?:[ds]{2})?DNA/i)?.[0];
    return (genome || '바이러스') + ' · ' + genus;
  }
  return '기생충 · ' + genus;
}

function pathogenRoute(record) {
  const text = record.hints.reservoir.text;
  const routes = TRANSMISSION.filter(route=>route.pattern.test(text));
  if (routes.length===1) return {...routes[0],description:routes[0].label + ' · ' + text};
  if (routes.length>1) return {icon:'routes',label:'복수',description:routes.map(r=>r.label).join(' / ') + ' · ' + text};
  if (/상재|정상균총|집락|내인성|세균총/.test(text)) return {icon:'contact',label:'집락',description:'저장소·집락 정보 · ' + text};
  return {icon:'environment',label:'저장소',description:text};
}

// Only routes explicitly recorded in the existing monograph are displayed.
// The previously authored Oxacillin prototype retains its route metadata.
function drugRoute(drug) {
  if (drug.id==='oxacillin') return {icon:'syringe',label:'IV/IM',description:'정맥·근육 주사 (IV / IM)'};
  const text = [drug.spectrum,drug.limitations].join(' ');
  const labels = [];
  if (/\bIV\b|정맥/i.test(text)) labels.push('IV');
  if (/경구|\boral\b/i.test(text)) labels.push('PO');
  if (/흡입/.test(text)) labels.push('흡입');
  if (/도포|topical/i.test(text+' '+drug.family)) labels.push('도포');
  return labels.length ? {icon:labels.includes('IV')?'syringe':'capsule',label:labels.length>1?'복수':labels[0],description:'기존 약제 기록에 명시된 경로: '+labels.join(' / ')+' · '+drug.limitations} :
    {icon:'routes',label:'—',description:'투여 경로가 별도 지정되지 않은 약제 기록입니다. 뒷장의 제형·적용 조건과 근거를 확인하세요.'};
}

function drugLineage(drug) {
  return drug.family
    .replace(/(\d)(?:st|nd|rd|th)-generation cephalosporin/i,'$1세대 Cepha')
    .replace(/Coronavirus protease inhibitor plus pharmacokinetic enhancer/i,'Protease inhibitor · booster')
    .replace(/HCV NS5B nucleotide inhibitor plus NS5A inhibitor/i,'NS5B + NS5A inhibitor')
    .replace(/Nucleotide reverse-transcriptase inhibitor/i,'Nucleotide RT inhibitor')
    .replace(/Nucleoside reverse-transcriptase inhibitor/i,'Nucleoside RT inhibitor')
    .replace(/Antimycobacterial prodrug|Nicotinamide-analog antimycobacterial prodrug/i,'Antimycobacterial')
    .replace(/Arabinose-analog antimycobacterial/i,'Antimycobacterial');
}

export function createCardModels(data, catalog) {
  const content = createCardCatalog(catalog);
  const drugs = new Map(data.drugs.map(drug=>[drug.id,drug]));
  const records = new Map(data.records.map(record=>[record.id,record]));
  const models = new Map();
  const groups = new Map(GROUPS.map(group=>[group.id,[]]));
  for (const record of data.records) {
    const group = GROUPS.find(group=>group.matches?.(record));
    groups.get(group?.id || 'other').push(record);
  }

  function pathogen(id) {
    const key='pathogen:'+id;
    if (models.has(key)) return models.get(key);
    const record=records.get(id);
    if (!record) return null;
    const preferred=record.panelId==='bacterial-ast' && /Gram[ -]negative/i.test(record.hints.morphology.text) ? NEGATIVE_AST : PREFERRED_DRUGS[record.panelId] || [];
    const available=Object.keys(catalog.responses[id] || {});
    const active=available.filter(drugId=>POSITIVE.has(content.response(id,drugId)?.category));
    // Keep small, reusable glyph slots, including dim examples. The reverse
    // face contains the complete response panel and all applicability notes.
    const chosen=[...new Set([...active.filter(drugId=>preferred.includes(drugId)),...active,...preferred,...available])].slice(0,10);
    const model={
      ...content.pathogen(id),domain:record.domain,
      subtitle:record.koreanName,
      lineage:pathogenLineage(record),route:pathogenRoute(record),
      artwork:{placeholder:pathogenArt(record),label:CARD_DOMAINS[record.domain]},
      leftLabel:'공격 가능 · 주요 친화 장기',
      leftProperties:ORGANS.map(({icon,label,pattern})=>({icon,label,active:pattern.test(record.hints.tropism.text),note:record.hints.tropism.text})),
      rightLabel:record.observationType==='regimen'?'공격받음 · 해당 임상형의 요법 구성 약제':'공격받음 · 이 교육용 분리주에 효과 있는 약제',
      rightProperties:chosen.map(drugId=>{
        const response=content.response(id,drugId);
        return {icon:drugGlyph(drugs.get(drugId)),label:drugs.get(drugId).name,active:POSITIVE.has(response?.category),conditional:CONDITIONAL.has(response?.category),note:(RESULTS[response?.category] || '이 기록에 결과 없음') + (response?.applicability?' · '+response.applicability:'')};
      })
    };
    models.set(key,model);
    return model;
  }

  function drug(id) {
    const key='drug:'+id;
    if (models.has(key)) return models.get(key);
    const item=drugs.get(id);
    if (!item) return null;
    const properties=positive=>GROUPS.map(group=>{
      const entries=groups.get(group.id).map(record=>({record,response:content.response(record.id,id)})).filter(entry=>entry.response);
      const matching=entries.filter(({response})=>(positive?POSITIVE:NEGATIVE).has(response.category));
      const examples=matching.slice(0,2).map(({record,response})=>record.organism+' · '+record.phenotype+' · '+RESULTS[response.category]).join(' / ');
      const hasOther=entries.some(({response})=>(positive?NEGATIVE:POSITIVE).has(response.category));
      return {
        icon:group.icon,label:group.label,active:matching.length>0,
        conditional:positive && matching.length>0 && (matching.some(({response})=>CONDITIONAL.has(response.category)) || hasOther),
        note:matching.length ? '해당 DB 기록 '+matching.length+'개'+(hasOther?' · 표현형·임상형별로 판정이 다름':'')+' · '+examples :
          entries.length ? '이 DB에 해당 판정 없음 · 요법 목록 밖은 무효로 세지 않음' : '이 DB에 약제 반응 기록 없음'
      };
    });
    const responses=data.records.flatMap(record=>{
      const response=content.response(record.id,id);
      return response ? [{...response,name:record.organism+' · '+record.phenotype,label:RESULTS[response.category],applicability:[response.applicability,record.clinicalContext].filter(Boolean).join(' · ')}] : [];
    });
    const base=content.drug(id);
    const model={
      ...base,domain:'drugs',lineage:drugLineage(item),route:drugRoute(item),
      subtitle:'약제 · '+item.family,
      artwork:{placeholder:drugGlyph(item),label:'약제'},
      leftLabel:'유효 · 활성 또는 임상형 요법에 포함된 DB 기록',
      leftProperties:properties(true),rightLabel:'무효 · R 또는 활성 없음으로 명시된 DB 기록',
      rightProperties:properties(false),
      back:{...base.back,responses,responseLabel:'병원체·표현형별 약제 반응'}
    };
    models.set(key,model);
    return model;
  }

  return {pathogen,drug};
}
