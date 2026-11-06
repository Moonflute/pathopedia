import {TILE,COLS,ROWS,SITES,POINTS,DOCKS,PORTS,blocked} from './cell-office-layout.mjs';
import {createLogistics,tickLogistics,helpStation,neededInput,takeInput,putInput,takeOutput,dispatch} from './cell-office-logistics.mjs';
export {TILE,COLS,ROWS,SITES,POINTS,blocked};
export const SAVE_KEY = 'pathopedia:cell-village:v1';
export const CLOTHES = ['#c65e56', '#548f80', '#7389b4', '#a27eab', '#d6a153', '#6d8290'];
export const HAIR = ['#574237', '#a97143', '#ddd2b1'];
export const SKIN = ['#f3cfaa', '#c99873', '#805c48'];
export const RESIDENTS = [
  {id:'ruby',name:'루비',role:'적혈구',color:'#cb665d',hair:1,skin:0,hat:'cap',home:'heart',work:'물류 배차',route:['dispatch','lung','dispatch','gut','dispatch','lounge'],line:'파란 산소, 노란 식량. 오늘도 배송 중!'},
  {id:'beat',name:'두두',role:'심근세포',color:'#c78383',hair:0,skin:1,hat:'band',home:'heart',work:'순환 펌프 가동',route:['heart','heart','lounge','heart'],line:'두근, 두근. 이 박자에 벨트가 움직여.'},
  {id:'breeze',name:'솔솔',role:'폐포세포',color:'#69a69b',hair:2,skin:0,hat:'flower',home:'lung',work:'산소 충전',route:['lung','lung','lounge','lung'],line:'갓 충전한 산소야. 저 벨트에 실어 보낼게.'},
  {id:'spark',name:'반짝',role:'신경세포',color:'#a48cb5',hair:0,skin:2,hat:'antenna',home:'brain',work:'신호 설비 가동',route:['brain','brain','coffee','brain'],line:'모든 부서 이상 없음! 잠깐 커피 마실까?'},
  {id:'grain',name:'보리',role:'장세포',color:'#c59a5b',hair:1,skin:1,hat:'chef',home:'gut',work:'식량 포장',route:['gut','gut','lounge','gut'],line:'산소랑 함께 받아야 든든하게 일할 수 있지.'},
  {id:'clear',name:'맑음',role:'신장세포',color:'#759faf',hair:0,skin:0,hat:'cap',home:'kidney',work:'노폐물 여과',route:['kidney','kidney','lounge','kidney'],line:'정리부에서 보낸 상자는 여기서 마무리해.'},
  {id:'momo',name:'모모',role:'대식세포',color:'#8c9b72',hair:2,skin:2,hat:'band',home:'liver',work:'회수품 분류',route:['liver','liver','coffee','liver'],line:'쓰고 남은 건 내가 정리해서 여과부로 보낼게.'},
  {id:'patch',name:'토리',role:'섬유아세포',color:'#b49471',hair:1,skin:1,hat:'work',home:'marrow',work:'조직 수선',route:['marrow','marrow','lounge','marrow'],line:'물자가 도착하면 수선 시작. 오늘도 차근차근!'},
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function canStand(x,y) {
  return [[-4,-2],[4,-2],[-4,2],[4,2]].every(([dx,dy])=>!blocked(Math.floor((x+dx)/TILE),Math.floor((y+dy)/TILE)));
}
export function findPath(from,to) {
  const start=[Math.floor(from.x/TILE),Math.floor(from.y/TILE)];
  let end=[clamp(Math.floor(to.x/TILE),2,COLS-3),clamp(Math.floor(to.y/TILE),2,ROWS-2)];
  if(blocked(...end)){
    let nearest=null;
    for(let r=1;r<7&&!nearest;r++)for(let y=end[1]-r;y<=end[1]+r;y++)for(let x=end[0]-r;x<=end[0]+r;x++){
      if(!blocked(x,y)&&(!nearest||Math.hypot(x-end[0],y-end[1])<nearest.d))nearest={x,y,d:Math.hypot(x-end[0],y-end[1])};
    }
    if(!nearest)return [];
    end=[nearest.x,nearest.y];
  }
  const key=(x,y)=>y*COLS+x, queue=[start],previous=new Map([[key(...start),null]]);
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];
    if(x===end[0]&&y===end[1])break;
    for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){
      const nx=x+dx,ny=y+dy,k=key(nx,ny);
      if(!blocked(nx,ny)&&!previous.has(k)){previous.set(k,[x,y]);queue.push([nx,ny]);}
    }
  }
  if(!previous.has(key(...end)))return [];
  const path=[];let current=end;
  while(current&&key(...current)!==key(...start)){
    path.unshift({x:(current[0]+.5)*TILE,y:(current[1]+.5)*TILE});current=previous.get(key(...current));
  }
  return path;
}
export function createWorld(saved) {
  const world={time:0,help:0,player:null,residents:[],effects:[],logistics:createLogistics(saved?.production)};
  if(saved&&[1,2].includes(saved.version)){
    if(Number.isFinite(saved.time))world.time=clamp(saved.time,0,1e8);
    if(Number.isFinite(saved.help))world.help=clamp(Math.floor(saved.help),0,1e6);
    if(saved.player){
      const p=saved.player;
      world.player={name:String(p.name||'여행자').slice(0,12),color:CLOTHES.includes(p.color)?p.color:CLOTHES[1],hair:clamp(Math.floor(Number(p.hair)||0),0,2),skin:clamp(Math.floor(Number(p.skin)||0),0,2),x:Number(p.x),y:Number(p.y),direction:'down',step:0,path:[],moving:false};
      if(saved.version!==2||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!canStand(p.x,p.y))Object.assign(world.player,POINTS.plaza);
    }
  }
  world.residents=RESIDENTS.map((r,i)=>({...r,...POINTS[r.id==='ruby'?'dispatch':r.home],direction:'up',step:0,path:[],routeIndex:0,wait:8+i*1.3,activity:r.work,moving:false,deliveries:0,destination:r.id==='ruby'?'dispatch':r.home,task:'work',carry:null,handoff:0,greeting:0,nextBreak:world.time+65+i*5}));
  return world;
}
export function serializeWorld(w){return JSON.stringify({version:2,time:w.time,help:w.help,production:{work:w.logistics.stats.work,sorted:w.logistics.stats.sorted,filtered:w.logistics.stats.filtered},player:w.player&&{name:w.player.name,color:w.player.color,hair:w.player.hair,skin:w.player.skin,x:w.player.x,y:w.player.y}});}
export function moveActor(actor,dx,dy,dt,speed=55){
  const length=Math.hypot(dx,dy);actor.moving=length>.01;
  if(!actor.moving)return;
  dx=dx/length*speed*dt;dy=dy/length*speed*dt;
  if(canStand(actor.x+dx,actor.y))actor.x+=dx;
  if(canStand(actor.x,actor.y+dy))actor.y+=dy;
  actor.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
  actor.step+=dt*8;
}
function followPath(actor,dt,speed){
  const target=actor.path[0];
  if(!target){actor.moving=false;return;}
  const distance=Math.hypot(target.x-actor.x,target.y-actor.y);
  if(distance<speed*dt+1){actor.x=target.x;actor.y=target.y;actor.path.shift();actor.moving=!!actor.path.length;}
  else moveActor(actor,target.x-actor.x,target.y-actor.y,dt,speed);
}
const cargoName=kind=>({oxygen:'산소통',food:'식량 상자',waste:'회수 상자',sorted:'분류한 상자'})[kind];
function startTask(r,task,point,activity){
  r.task=task;r.path=findPath(r,point);r.handoff=.45;r.activity=activity;r.destination=r.home;
}
function face(r,point){
  const dx=point.x-r.x,dy=point.y-r.y;
  r.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
}
function tickEmployee(world,r,dt){
  const flow=world.logistics,s=flow.stations[r.home],work=POINTS[r.home],dock=DOCKS[r.home];
  if(r.task==='break'){
    r.task='rest';r.wait=6;r.direction='down';r.activity='휴게실에서 쉬는 중';return;
  }
  if(r.task==='rest'){
    r.wait-=dt;if(r.wait>0)return;
    r.nextBreak=world.time+75+RESIDENTS.findIndex(p=>p.id===r.id)*3;
    startTask(r,'work',work,'작업대로 돌아가는 중');return;
  }
  if(['pickup','load','unload'].includes(r.task)){
    face(r,r.task==='unload'?{x:work.x,y:work.y-TILE}:PORTS[r.home].path.at(-1));
    r.handoff=Math.max(0,r.handoff-dt);if(r.handoff>0)return;
    if(r.task==='pickup'){
      r.carry=takeInput(flow,r.home);
      startTask(r,r.carry?'unload':'work',work,r.carry?`${cargoName(r.carry.kind)} 작업대로 운반`:'입고 대기 중');
    }else if(r.task==='unload'){
      putInput(flow,r.home,r.carry);r.carry=null;r.deliveries++;
      startTask(r,'work',work,r.work);
    }else if(dispatch(flow,r.carry.kind,r.carry.from,r.carry.to)){
      r.carry=null;r.deliveries++;s.departure=1.2;
      startTask(r,'work',work,'작업대로 돌아가는 중');
    }
    return;
  }
  r.direction='up';
  if(s.output.length){
    if(s.readyTime>0){r.activity='출고 준비 중';return;}
    const parcel=takeOutput(flow,r.home,world.residents);
    if(parcel){r.carry=parcel;startTask(r,'load',dock,`${cargoName(parcel.kind)} 출고대로 운반`);return;}
  }
  if(world.time>=r.nextBreak&&s.progress===0){
    const dest=r.route.includes('coffee')?'coffee':'lounge';
    startTask(r,'break',POINTS[dest],'휴게실 가는 중');r.destination=dest;return;
  }
  const kind=neededInput(flow,r.home);
  if(kind){startTask(r,'pickup',dock,`${cargoName(kind)} 받으러 가는 중`);return;}
  r.activity=s.working?r.work:s.output.length?'출고 대기 중':['lung','gut'].includes(r.home)?'충전·포장 대기 중':'물자 도착 기다리는 중';
}
export function tickWorld(world,dt,input={}) {
  world.time+=dt;
  world.effects=world.effects.filter(e=>(e.life-=dt)>0);
  for(const r of world.residents){
    if(r.greeting>0){r.greeting=Math.max(0,r.greeting-dt);r.moving=false;continue;}
    if(r.path.length){followPath(r,dt,r.id==='ruby'?40:34);continue;}
    r.moving=false;
    if(r.id!=='ruby'){tickEmployee(world,r,dt);continue;}
    r.wait-=dt;r.direction='up';
    r.activity=['lounge','coffee'].includes(r.destination)?'휴게실에서 쉬는 중':r.destination==='dispatch'?'물류 배차 중':'출고 현황 확인 중';
    if(r.wait>0)continue;
    const dest=r.route[r.routeIndex++%r.route.length],point=POINTS[dest];
    r.path=findPath(r,point);r.wait=['lounge','coffee'].includes(dest)?6:13+(r.routeIndex%3)*2;r.destination=dest;
    r.activity=['lounge','coffee'].includes(dest)?'휴게실 가는 중':dest==='dispatch'?'물류 홀로 이동':`${SITES.find(s=>s.id===dest)?.name||'부서'}로 이동`;
    r.deliveries++;
  }
  tickLogistics(world.logistics,dt,world.residents);
  const p=world.player;
  if(p){
    if(input.x||input.y){p.path=[];moveActor(p,input.x,input.y,dt,70);}
    else if(input.walk)followPath(p,dt,70);
    else p.moving=false;
  }
}
export function nearestInteraction(world){
  if(!world.player)return null;
  const p=world.player;
  const choices=[...world.residents.map(r=>({kind:'resident',id:r.id,label:`${r.name}에게 인사`,x:r.x,y:r.y})),...SITES.map(s=>({kind:'site',id:s.id,label:s.action,...POINTS[s.id]}))];
  return choices.map(c=>({...c,d:Math.hypot(c.x-p.x,c.y-p.y)})).filter(c=>c.d<34).sort((a,b)=>a.d-b.d)[0]||null;
}
export function interact(world,target){
  if(!target)return '';
  if(target.kind==='resident'){
    const r=world.residents.find(r=>r.id===target.id);if(!r)return '';
    r.greeting=2;r.moving=false;r.direction='down';
    world.effects.push({x:r.x,y:r.y-28,life:2,kind:'heart'});
    return `${r.name} · ${r.line}`;
  }
  const site=SITES.find(s=>s.id===target.id);if(!site)return '';
  world.help++;helpStation(world.logistics,site.id);world.effects.push({...POINTS[site.id],life:3,kind:'spark'});return site.result;
}
export function villageClock(world){
  const total=360+Math.floor(world.time*2),minutes=total%1440;
  return {day:Math.floor(total/1440)+1,hour:Math.floor(minutes/60),text:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`};
}
