import {takeCityCell,releaseCityCell,pilotCellAction} from './city-engine.mjs';
import {pilotedCell,pilotInventory,pilotTool,pilotCooldowns,PILOT_TOOLS} from './city-pilot-state.mjs';
import {pilotObjective,pilotHostile,pilotJobs} from './city-pilot-tasks.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {cityDistricts,siteAt} from './city-tile-layout.mjs';
import {cityRule,ruleTarget} from './city-rules.mjs';
import {pilotFocus} from './city-pilot-interactions.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),mix=(a,b,t)=>a+(b-a)*t;
const hostile=pilotHostile;
export function createCityPilot(){
 let run=null,cell=null,world=null,inventory=null,theme='2',yaw=0,pitch=0,progress=0,previousAction=false;
 let notice='',noticeUntil=0,shots=0,deliveries=0,oxygen=0,hitUntil=0,hurtUntil=0,guide=[],guideTime=-Infinity,guideKey='';
 let vx=0,vz=0,jumpHeight=0,jumpVelocity=0,jumpHeld=false,crouch=0,sprinting=false,scoped=false,previousPosition=null,previousEye=.58;
 let previousTool='oxygen',actionBlocked=false,workKey='',actions=0,scan=null,scanUntil=0;
 let workTarget='',workPulse=null;
 const position=()=>cell?groundPoint(cell):null;
 const eye=()=>((theme==='2'&&world.town.source.isWater(position())) ? .48 : .58)-crouch*.24+jumpHeight;
 const focus=()=>cell?pilotFocus(run,{position:position(),yaw,pitch,eye:eye()},world):null;
 function destination(){return cityDistricts(run).filter(d=>d.id!=='lung'&&ruleTarget(run,'oxygen',d.id)).sort((a,b)=>run.districts[a.id].oxygen-run.districts[b.id].oxygen)[0]?.id||'heart';}
 function objective(){
  if(!cell)return null;
  if(inventory.tool==='scanner'){const aimed=target(8);if(aimed)return pilotJobs(run,'scanner').find(j=>j.enemy===aimed);}
  return pilotObjective(run,inventory.tool,position());
 }
 function say(text){if(text){notice=text;noticeUntil=run.time+3;}}
 function resetMotion(){vx=vz=0;jumpHeld=false;sprinting=scoped=false;previousPosition=position();if(cell)previousEye=eye();}
 function start(s,{preferred=null,theme:selectedTheme='2',spawn=null}={}){
  if(!s.layout||s.status!=='running')return false;
  const nextWorld=pilotWorld(s.layout,selectedTheme);if(spawn!==null&&!nextWorld.canStand(spawn))return false;
  stop();theme=selectedTheme;world=nextWorld;
  const anchor=spawn||siteAt(s.layout,'heart'),available=s.cells.filter(c=>['neutrophil','rbc'].includes(c.kind)&&!c.lost&&(c.integrity??100)>0);
  available.sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred)||Number(b.kind==='neutrophil')-Number(a.kind==='neutrophil')||distance(groundPoint(a),anchor)-distance(groundPoint(b),anchor));
  for(const candidate of available){
   const origin=groundPoint(candidate),p=spawn||world.safe(origin,'neutrophil',q=>distance(q,origin)<2.5&&s.cells.every(other=>other===candidate||distance(q,groundPoint(other))>1.1))||world.safe(origin,'neutrophil');
   if(!p)continue;cell=takeCityCell(s,candidate.id);if(!cell)continue;Object.assign(cell,groundCoordinate(p));break;
  }
  if(!cell)return false;
  run=s;inventory=pilotInventory(s);cell.energy??=100;cell.integrity??=100;cell.recovering=false;
  shots=deliveries=oxygen=actions=0;scan=null;scanUntil=0;previousTool=inventory.tool==='engulf'?'oxygen':'engulf';actionBlocked=false;workKey=workTarget='';workPulse=null;progress=0;guideTime=-Infinity;guideKey='';guide=[];previousAction=false;pitch=-.04;notice='';jumpHeight=jumpVelocity=crouch=0;resetMotion();
  const p=position(),goal=objective();guide=world.route(p,goal,'neutrophil');guideKey=goal.id;guideTime=run.time;
  const target=guide.find(q=>distance(p,q)>.6)||goal;yaw=Math.atan2(target.x-p.x,-(target.z-p.z));return true;
 }
 function stop(){if(run)releaseCityCell(run);run=null;cell=null;inventory=null;progress=0;guide=[];vx=vz=jumpHeight=jumpVelocity=0;}
 function setTheme(value){theme=value;if(cell){world=pilotWorld(run.layout,theme);const p=world.safe(position(),'neutrophil');if(!p){stop();return;}Object.assign(cell,groundCoordinate(p));progress=0;guideTime=-Infinity;resetMotion();}}
 function target(range=Math.max(1.5,cityRule(run,'neutrophil').params.range*.1)){
  if(!cell)return null;
  const p=position(),dx=Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=-Math.cos(yaw)*Math.cos(pitch);let best=null,depth=Infinity;
  for(const e of run.enemies){
   if(!hostile(e))continue;const q=groundPoint(e),x=q.x-p.x,z=q.z-p.z,y=.43-eye(),t=x*dx+y*dy+z*dz;
   if(t<0||t>range||t>=depth||x*x+y*y+z*z-t*t>.43**2||!world.clear(p,q))continue;best=e;depth=t;
  }return best;
 }
 function equip(id){
  if(!cell||id===inventory.tool||!PILOT_TOOLS.some(t=>t.id===id))return false;
  previousTool=inventory.tool;inventory.tool=id;actionBlocked=previousAction;progress=0;workKey='';scan=null;scoped=false;guideTime=-Infinity;say(pilotTool(id).name);return true;
 }
 function cycle(direction=1){if(!inventory)return false;const i=PILOT_TOOLS.findIndex(t=>t.id===inventory.tool);return equip(PILOT_TOOLS[(i+(direction<0?-1:1)+PILOT_TOOLS.length)%PILOT_TOOLS.length].id);}
 function previous(){return equip(previousTool);}
 function matchTool(){const object=focus();if(object&&!object.idle)return equip(object.tool.id);return false;}
 function nextDestination(){if(!cell)return;const destinations=pilotJobs(run,inventory.tool).filter(j=>j.site&&j.id!=='lung'&&j.id!=='gut');if(destinations.length){const current=destinations.findIndex(j=>j.id===inventory.target);chooseDestination(destinations[(current+1)%destinations.length].id);say('목적지 · '+objective().name);}}
 function chooseDestination(id){if(!cell||id==='lung'||!run.districts[id]||!ruleTarget(run,'oxygen',id))return;inventory.target=id;progress=0;guideTime=-Infinity;}
 function step(dt,input={}){
  if(!cell)return;
  if(!run.cells.includes(cell)||cell.lost||run.status!=='running'||pilotedCell(run)!==cell){stop();return;}
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);
  const p=position();previousPosition={...p};previousEye=eye();
  const forward=clamp(input.forward||0,-1,1),strafe=clamp(input.strafe||0,-1,1),normal=Math.max(1,Math.hypot(forward,strafe)),moving=Math.hypot(forward,strafe)>.05;
  yaw+=(input.turn||0)*dt*1.8;pitch=clamp(pitch+(input.look||0)*dt*1.2,-1.2,1.2);scoped=!!input.scope;
  crouch=mix(crouch,input.crouch?1:0,1-Math.exp(-18*dt));sprinting=!!input.sprint&&!input.crouch&&!scoped&&moving&&cell.energy>0;
  // Shoot's edge-triggered jump and gravity, with cell-scale eye height.
  if(input.jump&&!jumpHeld&&jumpHeight===0&&!input.crouch)jumpVelocity=3.65;jumpHeld=!!input.jump;
  if(jumpHeight>0||jumpVelocity>0){jumpVelocity-=14*dt;jumpHeight=Math.max(0,jumpHeight+jumpVelocity*dt);if(!jumpHeight)jumpVelocity=0;}
  const speed=(input.crouch?1.75:sprinting?6.4:4.2)*(scoped?.65:1),blend=1-Math.exp(-(moving?14:22)*dt);
  vx=mix(vx,(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed/normal,blend);vz=mix(vz,(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*speed/normal,blend);
  world.move(p,vx*dt,vz*dt,'neutrophil');if(Math.abs(p.x-previousPosition.x)<Math.abs(vx*dt)*.1)vx=0;if(Math.abs(p.z-previousPosition.z)<Math.abs(vz*dt)*.1)vz=0;
  Object.assign(cell,groundCoordinate(p));
  const hazards=run.enemies.filter(e=>hostile(e)&&distance(p,groundPoint(e))<1.25&&world.clear(p,groundPoint(e))).length;
  if(hazards){cell.integrity=clamp(cell.integrity-dt*hazards*3,0,100);hurtUntil=run.time+.18;}
  const heart=siteAt(run.layout,'heart'),recover=distance(p,heart)<2.5&&run.districts.heart.oxygen>=20&&run.districts.heart.food>0&&!hazards;
  cell.energy=clamp(cell.energy+dt*(sprinting?-3:recover?5:1.5),0,100);if(recover)cell.integrity=clamp(cell.integrity+dt*3,0,100);
  if(cell.integrity<=0){cell.lost=true;stop();return;}
  const rawUse=!!(input.use||input.fire||input.interact);if(!rawUse){actionBlocked=false;workTarget='';}const use=rawUse&&!actionBlocked;
  if(inventory.tool==='engulf'){
   if(use&&cell.cooldown<=0){const e=target();if(e){const result=pilotCellAction(run,'attack',e.id);if(result.ok){shots++;hitUntil=run.time+.2;say(result.defeated?'병원체 제거':'명중');}else say(result.text);}else if(!previousAction)say('조준점을 맞추고 가까이 접근');}
  }else{
   const object=focus(),goal=object?.job,def=pilotTool(inventory.tool),at=object?.near,ready=(pilotCooldowns(run)[def.id]||0)<=run.time;
   if(use&&object){if(!workTarget)workTarget=object.key;else if(workTarget!==object.key){actionBlocked=true;say('대상 변경 · 다시 사용');}}
   const mobileWork=['cleanup','antigen','signal','scanner'].includes(def.id),acting=use&&!actionBlocked&&goal&&at&&ready&&(mobileWork||Math.hypot(vx,vz)<.25&&jumpHeight===0);
   if(workKey!==goal?.id){progress=0;workKey=goal?.id||'';}
   if(acting){progress+=dt;if(progress>= (def.id==='oxygen'?cityRule(run,'oxygen').params.duration:def.duration)){
    const result=pilotCellAction(run,def.id,goal.id);progress=0;say(result.text);
    if(result.ok){actions++;hitUntil=run.time+.16;workPulse={key:object.key,tool:def.id,at:run.time,target:{...object.target},height:object.height,from:{...p},loading:!!result.loaded};if(result.scan){scan=result.scan;scanUntil=run.time+4;}if(result.delivered){deliveries++;if(def.id==='oxygen')oxygen+=result.delivered;}if(def.id==='oxygen'&&!inventory.oxygen)inventory.target=destination();guideTime=-Infinity;}
   }}else{progress=0;if(use&&!previousAction)say(!object?'대상을 조준하세요':!goal?object.idle?'지금 할 작업 없음':object.tool.key+' · '+object.tool.name:!ready?'도구 재사용 대기':!at?'작업 대상 가까이 이동':'멈춰서 작업');}
  }
  previousAction=rawUse;cell.task='직접 조종 · '+pilotTool(inventory.tool).short;
  const goal=objective();if(goal.id!==guideKey||run.time-guideTime>2){guideTime=run.time;guideKey=goal.id;guide=world.route(p,goal,'neutrophil');}
 }
 function view(alpha=1){
  if(!cell)return null;const actual=position(),goal=objective(),def=pilotTool(inventory.tool),aim=target(scoped||def.id==='scanner'?18:undefined);let next=goal;
  if(guide.length){let closest=0;for(let i=1;i<guide.length;i++)if(distance(actual,guide[i])<distance(actual,guide[closest]))closest=i;guide=guide.slice(closest);next=guide.find(q=>distance(actual,q)>1.1)||goal;}
  const t=clamp(alpha,0,1),p=previousPosition?{x:mix(previousPosition.x,actual.x,t),z:mix(previousPosition.z,actual.z,t)}:actual;
  return {cell,inventory,tool:def,position:p,eye:mix(previousEye,eye(),t),goal,next,guide,yaw,pitch,aim,theme,interaction:focus(),workPulse:workPulse&&run.time-workPulse.at<.8?{...workPulse,progress:(run.time-workPulse.at)/.8}:null,using:previousAction&&!actionBlocked,progress:progress/(def.id==='oxygen'?cityRule(run,'oxygen').params.duration:def.duration||1),notice:run.time<noticeUntil?notice:'',shots,deliveries,oxygen,actions,scan:run.time<scanUntil?scan:null,cooldown:Math.max(0,(pilotCooldowns(run)[def.id]||0)-run.time),hit:run.time<hitUntil,hurt:run.time<hurtUntil,distance:distance(actual,goal),sprinting,crouching:crouch>.5,scoped,airborne:jumpHeight>0,speed:Math.hypot(vx,vz),water:theme==='2'&&world.town.source.isWater(actual)};
 }
 return {start,stop,step,view,objective,equip,cycle,previous,matchTool,nextDestination,setTheme,chooseDestination,resetMotion,get active(){return !!cell;},get cell(){return cell;},get run(){return run;},get world(){return world;},look(dx,dy){const sensitivity=scoped?.00125:.0025;yaw+=clamp(dx,-180,180)*sensitivity;pitch=clamp(pitch-clamp(dy,-180,180)*sensitivity,-1.2,1.2);}};
}
