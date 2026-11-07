import {TILE,POINTS,DOCKS,BREAK_SEATS,GARDEN_SPOTS,blocked} from './cell-office-layout.mjs';
import {putInput,receiveParcel} from './cell-office-logistics.mjs';

const PAIRS=[['ruby','spark'],['breeze','grain'],['beat','patch'],['clear','momo']];
export const HABITS={ruby:'coffee',beat:'stretch',breeze:'plant',spark:'book',grain:'meal',clear:'coffee',momo:'book',patch:'stretch'};
export const DESK_STYLES=['초록 화분','책과 메모','작은 수조'];
const count=n=>Number.isFinite(n)?Math.max(0,Math.min(1e7,Math.floor(n))):0;
export function officeClock(time){
  const total=360+Math.floor(time*2),minutes=total%1440;
  return {day:Math.floor(total/1440)+1,minutes,hour:Math.floor(minutes/60),text:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`};
}
export function officePhase(time){
  const m=officeClock(time).minutes;
  if(m>=360&&m<420)return {id:'inspect',label:'아침 점검'};
  if(m>=420&&m<690)return {id:'morning',label:'오전 업무'};
  if(m>=690&&m<840)return {id:'lunch',label:'교대 점심'};
  if(m>=840&&m<1020)return {id:'afternoon',label:'오후 업무'};
  if(m>=1020&&m<1140)return {id:'tidy',label:'마감 정리'};
  return {id:'night',label:'야간 근무'};
}
export function createOfficeLife(time,saved){
  return {nextBreak:time+38,pairCursor:0,group:null,nextEvent:time+82,eventCursor:0,event:null,deskStyle:count(saved?.deskStyle)%DESK_STYLES.length,deliveries:count(saved?.deliveries),stats:{chats:0,breaks:0,inspections:0,tidied:0,resolved:0}};
}
export const cargoDestination=parcel=>parcel.handIn==='machine'?POINTS[parcel.to]:DOCKS[parcel.to];
export function deliverCargo(world,parcel){
  if(parcel.handIn==='machine'){putInput(world.logistics,parcel.to,parcel);return true;}
  return receiveParcel(world.logistics,parcel);
}
export function heldCargo(world){return [world.player?.carry,world.life.event?.parcel].filter(Boolean);}
export function cargoCarriers(world){return [...world.residents,...heldCargo(world).map(carry=>({carry}))];}
function clearSight(a,b){
  const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/5));
  for(let i=1;i<steps;i++)if(blocked(Math.floor((a.x+(b.x-a.x)*i/steps)/TILE),Math.floor((a.y+(b.y-a.y)*i/steps)/TILE)))return false;
  return true;
}
function conversation(world,a,b,face){
  for(const [r,other] of [[a,b],[b,a]]){
    r.chat={left:1.8,activity:r.activity};r.activity=`${other.name}와 잠깐 수다`;r.socialAfter=world.time+28;face(r,other);r.moving=false;
  }
  world.life.stats.chats++;
}
function planBreak(world){
  const life=world.life,clock=officeClock(world.time),lunch=clock.minutes>=690&&clock.minutes<1020;
  const pairs=PAIRS.map(ids=>ids.map(id=>world.residents.find(r=>r.id===id))).filter(pair=>pair.every(Boolean));
  const available=pairs.filter(pair=>pair.every(r=>!r.breakPlan&&!['recover','courier','assist'].includes(r.task)));
  const hungry=lunch&&available.find(pair=>pair.some(r=>r.lunchDay!==clock.day));
  const preferred=pairs[life.pairCursor%pairs.length],pair=hungry||(available.includes(preferred)?preferred:available[0]);
  if(!pair)return;
  life.pairCursor++;
  const kind=hungry?'meal':pair.some(r=>r.id==='breeze')?'garden':'coffee',spots=kind==='garden'?GARDEN_SPOTS:BREAK_SEATS;
  life.group={ids:pair.map(r=>r.id),kind,started:false};
  pair.forEach((r,i)=>{r.breakPlan={kind,point:spots[i],partner:pair[1-i].id};});
}
function finishEvent(world){world.life.event=null;world.life.nextEvent=world.time+68;world.life.stats.resolved++;}
export function resolveDroppedParcel(world){
  const event=world.life.event;if(event?.type==='spill'&&!event.parcel)finishEvent(world);
}
export function beginOfficeEvent(world,startTask){
  const life=world.life,ruby=world.residents.find(r=>r.id==='ruby');
  if(life.event||!ruby||ruby.carry||ruby.breakPlan||ruby.chat||ruby.greeting>0||ruby.task!=='work')return false;
  const clock=officeClock(world.time);
  if(clock.minutes>=690&&clock.minutes<1020&&world.residents.some(r=>r.lunchDay!==clock.day))return false;
  if(life.eventCursor%2===0){
    life.event={type:'rush',label:'포장 지원',point:POINTS.assist,until:world.time+40,started:false};
    startTask(ruby,'assist',POINTS.assist,'보리의 포장 도우러 가는 중');
  }else{
    const owner=world.residents.find(r=>r.id!=='ruby'&&r.carry&&r.moving&&!r.chat&&r.greeting<=0&&['load','unload'].includes(r.task));
    if(!owner)return false;
    const point={x:(Math.floor(owner.x/TILE)+.5)*TILE,y:(Math.floor(owner.y/TILE)+.5)*TILE};
    life.event={type:'spill',label:'떨어진 상자',point,parcel:{...owner.carry,handIn:owner.task==='unload'?'machine':'dock'}};
    owner.carry=null;owner.greeting=.8;owner.surprisedUntil=world.time+2;
    startTask(owner,'work',POINTS[owner.home],'동료에게 회수 부탁하는 중');
    startTask(ruby,'recover',point,'떨어진 상자 주우러 가는 중');
  }
  life.eventCursor++;return true;
}
export function tickOfficeLife(world,dt,startTask,face){
  const life=world.life,group=life.group;
  if(group){
    const members=world.residents.filter(r=>group.ids.includes(r.id));
    if(members.every(r=>!r.breakPlan)){
      const clock=officeClock(world.time),lunchPending=clock.minutes>=690&&clock.minutes<1020&&world.residents.some(r=>r.lunchDay!==clock.day);
      life.group=null;life.nextBreak=world.time+(lunchPending?1:25);
    }
    else if(!group.started&&members.length===2&&members.every(r=>r.task==='rest')){
      group.started=true;for(const r of members)r.restUntil=world.time+10;
      conversation(world,members[0],members[1],face);
    }
  }else if(world.time>=life.nextBreak)planBreak(world);
  if(life.event?.type==='rush'&&world.time>=life.event.until)finishEvent(world);
  if(!life.event&&world.time>=life.nextEvent)beginOfficeEvent(world,startTask);
  const available=world.residents.filter(r=>world.time>=r.socialAfter&&!r.carry&&!r.chat&&r.greeting<=0&&['work','break','rest'].includes(r.task));
  for(let i=0;i<available.length;i++){
    const a=available[i];if(a.chat)continue;
    const b=available.slice(i+1).find(b=>!b.chat&&Math.hypot(a.x-b.x,a.y-b.y)<27&&clearSight(a,b));
    if(b)conversation(world,a,b,face);
  }
}
export function tryOfficePause(world,r,startTask){
  const clock=officeClock(world.time),phase=officePhase(world.time);
  if(phase.id==='inspect'&&r.inspectedDay!==clock.day){
    r.inspectedDay=clock.day;startTask(r,'inspect',POINTS[r.id==='ruby'?'dispatch':r.home],'설비 점검 중');r.wait=2;r.pose='inspect';return true;
  }
  if(phase.id==='tidy'&&r.tidiedDay!==clock.day){
    r.tidiedDay=clock.day;startTask(r,'tidy',POINTS[r.id==='ruby'?'dispatch':r.home],'작업대 정리 중');r.wait=3;r.pose='tidy';return true;
  }
  if(r.breakPlan){startTask(r,'break',r.breakPlan.point,r.breakPlan.kind==='meal'?'동료와 점심 먹으러 가는 중':'동료와 쉬러 가는 중');r.destination='lounge';return true;}
  return false;
}
function returnToWork(r,startTask){startTask(r,'work',POINTS[r.id==='ruby'?'dispatch':r.home],'작업대로 돌아가는 중');r.wait=10;if(r.id==='ruby')r.destination='dispatch';}
export function tickOfficeTask(world,r,dt,startTask,face){
  if(['inspect','tidy'].includes(r.task)){
    r.wait-=dt;if(r.wait<=0){world.life.stats[r.task==='inspect'?'inspections':'tidied']++;returnToWork(r,startTask);}return true;
  }
  if(r.task==='break'){
    r.task='rest';r.restUntil=world.time+24;r.pose=r.breakPlan.kind==='meal'?'meal':HABITS[r.id];r.seated=r.breakPlan.kind!=='garden';r.activity=r.pose==='plant'?'화분에 물 주는 중':r.pose==='meal'?'동료와 점심 먹는 중':r.pose==='book'?'책을 보며 쉬는 중':r.pose==='stretch'?'잠깐 기지개 켜는 중':'커피 마시며 쉬는 중';
    if(r.breakPlan.kind==='meal')r.lunchDay=officeClock(world.time).day;
    const partner=world.residents.find(other=>other.id===r.breakPlan.partner);if(partner)face(r,partner);return true;
  }
  if(r.task==='rest'){
    if(world.time>=r.restUntil){r.breakPlan=null;world.life.stats.breaks++;returnToWork(r,startTask);}return true;
  }
  if(r.task==='assist'){
    const event=world.life.event;
    if(event?.type!=='rush'){returnToWork(r,startTask);return true;}
    if(!event.started){event.started=true;event.until=world.time+18;}
    world.logistics.stations.gut.boost=Math.max(world.logistics.stations.gut.boost,.2);r.pose='assist';r.activity='보리와 함께 식량 포장';r.direction='up';return true;
  }
  if(r.task==='recover'){
    const event=world.life.event;
    if(event?.type!=='spill'||!event.parcel){returnToWork(r,startTask);return true;}
    r.handoff-=dt;r.pose='pickup';if(r.handoff>0)return true;
    r.carry=event.parcel;event.parcel=null;resolveDroppedParcel(world);
    startTask(r,'courier',cargoDestination(r.carry),'주운 상자 배달하는 중');return true;
  }
  if(r.task==='courier'){
    r.handoff-=dt;
    if(r.handoff<=0&&deliverCargo(world,r.carry)){r.carry=null;r.deliveries++;returnToWork(r,startTask);}return true;
  }
  return false;
}
