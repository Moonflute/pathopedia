export const DECK_SLOTS = 4;
export const DECK_BUDGET = 10;
export const MAPS = Object.freeze([
 {id:'lung',name:'폐',subtitle:'호흡기 방어선',color:'#8ad1c0',note:'폐렴 시나리오 · 그람양성균과 음성균을 함께 대비하세요.',sourceAction:'농흉 배액',sourceNote:'배액 가능한 농흉이 동반된 감염원을 제거합니다.'},
 {id:'urinary',name:'요로',subtitle:'방광 방어선',color:'#91bfe6',note:'하부 요로 감염 · Cefazolin의 E. coli 판정은 요로 유래에 한정됩니다.',sourceAction:'카테터 제거·교체',sourceNote:'증상이 있는 카테터 연관 감염의 biofilm 감염원을 제거합니다.'},
 {id:'abdomen',name:'복강',subtitle:'복강 방어선',color:'#d8b587',note:'장내 세균과 혐기성균 · 적절한 항균제와 배액을 함께 준비하세요.',sourceAction:'농양 배액',sourceNote:'배액 가능한 복강 농양을 제거합니다. 항생제의 coverage는 바뀌지 않습니다.'}
]);
export const HOSTS = Object.freeze([
 {id:'normal',name:'일반 숙주',note:'보존된 면역·신기능. 추가 투여 제한 없음.',immune:0.55},
 {id:'immune',name:'면역저하',note:'호중구 감소 시나리오. 숙주의 자연 방어가 약합니다.',immune:0.08},
 {id:'renal',name:'신기능 저하',note:'신배설 약제는 신기능 맞춤 투여 후 작동합니다. 조정은 목표 노출을 유지하며 coverage를 바꾸지 않습니다.',immune:0.55},
 {id:'allergy',name:'Aminopenicillin 알레르기',note:'확인된 즉시형 반응으로 Ampicillin·Amoxicillin–clavulanate를 제외. 다른 β-lactam은 개별 교차반응 평가 후 사용 가능하다고 설정합니다.',immune:0.55}
]);
// Combat numbers are game balance, never doses, MICs or clinical effect sizes.
const spec=(id,short,color,cost,upkeep,unlock,extra={})=>Object.freeze({id,short,color,cost,upkeep,unlock,damage:15,interval:0.68,range:155,renal:false,optimize:'PK/PD 최적화',...extra});
export const DRUG_SPECS=Object.freeze([
 spec('ampicillin','AMP','#a9d78c',55,2,0,{renal:true,interval:0.55,range:145,role:'감수성 그람양성',shape:'capsule',optimize:'투여 간격 최적화'}),
 spec('amoxclav','AMC','#c3d995',85,5,30,{renal:true,role:'Inhibitor 조합',shape:'linked',combo:['Amoxicillin','Clavulanate'],optimize:'투여 간격 최적화'}),
 spec('cefazolin','CFZ','#87d0b2',65,3,0,{renal:true,interval:0.58,role:'MSSA · I는 노출 ↑',shape:'hex',optimize:'고노출 투여 설계'}),
 spec('ceftriaxone','CRO','#75c9cc',95,7,0,{damage:23,interval:0.9,range:180,role:'감수성 장내세균',shape:'scope',optimize:'투여 설계 최적화'}),
 spec('metronidazole','MTZ','#d8b089',55,3,0,{damage:22,interval:0.72,role:'복강 혐기성균',shape:'diamond',optimize:'투여·노출 모니터링'}),
 spec('cefepime','FEP','#85abe6',120,9,40,{renal:true,damage:21,interval:0.64,range:175,role:'Pseudomonas · I ↑',shape:'hex',optimize:'Extended infusion'}),
 spec('vancomycin','VAN','#ca9dcc',115,7,40,{renal:true,damage:33,interval:1.05,range:148,role:'MRSA 대응',shape:'pulse',optimize:'AUC 기반 TDM'}),
 spec('linezolid','LZD','#dc9db5',125,8,45,{damage:19,interval:0.58,range:190,role:'MRSA · VISA',shape:'beam',optimize:'노출·안전성 모니터링'}),
 spec('meropenem','MEM','#ddbc7b',155,15,65,{renal:true,damage:26,interval:0.7,range:178,role:'ESBL 대응',shape:'hex',optimize:'Extended infusion'}),
 spec('ceftazavi','CZA','#e8997d',175,18,85,{renal:true,damage:30,interval:0.85,range:180,role:'KPC 대응',shape:'linked',combo:['Ceftazidime','Avibactam'],optimize:'투여·노출 최적화'})
]);
export const PROFILE_SPECS=Object.freeze([
 {id:'pneumo',recordId:'SPN-105',name:'S. pneumoniae',short:'SP',color:'#b9d97e',hp:50,group:'그람양성'},
 {id:'mssa',recordId:'SAU-001',name:'S. aureus',short:'SA',color:'#a2d3b5',hp:58,group:'그람양성'},
 {id:'ecoli',recordId:'ECO-009',name:'E. coli',short:'EC',color:'#7dc9c4',hp:52,group:'그람음성'},
 {id:'klebs',recordId:'KPN-409',name:'K. pneumoniae',short:'KL',color:'#9dc9ae',hp:60,group:'그람음성'},
 {id:'mrsa',recordId:'SAU-002',name:'S. aureus',short:'MR',color:'#dc97b5',hp:73,group:'그람양성'},
 {id:'esbl',recordId:'ECO-010',name:'E. coli',short:'ES',color:'#d1b87c',hp:76,group:'그람음성'},
 {id:'esblk',recordId:'KPN-011',name:'K. pneumoniae',short:'EK',color:'#cbb07d',hp:80,group:'그람음성'},
 {id:'pseudo',recordId:'PAE-013',name:'P. aeruginosa',short:'PA',color:'#87b5e7',hp:77,speed:50,group:'그람음성'},
 {id:'kpc',recordId:'KPN-012',name:'K. pneumoniae',short:'KP',color:'#e59c7e',hp:101,group:'그람음성'},
 {id:'anaerobe',recordId:'BGX-515',name:'B. fragilis group',short:'BF',color:'#d4ad91',hp:64,group:'혐기성'},
 {id:'visa',recordId:'SAU-403',name:'S. aureus',short:'VI',color:'#bc81ae',hp:85,group:'그람양성'},
 {id:'lzdr',recordId:'SAU-404',name:'S. aureus',short:'LR',color:'#d48099',hp:85,group:'그람양성'}
]);
// Stage rosters are fully disclosed before deck selection. Numbers below are game balance.
export const STAGES=Object.freeze([
 {id:'first-line',name:'첫 방어선',mapId:'lung',hostId:'normal',enemies:['pneumo'],tag:'기초',waves:[4,5,6],hp:1,interval:2.1,budget:10},
 {id:'two-fronts',name:'엇갈린 감수성',mapId:'lung',hostId:'allergy',enemies:['pneumo','mssa'],tag:'복합 감염',waves:[5,6,7],hp:1.04,interval:1.65},
 {id:'urinary',name:'요로의 침입자',mapId:'urinary',hostId:'renal',enemies:['ecoli','klebs'],tag:'신기능 조정',waves:[5,7,8],hp:1.08,interval:1.5},
 {id:'abscess',name:'농양 깊숙이',mapId:'abdomen',hostId:'normal',enemies:['ecoli','anaerobe'],tag:'Source control',source:true,waves:[6,7,8],hp:1.1,interval:1.5},
 {id:'mrsa',name:'분홍빛 경보',mapId:'lung',hostId:'immune',enemies:['pneumo','mrsa'],tag:'MRSA',waves:[6,8,9],hp:1.14,interval:1.4},
 {id:'esbl',name:'새로운 기전',mapId:'urinary',hostId:'renal',enemies:['esbl','esblk'],tag:'ESBL',waves:[6,8,9],hp:1.17,interval:1.3},
 {id:'pseudomonas',name:'푸른 공세',mapId:'lung',hostId:'normal',enemies:['pseudo','mrsa'],tag:'Pseudomonas',waves:[7,8,10],hp:1.2,interval:1.25},
 {id:'deep-focus',name:'끝나지 않는 감염원',mapId:'abdomen',hostId:'immune',enemies:['esbl','anaerobe'],tag:'ESBL · 농양',source:true,waves:[7,9,10],hp:1.23,interval:1.2},
 {id:'kpc',name:'마지막 β-lactamase',mapId:'urinary',hostId:'renal',enemies:['kpc','pseudo'],tag:'KPC',waves:[7,9,10],hp:1.25,interval:1.2},
 {id:'visa',name:'다시 읽는 AST',mapId:'lung',hostId:'immune',enemies:['visa','pseudo'],tag:'VISA',waves:[8,9,11],hp:1.25,interval:1.15},
 {id:'switch',name:'반대편 빈틈',mapId:'lung',hostId:'allergy',enemies:['lzdr','esblk'],tag:'LZD 내성',waves:[8,10,11],hp:1.28,interval:1.1},
 {id:'last-front',name:'최후의 방어선',mapId:'abdomen',hostId:'normal',enemies:['kpc','mrsa','anaerobe'],tag:'복합 내성 · 농양',source:true,waves:[9,11,12],hp:1.3,interval:1.05}
].map((s,i)=>Object.freeze({number:i+1,ecoTarget:[12,18,14,18,18,24,24,24,28,24,26,30][i],budget:DECK_BUDGET,...s,enemies:Object.freeze(s.enemies),waves:Object.freeze(s.waves)})));
export const UNIT_RULES=Object.freeze({
 ampicillin:{points:1,cooldown:2.8,speed:63,range:132,lifetime:33},
 amoxclav:{points:2,cooldown:3.6,speed:60,range:140,lifetime:35},
 cefazolin:{points:1,cooldown:3.2,speed:65,range:130,lifetime:34},
 ceftriaxone:{points:2,cooldown:4.2,speed:58,range:190,lifetime:36},
 metronidazole:{points:1,cooldown:3.1,speed:62,range:150,lifetime:34},
 cefepime:{points:3,cooldown:4.8,speed:61,range:175,lifetime:36},
 vancomycin:{points:3,cooldown:5.4,speed:57,range:160,lifetime:38},
 linezolid:{points:3,cooldown:4.9,speed:64,range:185,lifetime:36},
 meropenem:{points:4,cooldown:6.2,speed:59,range:170,lifetime:38},
 ceftazavi:{points:5,cooldown:6.6,speed:58,range:180,lifetime:39}
});
export const EXTRA_SOURCES=Object.freeze([
 {title:'EUCAST · S / I / R 정의',url:'https://www.eucast.org/bacteria/clinical-breakpoints-and-interpretation/definition-of-s-i-and-r/'},
 {title:'IDSA 2026 · ESBL / CRE / Pseudomonas',url:'https://www.idsociety.org/practice-guideline/amr-guidance/'},
 {title:'IDSA · 복강 감염·source control',url:'https://www.idsociety.org/practice-guideline/intra-abdominal-infections/'},
 {title:'IDSA · 카테터 연관 요로 감염',url:'https://academy.idsociety.org/sites/default/files/Diagnosis%2C%20Prevention%20and%20Treatment%20of%20Catheter%20-%20Associated%20UTI%20in%20Adults.pdf'},
 {title:'AAAAI · Drug allergy practice parameter 2022',url:'https://www.aaaai.org/Aaaai/media/Media-Library-PDFs/Allergist%20Resources/Statements%20and%20Practice%20Parameters/Drug-Allergy-2022.pdf'}
]);
export function createDefenseCatalog(database,sources={}) {
 const drugs=DRUG_SPECS.map(spec=>{
  const original=database.drugs.find(drug=>drug.id===spec.id);
  if(!original)throw new Error('Missing defense drug: '+spec.id);
  return Object.freeze({...original,...spec,...UNIT_RULES[spec.id]});
 });
 const pathogens=PROFILE_SPECS.map(spec=>{
  const record=database.records.find(record=>record.id===spec.recordId);
  if(!record)throw new Error('Missing defense isolate: '+spec.recordId);
  const ast=Object.freeze(Object.fromEntries(drugs.map(drug=>{
   const entry=record.susceptibility[drug.id];
   return [drug.id,entry?Object.freeze({...entry,sourceIds:Object.freeze([...(entry.sourceIds||[])])}):null];
  })));
  return Object.freeze({...spec,speed:(spec.speed||45)*1.8,phenotype:record.phenotype,ast,record});
 });
 return Object.freeze({drugs:Object.freeze(drugs),pathogens:Object.freeze(pathogens),drugById:Object.freeze(Object.fromEntries(drugs.map(d=>[d.id,d]))),pathogenById:Object.freeze(Object.fromEntries(pathogens.map(p=>[p.id,p]))),sources});
}