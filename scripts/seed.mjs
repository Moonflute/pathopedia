// Authored educational isolates. Run explicitly after reviewing edits; never imports raw private notes.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const sourceIds = ['local-spectrum', 'eucast-expected', 'eucast-2026', 'idsa-amr'];
const categories = [
  ['morphology', 'Gram stain / morphology', '염색 · 형태', '01'],
  ['culture', 'Culture characteristics', '배양 특성', '02'],
  ['biochemistry', 'Biochemical tests', '생화학적 동정', '03'],
  ['virulence', 'Virulence factors', '병독성 인자', '04'],
  ['reservoir', 'Reservoir / transmission', '숙주 · 전파', '05'],
  ['diseases', 'Associated diseases', '연관 감염질환', '06'],
  ['resistance', 'Resistance mechanism', '내성 기전', '07'],
  ['tropism', 'Organ tropism', '장기 친화성', '08'],
  ['geography', 'Geographic distribution', '분포 지역', '09'],
].map(([id, label, ko, number]) => ({ id, label, ko, number }));
const drugs = [
 ['oxacillin','Oxacillin','Penicillin'], ['vancomycin','Vancomycin','Glycopeptide'],
 ['ceftriaxone','Ceftriaxone','3rd-gen cephalosporin'], ['cefepime','Cefepime','4th-gen cephalosporin'],
 ['ceftazidime','Ceftazidime','3rd-gen cephalosporin'], ['meropenem','Meropenem','Carbapenem'],
 ['imipenem','Imipenem','Carbapenem'], ['aztreonam','Aztreonam','Monobactam'],
 ['ciprofloxacin','Ciprofloxacin','Fluoroquinolone'], ['levofloxacin','Levofloxacin','Fluoroquinolone'],
 ['ampicillin','Ampicillin','Aminopenicillin'], ['piptazo','Piperacillin–tazobactam','β-lactam / BLI'],
 ['linezolid','Linezolid','Oxazolidinone'], ['ceftazavi','Ceftazidime–avibactam','β-lactam / BLI'],
 ['teicoplanin','Teicoplanin','Glycopeptide'], ['cefazolin','Cefazolin','1st-gen cephalosporin'],
].map(([id,name,family]) => ({id,name,family}));
const taxa = {
 sau: { name:'Staphylococcus aureus', ko:'황색포도알균', classification:'Bacteria / Bacillota / Staphylococcaceae',
  morphology:'Gram-positive cocci in clusters. 비포자성 구균.',
  culture:'혈액한천에서 매끈한 집락. 황금색 색소와 β-hemolysis가 나타날 수 있으며 mannitol을 발효한다.',
  biochemistry:'Catalase (+), coagulase (+), DNase (+).',
  virulence:'Protein A의 IgG Fc 결합, coagulase, 세포독소. 일부 균주에서 TSST-1 또는 exfoliative toxin.',
  reservoir:'사람의 피부와 점막에 집락화. 직접 접촉 및 의료기구를 통한 전파.',
  diseases:'화농성 피부·연조직 감염, 균혈증, 심내막염, 골수염, 폐렴. 균주별 독소 질환.',
  tropism:'피부·연조직, 혈류, 심장판막, 뼈.',
  biology:'통성혐기성. 피부 장벽 손상과 혈관 내 기구가 침습 감염의 통로가 된다.',
  diagnostics:'배양 및 종 동정 후 cefoxitin/oxacillin 기반 methicillin 내성 검사. mecA/mecC 또는 PBP2a로 확인할 수 있다.',
  pearl:'혈액배양에서 동정되면 단순 오염으로 넘기지 않는다. 지속 균혈증은 심내막염이나 전이성 감염의 단서다.', sources:['local-staph','cdc-mrsa'] },
 sep: { name:'Staphylococcus epidermidis',ko:'표피포도알균',classification:'Bacteria / Bacillota / Staphylococcaceae',
  morphology:'Gram-positive cocci in clusters. 비포자성 구균.',
  culture:'혈액한천에서 대개 백색·비용혈성 집락. mannitol은 대개 발효하지 않는다.',
  biochemistry:'Catalase (+), coagulase (−), novobiocin susceptible.',
  virulence:'의료기구 표면의 부착과 biofilm 형성이 핵심. 다당류성 세포 간 부착 인자가 관여한다.',
  reservoir:'사람의 피부와 점막에 집락화. 직접 접촉 및 의료기구를 통한 전파.',
  diseases:'카테터 관련 혈류 감염, 인공판막 심내막염, 인공관절 감염. 혈액배양 오염균으로도 흔하다.',
  tropism:'피부·연조직, 혈류, 심장판막, 뼈.',
  biology:'통성혐기성 피부 상재균. 이물질 위 biofilm에서 지속 감염을 일으킬 수 있다.',
  diagnostics:'반복 혈액배양의 일치, 채혈 위치와 기구 여부를 함께 해석한다. 종 동정과 methicillin 내성 검사를 별도로 시행한다.',
  pearl:'혈액배양 한 병의 양성 여부만으로 오염과 감염을 구분하지 않는다. 인공물과 임상 맥락이 중요하다.',sources:['local-staph','eucast-expected'] },
 efa: { name:'Enterococcus faecalis',ko:'장알균',classification:'Bacteria / Bacillota / Enterococcaceae',
  morphology:'Gram-positive cocci in pairs or short chains. 비포자성 구균.',
  culture:'Bile-esculin (+). 6.5% NaCl에서 성장하며 혈액한천에서 흔히 비용혈성이다.',
  biochemistry:'Catalase (−), PYR (+), arabinose 대개 (−).',
  virulence:'부착 인자, biofilm, 일부 균주의 cytolysin이 관여한다.',
  reservoir:'사람의 장내 세균총. 내인성 감염 및 의료환경에서 접촉 전파.',
  diseases:'요로감염, 균혈증, 심내막염, 복강·담도 감염.',
  tropism:'요로, 혈류, 복강.',
  biology:'통성혐기성. 환경 생존력이 높고 cephalosporin 노출이 집락화를 선택할 수 있다.',
  diagnostics:'종 동정, ampicillin·vancomycin AST. 심내막염에서는 고도 aminoglycoside 내성 여부가 병합요법 해석에 중요하다.',
  pearl:'Cephalosporin 단독의 R과 특정 병합요법의 상승작용은 다른 개념이다.',sources:['eucast-expected','cdc-vre'] },
 efm: { name:'Enterococcus faecium',ko:'페시움 장알균',classification:'Bacteria / Bacillota / Enterococcaceae',
  morphology:'Gram-positive cocci in pairs or short chains. 비포자성 구균.',
  culture:'Bile-esculin (+). 6.5% NaCl에서 성장하며 혈액한천에서 흔히 비용혈성이다.',
  biochemistry:'Catalase (−), PYR (+), arabinose 대개 (+).',
  virulence:'표면 부착 단백과 biofilm. 병원 환경에 적응한 계통에서 다제내성이 흔하다.',
  reservoir:'사람의 장내 세균총. 내인성 감염 및 의료환경에서 접촉 전파.',
  diseases:'의료 관련 균혈증, 요로감염, 복강 감염. 면역저하 환자에서 중요하다.',
  tropism:'요로, 혈류, 복강.',
  biology:'통성혐기성. 병원 관련 분리주에서 ampicillin 내성이 흔하지만 종 전체의 절대적 성질은 아니다.',
  diagnostics:'종 동정과 개별 AST가 필요하다. Vancomycin 내성 시 van 유전자형을 확인할 수 있다.',
  pearl:'VRE라는 이름만으로 종이 결정되지 않는다. faecalis와 faecium, 내성 유전자형을 구분한다.',sources:['eucast-expected','cdc-vre'] },
 eco: { name:'Escherichia coli',ko:'대장균',classification:'Bacteria / Pseudomonadota / Enterobacterales',
  morphology:'Gram-negative rods. 비포자성 간균.',
  culture:'MacConkey agar에서 lactose 발효성 분홍색 집락. 통성혐기성 성장.',
  biochemistry:'Oxidase (−), indole (+), citrate 대개 (−), motility (+).',
  virulence:'Fimbriae와 adhesin, LPS. 병원형에 따라 capsule, enterotoxin 또는 Shiga toxin이 추가된다.',
  reservoir:'사람의 장내 세균총. 내인성 감염 및 의료환경에서 접촉 전파.',
  diseases:'방광염, 신우신염, 균혈증, 복강 감염. 일부 병원형은 장염 또는 신생아 수막염.',
  tropism:'요로, 혈류, 복강.',
  biology:'통성혐기성 Enterobacterales. 이번 문제의 내성 phenotype은 장관외 감염 분리주로 설정했다.',
  diagnostics:'배양·종 동정과 AST. Ceftriaxone 비감수성만으로 ESBL 유전자형을 확정할 수는 없다.',
  pearl:'STEC의 장염과 일반적인 장관외 감염은 치료 맥락이 다르다. ESBL이라는 말은 병원형을 뜻하지 않는다.',sources:['local-ecoli','idsa-amr'] },
 kpn: { name:'Klebsiella pneumoniae',ko:'폐렴막대균',classification:'Bacteria / Pseudomonadota / Enterobacterales',
  morphology:'Gram-negative rods. 비포자성 간균.',
  culture:'MacConkey agar에서 lactose 발효성의 크고 점액성인 집락.',
  biochemistry:'Oxidase (−), indole (−), citrate (+), urease (+), non-motile.',
  virulence:'두꺼운 capsule, LPS와 siderophore. 고병독성 phenotype과 내성 phenotype은 별개 축이다.',
  reservoir:'사람의 장내 세균총. 내인성 감염 및 의료환경에서 접촉 전파.',
  diseases:'폐렴, 요로감염, 균혈증. 고병독성 계통은 간농양 및 전이성 감염과 연관된다.',
  tropism:'호흡기, 요로, 혈류.',
  biology:'통성혐기성 비운동성 간균. Ampicillin에 expected resistant phenotype을 보인다.',
  diagnostics:'배양과 AST. Carbapenem 내성 발견 시 carbapenemase 검사로 KPC, NDM, OXA-48-like 등을 구분한다.',
  pearl:'Carbapenem 내성은 KPC의 동의어가 아니다. 비-carbapenemase 기전도 가능하다.',sources:['eucast-expected','idsa-amr'] },
 pae: { name:'Pseudomonas aeruginosa',ko:'녹농균',classification:'Bacteria / Pseudomonadota / Pseudomonadales',
  morphology:'Gram-negative rods. 비포자성 간균.',
  culture:'비발효성 집락. Pyocyanin/pyoverdine 색소, 특유의 냄새, 42°C 성장 가능.',
  biochemistry:'Oxidase (+), non-glucose-fermenter, motility (+).',
  virulence:'Exotoxin A, elastase, type III secretion system, alginate biofilm.',
  reservoir:'물과 습윤 환경. 병원 급수·의료기구가 감염원이 될 수 있다.',
  diseases:'인공호흡기 관련 폐렴, 화상 감염, 외이도염, ecthyma gangrenosum, 낭포성 섬유증의 만성 기도 감염.',
  tropism:'호흡기, 요로, 혈류.',
  biology:'산화적 대사를 하는 비발효균. 낮은 외막 투과성, 유출펌프와 염색체성 AmpC가 항균제 반응에 관여한다.',
  diagnostics:'배양과 종 동정 후 개별 항녹농균제 AST. DTR은 여러 약제에 대한 비감수성으로 정의되는 phenotype이다.',
  pearl:'DTR만으로 carbapenemase 종류를 추정할 수 없다. 새로운 β-lactam/BLI의 활성도 개별 AST로 판단한다.',sources:['local-pseudomonas','idsa-amr'] },
 ecl: { name:'Enterobacter cloacae complex',ko:'클로아카 장내세균 복합체',classification:'Bacteria / Pseudomonadota / Enterobacterales',
  morphology:'Gram-negative rods. 비포자성 간균.',
  culture:'MacConkey agar에서 lactose 발효성 집락. 통성혐기성 성장.',
  biochemistry:'Oxidase (−), indole (−), citrate (+), motility (+), ornithine decarboxylase 흔히 (+).',
  virulence:'LPS, 부착 인자와 biofilm. 의료 관련 기회감염을 일으킨다.',
  reservoir:'사람의 장내 세균총. 내인성 감염 및 의료환경에서 접촉 전파.',
  diseases:'의료 관련 폐렴, 요로감염, 균혈증, 복강 감염.',
  tropism:'호흡기, 요로, 혈류.',
  biology:'유도성 염색체 AmpC를 가진 복합체. 치료 중 탈억제 변이가 선택될 수 있다.',
  diagnostics:'초기 ceftriaxone S만으로 AmpC 선택 위험이 없다고 판단하지 않는다. Cefepime 결과 및 동반 ESBL 가능성을 함께 본다.',
  pearl:'In vitro S와 임상적 약제 선택은 같지 않다. 유도성 AmpC의 위험을 균종 지식으로 해석해야 한다.',sources:['eucast-expected','idsa-amr'] },
};
// Order is exactly drugs above. Base patterns permit only clinical S/I/R categories.
const variants = [
 ['SAU-001','sau','MSSA','mssa','Methicillin-susceptible; penicillinase-positive','SSSSRSSRSSRSSRSS','mecA/mecC 비검출. Penicillinase 생성; oxacillin 감수성 유지.'],
 ['SAU-002','sau','MRSA','mrsa','mecA-positive MRSA','RSRRRRRRRRRRSR SR'.replaceAll(' ',''),'mecA에 의한 PBP2a. 낮은 β-lactam 결합 친화성; vancomycin 감수성은 유지.'],
 ['SEP-003','sep','MSSE','msse','Methicillin-susceptible; penicillinase-positive','SSSSRSSRSSRSSRSS','mecA/mecC 비검출. Penicillinase 생성; oxacillin 감수성 유지.'],
 ['SEP-004','sep','MRSE','mrse','mecA-positive MRSE','RSRRRRRRRRRRSRSR','mecA에 의한 PBP2a. 낮은 β-lactam 결합 친화성; vancomycin 감수성은 유지.'],
 ['EFA-005','efa','VSE · ampicillin S','vse','Vancomycin-susceptible, ampicillin-susceptible','RSRRRRSRRRSSSR SR'.replaceAll(' ',''),'Glycopeptide 획득내성 없음. Cephalosporin에 expected resistance; ampicillin 감수성.'],
 ['EFA-006','efa','VRE · vanA','vana','vanA-positive, ampicillin-susceptible','RRRRRRSRRRSSSRRR','vanA: D-Ala-D-Ala 말단을 D-Ala-D-Lac으로 치환. Vancomycin과 teicoplanin 내성.'],
 ['EFM-007','efm','VSE · ampicillin R','vse','Vancomycin-susceptible, ampicillin-resistant','RSRRRRRRRRRRSRSR','낮은 친화성 PBP5 관련 ampicillin 내성. Glycopeptide 획득내성 없음.'],
 ['EFM-008','efm','VRE · vanA','vana','vanA-positive, ampicillin-resistant','RRRRRRRRRRRRSRRR','vanA: D-Ala-D-Ala 말단을 D-Ala-D-Lac으로 치환. Vancomycin과 teicoplanin 내성.'],
 ['ECO-009','eco','Baseline susceptible','baseline','No acquired β-lactam resistance in this isolate','RRSSSSSSSSSSR SRS'.replaceAll(' ',''),'이 분리주에서 획득성 ESBL/carbapenemase가 검출되지 않음.'],
 ['ECO-010','eco','ESBL-producing','esbl','CTX-M-type ESBL; carbapenem-susceptible','RRRRRSSRRRRRRSRR','CTX-M형 ESBL. 확장-spectrum cephalosporin과 aztreonam 가수분해; carbapenem 감수성 유지.'],
 ['KPN-011','kpn','ESBL-producing','esbl','CTX-M-type ESBL; carbapenem-susceptible','RRRRRSSRRRRRRSRR','CTX-M형 ESBL. 확장-spectrum cephalosporin과 aztreonam 가수분해; carbapenem 감수성 유지.'],
 ['KPN-012','kpn','KPC-producing','kpc','KPC-producing; ceftazidime–avibactam S','RRRRRRRRRRRRRSRR','KPC형 class A serine carbapenemase. 이 분리주에서는 avibactam으로 억제 가능.'],
 ['PAE-013','pae','Non-DTR · susceptible panel','baseline','Susceptible to conventional antipseudomonal panel','RRRSSSSSSSRSRSRR','기저 외막 장벽·유출펌프·염색체 AmpC. 이 분리주는 통상 항녹농균제 panel에 감수성.'],
 ['PAE-014','pae','DTR phenotype','dtr','Difficult-to-treat resistance; ceftazidime–avibactam S','RRRRRRRRRRRRRSRR','OprD 소실, AmpC 과발현과 efflux 증가의 조합을 설정. DTR 자체는 단일 내성 유전자가 아니다.'],
 ['ECL-015','ecl','Inducible AmpC · baseline','inducible','Basal AmpC expression; ceftriaxone S in vitro','RRSSSSSSSSRSRSRR','유도성 염색체 AmpC의 기저 발현. Ampicillin·1세대 cephalosporin 내성; 치료 중 탈억제 선택 가능.'],
 ['ECL-016','ecl','Derepressed AmpC','derepressed','AmpC overexpression; cefepime S','RRRSRSSRSSRRRSRR','염색체 AmpC 탈억제·과발현. 3세대 cephalosporin 내성, 이 분리주는 cefepime 감수성.'],
];
const records = variants.map(([id,taxon,phenotype,phenotypeId,description,pattern,resistance]) => {
 if (pattern.length !== drugs.length) throw Error(`${id}: ${pattern.length} AST cells`);
 if (!/^[SIR]+$/.test(pattern)) throw Error(`${id}: base AST pattern may contain only S, I or R`);
 const t=taxa[taxon];
 const hints=Object.fromEntries(categories.map(c=>[c.id,{ text: c.id==='resistance'? resistance:c.id==='geography'?'전 세계에 분포. 이 기록은 특정 지역 유행주를 전제로 하지 않는다.':t[c.id], sourceIds: [...new Set([...sourceIds,...t.sources])] }]));
 const susceptibility=Object.fromEntries(drugs.map((d,i)=>[d.id, {category:pattern[i], basis:'authored-isolate', mic:null, breakpoint:null, sourceIds:[...new Set([...sourceIds,...t.sources])], note:'이 문제에 고정된 교육용 분리주의 정성 결과. 이 균종의 모든 분리주에 일반화하지 않는다.' }]));
 // EUCAST v16.1: I is susceptible with increased exposure, never equivalent to R.
 const increasedExposure={
  'SAU-001':['ceftriaxone','cefepime','cefazolin','levofloxacin'],
  'SEP-003':['ceftriaxone','cefepime','cefazolin','levofloxacin'],
  'EFA-005':['imipenem','piptazo'], 'EFA-006':['imipenem','piptazo'],
  'PAE-013':['cefepime','ceftazidime','imipenem','aztreonam','ciprofloxacin','levofloxacin','piptazo'],
 };
 for(const drug of increasedExposure[id]||[]) Object.assign(susceptibility[drug],{category:'I',note:'EUCAST I: Susceptible, increased exposure. 증가된 노출에서 감수성. Intermediate 또는 R를 뜻하지 않는다. 이 분리주의 교육용 범주이며 MIC 실측값은 없다.'});
 if(['sau','sep','efa','efm'].includes(taxon)) Object.assign(susceptibility.ceftazavi,{category:'R',basis:'expected-resistance',note:'이 균–약제 조합은 EUCAST에서 부적합한 조합으로 취급한다. Ceftazidime–avibactam을 Gram-positive 치료제로 해석하지 않는다.'});
 if(['efa','efm'].includes(taxon)) Object.assign(susceptibility.meropenem,{category:'R',basis:'expected-resistance',note:'Enterococcus–meropenem 조합은 EUCAST에서 부적합하며 검사 panel에 포함 시 R로 처리한다.'});
 if(!['sau','sep'].includes(taxon)) Object.assign(susceptibility.oxacillin,{category:'R',basis:'expected-resistance',sourceIds:['eucast-2026','dailymed-oxacillin'],note:`EUCAST v16.1의 ${['efa','efm'].includes(taxon)?'Enterococcus spp. 표(p. 39)':['pae'].includes(taxon)?'Pseudomonas spp. 표(p. 21)':'Enterobacterales 표(p. 14)'}에서 oxacillin은 dash(–)이다. EUCAST Note 8은 이 조합을 치료에 부적합하며 검사·임상 사용을 피하고, 보고가 필요하면 검사 없이 R로 보고하도록 명시한다.`});
 if(['efa','efm'].includes(taxon)) Object.assign(susceptibility.oxacillin,{sourceIds:['eucast-2026','cdc-enterococci-resistance','dailymed-oxacillin'],note:'EUCAST v16.1 Enterococcus spp. 표(p. 39)에서 oxacillin은 dash(–)이며, Note 8에 따라 검사 없이 R로 보고한다. CDC도 Enterococcus가 oxacillin 등 semisynthetic penicillinase-resistant penicillin에 고유 내성을 보인다고 명시한다.'});
 if(['SAU-001','SEP-003'].includes(id)) Object.assign(susceptibility.ciprofloxacin,{category:'ACT',basis:'resistance-screen-negative',applicability:'high-exposure-combination-therapy',sourceIds:['eucast-2026','eucast-bracket-breakpoints'],note:'획득 fluoroquinolone 내성 기전이 검출되지 않은 교육용 분리주. EUCAST 괄호 breakpoint는 임상 S/I를 뜻하지 않으며, ciprofloxacin은 고노출 병합요법에서만 고려할 수 있다.'});
 if(id==='ECO-009') Object.assign(susceptibility.cefazolin,{category:'I',basis:'authored-isolate',applicability:'infections-originating-from-urinary-tract',sourceIds:['eucast-2026'],note:'EUCAST v16.1의 E. coli cefazolin breakpoint는 요로 기원 감염에만 적용된다. 이 고정 교육용 분리주는 해당 맥락의 wild-type 결과(I, increased exposure)로 설정했다.'});
 if(id==='ECO-010') Object.assign(susceptibility.cefazolin,{category:'R',basis:'authored-isolate',applicability:'infections-originating-from-urinary-tract',sourceIds:['eucast-2026','idsa-amr'],note:'요로 기원 감염 맥락의 CTX-M ESBL 생성 교육용 분리주로 cefazolin R 결과를 설정했다. ESBL 명칭만으로 자동 판정한 결과가 아니라 이 분리주의 authored AST다.'});
 if(phenotypeId==='vana') hints.resistance.text+=' 이 분리주는 고전적 VanA 표현형으로 설정했다.';
 return {id,taxonId:taxon,organism:t.name,koreanName:t.ko,phenotype,phenotypeId,phenotypeDescription:description,aliases:[`${t.name} ${phenotype}`,`${t.ko} ${phenotype}`,phenotype],classification:t.classification,biology:t.biology,diagnostics:t.diagnostics,pearl:t.pearl,hints,susceptibility,sourceIds:[...new Set([...sourceIds,...t.sources])],reviewStatus:'educational-draft',isolateModel:'authored-fixed-isolate',reviewedAt:'2026-09-30'};
});
// Expansion packages are reviewed source data, not generated placeholders.
const allSources=JSON.parse(await readFile('data/sources.json','utf8'));
for(const file of ['gram-positive','gram-negative','core-antibiotics']) {
 const pack=JSON.parse(await readFile(`scripts/expansion/${file}.json`,'utf8'));
 for(const [id,source] of Object.entries(pack.sources||{})) {
  if(allSources[id] && allSources[id].url!==source.url) throw Error(`Conflicting source ${id}`);
  allSources[id] ||= source;
 }
 for(const drug of pack.drugs||[]) {
  const existing=drugs.find(d=>d.id===drug.id);
  if(existing) Object.assign(existing,drug); else drugs.push(drug);
 }
 for(const [id,extra] of Object.entries(pack.extensions||{})) {
  const r=records.find(r=>r.id===id);if(!r)throw Error(`Unknown extension record ${id}`);
  Object.assign(r.susceptibility,extra);
 }
 records.push(...(pack.records||[]));
}
await writeFile('data/sources.json',JSON.stringify(allSources,null,2)+'\n');
const data={schemaVersion:1,datasetVersion:'0.3.1',title:'Core clinical bacteriology',reviewStatus:'educational-draft',interpretation:{system:'EUCAST',version:'16.1 (2026)',note:'EUCAST 의미를 적용한 고정 교육용 분리주의 정성 범주. I는 Susceptible, increased exposure이며 R이 아니다. ACT는 임상 S/I가 아니라 근거가 명시된 조건부 활성이다. EUCAST 표의 dash(–)는 치료에 부적합한 조합이며 보고가 필요하면 검사 없이 R로 보고한다. 실측 환자 AST나 MIC의 breakpoint 판정 재현을 주장하지 않는다. MIC 확장 시 표준·버전·감염부위·노출조건과 수치 근거 필수.',advancedModeEnabled:false},categories,drugs,records};
for(const record of records) for(const [drugId,result] of Object.entries(record.susceptibility)) {
 if(result.category === 'NA') throw Error(`${record.id}/${drugId}: NA categories are forbidden`);
 if(result.category === 'ACT' && !result.applicability) throw Error(`${record.id}/${drugId}: ACT requires applicability`);
 if(!result.note.trim() || !result.sourceIds.length) throw Error(`${record.id}/${drugId}: every AST result requires a note and sources`);
}
const {validateDataset}=await import('./validate-data.mjs');
console.log(validateDataset(data,allSources));
await mkdir('data',{recursive:true});
await writeFile('data/organisms.json',JSON.stringify(data,null,2)+'\n');
console.log(`${records.length} records, ${drugs.length} drugs → data/organisms.json`);
