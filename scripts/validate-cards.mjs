import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from './validate-data.mjs';
import { createCardCatalog } from '../src/card-catalog.mjs';
import { IMMUNE_VOCABULARY } from '../src/immune-vocabulary.mjs';

const canonical=value=>Array.isArray(value)?value.map(canonical):value && typeof value==='object'
  ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

export function validateCardCatalog(db,data) {
  const fail=message=>{throw Error('Card DB: '+message);};
  const text=(value,label)=>{if(typeof value!=='string' || !value.trim())fail(label+' is empty');};
  const unique=(ids,label)=>{
    if(!Array.isArray(ids) || ids.some(id=>typeof id!=='string' || !id.trim()) || new Set(ids).size!==ids.length)fail(label+' must contain unique IDs');
  };
  const refs=(ids,label)=>{
    unique(ids,label);
    if(!ids.length || ids.some(id=>!Object.hasOwn(db.sources,id)))fail(label+' has missing sources');
  };
  const keys=(map,expected,label)=>{
    if(!map || Array.isArray(map) || !same(Object.keys(map).sort(),[...new Set(expected)].sort()))fail(label+' IDs differ from the game dataset');
  };
  if(db.schemaVersion!==1)fail('unsupported schema version');
  if(db.sourceDatasetVersion!==data.datasetVersion)fail('source dataset version mismatch');
  for(const name of ['pathogens','variants','drugs','immuneElements','immuneCategories','immuneInteractions','immuneVocabulary','immuneContent','responses','responseProfiles','therapyContexts','sources','panels','categories','counts']){
    if(!db[name] || typeof db[name]!=='object' || Array.isArray(db[name]))fail('missing '+name);
  }
  for(const [id,source]of Object.entries(db.sources)){
    text(source?.title,'source/'+id+' title');
    if(source.url!==undefined)text(source.url,'source/'+id+' URL');else text(source.note,'source/'+id+' note');
  }
  validateDataset(data,db.sources);
  keys(db.pathogens,data.records.map(record=>record.taxonId),'pathogen');
  keys(db.variants,data.records.map(record=>record.id),'variant');
  keys(db.drugs,data.drugs.map(drug=>drug.id),'drug');
  keys(db.responses,data.records.map(record=>record.id),'response record');
  for(const [name,list] of [['panels',data.panels],['categories',data.categories]]){
    keys(db[name],list.map(item=>item.id),name);
    for(const item of list)if(!same(db[name][item.id],item))fail(name+'/'+item.id+' differs from the game dataset');
  }
  if(!same(db.interpretation,data.interpretation))fail('interpretation differs from the game dataset');

  const sections=(entity,label)=>{
    if(!Array.isArray(entity.back?.sections))fail(label+' has no detail sections');
    unique(entity.back.sections.map(section=>section.id),label+' sections');
    for(const section of entity.back.sections){
      text(section.title,label+'/'+section.id+' title');text(section.text,label+'/'+section.id);
      refs(section.sourceIds,label+'/'+section.id);
    }
  };
  const entity=(item,id,label)=>{
    if(item.id!==id)fail(label+' key/ID mismatch: '+id);
    text(item.summary,label+'/'+id+' summary');
    if([...item.summary].length>160)fail(label+'/'+id+' summary exceeds 160 characters');
    refs(item.sourceIds,label+'/'+id);
    sections(item,label+'/'+id);
    if(item.searchAliases!==undefined)unique(item.searchAliases,label+'/'+id+' aliases');
  };
  for(const [id,pathogen]of Object.entries(db.pathogens)){
    entity(pathogen,id,'pathogen');
    const record=data.records.find(item=>item.id===pathogen.representativeRecordId);
    if(!record || record.taxonId!==id)fail(id+' has an invalid representative record');
    if(pathogen.kind!=='pathogen' || pathogen.domain!==record.domain || pathogen.name!==record.organism || pathogen.koreanName!==record.koreanName || pathogen.classification!==record.classification)fail(id+' identity differs from its representative');
  }
  for(const drug of data.drugs){
    const item=db.drugs[drug.id];entity(item,drug.id,'drug');
    if(item.kind!=='drug' || item.name!==drug.name || item.family!==drug.family)fail(drug.id+' identity differs from the game dataset');
    for(const id of ['mechanism','spectrum','limitations','resistance']){
      const value=Array.isArray(drug[id])?drug[id].join(' · '):drug[id];
      if(item.back.sections.find(section=>section.id===id)?.text!==value)fail(drug.id+'/'+id+' detail differs from the game dataset');
    }
  }

  text(db.immuneContent.version,'immune content version');
  text(db.immuneContent.relationshipScope,'immune relationship scope');
  if(db.immuneContent.locale!=='ko-KR')fail('immune content locale mismatch');
  if(!same(db.immuneVocabulary,IMMUNE_VOCABULARY))fail('immune vocabulary differs from shared codes');
  const immuneCategories=Object.entries(db.immuneCategories);
  if(!immuneCategories.length || immuneCategories.some(([id,category],index)=>category.id!==id || !category.label?.trim() || category.sortOrder!==index+1))fail('invalid immune categories');
  const immuneElements=Object.entries(db.immuneElements),cards=createCardCatalog(db);
  if(!immuneElements.length)fail('missing immune elements');
  const interactionIndex=new Map(immuneElements.map(([id])=>[id,[]]));
  for(const [id,relation]of Object.entries(db.immuneInteractions)){
    if(relation.id!==id || id!==relation.fromId+':'+relation.type+':'+relation.toId || relation.fromId===relation.toId || !interactionIndex.has(relation.fromId) || !interactionIndex.has(relation.toId) || !Object.hasOwn(IMMUNE_VOCABULARY.relationTypes,relation.type))fail('invalid immune interaction: '+id);
    if(!['direct','mediated','structural'].includes(relation.mode))fail(id+' has invalid interaction mode');
    text(relation.context,id+' context');if(relation.mode==='mediated')text(relation.via,id+' intermediary');
    refs(relation.sourceIds,id+' interaction sources');
    interactionIndex.get(relation.fromId).push(id);interactionIndex.get(relation.toId).push(id);
  }
  for(const [index,[id,item]]of immuneElements.entries()){
    entity(item,id,'immune element');
    if(!/^IMM-[0-9]{3}$/.test(id) || item.kind!=='immune-element' || !db.immuneCategories[item.category] || item.sortOrder!==index+1)fail(id+' has invalid identity or order');
    text(item.name,item.id+' name');text(item.englishName,item.id+' English name');text(item.symbol,item.id+' symbol');
    if(!Object.hasOwn(IMMUNE_VOCABULARY.entityTypes,item.entityType))fail(id+' has invalid entity type');
    for(const [field,table]of [['immuneArms','arms'],['locationIds','locations'],['functionIds','functions']]){
      unique(item[field],id+'/'+field);
      if(!item[field].length || item[field].some(code=>!Object.hasOwn(IMMUNE_VOCABULARY[table],code)))fail(id+' has invalid immune property codes');
    }
    if(!same(item.back.sections.map(section=>section.id),['identity','role','regulation','context']) || item.back.sections.some(section=>[...section.text].length<40))fail(id+' has insufficient immune details');
    unique(item.interactionIds,id+' interaction IDs');
    if(!item.interactionIds.length || !same([...item.interactionIds].sort(),interactionIndex.get(id).sort()))fail(id+' has asymmetric immune interaction references');
    const card=cards.immuneElement(id);
    if(card?.summary!==item.summary || !same(card.back.sections,item.back.sections) || !same(card.interactionIds,item.interactionIds) || !item.sourceIds.every(id=>card.back.references.some(ref=>ref.id===id)))fail(item.id+' has invalid card projection');
    for(const relation of card.interactions)if(!relation.sourceIds.every(sourceId=>card.back.references.some(reference=>reference.id===sourceId)))fail(id+' omits an interaction source');
  }

  const usedProfiles=new Set();
  for(const record of data.records){
    const variant=db.variants[record.id];entity(variant,record.id,'variant');
    if(variant.pathogenId!==record.taxonId || !db.pathogens[variant.pathogenId])fail(record.id+' has an invalid pathogen reference');
    if(variant.panelId!==record.panelId || !db.panels[variant.panelId] || variant.observationType!==record.observationType)fail(record.id+' has an invalid panel reference');
    if(variant.label!==record.phenotype || variant.phenotypeId!==record.phenotypeId)fail(record.id+' phenotype differs from the game dataset');
    if(variant.resistance){text(variant.resistance.code,record.id+' resistance code');text(variant.resistance.label,record.id+' resistance label');}
    keys(db.responses[record.id],Object.keys(record.susceptibility),record.id+' drug response');
    for(const [drugId,result]of Object.entries(record.susceptibility)){
      const profileId=db.responses[record.id][drugId],profile=db.responseProfiles[profileId];
      if(!db.drugs[drugId] || !profile)fail(record.id+'/'+drugId+' has a missing response profile');
      if(!same(profile,result))fail(record.id+'/'+drugId+' response differs from the game dataset');
      usedProfiles.add(profileId);
    }
    const card=cards.pathogen(record.id),details=new Map(card.back.sections.map(section=>[section.id,section]));
    const expected=[...data.categories.map(category=>[category.id,record.hints[category.id].text]),...['biology','diagnostics','pearl'].map(id=>[id,record[id]])];
    if(record.clinicalContext)expected.push(['clinicalContext',String(record.clinicalContext)]);
    for(const [id,value]of expected)if(details.get(id)?.text!==value)fail(record.id+'/'+id+' inherited detail differs from the game dataset');
    const referenceIds=new Set(card.back.references.map(reference=>reference.id));
    for(const id of [...card.back.sections,...card.back.responses].flatMap(item=>item.sourceIds || []))if(!referenceIds.has(id))fail(record.id+' omits a detail/response reference: '+id);
    unique(variant.therapyIds || [],record.id+' therapy IDs');
    const expectedTherapies=Object.values(db.therapyContexts).filter(context=>context.recordIds?.includes(record.id)).map(context=>context.id);
    if(!same([...(variant.therapyIds || [])].sort(),expectedTherapies.sort()))fail(record.id+' has asymmetric therapy references');
  }
  for(const [id,profile]of Object.entries(db.responseProfiles)){
    if(!usedProfiles.has(id))fail('unreferenced response profile: '+id);
    const expected='rsp_'+createHash('sha256').update(JSON.stringify(canonical(profile))).digest('hex').slice(0,16);
    if(id!==expected)fail('response profile ID is not content-derived: '+id);
    // Legacy observations may repeat source keys; preserve their content-derived IDs.
    refs([...new Set(profile.sourceIds)],id);
  }
  for(const [id,context]of Object.entries(db.therapyContexts)){
    if(context.id!==id)fail('therapy key/ID mismatch: '+id);
    text(context.context,id+' context');text(context.note,id+' note');
    for(const key of ['sites','scenarios'])if(context[key]!==undefined){unique(context[key],id+' '+key);if(!context[key].length)fail(id+' has empty '+key);for(const value of context[key])text(value,id+' '+key);}
    if(context.sites?.some(site=>!['community','urinary','lung','abdomen','bloodstream','soft-tissue'].includes(site)))fail(id+' has unknown clinical site');
    for(const key of ['learningDefault','requiresCompanion'])if(context[key]!==undefined&&typeof context[key]!=='boolean')fail(id+' has invalid '+key);
    if(context.preferenceLabel!==undefined)text(context.preferenceLabel,id+' preference label');
    unique(context.recordIds,id+' record IDs');unique(context.drugIds,id+' drug IDs');unique(context.excludedDrugIds || [],id+' excluded drug IDs');
    refs(context.sourceIds,id);
    if(!context.recordIds.length || !context.drugIds.length)fail(id+' has an empty therapy relationship');
    for(const recordId of context.recordIds){
      if(!db.variants[recordId])fail(id+' has an unknown therapy record: '+recordId);
      for(const drugId of context.drugIds){
        const result=cards.response(recordId,drugId);
        if(!db.drugs[drugId] || !['S','I','ACT','ACTIVE','REGIMEN'].includes(result?.category))fail(id+' preference has no positive recorded response: '+recordId+'/'+drugId);
      }
    }
    for(const drugId of context.excludedDrugIds || [])if(!db.drugs[drugId] || context.drugIds.includes(drugId))fail(id+' has an invalid excluded drug: '+drugId);
  }

  if(db.diseases){
    for(const [id,disease]of Object.entries(db.diseases)){
      entity(disease,id,'disease');
      if(disease.kind!=='disease' || !db.diseaseCategories?.[disease.category] || !db.diseaseEntityTypes?.[disease.entityType])fail(id+' has an invalid disease classification');
      text(disease.name,id+' name');text(disease.englishName,id+' English name');
      unique(disease.transmission,id+' routes');unique(disease.anatomicSites,id+' anatomic sites');
      if(!disease.transmission.length || disease.transmission.some(route=>!db.diseaseRoutes?.[route]))fail(id+' has an invalid disease route');
      for(const key of ['presentation','diagnostics','management','redFlags']){
        text(disease.clinical?.[key],id+'/'+key);
        if(disease.back.sections.find(section=>section.id===key)?.text!==disease.clinical[key])fail(id+' differs from its clinical fields');
      }
      unique(disease.relatedDiseaseIds,id+' related diseases');
      for(const relatedId of disease.relatedDiseaseIds)if(!db.diseases[relatedId]?.relatedDiseaseIds.includes(id))fail(id+' has an asymmetric disease relationship');
      if(!Array.isArray(disease.etiologies) || !disease.etiologies.length)fail(id+' has no etiology');
      unique(disease.etiologies.map(cause=>cause.pathogenId || cause.name),id+' etiologies');
      for(const cause of disease.etiologies){
        text(cause.name,id+' cause');
        if(cause.pathogenId){
          const pathogen=db.pathogens[cause.pathogenId];
          if(!pathogen || cause.name!==pathogen.name || cause.cardId!==pathogen.representativeRecordId || !pathogen.diseaseIds?.includes(id))fail(id+' has an invalid disease/pathogen relationship');
        }
      }
      unique(disease.treatments.map(regimen=>regimen.id),id+' treatment IDs');
      for(const regimen of disease.treatments){
        text(regimen.context,id+' treatment context');
        if(!['regimen','component'].includes(regimen.coverage) || !['preferred','alternative','conditional'].includes(regimen.rank) || !['single','combination','sequence'].includes(regimen.mode))fail(id+' has an invalid disease treatment');
        if(!regimen.components.length || (regimen.components.length===1)!==(regimen.mode==='single'))fail(id+' has an invalid treatment mode');
        unique(regimen.components.map(component=>component.drugId || component.name),id+' treatment components');
        for(const component of regimen.components)if(component.drugId && (!db.drugs[component.drugId]?.diseaseIds?.includes(id) || component.name!==db.drugs[component.drugId].name))fail(id+' has an invalid disease/drug relationship');
      }
    }
    for(const [kind,map]of [['pathogen',db.pathogens],['drug',db.drugs]])for(const entity of Object.values(map)){
      unique(entity.diseaseIds || [],kind+'/'+entity.id+' disease IDs');
      for(const id of entity.diseaseIds || []){
        const disease=db.diseases[id];
        if(!disease || !(kind==='pathogen'?disease.etiologies.some(cause=>cause.pathogenId===entity.id):disease.treatments.some(regimen=>regimen.components.some(component=>component.drugId===entity.id))))fail(entity.id+' has an invalid reverse disease relationship');
      }
    }
  }

  const counts={
    ...(db.diseases?{diseases:Object.keys(db.diseases).length}:{}),
    immuneElements:Object.keys(db.immuneElements).length,
    immuneInteractions:Object.keys(db.immuneInteractions).length,
    pathogens:Object.keys(db.pathogens).length,variants:Object.keys(db.variants).length,drugs:Object.keys(db.drugs).length,
    responses:Object.values(db.responses).reduce((sum,items)=>sum+Object.keys(items).length,0),responseProfiles:Object.keys(db.responseProfiles).length
  };
  if(!same(db.counts,counts))fail('stored counts differ from the actual relationships');
  return {...counts,therapyContexts:Object.keys(db.therapyContexts).length};
}

export async function validateCardFiles() {
  const [db,data]=await Promise.all(['library','organisms'].map(name=>readFile(new URL('../data/'+name+'.json',import.meta.url),'utf8').then(JSON.parse)));
  return validateCardCatalog(db,data);
}

if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1]))console.log('Validated card DB:',await validateCardFiles());
