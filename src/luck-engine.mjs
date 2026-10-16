import {MODES,TRAITS,BOARD,MAX_CROWD,LAST_WAVE,WAVE_SECONDS,MAX_STAR,AUGMENTS,unitById,cellCenter,trackPoint} from './luck-data.mjs';
export function random(run){let x=run.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;run.rng=x>>>0;return run.rng/4294967296;}
const pick=(run,items)=>items[Math.floor(random(run)*items.length)];
const living=run=>run.enemies.filter(e=>e.hp>0);
const has=(run,id)=>run.augments.includes(id);
const active=run=>run.status==='running';
export const summonCost=run=>Math.min(65,20+Math.floor(run.summons/6)*3);
export const upgradeCost=(run,kind)=>kind==='power'?70+run.power*60:90+run.luck*90;
export const unitPower=(run,unit,effects=traitEffects(run))=>unitById(run.mode,unit.id).damage*2.35**(unit.star-1)*(1+run.power*.16)*(has(run,'power')?1.25:1)*(has(run,'range')?1.1:1)*effects.power;
export const sellValue=(run,unit)=>Math.floor((8+unitById(run.mode,unit.id).rarity*12)*1.8**(unit.star-1));
export function synergies(run){
 const traits=Object.fromEntries(Object.keys(TRAITS).map(id=>[id,new Set()]));
 for(const u of run.board)if(u){const def=unitById(run.mode,u.id);for(const id of def.traits)traits[id].add(def.id);}
 return Object.fromEntries(Object.entries(traits).map(([id,units])=>[id,units.size]));
}
export function traitEffects(run,counts=synergies(run)){
 const result={power:1,haste:1,area:1,radius:1,dot:1,boss:1,chain:0,slow:0};
 for(const [id,trait] of Object.entries(TRAITS)){
  const tier=trait.thresholds.findLastIndex(n=>counts[id]>=n);
  if(tier>=0)result[trait.effect]+=trait.values[tier];
 }return result;
}
function emit(run,kind,text=''){run.events.push({kind,text});if(run.events.length>20)run.events.shift();}
function fx(run,type,x,y,color,extra={}){if(run.effects.length<280)run.effects.push({type,x,y,color,age:0,life:.5,...extra});}
function makeUnit(run,id,star=1){return{id,star,cooldown:random(run)*.35,uid:++run.serial,shots:0};}
export function createLuckRun(mode='remedy',seed=Date.now()){
 if(!MODES[mode])mode='remedy';seed=Number(seed)>>>0||713;
 const run={mode,seed,rng:seed,status:'running',board:Array(15).fill(null),enemies:[],effects:[],pools:[],events:[],serial:0,
  wave:0,waveTime:0,totalTime:0,spawned:0,spawnTimer:0,spawnCount:0,bossSpawned:false,bossDefeated:0,
  gold:100,gems:2,power:0,luck:0,summons:0,merges:0,kills:0,pity:0,burstCooldown:0,augments:[],choices:[],
  version:0,reason:'',discovered:[],nextWave:false,nextSoundAt:0};
 const starters=MODES[mode].units.filter(u=>u.rarity===0);
 for(const index of [5,7,9]){const def=pick(run,starters);run.board[index]=makeUnit(run,def.id);run.discovered.push(def.id);}
 autoMerge(run);beginWave(run);return run;
}
function beginWave(run){
 run.wave++;run.waveTime=0;run.spawned=0;run.spawnTimer=.6;run.spawnCount=Math.floor(18+run.wave*2);run.bossSpawned=false;run.nextWave=false;
 if(run.wave>1){run.gold+=32+run.wave*2;run.gems++;emit(run,'income');}
 emit(run,run.wave%5===0?'boss':'wave',run.wave%5===0?'BOSS WAVE '+String(run.wave).padStart(2,'0'):'WAVE '+String(run.wave).padStart(2,'0'));
 run.version++;
}
function rarityRoll(run,lucky){
 let r=random(run),bonus=run.luck*.035+(has(run,'luck')?.12:0);
 if(lucky)return r<.08?3:r<.48?2:1;
 if(++run.pity>=12){run.pity=0;return r<.12?2:1;}
 const rarity=r<.004+bonus*.05?3:r<.035+bonus*.25?2:r<.20+bonus?1:0;
 if(rarity>0)run.pity=0;return rarity;
}
export function summon(run,lucky=false){
 if(!active(run))return false;
 const slots=run.board.map((u,i)=>u?null:i).filter(i=>i!==null);
 if(!slots.length){emit(run,'notice','빈 칸 없음');return false;}
 const cost=lucky?3:summonCost(run);
 if((lucky?run.gems:run.gold)<cost){emit(run,'notice',lucky?'행운석 부족':'골드 부족');return false;}
 if(lucky)run.gems-=cost;else{run.gold-=cost;run.summons++;}
 const rarity=rarityRoll(run,lucky),def=pick(run,MODES[run.mode].units.filter(u=>u.rarity===rarity)),index=pick(run,slots);
 run.board[index]=makeUnit(run,def.id);run.discovered.push(def.id);run.version++;
 const p=cellCenter(index);fx(run,'ring',p.x,p.y,rarity>=2?'#ffd46d':MODES[run.mode].color,{life:.8,radius:55});
 emit(run,rarity>=2?'jackpot':'summon',rarity>=2?def.name+' 등장':'');
 autoMerge(run);return true;
}
export function canMerge(a,b){return !!a&&!!b&&a.uid!==b.uid&&a.id===b.id&&a.star===b.star&&a.star<MAX_STAR;}
function mergePair(run,from,to){
 const a=run.board[from],b=run.board[to];
 const crit=a.star<MAX_STAR-1&&random(run)<.12+run.luck*.02;
 b.star+=crit?2:1;b.cooldown=0;run.board[from]=null;run.gems++;run.merges++;
 if(has(run,'merge'))run.gold+=25;
 const p=cellCenter(to);fx(run,'ring',p.x,p.y,crit?'#ffd46d':MODES[run.mode].color,{life:.65,radius:65});
 emit(run,crit?'jackpot':'merge',crit?'대성공 · ★'+b.star:'자동 합성 · ★'+b.star);run.version++;
}
export function autoMerge(run){
 if(!active(run))return 0;let merged=0,pair;
 // Every merge removes a piece; repeat to resolve cascades up to the star cap.
 do{
  pair=null;
  for(let i=0;i<run.board.length&&!pair;i++)for(let j=i+1;j<run.board.length;j++){
   if(canMerge(run.board[i],run.board[j])){pair=[j,i];break;}
  }
  if(pair){mergePair(run,...pair);merged++;}
 }while(pair);
 return merged;
}
export function moveOrMerge(run,from,to){
 if(!active(run)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=15||to<0||to>=15||from===to||!run.board[from])return false;
 if(canMerge(run.board[from],run.board[to]))mergePair(run,from,to);
 else{[run.board[to],run.board[from]]=[run.board[from],run.board[to]];emit(run,'move');run.version++;}
 autoMerge(run);return true;
}
export function sell(run,index){
 if(!active(run)||!run.board[index])return false;
 run.gold+=sellValue(run,run.board[index]);run.board[index]=null;run.version++;emit(run,'income');return true;
}
export function recipeSlots(run,id){
 const recipe=MODES[run.mode].recipes.find(r=>r.id===id);if(!recipe)return null;
 const used=[];
 for(const need of recipe.needs){
  const choices=run.board.map((u,i)=>({u,i})).filter(({u,i})=>u?.id===need&&!used.includes(i)).sort((a,b)=>a.u.star-b.u.star);
  if(!choices.length)return null;used.push(choices[0].i);
 }return used;
}
export function craft(run,id){
 if(!active(run))return false;const slots=recipeSlots(run,id);if(!slots)return false;
 for(const i of slots)run.board[i]=null;run.board[slots[0]]=makeUnit(run,id);run.discovered.push(id);run.version++;
 const p=cellCenter(slots[0]);fx(run,'ring',p.x,p.y,'#ff8aa5',{radius:200,life:1.3});emit(run,'mythic','신화 · '+unitById(run.mode,id).name);autoMerge(run);return true;
}
export function upgrade(run,kind){
 if(!active(run)||!['power','luck'].includes(kind)||run[kind]>=(kind==='power'?8:4))return false;
 const cost=upgradeCost(run,kind);if(run.gold<cost)return false;
 run.gold-=cost;run[kind]++;run.version++;emit(run,'upgrade');return true;
}
export function chooseAugment(run,id){
 if(run.status!=='choice'||!run.choices.includes(id))return false;
 run.augments.push(id);if(id==='wealth')run.gold+=180;if(id==='merge')run.gems+=3;
 run.choices=[];run.status='running';run.version++;emit(run,'upgrade');beginWave(run);return true;
}
export function pause(run){if(active(run)){run.status='paused';return true;}return false;}
export function resume(run){if(run.status==='paused'){run.status='running';return true;}return false;}
function damage(run,enemy,value,bossBonus=1){
 if(enemy.hp<=0)return;const amount=value*(enemy.boss?bossBonus:1)*(enemy.boss&&has(run,'bounty')?1.6:1)*(enemy.armor||1);
 enemy.hp-=amount;enemy.hit=.12;
 if(enemy.hp<=0){
  run.kills++;run.gold+=(enemy.boss?85:2)+(has(run,'wealth')?1:0);
  fx(run,'pop',enemy.x,enemy.y,enemy.boss?'#ffd46d':MODES[run.mode].color,{life:.35,radius:enemy.radius*1.7});
  if(enemy.boss){run.bossDefeated=run.wave;run.gems+=3;emit(run,'bosskill','보스 격파! +85G');}
 }
}
export function burst(run){
 if(!active(run)||run.burstCooldown>0)return false;
 const amount=(100+run.wave*24)*(has(run,'burst')?1.5:1);
 const effects=traitEffects(run);
 for(const enemy of living(run)){damage(run,enemy,amount,effects.boss);enemy.slow=2+effects.slow;}
 run.burstCooldown=has(run,'burst')?24:40;
 fx(run,'burst',300,280,MODES[run.mode].color,{radius:650,life:1});emit(run,'burst',MODES[run.mode].burst+'!');return true;
}
function spawnEnemy(run,boss=false){
 const type=boss?'boss':run.wave>3&&random(run)<.16?'tank':random(run)<.23?'runner':'grunt';
 const hp=(62*1.21**(run.wave-1)+run.wave*3)*(boss?24:type==='tank'?2.6:type==='runner'?.68:1);
 const enemy={id:++run.serial,type,boss,name:boss?['철갑 거인','분열 군주','폭주 심장','최후의 군주'][run.wave/5-1]:'',
  hp,maxHp:hp,armor:boss&&run.wave===5?.72:1,d:0,...trackPoint(0),
  speed:(type==='runner'?92:type==='tank'?38:55)+(run.wave*.8),radius:boss?23:type==='tank'?13:10,
  slow:0,stun:0,poison:0,poisonDamage:0,hit:0,born:run.totalTime,deadline:boss?run.totalTime+45:0,skillTimer:7};
 run.enemies.push(enemy);
}
function attack(run,unit,index,syn){
 const def=unitById(run.mode,unit.id),pos=cellCenter(index),range=(def.rarity===4?850:def.skill==='beam'?340:255)*(has(run,'range')?1.35:1);
 const targets=living(run).filter(e=>Math.hypot(pos.x-e.x,pos.y-e.y)<=range).sort((a,b)=>Number(b.boss)-Number(a.boss)||b.d-a.d);
 if(!targets.length)return false;
 const target=targets[0],power=unitPower(run,unit,syn),color=MODES[run.mode].color;
 unit.shots++;
 if(run.totalTime>=run.nextSoundAt){emit(run,def.rarity>=2?'heavyhit':'hit');run.nextSoundAt=run.totalTime+.16;}
 const hit=(enemy,amount)=>damage(run,enemy,amount,syn.boss);
 const area=(center,radius,amount)=>{
  for(const e of living(run))if(Math.hypot(e.x-center.x,e.y-center.y)<=radius*syn.radius)hit(e,amount*syn.area);
 };
 const bolt=(e,kind='bolt')=>fx(run,kind,pos.x,pos.y,color,{tx:e.x,ty:e.y,life:kind==='beam'?.25:.18,radius:4+def.rarity});
 switch(def.skill){
  case 'chain':case 'storm':{
   let previous=pos;const count=(def.skill==='storm'?6:3)+syn.chain;
   for(const e of targets.slice(0,count)){fx(run,'chain',previous.x,previous.y,'#8de1ff',{tx:e.x,ty:e.y,life:.22});hit(e,power);previous=e;}break;
  }
  case 'splash':case 'missile':case 'meteor':{
   for(const e of targets.slice(0,def.skill==='meteor'?3:1)){bolt(e);area(e,def.skill==='splash'?44:def.skill==='missile'?76:100,power);fx(run,'ring',e.x,e.y,'#ffbe80',{radius:def.skill==='splash'?38:70,life:.4});}break;
  }
  case 'poison':{bolt(target);hit(target,power);target.poison=4;target.poisonBossBonus=syn.boss;target.poisonDamage=Math.max(target.poisonDamage,power*.85*syn.dot);break;}
  case 'stun':{bolt(target);hit(target,power);target.stun=.42;fx(run,'ring',target.x,target.y,'#ffdb7d',{radius:25,life:.25});break;}
  case 'slow':{bolt(target);hit(target,power);target.slow=2.2+syn.slow;break;}
  case 'beam':{
   bolt(target,'beam');let count=0;
   for(const e of targets)if(Math.abs((target.x-pos.x)*(e.y-pos.y)-(target.y-pos.y)*(e.x-pos.x))/Math.max(1,Math.hypot(target.x-pos.x,target.y-pos.y))<25&&count++<5)hit(e,power);
   break;
  }
  case 'nova':{area(pos,range,power);fx(run,'ring',pos.x,pos.y,color,{radius:range,life:.4});break;}
  case 'pool':case 'bloom':{
   bolt(target);area(target,55,power);
   if(run.pools.length<25)run.pools.push({x:target.x,y:target.y,radius:def.skill==='bloom'?100:65,life:3,damage:power*.5*syn.dot,bossBonus:syn.boss});
   break;
  }
  case 'split':case 'hydra':{
   for(const e of targets.slice(0,def.skill==='hydra'?5:3)){bolt(e);hit(e,power);if(def.skill==='hydra')fx(run,'ring',e.x,e.y,'#c7a3ff',{radius:28,life:.3});}break;
  }
  case 'blizzard':{
   for(const e of living(run)){hit(e,power);e.slow=2.5+syn.slow;}fx(run,'ring',pos.x,pos.y,'#a3dfff',{radius:500,life:.6});break;
  }
  default:{bolt(target);hit(target,power);}
 }
 return true;
}
export function tickLuck(run,dt){
 if(!active(run)||!Number.isFinite(dt)||dt<=0)return;
 dt=Math.min(dt,.05);run.totalTime+=dt;run.waveTime+=dt;run.burstCooldown=Math.max(0,run.burstCooldown-dt);
 for(const e of run.effects)e.age+=dt;run.effects=run.effects.filter(e=>e.age<e.life);
 run.spawnTimer-=dt;
 if(run.spawned<run.spawnCount&&run.spawnTimer<=0){spawnEnemy(run);run.spawned++;run.spawnTimer=8/run.spawnCount;}
 if(run.wave%5===0&&!run.bossSpawned&&run.waveTime>=1.2){spawnEnemy(run,true);run.bossSpawned=true;}
 for(const e of run.enemies){
  if(e.hp<=0)continue;
  e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);
  if(e.poison>0){e.poison-=dt;damage(run,e,e.poisonDamage*dt,e.poisonBossBonus);}
  e.d+=e.speed*(e.stun>0?0:e.slow>0?.45:1)*dt;Object.assign(e,trackPoint(e.d));
  if(e.boss){
   if(run.totalTime>=e.deadline){run.status='lost';run.reason='보스 제한 시간 초과';emit(run,'lost');return;}
   if(run.wave>=10){e.skillTimer-=dt;if(e.skillTimer<=0){e.skillTimer=8;spawnEnemy(run);spawnEnemy(run);fx(run,'ring',e.x,e.y,'#ff839c',{radius:100,life:.6});}}
  }
 }
 for(const pool of run.pools){pool.life-=dt;for(const e of living(run))if(Math.hypot(e.x-pool.x,e.y-pool.y)<pool.radius){damage(run,e,pool.damage*dt,pool.bossBonus);e.slow=Math.max(e.slow,.2);}}
 run.pools=run.pools.filter(p=>p.life>0);
 const syn=traitEffects(run);
 run.board.forEach((unit,index)=>{
  if(!unit)return;unit.cooldown-=dt;if(unit.cooldown>0)return;
  if(!attack(run,unit,index,syn)){unit.cooldown=.1;return;}
  const def=unitById(run.mode,unit.id),pos=cellCenter(index);
  const support=run.board.some((u,j)=>u&&unitById(run.mode,u.id).skill==='support'&&Math.hypot(cellCenter(j).x-pos.x,cellCenter(j).y-pos.y)<145);
  const haste=syn.haste*(has(run,'haste')?1.2:1)*(support?1.22:1)*(def.skill==='frenzy'?1+Math.min(.65,unit.shots*.015):1);
  unit.cooldown=def.interval/haste;
 });
 run.enemies=run.enemies.filter(e=>e.hp>0);
 if(run.enemies.length>=MAX_CROWD){run.status='lost';run.reason='적 60마리 도달';emit(run,'lost');return;}
 if(run.wave===LAST_WAVE&&run.spawned>=run.spawnCount&&run.enemies.length===0&&run.bossDefeated===LAST_WAVE){run.status='won';emit(run,'won');return;}
 const ready=run.waveTime>=WAVE_SECONDS&&run.spawned>=run.spawnCount&&(run.wave%5!==0||run.bossDefeated===run.wave);
 if(ready&&run.wave<LAST_WAVE){
  if(run.wave%5===0){
   const pool=AUGMENTS.filter(a=>!has(run,a.id)).map(a=>a.id);run.choices=[];
   while(run.choices.length<3&&pool.length){const i=Math.floor(random(run)*pool.length);run.choices.push(pool.splice(i,1)[0]);}
   run.status='choice';emit(run,'choice');
  }else beginWave(run);
 }
}
export function drainEvents(run){return run.events.splice(0);}
