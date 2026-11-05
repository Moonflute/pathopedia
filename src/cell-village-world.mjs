export const TILE = 16;
export const COLS = 48;
export const ROWS = 34;
export const SAVE_KEY = 'pathopedia:cell-village:v1';
export const CLOTHES = ['#c65e56', '#548f80', '#7389b4', '#a27eab', '#d6a153', '#6d8290'];
export const HAIR = ['#574237', '#a97143', '#ddd2b1'];
export const SKIN = ['#f3cfaa', '#c99873', '#805c48'];
export const TREES = [[4,7],[4,12],[44,7],[44,12],[4,23],[44,25],[15,4],[32,4],[4,29],[44,30]];
export const BENCHES = [[19,20],[28,20],[12,21],[35,21]];
export const SITES = [
  {id:'brain', name:'신호 우체국', organ:'뇌', x:21,y:3,w:6,h:5, roof:'#9680a5', accent:'#ceb5db', symbol:'signal', action:'신호 보내기', result:'반짝, 신호가 마을에 닿았어요.'},
  {id:'lung', name:'숨결 온실', organ:'폐', x:7,y:8,w:6,h:5, roof:'#6b9990', accent:'#a7d4ca', symbol:'air', action:'환기하기', result:'온실에 산뜻한 바람이 불어요.'},
  {id:'marrow', name:'골수 공방', organ:'골수', x:35,y:8,w:6,h:5, roof:'#b48b5c', accent:'#ebce8b', symbol:'bone', action:'자재 정리', result:'공방의 작업대가 말끔해졌어요.'},
  {id:'heart', name:'두근두근 광장', organ:'심장', x:21,y:14,w:6,h:5, roof:'#b76161', accent:'#eaa199', symbol:'heart', action:'펌프 돌리기', result:'두근두근, 펌프에 힘을 보탰어요.'},
  {id:'gut', name:'영양 부엌', organ:'장', x:7,y:24,w:6,h:5, roof:'#c38b58', accent:'#f0cf88', symbol:'food', action:'식량 바구니 채우기', result:'따뜻한 식량 바구니가 준비됐어요.'},
  {id:'liver', name:'간 정리소', organ:'간', x:21,y:25,w:6,h:5, roof:'#a67471', accent:'#d9aaa0', symbol:'leaf', action:'물자 분류', result:'마을에 쓸 물자를 가지런히 정리했어요.'},
  {id:'kidney', name:'콩팥 여과소', organ:'신장', x:35,y:24,w:6,h:5, roof:'#7298ab', accent:'#aed7e5', symbol:'water', action:'여과 수조 살피기', result:'수조에 맑은 물이 흐르네요.'},
];
export const RESIDENTS = [
  {id:'ruby',name:'루비',role:'적혈구',color:'#cb665d',hair:1,skin:0,hat:'cap',home:'heart',work:'산소 배달',route:['lung','heart','gut','kidney','heart'],line:'오늘도 산소 한 바구니, 배달 갑니다!'},
  {id:'beat',name:'두두',role:'심근세포',color:'#c78383',hair:0,skin:1,hat:'band',home:'heart',work:'펌프 가동',route:['heart','heart','plaza'],line:'두근, 두근. 오늘도 좋은 박자야.'},
  {id:'breeze',name:'솔솔',role:'폐포세포',color:'#69a69b',hair:2,skin:0,hat:'flower',home:'lung',work:'산소 준비',route:['lung','lung','garden'],line:'깊게 숨 쉬어 봐. 바람이 참 좋지?'},
  {id:'spark',name:'반짝',role:'신경세포',color:'#a48cb5',hair:0,skin:2,hat:'antenna',home:'brain',work:'신호 전달',route:['brain','brain','heart'],line:'반가워! 네가 왔다는 소식도 전해 둘게.'},
  {id:'grain',name:'보리',role:'장세포',color:'#c59a5b',hair:1,skin:1,hat:'chef',home:'gut',work:'영양 포장',route:['gut','garden','gut','plaza'],line:'방금 담은 영양 바구니야. 든든하지?'},
  {id:'clear',name:'맑음',role:'신장세포',color:'#759faf',hair:0,skin:0,hat:'cap',home:'kidney',work:'노폐물 여과',route:['kidney','pond','kidney'],line:'졸졸 흐르는 물소리, 같이 듣고 갈래?'},
  {id:'momo',name:'모모',role:'대식세포',color:'#8c9b72',hair:2,skin:2,hat:'band',home:'liver',work:'주변 청소',route:['liver','plaza','lung','marrow','kidney'],line:'구석구석 깨끗하게! 산책길은 내가 맡을게.'},
  {id:'patch',name:'토리',role:'섬유아세포',color:'#b49471',hair:1,skin:1,hat:'work',home:'marrow',work:'조직 수선',route:['marrow','brain','heart','marrow'],line:'조금씩 고치다 보면 더 튼튼한 마을이 돼.'},
];
export const POINTS = {
  ...Object.fromEntries(SITES.map(s=>[s.id,{x:(s.x+s.w/2)*TILE,y:(s.y+s.h+1)*TILE}])),
  plaza:{x:24*TILE,y:22*TILE}, garden:{x:11*TILE,y:20*TILE}, pond:{x:37*TILE,y:20*TILE},
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function blocked(tx,ty) {
  if(tx<2||ty<2||tx>=COLS-2||ty>=ROWS-1)return true;
  if(tx>=38&&tx<=43&&ty>=17&&ty<=20)return true;
  if(TREES.some(([x,y])=>tx===x&&ty===y+1)||BENCHES.some(([x,y])=>ty===y&&tx>=x&&tx<x+2))return true;
  return SITES.some(s=>tx>=s.x&&tx<s.x+s.w&&ty>=s.y&&ty<s.y+s.h);
}
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
  const world={time:0,help:0,player:null,residents:[],effects:[],message:'',messageUntil:0};
  if(saved&&saved.version===1){
    if(Number.isFinite(saved.time))world.time=clamp(saved.time,0,1e8);
    if(Number.isFinite(saved.help))world.help=clamp(Math.floor(saved.help),0,1e6);
    if(saved.player){
      const p=saved.player;
      world.player={name:String(p.name||'여행자').slice(0,12),color:CLOTHES.includes(p.color)?p.color:CLOTHES[1],hair:clamp(Math.floor(Number(p.hair)||0),0,2),skin:clamp(Math.floor(Number(p.skin)||0),0,2),x:Number(p.x),y:Number(p.y),direction:'down',step:0,path:[],moving:false};
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!canStand(p.x,p.y))Object.assign(world.player,POINTS.plaza);
    }
  }
  world.residents=RESIDENTS.map((r,i)=>({...r,...POINTS[r.home],x:POINTS[r.home].x+(i%2?8:-8),direction:'down',step:0,path:[],routeIndex:i%r.route.length,wait:1+i*.7,activity:r.work,moving:false,deliveries:0}));
  return world;
}
export function serializeWorld(w){return JSON.stringify({version:1,time:w.time,help:w.help,player:w.player&&{name:w.player.name,color:w.player.color,hair:w.player.hair,skin:w.player.skin,x:w.player.x,y:w.player.y}});}
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
export function tickWorld(world,dt,input={}) {
  world.time+=dt;
  world.effects=world.effects.filter(e=>(e.life-=dt)>0);
  for(const r of world.residents){
    if(r.path.length){followPath(r,dt,r.id==='ruby'?31:22);continue;}
    r.moving=false;r.wait-=dt;
    if(r.wait>0)continue;
    const dest=r.route[r.routeIndex++%r.route.length],point=POINTS[dest];
    r.path=findPath(r,point);r.wait=5+(r.routeIndex%4)*2;
    r.activity=dest==='plaza'?'광장에서 쉬는 중':dest==='garden'?'정원 산책':dest==='pond'?'물길 살피는 중':r.work;
    r.deliveries++;
  }
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
    r.wait=6;r.path=[];r.moving=false;r.direction='down';
    world.effects.push({x:r.x,y:r.y-28,life:2,kind:'heart'});
    return `${r.name} · ${r.line}`;
  }
  const site=SITES.find(s=>s.id===target.id);if(!site)return '';
  world.help++;world.effects.push({...POINTS[site.id],life:3,kind:'spark'});return site.result;
}
export function villageClock(world){
  const total=360+Math.floor(world.time*2),minutes=total%1440;
  return {day:Math.floor(total/1440)+1,hour:Math.floor(minutes/60),text:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`};
}
