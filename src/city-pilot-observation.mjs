import {cellObservation} from './city-cell-observer.mjs';
import {cellHistory} from './city-cell-memory.mjs';
import {CELL_JOBS,districtDef} from './city-data.mjs';
import {pathogenDef} from './city-pathogens.mjs';
import {HOME_LOOPS,HOME_PHASES,homeOrgan} from './city-homeostasis-data.mjs';
import {sandboxCellJobs} from './city-sandbox.mjs';

const cellPrinciples={
 rbc:'폐에서 받은 산소를 조직에 전달',neutrophil:'염증 신호를 따라 이동 · 포식·ROS·NET',macrophage:'병원체·사멸 세포 수거 · 염증 정리',fibroblast:'자재를 사용해 손상 조직 복구',platelet:'손상 부위 응급 봉합',dendritic:'항원 운반 → 림프절 제시 → T세포 활성',helperT:'일치 항원 인식 → 도움 신호·B세포 협력',cd8:'일치 peptide/MHC-I → 감염 세포 제거',bcell:'항원 인식·Tfh 도움 → 형질·기억 세포',plasma:'선택된 항원에 맞는 항체 분비',nk:'세포 스트레스·MHC-I 저하 감시',monocyte:'염증 부위 이동 → 조직 대식세포 분화',mast:'IgE와 동일 항원 재노출 → 탈과립',basophil:'IL-4·IgE를 통한 2형 반응',eosinophil:'연충 표면에 과립 방출',treg:'활성화된 면역 반응 조절'
};
const districtPrinciples={lung:'환기·가스 교환 → 적혈구 산소 적재',heart:'혈류·관류 → 장기 공급',gut:'영양 흡수 → 간문맥 → 간',kidney:'수분·전해질·산염기 조절',marrow:'영양·철을 사용한 혈구 생산',lymph:'항원 제시 → 클론 선택 → 항체·효과 세포'};
const cellCards={neutrophil:'IMM-010',monocyte:'IMM-011',macrophage:'IMM-012',dendritic:'IMM-013',nk:'IMM-015',eosinophil:'IMM-016',basophil:'IMM-017',mast:'IMM-018',helperT:'IMM-023',treg:'IMM-028',cd8:'IMM-029',bcell:'IMM-034',plasma:'IMM-035'};
export function pilotObservation(s,object){
 if(!object)return null;
 const c=object.cell||object.shipment;
 if(c){
  if(object.cell&&!s.cells.includes(c)||object.shipment&&!s.shipments.includes(c))return null;
  const detail=cellObservation(s,c),job=CELL_JOBS[c.kind];
  const help=object.cell?['nutrient','repair','oxygen','cleanup','signal'].flatMap(tool=>sandboxCellJobs(s,tool).filter(j=>j.cell===c).map(j=>({tool,name:j.name}))):[];
  const card=job?.card||cellCards[c.kind];return {key:object.key,name:detail.name+' #'+c.id,task:detail.task,destination:detail.destination,cargo:detail.cargo,why:cellPrinciples[c.kind]||'물자 적재 → 배송 → 시설 하역',next:detail.waiting!=='없음'?detail.waiting:detail.next,history:cellHistory(c),help,card:card?'immune-element:'+card:null,track:c,carrier:!!object.shipment};
 }
 const enemy=object.jobs?.find(j=>j.enemy)?.enemy;
 if(enemy){if(enemy.dead||!s.enemies.includes(enemy))return null;const def=pathogenDef(enemy.recordId);return {key:object.key,name:def?.name||'병원체',task:({approach:'침입 지점 접근',breach:'장벽 침범',attack:'조직 공격',colonize:'국소 정착',circulate:'혈류 이동',blocked:'방어에 저지'})[enemy.action]||'감염 진행',destination:districtDef(enemy.site)?.short||'침입 부위',cargo:'HP '+Math.ceil(enemy.hp),why:def?.mechanism||'병원체 감염',next:enemy.c3b?'보체 표지 · 면역 제거 지원':def?.capsule?'피막 · 항체·보체 지원 관찰':'주변 면역세포의 반응 관찰',history:[],card:'pathogen:'+enemy.recordId};}
 if(object.home){const o=object.home,h=s.homeostasis,loop=HOME_LOOPS.find(l=>l.id===o.loop),state=h.loops[o.loop];return {key:object.key,name:o.name,task:HOME_PHASES[state.phase],destination:loop.name,cargo:'O₂ '+Math.round(h.organs[o.id].oxygen),why:loop.sites.map(id=>homeOrgan(id)?.name||districtDef(id)?.short||'조절 구역').join(' → '),next:loop.name+' · '+Number(h[loop.metric]??0).toFixed(1)+loop.unit,history:h.events.filter(e=>e.loop===loop.id).slice(0,6).map(e=>({at:e.at,text:e.text})),card:null};}
 const site=object.site||object.jobs?.find(j=>j.site)?.site;
 if(site&&s.districts[site]){const d=s.districts[site],def=districtDef(site);return {key:object.key,name:object.name,task:d.building?'시설 작업 중':d.oxygen<25?'산소 보급 대기':d.food<5?'영양 보급 대기':d.hp<90?'복구 중':'정상 가동',destination:def?.short||site,cargo:'O₂ '+Math.round(d.oxygen)+' · 영양 '+Math.round(d.food),why:districtPrinciples[site],next:'현장 수치는 교육용 지수',history:[],card:def?.card?'immune-element:'+def.card:null};}
 return null;
}
