import {WAVES} from './city-data.mjs';
import {TISSUES} from './city-frontier-data.mjs';
import {cityDistrict,tissueAt,tissuePresent} from './city-tile-layout.mjs';

// Fixed educational isolates reuse data/organisms.json. Rates are game units.
const staph={routes:['skin','blood'],shape:'cluster',focus:{skin:'tissue',blood:'heart'},mechanism:'화농 · 연조직 침범',growth:.042,damage:1.05,spread:48,secondary:['heart','lung','kidney','marrow']};
export const PATHOGENS=Object.freeze([
 {...WAVES[0],routes:['airway','blood'],shape:'pair',focus:{airway:'lung',blood:'heart'},mechanism:'피막 방어 · 폐포 손상',capsule:.35,growth:.042,damage:.65,oxygen:.7,spread:48,secondary:['lung']},
 {...WAVES[1],...staph},
 {...WAVES[2],...staph},
 {recordId:'ECO-009',name:'대장균 · 기준 분리주',tag:'EC',hp:40,color:'#abaf76',routes:['skin','blood'],shape:'rod',focus:{skin:'tissue',blood:'heart'},mechanism:'국소 침범 · 혈류 염증',growth:.048,damage:.65,inflammation:1.35,spread:48},
 {recordId:'GNX-220',name:'비장티푸스 살모넬라',tag:'SAL',hp:42,color:'#c3a477',routes:['gut','blood'],shape:'rod',focus:{gut:'gut',blood:'heart'},mechanism:'장 점막 침범 · 혈행 확산',growth:.045,damage:.75,spread:42,secondary:['gut']},
 {recordId:'CDF-121',name:'C. difficile · 독소 생성',tag:'CD',hp:38,color:'#a899c1',routes:['gut'],shape:'rod',focus:{gut:'gut'},mechanism:'장내 정착 → 독소성 손상',lumen:true,toxin:true,toxinRate:.022,growth:.042,damage:0,spread:0},
 {recordId:'SPY-101',name:'화농사슬알균 · GAS',tag:'GAS',hp:42,color:'#d17b8d',routes:['skin','blood'],shape:'chain',focus:{skin:'tissue',blood:'heart'},mechanism:'연조직 파괴 → 인접 조직 확산',growth:.05,damage:1.65,spread:38,localSpread:true},
 {recordId:'PAE-013',name:'녹농균',tag:'PA',hp:52,color:'#58b5a3',routes:['airway','skin','blood'],shape:'rod',focus:{airway:'lung',skin:'tissue',blood:'heart'},mechanism:'상처·폐 정착 · 분비인자 손상',growth:.04,damage:1.15,oxygen:.45,spread:48,secondary:['lung']},
 {recordId:'KPN-011',name:'폐렴막대균',tag:'KP',hp:50,color:'#c796bd',routes:['airway','blood'],shape:'rod',focus:{airway:'lung',blood:'heart'},mechanism:'두꺼운 피막 · 폐 조직 손상',capsule:.5,growth:.042,damage:.85,oxygen:.6,spread:48,secondary:['lung']},
 {recordId:'GNX-225',name:'인플루엔자균',tag:'HI',hp:34,color:'#8eb4ce',routes:['airway','blood'],shape:'shortRod',focus:{airway:'lung',blood:'heart'},mechanism:'호흡기 점막 침범 · 국소 염증',growth:.043,damage:.55,oxygen:.35,spread:52,secondary:['lung']},
 {recordId:'GNX-221',name:'이질균 · S. sonnei',tag:'SH',hp:36,color:'#d39372',routes:['gut'],shape:'shortRod',focus:{gut:'gut'},mechanism:'장 상피 침범 · 염증성 손상',growth:.05,damage:1.1,inflammation:1.5,spread:0},
 {recordId:'CPE-122',name:'가스괴저균 · 상처 감염',tag:'CP',hp:48,color:'#ba8862',routes:['skin'],shape:'rod',focus:{skin:'tissue'},mechanism:'저산소 조직 증식 · 독소성 괴사',growth:.04,damage:1.9,anaerobic:true,spread:0}
].map(p=>Object.freeze(p)));
export const pathogenDef=id=>PATHOGENS.find(p=>p.recordId===id);
export const EXPOSURE_COUNTS=Object.freeze([3,6,12,24,32,64,128,256]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function pathogenTarget(s,e){
 const profile=pathogenDef(e.recordId),focus=profile?.focus[e.front]|| (e.front==='skin'?'tissue':e.front==='gut'?'gut':e.front==='blood'?'heart':'lung');
 if(focus==='tissue'){
  const current=e.attackTarget?.kind==='tissue'?TISSUES[e.attackTarget.id]:null;
  const candidates=TISSUES.filter(t=>tissuePresent(s,t)&&s.frontier.tissues[t.id].hp>5);
  const tissue=current&&tissuePresent(s,current)&&s.frontier.tissues[current.id].hp>5?current:candidates.reduce((best,t)=>!best||distance(tissueAt(s,t).point,e)<distance(tissueAt(s,best).point,e)?t:best,null)||TISSUES.find(t=>tissuePresent(s,t))||TISSUES[0];
  const target=tissueAt(s,tissue);
  return {kind:'tissue',id:tissue.id,site:tissue.district,point:target.point};
 }
 const d=cityDistrict(s,focus);
 return {kind:'district',id:focus,site:focus,point:{x:d.x,y:d.y}};
}

// Heart is the circulation compartment. Secondary spread uses preferred sites,
// then vulnerable organs; it is not a claim that all bacteremias infect myocardium.
export function spreadDestination(s,profile,from){
 if(!profile?.spread)return null;
 if(from!=='heart')return s.biology.sites.heart.isolated?null:'heart';
 const preferred=profile.secondary||Object.keys(s.districts);
 return preferred.filter(id=>id!==from&&!s.biology.sites[id].isolated)
  .sort((a,b)=>s.districts[a].hp-s.districts[b].hp||a.localeCompare(b))[0]||null;
}

export function validatePathogenTarget(e){
 const target=e.attackTarget;
 return (!target||(target.kind==='tissue'?Number.isInteger(target.id)&&!!TISSUES[target.id]:target.kind==='district'&&['lung','heart','gut','kidney','marrow','lymph'].includes(target.id)))
  &&(e.action==null||['approach','breach','trapped','expelled','attack'].includes(e.action))
  &&['attackX','attackY'].every(k=>e[k]==null||Number.isFinite(e[k]));
}
