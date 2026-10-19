import {MODES,RARITIES,TRAITS,BOARD,TRACK,MAX_CROWD,LAST_WAVE,WAVE_SECONDS,MAX_STAR,AUGMENTS,unitById,cellCenter,trackPoint} from './luck-data.mjs';
export function random(run){let x=run.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;run.rng=x>>>0;return run.rng/4294967296;}
const pick=(run,items)=>items[Math.floor(random(run)*items.length)];
const living=run=>run.enemies.filter(e=>e.hp>0);
const has=(run,id)=>run.augments.includes(id);
const active=run=>run.status==='running';
export const summonCost=run=>Math.min(65,20+Math.floor(run.summons/6)*3);
export const batchCost=(run,count=10)=>Array.from({length:count},(_,i)=>summonCost({...run,summons:run.summons+i})).reduce((a,b)=>a+b,0);
export const unitRange=(run,unit)=>unitById(run.mode,unit.id).attack.range*(has(run,'range')?1.35:1);
const isProducer=def=>def.role==='economy';
const timedAbility=def=>isProducer(def)||def.skill==='overdrive';
const cross=(a,b)=>a!==b&&(a%BOARD.cols===b%BOARD.cols||Math.floor(a/BOARD.cols)===Math.floor(b/BOARD.cols));
export function supportCells(run,index){
 const unit=run.board[index];if(!unit)return [];
 const def=unitById(run.mode,unit.id),pos=cellCenter(index);
 if(!['support','amplify','overdrive'].includes(def.skill))return [];
 return run.board.map((_,i)=>i).filter(i=>i!==index&&(def.skill==='amplify'?cross(index,i):Math.hypot(cellCenter(i).x-pos.x,cellCenter(i).y-pos.y)<=(def.skill==='support'?145:unitRange(run,unit))));
}
export const growthSeconds=unit=>24+(unit.star-1)*12;
export function unitProgress(run,unit){
 const def=unitById(run.mode,unit.id);
 if(def.role==='growth')return unit.star<3?Math.min(1,(unit.growthAge||0)/growthSeconds(unit)):null;
 return timedAbility(def)?Math.max(0,Math.min(1,1-unit.cooldown/def.interval)):null;
}
function highlight(run,unit,kind,at=run.totalTime){
 const def=unitById(run.mode,unit.id);
 if(kind!=='merge'&&def.rarity<2)return;
 const priority=def.rarity*4+unit.star+(kind==='merge'?7:0);
 const near=run.highlights.find(h=>h.kind===kind&&Math.abs(h.at-at)<.2);
 const value={id:unit.id,star:unit.star,rarity:def.rarity,kind,at,priority,life:def.rarity===4?1.7:kind==='merge'?1.35:1.1};
 if(near){if(priority>=near.priority)Object.assign(near,value);return;}
 run.highlights.push({...value,key:++run.revealSerial});
 if(run.highlights.length>12)run.highlights.shift();
}
export function currentHighlight(run){
 return run.highlights.filter(h=>run.totalTime>=h.at&&run.totalTime<h.at+h.life).sort((a,b)=>b.priority-a.priority||b.key-a.key)[0]||null;
}
export function unitInterval(run,unit,index,effects=traitEffects(run)){
 const def=unitById(run.mode,unit.id),pos=cellCenter(index);
 if(timedAbility(def))return def.interval;
 const support=run.board.some((u,j)=>u&&(u.readyAt||0)<=run.totalTime&&unitById(run.mode,u.id).skill==='support'&&Math.hypot(cellCenter(j).x-pos.x,cellCenter(j).y-pos.y)<145);
 return def.interval/(effects.haste*(has(run,'haste')?1.2:1)*(support?1.22:1)*((unit.overdriveUntil||0)>run.totalTime?1+(unit.overdriveBonus||.8):1)*(def.skill==='frenzy'?1+Math.min(.65,(unit.shots||0)*.015):1));
}
export const upgradeCost=(run,kind)=>kind==='power'?70+run.power*60:90+run.luck*90;
export function unitPower(run,unit,effects=traitEffects(run)){
 const index=run.board.indexOf(unit),boost=index>=0&&run.board.some((u,i)=>u&&cross(index,i)&&(u.readyAt||0)<=run.totalTime&&unitById(run.mode,u.id).skill==='amplify');
 return unitById(run.mode,unit.id).damage*2.35**(unit.star-1)*(1+run.power*.16)*(has(run,'power')?1.25:1)*(has(run,'range')?1.1:1)*effects.power*(boost?1.24:1);
}
export const sellValue=(run,unit)=>Math.floor((8+unitById(run.mode,unit.id).rarity*12)*1.8**(unit.star-1));
export function synergies(run){
 const traits=Object.fromEntries(Object.keys(TRAITS).map(id=>[id,new Set()]));
 for(const u of run.board)if(u){const def=unitById(run.mode,u.id);for(const id of def.traits)traits[id].add(def.id);}
 return Object.fromEntries(Object.entries(traits).map(([id,units])=>[id,units.size]));
}
export function traitEffects(run,counts=synergies(run)){
 const result={power:1,haste:1,area:1,radius:1,dot:1,boss:1,chain:0,slow:0,income:0};
 for(const [id,trait] of Object.entries(TRAITS)){
  const tier=trait.thresholds.findLastIndex(n=>counts[id]>=n);
  if(tier>=0)result[trait.effect]+=trait.values[tier];
 }return result;
}
function emit(run,kind,text=''){run.events.push({kind,text});if(run.events.length>64)run.events.shift();}
function fx(run,type,x,y,color,extra={}){if(run.effects.length<280)run.effects.push({type,x,y,color,age:0,life:.5,...extra});}
function makeUnit(run,id,star=1){const def=unitById(run.mode,id),roll=random(run);return{id,star,cooldown:timedAbility(def)?def.interval:roll*.35,uid:++run.serial,shots:0,readyAt:0,growthAge:0};}
export function createLuckRun(mode='remedy',seed=Date.now()){
 if(!MODES[mode])mode='remedy';seed=Number(seed)>>>0||713;
 const run={mode,seed,rng:seed,status:'running',board:Array(BOARD.cols*BOARD.rows).fill(null),enemies:[],effects:[],fusions:[],pools:[],traps:[],highlights:[],revealSerial:0,events:[],serial:0,
  wave:0,waveTime:0,totalTime:0,spawned:0,spawnTimer:0,spawnCount:0,bossSpawned:false,bossDefeated:0,
  gold:100,gems:2,power:0,luck:0,summons:0,merges:0,kills:0,pity:0,augments:[],choices:[],
  version:0,reason:'',discovered:[],nextWave:false,nextSoundAt:0};
 const starters=MODES[mode].units.filter(u=>u.rarity===0&&u.role!=='economy');
 for(const index of [0,2,4]){const def=pick(run,starters);run.board[index]=makeUnit(run,def.id);run.discovered.push(def.id);}
 autoMerge(run);beginWave(run);return run;
}
function beginWave(run){
 run.wave++;run.waveTime=0;run.spawned=0;run.spawnTimer=.6;run.spawnCount=Math.floor(18+run.wave*2);run.bossSpawned=false;run.nextWave=false;
 if(run.wave>1){run.gold+=32+run.wave*2;run.gems++;emit(run,'income');}
 emit(run,run.wave%5===0?'boss':'wave',run.wave%5===0?'BOSS WAVE '+String(run.wave).padStart(2,'0'):'WAVE '+String(run.wave).padStart(2,'0'));
 run.version++;
}
export function drawOdds(run,lucky=false){
 const bonus=run.luck*.035+(has(run,'luck')?.12:0);
 if(lucky){const mythic=.02+bonus*.04,legend=.23+bonus*.2,epic=.55+bonus*.26;return[0,1-mythic-legend-epic,epic,legend,mythic];}
 return[.8-bonus,.165+bonus*.75,.031+bonus*.2,.004+bonus*.05,0];
}
function rarityRoll(run,lucky){
 const r=random(run);
 if(!lucky&&++run.pity>=12){run.pity=0;return r<.12?2:1;}
 const odds=drawOdds(run,lucky);let threshold=0,rarity=0;
 for(let i=4;i>=0;i--){threshold+=odds[i];if(r<threshold){rarity=i;break;}}
 if(!lucky&&rarity>0)run.pity=0;return rarity;
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
 emit(run,rarity===4?'mythic':rarity>=2?'jackpot':'summon',rarity>=2?RARITIES[rarity].name+' · '+def.name:'');
 highlight(run,run.board[index],'draw');autoMerge(run);return true;
}
export function summonBatch(run){
 if(!active(run))return false;
 if(run.gold<batchCost(run)){emit(run,'notice','골드 부족');return false;}
 // Preview all ten draws, including merge cascades, before committing currency or RNG.
 const next=structuredClone(run);
 for(let i=0;i<10;i++)if(!summon(next)){emit(run,'notice','10회 소환 공간 부족');return false;}
 Object.assign(run,next);emit(run,'summon','10회 소환');return true;
}
export function canMerge(a,b){return !!a&&!!b&&a.uid!==b.uid&&a.id===b.id&&a.star===b.star&&a.star<MAX_STAR;}
function mergePair(run,from,to){
 const a=run.board[from],b=run.board[to],aReady=a.readyAt||0,bReady=b.readyAt||0;
 const crit=a.star<MAX_STAR-1&&random(run)<.12+run.luck*.02;
 const fromStar=a.star,start=Math.max(run.totalTime,aReady,bReady);
 b.star+=crit?2:1;b.cooldown=0;run.board[from]=null;run.gems++;run.merges++;
 if(has(run,'merge'))run.gold+=25;
 const end=start+(b.star>=3?.9:.65),color=RARITIES[unitById(run.mode,b.id).rarity].color;
 run.fusions.push({id:b.id,from:cellCenter(from),to:cellCenter(to),fromUid:a.uid,toUid:b.uid,fromStar,star:b.star,start,end,aReady,bReady,color,crit});
 b.readyAt=end;
 if(b.star>=3)highlight(run,b,'merge',end);
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
export function moveUnit(run,from,to){
 if(!active(run)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=run.board.length||to<0||to>=run.board.length||from===to||!run.board[from])return false;
 if((run.board[from].readyAt||0)>run.totalTime||(run.board[to]?.readyAt||0)>run.totalTime)return false;
 [run.board[to],run.board[from]]=[run.board[from],run.board[to]];emit(run,'move');run.version++;return true;
}
export function sell(run,index){
 if(!active(run)||!run.board[index]||(run.board[index].readyAt||0)>run.totalTime)return false;
 run.gold+=sellValue(run,run.board[index]);run.board[index]=null;run.version++;emit(run,'income');return true;
}
export function recipeSlots(run,id){
 const recipe=MODES[run.mode].recipes.find(r=>r.id===id);if(!recipe)return null;
 const used=[];
 for(const need of recipe.needs){
  const choices=run.board.map((u,i)=>({u,i})).filter(({u,i})=>u?.id===need&&(u.readyAt||0)<=run.totalTime&&!used.includes(i)).sort((a,b)=>a.u.star-b.u.star);
  if(!choices.length)return null;used.push(choices[0].i);
 }return used;
}
export function craft(run,id){
 if(!active(run))return false;const slots=recipeSlots(run,id);if(!slots)return false;
 for(const i of slots)run.board[i]=null;run.board[slots[0]]=makeUnit(run,id);run.discovered.push(id);run.version++;
 const p=cellCenter(slots[0]);fx(run,'ring',p.x,p.y,'#ff8aa5',{radius:200,life:1.3});emit(run,'mythic','신화 · '+unitById(run.mode,id).name);highlight(run,run.board[slots[0]],'draw');autoMerge(run);return true;
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
 if(enemy.hp<=0)return;const amount=value*(enemy.boss?bossBonus:1)*(enemy.boss&&has(run,'bounty')?1.6:1)*(enemy.armor||1)*(enemy.exposed>0?1.25:1);
 enemy.hp-=amount;enemy.hit=.12;
 if(enemy.hp<=0){
  run.kills++;run.gold+=(enemy.boss?85:2)+(has(run,'wealth')?1:0);
  fx(run,'pop',enemy.x,enemy.y,enemy.boss?'#ffd46d':MODES[run.mode].color,{life:.35,radius:enemy.radius*1.7});
  if(enemy.volatile>0){
   const explosion=enemy.volatileDamage||0;enemy.volatile=0;
   fx(run,'toxinburst',enemy.x,enemy.y,'#c9ed6c',{radius:72,life:.65});
   for(const other of living(run))if(Math.hypot(other.x-enemy.x,other.y-enemy.y)<72)damage(run,other,explosion,bossBonus);
  }
  if(enemy.boss){run.bossDefeated=run.wave;run.gems+=3;emit(run,'bosskill','보스 격파! +85G');}
 }
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
function utility(run,unit,index,syn){
 const def=unitById(run.mode,unit.id),pos=cellCenter(index),color=def.attack.color;
 if(isProducer(def)){
  const gold=8*unit.star+syn.income;run.gold+=gold;unit.earned=(unit.earned||0)+gold;run.version++;
  fx(run,'income',pos.x,pos.y,'#ffd46d',{life:1.15,text:'+'+gold+'G',radius:24});
 }else if(def.skill==='overdrive'){
  for(const i of supportCells(run,index)){
   const ally=run.board[i];if(!ally||(ally.readyAt||0)>run.totalTime)continue;
   const previous=(ally.overdriveUntil||0)>run.totalTime?ally.overdriveBonus||0:0;
   ally.overdriveUntil=run.totalTime+3;ally.overdriveBonus=Math.max(.8+(unit.star-1)*.15,previous);
   const p=cellCenter(i);fx(run,'charge',p.x,p.y,color,{life:.7,radius:25});
  }
  fx(run,'pulse',pos.x,pos.y,color,{life:.65,radius:unitRange(run,unit)});run.version++;
 }else if(def.skill==='bubbles'){
  if(run.traps.filter(t=>t.owner===unit.uid).length>=3)return true;
  const target=living(run).find(e=>Math.hypot(e.x-pos.x,e.y-pos.y)<=unitRange(run,unit));
  const{x,y,width:w,height:h}=TRACK;
  const candidates=[{x:pos.x,y},{x:pos.x,y:y+h},{x,y:pos.y},{x:x+w,y:pos.y}];
  const p=target||candidates.sort((a,b)=>Math.hypot(a.x-pos.x,a.y-pos.y)-Math.hypot(b.x-pos.x,b.y-pos.y))[0];
  run.traps.push({x:p.x,y:p.y,owner:unit.uid,life:12,armAt:run.totalTime+.35,damage:unitPower(run,unit,syn)*1.7,bossBonus:syn.boss,radius:64*syn.radius,color});
  fx(run,'projectile',pos.x,pos.y,color,{tx:p.x,ty:p.y,kind:'bubble',life:.35,radius:7});
 }else return false;
 unit.shots++;unit.lastAttackAt=run.totalTime;return true;
}
function grow(run,unit,index,dt){
 if(unitById(run.mode,unit.id).role!=='growth'||unit.star>=3)return false;
 unit.growthAge=(unit.growthAge||0)+dt;if(unit.growthAge<growthSeconds(unit))return false;
 const fromStar=unit.star,p=cellCenter(index),start=run.totalTime,end=start+.9;
 unit.star++;unit.growthAge=0;unit.readyAt=end;
 run.fusions.push({id:unit.id,from:p,to:p,fromUid:unit.uid,toUid:unit.uid,fromStar,star:unit.star,start,end,aReady:start,bReady:start,color:'#c8e99e',growth:true});
 if(unit.star>=3)highlight(run,unit,'merge',end);
 fx(run,'sprout',p.x,p.y,'#c8e99e',{life:.8,radius:48});run.version++;emit(run,'upgrade');return true;
}
function attack(run,unit,index,syn){
 const def=unitById(run.mode,unit.id),pos=cellCenter(index),range=unitRange(run,unit),color=def.attack.color;
 const targets=living(run).filter(e=>Math.hypot(pos.x-e.x,pos.y-e.y)<=range).sort((a,b)=>Number(b.boss)-Number(a.boss)||b.d-a.d);
 if(!targets.length)return false;
 if(def.skill==='lyse')targets.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
 const target=targets[0],power=unitPower(run,unit,syn);unit.shots=(unit.shots||0)+1;unit.lastAttackAt=run.totalTime;
 if(run.totalTime>=run.nextSoundAt){emit(run,def.rarity>=2?'heavyhit':'hit');run.nextSoundAt=run.totalTime+.16;}
 const hit=(enemy,amount)=>damage(run,enemy,amount,syn.boss);
 const area=(center,radius,amount,apply=()=>{})=>{
  for(const enemy of living(run))if(Math.hypot(enemy.x-center.x,enemy.y-center.y)<=radius*syn.radius){hit(enemy,amount*syn.area);apply(enemy);}
 };
 const shot=(enemy,kind='dart',extra={})=>fx(run,'projectile',pos.x,pos.y,color,{tx:enemy.x,ty:enemy.y,kind,life:.34,radius:4+def.rarity,...extra});
 const impact=(enemy,radius=40,kind='blast',extra={})=>fx(run,kind,enemy.x,enemy.y,color,{radius,life:.48,...extra});
 const poison=(enemy,scale,seconds=4,stack=false)=>{
  const previous=enemy.poison>0?enemy.poisonDamage||0:0;
  enemy.poisonStacks=stack?Math.min(3,(enemy.poison>0?enemy.poisonStacks||0:0)+1):1;
  enemy.poison=seconds;enemy.poisonBossBonus=syn.boss;
  enemy.poisonDamage=Math.max(previous,power*scale*syn.dot*(stack?1+(enemy.poisonStacks-1)*.35:1));
 };
 const chain=(kind,count)=>{
  let previous=pos;
  for(const enemy of targets.slice(0,count)){
   fx(run,kind,previous.x,previous.y,color,{tx:enemy.x,ty:enemy.y,life:.32,seed:unit.shots});hit(enemy,power);
   if(kind==='infection')poison(enemy,.2,2);previous=enemy;
  }
 };
 switch(def.skill){
  case 'disinfect':
   shot(target,'iodine');area(target,60,power,enemy=>enemy.exposed=4);
   if(run.pools.length<25)run.pools.push({x:target.x,y:target.y,radius:72*syn.radius,life:4,damage:power*.3*syn.dot,bossBonus:syn.boss,color,kind:'iodine'});
   impact(target,72,'splat');break;
  case 'amplify':
   shot(target,'dna');hit(target,power);
   for(const i of supportCells(run,index))if(run.board[i]){const p=cellCenter(i);impact(p,18,'charge',{life:.45});}break;
  case 'volatile':
   shot(target,'toxin');
   area(target,42,power,enemy=>{enemy.volatile=5;enemy.volatileDamage=Math.max(enemy.volatileDamage||0,power*2.5);});
   impact(target,35,'toxinmark');break;
  case 'lyse':{
   shot(target,'phage',{life:.25});hit(target,power);
   if(target.hp>0&&target.hp/target.maxHp<=(target.boss?.05:.15)){
    damage(run,target,target.maxHp*100);unit.executions=(unit.executions||0)+1;
    if(unit.executions%3===0){run.gems++;run.version++;}
    impact(target,60,'execute',{life:.65});
   }break;
  }
  case 'rapid':
   for(let i=0;i<3;i++){shot(target,'dart',{delay:i*.07,life:.28,spread:(i-1)*8});hit(target,power*.4);}break;
  case 'double':
   for(let i=0;i<2;i++){const enemy=targets[i]||target;shot(enemy,'orb',{spread:i?10:-10});hit(enemy,power*.65);}break;
  case 'splash':shot(target,'shell');area(target,48,power);impact(target,48);break;
  case 'acid':shot(target,'glob');area(target,42,power,enemy=>poison(enemy,.2,2));impact(target,42,'splat');break;
  case 'chain':chain('chain',3+syn.chain);break;
  case 'storm':chain('storm',6+syn.chain);impact(pos,35,'aura');break;
  case 'infect':chain('infection',3+syn.chain);break;
  case 'poison':shot(target,'needle');hit(target,power);poison(target,.7,4,true);impact(target,19,'splat');break;
  case 'spores':
   for(const enemy of targets.slice(0,2)){shot(enemy,'spore');hit(enemy,power*.7);poison(enemy,.6);impact(enemy,22,'splat');}break;
  case 'stun':shot(target,'hammer');area(target,44,power,enemy=>enemy.stun=.5);impact(target,44,'slam');break;
  case 'ram':
   shot(target,'ram',{life:.25});hit(target,power*1.2);target.d=Math.max(0,target.d-24);Object.assign(target,trackPoint(target.d));target.stun=.35;impact(target,32,'slam');break;
  case 'support':
   shot(target,'note');hit(target,power);impact(pos,145,'aura',{life:.7});break;
  case 'germinate':
   for(const enemy of targets.slice(0,2)){shot(enemy,'seed');hit(enemy,power*.7);}
   impact(pos,145,'sprout',{life:.7});break;
  case 'slow':
   shot(target,'ice');area(target,38,power,enemy=>enemy.slow=2.2+syn.slow);impact(target,38,'frost');break;
  case 'bind':
   for(const enemy of targets.slice(0,2)){fx(run,'vine',pos.x,pos.y,color,{tx:enemy.x,ty:enemy.y,life:.65});hit(enemy,power*.8);enemy.stun=.45;enemy.slow=2.2+syn.slow;}break;
  case 'pierce':case 'beam':{
   const length=Math.max(1,Math.hypot(target.x-pos.x,target.y-pos.y)),dx=(target.x-pos.x)/length,dy=(target.y-pos.y)/length;
   const end={x:pos.x+dx*range,y:pos.y+dy*range};let count=0;
   if(def.skill==='beam')fx(run,'beam',pos.x,pos.y,color,{tx:end.x,ty:end.y,life:.4});
   else shot(end,'lance',{life:.3});
   for(const enemy of targets){
    const along=(enemy.x-pos.x)*dx+(enemy.y-pos.y)*dy,across=Math.abs((enemy.x-pos.x)*dy-(enemy.y-pos.y)*dx);
    if(along>=0&&along<=range&&across<24&&count++<(def.skill==='beam'?6:3)){hit(enemy,power);impact(enemy,17,'spark');}
   }break;
  }
  case 'missile':
   for(let i=0;i<2;i++){const enemy=targets[i]||target;shot(enemy,'missile',{spread:i?34:-34,life:.48,delay:i*.08});area(enemy,66,power*.65);impact(enemy,66);}break;
  case 'nova':area(pos,range,power);impact(pos,range,'shockwave',{life:.65});break;
  case 'rupture':
   area(pos,range,power,enemy=>enemy.stun=.25);impact(pos,range,'shatter',{life:.65});break;
  case 'pool':case 'bloom':{
   const bloom=def.skill==='bloom',radius=bloom?100:65;
   shot(target,bloom?'flower':'glob');area(target,bloom?70:45,power);
   if(run.pools.length<25)run.pools.push({x:target.x,y:target.y,radius,life:bloom?3.5:3,damage:power*.5*syn.dot,bossBonus:syn.boss,color,kind:bloom?'bloom':'toxic'});
   impact(target,radius,bloom?'blossom':'splat',{life:.8});break;
  }
  case 'split':case 'hydra':
   targets.slice(0,def.skill==='hydra'?5:3).forEach((enemy,i)=>{shot(enemy,def.skill==='hydra'?'serpent':'spore',{spread:(i-2)*13,life:.45});hit(enemy,power);impact(enemy,20,'spark');});break;
  case 'frenzy':
   fx(run,'slash',target.x,target.y,color,{radius:32,life:.2,flip:unit.shots%2});hit(target,power);break;
  case 'meteor':
   Array.from({length:3},(_,i)=>targets[i%targets.length]).forEach((enemy,i)=>{fx(run,'projectile',enemy.x-70,enemy.y-160,color,{tx:enemy.x,ty:enemy.y,kind:'meteor',life:.55,delay:i*.09,radius:10});area(enemy,100,power);impact(enemy,100,'crater',{delay:.35+i*.09,life:.7});});break;
  case 'blizzard':
   for(const enemy of living(run)){hit(enemy,power);enemy.slow=2.5+syn.slow;}
   targets.slice(0,16).forEach((enemy,i)=>{fx(run,'projectile',enemy.x+15,enemy.y-80,color,{tx:enemy.x,ty:enemy.y,kind:'ice',life:.35,delay:(i%4)*.05,radius:5});impact(enemy,28,'frost',{life:.65});});
   impact(pos,520,'snow',{life:.8});break;
 }
 return true;
}
export function tickLuck(run,dt){
 if(!active(run)||!Number.isFinite(dt)||dt<=0)return;
 dt=Math.min(dt,.05);run.totalTime+=dt;run.waveTime+=dt;
 run.fusions=run.fusions.filter(f=>run.totalTime<f.end);
 run.highlights=run.highlights.filter(h=>run.totalTime<h.at+h.life);
 for(const e of run.effects)e.age+=dt;run.effects=run.effects.filter(e=>e.age<e.life+(e.delay||0));
 run.spawnTimer-=dt;
 if(run.spawned<run.spawnCount&&run.spawnTimer<=0){spawnEnemy(run);run.spawned++;run.spawnTimer=8/run.spawnCount;}
 if(run.wave%5===0&&!run.bossSpawned&&run.waveTime>=1.2){spawnEnemy(run,true);run.bossSpawned=true;}
 for(const e of run.enemies){
  if(e.hp<=0)continue;
  e.exposed=Math.max(0,(e.exposed||0)-dt);e.volatile=Math.max(0,(e.volatile||0)-dt);
  e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);
  if(e.poison>0){e.poison-=dt;damage(run,e,e.poisonDamage*dt,e.poisonBossBonus);}
  e.d+=e.speed*(e.stun>0?0:e.slow>0?.45:1)*dt;Object.assign(e,trackPoint(e.d));
  if(e.boss){
   if(run.totalTime>=e.deadline){run.status='lost';run.reason='보스 제한 시간 초과';emit(run,'lost');return;}
   if(run.wave>=10){e.skillTimer-=dt;if(e.skillTimer<=0){e.skillTimer=8;spawnEnemy(run);spawnEnemy(run);fx(run,'ring',e.x,e.y,'#ff839c',{radius:100,life:.6});}}
  }
 }
 for(const pool of run.pools){pool.life-=dt;for(const e of living(run))if(Math.hypot(e.x-pool.x,e.y-pool.y)<pool.radius){if(pool.kind==='iodine')e.exposed=Math.max(e.exposed,1);damage(run,e,pool.damage*dt,pool.bossBonus);e.slow=Math.max(e.slow,.2);}}
 run.pools=run.pools.filter(p=>p.life>0);
 for(const trap of run.traps){
  trap.life-=dt;if(trap.life<=0||run.totalTime<trap.armAt||!living(run).some(e=>Math.hypot(e.x-trap.x,e.y-trap.y)<24))continue;
  trap.life=0;
  for(const e of living(run))if(Math.hypot(e.x-trap.x,e.y-trap.y)<trap.radius){damage(run,e,trap.damage,trap.bossBonus);e.stun=Math.max(e.stun,.8);}
  fx(run,'bubbleburst',trap.x,trap.y,trap.color,{radius:trap.radius,life:.65});
 }
 run.traps=run.traps.filter(t=>t.life>0);
 const syn=traitEffects(run);let grown=false;
 run.board.forEach((unit,index)=>{
  if(!unit||(unit.readyAt||0)>run.totalTime)return;
  if(grow(run,unit,index,dt)){grown=true;return;}
  unit.cooldown-=dt;if(unit.cooldown>0)return;
  if(!utility(run,unit,index,syn)&&!attack(run,unit,index,syn)){unit.cooldown=.1;return;}
  unit.cooldown=unitInterval(run,unit,index,syn);
 });
 if(grown)autoMerge(run);
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
