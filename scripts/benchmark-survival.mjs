// Deterministic comparison; no stat boosts in strategy runs. Rendering is excluded.
import { performance } from 'node:perf_hooks';
import { Session } from 'node:inspector';
import { writeFile } from 'node:fs/promises';
import { createSurvivalRun, startSurvival, tickSurvival, chooseSurvivalUpgrade, setSurvivalViewport, setSurvivalPriority, survivalStats, spawnSurvivalEnemy, drainSurvivalSounds } from '../src/survival-engine.mjs';
import { LIMITS, WORLD, WEAPONS, UPGRADE_BY_ID } from '../src/survival-data.mjs';
const seeds=[17,32,98],strategies=['flee','gather','pulse','arsenal'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function choose(run,strategy){
  const missing=WEAPONS.filter(w=>!run.upgrades[w.id]).map(w=>w.id);
  let order={
    flee:['speed','health','repair','shield','magnet','haste','power','bolt'],
    gather:['magnet','orbit','nova','health','power','haste','chain','bolt','speed'],
    pulse:['bolt_lance','bolt_fan','bolt','power','haste','health','repair','magnet','speed'],
    arsenal:[...missing,'orbit_reach','nova_heavy','chain_web','bolt_fan','orbit','chain','nova','bolt','power','haste','magnet','health'],
  }[strategy];
  if(run.player.hp<survivalStats(run).maxHp*.35)order=['health','repair',...order];
  const id=order.find(id=>run.choices.includes(id))||run.choices.find(id=>UPGRADE_BY_ID[id].weapon)||run.choices[0];
  chooseSurvivalUpgrade(run,id);
}
function control(run,strategy){
  const p=run.player,elite=run.enemies.find(e=>e.type==='boss')||run.enemies.find(e=>e.elite);
  if(elite&&strategy!=='flee'&&distance(elite,p)<480&&!run.priority)setSurvivalPriority(run,elite.id);
  const pickups=run.pickups.filter(g=>g.type==='health'?p.hp<survivalStats(run).maxHp-10:g.type==='xp'||g.type==='vacuum');
  const nearest=pickups.reduce((best,g)=>!best||distance(g,p)<distance(best,p)?g:best,null);
  const supply=run.sites.find(s=>s.type==='supply'&&s.readyAt<=run.time);
  let target=strategy!=='flee'&&p.hp<40&&supply?supply:strategy!=='flee'&&nearest?nearest:{x:WORLD.width/2+Math.cos(run.time*.035)*660,y:WORLD.height/2+Math.sin(run.time*.035)*600};
  if(strategy!=='flee'&&elite&&run.time>285)target=elite;
  let best={score:Infinity,x:0,y:0};
  const danger=run.enemies.filter(e=>distance(e,p)<300&&!e.dead);
  for(let j=0;j<25;j++){
    const a=j*Math.PI/12,x=j===24?0:Math.cos(a),y=j===24?0:Math.sin(a),next={x:p.x+x*58,y:p.y+y*58};
    let score=distance(target,next)*.045;
    for(const e of danger){
      const d=distance(e,next)-e.radius;
      const safety=strategy==='flee'?140:70;
      if(d<safety)score+=(safety-d)*(safety-d)*.019;
      if(e.state==='charge'||e.state==='windup'){
        const proj=(next.x-e.x)*e.chargeX+(next.y-e.y)*e.chargeY;
        const side=Math.abs((next.x-e.x)*e.chargeY-(next.y-e.y)*e.chargeX);
        if(proj>0&&proj<300&&side<e.radius+30)score+=250;
      }
    }
    for(const h of run.hazards){
      const d=distance(h,next);
      if(h.type==='zone'&&d<h.radius+28)score+=300;
      if(h.type==='ring'&&run.time+.3>=h.at&&Math.abs(d-(h.radius+(run.time>=h.at?70:20)))<45)score+=350;
      if(h.type==='bullet'&&distance({x:h.x+h.vx*.25,y:h.y+h.vy*.25},next)<50)score+=200;
    }
    if(next.x<60||next.x>WORLD.width-60||next.y<60||next.y>WORLD.height-60)score+=1000;
    if(score<best.score)best={score,x,y};
  }
  return best;
}
const percentile=(values,p)=>values.length?values.sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))]:0;
const round=n=>Math.round(n*1000)/1000;
const results=[],profiled=process.argv.includes('--profile');
let session;
const post=(method)=>new Promise((resolve,reject)=>session.post(method,(error,result)=>error?reject(error):resolve(result)));
if(profiled){session=new Session();session.connect();await post('Profiler.enable');await post('Profiler.start');}
for(const [viewport,width,height] of [['desktop',1180,760],['portrait',390,580]])for(const seed of seeds)for(const strategy of strategies){
  const run=createSurvivalRun({seed});setSurvivalViewport(run,width,height);startSurvival(run);
  let input={},frames=0;const samples=[],peak=Object.fromEntries(Object.keys(LIMITS).map(k=>[k,0]));
  while(!['won','lost'].includes(run.status)&&run.time<360&&frames<24000){
    if(run.status==='upgrade')choose(run,strategy);
    if(frames%8===0&&run.status==='running')input=control(run,strategy);
    const start=performance.now();tickSurvival(run,input,1/60);const duration=performance.now()-start;
    if(frames%10===0)samples.push(duration);
    for(const key of Object.keys(LIMITS)){
      peak[key]=Math.max(peak[key],run[key]?.length||0);
      if(peak[key]>LIMITS[key])throw new Error(key+' exceeded its cap');
    }
    drainSurvivalSounds(run);frames++;
  }
  results.push({viewport,seed,strategy,status:run.status==='running'?'timeout':run.status,time:round(run.time),kills:run.kills,level:run.level,firstPickup:run.growth.firstPickupAt===null?null:round(run.growth.firstPickupAt),firstLevel:run.growth.firstLevelAt===null?null:round(run.growth.firstLevelAt),branches:run.branches,tickP95Ms:round(percentile(samples,.95)),peak});
}
// A separate artificial capacity workload measures the engine, not win rate.
const stress=createSurvivalRun({seed:91});startSurvival(stress);stress.pickups=[];stress.nextXp=1e9;stress.player.invulnerable=1000;stress.timers.spawn=10000;
for(const w of WEAPONS)stress.upgrades[w.id]=5;
for(let i=0;i<LIMITS.enemies;i++){
  const a=i/180*Math.PI*2,r=100+(i%8)*45;
  const e=spawnSurvivalEnemy(stress,i%3?'spore':'ranger',{x:stress.player.x+Math.cos(a)*r,y:stress.player.y+Math.sin(a)*r});
  e.hp=e.maxHp=1e7;e.born=-1;
}
const stressSamples=[];
for(let i=0;i<600;i++){const start=performance.now();tickSurvival(stress,{},1/60);stressSamples.push(performance.now()-start);drainSurvivalSounds(stress);}
let profile=[];
if(profiled){
  const {profile:raw}=await post('Profiler.stop');session.disconnect();
  const counts=new Map();for(const id of raw.samples||[])counts.set(id,(counts.get(id)||0)+1);
  const total=raw.samples?.length||1;
  profile=raw.nodes.filter(n=>n.callFrame.url.endsWith('survival-engine.mjs')).map(n=>({function:n.callFrame.functionName||'(anonymous)',samples:counts.get(n.id)||0,percent:round((counts.get(n.id)||0)/total*100)})).filter(n=>n.samples).sort((a,b)=>b.samples-a.samples).slice(0,8);
}
const summary=strategies.map(strategy=>{
  const rows=results.filter(r=>r.strategy===strategy);
  return{strategy,wins:rows.filter(r=>r.status==='won').length,runs:rows.length,meanKills:Math.round(rows.reduce((s,r)=>s+r.kills,0)/rows.length),meanLevel:round(rows.reduce((s,r)=>s+r.level,0)/rows.length),medianFirstLevel:round(percentile(rows.map(r=>r.firstLevel).filter(n=>n!==null),.5)),p95TickMs:Math.max(...rows.map(r=>r.tickP95Ms))};
});
const report={date:'2026-10-16',ruleset:'survival-2',method:'Node simulation at 60 Hz; three seeds; desktop and portrait; real HP, no stat boosts. Separate 180-enemy stress workload uses invulnerability and high enemy HP. Rendering/audio/device FPS are not measured.',summary,stress:{enemies:stress.enemies.length,p95TickMs:round(percentile(stressSamples,.95)),maxTickMs:round(Math.max(...stressSamples))},profile,results};
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
if(output)await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary,stress:report.stress,profile},null,2));