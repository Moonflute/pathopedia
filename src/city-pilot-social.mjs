import {pilotedCell,pilotPose} from './city-pilot-state.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {releaseWorkplace} from './city-workplaces.mjs';
import {beginActivity,activeActivity} from './city-activity.mjs';
import {rememberCell} from './city-cell-memory.mjs';
import {CELL_JOBS} from './city-data.mjs';
import {pilotEnemyBody,pilotHostile} from './city-pilot-combat.mjs';
import {cityRule,ruleReady,ruleEnemy} from './city-rules.mjs';

const reactions=new WeakMap(),companions=new WeakMap(),marks=new WeakMap();
const names={greet:'인사',oxygen:'산소 받기',nutrient:'영양 먹기',repair:'회복',join:'동행 시작',leave:'다시 순찰'};
export const canAccompany=c=>!!c&&!c.lost&&(c.integrity??100)>0&&['neutrophil','macrophage'].includes(c.kind);
export function cellReaction(s,id,time=s.time){const r=reactions.get(s)?.get(id);return r&&time<r.until?r:null;}
export function residentSocialTime(s,id,time){const r=reactions.get(s)?.get(id);return r?time-r.offset-Math.max(0,Math.min(time-r.at,r.until-r.at)):time;}
export function reactToCell(s,c,kind){
 const player=pilotedCell(s);if(!player)return;
 let list=reactions.get(s);if(!list){list=new Map();reactions.set(s,list);}const old=list.get(c.id),p=groundPoint(player);
 const offset=old?old.offset+Math.max(0,Math.min(s.time-old.at,old.until-old.at)):0;
 const r={kind,at:s.time,until:s.time+.9,offset,x:p.x,z:p.z,label:names[kind]};list.set(c.id,r);if(list.size>256)for(const [id,old]of list)if(typeof id==='number'&&old.until<s.time)list.delete(id);
 if(!c.somatic)rememberCell(s,c,names[kind]);return r;
}
export function reserveResident(s,c){
 let r=cellReaction(s,c.id);if(!r){r=reactToCell(s,c,'receive');if(r)r.until=s.time+.12;}else if(r.kind==='receive')r.until=s.time+.12;
}
export function tickCellReaction(s,c,dt){
 const r=cellReaction(s,c.id);if(!r)return false;
 // Preserve a worker's existing activity and its completion time while greeting.
 if(c.activity)c.activity.started=Math.min(s.time,c.activity.started+dt);return true;
}
export function companionCell(s){
 const a=companions.get(s);if(!a)return null;
 if(!pilotedCell(s)||!s.cells.includes(a.cell)||a.cell.lost||(a.cell.integrity??100)<=0){releaseCompanion(s);return null;}return a.cell;
}
export function releaseCompanion(s){
 const a=companions.get(s);if(!a)return false;companions.delete(s);marks.delete(s);
 const c=a.cell;c.target=a.target;c.task=CELL_JOBS[c.kind]?.task||a.task;c.path=[];c.step=0;c.activity=null;c.assignment=null;c.immuneMove=null;c.transit=null;c.travelMode=null;
 if(s.cells.includes(c)&&!c.lost)reactToCell(s,c,'leave');return true;
}
export function toggleCompanion(s,c){
 const previous=companionCell(s);if(previous===c||!c)return {ok:releaseCompanion(s),text:'동행 종료'};
 if(!canAccompany(c)||c===pilotedCell(s)||!s.cells.includes(c))return {ok:false,text:'호중구·대식세포를 불러 주세요'};
 releaseCompanion(s);releaseWorkplace(c);
 companions.set(s,{cell:c,target:c.target,task:c.task,route:[],nextRoute:0,goal:null});
 c.path=[];c.step=0;c.activity=null;c.assignment=null;c.immuneMove=null;c.transit=null;c.travelMode=null;c.recovering=false;
 reactToCell(s,c,'join');return {ok:true,text:CELL_JOBS[c.kind].name+' · 동행 시작'};
}
export function markCompanionEnemy(s,e){if(e&&companionCell(s))marks.set(s,{enemy:e,until:s.time+5});}
export function tickCompanion(s,c,dt,api){
 const a=companions.get(s);if(!a||a.cell!==c)return false;
 const player=pilotedCell(s);if(!player||player.lost||s.status!=='running'){releaseCompanion(s);return false;}
 const world=pilotWorld(s.layout,pilotPose(s).theme),p=groundPoint(c),lead=groundPoint(player),mark=marks.get(s),rule=cityRule(s,c.kind);
 const eligible=e=>pilotHostile(e)&&ruleReady(s,c.kind,c.target)&&ruleEnemy(s,c.kind,e)&&Math.hypot(groundPoint(e).x-lead.x,groundPoint(e).z-lead.z)<14;
 const target=mark?.until>s.time&&s.enemies.includes(mark.enemy)&&eligible(mark.enemy)?mark.enemy:s.enemies.filter(eligible).sort((x,y)=>Math.hypot(x.x-c.x,x.y-c.y)-Math.hypot(y.x-c.x,y.y-c.y))[0];
 let goal=lead,stop=1.8;c.task='탐험가와 동행';
 if(target){const body=pilotEnemyBody(s,target),range=(c.kind==='neutrophil'?7:1.2)+Math.max(body.rx,body.rz),distance=Math.hypot(p.x-body.x,p.z-body.z),clear=world.clear({...p,y:.5},body);
  if(distance<=range&&clear){
   c.task='동행 · 함께 방어';if(c.cooldown<=0){api.damage(s,target,Math.max(1,rule.params.damage??8)*(c.kind==='neutrophil'?.9:1.3),c,CELL_JOBS[c.kind].color,c.kind==='neutrophil'?'shot':'engulf');beginActivity(s,c,c.kind==='neutrophil'?'shoot':'engulf',.5,target);c.cooldown=c.kind==='neutrophil'?.7:1.1;}return true;
  }
  if(target.entered&&Math.hypot(p.x-lead.x,p.z-lead.z)<10){goal=body;stop=range*.8;c.task='동행 · 병원체 접근';}
 }
 if(Math.hypot(p.x-goal.x,p.z-goal.z)<=stop){if(pilotPose(s).height>2)c.task='동행 · 아래에서 대기';return true;}
 if(activeActivity(c,s.time)?.kind==='shoot'||activeActivity(c,s.time)?.kind==='engulf')return true;
 if(s.time>=a.nextRoute){
  a.nextRoute=s.time+1;
  if(!a.goal||Math.hypot(a.goal.x-goal.x,a.goal.z-goal.z)>.7||!a.route.length){a.goal={x:goal.x,z:goal.z};a.route=world.route(p,goal,'neutrophil');}
 }
 while(a.route.length&&Math.hypot(p.x-a.route[0].x,p.z-a.route[0].z)<.18)a.route.shift();
 const next=a.route[0];if(next){const d=Math.hypot(next.x-p.x,next.z-p.z),speed=Math.min(d,dt*(Math.hypot(p.x-lead.x,p.z-lead.z)>5?6:4.4));world.move(p,(next.x-p.x)/d*speed,(next.z-p.z)/d*speed,'neutrophil');Object.assign(c,groundCoordinate(p));}else c.task='동행 · 길을 기다리는 중';
 return true;
}
