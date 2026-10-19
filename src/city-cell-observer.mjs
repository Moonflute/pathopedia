import {WALLS,FRONTS} from './city-frontier-data.mjs';
import {CELL_JOBS,districtDef,DISTRICTS,DRUGS} from './city-data.mjs';
import {activeActivity,activityProgress} from './city-activity.mjs';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const district=id=>districtDef(id)?.short||'배정 대기';
const nearest=p=>DISTRICTS.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?a:b).short;

// Read actual work/cargo state. A combatant's target field can still contain an
// old district, and a plasma cell's recordId is a recipe, not a carried antigen.
export function cellObservation(s,c){
 if(!CELL_JOBS[c.kind])return shipmentObservation(s,c);
 const work=activeActivity(c,s.time),job=CELL_JOBS[c.kind],end=c.path?.at(-1)||c;
 let destination='배정 대기',cargo='없음',task=c.task||job.task;
 if(c.kind==='rbc'){
  destination=district(c.cargo>0?c.target:'lung')+' · '+(c.cargo>0?'산소 하역대':'산소 충전대');
  if(c.cargo>0)cargo='O₂ '+Math.round(c.cargo);
 }else if(c.kind==='fibroblast'){
  const site=c.buildSite||work?.site||c.target;
  destination=district(site)+' · '+(c.buildSite?'공사장':c.assignment?.endsWith(':fabricate')?'자재 작업대':'복구 현장');
 }else if(c.kind==='plasma')destination='림프절 · 항체 작업대';
 else if(c.kind==='dendritic'){
  destination=c.recordId?'림프절 · 항원 전달':nearest(end)+(c.task==='항원 수집'?' · 항원 발견 지점':' · 감시 구역');
  if(c.recordId)cargo='항원 표본';
 }else if(c.kind==='helperT'){
  destination=work?.kind==='signal'?district(work.site)+' · 신호 발신':c.recordId?district(s.rally)+' · 방어 집결지':'림프절 · 항원 확인';
  if(c.recordId)cargo='항원 정보';
 }else if(c.kind==='platelet')destination=district(work?.site||c.target)+(c.task==='봉합 순찰'?' · 순찰 구역':' · 봉합 지점');
 else destination=nearest(work||end)+(c.task==='감염 대응'?' · 교전 지점':c.task==='잔해 청소'?' · 잔해 지점':' · 순찰 구역');
 if(work&&['load','unload','produce','build'].includes(work.kind)){
  const building=s.districts[c.buildSite]?.building;
  const progress=work.kind==='build'&&building?1-(building.remaining??building.duration)/building.duration:activityProgress(work,s.time);
  task+=' · '+Math.round(clamp(progress,0,1)*100)+'%';
 }
 if(c.logisticsJob!=null)destination='소화기 · 전선 보급 출고대';
 if(c.frontJob!=null){destination=c.frontStage==='shop'?'피부 보수 공방':WALLS[c.frontJob].name+' · 보수 현장';if(c.materialCargo)cargo='복구 자재 '+c.materialCargo;const repair=s.frontier?.walls[c.frontJob].repair;if(c.frontStage==='repair'&&repair)task='피부장벽 보수 · '+Math.round((1-repair.remaining/7)*100)+'%';}
 if(c.debrisCargo){cargo='잔해 '+c.debrisCargo;if(c.wasteTrip)destination='신장 · 잔해 집하장';}
 const next=c.nextTask||(c.kind==='rbc'?(c.cargo?'산소 하역 → 폐 복귀':'산소 충전 → 배송'):c.kind==='dendritic'?(c.recordId?'항원 접수 → 감시':'항원 수집'):c.kind==='helperT'?(c.recordId?'지원 신호 발신':'항원 확인 → 방어 지원'):c.kind==='platelet'?'손상 탐색 → 봉합':'현장 작업 → 순찰');
 if(c.recovering)destination='심장 · 회복 쉼터';
 const condition=c.integrity!=null?`활동 ${Math.round(c.energy)}% · 세포 상태 ${Math.round(c.integrity)}%`:'정상';
 return {name:job.name,id:c.id,task,destination,cargo,next,waiting:c.waitReason||'없음',condition};
}

function shipmentObservation(s,sh){
 const work=activeActivity(sh,s.time),pickup=sh.phase==='pickup',finished=sh.phase==='leaving';
 const label=sh.kind==='drug'?(DRUGS.find(d=>d.id===sh.drugId)?.short||'항생제'):{raw:'식재료',food:'영양분',materials:'건축 자재',recruit:'충원 영양분'}[sh.kind]||'물자';
 let task=finished?'배송 완료':pickup?'물자 수령대 이동':label+' 배송';
 if(work){task=(work.kind==='load'?'물자 적재':'물자 하역')+' · '+Math.round(activityProgress(work,s.time)*100)+'%';}
 const front=sh.frontDelivery,destination=!pickup&&sh.administration?(sh.administration==='oral'?'소화기 · 경구 투여대':'심장 · 정맥 투여대'):!pickup&&front?(front.type==='wall'?'피부 보수 공방':FRONTS[front.id].name+' · 전선 보급창고'):district(pickup?'gut':sh.to)+(finished?' · 도착 광장':pickup?' · 물자 수령대':' · 물자 하역대');
 return {name:'보급 운반원',id:sh.id,task,destination,cargo:pickup||finished?'없음':label+' '+Math.round(sh.amount),next:sh.administration?(pickup?'약품 적재 → 투여대로 배송':finished?'운반 종료':sh.administration==='oral'?'하역 → 장내 방출·흡수':'하역 → 혈류 분포'):sh.nextTask||(pickup?'물자 적재 → 배송':finished?'운반 종료':'현장 하역'),waiting:sh.waitReason||'없음',condition:'운반 중'};
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
   const cell=(typeof id==='string'?s.shipments.find(sh=>'shipment'+sh.id===id):s.cells.find(c=>c.id===id))||null;
   if(!cell){id=null;following=false;}
   return cell;
  }
 };
}

// Translate both camera and orbit target, preserving zoom, height and angle.
// Exponential easing behaves consistently at either the 30 or 60 fps cap.
export function moveFollowCamera(position,target,point,seconds){
 const x=clamp(point.x,-18,18)-target.x,z=clamp(point.z,-19,18)-target.z;
 if(Math.abs(x)+Math.abs(z)<1e-7)return false;
 const alpha=Math.hypot(x,z)<.002?1:1-Math.exp(-8*clamp(seconds,0,.1));
 const dx=x*alpha,dz=z*alpha;
 target.x+=dx;target.z+=dz;position.x+=dx;position.z+=dz;
 return alpha>0;
}
