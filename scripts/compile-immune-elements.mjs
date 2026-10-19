import { IMMUNE_VOCABULARY } from '../src/immune-vocabulary.mjs';

const present=value=>typeof value==='string' && value.trim().length>0;
const fail=message=>{throw Error('Immune card content: '+message);};
const unique=values=>[...new Set(values)];
const SECTIONS=['identity','role','regulation','context'];
const checkSources=(ids,sources,label)=>{
  if(!Array.isArray(ids) || !ids.length || unique(ids).length!==ids.length || ids.some(id=>!sources[id]))fail(label+' has invalid sources');
};
const checkCodes=(codes,table,label)=>{
  if(!Array.isArray(codes) || !codes.length || unique(codes).length!==codes.length || codes.some(code=>!Object.hasOwn(table,code)))fail(label+' has invalid codes');
};

export function compileImmuneElements(authored, sources) {
  if (authored?.schemaVersion !== 2 || authored.locale !== 'ko-KR' || !present(authored.version)) fail('invalid metadata');
  if (!Array.isArray(authored.categories) || !authored.categories.length || !Array.isArray(authored.entities) || !authored.entities.length) fail('missing categories or entities');

  const immuneCategories = {};
  for (const [index, category] of authored.categories.entries()) {
    if (!/^[a-z][a-z-]*$/.test(category?.id || '') || !present(category.label) || immuneCategories[category.id]) fail('invalid or duplicate category');
    immuneCategories[category.id] = { id:category.id, label:category.label, sortOrder:index + 1 };
  }

  const immuneElements = {};
  for (const [index, entry] of authored.entities.entries()) {
    const id = entry?.id;
    if (!/^IMM-[0-9]{3}$/.test(id || '') || immuneElements[id]) fail('invalid or duplicate ID: ' + id);
    if (!immuneCategories[entry.category] || !present(entry.name) || !present(entry.englishName) || !present(entry.symbol) || !IMMUNE_VOCABULARY.entityTypes[entry.entityType]) fail(id + ' has invalid identity');
    if (!present(entry.summary) || [...entry.summary].length < 20 || [...entry.summary].length > 160) fail(id + ' has invalid summary');
    for(const [field,table]of [['immuneArms','arms'],['locationIds','locations'],['functionIds','functions']])checkCodes(entry[field],IMMUNE_VOCABULARY[table],id+'/'+field);
    checkSources(entry.sourceIds,sources,id);
    const sections=entry.back?.sections;
    if(!Array.isArray(sections) || sections.length!==SECTIONS.length || SECTIONS.some((sectionId,index)=>sections[index]?.id!==sectionId))fail(id+' has invalid detail sections');
    for(const section of sections){
      if(!present(section.title) || !present(section.text) || [...section.text].length<40 || section.text===entry.summary)fail(id+'/'+section.id+' has insufficient detail');
      checkSources(section.sourceIds,sources,id+'/'+section.id);
    }
    immuneElements[id] = {
      id,kind:'immune-element',name:entry.name,englishName:entry.englishName,symbol:entry.symbol,
      category:entry.category,sortOrder:index+1,entityType:entry.entityType,
      immuneArms:entry.immuneArms,locationIds:entry.locationIds,functionIds:entry.functionIds,
      summary:entry.summary,back:{sections},interactionIds:[],
      sourceIds:unique([...entry.sourceIds,...sections.flatMap(section=>section.sourceIds)]),reviewStatus:'educational-draft'
    };
  }

  const immuneInteractions={};
  if(!Array.isArray(authored.interactions) || !authored.interactions.length)fail('missing interactions');
  for(const relation of authored.interactions){
    const {fromId,toId,type,mode,context,via=''}=relation;
    if(!immuneElements[fromId] || !immuneElements[toId] || fromId===toId || !Object.hasOwn(IMMUNE_VOCABULARY.relationTypes,type))fail('invalid interaction endpoints or type');
    const id=fromId+':'+type+':'+toId;
    if(immuneInteractions[id])fail('duplicate interaction: '+id);
    if(!['direct','mediated','structural'].includes(mode) || !present(context) || mode==='mediated'&&!present(via))fail(id+' has invalid context or mode');
    checkSources(relation.sourceIds,sources,id);
    immuneInteractions[id]={id,fromId,toId,type,mode,context,...(via?{via}:{}),sourceIds:relation.sourceIds};
    immuneElements[fromId].interactionIds.push(id);immuneElements[toId].interactionIds.push(id);
  }
  for(const entry of Object.values(immuneElements))if(!entry.interactionIds.length)fail(entry.id+' has no interactions');
  return {
    immuneElements,immuneCategories,immuneInteractions,immuneVocabulary:structuredClone(IMMUNE_VOCABULARY),
    immuneContent:{version:authored.version,locale:authored.locale,relationshipScope:'Selected human immune interactions; representative, contextual and non-exhaustive. No potency, timing or simulation coefficients are implied.'}
  };
}
