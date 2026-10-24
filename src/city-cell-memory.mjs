// Session history belongs to the actor, so removed cells cannot leak records.
const memories=new WeakMap(),clocks=new WeakMap();
const labels={load:'물자 적재',unload:'물자 전달',repair:'조직 복구',build:'시설 건설',fabricate:'자재 생산',produce:'항체 생산',shoot:'사격 지원',engulf:'포식',collect:'수거',signal:'지원 신호',patch:'응급 봉합',present:'항원 제시',prime:'항원 인식',differentiate:'분화',degranulate:'과립 방출',cytotoxic:'감염 세포 제거',regulate:'면역 조절',net:'NET 형성'};
export function rememberCell(s,c,text,site=null){
 if(!c||!text)return;let m=memories.get(c);if(!m){m={entries:[],signature:''};memories.set(c,m);}
 if(m.entries[0]?.text===text&&s.time-m.entries[0].at<4)return;
 m.entries.unshift({at:s.time,text,site});m.entries.length=Math.min(6,m.entries.length);
}
export const cellHistory=c=>memories.get(c)?.entries||[];
export function rememberActivity(s,c,kind,site){rememberCell(s,c,labels[kind]||kind,site);}
export function tickCellMemory(s){
 if((clocks.get(s)??-1)>s.time)return;clocks.set(s,s.time+.5);
 for(const c of [...s.cells,...s.shipments]){
  let m=memories.get(c);if(!m){m={entries:[],signature:''};memories.set(c,m);}
  const signature=[c.task,c.target,c.trafficStage,c.waitReason].join('|');
  if(m.signature!==signature){m.signature=signature;rememberCell(s,c,c.waitReason?'대기 · '+c.waitReason:c.task||'배송 중',c.target||c.to);}
 }
}
