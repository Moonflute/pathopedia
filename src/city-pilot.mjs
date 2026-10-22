import {takeCityCell,releaseCityCell,pilotCellAction} from './city-engine.mjs';
import {pilotedCell} from './city-pilot-state.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {cityDistricts,siteAt} from './city-tile-layout.mjs';
import {cityRule,ruleTarget} from './city-rules.mjs';
import {pathogenDef} from './city-pathogens.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function createCityPilot(){
 let run=null,cell=null,world=null,theme='2',yaw=0,pitch=0,progress=0,previousAction=false,notice='',noticeUntil=0,shots=0,deliveries=0,oxygen=0,hitUntil=0,hurtUntil=0,guide=[],guideTime=-Infinity,guideKey='';
 const position=()=>cell?groundPoint(cell):null;
 function destination(){return cityDistricts(run).filter(d=>d.id!=='lung'&&ruleTarget(run,'oxygen',d.id)).sort((a,b)=>run.districts[a.id].oxygen-run.districts[b.id].oxygen)[0]?.id||'heart';}
 function objective(){
  if(!cell)return null;
  if(cell.kind==='rbc'){const id=cell.cargo?cell.target:'lung';return {id,...siteAt(run.layout,id),name:id==='lung'?'폐 · 산소 충전':cityDistricts(run).find(d=>d.id===id).short+' · 산소 배송'};}
  const p=position(),enemies=run.enemies.filter(e=>!e.dead&&e.entered&&e.compartment!=='lumen').sort((a,b)=>distance(p,groundPoint(a))-distance(p,groundPoint(b))),e=enemies[0];
  return e?{id:'enemy'+e.id,...groundPoint(e),name:pathogenDef(e.recordId)?.name||'병원체',enemy:e}:{id:'heart',...siteAt(run.layout,'heart'),name:'감염 없음 · 도시 순찰'};
 }
 function say(text){if(text){notice=text;noticeUntil=run.time+3;}}
 function start(s,kind,preferred,selectedTheme='2'){
  if(!['rbc','neutrophil'].includes(kind)||!s.layout||s.status!=='running')return false;
  stop();theme=selectedTheme;world=pilotWorld(s.layout,theme);
  const anchor=siteAt(s.layout,kind==='rbc'?'lung':'heart'),available=s.cells.filter(c=>c.kind===kind&&!c.lost&&(c.integrity??100)>0);
  available.sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred)||distance(groundPoint(a),anchor)-distance(groundPoint(b),anchor));
  for(const candidate of available){const origin=groundPoint(candidate),p=world.safe(origin,kind,q=>distance(q,origin)<2.5&&s.cells.every(other=>other===candidate||distance(q,groundPoint(other))>.85))||world.safe(origin,kind);if(!p)continue;cell=takeCityCell(s,candidate.id);if(!cell)continue;Object.assign(cell,groundCoordinate(p));break;}
  if(!cell)return false;run=s;cell.energy??=100;cell.integrity??=100;cell.recovering=false;
  if(cell.kind==='rbc'&&!cell.cargo)cell.target=destination();
  shots=deliveries=oxygen=0;progress=0;guideTime=-Infinity;guideKey='';guide=[];previousAction=false;pitch=-.04;notice='';
  const p=position(),goal=objective();guide=world.route(p,goal,cell.kind);guideKey=goal.id;guideTime=run.time;const target=guide.find(q=>distance(p,q)>.6)||goal;yaw=Math.atan2(target.x-p.x,-(target.z-p.z));return true;
 }
 function stop(){if(run)releaseCityCell(run);run=null;cell=null;progress=0;guide=[];}
 function setTheme(value){theme=value;if(cell){world=pilotWorld(run.layout,theme);const p=world.safe(position(),cell.kind);if(!p){stop();return;}Object.assign(cell,groundCoordinate(p));progress=0;guideTime=-Infinity;}}
 function target(){
  if(!cell||cell.kind!=='neutrophil')return null;
  const p=position(),range=Math.max(1.5,cityRule(run,'neutrophil').params.range*.1),dx=Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=-Math.cos(yaw)*Math.cos(pitch);let best=null,depth=Infinity;
  for(const e of run.enemies){if(e.dead||!e.entered||e.compartment==='lumen')continue;const q=groundPoint(e),x=q.x-p.x,z=q.z-p.z,y=.43-.58,t=x*dx+y*dy+z*dz;
   if(t<0||t>range||t>=depth||x*x+y*y+z*z-t*t>.43**2||!world.clear(p,q))continue;best=e;depth=t;
  }return best;
 }
 function chooseDestination(id){if(cell?.kind!=='rbc'||id==='lung'||!run.districts[id]||!ruleTarget(run,'oxygen',id))return;cell.target=id;progress=0;guideTime=-Infinity;}
 function step(dt,input={}){
  if(!cell)return;
  if(!run.cells.includes(cell)||cell.lost||run.status!=='running'||pilotedCell(run)!==cell){stop();return;}
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);
  const p=position(),forward=clamp(input.forward||0,-1,1),strafe=clamp(input.strafe||0,-1,1),normal=Math.max(1,Math.hypot(forward,strafe)),moving=Math.hypot(forward,strafe)>.05;
  yaw+=(input.turn||0)*dt*1.8;pitch=clamp(pitch+(input.look||0)*dt*1.2,-1.2,1.2);
  const speed=(cell.kind==='rbc'?5:3.4)*(input.sprint?1.5:1),travel=speed*dt/normal;
  world.move(p,(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*travel,(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*travel,cell.kind);Object.assign(cell,groundCoordinate(p));
  if(cell.kind==='neutrophil'){
   const hazards=run.enemies.filter(e=>!e.dead&&e.entered&&e.compartment!=='lumen'&&distance(p,groundPoint(e))<1.25&&world.clear(p,groundPoint(e))).length;
   if(hazards){cell.integrity=clamp(cell.integrity-dt*hazards*3,0,100);hurtUntil=run.time+.18;}
   const heart=siteAt(run.layout,'heart'),recover=distance(p,heart)<2.5&&run.districts.heart.oxygen>=20&&run.districts.heart.food>0&&!hazards;
   cell.energy=clamp(cell.energy+dt*(recover?5:moving&&input.sprint?-1:.5),0,100);if(recover)cell.integrity=clamp(cell.integrity+dt*3,0,100);
   if(cell.integrity<=0){cell.lost=true;stop();return;}
   if(input.fire&&cell.cooldown<=0){const e=target();if(e){const result=pilotCellAction(run,'attack',e.id);if(result.ok){shots++;hitUntil=run.time+.2;say(result.defeated?'병원체 제거':'명중');}else say(result.text);}else if(!previousAction)say('조준점을 맞추고 가까이 접근');}
   previousAction=!!input.fire;cell.task='직접 조종 · '+(recover?'회복':'감염 대응');
  }else{
   const goal=objective(),at=distance(p,goal)<2.5,acting=!!input.interact&&at&&!moving;
   if(acting){progress+=dt;const duration=cityRule(run,'oxygen').params.duration;
    if(progress>=duration){const result=pilotCellAction(run,'oxygen',goal.id);progress=0;say(result.text);if(result.ok){if(result.delivered){deliveries++;oxygen+=result.delivered;}if(!cell.cargo)cell.target=destination();guideTime=-Infinity;}}
   }else progress=0;
   cell.task='직접 조종 · '+(progress?(cell.cargo?'산소 하역':'산소 적재'):'산소 운반');
  }
  const goal=objective();if(goal.id!==guideKey||run.time-guideTime>2){guideTime=run.time;guideKey=goal.id;guide=world.route(p,goal,cell.kind);}
 }
 function view(){
  if(!cell)return null;const p=position(),goal=objective(),aim=target();let next=goal;
  // Show a short ground trail and a bearing to the next navigable turn.
  if(guide.length){let closest=0;for(let i=1;i<guide.length;i++)if(distance(p,guide[i])<distance(p,guide[closest]))closest=i;guide=guide.slice(closest);next=guide.find(q=>distance(p,q)>1.1)||goal;}
  return {cell,position:p,goal,next,guide,yaw,pitch,aim,theme,progress:progress/cityRule(run,'oxygen').params.duration,notice:run.time<noticeUntil?notice:'',shots,deliveries,oxygen,hit:run.time<hitUntil,hurt:run.time<hurtUntil,distance:distance(p,goal),water:theme==='2'&&world.town.source.isWater(p)};
 }
 return {start,stop,step,view,objective,setTheme,chooseDestination,get active(){return !!cell;},get cell(){return cell;},get run(){return run;},get world(){return world;},look(dx,dy){yaw+=clamp(dx,-180,180)*.0025;pitch=clamp(pitch-clamp(dy,-180,180)*.0025,-1.2,1.2);}};
}
