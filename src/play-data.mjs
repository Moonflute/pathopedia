import { DRUG_SPECS } from './defense-data.mjs';

// Arcade tuning only. Every drug, isolate and susceptibility entry joins the encyclopedia.
export const WEAPONS = Object.freeze([
  {id:'ampicillin',short:'AMP',role:'NARROW / REPEATER',damage:22,interval:.19,cost:7,pressure:.08,range:15,spread:.065,exposure:0,beta:true,renal:true,stage:0},
  {id:'cefazolin',short:'CFZ',role:'FOCUSED / SCATTER',damage:52,interval:.55,cost:17,pressure:.25,range:9,spread:.16,exposure:1,beta:true,renal:true,stage:0},
  {id:'ceftriaxone',short:'CRO',role:'BROAD / PRECISION',damage:65,interval:.72,cost:19,pressure:1.7,range:22,spread:.045,exposure:0,beta:true,stage:0},
  {id:'vancomycin',short:'VAN',role:'SPECIALIST / PULSE',damage:78,interval:.82,cost:24,pressure:.5,range:11,spread:.13,exposure:0,renal:true,stage:0},
  {id:'meropenem',short:'MEM',role:'BROAD / RAPID',damage:35,interval:.23,cost:12,pressure:2.8,range:18,spread:.075,exposure:0,beta:true,renal:true,stage:0},
  {id:'levofloxacin',short:'LEV',color:'#91b8e8',role:'INTRACELLULAR / RAIL',damage:72,interval:.65,cost:16,pressure:1.3,range:24,spread:.055,exposure:0,renal:true,intracellular:true,stage:2},
  {id:'metronidazole',short:'MTZ',role:'ANAEROBE / BURST',damage:90,interval:.6,cost:16,pressure:.12,range:12,spread:.14,exposure:0,stage:3},
  {id:'linezolid',short:'LZD',role:'GRAM+ / BEAM',damage:46,interval:.33,cost:12,pressure:.6,range:19,spread:.07,exposure:0,stage:5},
  {id:'ceftazavi',short:'CZA',role:'KPC / INHIBITOR',damage:82,interval:.62,cost:21,pressure:2.5,range:20,spread:.07,exposure:0,beta:true,renal:true,stage:6}
]);
export const ENEMIES = Object.freeze([
  {id:'pneumo',recordId:'SPN-105',short:'S. pneumoniae',gram:'Gram-positive diplococci',shape:'diplo',color:'#b9d97e',hp:64,shield:30,speed:1.1,damage:7,trait:'CAPSULE'},
  {id:'mssa',recordId:'SAU-001',short:'S. aureus',gram:'Gram-positive cocci',shape:'cluster',color:'#a2d3b5',hp:85,shield:0,speed:1.25,damage:8,trait:'RUSH'},
  {id:'ecoli',recordId:'ECO-009',short:'E. coli',gram:'Gram-negative rod',shape:'rod',color:'#7dc9c4',hp:62,shield:0,speed:1.6,damage:6,trait:'FLANK'},
  {id:'mrsa',recordId:'SAU-002',short:'S. aureus',gram:'Gram-positive cocci',shape:'cluster',color:'#dc97b5',hp:122,shield:0,speed:1.15,damage:10,resistant:true,trait:'MRSA'},
  {id:'esbl',recordId:'ECO-010',short:'E. coli',gram:'Gram-negative rod',shape:'rod',color:'#d1b87c',hp:110,shield:0,speed:1.3,damage:9,resistant:true,ranged:true,trait:'ESBL'},
  {id:'klebs',recordId:'KPN-409',short:'K. pneumoniae',gram:'Gram-negative rod',shape:'rod',color:'#9dc9ae',hp:85,shield:44,speed:.95,damage:9,trait:'CAPSULE'},
  {id:'pseudo',recordId:'PAE-013',short:'P. aeruginosa',gram:'Gram-negative rod',shape:'rod',color:'#87b5e7',hp:105,shield:0,speed:1.3,damage:9,ranged:true,biofilm:true,trait:'BIOFILM'},
  {id:'mdr',recordId:'PAE-014',short:'P. aeruginosa',gram:'Gram-negative rod',shape:'rod',color:'#ab8edc',hp:140,shield:0,speed:1.35,damage:11,ranged:true,biofilm:true,resistant:true,trait:'DTR / MDR'},
  {id:'kpc',recordId:'KPN-012',short:'K. pneumoniae',gram:'Gram-negative rod',shape:'rod',color:'#e59c7e',hp:155,shield:48,speed:.95,damage:12,resistant:true,trait:'CRE / KPC'},
  {id:'vre',recordId:'EFM-008',short:'E. faecium',gram:'Gram-positive cocci',shape:'diplo',color:'#d9a7c9',hp:125,shield:0,speed:1.25,damage:10,resistant:true,trait:'VRE'},
  {id:'legionella',recordId:'BGX-501',short:'L. pneumophila',gram:'Gram-negative rod',shape:'rod',color:'#96bce1',hp:105,shield:0,speed:1.1,damage:8,ranged:true,intracellular:true,regimenSites:['lung'],trait:'INTRACELLULAR'},
  {id:'anaerobe',recordId:'BGX-515',short:'B. fragilis group',gram:'Anaerobic Gram-negative rod',shape:'rod',color:'#d4ad91',hp:110,shield:0,speed:1.05,damage:9,regimenSites:['abdomen'],trait:'ANAEROBE'},
  {id:'clostridium',recordId:'CPE-122',short:'C. perfringens',gram:'Spore-forming Gram-positive rod',shape:'rod',color:'#deb081',hp:98,shield:0,speed:1.2,damage:8,spore:true,toxin:true,trait:'SPORE / TOXIN'}
]);
export const HOSTS=Object.freeze([
  {id:'normal',name:'일반 숙주',note:'보존된 면역 기능 · 추가 운용 제한 없음'},
  {id:'neutropenia',name:'Neutropenia',note:'면역 패시브의 제거 주기 10초 → 24초'},
  {id:'renal',name:'Renal impairment',note:'신배설 약제 보급 회복 −25% · 신기능 맞춤 투여 보상으로 해소'},
  {id:'allergy',name:'Aminopenicillin allergy',note:'AMP 사용 불가 · 다른 β-lactam은 교차반응 평가를 마친 시나리오'}
]);
// Each stage constructs its small grid on entry. No stage texture/model downloads.
export const STAGES=Object.freeze([
  {id:'community',name:'COMMUNITY',label:'지역사회 감염',site:'community',count:12,pool:['pneumo','mssa','ecoli'],color:'#a8d798',note:'근접 시야에서만 접촉 · 방을 하나씩 확보하세요.',source:'LOCAL FOCUS',modifier:'면역 보존',elite:0},
  {id:'uti',name:'URINARY TRACT',label:'카테터 연관 UTI',site:'urinary',count:14,pool:['ecoli','klebs','esbl'],color:'#91bfe6',note:'카테터의 biofilm 보호를 제거하세요. CFZ 요로 한정 결과가 적용됩니다.',source:'CATHETER',modifier:'요로 기원 판정 적용',elite:.04},
  {id:'pneumonia',name:'PNEUMONIA',label:'폐렴 구역',site:'lung',count:16,pool:['pneumo','mssa','legionella','klebs'],color:'#8ad1c0',note:'LEV 보급. Legionella는 세포내 표적이며 폐렴 요법 판정을 사용합니다.',source:'DRAINABLE FOCUS',modifier:'세포내 은신',elite:.05},
  {id:'abdomen',name:'ABDOMINAL',label:'복강 내 감염',site:'abdomen',count:18,pool:['anaerobe','ecoli','esbl','clostridium'],color:'#d8b587',note:'MTZ 보급. 혐기성균과 장내세균의 대응 약제를 전환하고 농양을 배액하세요.',source:'ABSCESS',modifier:'혐기성 · 잔류 독소',elite:.07},
  {id:'hospital',name:'HOSPITAL',label:'병원 획득 감염',site:'lung',count:18,pool:['mrsa','pseudo','esbl','klebs'],color:'#9eb5ce',note:'녹농균은 주변 적을 보호합니다. 가까이서 F로 biofilm을 해체하세요.',source:'DEVICE BIOFILM',modifier:'이동성 biofilm 보호',elite:.08},
  {id:'icu',name:'ICU',label:'중환자실',site:'bloodstream',count:20,pool:['vre','mrsa','pseudo','esbl'],color:'#bba2d7',note:'LZD 보급. 면역 저하 구역에서 VRE를 포함한 내성균에 대응하세요.',source:'INFECTED LINE',modifier:'면역 제거 주기 연장',immuneDelay:1.5,elite:.1},
  {id:'outbreak',name:'RESISTANT OUTBREAK',label:'내성균 집단 발생',site:'bloodstream',count:22,pool:['kpc','mdr','vre','mrsa'],color:'#e3a383',note:'CZA 보급. KPC와 DTR 녹농균은 고정 분리주의 AST로 판단하세요.',source:'OUTBREAK FOCUS',modifier:'CRE · DTR · VRE',elite:.14},
  {id:'sepsis',name:'SEPSIS / CORE',label:'패혈증 봉쇄 작전',site:'bloodstream',count:24,pool:['kpc','mdr','vre','mrsa','esbl'],color:'#de947f',note:'감염원 3곳과 KPC 군체 보스를 제거하고 EXIT로 복귀하세요.',source:'SEPTIC FOCUS',modifier:'감염원 연동 보스',boss:true,elite:.16}
]);
export const WAVES=STAGES;
export const REWARDS=Object.freeze([
  {id:'infusion',title:'Extended infusion',tag:'PK / PD',text:'β-lactam 유효 명중 후 1.6초 지속 노출. 해당 약제 I 노출 조건 충족. R은 유지.',max:1},
  {id:'exposure',title:'Exposure optimization',tag:'PK / PD',text:'증가 노출이 필요한 I 판정의 투여 조건 충족. 모든 계열의 원본 R 판정은 유지.',max:1},
  {id:'immune',title:'건강한 면역계',tag:'HOST',text:'주변의 약한 기본형을 주기적으로 정리. 캡슐·biofilm·내성형·휴면 포자는 제외.',max:1},
  {id:'scanner',title:'Rapid diagnostics',tag:'LAB',text:'한 번에 두 단계 검사. 형태 → 배양 → AST를 이동·사격 중 확인.',max:1},
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
  {id:'inhibitor',title:'Avibactam 조합',tag:'NEW WEAPON',text:'Ceftazidime–avibactam(CZA) 조기 해금. 조합 자체의 AST를 적용하며 다른 β-lactam을 강화하지 않음.',weapon:'ceftazavi',max:1}
]);
export function createPlayCatalog(database){
  const weapons=WEAPONS.map(spec=>{const original=database.drugs.find(d=>d.id===spec.id);if(!original)throw Error('Missing Play drug: '+spec.id);return {...original,...spec,color:spec.color||DRUG_SPECS.find(d=>d.id===spec.id)?.color||'#9cbbbf'};});
  const enemies=ENEMIES.map(spec=>{const record=database.records.find(r=>r.id===spec.recordId);if(!record)throw Error('Missing Play isolate: '+spec.recordId);return {...spec,name:record.organism,phenotype:record.phenotype,record,ast:record.susceptibility};});
  return {weapons,enemies,weaponById:Object.fromEntries(weapons.map(w=>[w.id,w])),enemyById:Object.fromEntries(enemies.map(e=>[e.id,e]))};
}
export function roomAt(map,x,y){return (y<8?0:y<14?1:2)*3+(x<8?0:x<17?1:2);}
export function createMap(stageIndex=0){
  const stage=STAGES[stageIndex]||STAGES[0],width=26,height=22,cells=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x===0||y===0||x===width-1||y===height-1)cells[y*width+x]=1;
  const wall=(x,y,w,h,type=1)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)cells[j*width+i]=type;};
  wall(8,1,1,20,2);wall(17,1,1,20,2);wall(1,8,24,1,3);wall(1,14,24,1,3);
  const variant=stageIndex%4;
  for(const x of [8,17])for(const y of [4+(variant%2),10+(variant===2?1:0),17+(variant===3?1:0)]){cells[y*width+x]=0;cells[(y+1)*width+x]=0;}
  for(const y of [8,14])for(const x of [4+(variant%2),12+(variant===2?1:0),21-(variant===3?1:0)]){cells[y*width+x]=0;cells[y*width+x+1]=0;}
  for(const [x,y,w,h] of [[4,5,2,1],[12,4,2,2],[21,11,2,1],[11,18,3,1],[4,18,2,1]])wall(x,y,w,h,1+(stageIndex%3));
  if(stageIndex%2)wall(19,2,1,3,2);if(stageIndex>3)wall(10,10,2,1,3);
  const rooms=Array.from({length:9},(_,id)=>({id,x:[4.5,12.5,21.5][id%3],y:[3.5,10.5,17.5][Math.floor(id/3)],label:String.fromCharCode(65+id)}));
  const sourcePositions=stage.boss?[[22.5,4.5],[21.5,18.5],[3.5,17.5]]:stageIndex%2?[[21.5,4.5],[3.5,17.5]]:[[22.5,4.5],[21.5,18.5]];
  return {id:stage.id,name:stage.name,site:stage.site,color:stage.color,width,height,cells,rooms,
    spawn:{x:3.5,y:3.5,angle:0},exit:{x:3.5,y:3.5},
    portals:rooms.map(r=>({x:r.x+1,y:r.y})),
    sources:sourcePositions.map(([x,y],id)=>({id,x,y,label:String.fromCharCode(65+id)+' / '+stage.source,active:true})),
    pickups:[{x:5.5,y:2.5,kind:'supply'},{x:12.5,y:7.5,kind:'health'},{x:22.5,y:6.5,kind:'supply'},{x:6.5,y:12.5,kind:'health'},{x:13.5,y:16.5,kind:'culture'},{x:19.5,y:16.5,kind:'supply'}].map((p,id)=>({...p,id,active:true,cooldown:0}))};
}
