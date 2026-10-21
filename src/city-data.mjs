// The map, timing and quantities are a city-building abstraction, not physiology or dosing.
export const WORLD = Object.freeze({width:1200,height:800});
export const DISTRICTS = Object.freeze([
  {id:'lung',name:'폐 · 숨결 항구',short:'폐',job:'외부 산소를 받아 혈관으로 공급',x:878,y:240,color:'#81c6c2',symbol:'O₂',upgrade:'환기 설비',effect:'산소 적재량 +25% · 장벽 강화',card:'IMM-003'},
  {id:'heart',name:'심장 · 박동 광장',short:'심장',job:'박동에 맞춰 도시 전체의 물류 순환',x:575,y:359,color:'#df837e',symbol:'♥',upgrade:'순환 펌프',effect:'혈관 운송 속도 +22%',card:null},
  {id:'kidney',name:'신장 · 정화 수로',short:'신장',job:'쌓인 노폐물을 걸러 도시 환경 유지',x:590,y:626,color:'#b2a1d1',symbol:'≋',upgrade:'여과 시설',effect:'노폐물 처리량 +45%',card:null},
  {id:'gut',name:'장 · 영양 가공소',short:'장',job:'외부 식재료 가공 · 영양분 출고',x:897,y:552,color:'#e4b269',symbol:'▤',upgrade:'보급 창고',effect:'영양 반입량 +35% · 배송량 +2',card:'IMM-002'},
  {id:'marrow',name:'골수 · 조혈 공방',short:'골수',job:'세포 생산 · 충원 · 수명 종료 세포 보충',x:279,y:555,color:'#d79db7',symbol:'✚',upgrade:'증원 시설',effect:'충원 대기시간 단축 · 자재 생산 증가',card:'IMM-004'},
  {id:'lymph',name:'림프절 · 기억 서고',short:'림프절',job:'항원 정보 수신 · 표적 항체 지원',x:281,y:242,color:'#a9c47a',symbol:'Y',upgrade:'반응 연구소',effect:'항체 준비 속도 +40%',card:'IMM-006'}
]);
export const districtDef = id => DISTRICTS.find(d=>d.id===id);
// Visual slots only. Future sprites can replace each prop without changing city logistics.
// Offsets are in the same ground coordinates as the district and its roads.
export const DISTRICT_SITES = Object.freeze({
  lung:{paving:'#d8dfd4',edge:'#aab9a2',props:[['tank',100,-50,'#a9c4bf'],['canopy',-98,-24,'#9bbcb5'],['crate',83,77,'#c8b48e'],['lamp',-81,77,'#c4bf9f']]},
  heart:{paving:'#ded0ba',edge:'#c0b594',props:[['shed',-101,-46,'#cda58e'],['pump',101,-36,'#b0bdb1'],['bench',-78,89,'#b9a187'],['planter',91,82,'#b2c090']]},
  kidney:{paving:'#d6d7d8',edge:'#b3b8b6',props:[['tank',106,-37,'#b8b2c7'],['pump',-101,-25,'#a7bebe'],['planter',-93,68,'#acbb9c'],['lamp',83,69,'#c4c0a7']]},
  gut:{paving:'#e4d9bf',edge:'#c8bc9b',props:[['canopy',98,-50,'#ceaa78'],['crate',-103,-33,'#c5a47e'],['crate',-103,58,'#d3b68a'],['planter',85,83,'#b9c290']]},
  marrow:{paving:'#dfd4c8',edge:'#c0b5a3',props:[['shed',-97,-51,'#c3a5a0'],['crate',101,-31,'#c4ad86'],['bench',-100,78,'#b6a18b'],['lamp',86,75,'#c9bf9e']]},
  lymph:{paving:'#d9dfc6',edge:'#b4c09d',props:[['shed',-94,-52,'#b8bd9e'],['planter',102,-41,'#aaba96'],['bench',-97,75,'#b9aa8a'],['lamp',85,81,'#c9c3a4']]}
});
export const JOBS = Object.freeze({
  rbc:{name:'적혈구',task:'산소 운반',color:'#e47b77',cost:14,cap:40,life:720,card:null},
  neutrophil:{name:'호중구',task:'순찰 · 전투',color:'#faf0cb',cost:24,cap:24,life:240,card:'IMM-010'},
  macrophage:{name:'대식세포',task:'포식 · 잔해 청소',color:'#b49bd7',cost:30,cap:12,life:900,card:'IMM-012'},
  fibroblast:{name:'섬유아세포',task:'자재 생산 · 복구',color:'#e3ba77',cost:20,cap:12,life:1200,card:null},
  dendritic:{name:'수지상세포',task:'항원 수집 · 전달',color:'#86bb8b',cost:26,cap:8,life:600,card:'IMM-013'}
});
// Additional jobs are enabled by the 3D village; the original city's roster stays intact.
export const CELL_JOBS=Object.freeze({...JOBS,
 helperT:{name:'도움 T세포',task:'항원 확인 · 방어 지원',color:'#6aaab8',cost:28,cap:6,life:900,card:null,glyph:'⚑'},
 plasma:{name:'형질세포',task:'표적 항체 생산',color:'#a590ca',cost:32,cap:6,life:900,card:'IMM-035',glyph:'Y'},
 platelet:{name:'혈소판',task:'손상 부위 응급 봉합',color:'#dfad75',cost:12,cap:8,life:420,card:null,glyph:'✚'}
});
export const cityJobs=s=>s.specialists?CELL_JOBS:JOBS;
export const cellCap=(s,kind)=>s.layout?.version===2?({rbc:96,neutrophil:72,macrophage:32,fibroblast:32,dendritic:16,helperT:12,plasma:12,platelet:24}[kind]):s.specialists&&kind==='rbc'?32:CELL_JOBS[kind]?.cap;
export const DRUGS = Object.freeze([
  {id:'ampicillin',name:'Ampicillin',short:'AMP',color:'#b6d38e',cost:10},
  {id:'oxacillin',name:'Oxacillin',short:'OXA',color:'#f0bb77',cost:14},
  {id:'vancomycin',name:'Vancomycin',short:'VAN',color:'#c1a6dd',cost:22}
]);
export const WAVES = Object.freeze([
  {recordId:'SPN-105',name:'폐렴사슬알균',tag:'SP',at:45,count:8,hp:34,color:'#a4bc58'},
  {recordId:'SAU-001',name:'황색포도알균 · MSSA',tag:'SA',at:145,count:12,hp:46,color:'#deb256'},
  {recordId:'SAU-002',name:'황색포도알균 · MRSA',tag:'MR',at:255,count:16,hp:60,color:'#b083c4'}
]);
export const ENTRANCE = Object.freeze({x:1100,y:105});
export const POLICIES = Object.freeze({balanced:'균형 운영',defense:'방어 우선',repair:'복구 우선'});
export const HOSTS = Object.freeze({normal:'일반 숙주',neutropenia:'호중구 감소'});
// Scenario durations and cell lifetimes are game time, not biological estimates.
export const SCENARIOS=Object.freeze({
  recovery:{name:'감염 도시 복구',tag:'RESTORE',symbol:'✚',host:'normal',terrain:'valley',duration:480,kind:'restore',health:85,waste:30,goal:'감염 3회 정리 · 모든 구역 85%',detail:'8분 제한 · 노폐물 30% · 안정화 15초',waves:[0,110,220]},
  steady:{name:'건강한 도시 유지',tag:'SUSTAIN',symbol:'♥',host:'normal',terrain:'valley',duration:300,kind:'hold',health:70,waste:65,goal:'도시 건강 70% 이상 · 5분 유지',detail:'건강·노폐물 기준 이탈은 15초까지',waves:[45,125,220]},
  fragile:{name:'면역저하 도시 유지',tag:'PROTECT',symbol:'◇',host:'neutropenia',terrain:'desert',duration:360,kind:'hold',health:75,waste:65,goal:'도시 건강 75% 이상 · 6분 유지',detail:'호중구 감소 · 충원 지연 · 15초 유예',waves:[60,170,280]},
  simulation:{name:'면역·감염 시뮬레이션',tag:'SIMULATION',symbol:'⚗',host:'normal',terrain:'valley',duration:0,kind:'sandbox',health:0,waste:100,goal:'병원체 유입 · 항생제 보급 직접 조작',detail:'자동 감염 없음 · 종료 제한 없음',waves:[],only3d:true}
});
