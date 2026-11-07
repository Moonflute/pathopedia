import {SITES,POINTS,PORTS,BELT_LENGTH,beltPoint,pathLength,pathPoint} from './cell-office-layout.mjs';

export const CONSUMERS=['brain','heart','marrow'];
export const MAX_PARCELS=60;
export const workDuration=id=>CONSUMERS.includes(id)?7:id==='lung'||id==='gut'?3.2:2.8;
const stockKey=kind=>kind==='sorted'?'waste':kind;
const limit=n=>Number.isFinite(n)?Math.max(0,Math.min(1e7,Math.floor(n))):0;
export function createLogistics(saved){
  const state={parcels:[],nextId:1,beltTravel:0,beltSpeed:28,pumpBoost:0,stations:{},stats:{madeOxygen:0,madeFood:0,received:0,work:limit(saved?.work),sorted:limit(saved?.sorted),filtered:limit(saved?.filtered)}};
  for(const s of SITES)state.stations[s.id]={oxygen:CONSUMERS.includes(s.id)?2:0,food:CONSUMERS.includes(s.id)?2:0,waste:0,inbox:[],output:[],progress:0,readyTime:0,flash:0,arrival:0,departure:0,drain:0,boost:0,working:false,completed:0};
  for(const kind of ['oxygen','food'])for(const [i,to] of CONSUMERS.entries()){
    const parcel=dispatch(state,kind,kind==='oxygen'?'lung':'gut',to);
    parcel.phase='loop';parcel.distance=(i+1)*20;
  }
  return state;
}
export function dispatch(state,kind,from,to){
  if(state.parcels.length>=MAX_PARCELS||!PORTS[from]||!PORTS[to])return null;
  const parcel={id:state.nextId++,kind,from,to,phase:'out',distance:0,loopDistance:(PORTS[to].offset-PORTS[from].offset+BELT_LENGTH)%BELT_LENGTH};
  state.parcels.push(parcel);return parcel;
}
export function parcelPoint(parcel){
  if(parcel.phase==='out'){const path=PORTS[parcel.from].path;return pathPoint(path,pathLength(path)-parcel.distance);}
  if(parcel.phase==='loop')return beltPoint(PORTS[parcel.from].offset+parcel.distance);
  return pathPoint(PORTS[parcel.to].path,parcel.distance);
}
export function receiveParcel(state,parcel){
  const station=state.stations[parcel.to],capacity=parcel.kind==='waste'||parcel.kind==='sorted'?16:6;
  if(station.inbox.filter(kind=>kind===parcel.kind).length>=capacity)return false;
  station.inbox.push(parcel.kind);station.arrival=1.2;state.stats.received++;return true;
}
function moveParcels(state,dt){
  const delivered=new Set();
  for(const parcel of state.parcels){
    parcel.distance+=dt*state.beltSpeed;
    for(let step=0;step<3;step++){
      const length=parcel.phase==='out'?pathLength(PORTS[parcel.from].path):parcel.phase==='loop'?parcel.loopDistance:pathLength(PORTS[parcel.to].path);
      if(parcel.distance<length)break;
      if(parcel.phase==='in'){parcel.distance=length;if(receiveParcel(state,parcel))delivered.add(parcel.id);break;}
      parcel.distance-=length;parcel.phase=parcel.phase==='out'?'loop':'in';
    }
  }
  state.parcels=state.parcels.filter(p=>!delivered.has(p.id));
}
function destination(state,kind,residents){
  return CONSUMERS.map(id=>({id,amount:state.stations[id][kind]+state.stations[id].inbox.filter(k=>k===kind).length+state.parcels.filter(p=>p.kind===kind&&p.to===id).length+residents.filter(r=>r.carry?.kind===kind&&r.carry.to===id).length})).filter(r=>r.amount<5).sort((a,b)=>a.amount-b.amount)[0]?.id;
}
export function neededInput(state,id){
  const s=state.stations[id],kinds=CONSUMERS.includes(id)?['oxygen','food']:id==='liver'?['waste']:id==='kidney'?['sorted']:[];
  return kinds.find(kind=>s[stockKey(kind)]<1&&s.inbox.includes(kind));
}
export function takeInput(state,id){
  const kind=neededInput(state,id);if(!kind)return null;
  state.stations[id].inbox.splice(state.stations[id].inbox.indexOf(kind),1);
  return {kind,to:id};
}
export function putInput(state,id,parcel){
  state.stations[id][stockKey(parcel.kind)]++;
}
export function takeOutput(state,id,residents){
  const s=state.stations[id],kind=s.output[0];if(!kind)return null;
  const to=kind==='waste'?'liver':kind==='sorted'?'kidney':destination(state,kind,residents);
  if(!to)return null;
  s.output.shift();return {kind,from:id,to};
}
export function tickLogistics(state,dt,residents,extraCargo=[]){
  const carriers=[...residents,...extraCargo.map(carry=>({carry}))];
  const present=id=>residents.some(r=>r.id!=='ruby'&&r.home===id&&r.workReady&&r.task==='work'&&!r.moving&&r.greeting<=0&&!r.chat&&Math.hypot(r.x-POINTS[id].x,r.y-POINTS[id].y)<6);
  const dispatcher=residents.some(r=>r.id==='ruby'&&r.task==='work'&&!r.moving&&r.greeting<=0&&!r.chat&&Math.hypot(r.x-POINTS.dispatch.x,r.y-POINTS.dispatch.y)<24);
  state.pumpBoost=Math.max(0,state.pumpBoost-dt);state.beltSpeed=(present('heart')?29:23)+(dispatcher?5:0)+(state.pumpBoost>0?10:0);
  state.beltTravel=(state.beltTravel+state.beltSpeed*dt)%(BELT_LENGTH*100);
  moveParcels(state,dt);
  for(const [id,s] of Object.entries(state.stations)){
    for(const key of ['readyTime','flash','arrival','departure','drain','boost'])s[key]=Math.max(0,s[key]-dt);
    s.working=false;
    if((!present(id)&&s.boost<=0)||s.output.length)continue;
    const producer=id==='lung'||id==='gut',kind=id==='lung'?'oxygen':'food';
    if(producer&&!destination(state,kind,carriers))continue;
    if(CONSUMERS.includes(id)&&(s.oxygen<1||s.food<1))continue;
    if((id==='liver'||id==='kidney')&&s.waste<1)continue;
    s.working=true;s.progress+=dt*(s.boost>0?1.8:1);
    if(s.progress<workDuration(id))continue;
    s.progress=0;s.completed++;s.flash=1.2;s.readyTime=.65;s.working=false;
    if(producer){s.output.push(kind);state.stats[id==='lung'?'madeOxygen':'madeFood']++;}
    else if(CONSUMERS.includes(id)){s.oxygen--;s.food--;state.stats.work++;s.output.push('waste');}
    else {
      s.waste--;
      if(id==='liver'){state.stats.sorted++;s.output.push('sorted');}
      else {state.stats.filtered++;s.drain=2;}
    }
  }
}
export function helpStation(state,id){
  if(!state.stations[id])return;
  state.stations[id].boost=15;state.stations[id].flash=1.4;
  if(id==='heart')state.pumpBoost=15;
}
