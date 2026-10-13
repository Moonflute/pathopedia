import { DRUG_SPECS } from './defense-data.mjs';

// Arcade tuning only. Every drug, isolate and susceptibility entry joins the encyclopedia.
export const WEAPONS = Object.freeze([
  {id:'ampicillin',short:'AMP',role:'NARROW / REPEATER',damage:22,interval:.19,cost:7,pressure:.08,range:15,spread:.065,exposure:0,beta:true,renal:true,stage:0,magazine:18,reload:0.95},
  {id:'cefazolin',short:'CFZ',role:'FOCUSED / SCATTER',damage:52,interval:.55,cost:17,pressure:.25,range:9,spread:.16,exposure:1,beta:true,renal:true,stage:0,magazine:6,reload:1.15},
  {id:'ceftriaxone',short:'CRO',role:'BROAD / PRECISION',damage:65,interval:.72,cost:19,pressure:1.7,range:22,spread:.045,exposure:0,beta:true,stage:0,magazine:6,reload:1.1},
  {id:'vancomycin',short:'VAN',role:'SPECIALIST / PULSE',damage:78,interval:.82,cost:24,pressure:.5,range:11,spread:.13,exposure:0,renal:true,stage:0,magazine:5,reload:1.3},
  {id:'meropenem',short:'MEM',role:'BROAD / RAPID',damage:35,interval:.23,cost:12,pressure:2.8,range:18,spread:.075,exposure:0,beta:true,renal:true,stage:0,magazine:20,reload:1.2},
  {id:'levofloxacin',short:'LEV',color:'#91b8e8',role:'INTRACELLULAR / RAIL',damage:72,interval:.65,cost:16,pressure:1.3,range:24,spread:.055,exposure:0,renal:true,intracellular:true,stage:2,magazine:7,reload:1.05},
  {id:'metronidazole',short:'MTZ',role:'ANAEROBE / BURST',damage:90,interval:.6,cost:16,pressure:.12,range:12,spread:.14,exposure:0,stage:3,magazine:5,reload:1.15},
  {id:'linezolid',short:'LZD',role:'GRAM+ / BEAM',damage:46,interval:.33,cost:12,pressure:.6,range:19,spread:.07,exposure:0,stage:5,magazine:12,reload:1.05},
  {id:'ceftazavi',short:'CZA',role:'KPC / INHIBITOR',damage:82,interval:.62,cost:21,pressure:2.5,range:20,spread:.07,exposure:0,beta:true,renal:true,stage:6,magazine:6,reload:1.2},
  {id:'ganciclovir',short:'GCV',color:'#7dd8df',role:'ANTIVIRAL / PULSE',damage:58,interval:.4,cost:14,pressure:.1,range:20,spread:.09,renal:true,stage:5,magazine:8,reload:1.05},
  {id:'ivermectin',short:'IVM',color:'#e8c878',role:'ANTIPARASITIC / BURST',damage:90,interval:.65,cost:18,pressure:.05,range:14,spread:.15,stage:6,magazine:6,reload:1.1}
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
  {id:'strongyloides',recordId:'SST-715',short:'S. stercoralis',gram:'Nematode larva',shape:'worm',color:'#e5c18b',hp:150,shield:0,speed:1.5,damage:10,parasite:true,regimenScenarios:['strongyloidiasis'],scenarioLabel:'Strongyloidiasis 치료 사례',trait:'LARVAL MIGRATION'}
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
  {id:'icu',name:'ICU',label:'중환자실',site:'bloodstream',count:20,pool:['vre','mrsa','pseudo','esbl','cmv'],scenarios:['cmv-retinitis'],color:'#bba2d7',note:'LZD·GCV 보급. VRE와 후기 바이러스 사례: 진행 HIV 성인의 CMV 망막염.',source:'INFECTED LINE',modifier:'면역 제거 주기 연장',immuneDelay:1.5,elite:.1},
  {id:'outbreak',name:'RESISTANT OUTBREAK',label:'내성균 집단 발생',site:'bloodstream',count:22,pool:['kpc','mdr','vre','mrsa','strongyloides'],scenarios:['strongyloidiasis'],color:'#e3a383',note:'CZA·IVM 보급. KPC·DTR AST와 후기 기생충 사례: Strongyloidiasis.',source:'OUTBREAK FOCUS',modifier:'CRE · DTR · VRE',elite:.14},
  {id:'sepsis',name:'SEPSIS / CORE',label:'패혈증 봉쇄 작전',site:'bloodstream',count:24,pool:['kpc','mdr','vre','mrsa','esbl','cmv','strongyloides'],scenarios:['cmv-retinitis','strongyloidiasis'],color:'#de947f',note:'감염원 3곳과 KPC 군체 보스를 제거하고 EXIT로 복귀하세요.',source:'SEPTIC FOCUS',modifier:'감염원 연동 보스',boss:true,elite:.16}
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
// Hand-authored floor plans: room bounds and connections are independent per sector.
// Integer cell ownership keeps aggro and exploration independent of visual map geometry.
const LAYOUTS=[
  {size:[26,22],name:'NEIGHBORHOOD LOOPS',rooms:[[1,1,7,7],[9,1,8,7],[18,1,7,7],[1,9,7,5],[9,9,8,5],[18,9,7,5],[1,15,7,6],[9,15,8,6],[18,15,7,6]],links:[[0,1],[0,3],[1,2],[1,4],[2,5],[3,6],[4,5],[4,7],[5,8],[6,7],[7,8]],cover:[[4,5,2,1],[12,4,2,2],[21,11,2,1],[11,18,3,1],[4,18,2,1]]},
  {size:[30,26],name:'BRANCH / BYPASS',rooms:[[1,1,7,7],[10,2,5,6],[21,1,7,7],[3,11,7,5],[13,10,5,7],[22,12,6,5],[2,20,8,5],[13,20,6,5],[23,20,6,5]],links:[[0,1],[1,2],[1,4],[4,3],[4,5],[3,6],[4,7],[5,8],[6,7],[7,8]],cover:[[5,13,2,1],[15,12,1,2],[24,4,2,1],[25,21,1,2]]},
  {size:[30,26],name:'ATRIUM / FLANKS',rooms:[[1,1,7,7],[11,2,7,5],[22,2,7,6],[2,11,5,8],[10,10,10,9],[23,12,6,7],[2,22,6,3],[11,22,8,3],[23,22,6,3]],links:[[0,1],[0,3],[1,2],[1,4],[2,5],[3,4],[4,5],[3,6],[4,7],[5,8],[6,7],[7,8]],cover:[[12,12,2,2],[17,16,2,2],[25,14,2,1],[4,14,1,2]]},
  {size:[31,27],name:'ABSCESS POCKETS',rooms:[[1,1,7,7],[11,2,5,5],[21,1,8,6],[3,11,6,7],[13,10,8,5],[24,10,6,9],[1,21,8,5],[12,20,6,6],[21,22,9,4]],links:[[0,1],[0,3],[1,2],[1,4],[2,5],[3,6],[3,4],[4,7],[5,8],[6,7],[7,8]],cover:[[14,11,1,2],[25,13,2,2],[4,14,2,1],[22,23,2,1]]},
  {size:[32,25],name:'WARD SPINE',rooms:[[1,1,7,7],[11,2,7,5],[23,1,8,6],[2,11,7,4],[11,10,20,5],[2,19,7,5],[12,19,7,5],[24,19,7,5]],links:[[0,1],[0,3],[1,2],[1,4],[2,4],[3,4],[3,5],[4,6],[4,7],[5,6],[6,7]],cover:[[14,11,2,1],[21,13,2,1],[27,11,2,1],[25,3,2,1]]},
  {size:[30,28],name:'ISOLATION CLUSTERS',rooms:[[1,1,7,7],[11,1,7,7],[22,2,7,6],[2,12,6,6],[11,11,7,7],[22,12,7,6],[1,22,7,5],[11,22,7,5],[22,22,7,5]],links:[[0,1],[0,3],[1,2],[1,4],[2,5],[3,4],[3,6],[4,5],[4,7],[5,8],[6,7],[7,8]],cover:[[13,3,1,2],[13,13,1,2],[24,14,1,2],[4,23,2,1],[24,23,2,1]]},
  {size:[32,28],name:'CONTAINMENT RING',rooms:[[1,1,7,7],[11,1,9,6],[24,2,7,6],[2,12,7,7],[13,11,7,8],[24,12,7,7],[2,23,7,4],[12,23,8,4],[24,23,7,4]],links:[[0,1],[0,3],[1,2],[2,5],[3,6],[5,8],[6,7],[7,8],[3,4],[4,5],[4,7]],cover:[[15,13,2,2],[26,14,2,2],[13,3,2,1],[4,14,1,2]]},
  {size:[32,28],name:'SEPTIC CORE ARENA',rooms:[[1,1,7,7],[11,1,8,6],[23,1,8,7],[2,12,7,7],[12,11,19,16],[2,23,7,4]],links:[[0,1],[0,3],[1,2],[1,4],[2,4],[3,4],[3,5],[5,4]],cover:[[15,14,2,2],[25,14,2,2],[15,22,2,2],[25,22,2,2]],boss:[22.5,20.5]}
];
export function roomAt(map,x,y){const ix=Math.max(0,Math.min(map.width-1,Math.floor(x))),iy=Math.max(0,Math.min(map.height-1,Math.floor(y)));return map.roomCells[iy*map.width+ix];}
export function createMap(stageIndex=0){
  const stage=STAGES[stageIndex]||STAGES[0],layout=LAYOUTS[stageIndex]||LAYOUTS[0],[width,height]=layout.size,cells=new Uint8Array(width*height).fill(1),roomCells=new Int16Array(width*height).fill(-1);
  const carve=(x,y,w,h,id)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){if(i<1||j<1||i>=width-1||j>=height-1)continue;cells[j*width+i]=0;if(roomCells[j*width+i]<0)roomCells[j*width+i]=id;}};
  const rooms=layout.rooms.map(([x,y,w,h],id)=>{carve(x,y,w,h,id);return {id,x:Math.floor(x+w/2)+.5,y:Math.floor(y+h/2)+.5,label:id===0?'ENTRY':String.fromCharCode(65+id),neighbors:[],bounds:{x,y,w,h}};});
  for(const [a,b] of layout.links){const ra=rooms[a],rb=rooms[b],ax=Math.floor(ra.x),ay=Math.floor(ra.y),bx=Math.floor(rb.x),by=Math.floor(rb.y);ra.neighbors.push(b);rb.neighbors.push(a);
    for(let x=Math.min(ax,bx);x<=Math.max(ax,bx);x++)carve(x,ay,1,2,Math.abs(x-ax)<Math.abs(x-bx)?a:b);
    for(let y=Math.min(ay,by);y<=Math.max(ay,by);y++)carve(bx,y,2,1,Math.abs(y-ay)<Math.abs(y-by)?a:b);
  }
  for(const [x,y,w,h] of layout.cover)for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)cells[j*width+i]=2;
  // Give walls an owner for the minimap; this does not change any walkable cells.
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(roomCells[y*width+x]<0){let nearest=0,best=Infinity;for(const r of rooms){const d=(x-r.x)**2+(y-r.y)**2;if(d<best){best=d;nearest=r.id;}}roomCells[y*width+x]=nearest;cells[y*width+x]=1+(nearest%3);}
  const point=(roomId,dx=0,dy=0)=>{const r=rooms[roomId],points=[];for(let y=r.bounds.y;y<r.bounds.y+r.bounds.h;y++)for(let x=r.bounds.x;x<r.bounds.x+r.bounds.w;x++)if(!cells[y*width+x])points.push({x:x+.5,y:y+.5});points.sort((a,b)=>Math.hypot(a.x-r.x-dx,a.y-r.y-dy)-Math.hypot(b.x-r.x-dx,b.y-r.y-dy));return points[0];};
  const sourcePositions=stageIndex===0?[{x:22.5,y:4.5},{x:21.5,y:18.5}]:[point(2,1,-1),point(rooms.length-1,1,1),...(stage.boss?[point(3,-1,1)]:[])];
  const pickups=[{x:5.5,y:2.5,kind:'supply'},...[[1,'health'],[2,'supply'],[3,'health'],[4,'culture'],[rooms.length-1,'supply']].map(([id,kind])=>({...point(id,-1,-1),kind}))];
  return {id:stage.id,name:stage.name,layout:layout.name,site:stage.site,scenarios:stage.scenarios||[],color:stage.color,width,height,cells,roomCells,rooms,
    spawn:{x:3.5,y:3.5,angle:0},exit:{x:3.5,y:3.5},boss:layout.boss?{x:layout.boss[0],y:layout.boss[1]}:null,portals:rooms.map(r=>point(r.id)),
    sources:sourcePositions.map((p,id)=>({...p,id,label:String.fromCharCode(65+id)+' / '+stage.source,active:true})),pickups:pickups.map((p,id)=>({...p,id,active:true,cooldown:0}))};
}
