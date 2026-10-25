import {residentView} from './city-residents.mjs';
import {pathogenDef} from './city-pathogens.mjs';
import {CITY_BOUNDS} from './city-world.mjs';
import {cityDistricts,placeable} from './city-tile-layout.mjs';
import {WALLS,FRONTS,TISSUES} from './city-frontier-data.mjs';
import {CELL_JOBS,districtDef,DISTRICTS,DRUGS} from './city-data.mjs';
import {activeActivity,activityProgress} from './city-activity.mjs';
import {immuneAntigen} from './city-immunity.mjs';
import {TRAFFIC_LABELS} from './city-immune-traffic.mjs';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const district=id=>districtDef(id)?.short||'배정 대기';
const nearest=(s,p)=>cityDistricts(s).reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b).short;

// Read actual work/cargo state. A combatant's target field can still contain an
// old district, and a plasma cell's recordId is a recipe, not a carried antigen.
export function cellObservation(s,c){
 if(c.somatic)return {name:c.name,id:c.id.split(':').slice(1).join(':'),task:c.task,destination:c.area+' · 거주 조직',cargo:'없음',specificity:c.infected?'감염된 숙주세포':'체세포',next:c.dead?'조직 청소 → 재생':c.health<35?'손상 회복':'작업 → 휴식 → 동네 이동',waiting:c.dead?'조직 재생':'없음',condition:'세포 건강 '+Math.round(c.health)+'%'};
 if(c.observedPathogen){const p=pathogenDef(c.recordId);return {name:(p?.name||immuneAntigen(c.recordId)?.name||c.recordId)+(c.observedType==='host'?' · 감염 숙주세포':''),id:c.id,task:({attack:'조직 공격',colonize:'정착·증식',trapped:'점액 포획',expelled:'배출 중',attachment:'상피 부착',eclipse:'세포 내 잠복',productive:'바이러스 생산',spread:'조직 확산',entry:'침투 중'})[c.action||c.phase]||'이동 중',destination:district(c.site||c.attackTarget?.site||(c.wall!=null?WALLS[c.wall]?.district:null)||c.target)+' · '+(({skin:'피부',airway:'호흡기',gut:'소화기',blood:'혈류'})[c.front]||'조직') ,cargo:'없음',specificity:p?.mechanism||'숙주세포 감염',next:c.entered?'국소 정착·면역 반응':'장벽 통과 시도',waiting:c.action==='trapped'?'점액 장벽':'없음',condition:c.hp!=null?'생존력 '+Math.ceil(c.hp)+(c.maxHp?' / '+c.maxHp:''):c.phase||'활동 중'};}
 if(!CELL_JOBS[c.kind])return shipmentObservation(s,c);
 const work=activeActivity(c,s.time),job=CELL_JOBS[c.kind],end=c.path?.at(-1)||c;
 let destination='배정 대기',cargo='없음',specificity='없음',task=c.task||job.task;
 if(c.kind==='rbc'){
  destination=district(c.cargo>0?c.target:'lung')+' · '+(c.cargo>0?'산소 하역대':'산소 충전대');
  if(c.cargo>0)cargo='O₂ '+Math.round(c.cargo);
 }else if(c.kind==='fibroblast'){
  const site=c.buildSite||work?.site||c.target;
  destination=district(site)+' · '+(c.buildSite?'공사장':c.assignment?.endsWith(':fabricate')?'자재 작업대':'복구 현장');
 }else if(c.kind==='plasma')destination='림프절 · 항체 작업대';
 else if(c.kind==='dendritic'){
  destination=c.recordId?'림프절 · 항원 전달':nearest(s,end)+(c.task==='항원 수집'?' · 항원 발견 지점':' · 감시 구역');
  if(c.recordId)cargo='항원 표본';
 }else if(c.kind==='helperT'){
  destination=work?.kind==='signal'?district(work.site)+' · 신호 발신':c.recordId?district(s.rally)+' · 방어 집결지':'림프절 · 항원 확인';
  if(c.recordId)cargo='항원 정보';
 }else if(c.kind==='platelet')destination=district(work?.site||c.target)+(c.task==='봉합 순찰'?' · 순찰 구역':' · 봉합 지점');
 else destination=nearest(s,work||end)+(c.task==='감염 대응'?' · 교전 지점':c.task==='잔해 청소'?' · 잔해 지점':' · 순찰 구역');
 if(work&&['load','unload','produce','build'].includes(work.kind)){
  const building=s.districts[c.buildSite]?.building;
  const progress=work.kind==='build'&&building?1-(building.remaining??building.duration)/building.duration:activityProgress(work,s.time);
  task+=' · '+Math.round(clamp(progress,0,1)*100)+'%';
 }
 if(c.logisticsJob!=null)destination='소화기 · 전선 보급 출고대';
 if(c.frontJob!=null){destination=c.frontStage==='shop'?'피부 보수 공방':WALLS[c.frontJob].name+' · 보수 현장';if(c.materialCargo)cargo='복구 자재 '+c.materialCargo;const repair=s.frontier?.walls[c.frontJob].repair;if(c.frontStage==='repair'&&repair)task='피부장벽 보수 · '+Math.round((1-repair.remaining/7)*100)+'%';}
 if(c.patchWall!=null)destination=WALLS[c.patchWall].name+' · 응급 봉합';
 if(c.debrisCargo){cargo='잔해 '+c.debrisCargo;if(c.wasteTrip)destination='신장 · 잔해 집하장';}
 let next=c.nextTask||(c.kind==='rbc'?(c.cargo?'산소 하역 → 폐 복귀':'산소 충전 → 배송'):c.kind==='dendritic'?(c.recordId?'항원 접수 → 감시':'항원 수집'):c.kind==='helperT'?(c.recordId?'지원 신호 발신':'항원 확인 → 방어 지원'):c.kind==='platelet'?'손상 탐색 → 봉합':'현장 작업 → 순찰');
 if(s.immunity){
  const adaptive=['helperT','cd8','bcell','plasma'].includes(c.kind),antigen=immuneAntigen(c.recordId);
  if(adaptive){destination=c.memory?'림프절 · 기억 감시':c.kind==='plasma'?'림프절 · 항체 분비대':c.kind==='bcell'||!c.immuneSite||c.immuneState!=='effector'||c.lineage==='Tfh'?'림프절 · 항원 선택':district(c.immuneSite)+' · 효과 반응';cargo='없음';if(antigen)specificity=(c.isotype?c.isotype+' · ':'')+antigen.name;next=c.kind==='bcell'?'BCR·MHC-II → Tfh 도움 → 형질·기억':c.kind==='helperT'?'공동자극 → 클론 증식 → 도움·기억':c.kind==='cd8'?'일치 peptide/MHC-I → 세포자멸 유도':'동일 항원 항체 분비';}
  if(c.kind==='monocyte'){destination=district(c.target)+' · CCL2 유주';next='조직 M-CSF → 대식세포 분화';}
  if(c.kind==='mast'){destination=district(c.residentSite||c.target)+' · 조직 상주';next='IgE 감작 → 동일 항원 교차결합';}
  if(c.kind==='basophil'){destination=district(c.target)+' · 2형 염증';next='IL-4·IgE 탈과립';}
  if(c.kind==='eosinophil'){destination=district(c.target)+' · 연충·알레르기 현장';next='IL-5·CCL11 → 표면 과립 방출';}
  if(c.kind==='nk'){destination=district(c.immuneSite||c.target)+' · 감염 세포 탐색';next='스트레스·missing-self / IgG ADCC';}
  if(c.kind==='treg'){destination=district(c.target)+' · 면역 조절';next='IL-2 → CTLA-4·IL-10·TGF-β';}
  if(c.kind==='dendritic'&&c.recordId){destination=c.immuneState==='presenting'?'림프절 · MHC 제시':'림프절 · CCR7 항원 운반';cargo=antigen?.name||'항원 표본';next='MHC-II→CD4 · 교차제시 MHC-I→CD8';}
 }
 if(c.trafficStage&&TRAFFIC_LABELS[c.trafficStage]){task=TRAFFIC_LABELS[c.trafficStage]+(c.transit?'':c.task?' · '+c.task:'');if(c.transit)destination=district(c.transit.site)+' · 혈관 출구';}
 if(c.tissueResident){destination=district(c.residentSite)+' · 조직 상주';next=c.recallUntil>s.time?'재노출 인식 → 현장 반응':'같은 항원 재노출 감시';}
 if(c.recovering)destination='심장 · 회복 쉼터';
 const condition=c.integrity!=null?`활동 ${Math.round(c.energy)}% · 세포 상태 ${Math.round(c.integrity)}%`:'정상';
 return {name:job.name+(c.origin==='monocyte'?' · 단핵구 유래':c.memory?' · 기억':c.lineage?' · '+c.lineage:''),id:c.id,task,destination,cargo,specificity,next,waiting:c.waitReason||'없음',condition};
}

function shipmentObservation(s,sh){
 const work=activeActivity(sh,s.time),pickup=sh.phase==='pickup',finished=sh.phase==='leaving';
 const label=sh.kind==='drug'?(DRUGS.find(d=>d.id===sh.drugId)?.short||'항생제'):{raw:'식재료',food:'영양분',materials:'건축 자재',recruit:'충원 영양분'}[sh.kind]||'물자';
 let task=finished?'배송 완료':pickup?'물자 수령대 이동':label+' 배송';
 if(work){task=(work.kind==='load'?'물자 적재':'물자 하역')+' · '+Math.round(activityProgress(work,s.time)*100)+'%';}
 const front=sh.frontDelivery,destination=!pickup&&sh.administration?(sh.administration==='oral'?'소화기 · 경구 투여대':'심장 · 정맥 투여대'):!pickup&&front?(front.type==='wall'?'피부 보수 공방':FRONTS[front.id].name+' · 전선 보급창고'):district(pickup?'gut':sh.to)+(finished?' · 도착 광장':pickup?' · 물자 수령대':' · 물자 하역대');
 return {name:sh.kind==='drug'?'항생제 보급':sh.kind==='materials'?'복구 자재':sh.kind==='raw'?'영양 원료':'영양 운반물',id:sh.id,task,destination,cargo:pickup||finished?'없음':label+' '+Math.round(sh.amount),specificity:'없음',next:sh.administration?(pickup?'약품 적재 → 투여대로 배송':finished?'운반 종료':sh.administration==='oral'?'하역 → 장내 방출·흡수':'하역 → 혈류 분포'):sh.nextTask||(pickup?'물자 적재 → 배송':finished?'운반 종료':'현장 하역'),waiting:sh.waitReason||'없음',condition:'운반 중'};
}

// Selection is a view state: it never enters the simulation or saved city.
export function createCellObserver(){
 let run=null,id=null,following=false;
 return {
  get id(){return id;},get following(){return following;},
  select(next){id=next;if(id==null)following=false;},
  setFollowing(on){following=!!on&&id!=null;},
  resolve(s){
   if(run!==s){run=s;id=null;following=false;}
   let cell=null;
   if(typeof id==='number')cell=s.cells.find(c=>c.id===id);
   else if(id?.startsWith('resident:'))cell=residentView(s).find(c=>c.id===id);
   else if(id?.startsWith('shipment'))cell=s.shipments.find(sh=>'shipment'+sh.id===id);
   else {const list=id?.startsWith('enemy')?s.enemies:id?.startsWith('virus')?s.physiology?.virions:id?.startsWith('host')?s.immunity?.infected:id?.startsWith('parasite')?s.immunity?.parasites:[];const target=list?.find(c=>id.endsWith(String(c.id))&&id.replace(/\d+$/,'')+c.id===id&&!c.dead);if(target)cell={...target,observedPathogen:true,observedType:id.startsWith('host')?'host':'pathogen'};}
   if(!cell){id=null;following=false;}
   return cell||null;
  }
 };
}

// Translate both camera and orbit target, preserving zoom, height and angle.
// Exponential easing behaves consistently at either the 30 or 60 fps cap.
export function moveFollowCamera(position,target,point,seconds){
 const x=clamp(point.x,CITY_BOUNDS.left+3,CITY_BOUNDS.right-3)-target.x,z=clamp(point.z,CITY_BOUNDS.top+2,CITY_BOUNDS.bottom-2)-target.z;
 if(Math.abs(x)+Math.abs(z)<1e-7)return false;
 const alpha=Math.hypot(x,z)<.002?1:1-Math.exp(-8*clamp(seconds,0,.1));
 const dx=x*alpha,dz=z*alpha;
 target.x+=dx;target.z+=dz;position.x+=dx;position.z+=dz;
 return alpha>0;
}

export function buildingObservation(s,id){const d=typeof id==='string'?placeable(id):null,tissue=d?.kind==='house'?TISSUES.find(t=>t.index===Number(id.slice(6))):null,site=typeof id==='object'?id.site:d?.district||tissue?.district||id,state={...(s.districts[site]||s.districts.heart),...(tissue?{hp:s.frontier.tissues[tissue.id]?.hp??100}:{})};return {name:typeof id==='object'?id.name:d?.name||'주택',task:state.building?'시설 작업 진행 중':'거주·생산 활동',destination:(district(site)||'마을')+' · '+(d?.kind==='house'?'조직 주택':'시설'),cargo:'영양 재고 '+Math.floor(state.food),specificity:d?.kind==='house'?'체세포 거주 구역':'도시 시설',next:'산소 공급 · 유지 보수',waiting:state.oxygen<20?'산소 공급 부족':'없음',condition:'건강 '+Math.round(state.hp)+'% · 산소 '+Math.round(state.oxygen)+'%'};}
