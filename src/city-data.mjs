// The map, timing and quantities are a city-building abstraction, not physiology or dosing.
export const WORLD = Object.freeze({width:1200,height:800});
export const DISTRICTS = Object.freeze([
  {id:'lung',name:'폐 · 숨결 항구',short:'폐',job:'외부 산소를 받아 혈관으로 공급',x:878,y:240,color:'#81c6c2',symbol:'O₂',upgrade:'환기 설비',effect:'산소 적재량 +25% · 장벽 강화',card:'IMM-003'},
  {id:'heart',name:'심장 · 박동 광장',short:'심장',job:'박동에 맞춰 도시 전체의 물류 순환',x:575,y:359,color:'#df837e',symbol:'♥',upgrade:'순환 펌프',effect:'혈관 운송 속도 +22%',card:null},
  {id:'kidney',name:'신장 · 정화 수로',short:'신장',job:'쌓인 노폐물을 걸러 도시 환경 유지',x:590,y:626,color:'#b2a1d1',symbol:'≋',upgrade:'여과 시설',effect:'노폐물 처리량 +45%',card:null},
  {id:'gut',name:'장 · 영양 시장',short:'장',job:'영양분 반입 · 물자와 외부 약제 출고',x:897,y:552,color:'#e4b269',symbol:'▤',upgrade:'보급 창고',effect:'영양 반입량 +35% · 배송량 +2',card:'IMM-002'},
  {id:'marrow',name:'골수 · 세포 공방',short:'골수',job:'세포 충원 · 섬유아세포의 자재 작업장',x:279,y:555,color:'#d79db7',symbol:'✚',upgrade:'증원 시설',effect:'충원 대기시간 단축 · 자재 생산 증가',card:'IMM-004'},
  {id:'lymph',name:'림프절 · 기억 서고',short:'림프절',job:'항원 정보 수신 · 표적 항체 지원',x:281,y:242,color:'#a9c47a',symbol:'Y',upgrade:'반응 연구소',effect:'항체 준비 속도 +40%',card:'IMM-006'}
]);
export const districtDef = id => DISTRICTS.find(d=>d.id===id);
export const JOBS = Object.freeze({
  rbc:{name:'적혈구',task:'산소 운반',color:'#e47b77',cost:14,cap:18,card:null},
  neutrophil:{name:'호중구',task:'순찰 · 전투',color:'#faf0cb',cost:24,cap:16,card:'IMM-010'},
  macrophage:{name:'대식세포',task:'포식 · 잔해 청소',color:'#b49bd7',cost:30,cap:8,card:'IMM-012'},
  fibroblast:{name:'섬유아세포',task:'자재 생산 · 복구',color:'#e3ba77',cost:20,cap:8,card:null},
  dendritic:{name:'수지상세포',task:'항원 수집 · 전달',color:'#86bb8b',cost:26,cap:4,card:'IMM-013'}
});
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
