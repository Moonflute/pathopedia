import { cardArtwork } from './card-art.mjs';
import { createCardCatalog } from './card-catalog.mjs';

export const CARD_DOMAINS = Object.freeze({
  bacteria:'세균', viruses:'바이러스', fungi:'진균', parasites:'기생충', drugs:'약제', diseases:'감염질환', immunity:'면역계'
});
export const IMMUNE_CATEGORY_ICONS = Object.freeze({
  'barrier-organ':'skin', 'innate-cell':'blood', 'adaptive-cell':'lymphocyte',
  'recognition-signaling':'receptor', 'complement-effector':'antiviral',
  antibody:'antibody', 'cytokine-chemokine':'signal'
});
const POSITIVE = new Set(['S','I','ACT','ACTIVE','REGIMEN']);
const NEGATIVE = new Set(['R','INACTIVE']);
const CONDITIONAL = new Set(['I','ACT']);
const RESULTS = {
  S:'S · 감수성', I:'I · 노출 증가 필요', R:'R · 내성',
  ACT:'조건부 활성', ACTIVE:'문헌상 활성', INACTIVE:'활성 없음',
  REGIMEN:'해당 임상형의 요법에 포함', OUTSIDE_REGIMEN:'선택된 요법 목록 밖'
};
const ORGANS = [
  {icon:'skin',label:'피부·연조직'}, {icon:'blood',label:'혈류'},
  {icon:'heart',label:'심장·판막'}, {icon:'bone',label:'뼈·관절'},
  {icon:'lungs',label:'폐·호흡기'}, {icon:'urinary',label:'비뇨·생식기'},
  {icon:'abdomen',label:'소화기·복강'}, {icon:'brain',label:'중추·신경계'},
  {icon:'liver',label:'간·담도·비장'}, {icon:'eye',label:'눈·각막'}
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
const RAIL_DRUGS = {
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


const ORGAN_LABELS={skin:'피부',blood:'혈류',heart:'판막',bone:'뼈',lungs:'폐',urinary:'요로',abdomen:'장',brain:'뇌',liver:'간',eye:'눈'};
const GROUP_LABELS={staph:'포도',strep:'사슬',entero:'장알',enterics:'장내',nonfermenters:'비발',other:'기타',fungi:'진균',viruses:'바이',parasites:'기생'};
const DRUG_CODES={oxacillin:'OXA',cefazolin:'CZO',vancomycin:'VAN',linezolid:'LZD',daptomycin:'DAP',ceftriaxone:'CTX',cefepime:'FEP',ceftazidime:'CAZ',meropenem:'MEM',imipenem:'IPM',piptazo:'TZP',ceftazavi:'CZA',ampicillin:'AMP',amoxicillin:'AMX',amoxclav:'AMC',penicillin:'PEN',teicoplanin:'TEI',ceftaroline:'CPT',aztreonam:'ATM',tmpsmx:'SXT',ciprofloxacin:'CIP',levofloxacin:'LEV',moxifloxacin:'MOX',gentamicin:'GEN',amikacin:'AMK',clindamycin:'CLI',doxycycline:'DOX',azithromycin:'AZM',clarithromycin:'CLR',erythromycin:'ERY',rifampicin:'RIF',isoniazid:'INH',ethambutol:'EMB',pyrazinamide:'PZA',metronidazole:'MTZ',fidaxomicin:'FDX',fluconazole:'FLC',voriconazole:'VRC',amphotericinb:'AMB',micafungin:'MCF',flucytosine:'5FC',itraconazole:'ITR',terbinafine:'TER',acyclovir:'ACY',ganciclovir:'GCV',oseltamivir:'OSE',remdesivir:'REM','nirmatrelvir-ritonavir':'N/R',tenofovir:'TDF',entecavir:'ETV',ribavirin:'RBV',albendazole:'ALB',ivermectin:'IVM',praziquantel:'PZQ',primaquine:'PQ',pyrimethamine:'PYR',sulfadiazine:'SDZ',paromomycin:'PAR',artemetherlumefantrine:'A/L',atovaquone:'ATQ',permethrin:'PER',triclabendazole:'TCB'};
const drugCode=id=>DRUG_CODES[id] || id.slice(0,3).toUpperCase();
const preferenceNote=context=>'우선요법: '+context.context+' · '+context.note;
const HOVER_RESULTS={S:'감수성',I:'노출 증가 필요',R:'내성',ACT:'조건부 활성',ACTIVE:'활성',INACTIVE:'활성 없음',REGIMEN:'요법 포함',OUTSIDE_REGIMEN:'요법 밖'};

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
    {icon:'routes',label:'—',description:'투여 경로 미지정'};
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

  function pathogen(id,contextId=null) {
    const therapyContexts=content.therapies(id);
    const therapyContext=therapyContexts.find(context=>context.id===contextId) || therapyContexts[0] || null;
    const key='pathogen:'+id+':'+(therapyContext?.id || 'all');
    if (models.has(key)) return models.get(key);
    const record=records.get(id);
    if (!record) return null;
    const preferred=record.panelId==='bacterial-ast' && /Gram[ -]negative/i.test(record.hints.morphology.text) ? NEGATIVE_AST : RAIL_DRUGS[record.panelId] || [];
    const available=Object.keys(catalog.responses[id] || {});
    const active=available.filter(drugId=>POSITIVE.has(content.response(id,drugId)?.category));
    // Keep small, reusable glyph slots, including dim examples. The reverse
    // face contains the complete response panel and all applicability notes.
    const chosen=[...new Set([...(therapyContext?.drugIds || []),...active.filter(drugId=>preferred.includes(drugId)),...active,...preferred,...available])].slice(0,10);
    const model={
      ...content.pathogen(id),domain:record.domain,entityId:id,therapyContexts,therapyContext,
      subtitle:record.koreanName,
      lineage:pathogenLineage(record),route:pathogenRoute(record),
      artwork:cardArtwork('pathogen',catalog.variants[id].pathogenId) || {placeholder:pathogenArt(record),label:CARD_DOMAINS[record.domain]},
      leftHeading:'장기',rightHeading:'약제',
      leftLabel:'감염 부위별 질환',
      leftProperties:ORGANS.map(({icon,label})=>{
        const diseases=content.pathogen(id).organDiseases[icon] || [];
        return {icon,label,shortLabel:ORGAN_LABELS[icon],active:diseases.length>0,note:diseases.join(' · ') || '—',tooltip:{title:label,body:diseases.join('\n') || '—'}};
      }),
      rightLabel:'약제',
      rightProperties:chosen.map(drugId=>{
        const response=content.response(id,drugId);
        const item=drugs.get(drugId),excluded=therapyContext?.excludedDrugIds?.includes(drugId);
        const preferred=!excluded && therapyContext?.drugIds.includes(drugId) && POSITIVE.has(response?.category);
        return {
          icon:drugRoute(item).icon==='syringe'?'syringe':'capsule',shortLabel:drugCode(drugId),label:item.name,
          active:!excluded && POSITIVE.has(response?.category),preferred:Boolean(preferred),
          conditional:CONDITIONAL.has(response?.category) || Boolean(response?.applicability) || Boolean(preferred && therapyContext.combination),
          tooltip:{title:item.name,body:[excluded?'사용 제외':preferred?'우선 약제':HOVER_RESULTS[response?.category] || '—',excluded || preferred?therapyContext.context:response?.applicability].filter(Boolean).join('\n')},
          note:excluded?'선택한 임상 상황에서 사용하지 않는 약제 · '+therapyContext.context+' · '+therapyContext.note:
            (preferred?preferenceNote(therapyContext)+' · ':'')+(RESULTS[response?.category] || '이 기록에 결과 없음')+(response?.applicability?' · '+response.applicability:'')
        };
      })
    };
    models.set(key,model);
    return model;
  }

  function drug(id,contextId=null) {
    const therapyContexts=content.drugTherapies(id);
    const therapyContext=therapyContexts.find(context=>context.id===contextId) || null;
    const preferenceContexts=therapyContext?[therapyContext]:therapyContexts;
    const key='drug:'+id+':'+(therapyContext?.id || 'all');
    if (models.has(key)) return models.get(key);
    const item=drugs.get(id);
    if (!item) return null;
    const properties=positive=>GROUPS.map(group=>{
      const entries=groups.get(group.id).map(record=>({record,response:content.response(record.id,id)})).filter(entry=>entry.response);
      const matching=entries.filter(({response})=>(positive?POSITIVE:NEGATIVE).has(response.category));
      const examples=matching.slice(0,2).map(({record})=>record.organism+' · '+record.phenotype).join('\n');
      const hasOther=entries.some(({response})=>(positive?NEGATIVE:POSITIVE).has(response.category));
      const preferredContexts=positive?preferenceContexts.filter(context=>context.recordIds.some(recordId=>matching.some(entry=>entry.record.id===recordId))):[];
      return {
        icon:group.icon,shortLabel:GROUP_LABELS[group.id],label:group.label,active:matching.length>0,negative:!positive,preferred:preferredContexts.length>0,
        conditional:positive && matching.length>0 && (matching.some(({response})=>CONDITIONAL.has(response.category) || response.applicability) || hasOther || preferredContexts.some(context=>context.combination)),
        tooltip:{title:group.label,body:matching.length?[examples,hasOther?'표현형에 따라 다름':''].filter(Boolean).join('\n'):'—'},
        note:matching.length ? [...preferredContexts.map(preferenceNote),hasOther?'표현형·임상형별로 판정이 다름':'',examples].filter(Boolean).join(' · ') : '—'
      };
    });
    const responses=data.records.flatMap(record=>{
      const response=content.response(record.id,id);
      return response ? [{...response,name:record.organism+' · '+record.phenotype,label:RESULTS[response.category],applicability:[response.applicability,record.clinicalContext].filter(Boolean).join(' · ')}] : [];
    });
    const base=content.drug(id);
    const model={
      ...base,domain:'drugs',entityId:id,therapyContexts,therapyContext,lineage:drugLineage(item),route:drugRoute(item),
      subtitle:'약제 · '+item.family,
      artwork:cardArtwork('drug',id) || {placeholder:drugGlyph(item),label:'약제'},
      leftHeading:'유효',rightHeading:'무효',
      leftLabel:'유효 대상',
      leftProperties:properties(true),rightLabel:'무효 대상',
      rightProperties:properties(false),
      back:{...base.back,responses,responseLabel:'병원체·표현형별 약제 반응'}
    };
    models.set(key,model);
    return model;
  }


  function disease(id,contextId=null) {
    const base=content.disease(id);if(!base)return null;
    const treatments=base.treatments;
    const selectedTreatment=treatments.find(item=>item.id===contextId) || treatments[0] || null;
    const key='disease:'+id+':'+(selectedTreatment?.id || 'none');
    if(models.has(key))return models.get(key);
    const causeGroups=new Map(GROUPS.map(group=>[group.id,[]]));
    for(const cause of base.etiologies){
      const record=cause.pathogenId?records.get(cause.cardId):null;
      const group=record?GROUPS.find(group=>group.matches?.(record)):
        GROUPS.find(group=>group.id===cause.domain);
      causeGroups.get(group?.id || 'other').push(cause);
    }
    const components=new Map();
    // Prioritize the selected context. Other contexts remain dim on the front;
    // they are selectable, named regimens on the reverse face.
    for(const regimen of [...(selectedTreatment?[selectedTreatment]:[]),...treatments]){
      for(const component of regimen.components){
        const componentKey=component.drugId || component.name;
        if(!components.has(componentKey))components.set(componentKey,component);
      }
    }
    const category=catalog.diseaseCategories[base.category];
    const routeItems=base.transmission.map(route=>catalog.diseaseRoutes[route]);
    const route=routeItems.length===1
      ? {...routeItems[0],description:routeItems[0].description}
      : {icon:'routes',label:'복수',description:routeItems.map(item=>item.label+' · '+item.description).join('\n')};
    const careNote=base.back.sections.find(section=>section.id==='management')?.text || '';
    const model={
      ...base,entityId:id,domain:'diseases',lineage:category.label+' · '+catalog.diseaseEntityTypes[base.entityType].label,
      route,selectedTreatment,
      artwork:cardArtwork('disease',id) || {placeholder:category.icon,label:category.label},
      leftHeading:'원인',rightHeading:'치료',leftLabel:'원인 병원체',rightLabel:'치료·관리',
      leftProperties:GROUPS.map(group=>{
        const causes=causeGroups.get(group.id);
        const note=causes.map(cause=>cause.name+(cause.context?' · '+cause.context:'')).join('\n');
        return {icon:group.icon,label:group.label,shortLabel:GROUP_LABELS[group.id],active:causes.length>0,note:note || '—',tooltip:{title:group.label,body:note || '—'}};
      }),
      rightProperties:(base.supportiveCare?[{
        icon:'clinical',label:'대증치료',shortLabel:'대증',active:true,preferred:false,
        note:careNote,tooltip:{title:'대증치료',body:careNote}
      }]:[]).concat([...components.values()].map(component=>{
        const componentKey=component.drugId || component.name;
        const selected=selectedTreatment?.components.some(item=>(item.drugId || item.name)===componentKey);
        const item=component.drugId?drugs.get(component.drugId):null;
        const uses=treatments.filter(regimen=>regimen.components.some(part=>(part.drugId || part.name)===componentKey));
        const modeLabel=selectedTreatment?.mode==='sequence'?'순차 요법':selectedTreatment?.mode==='combination'?'병합 요법':'';
        const context=selected?selectedTreatment.context:uses.map(regimen=>regimen.context).join('\n');
        const role=component.role==='adjunct'?'보조 약제':selectedTreatment?.coverage==='component'?'병용 구성 약제':selectedTreatment?.rank==='conditional'?'조건부 선택':selectedTreatment?.rank==='alternative'?'대안':selectedTreatment?.coverage==='component'?'우선 구성 약제':'우선 약제';
        return {
          icon:item && drugRoute(item).icon==='syringe'?'syringe':'capsule',
          label:component.name,shortLabel:component.drugId?drugCode(component.drugId):component.name.slice(0,3).toUpperCase(),
          active:Boolean(selected),preferred:Boolean(selected && selectedTreatment.rank==='preferred' && component.role!=='adjunct'),
          conditional:Boolean(selected && (selectedTreatment.mode!=='single' || selectedTreatment.coverage==='component' || selectedTreatment.rank==='conditional')),
          note:context,tooltip:{title:component.name,body:[selected?role:'다른 치료 상황',context,selected?modeLabel:''].filter(Boolean).join('\n')}
        };
      })).slice(0,10)
    };
    models.set(key,model);return model;
  }

  function immuneElement(id) {
    const key='immune-element:'+id;
    if(models.has(key))return models.get(key);
    const base=content.immuneElement(id);if(!base)return null;
    const category=catalog.immuneCategories[base.category];
    const model={
      ...base,entityId:id,domain:'immunity',lineage:category.label,
      route:{icon:'immunity',label:'면역',description:category.label},
      artwork:cardArtwork('immune-element',id) || {placeholder:IMMUNE_CATEGORY_ICONS[base.category],label:category.label}
    };
    models.set(key,model);return model;
  }

  function get(kind,id,contextId=null) {
    return kind==='disease'?disease(id,contextId):kind==='drug'?drug(id,contextId):kind==='pathogen'?pathogen(id,contextId):kind==='immune-element'?immuneElement(id):null;
  }

  return {pathogen,drug,disease,immuneElement,get};
}
