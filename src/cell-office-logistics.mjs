import {SITES,POINTS,PORTS,BELT_LENGTH,beltPoint,pathLength,pathPoint} from './cell-office-layout.mjs';

export const CONSUMERS=['brain','heart','marrow'];
export const MAX_PARCELS=60;
const limit=n=>Number.isFinite(n)?Math.max(0,Math.min(1e7,Math.floor(n))):0;
export function createLogistics(saved){
  const state={parcels:[],nextId:1,beltTravel:0,beltSpeed:28,pumpBoost:0,stations:{},stats:{madeOxygen:0,madeFood:0,received:0,work:limit(saved?.work),sorted:limit(saved?.sorted),filtered:limit(saved?.filtered)}};
  for(const s of SITES)state.stations[s.id]={oxygen:CONSUMERS.includes(s.id)?2:0,food:CONSUMERS.includes(s.id)?2:0,waste:0,progress:0,flash:0,boost:0,working:false,completed:0};
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
function receive(state,parcel){
  const station=state.stations[parcel.to],capacity=parcel.kind==='waste'||parcel.kind==='sorted'?16:6,key=parcel.kind==='sorted'?'waste':parcel.kind;
  if(station[key]>=capacity)return false;
  station[key]++;station.flash=1.4;state.stats.received++;return true;
}
function moveParcels(state,dt){
  const delivered=new Set();
  for(const parcel of state.parcels){
    parcel.distance+=dt*state.beltSpeed;
    for(let step=0;step<3;step++){
      const length=parcel.phase==='out'?pathLength(PORTS[parcel.from].path):parcel.phase==='loop'?parcel.loopDistance:pathLength(PORTS[parcel.to].path);
      if(parcel.distance<length)break;
      if(parcel.phase==='in'){parcel.distance=length;if(receive(state,parcel))delivered.add(parcel.id);break;}
      parcel.distance-=length;parcel.phase=parcel.phase==='out'?'loop':'in';
    }
  }
  state.parcels=state.parcels.filter(p=>!delivered.has(p.id));
}
function destination(state,kind){
  return CONSUMERS.map(id=>({id,amount:state.stations[id][kind]+state.parcels.filter(p=>p.kind===kind&&p.to===id).length})).filter(r=>r.amount<5).sort((a,b)=>a.amount-b.amount)[0]?.id;
}
export function tickLogistics(state,dt,residents){
  const present=id=>residents.some(r=>r.home===id&&!r.moving&&Math.hypot(r.x-POINTS[id].x,r.y-POINTS[id].y)<28);
  const dispatcher=residents.some(r=>r.id==='ruby'&&!r.moving&&Math.hypot(r.x-POINTS.dispatch.x,r.y-POINTS.dispatch.y)<24);
  state.pumpBoost=Math.max(0,state.pumpBoost-dt);state.beltSpeed=(present('heart')?29:23)+(dispatcher?5:0)+(state.pumpBoost>0?10:0);
  state.beltTravel=(state.beltTravel+state.beltSpeed*dt)%(BELT_LENGTH*100);
  moveParcels(state,dt);
  for(const [id,s] of Object.entries(state.stations)){
    s.flash=Math.max(0,s.flash-dt);s.boost=Math.max(0,s.boost-dt);s.working=false;
    const staffed=present(id)||s.boost>0;
    if(!staffed)continue;
    const rate=dt*(s.boost>0?1.8:1);
    if(id==='lung'||id==='gut'){
      const kind=id==='lung'?'oxygen':'food',to=destination(state,kind);if(!to||state.parcels.length>=MAX_PARCELS)continue;
      s.working=true;s.progress+=rate;
      if(s.progress>=3.2){s.progress=0;if(dispatch(state,kind,id,to)){s.completed++;s.flash=1;state.stats[id==='lung'?'madeOxygen':'madeFood']++;}}
    }else if(CONSUMERS.includes(id)){
      if(s.oxygen<1||s.food<1||state.parcels.length>=MAX_PARCELS)continue;
      s.working=true;s.progress+=rate;
      if(s.progress>=7){s.progress=0;s.oxygen--;s.food--;s.completed++;s.flash=1;state.stats.work++;dispatch(state,'waste',id,'liver');}
    }else if(s.waste>0){
      if(id==='liver'&&state.parcels.length>=MAX_PARCELS)continue;
      s.working=true;s.progress+=rate;
      if(s.progress>=2.8){s.progress=0;s.waste--;s.completed++;s.flash=1;if(id==='liver'){state.stats.sorted++;dispatch(state,'sorted','liver','kidney');}else state.stats.filtered++;}
    }
  }
}
export function helpStation(state,id){
  if(!state.stations[id])return;
  state.stations[id].boost=15;state.stations[id].flash=1.4;
  if(id==='heart')state.pumpBoost=15;
}
