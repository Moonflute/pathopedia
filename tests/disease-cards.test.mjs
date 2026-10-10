import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileDiseases} from '../scripts/compile-diseases.mjs';
import {validateCardCatalog} from '../scripts/validate-cards.mjs';
import {createCardCatalog} from '../src/card-catalog.mjs';
import {createCardModels} from '../src/card-models.mjs';
import {createCardSearch} from '../src/card-search.mjs';
import {createCardStacks} from '../src/card-stacks.mjs';
import {resolveAppRoute,cardRouteHash} from '../src/app-routing.mjs';
import {renderReferenceCard} from '../src/reference-card.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const data=read('data/organisms.json'),catalog=read('data/library.json'),index=read('content/diseases/index.json');
const authored={index,entities:index.files.flatMap(file=>read('content/diseases/'+file).entities)};
const models=createCardModels(data,catalog),cards=createCardCatalog(catalog);

test('authored disease entries cover each category and preserve explicit canonical relationships',()=>{
  assert.equal(Object.keys(catalog.diseases).length,259);
  assert.equal(catalog.counts.diseases,authored.entities.length);
  assert.equal(Object.keys(catalog.diseaseCategories).length,16);
  assert(Object.values(catalog.diseaseCategories).every(category=>Object.values(catalog.diseases).some(disease=>disease.category===category.id)));
  assert.equal(validateCardCatalog(catalog,data).diseases,259);
  const original=new Map(authored.entities.map(disease=>[disease.id,disease]));
  for(const disease of Object.values(catalog.diseases)){
    assert.equal(disease.summary,original.get(disease.id).summary);
    assert.equal(disease.back.sections.length,4);
    assert(disease.etiologies.every(cause=>!cause.pathogenId || catalog.pathogens[cause.pathogenId].diseaseIds.includes(disease.id)));
    assert(disease.treatments.every(regimen=>regimen.components.every(component=>!component.drugId || catalog.drugs[component.drugId].diseaseIds.includes(disease.id))));
    assert.equal(models.get('disease',disease.id).leftProperties.length,9);
    assert(models.disease(disease.id).rightProperties.length<=10);
  }
  for(const id of ['rheumatic-fever','poststreptococcal-glomerulonephritis','fever-of-unknown-origin','snakebite','kaposi-sarcoma'])assert.equal(catalog.diseases[id],undefined);
});

test('clinical preference is scoped to the selected disease regimen, including stage and formulation',()=>{
  const disease=catalog.diseases['staphylococcal-bacteremia'];
  const mssa=disease.treatments.find(item=>item.context.includes('MSSA'));
  const mrsa=disease.treatments.find(item=>item.context.includes('MRSA'));
  assert(mssa && mrsa);
  const selected=(context,id)=>models.disease(disease.id,context.id).rightProperties.find(property=>property.label===catalog.drugs[id].name);
  assert.equal(selected(mssa,'cefazolin').preferred,true);
  assert.equal(selected(mssa,'vancomycin').active,false);
  assert.equal(selected(mrsa,'vancomycin').preferred,true);
  assert.equal(selected(mrsa,'cefazolin').active,false);
  const crypto=catalog.diseases['cryptococcal-meningitis'];
  assert.equal(models.disease(crypto.id,crypto.treatments[0].id).rightProperties.find(item=>item.shortLabel==='FLC').active,false);
  assert.equal(models.disease(crypto.id,crypto.treatments[1].id).rightProperties.find(item=>item.shortLabel==='FLC').preferred,true);
  assert.match(crypto.treatments[0].context,/Liposomal/);
  const malaria=catalog.diseases['vivax-ovale-malaria'];
  assert(malaria.treatments.find(item=>item.components.some(component=>component.drugId==='primaquine')).context.includes('G6PD'));
});

test('sequential regimens and adjuncts cannot become a simultaneous antimicrobial combination',()=>{
  for(const id of ['mycoplasma-genitalium','amebic-colitis','amebic-liver-abscess'])assert.equal(catalog.diseases[id].treatments[0].mode,'sequence');
  const mgen=renderReferenceCard(models.disease('mycoplasma-genitalium'));
  assert.match(mgen,/순서대로 사용/);
  assert.match(mgen,/data-card-related="drug:moxifloxacin"/);
  const hPylori=models.disease('helicobacter-infection');
  const ppi=hPylori.rightProperties.find(item=>item.label==='PPI');
  assert.equal(ppi.active,true);assert.equal(ppi.preferred,false);
  assert.match(ppi.tooltip.body,/보조 약제/);
  assert.match(renderReferenceCard(models.disease('catheter-bloodstream-infection')),/전체 요법의 일부/);
  assert.deepEqual(catalog.diseases['mycoplasma-genitalium'].treatments[1].components.map(component=>component.drugId),['doxycycline','azithromycin']);
  assert.deepEqual(catalog.diseases.sepsis.treatments[2].components.map(component=>component.drugId),['piptazo','vancomycin']);
  assert.equal(catalog.diseases['bacterial-meningitis'].treatments[2].coverage,'component');
  assert.equal(catalog.diseases['clostridioides-colitis'].treatments[2].mode,'combination');
});

test('unregistered agents keep names without false card IDs and supportive conditions have no invented antibiotic',()=>{
  const cystitis=catalog.diseases['acute-cystitis'];
  assert(cystitis.treatments.some(item=>item.components.some(component=>component.name==='Nitrofurantoin' && !component.drugId)));
  assert.equal(models.disease('common-cold').rightProperties.length,0);
  assert.equal(models.get('missing','common-cold'),null);
  assert.equal(cards.disease('missing'),null);
  assert.equal(models.disease('rabies').kind,'disease');
  const links=renderReferenceCard(models.disease('acute-cystitis'));
  assert.doesNotMatch(links,/data-card-related="drug:Nitrofurantoin"/);
});

test('disease names, Korean spacing, aliases and existing pathogen/drug links share one search index',()=>{
  const search=createCardSearch(data,catalog);
  for(const disease of Object.values(catalog.diseases)){
    assert(search.matches('disease',disease.id,disease.name),disease.id);
    assert(search.matches('disease',disease.id,disease.englishName),disease.id);
    assert(disease.searchAliases.every(alias=>search.matches('disease',disease.id,alias)),disease.id);
  }
  assert(search.matches('disease','community-pneumonia','지역사회 획득 폐렴'));
  assert(search.matches('disease','herpes-zoster','대상포진'.normalize('NFD')));
  assert(cards.pathogen('SAU-001').back.relatedDiseases.some(item=>item.id==='staphylococcal-bacteremia'));
  assert(cards.drug('ceftriaxone').back.relatedDiseases.some(item=>item.id==='community-pneumonia'));
  const entries=Object.values(catalog.diseases).map(disease=>({id:disease.id,kind:'disease',key:'disease:'+disease.id}));
  assert(createCardStacks(catalog,{storage:null}).groups(entries).every(group=>group.type==='card'));
  assert.equal(cardRouteHash('diseases'),'#cards/diseases');
  assert.equal(resolveAppRoute('#diseases').domain,'diseases');
  assert.equal(resolveAppRoute('#cards/archive/diseases'),null);
});

test('unknown etiologies, treatment references, modes and sources are rejected before DB generation',()=>{
  const compile=entries=>compileDiseases({index,entities:entries},{pathogens:structuredClone(catalog.pathogens),drugs:structuredClone(catalog.drugs),sources:catalog.sources});
  const base=structuredClone(authored.entities.find(disease=>disease.id==='acute-cystitis'));base.relatedDiseaseIds=[];
  const mutate=run=>{const entry=structuredClone(base);run(entry);return [entry];};
  assert.throws(()=>compile(mutate(d=>d.etiologies[0].pathogenId='not-a-taxon')),/unknown or ambiguous pathogen/);
  assert.throws(()=>compile(mutate(d=>d.treatments[0].components=[{drugId:'not-a-drug'}])),/unknown or ambiguous drug/);
  assert.throws(()=>compile(mutate(d=>d.treatments[0].mode='combination')),/mode does not match/);
  assert.throws(()=>compile(mutate(d=>d.sourceIds=['not-a-source'])),/invalid sources/);
  assert.throws(()=>compile([base,base]),/duplicate ID/);
});
