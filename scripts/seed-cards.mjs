import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOMAINS = ['bacteria','fungi','viruses','parasites'];
const LABELS = {
  biology:'핵심 생물학', morphology:'형태 · 구조', culture:'배양 · 생활사',
  biochemistry:'동정 · 진단 단서', virulence:'병인 · 병독성', reservoir:'숙주 · 전파',
  diseases:'주요 질환', tropism:'장기 친화성', geography:'분포', diagnostics:'진단',
  pearl:'기억할 포인트', resistance:'내성 · 치료 특성', clinicalContext:'이 기록의 적용 조건'
};
const DOMAIN_LABELS = {
  viruses:{morphology:'구조 · 유전체',culture:'증식 특성',biochemistry:'진단 · 동정',virulence:'병인',resistance:'치료 · 예방'},
  parasites:{morphology:'형태',culture:'생활사',biochemistry:'진단 · 동정',virulence:'병인',resistance:'치료 · 병기'},
  fungi:{biochemistry:'진단 · 동정',resistance:'약제 반응'}
};
const unique = items => [...new Set(items.filter(Boolean))];
const text = value => Array.isArray(value) ? value.join(' · ') : String(value ?? '');
const json = path => readFile(new URL('../' + path, import.meta.url),'utf8').then(JSON.parse);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
  return value;
}
function summaryFor(map, id, label) {
  const summary = map[id];
  if (typeof summary !== 'string' || !summary.trim()) throw Error(`Missing authored ${label} summary: ${id}`);
  if ([...summary].length > 160) throw Error(`${id}: keep the front summary within 160 characters`);
  return summary.trim();
}
function sectionsFor(record) {
  const section = (id,value,sourceIds) => ({ id, title:DOMAIN_LABELS[record.domain]?.[id] || LABELS[id], text:text(value), sourceIds:unique(sourceIds || record.sourceIds || []) });
  const sections = [];
  if (record.biology) sections.push(section('biology',record.biology));
  for (const id of ['morphology','culture','biochemistry','virulence','reservoir','diseases','tropism','geography']) {
    const hint = record.hints[id];
    if (hint?.text) sections.push(section(id,hint.text,hint.sourceIds));
  }
  for (const id of ['diagnostics','pearl']) if (record[id]) sections.push(section(id,record[id]));
  return sections;
}

// A portable, normalized read model. Existing organisms.json remains the game
// compatibility view; all card prose is authored under content/cards/.
export function compileLibraryCatalog(dataset, sources, authored) {
  const grouped = new Map();
  for (const record of dataset.records) {
    if (!grouped.has(record.taxonId)) grouped.set(record.taxonId,[]);
    grouped.get(record.taxonId).push(record);
  }
  const pathogens = {}, variants = {}, drugs = {}, responses = {}, responseProfiles = {};
  for (const [taxonId,records] of grouped) {
    const base = records[0], common = sectionsFor(base);
    pathogens[taxonId] = {
      id:taxonId, kind:'pathogen', domain:base.domain, name:base.organism, koreanName:base.koreanName,
      classification:base.classification, representativeRecordId:base.id,
      ...(authored.searchNames?.pathogens?.[taxonId]?.length?{searchAliases:authored.searchNames.pathogens[taxonId]}:{}),
      summary:summaryFor(authored.pathogens,taxonId,'pathogen'),
      back:{ sections:common }, sourceIds:unique(records.flatMap(record => record.sourceIds)),
      reviewStatus:base.reviewStatus || dataset.reviewStatus
    };
    for (const record of records) {
      const override = authored.variants[record.id];
      if (records.length > 1 && !override?.summary) throw Error(`Missing distinct phenotype summary: ${record.id}`);
      const recordSections = sectionsFor(record);
      const changed = recordSections.filter(section => !same(section,common.find(item => item.id === section.id)));
      const resistance = record.hints.resistance;
      if (resistance?.text) changed.push({ id:'resistance', title:DOMAIN_LABELS[record.domain]?.resistance || LABELS.resistance, text:resistance.text, sourceIds:resistance.sourceIds });
      if (record.clinicalContext) changed.push({ id:'clinicalContext', title:LABELS.clinicalContext, text:text(record.clinicalContext), sourceIds:record.sourceIds });
      variants[record.id] = {
        id:record.id, pathogenId:taxonId, label:record.phenotype, phenotypeId:record.phenotypeId,
        description:record.phenotypeDescription, aliases:record.aliases || [],
        summary:override ? summaryFor({[record.id]:override.summary},record.id,'phenotype') : pathogens[taxonId].summary,
        ...(override?.resistance ? {resistance:override.resistance} : {}),
        back:{ sections:changed }, observationType:record.observationType, panelId:record.panelId,
        isolateModel:record.isolateModel, reviewStatus:record.reviewStatus, reviewedAt:record.reviewedAt,
        sourceIds:record.sourceIds
      };
      responses[record.id] = {};
      for (const [drugId,response] of Object.entries(record.susceptibility)) {
        const definition = canonical(response), signature = JSON.stringify(definition);
        const profileId = 'rsp_' + createHash('sha256').update(signature).digest('hex').slice(0,16);
        if (responseProfiles[profileId] && !same(responseProfiles[profileId],definition)) throw Error('Response profile ID collision');
        responseProfiles[profileId] ||= definition;
        responses[record.id][drugId] = profileId;
      }
    }
  }
  const drugLabels = { mechanism:'작용 기전', spectrum:'주요 표적', limitations:'범위 · 사용 한계', resistance:'내성 기전' };
  for (const drug of dataset.drugs) drugs[drug.id] = {
    id:drug.id, kind:'drug', name:drug.name, family:drug.family,
    ...(authored.searchNames?.drugs?.[drug.id]?.length?{searchAliases:authored.searchNames.drugs[drug.id]}:{}),
    summary:summaryFor(authored.drugs,drug.id,'drug'),
    back:{ sections:Object.entries(drugLabels).filter(([key]) => drug[key]).map(([id,title]) => ({ id,title,text:text(drug[id]),sourceIds:drug.sourceIds || [] })) },
    sourceIds:unique([...(drug.sourceIds || []),...(authored.drugSummarySourceIds?.[drug.id] || [])]), reviewStatus:dataset.reviewStatus
  };
  for(const [aliases,known,label] of [[authored.searchNames?.pathogens,pathogens,'pathogen'],[authored.searchNames?.drugs,drugs,'drug']]){
    for(const [id,names] of Object.entries(aliases || {})){
      if(!known[id] || !Array.isArray(names) || !names.length || names.some(name=>typeof name!=='string' || !name.trim()) || unique(names).length!==names.length)throw Error('Invalid '+label+' search names: '+id);
    }
  }
  const therapyContexts={};
  for (const context of authored.therapyContexts || []) {
    if(!context.id || therapyContexts[context.id] || !context.context?.trim() || !context.note?.trim() || !context.recordIds?.length || !context.drugIds?.length || !context.sourceIds?.length)throw Error('Invalid clinical preference context: '+context.id);
    if(context.sourceIds.some(id=>!sources[id]))throw Error('Unknown clinical preference source: '+context.id);
    if((context.excludedDrugIds || []).some(id=>!drugs[id] || context.drugIds.includes(id)))throw Error('Invalid excluded preference drug: '+context.id);
    for(const recordId of context.recordIds){
      if(!variants[recordId])throw Error('Unknown preference record: '+recordId);
      for(const drugId of context.drugIds){
        const result=responseProfiles[responses[recordId][drugId]];
        if(!drugs[drugId] || !['S','I','ACT','ACTIVE','REGIMEN'].includes(result?.category))throw Error('Preference without a positive recorded response: '+recordId+' / '+drugId);
      }
      (variants[recordId].therapyIds ||= []).push(context.id);
    }
    therapyContexts[context.id]=context;
  }
  for (const [map,known,label] of [[authored.pathogens,pathogens,'pathogen'],[authored.drugs,drugs,'drug'],[authored.variants,variants,'variant']]) {
    for (const id of Object.keys(map)) if (!known[id]) throw Error(`Unknown authored ${label} ID: ${id}`);
  }
  return {
    $schema:'./library-schema.json', schemaVersion:1, catalogVersion:'1.2.0',
    sourceDatasetVersion:dataset.datasetVersion, locale:'ko-KR', reviewStatus:dataset.reviewStatus,
    contentOrigin:'content/cards/*.json',
    interpretation:dataset.interpretation,
    panels:Object.fromEntries(dataset.panels.map(panel => [panel.id,panel])),
    categories:Object.fromEntries(dataset.categories.map(category => [category.id,category])),
    counts:{ pathogens:Object.keys(pathogens).length, variants:Object.keys(variants).length, drugs:Object.keys(drugs).length, responses:Object.values(responses).reduce((sum,entries) => sum + Object.keys(entries).length,0), responseProfiles:Object.keys(responseProfiles).length },
    pathogens, variants, drugs, responses, responseProfiles, therapyContexts, sources
  };
}

export async function generateLibraryCatalog(dataset, sources) {
  dataset ||= await json('data/organisms.json');
  sources ||= await json('data/sources.json');
  const pathogens = {};
  for (const domain of DOMAINS) {
    const authored = await json(`content/cards/${domain}.json`);
    for (const [id,summary] of Object.entries(authored.summaries)) {
      if (Object.hasOwn(pathogens,id)) throw Error(`Duplicate authored pathogen: ${id}`);
      pathogens[id] = summary;
    }
  }
  const drugContent = await json('content/cards/drugs.json');
  const therapyContent = await json('content/cards/therapies.json');
  const searchNames=await json('content/cards/search-names.json');
  if(dataset.drugs.some(drug=>!searchNames.drugs?.[drug.id]?.length))throw Error('Missing Korean drug search names');
  const cardSources = {...sources};
  for (const [id,reference] of Object.entries({...drugContent.references,...therapyContent.references})) {
    if (!reference.title?.trim() || !/^https:\/\//.test(reference.url)) throw Error('Invalid card reference: ' + id);
    if (cardSources[id] && !same(cardSources[id],reference)) throw Error('Conflicting card reference: ' + id);
    cardSources[id] = reference;
  }
  for (const [drugId,ids] of Object.entries(drugContent.summarySourceIds || {})) {
    if (!dataset.drugs.some(drug => drug.id === drugId) || !Array.isArray(ids) || ids.some(id => !cardSources[id])) throw Error('Unknown drug summary reference: ' + drugId);
  }
  const authored = { pathogens, drugs:drugContent.summaries, drugSummarySourceIds:drugContent.summarySourceIds || {}, variants:(await json('content/cards/variants.json')).overrides, therapyContexts:therapyContent.contexts, searchNames };
  const catalog = compileLibraryCatalog(dataset,cardSources,authored);
  await writeFile(new URL('../data/library.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
  console.log(`Card DB: ${catalog.counts.pathogens} pathogens / ${catalog.counts.variants} variants / ${catalog.counts.drugs} drugs → data/library.json`);
  return catalog;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await generateLibraryCatalog();
