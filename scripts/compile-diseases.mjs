const SITES=new Set(['skin','blood','heart','bone','lungs','urinary','abdomen','brain','liver','eye']);
const DOMAINS=new Set(['bacteria','fungi','viruses','parasites']);
const CLINICAL={presentation:'임상 특징',diagnostics:'진단',management:'치료·관리',redFlags:'주의할 상황'};
const unique=items=>[...new Set(items)];
const text=value=>typeof value==='string' && value.trim().length>0;
const fail=(id,message)=>{throw Error('Disease '+id+': '+message);};
function ids(values,known,id,label,{allowEmpty=false}={}){
  if(!Array.isArray(values) || !allowEmpty&&!values.length || values.some(value=>!text(value) || !known.has(value)) || unique(values).length!==values.length)fail(id,'invalid '+label);
}

// Explicit clinical relationships live in authored content. Susceptibility
// observations never create a disease indication or a preferred therapy.
export function compileDiseases(authored,{pathogens,drugs,sources}){
  if(!authored)return {diseases:{},diseaseCategories:{},diseaseRoutes:{},diseaseEntityTypes:{},diseaseContent:{}};
  const {index,entities}=authored;
  if(index.schemaVersion!==1 || !Array.isArray(entities))fail('index','unsupported schema');
  const registry=(list,label)=>{
    const map={};
    for(const item of list || []){
      if(!text(item.id) || map[item.id] || !text(item.label))fail('index','invalid '+label);
      map[item.id]=item;
    }
    if(!Object.keys(map).length)fail('index','missing '+label);
    return map;
  };
  const diseaseCategories=registry(index.categories,'categories');
  const diseaseRoutes=registry(index.routes,'routes');
  const diseaseEntityTypes=registry(index.entityTypes,'entity types');
  const categories=new Set(Object.keys(diseaseCategories)),routes=new Set(Object.keys(diseaseRoutes));
  const entityTypes=new Set(Object.keys(diseaseEntityTypes)),sourceIds=new Set(Object.keys(sources));
  const diseases={},regimenIds=new Set();
  for(const entry of entities){
    const id=entry.id;
    if(!/^[a-z][a-z0-9-]*$/.test(id) || diseases[id])fail(id,'invalid or duplicate ID');
    if(entry.kind!=='disease' || !text(entry.name) || !text(entry.englishName))fail(id,'missing names');
    if(!categories.has(entry.category) || !entityTypes.has(entry.entityType))fail(id,'invalid classification');
    if(!text(entry.summary) || [...entry.summary].length<20 || [...entry.summary].length>160)fail(id,'front summary must contain 20–160 characters');
    ids(entry.anatomicSites,SITES,id,'anatomic sites');
    ids(entry.transmission,routes,id,'transmission routes');
    ids(entry.sourceIds,sourceIds,id,'sources');
    if(!Array.isArray(entry.searchAliases) || entry.searchAliases.some(alias=>!text(alias)) || unique(entry.searchAliases).length!==entry.searchAliases.length)fail(id,'invalid search aliases');
    for(const key of Object.keys(CLINICAL))if(!text(entry.clinical?.[key]))fail(id,'missing '+key);
    if(!Array.isArray(entry.etiologies) || !entry.etiologies.length)fail(id,'missing etiology');
    const causes=new Set();
    const etiologies=entry.etiologies.map(cause=>{
      const key=cause.pathogenId || cause.name;
      if(!text(key) || causes.has(key) || typeof cause.context!=='string')fail(id,'invalid or duplicate cause');
      causes.add(key);
      if(cause.pathogenId){
        const pathogen=pathogens[cause.pathogenId];
        if(!pathogen || cause.name || cause.domain)fail(id,'unknown or ambiguous pathogen '+cause.pathogenId);
        return {...cause,name:pathogen.name,domain:pathogen.domain,cardId:pathogen.representativeRecordId};
      }
      if(!DOMAINS.has(cause.domain))fail(id,'invalid external pathogen domain');
      return {...cause};
    });
    if(!Array.isArray(entry.treatments))fail(id,'missing treatment list');
    const treatments=entry.treatments.map(regimen=>{
      if(!text(regimen.id) || regimenIds.has(regimen.id) || !text(regimen.context))fail(id,'invalid treatment context');
      regimenIds.add(regimen.id);
      if(!['preferred','alternative','conditional'].includes(regimen.rank))fail(id,'invalid treatment rank');
      if(!['regimen','component'].includes(regimen.coverage))fail(id,'invalid treatment coverage');
      if(!['single','combination','sequence'].includes(regimen.mode))fail(id,'invalid treatment mode');
      if(!Array.isArray(regimen.components) || !regimen.components.length)fail(id,'empty treatment');
      if((regimen.components.length===1)!==(regimen.mode==='single'))fail(id,'treatment mode does not match components');
      const seen=new Set();
      const components=regimen.components.map(component=>{
        const key=component.drugId || component.name;
        if(!text(key) || seen.has(key))fail(id,'invalid treatment component');
        seen.add(key);
        if(component.role && !['antimicrobial','adjunct'].includes(component.role))fail(id,'invalid component role');
        if(component.drugId){
          if(!drugs[component.drugId] || component.name)fail(id,'unknown or ambiguous drug '+component.drugId);
          return {...component,name:drugs[component.drugId].name};
        }
        return {...component};
      });
      return {...regimen,components};
    });
    diseases[id]={
      ...entry,etiologies,treatments,
      back:{sections:Object.entries(CLINICAL).map(([key,title])=>({id:key,title,text:entry.clinical[key],sourceIds:entry.sourceIds}))}
    };
  }
  const knownDiseases=new Set(Object.keys(diseases));
  for(const disease of Object.values(diseases)){
    ids(disease.relatedDiseaseIds,knownDiseases,disease.id,'related diseases',{allowEmpty:true});
    if(disease.relatedDiseaseIds.includes(disease.id))fail(disease.id,'self relationship');
    for(const cause of disease.etiologies)if(cause.pathogenId)(pathogens[cause.pathogenId].diseaseIds ||= []).push(disease.id);
    for(const regimen of disease.treatments)for(const component of regimen.components)if(component.drugId)(drugs[component.drugId].diseaseIds ||= []).push(disease.id);
  }
  // Reverse links are built from the same authored IDs, never name matching.
  for(const disease of Object.values(diseases))for(const relatedId of [...disease.relatedDiseaseIds]){
    const related=diseases[relatedId];
    if(!related.relatedDiseaseIds.includes(disease.id))related.relatedDiseaseIds.push(disease.id);
  }
  for(const entity of [...Object.values(pathogens),...Object.values(drugs)])if(entity.diseaseIds)entity.diseaseIds=unique(entity.diseaseIds);
  return {
    diseases,diseaseCategories,diseaseRoutes,diseaseEntityTypes,
    diseaseContent:{version:index.version,scope:index.scope,sourceRepository:index.sourceRepository,relationshipPolicy:index.relationshipPolicy}
  };
}
