import {newRun,tick,combatCoverage,switchWeapon,lineOfSight,canStand,chooseReward,controlSource,isWeaponReady,shotCost,selectScanner} from '../../src/play-engine.mjs';
import {STAGES} from '../../src/play-data.mjs';

// QA controls only movement, aiming, weapons, scanning and available rewards. No teleport or invulnerability.
export function playCampaign(catalog,{seed=1,hard=false,host='normal',stage=0,mission='campaign',limit=1200}={}){
 const r=newRun(catalog,{seed,hard,host,stage,mission});r.status='running';r.upgrades.immune=1;
 let waypoint=null,lastGoal='',navTime=0,steps=0,lastMap=r.map.id;const reports=[];
 const navigate=goal=>{
  const m=r.map,start=Math.floor(r.player.y)*m.width+Math.floor(r.player.x),end=Math.floor(goal.y)*m.width+Math.floor(goal.x),queue=[end],dist=new Int16Array(m.cells.length).fill(-1);dist[end]=0;
  for(let i=0;i<queue.length;i++)for(const n of [queue[i]-1,queue[i]+1,queue[i]-m.width,queue[i]+m.width])if(n>=0&&n<dist.length&&!m.cells[n]&&dist[n]===-1){dist[n]=dist[queue[i]]+1;queue.push(n);}
  if(start===end)return goal;
  let best=start;for(const n of [start-1,start+1,start-m.width,start+m.width])if(dist[n]>=0&&(dist[best]<0||dist[n]<dist[best]))best=n;
  return {x:best%m.width+.5,y:Math.floor(best/m.width)+.5};
 };
 while(steps++<limit*30&&r.status!=='won'&&r.status!=='lost'){
  if(r.status==='reward'){
   reports.push({stage:r.wave+1,time:Math.round(r.time),hp:Math.round(r.player.hp),kills:r.kills,pressure:Math.round(r.pressure)});
   const priority=r.player.hp<65?['support','source','penetration','rate','renal','infusion','efficiency']:r.pressure>45?['stewardship','penetration','rate','infusion','efficiency']:['penetration','rate','infusion','efficiency','source','reserve','support'];
   const reward=priority.map(id=>r.rewards.find(e=>e.id===id)).find(Boolean)||r.rewards[0];chooseReward(r,reward.id);r.status='running';continue;
  }
  if(lastMap!==r.map.id){lastMap=r.map.id;waypoint=null;navTime=0;lastGoal='';}
  const distance=e=>Math.hypot(e.x-r.player.x,e.y-r.player.y),live=r.enemies.filter(e=>e.active&&e.state!=='Dead');
  const enemy=live.filter(e=>lineOfSight(r.map,r.player,e)).sort((a,b)=>distance(a)-distance(b))[0];
  const source=r.map.sources.filter(s=>s.active).sort((a,b)=>distance(a)-distance(b))[0];
  const unvisited=r.map.rooms.find(room=>!r.visited.has(room.id));
  let goal=source||live.find(e=>e.boss)||r.map.exit;
  if(!source&&!live.length&&r.spawned<STAGES[r.wave].count)goal=unvisited||r.pending[0]||r.map.exit;
  const goalKey=r.map.id+':'+Math.floor(goal.x)+','+Math.floor(goal.y);
  navTime-=1/30;if(!waypoint||Math.hypot(waypoint.x-r.player.x,waypoint.y-r.player.y)<.15||goalKey!==lastGoal||navTime<=0){waypoint=navigate(goal);lastGoal=goalKey;navTime=1;}
  let dx=waypoint.x-r.player.x,dy=waypoint.y-r.player.y,fire=false,scope=false;
  if(enemy){
   const d=distance(enemy);r.player.angle=Math.atan2(enemy.y-r.player.y,enemy.x-r.player.x);
   if(hard&&r.intel[enemy.kind]<3){selectScanner(r);scope=true;}
   if((!hard||r.intel[enemy.kind]===3)&&enemy.state!=='Dormant'){
    const options=catalog.weapons.map((w,i)=>({w,i,c:combatCoverage(r,w,enemy.kind)})).filter(o=>isWeaponReady(r,o.i)&&o.c.factor&&o.w.range>d&&r.energy[o.i]+r.magazines[o.i]>=shotCost(r,o.w));
    const favorite={pneumo:'ampicillin',ecoli:'ampicillin',mssa:'cefazolin',mrsa:'vancomycin',esbl:'meropenem',pseudo:'meropenem',mdr:'ceftazavi',kpc:'ceftazavi',vre:'linezolid',anaerobe:'metronidazole',legionella:'levofloxacin',clostridium:'metronidazole',klebs:'ceftriaxone',cmv:'ganciclovir',strongyloides:'ivermectin'}[enemy.kind];
    options.sort((a,b)=>(a.w.id===favorite?-100:0)+a.w.pressure-(b.w.id===favorite?-100:0)-b.w.pressure);
    if(options.length){switchWeapon(r,options[0].i);fire=true;}
   }
   if(d<2.4&&enemy.state!=='Dormant'){
    const candidates=[];for(let n=0;n<16;n++){const a=n*Math.PI/8,x=Math.cos(a),y=Math.sin(a);if(canStand(r.map,r.player.x+x*.6,r.player.y+y*.6))candidates.push({x,y,score:Math.min(...live.map(e=>Math.hypot(r.player.x+x-e.x,r.player.y+y-e.y)))-Math.hypot(r.player.x+x-goal.x,r.player.y+y-goal.y)*.03});}
    candidates.sort((a,b)=>b.score-a.score);if(candidates[0]){dx=candidates[0].x;dy=candidates[0].y;}
   }
   // Ranged projectiles are dodgeable; keep lateral movement while exchanging fire.
   if(enemy.state==='Attack'&&d>=2.4&&d<8){const side=Math.sin(r.time*1.8)>0?1:-1,c=Math.cos(r.player.angle),s=Math.sin(r.player.angle);if(canStand(r.map,r.player.x-s*side*.6,r.player.y+c*side*.6)){dx=dx*.35-s*side;dy=dy*.35+c*side;}}
  }else if(Math.hypot(dx,dy)>.1)r.player.angle=Math.atan2(dy,dx);
  const norm=Math.max(.01,Math.hypot(dx,dy));dx/=norm;dy/=norm;const c=Math.cos(r.player.angle),s=Math.sin(r.player.angle);
  controlSource(r);tick(r,{forward:dx*c+dy*s,strafe:-dx*s+dy*c,fire,scope},1/30);r.events.length=0;
 }
 return {status:r.status,time:Math.round(r.time),hp:Math.round(r.player.hp),stage:r.wave+1,kills:r.kills,pressure:Math.round(r.pressure),sources:r.totalSources,completed:r.completedStages,position:r.player,pending:r.pending.length,remaining:r.enemies.filter(e=>e.active&&e.state!=='Dead').map(e=>({kind:e.kind,state:e.state,x:e.x,y:e.y,hp:e.hp})),reports};
}
