import {setRuleGraph} from './city-info-rules.mjs';
// This is a map of the implemented 3D game, not a complete model of human physiology.
// Keep each explanation tied to its implementing function; don't mix planned features in.
export const INFO_KINDS = Object.freeze({
  facility:{label:'시설',color:'#447b72',fill:'#eaf3ed',symbol:'▦'},
  cell:{label:'세포',color:'#947054',fill:'#fbefdd',symbol:'●'},
  resource:{label:'물자',color:'#507ca1',fill:'#eaf2fa',symbol:'◇'},
  threat:{label:'감염',color:'#b05f64',fill:'#faebeb',symbol:'✳'},
  rule:{label:'운영',color:'#8773a6',fill:'#f1edf8',symbol:'⊙'}
});
export const INFO_LINKS = Object.freeze({
  supply:{label:'운반·생산',color:'#5c8d84'},
  signal:{label:'신호·영향',color:'#8a79ab'},
  defend:{label:'방어·억제',color:'#6883b0'},
  damage:{label:'손상·소모',color:'#bd7777'}
});
const n=(id,label,kind,summary,detail,source)=>({id,label,kind,summary,detail,source});
const nodes=[
  n('airway','호흡기 입구','facility','점액 포획 → 섬모 배출','점액이 병원체를 포획하고 섬모가 외부로 배출한다. 포획 용량은 폐 레벨·호흡기 장벽·건조 상태에 영향을 받는다. 영양을 써 배출을 강화할 수 있다.','city-frontier.mjs · tickFrontierEnemy'),
  n('lung','폐 · 숨결 항구','facility','적혈구에 산소 적재','적혈구가 접안대를 예약하고 산소를 충전한다. 적재량은 폐 가동률·레벨과 건조 환경에 따라 달라진다. 폐 자체의 산소는 매 틱 회복된다.','city-engine.mjs · updateOxygen / tickCity'),
  n('rbc','적혈구','cell','폐 ↔ 심장 ↔ 각 구역','산소가 부족한 구역을 고르되 이미 배송 중인 적혈구도 계산한다. 도착 후 예약된 접안대에서 하역하고 폐로 돌아온다. 영양이나 약품은 운반하지 않는다.','city-engine.mjs · updateOxygen'),
  n('heart','심장 · 박동 광장','facility','순환 속도 · 정맥 투여대','심장 레벨과 가동률이 적혈구·물자 이동 속도에 영향을 준다. 노폐물이 많으면 순환이 느려진다. 정맥 약품 투여와 전투 세포의 후방 회복도 이곳에서 처리한다.','city-engine.mjs · tickCity / city-biology.mjs'),
  n('vascular','혈관·도로','facility','폐순환 · 체순환 · 작업 동선','폐↔심장의 폐순환과 심장↔구역의 체순환을 나눈다. 배치를 저장하면 시설 출입구를 기준으로 경로를 다시 연결한다. 개별 도로를 직접 그리는 기능은 아직 없다.','city-tile-layout.mjs · compileLayout / cityRoute'),
  n('organs','장기 구역·조직','facility','공급을 받아 가동 · 보호 대상','각 장기는 건강·산소·영양 재고를 가진다. 가동률은 건강·산소·영양·격리 상태를 함께 반영한다. 조직 블록도 가까운 구역의 공급 부족과 침입에 손상된다.','city-engine.mjs · output / city-frontier.mjs · tickFrontier'),
  n('oxygen','구역 산소','resource','가동·전투·회복의 기반','적혈구 하역으로 보충되고 구역 운영과 발열로 소모된다. 부족하면 가동률·면역 대응이 낮아지고, 심한 부족은 구역 건강을 떨어뜨린다.','city-engine.mjs · output / tickCity'),
  n('raw','외부 식재료','resource','외부 반입 → 장 하역','일정 간격으로 외부 반입 배송이 생성된다. 장에 도착한 식재료는 원료 재고가 되고, 장의 가동률에 따라 영양분으로 가공된다.','city-engine.mjs · delivery / tickCity'),
  n('gut','장 · 영양 가공소','facility','원료 가공 · 물류 출고','식재료를 중앙 영양분으로 전환하고 물자의 적재·출고를 담당한다. 검역을 켜면 소화기 유입을 억제하지만 가공량도 감소한다.','city-engine.mjs · tickCity / city-frontier.mjs'),
  n('food','중앙 영양분','resource','보급·충원·자재 생산 비용','구역 보급, 세포 충원, 자재 생산, 약품 주문에 공통으로 사용한다. 중앙 재고와 각 구역·전선의 현장 재고는 따로 계산한다. 시뮬레이션의 수동 약품 주문은 비용을 면제한다.','city-engine.mjs · command / tickCity'),
  n('shipment','물자 운반원','resource','적재 → 이동 → 하역','식재료·영양·건축 자재·충원 물자·약품을 운반하는 배송 객체다. 세포 직업과는 별개이며 확장 도시에서 최대 96건이다. 실제 하역을 마쳐야 현장 재고나 작업 진행이 바뀐다.','city-engine.mjs · shipment / updateShipment / delivery'),
  n('workplace','접안대·작업대','facility','예약 · 점유 · 대기열','먼저 받은 예약 번호 순으로 자리를 배정한다. 자리가 없으면 대기 지점으로 이동한다. 배송·청소 접안대는 1칸, 회복 자리는 3칸이며 일부 작업대는 시설 확장으로 늘어난다.','city-workplaces.mjs · requestWorkplace / workplaceCapacity'),
  n('marrow','골수 · 조혈 공방','facility','충원 물자 도착 → 세포 출동','충원 물자가 도착하면 생산칸의 시간이 진행된다. 골수 가동률·레벨이 충원 속도에 영향을 준다. 게임에서는 섬유아세포 등 모든 직업도 이 생산 창구를 공유하도록 단순화했다.','city-engine.mjs · command / delivery / tickCity'),
  n('roster','세포 인력','rule','8종 직업 · 주택에 따라 최대 256','적혈구·호중구·대식세포·섬유아세포·수지상세포·도움 T세포·형질세포·혈소판으로 구성된다. 직업별 정원과 확장 도시의 충원 대기열 6칸을 함께 적용한다.','city-data.mjs · CELL_JOBS / city-engine.mjs · command'),
  n('fibroblast','섬유아세포','cell','자재 생산 · 건설 · 복구','같은 인력이 피부 보수, 전선 보급 준비, 조직 블록 복구, 시설 공사, 자재 생산을 맡는다. 현장 이동과 자재 도착이 필요하다. 역할과 생산 수치는 게임용 단순화다.','city-engine.mjs · updateCraftsman / city-frontier.mjs · frontierCell'),
  n('materials','건축 자재','resource','증설·공사·장벽 보수 비용','섬유아세포가 영양분을 써 생산한다. 시설 확장·초소·복구·투자와 피부 장벽 보수가 재고를 공유한다. 주문 시 차감하고 필요한 현장으로 배송한다.','city-engine.mjs · updateCraftsman / command'),
  n('construction','시설 공사','rule','자재 도착 + 작업자 도착','자재가 도착하고 섬유아세포가 현장에서 건설 중일 때만 진행된다. 완공 시 시설 레벨, 방어 초소 또는 증설 모듈이 실제로 늘어난다.','city-engine.mjs · updateCell / tickCity'),
  n('wall','피부 장벽','facility','정상 · 손상 · 파손 · 복구','외곽 14개 구간의 내구도를 따로 관리한다. 바깥 병원체는 장벽을 공격하고 파손된 구간으로만 진입한다. 복구 완료 시 새 침입을 막지만 이미 들어온 병원체를 없애지는 않는다.','city-frontier.mjs · tickFrontierEnemy / frontierCell'),
  n('workshop','피부 보수 공방','facility','자재 인수 → 현장 보수','보수 주문에는 자재 8이 필요하다. 가까운 비축 자재를 사용하거나 중앙에서 공방으로 배송한다. 배정된 섬유아세포가 자재를 들고 순찰로를 따라 현장으로 간다.','city-frontier.mjs · repairOrder / frontierCell'),
  n('depot','현장 보급창고','facility','전선 가까이 영양·자재 비축','피부·호흡기·소화기 전선의 현장 창고다. 영양은 주변 전투 세포를 지원하고 자재는 피부 보수에 사용한다. 현재 3D의 약품은 별도 투여 경로를 사용한다.','city-frontier.mjs · supplyOrder / frontDepot'),
  n('tissue','조직 블록','facility','공급 부족·침입에 반응','일부 민가 4곳이 건강을 가진 조직 블록이다. 피부를 통과한 병원체가 공격할 수 있다. 심하게 손상되면 섬유아세포가 자재를 써 복구한다.','city-frontier.mjs · repairTissue / tickFrontierEnemy'),
  n('sensor','감지 초소','facility','상처 위험을 미리 알림','증설한 감지 초소 수에 따라 예정된 피부 상처의 경고가 더 빨리 나타난다. 위험 알림을 선택하면 해당 현장으로 카메라를 이동할 수 있다.','city-frontier.mjs · tickFrontier / frontierAlerts'),
  n('pathogens','병원체','threat','호흡기·피부·소화기·혈류','폐렴사슬알균, MSSA, MRSA, 대장균, 살모넬라, C. difficile 분리주를 지원한다. 시뮬레이션에서 병원체에 허용된 유입 경로와 수량을 골라 투입한다.','city-biology.mjs · PATHOGENS / biologyCommand'),
  n('gutBarrier','소화기 검역','facility','유입 억제 ↔ 가공량 감소','검역 중에는 소화기 병원체가 느려지고 피해를 입는다. 동시에 장의 식재료 가공량이 줄어드는 운영상 교환 관계가 있다.','city-frontier.mjs · tickFrontierEnemy / city-engine.mjs · tickCity'),
  n('infection','구역 감염','threat','정착 → 확산 위험 → 억제·회복','화면의 병원체와 구역별 감염량은 따로 존재한다. 병원체가 도달하면 감염을 심고, 감염량은 증식·국소 면역·약물 효과로 변한다. 화면의 적이 없어도 감염과 염증이 남을 수 있다.','city-biology.mjs · seedInfection / advanceBiology'),
  n('spread','혈행 확산','threat','감염 구역 → 심장 → 타 구역','감염량이 높은 구역은 조건을 만족하면 심장으로, 심장은 다른 구역으로 감염을 보낸다. 장내 C. difficile은 이 혈행 확산 대상에서 제외한다.','city-biology.mjs · advanceBiology'),
  n('neutrophil','호중구','cell','순찰 · 접근 · 포식 전투','위협 구역으로 이동해 진입한 병원체와 싸운다. 산소·현장 영양·지원 신호·표적 항체·세포 활력이 전투에 영향을 준다. 항생제를 무기로 소비하지 않는다.','city-engine.mjs · updateCell / city-biology.mjs · combatDestination'),
  n('macrophage','대식세포','cell','포식 · 잔해 수거·하역','전투와 잔해 정리를 겸한다. 수거 시 국소 염증을 낮추고 잔해를 최대 3개 모아 신장 쪽 집하장으로 운반한다. 집하장이 가득 차면 하역을 기다린다.','city-engine.mjs · updateCell / city-frontier.mjs · frontierCell'),
  n('debris','전투·사멸 잔해','resource','수거 전에는 염증 부담','병원체 격파와 전투 세포 사멸로 생성된다. 수지상세포에는 항원 단서가 되고 대식세포가 수거한다. 게임 수명으로 교체된 세포는 이 사멸 경로와 별도로 처리한다.','city-engine.mjs · damage / tickCity'),
  n('kidney','신장 · 정화 수로','facility','노폐물·잔해 처리 · 약물 소실','가동률·시설 레벨에 따라 전역 노폐물을 줄인다. 집하된 잔해를 처리해 노폐물과 염증도 낮춘다. 잔해 처리까지 신장 구역에 모은 것은 게임상 표현이다.','city-engine.mjs · tickCity / city-frontier.mjs · tickFrontier'),
  n('waste','노폐물·염증','threat','순환·건강에 부담','노폐물이 많으면 운송이 느려지고, 높은 노폐물·염증은 구역 건강을 낮춘다. 감염과 주변 잔해는 국소 염증을 높인다. C. difficile 독소는 장 구역에 추가 부담을 준다.','city-engine.mjs · tickCity / city-biology.mjs · advanceBiology'),
  n('dendritic','수지상세포','cell','항원 단서 수집 → 림프절','병원체·잔해·구역 감염에서 아직 알려지지 않은 항원을 수집한다. 림프절까지 운반해야 접수와 반응 준비가 시작된다.','city-engine.mjs · updateCell / city-biology.mjs · antigenEvidence'),
  n('lymph','림프절 · 기억 서고','facility','항원 접수 → 반응 준비','운반된 항원을 접수한 뒤 시설 가동률·레벨에 따라 준비 시간이 진행된다. 완료된 항원 정보는 형질세포 생산과 도움 T세포 지원의 공통 조건이 된다.','city-frontier.mjs · receiveAntigen / tickFrontier'),
  n('helperT','도움 T세포','cell','항원 확인 → 방어 지원 신호','림프절에서 알려진 항원을 확인한 뒤 집결 구역으로 이동한다. 신호가 유지되는 동안 해당 구역의 전투 피해량을 높인다. 형질세포의 분화 과정은 아직 별도 구현되지 않았다.','city-engine.mjs · specialist'),
  n('plasma','형질세포','cell','영양 소비 → 표적 항체 생산','림프절 작업대에서 알려진 표적 중 항체가 부족한 것을 선택한다. 지역 영양 재고와 작업 시간이 필요하고, 생산량은 림프절 가동률·레벨에 영향을 받는다.','city-engine.mjs · specialist'),
  n('antibody','표적 항체','resource','같은 병원체의 포식·제거 지원','병원체 종류별로 쌓인다. 같은 표적을 상대로 포식 전투와 국소 면역 제거를 돕는다. 지원 효과는 해당 구역의 산소가 부족하면 약해진다.','city-biology.mjs · antibodySupport / advanceBiology'),
  n('drugs','항생제 보급','resource','AMP · OXA · VAN','약품 주문은 배송을 생성한다. 정맥 또는 지원되는 경구 경로를 선택하며 하역 전에는 약효가 생기지 않는다. 현재 자동 보급은 선택된 약품의 정맥 경로를 사용한다.','city-biology.mjs · medicineOrder / city-engine.mjs · tickCity'),
  n('iv','심장 정맥 투여대','facility','약품 재고 → 혈중 농도','정맥 배송이 심장에 도착한 뒤 심장 가동률에 따라 재고를 투여한다. 그 결과 혈중 약물 상태가 증가한다. 양과 시간은 임상 용량이 아닌 게임 단위다.','city-biology.mjs · tickMedicine'),
  n('oral','장 경구 투여대','facility','AMP 흡수 · VAN 장내 작용','경구 ampicillin은 혈중으로 흡수된다. 경구 vancomycin은 장내 구획에 남는다. 현재 oxacillin의 경구 경로는 지원하지 않는다.','city-biology.mjs · medicineOrder / tickMedicine'),
  n('bloodDrug','혈중 약물','resource','순환을 따라 각 구역으로','심장 가동률과 각 구역 산소 상태에 따라 조직 약물 상태가 혈중 상태를 따라간다. 시간에 따른 소실을 계산하며 AMP·VAN은 신장 가동률도 반영한다.','city-biology.mjs · tickMedicine'),
  n('lumen','장내 약물','resource','경구 VAN의 별도 구획','경구 vancomycin을 장내 약물로 계산한다. 장내 C. difficile의 치료에는 이 구획을 사용하므로 정맥 vancomycin으로 대체되지 않는다.','city-biology.mjs · tickMedicine / medicineEffect'),
  n('susceptibility','감수성·경로 판정','rule','분리주 기록 + 작용 부위 확인','해당 분리주의 조건 없는 S 결과를 약효에 반영한다. 장내 C. difficile·경구 VAN에는 별도 REGIMEN 조건을 사용한다. 미상이나 비적용 기록을 임의로 감수성으로 해석하지 않는다.','city-biology.mjs · medicationActivity / medicineEffect'),
  n('platelet','혈소판','cell','호흡기·구역 응급 봉합','손상된 호흡기 장벽이나 장기 구역에 이동해 소량씩 복구한다. 현재 외곽 피부 장벽 구간의 정식 보수는 혈소판이 아니라 공방과 섬유아세포가 담당한다.','city-engine.mjs · specialist'),
  n('rest','후방 회복','rule','활력·무결성 부족 → 심장','호중구·대식세포가 지치거나 손상되면 심장 회복 자리로 이동한다. 그곳의 영양·산소가 있어야 회복하며 충분히 회복하면 방어로 복귀한다.','city-biology.mjs · updateCombatCondition'),
  n('weather','숙주·환경','rule','건조 · 발열 · 호중구 감소','건조는 산소 적재와 점액 포획을 낮추고 발열은 산소 소모·노폐물을 높인다. 호중구 감소 숙주는 시작 호중구가 적고 충원도 느리다.','city-data.mjs · SCENARIOS / city-engine.mjs · tickCity'),
  n('isolation','구역 격리','rule','확산 차단 ↔ 가동률 감소','격리 구역에서는 혈행 확산의 출발·도착을 차단한다. 대신 해당 구역의 가동률을 낮춘다. 이미 있는 감염이 바로 없어지는 기능은 아니다.','city-biology.mjs · advanceBiology / city-engine.mjs · output'),
  n('lifecycle','게임 수명','rule','선택 기능 · 종료 후 자동 보충','기본 OFF다. 켜면 직업별 게임 수명이 흐르고 교체 수요를 기록한다. 골수 지역 영양과 생산 대기열에 여유가 있을 때 자동 충원한다.','city-engine.mjs · tickCity'),
  n('orders','운영·대응 명령','rule','균형·방어·복구 / 전선 배치','방어 방침은 전투를 강화하고 복구 방침은 수리·청소·장벽 보수를 우선한다. 자동 대응·구역 방어·전선 지원·후방 회복 명령으로 전투 세포의 목적지를 조절한다.','city-engine.mjs · command / city-biology.mjs · combatDestination'),
  n('plots','구역 증설','rule','구역당 2칸 · 투자 선택','장벽 보강·감지 초소·보급 확장·생산칸 중 선택한다. 다른 시설 공사와 같은 자재·섬유아세포를 사용한다. 배치 편집은 이 투자와 별개다.','city-frontier.mjs · frontierCommand / completeInvestment'),
  n('layout','사각 타일 배치','rule','시설 이동·회전 → 연결 재구성','일시정지 상태에서 시설 묶음을 옮기고 90도로 회전한다. 충돌·경계·도로 연결을 검증한 뒤 저장한다. 도시의 재고와 진행을 유지하면서 경로·작업 위치를 갱신한다.','city-tile-layout.mjs · applyTileLayout'),
  n('health','도시 건강·목표','rule','장기 80% + 조직 블록 20%','건강 평균을 시나리오 기준과 비교한다. 유지 시나리오는 제한 시간 동안 건강·노폐물 기준을 지키고, 복구 시나리오는 적·국소 감염·잔여 염증까지 안정시켜야 한다.','city-engine.mjs · cityHealth / objectiveState / tickCity')
];
const view=(id,name,caption,rows,links)=>({id,name,caption,
  positions:Object.fromEntries(rows.flatMap((row,y)=>row.flatMap((id,x)=>id?[[id,{x:60+x*310,y:70+y*178}]]:[]))),
  edges:links.map(([from,to,label,kind='supply'],i)=>({id:id+'-'+i,from,to,label,kind}))
});
const views=[
  view('overview','전체 구조','여섯 장기 구역이 공급·방어·정비로 연결된다.',[
    ['lung','heart','kidney'],['gut','organs','lymph'],['marrow','fibroblast','pathogens']
  ],[
    ['lung','heart','적혈구·폐순환'],['heart','organs','산소·물류 순환'],['gut','organs','영양 배송'],['marrow','fibroblast','충원'],['fibroblast','organs','건설·복구'],['lymph','organs','항체·지원 신호','defend'],['kidney','organs','정화로 가동 유지','defend'],['pathogens','organs','정착·손상','damage'],['gut','marrow','충원 물자']
  ]),
  view('oxygen','산소·순환','적혈구의 산소 배송과 순환 속도를 구분한다.',[
    ['airway','lung','rbc'],['weather','heart','vascular'],['workplace','oxygen','organs']
  ],[
    ['airway','lung','호흡기 연결'],['lung','rbc','산소 충전'],['rbc','vascular','폐·체순환'],['vascular','organs','산소 배송'],['organs','oxygen','하역 후 보충'],['oxygen','organs','가동·건강 지원','signal'],['heart','vascular','이동 속도 결정','signal'],['weather','lung','건조 시 적재 감소','damage'],['workplace','rbc','예약·순서 대기','signal']
  ]),
  view('supply','영양·물류','중앙 재고는 배송과 하역을 거쳐 현장 재고가 된다.',[
    ['raw','gut','food'],['workplace','shipment','organs'],['depot','fibroblast','marrow']
  ],[
    ['raw','gut','반입·하역'],['gut','food','가공'],['food','shipment','주문 시 차감'],['shipment','organs','영양 보급'],['shipment','marrow','충원 물자'],['shipment','depot','전선 보급'],['workplace','shipment','적재·하역 대기','signal'],['fibroblast','depot','보급 출고 준비'],['food','fibroblast','자재 생산 비용','signal'],['food','marrow','세포 충원 비용','signal']
  ]),
  view('defense','침입·전투','세 전선과 구역 감염, 혈행 확산은 따로 계산된다.',[
    ['wall','pathogens','airway'],['tissue','infection','gutBarrier'],['neutrophil','spread','macrophage'],['rest','isolation','waste']
  ],[
    ['pathogens','wall','파손 전까지 공격','damage'],['wall','tissue','파손 구간으로 진입','damage'],['pathogens','airway','호흡기 유입','damage'],['airway','infection','포획 실패 시 진입','damage'],['pathogens','gutBarrier','소화기 유입','damage'],['gutBarrier','infection','검역으로 유입 억제','defend'],['pathogens','infection','혈류 직접 유입','damage'],['infection','spread','높은 감염량','damage'],['spread','infection','심장 경유 확산','damage'],['neutrophil','infection','포식·국소 제거','defend'],['macrophage','infection','포식·국소 제거','defend'],['infection','waste','염증·독소 증가','damage'],['isolation','spread','유입·유출 차단','defend'],['neutrophil','rest','손상·활력 저하'],['rest','neutrophil','회복 후 복귀']
  ]),
  view('adaptive','항원·항체','항원이 림프절에 도착한 뒤 두 지원 흐름이 열린다.',[
    ['pathogens','dendritic','lymph'],['debris','helperT','plasma'],['oxygen','neutrophil','antibody']
  ],[
    ['pathogens','dendritic','항원 단서'],['debris','dendritic','항원 단서'],['dendritic','lymph','항원 운반·접수'],['lymph','helperT','준비된 항원 확인','signal'],['lymph','plasma','생산 표적 등록','signal'],['helperT','neutrophil','집결 구역 지원','signal'],['plasma','antibody','영양 소비·생산'],['antibody','neutrophil','같은 표적 포식 지원','defend'],['oxygen','antibody','국소 지원 효과 결정','signal']
  ]),
  view('medicine','항생제·투여','하역 → 투여 → 분포 → 감수성 판정 순서로 작용한다.',[
    ['drugs','shipment','iv'],['oral','bloodDrug','susceptibility'],['lumen','kidney','infection']
  ],[
    ['drugs','shipment','약품 주문'],['shipment','iv','정맥 배송'],['shipment','oral','경구 배송'],['iv','bloodDrug','정맥 투여'],['oral','bloodDrug','AMP 흡수'],['oral','lumen','VAN 장내 유지'],['bloodDrug','susceptibility','혈류·조직 분포'],['lumen','susceptibility','장내 C. difficile'],['susceptibility','infection','유효 약물만 억제','defend'],['kidney','bloodDrug','AMP·VAN 소실 반영','signal']
  ]),
  view('repair','건설·보수·청소','현장 작업과 후방 처리가 같은 인력·자원을 사용한다.',[
    ['materials','fibroblast','construction'],['workshop','depot','tissue'],['wall','platelet','organs'],['debris','macrophage','kidney']
  ],[
    ['fibroblast','materials','영양을 써 생산'],['materials','construction','현장 배송'],['fibroblast','construction','작업자 도착'],['materials','workshop','자재 8 확보'],['workshop','wall','운반 → 현장 보수'],['fibroblast','workshop','보수 인력 배정'],['fibroblast','depot','출고 준비'],['fibroblast','tissue','자재 소비·복구'],['platelet','organs','호흡기·구역 응급복구','defend'],['debris','macrophage','잔해 수거'],['macrophage','kidney','집하장 하역'],['kidney','organs','노폐물·염증 감소','defend']
  ]),
  view('management','인력·운영','자원 경쟁·증설·환경이 도시의 유지 능력을 바꾼다.',[
    ['food','marrow','roster'],['plots','orders','lifecycle'],['sensor','weather','health'],['layout','isolation','organs']
  ],[
    ['food','marrow','충원 비용'],['marrow','roster','생산칸 → 출동'],['roster','lifecycle','수명 ON일 때','signal'],['lifecycle','marrow','지역 영양으로 보충'],['orders','roster','역할·목적지 우선순위','signal'],['plots','sensor','감지 투자'],['plots','organs','장벽·보급·생산 투자','signal'],['sensor','health','경고 → 현장 대응','signal'],['weather','health','공급·소모·충원 변화','signal'],['isolation','organs','가동률 감소','damage'],['layout','organs','출입구·도로 재연결','signal'],['organs','health','건강·시나리오 평가','signal']
  ])
];
export function createCityInfoDocument(){
  return setRuleGraph({schema:2,basis:'Cell City 3D · 현재 구현',nodes:structuredClone(nodes),views:structuredClone(views)});
}
