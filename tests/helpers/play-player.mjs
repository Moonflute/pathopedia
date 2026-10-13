import {newRun,tick,coverage,spawnEnemy,switchWeapon,lineOfSight,canStand,chooseReward,controlSource} from '../../src/play-engine.mjs';

// Deterministic QA player. It navigates walkable cells, aims visible enemies and uses actual weapons.
export function playCampaign(catalog,{seed=1,hard=false,host='normal',limit=720}={}){
 const r=newRun(catalog,{seed,hard,host});r.status='running';r.upgrades.immune=1;spawnEnemy(r,'pneumo',{x:6.5,y:3.5});r.spawned=1;
 let waypoint=null,lastGoal='',navTime=0,steps=0,patrol=0;const reports=[],route=[{x:12.5,y:10.5},{x:21.5,y:10.5},{x:20.5,y:17.5},{x:13.5,y:17.5},{x:4.5,y:16.5},{x:3.5,y:10.5}];
 const navigate=goal=>{
  const m=r.map,start=Math.floor(r.player.y)*m.width+Math.floor(r.player.x),end=Math.floor(goal.y)*m.width+Math.floor(goal.x),queue=[end],dist=new Int16Array(m.cells.length).fill(-1);dist[end]=0;
  for(let i=0;i<queue.length;i++)for(const n of [queue[i]-1,queue[i]+1,queue[i]-m.width,queue[i]+m.width])if(n>=0&&n<dist.length&&!m.cells[n]&&dist[n]===-1){dist[n]=dist[queue[i]]+1;queue.push(n);}
  if(start===end)return goal;
  let best=start;for(const n of [start-1,start+1,start-m.width,start+m.width])if(dist[n]>=0&&(dist[best]<0||dist[n]<dist[best]))best=n;
  return {x:best%m.width+.5,y:Math.floor(best/m.width)+.5};
 };
 while(steps++<limit*30&&r.status!=='won'&&r.status!=='lost'){
  if(r.status==='reward'){
   reports.push({wave:r.wave+1,time:Math.round(r.time),hp:Math.round(r.player.hp),kills:r.kills,pressure:Math.round(r.pressure)});
   const priority=r.pressure>35?['stewardship','efficiency','infusion','immune','source','scanner']:['efficiency','infusion','immune','source','stewardship','scanner'];
   const reward=priority.map(id=>r.rewards.find(e=>e.id===id)).find(Boolean);chooseReward(r,reward.id);r.status='running';continue;
  }
  const enemy=r.enemies.filter(e=>e.active&&e.state!=='Dead'&&lineOfSight(r.map,r.player,e)).sort((a,b)=>Math.hypot(a.x-r.player.x,a.y-r.player.y)-Math.hypot(b.x-r.player.x,b.y-r.player.y))[0];
  const live=r.enemies.filter(e=>e.active&&e.state!=='Dead');
  if(Math.hypot(r.player.x-route[patrol].x,r.player.y-route[patrol].y)<.8)patrol=(patrol+1)%route.length;
  const source=r.map.sources.find(s=>s.active),goal=source||((r.wave===5&&!live.length&&r.spawned>=28)?r.map.exit:route[patrol]),goalKey=goal.x+','+goal.y;
  navTime-=1/30;if(!waypoint||Math.hypot(waypoint.x-r.player.x,waypoint.y-r.player.y)<.15||goalKey!==lastGoal||navTime<=0){waypoint=navigate(goal);lastGoal=goalKey;navTime=1;}
  let dx=waypoint.x-r.player.x,dy=waypoint.y-r.player.y,fire=false;
  if(enemy){
   const d=Math.hypot(enemy.x-r.player.x,enemy.y-r.player.y);r.player.angle=Math.atan2(enemy.y-r.player.y,enemy.x-r.player.x);
   if(!hard||r.intel[enemy.kind]===3){
    const options=catalog.weapons.map((w,i)=>({w,i,c:coverage(catalog,w.id,enemy.kind,{exposure:Boolean(r.upgrades.infusion)})})).filter(o=>o.c.factor&&o.w.range>d&&r.energy[o.i]>=o.w.cost*Math.pow(.8,r.upgrades.efficiency||0));
    const favorite={pneumo:'ampicillin',ecoli:'ampicillin',mssa:'cefazolin',mrsa:'vancomycin',esbl:'meropenem'}[enemy.kind];options.sort((a,b)=>(a.w.id===favorite?-100:0)+a.w.pressure-(b.w.id===favorite?-100:0)-b.w.pressure);
    if(options.length){switchWeapon(r,options[0].i);fire=true;}
   }
   if(d<2.6){const candidates=[];for(let n=0;n<16;n++){const a=n*Math.PI/8,x=Math.cos(a),y=Math.sin(a);if(canStand(r.map,r.player.x+x*.6,r.player.y+y*.6))candidates.push({x,y,score:Math.hypot(r.player.x+x-enemy.x,r.player.y+y-enemy.y)-Math.hypot(r.player.x+x-goal.x,r.player.y+y-goal.y)*.03});}candidates.sort((a,b)=>b.score-a.score);if(candidates[0]){dx=candidates[0].x;dy=candidates[0].y;}}
  }else if(Math.hypot(dx,dy)>.1)r.player.angle=Math.atan2(dy,dx);
  const norm=Math.max(.01,Math.hypot(dx,dy));dx/=norm;dy/=norm;
  const c=Math.cos(r.player.angle),s=Math.sin(r.player.angle);
  if(source)controlSource(r);
  tick(r,{forward:dx*c+dy*s,strafe:-dx*s+dy*c,fire,scan:hard&&enemy&&r.intel[enemy.kind]<3},1/30);r.events.length=0;
 }
 return {status:r.status,time:Math.round(r.time),hp:Math.round(r.player.hp),wave:r.wave+1,kills:r.kills,pressure:Math.round(r.pressure),sources:r.map.sources.filter(s=>!s.active).length,position:r.player,remaining:r.enemies.filter(e=>e.active&&e.state!=='Dead').map(e=>({kind:e.kind,x:e.x,y:e.y,hp:e.hp})),reports};
}
