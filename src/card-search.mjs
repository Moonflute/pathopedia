// Normalize both stored names and queries so Korean spacing, punctuation,
// and composed/decomposed Hangul use the same search index in every view.
export const normalizeCardSearch=value=>String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');

export function createCardSearch(data,catalog) {
  const index=new Map();
  const add=(kind,id,fields)=>index.set(kind+':'+id,fields.filter(Boolean).map(normalizeCardSearch));
  for(const record of data.records){
    const variant=catalog.variants[record.id],entity=catalog.pathogens[variant?.pathogenId];
    add('pathogen',record.id,[
      record.id,record.organism,record.koreanName,record.phenotype,record.phenotypeDescription,record.classification,
      ...(record.aliases || []),...(entity?.searchAliases || []),variant?.summary,variant?.resistance?.code
    ]);
  }
  for(const drug of data.drugs){
    const entity=catalog.drugs[drug.id];
    add('drug',drug.id,[drug.id,drug.name,drug.family,drug.mechanism,...(entity?.searchAliases || []),entity?.summary]);
  }

  for(const disease of Object.values(catalog.diseases || {})){
    add('disease',disease.id,[
      disease.id,disease.name,disease.englishName,...disease.searchAliases,disease.summary,
      catalog.diseaseCategories[disease.category].label,disease.supportiveCare?'대증치료 증상완화 지지요법':'',
      ...disease.etiologies.map(cause=>cause.name),
      ...disease.treatments.flatMap(regimen=>regimen.components.map(component=>component.name))
    ]);
  }

  for(const element of Object.values(catalog.immuneElements || {})){
    add('immune-element',element.id,[
      element.id,element.name,element.englishName,element.summary,
      catalog.immuneCategories[element.category].label,
      ...element.back.sections.map(section=>section.text)
    ]);
  }

  let lastQuery=null,words=[];
  return {
    matches(kind,id,query=''){
      if(query!==lastQuery){lastQuery=query;words=String(query).normalize('NFKC').split(/\s+/).map(normalizeCardSearch).filter(Boolean);}
      const fields=index.get(kind+':'+id);
      return Boolean(fields) && words.every(word=>fields.some(field=>field.includes(word)));
    }
  };
}
