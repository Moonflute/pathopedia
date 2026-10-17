const CATEGORY_LABELS = {
  S:'S · 감수성', I:'I · 증가된 노출에서 감수성', R:'R · 내성',
  ACT:'조건부 활성', ACTIVE:'문헌상 활성', INACTIVE:'활성 없음',
  REGIMEN:'이 임상형의 요법에 포함', OUTSIDE_REGIMEN:'선택된 요법 목록 밖'
};
const unique = values => [...new Set(values.filter(Boolean))];

// Consumers share ID lookups; they never parse the name or copy card prose.
export function createCardCatalog(catalog) {
  const pathogenCards = new Map(), drugCards = new Map(), diseaseCards = new Map(), immuneElementCards = new Map();
  const relatedDiseases=ids=>(ids || []).map(id=>catalog.diseases?.[id]).filter(Boolean).map(entity=>({kind:'disease',id:entity.id,name:entity.name,subtitle:entity.englishName}));
  const references = ids => unique(ids).filter(id => catalog.sources[id]).map(id => ({ id, ...catalog.sources[id] }));
  const therapies = recordId => (catalog.variants[recordId]?.therapyIds || []).map(id=>catalog.therapyContexts?.[id]).filter(Boolean);
  const drugTherapies = drugId => Object.values(catalog.therapyContexts || {}).filter(context=>context.drugIds.includes(drugId));
  const response = (recordId,drugId) => catalog.responseProfiles[catalog.responses[recordId]?.[drugId]];
  const summary = (kind,id) => (kind==='immune-element'?catalog.immuneElements?.[id]:kind==='disease'?catalog.diseases?.[id]:kind==='drug'?catalog.drugs[id]:catalog.variants[id])?.summary;

  function pathogen(recordId) {
    if (pathogenCards.has(recordId)) return pathogenCards.get(recordId);
    const variant = catalog.variants[recordId];
    if (!variant) throw Error(`Unknown card record: ${recordId}`);
    const entity = catalog.pathogens[variant.pathogenId];
    const sections = new Map(entity.back.sections.map(section => [section.id,section]));
    for (const section of variant.back.sections) sections.set(section.id,section);
    const responses = Object.entries(catalog.responses[recordId] || {}).map(([drugId]) => {
      const result = response(recordId,drugId);
      return { drugId, name:catalog.drugs[drugId].name, ...result, label:CATEGORY_LABELS[result.category] || result.category };
    });
    const card = {
      kind:'pathogen', id:recordId, name:entity.name, subtitle:entity.koreanName,
      summary:variant.summary, resistance:variant.resistance,
      organDiseases:variant.organDiseases || entity.organDiseases || {},
      back:{
        label:variant.label, summary:variant.summary, sections:[...sections.values()], responses,
        relatedDiseases:relatedDiseases(entity.diseaseIds),
        responseLabel:variant.observationType === 'regimen' ? '이 임상형의 요법 구성' : '이 교육용 분리주의 약제 반응',
        references:references([...entity.sourceIds,...variant.sourceIds,...[...sections.values()].flatMap(section=>section.sourceIds || []),...responses.flatMap(result=>result.sourceIds || []),...therapies(recordId).flatMap(context=>context.sourceIds)]),
        reviewStatus:variant.reviewStatus
      }
    };
    pathogenCards.set(recordId,card);
    return card;
  }

  function drug(drugId) {
    if (drugCards.has(drugId)) return drugCards.get(drugId);
    const entity = catalog.drugs[drugId];
    if (!entity) throw Error(`Unknown drug card: ${drugId}`);
    const card = {
      kind:'drug', id:drugId.toUpperCase(), name:entity.name, subtitle:entity.family,
      summary:entity.summary,
      back:{ relatedDiseases:relatedDiseases(entity.diseaseIds), label:entity.family, summary:entity.summary, sections:entity.back.sections, references:references([...entity.sourceIds,...entity.back.sections.flatMap(section=>section.sourceIds || []),...drugTherapies(drugId).flatMap(context=>context.sourceIds)]), reviewStatus:entity.reviewStatus }
    };
    drugCards.set(drugId,card);
    return card;
  }


  function disease(id) {
    if(diseaseCards.has(id))return diseaseCards.get(id);
    const entity=catalog.diseases?.[id];
    if(!entity)return null;
    const card={
      kind:'disease',id:entity.id,name:entity.name,subtitle:entity.englishName,summary:entity.summary,
      category:entity.category,entityType:entity.entityType,anatomicSites:entity.anatomicSites,
      transmission:entity.transmission,etiologies:entity.etiologies,treatments:entity.treatments,supportiveCare:entity.supportiveCare===true,
      back:{
        label:catalog.diseaseCategories[entity.category].label,summary:entity.summary,sections:entity.back.sections,
        etiologies:entity.etiologies,treatments:entity.treatments,relatedDiseases:relatedDiseases(entity.relatedDiseaseIds),
        references:references(entity.sourceIds),reviewStatus:entity.reviewStatus
      }
    };
    diseaseCards.set(id,card);return card;
  }

  function immuneElement(id) {
    if(immuneElementCards.has(id))return immuneElementCards.get(id);
    const entity=catalog.immuneElements?.[id];
    if(!entity)return null;
    const card={
      kind:'immune-element',id:entity.id,name:entity.name,subtitle:entity.englishName,
      category:entity.category,sortOrder:entity.sortOrder,summary:entity.summary,
      back:{
        label:catalog.immuneCategories[entity.category].label,summary:entity.summary,
        sections:entity.back.sections,references:references([...entity.sourceIds,...entity.back.sections.flatMap(section=>section.sourceIds || [])]),
        reviewStatus:entity.reviewStatus
      }
    };
    immuneElementCards.set(id,card);return card;
  }

  return { pathogen, drug, disease, immuneElement, response, summary, therapies, drugTherapies };
}
