import {CITY_ENTRIES} from './city-world.mjs';
import {WALLS} from './city-frontier-data.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';

export const INVASION_MARCH=Object.freeze({distance:24,gap:6.2,speed:1.6,stand:3.4,period:1.4,assault:4.2});
const queues=new WeakMap();
export function invasionGate(e){
 if(e.front==='skin'){const w=WALLS[e.wall];return w?{x:w.x,z:w.z,nx:w.nx,nz:w.nz,key:'skin:'+e.wall}:null;}
 const p=e.front==='airway'?CITY_ENTRIES.airway.portal:e.front==='gut'?CITY_ENTRIES.gut.mouth:null;
 return p?{...p,nx:e.front==='gut'?1:0,nz:e.front==='airway'?-1:0,key:e.front}:null;
}
const actors=s=>[...s.enemies,...(s.physiology?.virions||[])];
const distance=(e,g)=>{const p=groundPoint(e);return (p.x-g.x)*g.nx+(p.z-g.z)*g.nz;};
const waiting=e=>!e.dead&&!e.entered&&e.invasion&&e.invasion.stage!=='passed';
export function invasionApproaches(s){
 const gates=new Map();for(const e of actors(s)){if(e.dead||e.entered||!e.invasion)continue;const g=invasionGate(e);if(g)gates.set(g.key,g);}return [...gates.values()];
}
export function startInvasion(s,e){
 const gate=invasionGate(e);if(!s.layout||!gate||e.entered)return false;
 let tail=INVASION_MARCH.distance;
 for(const other of actors(s))if(waiting(other)&&invasionGate(other)?.key===gate.key)tail=Math.max(tail,distance(other,gate)+INVASION_MARCH.gap);
 Object.assign(e,groundCoordinate({x:gate.x+gate.nx*tail,z:gate.z+gate.nz*tail}));
 e.invasion={version:1,stage:'march',since:s.time,moving:true};queues.delete(s);return true;
}
function leader(s,e){
 const count=s.enemies.length+(s.physiology?.virions.length||0);let cached=queues.get(s);
 if(!cached||cached.time!==s.time||cached.count!==count){
  const groups=new Map(),ahead=new Map();
  for(const actor of actors(s)){if(!waiting(actor))continue;const g=invasionGate(actor);if(!g)continue;let row=groups.get(g.key);if(!row)groups.set(g.key,row=[]);row.push({actor,d:distance(actor,g)});}
  for(const row of groups.values()){row.sort((a,b)=>a.d-b.d||a.actor.id-b.actor.id);for(let n=1;n<row.length;n++)ahead.set(row[n].actor,row[n-1].actor);}
  cached={time:s.time,count,ahead};queues.set(s,cached);
 }
 const first=cached.ahead.get(e);return first&&waiting(first)?first:null;
}
export function tickInvasion(s,e,dt){
 const invasion=e.invasion,gate=invasionGate(e);if(!invasion||!gate||e.entered)return false;
 if(invasion.stage==='passed'){
  if(e.front!=='skin'||e.colonization||s.frontier.walls[e.wall].hp<=0)return false;
  invasion.stage='barrier';invasion.since=s.time;queues.delete(s);
 }
 e.action='approach';invasion.moving=false;
 if(invasion.stage==='march'){
  const stand=e.recordId==='IMM-VIRUS'?1.7:INVASION_MARCH.stand,d=distance(e,gate),first=leader(s,e),stop=Math.max(stand,first?distance(first,gate)+INVASION_MARCH.gap:0),next=Math.min(d,Math.max(stop,d-INVASION_MARCH.speed*dt));
  Object.assign(e,groundCoordinate({x:gate.x+gate.nx*next,z:gate.z+gate.nz*next}));invasion.moving=d-next>1e-6;
  if(e.until!=null)e.until=Math.max(e.until,s.time+30);
  if(next>stand+.001)return true;
  invasion.stage='barrier';invasion.since=s.time;
 }
 e.action='blocked';e.entryStage='barrier';
 if(e.front==='skin'&&s.frontier.walls[e.wall].hp<=0||e.front!=='skin'&&s.time-invasion.since>=INVASION_MARCH.assault){invasion.stage='passed';e.action='approach';return false;}
 return true;
}
export function validInvasion(e){
 const v=e.invasion;return v==null||!!invasionGate(e)&&v.version===1&&['march','barrier','passed'].includes(v.stage)&&Number.isFinite(v.since)&&v.since>=0&&typeof v.moving==='boolean';
}
// Shared pose makes the wind-up, contact flash and recoil land on the same beat.
export function invasionPose(e,time){
 const v=e.invasion,g=invasionGate(e);if(!v||!g||e.entered||v.stage==='passed')return null;
 const striking=v.stage==='barrier',q=Math.max(0,time-v.since)/INVASION_MARCH.period%1;
 const reach=q<.32?-.09*q/.32:q<.48?-.09+.28*(q-.32)/.16:q<.76?.19*(1-(q-.48)/.28):0;
 return {gate:g,front:e.front,angle:Math.atan2(-g.nx,-g.nz),striking,moving:!striking&&v.moving,lunge:striking?reach:0,lean:striking?reach*.75:0,bob:!striking&&v.moving?Math.abs(Math.sin(time*5+e.id))*.035:0,impact:striking&&q>=.48&&q<.76?(q-.48)/.28:null};
}
export function invasionImpact(pose,height,stamp,line){
 if(!pose?.striking)return;
 const g=pose.gate,y=height+1.15,tx=-g.nz,tz=g.nx,tint=pose.front==='airway'?0xa8e5e5:pose.front==='gut'?0xf0ce88:0xffb77e;
 // The mucosal entrance briefly shows the barrier the invader is striking.
 if(pose.front!=='skin'&&line){for(const offset of [-.7,0,.7])line(g.x+tx*offset,height+.18,g.z+tz*offset,g.x+tx*offset,height+2.1,g.z+tz*offset,.035,0xaac9ba);}
 if(pose.impact==null)return;
 const q=pose.impact,r=.38+q*1.6;
 stamp('ring',g.x,y,g.z,r,r,r,tint,Math.atan2(g.nx,g.nz));
 for(let n=0;n<6;n++){const a=n*Math.PI/3,spread=.15+q*1.35,size=(1-q)*.15+.025;stamp('spark',g.x+tx*Math.cos(a)*spread+g.nx*q*.9,y+Math.sin(a)*spread+q*.6,g.z+tz*Math.cos(a)*spread+g.nz*q*.9,size,size*(1+n%2),size,n%2?tint:0xffefca,0);}
}
