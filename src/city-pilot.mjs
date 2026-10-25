import {takeCityCell,releaseCityCell,pilotCellAction} from './city-engine.mjs';
import {pilotedCell,pilotInventory,pilotTool,pilotCooldowns,PILOT_TOOLS,PILOT_GRAPPLE_RANGE,setPilotPose} from './city-pilot-state.mjs';
import {pilotObjective,pilotHostile,pilotJobs} from './city-pilot-tasks.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {cityDistricts,siteAt} from './city-tile-layout.mjs';
import {cityRule,ruleTarget} from './city-rules.mjs';
import {pilotFocus} from './city-pilot-interactions.mjs';
import {pilotObservation} from './city-pilot-observation.mjs';
import {constrainPilotRope} from './city-pilot-rope.mjs';
import {sandboxIncidents,selectSandboxCell,reserveSandboxCell} from './city-sandbox.mjs';
import {sandboxEventsEnabled,setSandboxEvents} from './city-sandbox-events.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),mix=(a,b,t)=>a+(b-a)*t;
const hostile=pilotHostile;
export function createCityPilot(){
 let run=null,cell=null,world=null,inventory=null,theme='2',yaw=0,pitch=0,progress=0,previousAction=false;
 let notice='',noticeUntil=0,shots=0,deliveries=0,oxygen=0,hitUntil=0,hurtUntil=0,guide=[],guideTime=-Infinity,guideKey='';
 let vx=0,vz=0,jumpHeight=0,jumpVelocity=0,jumpHeld=false,crouch=0,sprinting=false,scoped=false,previousPosition=null,previousEye=.58;
 let previousTool='oxygen',actionBlocked=false,workKey='',actions=0,scan=null,scanUntil=0;
 let workTarget='',workPulse=null;
 let flying=false,grounded=true,flightHeld=false,dashHeld=false,dashUntil=0,dashReady=0,dashDirection=null,stuck=0,beam=null,shock=null;
 let watched=null,following=false,followRoute=[],followAt=-Infinity,grapple=null,grappleHeld=false,riding=null,shot=null,projectiles=[];
 let lastIntegrity=100;
 const position=()=>cell?groundPoint(cell):null;
 const eye=()=>((theme==='2'&&world.town.source.isWater(position())) ? .48 : .58)-crouch*.24+jumpHeight;
 const focus=()=>cell?pilotFocus(run,{position:position(),yaw,pitch,eye:eye()},world):null;
 function destination(){return cityDistricts(run).filter(d=>d.id!=='lung'&&ruleTarget(run,'oxygen',d.id)).sort((a,b)=>run.districts[a.id].oxygen-run.districts[b.id].oxygen)[0]?.id||'heart';}
 function objective(){
  if(!cell)return null;
  if(following&&watched?.cell&&run.cells.includes(watched.cell))return {id:'follow:'+watched.cell.id,...groundPoint(watched.cell),name:'따라가기 · '+pilotObservation(run,watched).name,action:'scanner'};
  if(inventory.tool==='scanner'){const aimed=target(8);if(aimed)return pilotJobs(run,'scanner').find(j=>j.enemy===aimed);}
  return pilotObjective(run,inventory.tool,position());
 }
 function say(text){if(text){notice=text;noticeUntil=run.time+3;}}
 function resetMotion(){vx=vz=0;jumpHeld=false;sprinting=scoped=false;grapple=null;grappleHeld=false;following=false;previousPosition=position();if(cell)previousEye=eye();}
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
  lastIntegrity=cell.integrity;projectiles=[];
  shots=deliveries=oxygen=actions=0;scan=null;scanUntil=0;watched=null;following=false;followRoute=[];followAt=-Infinity;riding=shot=null;previousTool=inventory.tool==='engulf'?'oxygen':'engulf';actionBlocked=false;workKey=workTarget='';workPulse=null;progress=0;guideTime=-Infinity;guideKey='';guide=[];previousAction=false;pitch=-.04;notice='';jumpHeight=jumpVelocity=crouch=0;flying=flightHeld=dashHeld=false;grounded=true;dashUntil=dashReady=stuck=0;beam=shock=null;resetMotion();setPilotPose(run,{height:0,eye:eye(),theme,yaw,pitch});
  const p=position(),goal=objective();guide=world.route(p,goal,'neutrophil');guideKey=goal.id;guideTime=run.time;
  const target=guide.find(q=>distance(p,q)>.6)||goal;yaw=Math.atan2(target.x-p.x,-(target.z-p.z));return true;
 }
 function recoverPosition(){if(!cell)return;riding=null;grapple=null;const p=world.safe(position(),'neutrophil')||world.safe(siteAt(run.layout,'heart'),'neutrophil');if(!p)return;Object.assign(cell,groundCoordinate(p));jumpHeight=jumpVelocity=0;flying=false;grounded=true;stuck=0;resetMotion();say('가까운 길로 복귀');setPilotPose(run,{height:0,eye:eye(),theme,yaw,pitch});}
 function stop(){if(run){selectSandboxCell(run,null);recoverPosition();releaseCityCell(run);}run=null;cell=null;inventory=null;progress=0;guide=[];vx=vz=jumpHeight=jumpVelocity=0;}
 function setTheme(value){theme=value;if(cell){closeObservation();world=pilotWorld(run.layout,theme);recoverPosition();progress=0;guideTime=-Infinity;}}
 function observe(){const object=focus();if(!object||!pilotObservation(run,object)){say('스캔할 대상을 조준하세요');return false;}watched=object;selectSandboxCell(run,object.cell);following=false;say('관찰 · '+object.name);return true;}
 function closeObservation(){watched=null;selectSandboxCell(run,null);following=false;guideTime=-Infinity;}
 function toggleFollowing(){if(!watched?.cell&&!observe())return false;if(!watched?.cell)return false;following=!following;grapple=null;riding=null;followAt=-Infinity;guideTime=-Infinity;say(following?'따라가기 · 이동하면 해제':'따라가기 해제');return following;}
 function toggleRide(){
  if(riding){riding=null;const p=world.safe(position(),'neutrophil');if(p)Object.assign(cell,groundCoordinate(p));jumpHeight=Math.min(.35,jumpHeight);jumpVelocity=0;say('내리기');return true;}
  const object=focus(),carrier=object?.shipment||watched?.shipment;
  if(!carrier||!run.shipments.includes(carrier)||distance(position(),groundPoint(carrier))>2.2||Math.abs(eye()-.5)>1.5||!world.clear({...position(),y:eye()},{...groundPoint(carrier),y:.5})){say('운반체 가까이에서 탑승');return false;}
  riding=carrier;flying=false;grapple=null;following=false;vx=vz=jumpVelocity=0;say('운반체 탑승');return true;
 }
 function attachGrapple(){
  if(grapple){if(grapple.phase==='attached')startGrapplePull(grapple);else if(grapple.phase==='flying'){grapple.pullRequested=true;say('고정 후 자동 이동');}return true;}
  if(cell.energy<3){say('그래플 · 에너지 부족');return false;}
  const p=position(),from={...p,y:eye()},d={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)},hit=world.trace(from,d,PILOT_GRAPPLE_RANGE),valid=hit&&hit.y>=.27&&hit.distance>=.9;
  const anchor=hit||{x:from.x+d.x*PILOT_GRAPPLE_RANGE,y:from.y+d.y*PILOT_GRAPPLE_RANGE,z:from.z+d.z*PILOT_GRAPPLE_RANGE};
  grapple={phase:'flying',origin:from,tip:{...from},anchor,valid,length:hit?.distance??PILOT_GRAPPLE_RANGE,elapsed:0,pullRequested:false,blocked:0};cell.energy-=3;riding=null;following=false;say('갈고리 발사');return true;
 }
 function startGrapplePull(g){g.phase='pulling';g.pullAt=run.time;g.pullSpeed=0;flying=false;grounded=false;say('갈고리 이동');}
 function releaseGrapple(text){grapple=null;say(text);}
 function grappleDistance(p){const a=grapple.anchor;return Math.hypot(a.x-p.x,a.y-eye(),a.z-p.z);}
 function pullGrapple(dt,p,delta){
  const g=grapple,a=g.anchor,d=Math.max(.01,grappleDistance(p));g.pullSpeed=Math.min(24,g.pullSpeed+75*dt);const speed=Math.min(g.pullSpeed,Math.max(0,d-1.1)/dt);
  vx=(a.x-p.x)/d*speed;jumpVelocity=(a.y-eye())/d*speed;vz=(a.z-p.z)/d*speed;delta.x=vx*dt;delta.y=jumpVelocity*dt;delta.z=vz*dt;g.length=d;
 }
 function advanceGrapple(dt,p){
  if(!grapple)return;const g=grapple,from={...p,y:eye()};
  if(g.phase==='flying'){
   g.elapsed+=dt;const t=Math.min(1,g.elapsed*75/Math.max(.01,g.length));g.tip={x:mix(g.origin.x,g.anchor.x,t),y:mix(g.origin.y,g.anchor.y,t),z:mix(g.origin.z,g.anchor.z,t)};
   if(t===1){if(g.valid&&world.clear(from,g.anchor)){g.phase='attached';g.length=Math.max(1.2,grappleDistance(p));say('고정 · F 다시 눌러 당기기');if(g.pullRequested)startGrapplePull(g);}else{g.phase='returning';say('고정할 표면 없음');}}
  }else if(g.phase==='returning'){
   const d=Math.hypot(g.tip.x-from.x,g.tip.y-from.y,g.tip.z-from.z),t=Math.min(1,90*dt/Math.max(.01,d));g.tip={x:mix(g.tip.x,from.x,t),y:mix(g.tip.y,from.y,t),z:mix(g.tip.z,from.z,t)};if(t===1)grapple=null;
  }else if(!world.clear(from,g.anchor))releaseGrapple('갈고리 자동 해제');
  else if(g.phase==='pulling'&&(grappleDistance(p)<=1.35||run.time-g.pullAt>3.5))releaseGrapple('갈고리 자동 해제');
 }
 function toggleFlight(){if(!cell)return false;if(flying){flying=false;say('활공 · 착지');return true;}flying=true;jumpVelocity=0;say('제트팩 ON');return true;}
 function target(range=pilotTool('engulf').range){
  if(!cell)return null;
  const p=position(),dx=Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=-Math.cos(yaw)*Math.cos(pitch);let best=null,depth=Infinity;
  for(const e of run.enemies){
   if(!hostile(e))continue;const q=groundPoint(e),x=q.x-p.x,z=q.z-p.z,y=.43-eye(),t=x*dx+y*dy+z*dz;
   if(t<0||t>range||t>=depth||x*x+y*y+z*z-t*t>.43**2||!world.clear({...p,y:eye()},{...q,y:.43}))continue;best=e;depth=t;
  }return best;
 }
 function equip(id){
  if(!cell||id===inventory.tool||!PILOT_TOOLS.some(t=>t.id===id))return false;
  previousTool=inventory.tool;inventory.tool=id;actionBlocked=previousAction;progress=0;workKey='';scan=null;scoped=false;guideTime=-Infinity;say(pilotTool(id).name);return true;
 }
 function cycle(direction=1){if(!inventory)return false;const i=PILOT_TOOLS.findIndex(t=>t.id===inventory.tool);return equip(PILOT_TOOLS[(i+(direction<0?-1:1)+PILOT_TOOLS.length)%PILOT_TOOLS.length].id);}
 function previous(){return equip(previousTool);}
 function matchTool(){if(inventory.tool==='scanner'&&watched?.cell){const help=pilotObservation(run,watched)?.help?.[0];if(help)return equip(help.tool);}const object=focus();if(object&&!object.idle)return equip(object.tool.id);return false;}
 function nextDestination(){if(!cell)return;const destinations=pilotJobs(run,inventory.tool).filter(j=>j.site&&j.id!=='lung'&&j.id!=='gut');if(destinations.length){const current=destinations.findIndex(j=>j.id===inventory.target);chooseDestination(destinations[(current+1)%destinations.length].id);say('목적지 · '+objective().name);}}
 function chooseDestination(id){if(!cell||id==='lung'||!run.districts[id]||!ruleTarget(run,'oxygen',id))return;inventory.target=id;progress=0;guideTime=-Infinity;}
 function step(dt,input={}){
  if(!cell)return;
  if(!run.cells.includes(cell)||cell.lost||run.status!=='running'||pilotedCell(run)!==cell){stop();return;}
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);
  const p=position();previousPosition={...p};previousEye=eye();
  projectiles=projectiles.filter(s=>run.time-s.at<s.duration+.14);
  let forward=clamp(input.forward||0,-1,1),strafe=clamp(input.strafe||0,-1,1);
  if(watched&&!pilotObservation(run,watched)){closeObservation();say('관찰 대상 이동 종료');}
  if(following){
   if(Math.hypot(forward,strafe)>.05||input.jump||input.dash||input.grapple||!watched?.cell){following=false;}
   else{const q=groundPoint(watched.cell);if(distance(p,q)>2){
    if(run.time-followAt>.7){followRoute=world.route(p,q,'neutrophil');followAt=run.time;}
    while(followRoute.length&&distance(p,followRoute[0])<.5)followRoute.shift();const next=followRoute[0];
    if(next){const heading=Math.atan2(next.x-p.x,-(next.z-p.z)),angle=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw));yaw+=angle*(1-Math.exp(-6*dt));forward=Math.cos(heading-yaw)*.85;strafe=Math.sin(heading-yaw)*.85;}
   }}
  }
  if(riding&&(!run.shipments.includes(riding)||Math.hypot(forward,strafe)>.05||input.jump||input.flight)){riding=null;say('운반체에서 내림');}
  if(input.grapple&&!grappleHeld&&!riding)attachGrapple();grappleHeld=!!input.grapple;advanceGrapple(dt,p);
  const tethered=grapple?.phase==='attached',pulling=grapple?.phase==='pulling';
  const normal=Math.max(1,Math.hypot(forward,strafe)),moving=Math.hypot(forward,strafe)>.05;
  yaw+=(input.turn||0)*dt*1.8;pitch=clamp(pitch+(input.look||0)*dt*1.2,-1.45,1.45);scoped=!!input.scope;
  if(input.flight&&!flightHeld)toggleFlight();flightHeld=!!input.flight;
  const stayLow=crouch>.5&&!world.fitsBody({...p,y:jumpHeight},.62);crouch=mix(crouch,input.crouch&&!flying&&!tethered||stayLow?1:0,1-Math.exp(-18*dt));sprinting=!!input.sprint&&crouch<.5&&!scoped&&moving&&cell.energy>0;
  if(input.dash&&!dashHeld&&!pulling&&run.time>=dashReady&&cell.energy>=8){
   const angle=moving?yaw+Math.atan2(strafe,forward):yaw,vertical=flying?Math.sin(pitch):0;
   dashDirection={x:Math.sin(angle)*Math.sqrt(1-vertical*vertical),y:vertical,z:-Math.cos(angle)*Math.sqrt(1-vertical*vertical)};dashUntil=run.time+.2;dashReady=run.time+2.2;cell.energy-=8;say('돌진');
  }dashHeld=!!input.dash;
  if(riding){jumpVelocity=0;vx=vz=0;}
  else if(flying){
   const climb=!!input.jump,descend=input.crouch;
   jumpVelocity=mix(jumpVelocity,climb?12:descend?-9:0,1-Math.exp(-9*dt));
  }else{
   if(input.jump&&!jumpHeld&&grounded&&!input.crouch&&!pulling){jumpVelocity=4.6;grounded=false;}
   jumpVelocity=Math.max(-3.6,jumpVelocity-14*dt);
  }jumpHeld=!!input.jump;
  const dashing=run.time<dashUntil,speed=(following&&watched?.cell?clamp(distance(p,groundPoint(watched.cell))*2,4.2,22):flying?(sprinting?7.5:5.4):input.crouch?1.75:sprinting?6.4:4.2)*(scoped?.65:1),blend=1-Math.exp(-(moving?14:22)*dt);
  if(tethered||!grounded&&!flying){const force=tethered?10:6;vx+=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*force*dt/normal;vz+=(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*force*dt/normal;const max=18,size=Math.hypot(vx,vz);if(size>max){vx*=max/size;vz*=max/size;}}
  else{vx=mix(vx,(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed/normal,blend);vz=mix(vz,(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*speed/normal,blend);}
  const body={...p,y:jumpHeight},ridePoint=riding?groundPoint(riding):null,delta=ridePoint?{x:ridePoint.x-p.x,y:.32-jumpHeight,z:ridePoint.z-p.z}:{x:(dashing?dashDirection.x*12:vx)*dt,y:(dashing&&flying?dashDirection.y*12:jumpVelocity)*dt,z:(dashing?dashDirection.z*12:vz)*dt};
  if(pulling)pullGrapple(dt,p,delta);
  else if(tethered){const velocity={x:vx,y:jumpVelocity,z:vz};constrainPilotRope(body,delta,velocity,grapple.anchor,grapple.length,eye()-jumpHeight);vx=velocity.x;vz=velocity.z;jumpVelocity=velocity.y;}
  const beforeHeight=jumpHeight,contact=world.moveBody(body,delta,.62-crouch*.2);p.x=body.x;p.z=body.z;jumpHeight=body.y;grounded=contact.grounded;
  if(contact.ceiling)jumpVelocity=Math.min(0,jumpVelocity);if(grounded){jumpVelocity=Math.max(0,jumpVelocity);if(flying&&input.crouch){flying=false;say('착지');}}
  if(ridePoint&&distance(p,ridePoint)>.8){riding=null;say('안전 하차');}
  if(Math.abs(p.x-previousPosition.x)<Math.abs(vx*dt)*.1)vx=0;if(Math.abs(p.z-previousPosition.z)<Math.abs(vz*dt)*.1)vz=0;
  if(pulling&&grapple){const travelled=Math.hypot(p.x-previousPosition.x,jumpHeight-beforeHeight,p.z-previousPosition.z),expected=Math.hypot(delta.x,delta.y,delta.z);grapple.blocked=travelled<expected*.2?grapple.blocked+dt:0;if(grappleDistance(p)<=1.35||grapple.blocked>.18)releaseGrapple('갈고리 자동 해제');}
  stuck=moving&&distance(p,previousPosition)<.01?stuck+dt:0;
  Object.assign(cell,groundCoordinate(p));
  setPilotPose(run,{height:jumpHeight,eye:eye(),theme,yaw,pitch});beam=null;
  const hazards=run.enemies.filter(e=>hostile(e)&&Math.hypot(distance(p,groundPoint(e)),eye()-.43)<1.25&&world.clear({...p,y:eye()},{...groundPoint(e),y:.43})).length;
  if(cell.integrity<lastIntegrity)hurtUntil=run.time+.22;lastIntegrity=cell.integrity;
  const heart=siteAt(run.layout,'heart'),recover=distance(p,heart)<2.5&&jumpHeight<1&&run.districts.heart.oxygen>=20&&run.districts.heart.food>0&&!hazards;
  cell.energy=clamp(cell.energy+dt*(sprinting?-3:recover?5:1.5),0,100);if(recover)cell.integrity=clamp(cell.integrity+dt*3,0,100);
  if(cell.integrity<=0){cell.lost=true;stop();return;}
  const rawUse=!!(input.use||input.fire||input.interact);if(!rawUse){actionBlocked=false;workTarget='';}const use=rawUse&&!actionBlocked;
  if(inventory.tool==='engulf'){
   if(use&&cell.cooldown<=0){const e=target(),result=pilotCellAction(run,'attack',e?.id);if(result.ok){shots++;const from={x:p.x+Math.cos(yaw)*.2+Math.sin(yaw)*.25,y:eye()-.14,z:p.z+Math.sin(yaw)*.2-Math.cos(yaw)*.25};shot={at:run.time,from,target:result.impact,hit:result.hit,defeated:result.defeated};projectiles.push({...shot,duration:clamp(Math.hypot(from.x-shot.target.x,from.y-shot.target.y,from.z-shot.target.z)/45,.09,.45)});if(projectiles.length>16)projectiles.shift();if(result.hit){hitUntil=run.time+.1;say(result.defeated?'병원체 제거':'명중');}pitch=clamp(pitch+.003,-1.45,1.45);}else say(result.text);}
  }else if(inventory.tool==='scanner'){
   if(use&&!previousAction){const object=focus(),job=object?.jobs.find(j=>j.action==='scanner');
    if(job){const result=pilotCellAction(run,'scanner',job.id);if(result.ok){watched=object;selectSandboxCell(run,object.cell);actions++;hitUntil=run.time+.12;scan=result.scan;scanUntil=run.time+4;say('관찰 · '+object.name);}else say(result.text||'스캐너 재사용 대기');}
    else say('관찰할 대상을 조준하세요');
   }
  }else if(inventory.tool==='repulsor'){
   if(use&&!previousAction){const result=pilotCellAction(run,'repulsor');say(result.text);if(result.ok){actions++;hitUntil=run.time+.15;shock={at:run.time,from:{...p,y:eye()},yaw,pitch};}}
  }else{
   const object=focus(),goal=object?.job,def=pilotTool(inventory.tool),at=object?.near,ready=(pilotCooldowns(run)[def.id]||0)<=run.time;
   if(use&&object){if(!workTarget)workTarget=object.key;else if(workTarget!==object.key){actionBlocked=true;say('대상 변경 · 다시 사용');}}
   const pulling=def.id==='tractor'&&goal?.debris,mobileWork=['cleanup','antigen','signal','scanner','tractor'].includes(def.id),acting=use&&!actionBlocked&&goal&&at&&ready&&(mobileWork||Math.hypot(vx,vz)<.25&&grounded);
   if(acting&&goal.cell&&['oxygen','nutrient','cleanup','signal'].includes(def.id))reserveSandboxCell(run,goal.cell);
   if(workKey!==goal?.id){progress=0;workKey=goal?.id||'';}
   if(acting){progress+=dt;if(progress>= (def.id==='oxygen'?cityRule(run,'oxygen').params.duration:def.duration)){
    const result=pilotCellAction(run,pulling?'tractor-pull':def.id,goal.id,dt);progress=0;say(result.text);
    if(pulling&&result.ok)beam={from:{...p,y:eye()-.1},target:result.target||{...object.target,y:.12}};
    if(result.ok&&!result.pulling){actions++;hitUntil=run.time+.16;workPulse={key:object.key,tool:def.id,at:run.time,target:{...object.target},height:object.height,from:{...p,y:eye()-.1},loading:!!result.loaded||pulling};if(result.scan){scan=result.scan;scanUntil=run.time+4;watched=object;selectSandboxCell(run,object.cell);}if(result.delivered){deliveries++;if(def.id==='oxygen')oxygen+=result.delivered;}if(def.id==='oxygen'&&!inventory.oxygen)inventory.target=destination();guideTime=-Infinity;}
   }}else{progress=0;if(use&&!previousAction)say(!object?'대상을 조준하세요':!goal?object.idle?'지금 할 작업 없음':object.tool.key+' · '+object.tool.name:!ready?'도구 재사용 대기':!at?'작업 대상 가까이 이동':'멈춰서 작업');}
  }
  previousAction=rawUse;cell.task='직접 조종 · '+pilotTool(inventory.tool).short;
  const goal=objective(),navigating=!goal.idle&&(inventory.tool!=='scanner'||following)&&!flying&&jumpHeight<=1&&!riding&&!grapple;
  if(!navigating){guide=[];guideTime=run.time;guideKey=goal.id;}
  else if(goal.id!==guideKey||run.time-guideTime>2){guideTime=run.time;guideKey=goal.id;guide=world.route(p,goal,'neutrophil');}
 }
 function view(alpha=1){
  if(!cell)return null;const actual=position(),goal=objective(),def=pilotTool(inventory.tool),aim=target(scoped||def.id==='scanner'?18:undefined);let next=goal;
  if(guide.length){let closest=0;for(let i=1;i<guide.length;i++)if(distance(actual,guide[i])<distance(actual,guide[closest]))closest=i;guide=guide.slice(closest);next=guide.find(q=>distance(actual,q)>1.1)||goal;}
  const t=clamp(alpha,0,1),p=previousPosition?{x:mix(previousPosition.x,actual.x,t),z:mix(previousPosition.z,actual.z,t)}:actual;
  return {cell,inventory,tool:def,position:p,eye:mix(previousEye,eye(),t),goal,next,guide,yaw,pitch,aim,theme,eventsEnabled:sandboxEventsEnabled(run),interaction:focus(),observed:pilotObservation(run,watched),following,riding,grapple:grapple?{phase:grapple.phase,from:{...p,y:eye()-.1},target:grapple.tip,length:grapple.length,pullRequested:grapple.pullRequested}:null,projectiles:projectiles.map(s=>({...s,progress:clamp((run.time-s.at)/s.duration,0,1),impactAge:Math.max(0,run.time-s.at-s.duration)})),shot:shot&&run.time-shot.at<.18?{...shot,progress:(run.time-shot.at)/.18}:null,incidents:sandboxIncidents(run).filter(e=>distance(p,e)<18).sort((a,b)=>distance(p,a)-distance(p,b)).slice(0,2),workPulse:workPulse&&run.time-workPulse.at<.8?{...workPulse,progress:(run.time-workPulse.at)/.8}:null,using:previousAction&&!actionBlocked,progress:progress/(def.id==='oxygen'?cityRule(run,'oxygen').params.duration:def.duration||1),notice:run.time<noticeUntil?notice:'',shots,deliveries,oxygen,actions,scan:run.time<scanUntil?scan:null,cooldown:Math.max(0,(pilotCooldowns(run)[def.id]||0)-run.time),hit:run.time<hitUntil,hurt:run.time<hurtUntil,distance:distance(actual,goal),sprinting,crouching:crouch>.5,scoped,airborne:!grounded,speed:Math.hypot(vx,vz),water:theme==='2'&&world.town.source.isWater(actual),flying,height:jumpHeight,dashing:run.time<dashUntil,dashCooldown:Math.max(0,dashReady-run.time),stuck:stuck>1.2,beam,shock:shock&&run.time-shock.at<.45?{...shock,progress:(run.time-shock.at)/.45}:null};
 }
 return {start,stop,step,view,objective,equip,cycle,previous,matchTool,nextDestination,setTheme,chooseDestination,resetMotion,toggleFlight,recoverPosition,observe,closeObservation,toggleFollowing,toggleRide,toggleEvents(){if(run)setSandboxEvents(run,!sandboxEventsEnabled(run));},get active(){return !!cell;},get cell(){return cell;},get run(){return run;},get world(){return world;},look(dx,dy){const sensitivity=scoped?.00125:.0025;yaw+=clamp(dx,-180,180)*sensitivity;pitch=clamp(pitch-clamp(dy,-180,180)*sensitivity,-1.45,1.45);}};
}
