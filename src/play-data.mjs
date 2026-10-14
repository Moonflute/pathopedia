import { DRUG_SPECS } from './defense-data.mjs';
import {buildFacility} from './play-map.mjs';

// Arcade tuning only. Every drug, isolate and susceptibility entry joins the encyclopedia.
export const WEAPONS = Object.freeze([
  {id:'ampicillin',mode:'auto',fireLabel:'연사',recoil:0.55,charge:.28,short:'AMP',role:'NARROW / REPEATER',damage:22,interval:.19,cost:7,pressure:.08,range:15,spread:.065,exposure:0,beta:true,renal:true,stage:0,magazine:18,reload:0.95},
  {id:'cefazolin',mode:'scatter',fireLabel:'5발 산탄',recoil:1.55,charge:.28,short:'CFZ',role:'FOCUSED / SCATTER',damage:52,interval:.55,cost:17,pressure:.25,range:9,spread:.16,exposure:1,beta:true,renal:true,stage:0,magazine:6,reload:1.15},
  {id:'ceftriaxone',mode:'charge',fireLabel:'충전 정밀탄',recoil:1.35,charge:.28,short:'CRO',role:'BROAD / PRECISION',damage:65,interval:.72,cost:19,pressure:1.7,range:22,spread:.045,exposure:0,beta:true,stage:0,magazine:6,reload:1.1},
  {id:'vancomycin',mode:'pulse',fireLabel:'중량 펄스',recoil:1.8,charge:.28,short:'VAN',role:'SPECIALIST / PULSE',damage:78,interval:.82,cost:24,pressure:.5,range:11,spread:.13,exposure:0,renal:true,stage:0,magazine:5,reload:1.3},
  {id:'meropenem',mode:'burst',fireLabel:'3점사',recoil:0.85,charge:.28,short:'MEM',role:'BROAD / RAPID',damage:35,interval:.23,cost:12,pressure:2.8,range:18,spread:.075,exposure:0,beta:true,renal:true,stage:0,magazine:20,reload:1.2},
  {id:'levofloxacin',mode:'rail',fireLabel:'직선 관통',recoil:1.15,charge:.28,short:'LEV',color:'#91b8e8',role:'INTRACELLULAR / RAIL',damage:72,interval:.65,cost:16,pressure:1.3,range:24,spread:.055,exposure:0,renal:true,intracellular:true,stage:2,magazine:7,reload:1.05},
  {id:'metronidazole',mode:'pulse',fireLabel:'확산 펄스',recoil:1.5,charge:.28,short:'MTZ',role:'ANAEROBE / BURST',damage:90,interval:.6,cost:16,pressure:.12,range:12,spread:.14,exposure:0,stage:3,magazine:5,reload:1.15},
  {id:'linezolid',mode:'beam',fireLabel:'지속 빔',recoil:0.18,charge:.28,short:'LZD',role:'GRAM+ / BEAM',damage:15.333,interval:.11,cost:4,pressure:.2,range:19,spread:.07,exposure:0,stage:5,magazine:36,reload:1.05},
  {id:'ceftazavi',mode:'charge',fireLabel:'억제제 충전탄',recoil:1.4,charge:.28,short:'CZA',role:'KPC / INHIBITOR',damage:82,interval:.62,cost:21,pressure:2.5,range:20,spread:.07,exposure:0,beta:true,renal:true,stage:6,magazine:6,reload:1.2},
  {id:'ganciclovir',mode:'pulse',fireLabel:'억제 펄스',recoil:0.8,charge:.28,short:'GCV',color:'#7dd8df',role:'ANTIVIRAL / PULSE',damage:58,interval:.4,cost:14,pressure:.1,range:20,spread:.09,renal:true,stage:5,magazine:8,reload:1.05},
  {id:'ivermectin',mode:'rail',fireLabel:'유충 관통탄',recoil:1.2,charge:.28,short:'IVM',color:'#e8c878',role:'ANTIPARASITIC / BURST',damage:90,interval:.65,cost:18,pressure:.05,range:14,spread:.15,stage:6,magazine:6,reload:1.1},
  {id:'acyclovir',mode:'burst',fireLabel:'3점사',recoil:0.7,charge:.28,short:'ACV',color:'#bda1ed',role:'ANTIVIRAL / BURST',damage:52,interval:.32,cost:12,pressure:.05,range:20,spread:.08,renal:true,stage:8,magazine:10,reload:1}
]);
export const ENEMIES = Object.freeze([
  {id:'pneumo',recordId:'SPN-105',short:'S. pneumoniae',gram:'Gram-positive diplococci',shape:'diplo',color:'#b293e6',hp:64,shield:30,speed:1.1,damage:7,trait:'CAPSULE'},
  {id:'mssa',recordId:'SAU-001',short:'S. aureus',gram:'Gram-positive cocci',shape:'cluster',color:'#ae87dc',hp:85,shield:0,speed:1.25,damage:8,trait:'RUSH'},
  {id:'ecoli',recordId:'ECO-009',short:'E. coli',gram:'Gram-negative rod',shape:'rod',color:'#ed9bbe',hp:62,shield:0,speed:1.6,damage:6,trait:'FLANK'},
  {id:'mrsa',recordId:'SAU-002',short:'S. aureus',gram:'Gram-positive cocci',shape:'cluster',color:'#ae87dc',hp:122,shield:0,speed:1.15,damage:10,resistant:true,trait:'MRSA'},
  {id:'esbl',recordId:'ECO-010',short:'E. coli',gram:'Gram-negative rod',shape:'rod',color:'#ed9bbe',hp:110,shield:0,speed:1.3,damage:9,resistant:true,ranged:true,trait:'ESBL'},
  {id:'klebs',recordId:'KPN-409',short:'K. pneumoniae',gram:'Gram-negative rod',shape:'rod',color:'#e6a2c3',hp:85,shield:44,speed:.95,damage:9,trait:'CAPSULE'},
  {id:'pseudo',recordId:'PAE-013',short:'P. aeruginosa',gram:'Gram-negative rod',shape:'rod',color:'#65cf88',hp:105,shield:0,speed:1.3,damage:9,ranged:true,biofilm:true,trait:'BIOFILM'},
  {id:'mdr',recordId:'PAE-014',short:'P. aeruginosa',gram:'Gram-negative rod',shape:'rod',color:'#65cf88',hp:140,shield:0,speed:1.35,damage:11,ranged:true,biofilm:true,resistant:true,trait:'DTR / MDR'},
  {id:'kpc',recordId:'KPN-012',short:'K. pneumoniae',gram:'Gram-negative rod',shape:'rod',color:'#e6a2c3',hp:155,shield:48,speed:.95,damage:12,resistant:true,trait:'CRE / KPC'},
  {id:'vre',recordId:'EFM-008',short:'E. faecium',gram:'Gram-positive cocci',shape:'diplo',color:'#b293e6',hp:125,shield:0,speed:1.25,damage:10,resistant:true,trait:'VRE'},
  {id:'legionella',recordId:'BGX-501',short:'L. pneumophila',gram:'Gram-negative rod',shape:'rod',color:'#ed9bbe',hp:105,shield:0,speed:1.1,damage:8,ranged:true,intracellular:true,regimenSites:['lung'],trait:'INTRACELLULAR'},
  {id:'anaerobe',recordId:'BGX-515',short:'B. fragilis group',gram:'Anaerobic Gram-negative rod',shape:'rod',color:'#a8adb6',hp:110,shield:0,speed:1.05,damage:9,regimenSites:['abdomen'],trait:'ANAEROBE'},
  {id:'clostridium',recordId:'CPE-122',short:'C. perfringens',gram:'Spore-forming Gram-positive rod',shape:'rod',color:'#a8adb6',hp:98,shield:0,speed:1.2,damage:8,spore:true,toxin:true,trait:'SPORE / TOXIN'},
  {id:'cmv',recordId:'CMV-804',short:'Cytomegalovirus',gram:'Enveloped DNA virus',shape:'virus',color:'#80d5df',hp:130,shield:0,speed:1,damage:9,ranged:true,viral:true,regimenScenarios:['cmv-retinitis'],scenarioLabel:'진행 HIV 성인의 CMV 망막염',trait:'VIRAL REPLICATION'},
  {id:'strongyloides',recordId:'SST-715',short:'S. stercoralis',gram:'Nematode larva',shape:'worm',color:'#e5c18b',hp:150,shield:0,speed:1.5,damage:10,parasite:true,helminth:true,regimenScenarios:['strongyloidiasis'],scenarioLabel:'Strongyloidiasis 치료 사례',trait:'LARVAL MIGRATION'},
  {id:'hsv',recordId:'HSV-802',short:'HSV-2',gram:'Enveloped DNA virus',shape:'virus',color:'#b8a1ed',hp:90,shield:0,speed:1.2,damage:7,viral:true,regimenScenarios:['first-genital-herpes'],scenarioLabel:'면역정상 성인의 첫 임상 생식기헤르페스',trait:'VIRAL REPLICATION'},
  {id:'giardia',recordId:'GLA-706',short:'G. duodenalis',gram:'Flagellated protozoan',shape:'flagellate',color:'#c6dca1',hp:85,shield:0,speed:1.4,damage:6,parasite:true,regimenScenarios:['giardiasis'],scenarioLabel:'증상성 giardiasis',trait:'FLAGELLAR DODGE'}
]);
// Host-support abstractions, separate from drug coverage. See docs/play-prototype.md.
export const COMPANIONS=Object.freeze([
 {id:'neutrophil',name:'호중구',short:'NEU',color:'#d9d3f0',role:'세균 근접 연사',text:'교전 중인 세균에 빠른 포식 펄스. 캡슐·biofilm에는 약해지고 호중구 감소 시 발사 간격이 늘어납니다.',range:4,interval:1.3,damage:14},
 {id:'macrophage',name:'대식세포',short:'MAC',color:'#9fd7bc',role:'약해진 세균 마무리',text:'남은 체력이 적은 세균부터 느리고 강한 포식 공격. 세포내 장벽·캡슐·biofilm은 피해를 줄입니다.',range:3.6,interval:2.5,damage:30},
 {id:'nk',name:'NK세포',short:'NK',color:'#9dceed',role:'바이러스 감염세포 견제',text:'바이러스 표적으로 표현된 감염세포를 공격하고 복제를 잠시 억제합니다. 세균에는 발사하지 않습니다.',range:5,interval:2,damage:20},
 {id:'eosinophil',name:'호산구',short:'EOS',color:'#e7b4a0',role:'연충 유충 견제',text:'Strongyloides 유충에 과립 펄스와 짧은 감속. 원충인 Giardia에는 발사하지 않습니다.',range:4.5,interval:2.2,damage:24}
]);
export const HOSTS=Object.freeze([
  {id:'normal',name:'일반 숙주',note:'보존된 면역 기능 · 추가 운용 제한 없음'},
  {id:'neutropenia',name:'Neutropenia',note:'면역 패시브의 제거 주기 10초 → 24초'},
  {id:'renal',name:'Renal impairment',note:'신배설 약제 보급 회복 −25% · 신기능 맞춤 투여 보상으로 해소'},
  {id:'allergy',name:'Aminopenicillin allergy',note:'AMP 사용 불가 · 다른 β-lactam은 교차반응 평가를 마친 시나리오'}
]);
// Each stage constructs its small grid on entry. No stage texture/model downloads.
export const STAGES=Object.freeze([
  {id:'community',bossKind:'mssa',name:'COMMUNITY',label:'지역사회 감염',site:'community',count:12,pool:['pneumo','mssa','ecoli'],color:'#a8d798',note:'관측 데크와 계단으로 접근하고, 중간보스 제압 후 지름길을 여세요. 마지막 MSSA 군체를 제압하면 철수합니다.',source:'LOCAL FOCUS',modifier:'면역 보존',elite:0},
  {id:'uti',name:'URINARY TRACT',label:'카테터 연관 UTI',site:'urinary',count:14,pool:['ecoli','klebs','esbl'],color:'#91bfe6',note:'카테터의 biofilm 보호를 제거하세요. CFZ 요로 한정 결과가 적용됩니다.',source:'CATHETER',modifier:'요로 기원 판정 적용',elite:.04},
  {id:'pneumonia',name:'PNEUMONIA',label:'폐렴 구역',site:'lung',count:16,pool:['pneumo','mssa','legionella','klebs'],color:'#8ad1c0',note:'LEV 보급. Legionella는 세포내 표적이며 폐렴 요법 판정을 사용합니다.',source:'DRAINABLE FOCUS',modifier:'세포내 은신',elite:.05},
  {id:'abdomen',name:'ABDOMINAL',label:'복강 내 감염',site:'abdomen',count:18,pool:['anaerobe','ecoli','esbl','clostridium'],color:'#d8b587',note:'MTZ 보급. 혐기성균과 장내세균의 대응 약제를 전환하고 농양을 배액하세요.',source:'ABSCESS',modifier:'혐기성 · 잔류 독소',elite:.07},
  {id:'hospital',bossKind:'pseudo',name:'HOSPITAL',label:'병원 획득 감염',site:'lung',count:18,pool:['mrsa','pseudo','esbl','klebs','mssa'],color:'#9eb5ce',note:'녹농균은 주변 적을 보호합니다. 가까이서 F로 biofilm을 해체하세요.',source:'DEVICE BIOFILM',modifier:'이동성 biofilm 보호',elite:.08},
  {id:'icu',name:'ICU',label:'중환자실',site:'bloodstream',count:20,pool:['vre','mrsa','pseudo','esbl','cmv','ecoli','klebs'],scenarios:['cmv-retinitis'],color:'#bba2d7',note:'LZD·GCV 보급. VRE와 후기 바이러스 사례: 진행 HIV 성인의 CMV 망막염.',source:'INFECTED LINE',modifier:'면역 제거 주기 연장',immuneDelay:1.5,elite:.1},
  {id:'outbreak',name:'RESISTANT OUTBREAK',label:'내성균 집단 발생',site:'bloodstream',count:22,pool:['kpc','mdr','vre','mrsa','strongyloides','ecoli','mssa','klebs'],scenarios:['strongyloidiasis'],color:'#e3a383',note:'CZA·IVM 보급. KPC·DTR AST와 후기 기생충 사례: Strongyloidiasis.',source:'OUTBREAK FOCUS',modifier:'CRE · DTR · VRE',elite:.14},
  {id:'sepsis',name:'SEPSIS / CORE',label:'패혈증 봉쇄 작전',site:'bloodstream',count:24,pool:['kpc','mdr','vre','mrsa','esbl','cmv','strongyloides','ecoli','mssa','klebs'],scenarios:['cmv-retinitis','strongyloidiasis'],color:'#de947f',note:'일반 감수성균도 섞여 있습니다. 모든 적과 KPC 군체 보스를 제압하고 EXIT로 탈출하세요.',source:'SEPTIC FOCUS',modifier:'감염원 연동 보스',boss:true,elite:.16}
]);
export const WAVES=STAGES;
// Independent case collections, not difficulty tiers or new campaign end stages.
export const THEME_STAGES=Object.freeze([
 {id:'virology',name:'VIRAL OBSERVATORY',label:'바이러스 연구동',site:'community',count:14,pool:['hsv','cmv','hsv','cmv','mssa','ecoli'],scenarios:['first-genital-herpes','cmv-retinitis'],color:'#a9b8ed',theme:3,mapStyle:2,note:'서로 다른 임상 사례를 모은 연구동. ACV·GCV로 감염세포의 복제를 억제하고 세균은 별도 약제로 대응하세요.',source:'REPLICATION FOCUS',modifier:'바이러스 사례 · 자동 복제',elite:0,loadout:['acyclovir','ganciclovir','ampicillin','cefazolin','ceftriaxone','vancomycin','meropenem','levofloxacin','metronidazole'],companion:'nk'},
 {id:'parasitology',name:'PARASITE CONSERVATORY',label:'기생충 온실',site:'abdomen',count:14,pool:['giardia','strongyloides','giardia','strongyloides','ecoli','anaerobe'],scenarios:['giardiasis','strongyloidiasis'],color:'#c4d49d',theme:0,mapStyle:3,note:'별도 장내감염 사례를 모은 온실. Giardia 원충은 MTZ, Strongyloides 유충은 IVM으로 구분해 대응하세요.',source:'TRANSMISSION FOCUS',modifier:'원충 · 연충의 다른 대응',elite:0,loadout:['metronidazole','ivermectin','ampicillin','cefazolin','ceftriaxone','vancomycin','meropenem','levofloxacin','linezolid'],companion:'eosinophil'}
]);
export const stageFor=run=>run.mission==='theme'?(THEME_STAGES.find(s=>s.id===run.themeId)||THEME_STAGES[0]):STAGES[run.wave];
export const REWARDS=Object.freeze([
  {id:'infusion',title:'Extended infusion',tag:'PK / PD',text:'β-lactam 유효 명중 후 1.6초 지속 노출. 해당 약제 I 노출 조건 충족. R은 유지.',max:1},
  {id:'exposure',title:'Exposure optimization',tag:'PK / PD',text:'증가 노출이 필요한 I 판정의 투여 조건 충족. 모든 계열의 원본 R 판정은 유지.',max:1},
  {id:'immune',title:'건강한 면역계',tag:'HOST',text:'주변의 약한 기본형을 주기적으로 정리. 캡슐·biofilm·내성형·휴면 포자는 제외.',max:1},
  {id:'scanner',title:'Rapid diagnostics',tag:'LAB',text:'한 번에 두 단계 검사. 형태 → 배양 → AST 검사 가속. 검사하는 동안에도 이동 가능.',max:1},
  {id:'stewardship',title:'De-escalation',tag:'ECOLOGY',text:'선택압 −35. 좁은 범위 약제 처치의 선택압 감소 강화.'},
  {id:'efficiency',title:'투여 효율 최적화',tag:'RESOURCE',text:'약제 소모 −20%. 감수성 범위는 유지. 최대 3회.',max:3},
  {id:'reserve',title:'확장 보급 카트리지',tag:'AMMO',text:'모든 약제 최대 보유량 +60, 전량 보급. 최대 3회.',max:3},
  {id:'rate',title:'투여 간격 최적화',tag:'HANDLING',text:'유효 사격 간격 −14%. 더 빠르게 대응하되 소모와 선택압도 발생. 최대 3회.',max:3},
  {id:'penetration',title:'Biofilm penetration',tag:'EXPOSURE',text:'활성 약제의 biofilm 내 전달 효율 증가. F 감염원 제거와 함께 사용.',max:1},
  {id:'support',title:'Host stabilization',tag:'SUPPORT',text:'구역 전환 시 체력 +50. 다음 구역을 위한 숙주 안정화 보급.'},
  {id:'source',title:'Source control kit',tag:'PROCEDURE',text:'제거 범위 확대 · F 대기 단축 · 체력 +35. 보호막과 오염원을 직접 처리.'},
  {id:'renal',title:'신기능 맞춤 투여',tag:'HOST / PK',text:'신기능 저하의 약제 회복 불이익 해소. 원래 coverage와 목표 노출 유지.',max:1,host:'renal'},
  {id:'mobility',title:'신속 대응 프로토콜',tag:'MOVEMENT',text:'대시 재사용 2.2초 → 1.3초. 좁은 방에서 독소와 공격을 피하세요.',max:1},
  {id:'unlock_levofloxacin',title:'Levofloxacin 보급',tag:'NEW WEAPON',text:'LEV 조기 해금. 세포내 표적에 도달하는 장거리 무기.',weapon:'levofloxacin',max:1},
  {id:'unlock_metronidazole',title:'Metronidazole 보급',tag:'NEW WEAPON',text:'MTZ 조기 해금. 혐기성 표적에 집중된 burst 무기.',weapon:'metronidazole',max:1},
  {id:'unlock_linezolid',title:'Linezolid 보급',tag:'NEW WEAPON',text:'LZD 조기 해금. VRE·MRSA에 대응하는 빠른 beam 무기.',weapon:'linezolid',max:1},
  {id:'inhibitor',title:'Avibactam 조합',tag:'NEW WEAPON',text:'Ceftazidime–avibactam(CZA) 조기 해금. 조합 자체의 AST를 적용하며 다른 β-lactam을 강화하지 않음.',weapon:'ceftazavi',max:1},
  {id:'immuneBoost',title:'면역 동료 활성화',tag:'COMPANION',text:'장착한 면역 동료의 사거리와 공격 빈도 증가. 약제 AST와 동료의 대상 종류는 유지.',max:3},
  ...COMPANIONS.map(c=>({id:'ally_'+c.id,title:c.name+' 합류',tag:'COMPANION',text:c.role+' · 동료를 획득하고 즉시 장착합니다. 일시정지 메뉴에서 교체 가능.',companion:c.id,max:1}))
]);
export function createPlayCatalog(database,library={}){
  const weapons=WEAPONS.map(spec=>{const original=database.drugs.find(d=>d.id===spec.id);if(!original)throw Error('Missing Play drug: '+spec.id);return {...original,...spec,color:spec.color||DRUG_SPECS.find(d=>d.id===spec.id)?.color||'#9cbbbf'};});
  const enemies=ENEMIES.map(spec=>{const record=database.records.find(r=>r.id===spec.recordId);if(!record)throw Error('Missing Play isolate: '+spec.recordId);return {...spec,name:record.organism,phenotype:record.phenotype,record,ast:record.susceptibility,therapies:Object.values(library.therapyContexts||{}).filter(c=>c.recordIds.includes(record.id))};});
  return {weapons,enemies,sources:library.sources||{},weaponById:Object.fromEntries(weapons.map(w=>[w.id,w])),enemyById:Object.fromEntries(enemies.map(e=>[e.id,e]))};
}
// Seeded room placement, a spanning tree, then extra links for flanking routes.
// Inspired by Bob Nystrom's Rooms and Mazes article; original implementation, no runtime dependency.
export function normalizeSeed(value=Date.now()){
  if(typeof value==='number')return value>>>0;
  const text=String(value).trim();if(!text)return Date.now()>>>0;if(/^\d+$/.test(text))return Number(text)>>>0;
  let hash=2166136261;for(const c of text)hash=Math.imul(hash^c.codePointAt(0),16777619);return hash>>>0;
}
export function seededRandom(seed){let s=normalizeSeed(seed);return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function roomAt(map,x,y){const ix=Math.max(0,Math.min(map.width-1,Math.floor(x))),iy=Math.max(0,Math.min(map.height-1,Math.floor(y)));return map.roomCells[iy*map.width+ix];}
// Facility sectors are authored in play-map.mjs; seeds alter approaches and dimensions.
// Ordered adjacent sectors alternate combat and supply without a pillar maze.
export function createMap(stageIndex=0,seed=31,themeStage=null){
 const stage=themeStage||STAGES[stageIndex]||STAGES[0],value=normalizeSeed(seed);
 return buildFacility(stage,stageIndex,value,seededRandom(value^Math.imul(stageIndex+1,0x9e3779b9)));
}

// Optional CC0 audio; only the selected track is fetched after MUSIC is enabled.
export const MUSIC_TRACKS=Object.freeze([
 {id:'hallow',file:'hallow-quest-8bit.ogg',name:'Hallow Quest',mood:'긴장 / 8-bit',author:'Zane Little Music',source:'https://opengameart.org/content/spooky-action-loop-hallow-quest'},
 {id:'fields',file:'flowerbed-fields.ogg',name:'Flowerbed Fields',mood:'밝은 탐험',author:'Zane Little Music',source:'https://opengameart.org/content/flowerbed-fields-loop'},
 {id:'honey',file:'honey-bear.ogg',name:'Honey Bear',mood:'차분 / 휴식',author:'TinyWorlds',source:'https://opengameart.org/content/honey-bear'},
 {id:'shrine',file:'dark-shrine.ogg',name:'Dark Shrine',mood:'불길한 실험실',author:'qubodup / yd',source:'https://opengameart.org/content/dark-shrine-loop'},
 {id:'battle',file:'chiptune-battle.ogg',name:'Chiptune Battle',mood:'전투 / 생존',author:'pmiller',source:'https://opengameart.org/content/chiptune-battle-music'}
]);
export const AUGMENTS=Object.freeze([
 {id:'immuneEcho',title:'연계 면역 반응',tag:'COMPANION / CHAIN',text:'면역 동료가 같은 대상군의 두 번째 표적에 추가 공격합니다. 벽 뒤·미교전 표적은 제외.',requiresCompanion:true,max:2},
 {id:'isolationTrail',title:'격리 잔상',tag:'DASH / CONTROL',text:'대시 출발점에 3초 감속 구역을 남깁니다. 추격을 끊고 약제를 바꿀 공간을 만드세요.',max:3},
 {id:'cephaPulse',title:'Cephalosporin 위성',tag:'AUTO / CRO',text:'주변에 CRO 펄스. 감수성·노출·부위 조건을 충족한 적만 공격하고 선택압이 증가합니다.',max:5},
 {id:'isolation',title:'격리 구역',tag:'CONTROL',text:'주변 3m에 감속장을 전개합니다. 강화 시 범위와 감속이 증가합니다.',max:4},
 {id:'magnet',title:'검체 수집 드론',tag:'PICKUP',text:'경험치 흡수 범위를 넓힙니다. 벽 뒤의 검체는 통과하지 않습니다.',max:4},
 {id:'fastReload',title:'신속 교체 장치',tag:'RELOAD',text:'탄창 교체가 더 빨라집니다. 원래 감수성은 바뀌지 않습니다.',max:4},
 {id:'recovery',title:'회복 프로토콜',tag:'HOST',text:'지속적인 숙주 회복. 호중구 감소 숙주는 회복 주기가 길어집니다.',max:4},
 {id:'grenadier',title:'환경 소독 장비',tag:'THROWABLE',text:'소독탄 +2, 소독장 범위와 지속시간 증가. 휴면 포자·기생충에는 효과가 없습니다.',max:4},
 {id:'exposure',title:'노출 최적화',tag:'PK / PD',text:'I 판정의 증가 노출 조건을 충족합니다. R은 유지됩니다.',max:1},
 {id:'infusion',title:'Extended infusion',tag:'PK / PD',text:'유효한 β-lactam 사격에 지속 노출을 더합니다. R에는 효과가 없습니다.',max:1},
 {id:'rate',title:'자동 주입 장치',tag:'FIRE RATE',text:'약제 사격 간격 감소. 선택압과 탄창은 계속 관리해야 합니다.',max:5},
 {id:'efficiency',title:'투여 효율',tag:'RESOURCE',text:'한 발에 소모하는 약제량 감소. 탄창과 예비 약제를 더 오래 사용합니다.',max:5},
 {id:'support',title:'숙주 안정화',tag:'SUPPORT',text:'체력 +50. 생존 장비는 유지하고 즉시 회복합니다.'},
 {id:'reserve',title:'예비 약제 보급',tag:'SUPPLY',text:'예비 약제 용량 +60 및 모든 약제 충전. 소독탄도 1개 보급합니다.'},
 {id:'stewardship',title:'항생제 관리',tag:'PRESSURE',text:'선택압 −35 · 체력 +20. 좁은 약제로 처치하면 선택압이 더 감소합니다.'},
 ...REWARDS.filter(r=>r.companion||r.id==='immuneBoost')
]);
// Survival is a mixed-case arena: regimen targets retain explicitly authored contexts.
export const SURVIVAL_CASES=Object.freeze({legionella:{site:'lung',scenarios:[]},anaerobe:{site:'abdomen',scenarios:[]},cmv:{site:'bloodstream',scenarios:['cmv-retinitis']},strongyloides:{site:'bloodstream',scenarios:['strongyloidiasis']}});
export function createSurvivalMap(seed){
 const map=createMap(4,seed),random=seededRandom(normalizeSeed(seed)^0x51a7f0),w=map.width,h=map.height;
 // Connected wings and a broad central commons: three circulation routes, no pillar maze.
 const commons={id:map.rooms.length,name:'COMMONS',label:'06',x:27,y:19,bounds:{x:13,y:16,w:27,h:7},type:'hall',encounter:true,neighbors:[1,2,3,4]};
 map.rooms.push(commons);
 for(let y=16;y<23;y++)for(let x=13;x<41;x++){const i=y*w+x;map.cells[i]=0;map.roomCells[i]=commons.id;map.lights[i]=.85;map.ceilings[i]=1.8;}
 for(const gate of map.shortcuts){gate.open=true;for(const i of gate.cells)map.cells[i]=0;}
 for(let y=12;y<28;y++)for(let x=20;x<24;x++)map.cells[y*w+x]=0;
 map.id='survival-'+normalizeSeed(seed);map.name='ENDLESS / MIXED CASES';map.layout='COMMONS / 3 ROUTES';map.site='bloodstream';map.scenarios=[];map.sources=[];map.boss=null;map.miniboss=null;
 const spots=[];for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++)if(!map.cells[y*w+x]&&x>=9)spots.push({x:x+.5,y:y+.5,room:map.roomCells[y*w+x]});
 for(let i=spots.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]];}map.spawnSpots=spots;
 map.pickups=[{x:5.5,y:2.5,kind:'supply'},{...spots[0],kind:'companion'},...spots.filter((_,i)=>i%Math.max(1,Math.floor(spots.length/8))===0).slice(0,8).map((p,i)=>({...p,kind:i%2?'health':'supply'}))].map((p,id)=>({...p,id,active:true,cooldown:0}));return map;
}
