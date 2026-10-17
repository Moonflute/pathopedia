import {DISTRICTS,JOBS,DRUGS,WAVES,ENTRANCE,districtDef} from './city-data.mjs';

export const SAVE_VERSION=1;
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=id=>{const {x,y}=districtDef(id);return {x,y};};
const avg=items=>items.reduce((a,b)=>a+b,0)/items.length;
export const cityHealth=s=>avg(Object.values(s.districts).map(d=>d.hp));
export const cityOxygen=s=>avg(Object.values(s.districts).map(d=>d.oxygen));
export const upgradeCost=(s,id)=>22+s.districts[id].level*16;
export const counts=(s,kind)=>s.cells.filter(c=>c.kind===kind).length;
export const output=(s,id)=>{
  const d=s.districts[id];
  return clamp(d.hp/100,.12,1)*clamp(d.oxygen/45,.25,1)*(d.food>0?1:.3);
};
function log(s,text){s.log.unshift({time:Math.floor(s.time),text});s.log.length=Math.min(s.log.length,6);}
function cell(s,kind,x,y){
  const c={id:++s.serial,kind,x,y,home:'marrow',target:'lung',path:[],step:0,cooldown:0,cargo:0,recordId:null,task:JOBS[kind].task};
  s.cells.push(c);return c;
}
function route(c,points){c.path=points.map(p=>({...p}));c.step=0;}
function move(c,speed,dt){
  let budget=speed*dt;
  while(c.step<c.path.length){const p=c.path[c.step],d=dist(c,p);if(d>budget){c.x+=(p.x-c.x)/d*budget;c.y+=(p.y-c.y)/d*budget;return false;}c.x=p.x;c.y=p.y;c.step++;budget-=d;}
  return true;
}
function vascular(from,to){return from==='heart'||to==='heart'?[point(to)]:[point('heart'),point(to)];}
export function createCity(host='normal'){
  const s={schema:SAVE_VERSION,time:0,serial:0,host:host==='neutropenia'?host:'normal',status:'running',endless:false,policy:'balanced',rally:'lung',drug:'ampicillin',resources:{food:110,materials:65},waste:12,inflammation:0,barrier:100,wave:0,nextWave:45,spawn:[],spawnClock:0,weather:{id:'clear',until:0},districts:{},cells:[],shipments:[],enemies:[],debris:[],effects:[],antigens:{},antibodies:{},recruits:[],log:[],stats:{defeated:0,deliveries:0,oxygen:0},supplyClock:0,drugClock:0};
  for(const d of DISTRICTS)s.districts[d.id]={level:1,hp:100,oxygen:85,food:12,ammo:{ampicillin:0,oxacillin:0,vancomycin:0},tower:0,building:null};
  s.districts.lung.ammo.ampicillin=18;
  for(let i=0;i<9;i++){const c=cell(s,'rbc',575+(i%3)*13,359+Math.floor(i/3)*9);c.target=DISTRICTS[i%6].id;route(c,[point('lung')]);}
  for(let i=0;i<(s.host==='neutropenia'?2:4);i++)cell(s,'neutrophil',784+i*18,298+i%2*22);
  for(let i=0;i<2;i++)cell(s,'macrophage',795+i*45,340);
  for(let i=0;i<2;i++)cell(s,'fibroblast',265+i*24,575);
  cell(s,'dendritic',821,284);
  log(s,'도시 운영 시작 · 첫 감염까지 45초');return s;
}
export function drugActivity(data,recordId,drugId){
  const result=data?.records?.find(r=>r.id===recordId)?.susceptibility?.[drugId];
  // Only unqualified susceptible results enable this prototype's drug weapon.
  const active=result?.category==='S'&&!result.applicability;
  return {category:result?.category||'—',active};
}
function shipment(s,kind,to,amount,extra={}){
  const sh={id:++s.serial,kind,from:'gut',to,amount,...point('gut'),path:vascular('gut',to),step:0,...extra};s.shipments.push(sh);return sh;
}
export function command(s,action,id){
  if(s.status!=='running'&&action!=='continue')return {ok:false,text:'도시를 다시 시작해 주세요.'};
  const d=s.districts[id];
  if(action==='policy'&&['balanced','defense','repair'].includes(id)){s.policy=id;return {ok:true};}
  if(action==='rally'&&d){s.rally=id;log(s,districtDef(id).short+' 방어 집결');return {ok:true};}
  if(action==='drug'&&DRUGS.some(x=>x.id===id)){s.drug=id;log(s,DRUGS.find(x=>x.id===id).name+' 보급 요청');return {ok:true};}
  if(action==='continue'&&s.status==='won'){s.status='running';s.endless=true;log(s,'방어 완료 · 자유 운영 시작');return {ok:true};}
  if(action==='wave'){
    if(s.spawn.length||s.enemies.length)return {ok:false,text:'현재 감염을 먼저 정리해 주세요.'};
    if(s.wave>=3&&!s.endless)return {ok:false,text:'모든 침입을 막았습니다.'};
    startWave(s);return {ok:true};
  }
  if(action==='weather'){
    if(s.weather.until>s.time)return {ok:false,text:'현재 환경 변화가 끝난 뒤 사용할 수 있습니다.'};
    s.weather={id:'dry',until:s.time+35};log(s,'건조한 공기 · 35초 동안 폐 산소 공급 감소');return {ok:true};
  }
  if(action==='recruit'&&JOBS[id]){
    const job=JOBS[id];
    if(counts(s,id)+s.recruits.filter(r=>r.kind===id).length>=job.cap)return {ok:false,text:'이 직업의 정원에 도달했습니다.'};
    if(s.recruits.length>=3)return {ok:false,text:'충원 대기열이 가득 찼습니다.'};
    if(s.resources.food<job.cost)return {ok:false,text:'영양분이 부족합니다.'};
    s.resources.food-=job.cost;
    const r={id:++s.serial,kind:id,remaining:null};s.recruits.push(r);shipment(s,'recruit','marrow',job.cost,{recruitId:r.id});return {ok:true,text:job.name+' 충원 물자 배송 중'};
  }
  if(['upgrade','repair','tower'].includes(action)&&d){
    if(d.building)return {ok:false,text:'현재 작업을 마친 뒤 주문할 수 있습니다.'};
    if(action==='upgrade'&&d.level>=4)return {ok:false,text:'최대 레벨입니다.'};
    if(action==='tower'&&d.tower>=2)return {ok:false,text:'방어 초소는 최대 2단계입니다.'};
    if(action==='repair'&&d.hp>=99&&(id!=='lung'||s.barrier>=99))return {ok:false,text:'이미 양호한 상태입니다.'};
    const cost=action==='upgrade'?upgradeCost(s,id):action==='tower'?30+d.tower*20:16;
    if(s.resources.materials<cost)return {ok:false,text:'자재가 부족합니다.'};
    s.resources.materials-=cost;d.building={type:action,remaining:null,duration:action==='repair'?4:9};shipment(s,'materials',id,cost);return {ok:true,text:'자재 배송 중'};
  }
  return {ok:false,text:'지금 사용할 수 없습니다.'};
}
function startWave(s){
  const w=WAVES[Math.min(s.wave,2)];s.wave++;s.spawn=Array.from({length:w.count},()=>({recordId:w.recordId,hp:w.hp,maxHp:w.hp,color:w.color,tag:w.tag}));s.spawnClock=0;s.nextWave=WAVES[s.wave]?.at??Infinity;
  log(s,`${Math.min(s.wave,3)}/3차 감염 · ${w.name}`);
  if(s.wave===2)s.weather={id:'fever',until:s.time+40};
}
function delivery(s,sh){
  const d=s.districts[sh.to];
  if(sh.kind==='food')d.food=Math.min(40,d.food+sh.amount);
  if(sh.kind==='drug')d.ammo[sh.drugId]+=sh.amount;
  if(sh.kind==='materials'&&d.building)d.building.remaining=d.building.duration;
  if(sh.kind==='recruit'){const r=s.recruits.find(r=>r.id===sh.recruitId);if(r)r.remaining=(s.host==='neutropenia'&&r.kind==='neutrophil'?22:8)/s.districts.marrow.level;}
  s.stats.deliveries++;
}
function damage(s,e,amount,from,color){
  e.hp-=amount;s.effects.push({x:from.x,y:from.y,tx:e.x,ty:e.y,color,life:.18});
  if(e.hp<=0&&!e.dead){e.dead=true;s.stats.defeated++;s.debris.push({id:++s.serial,x:e.x,y:e.y,recordId:e.recordId});s.waste+=.5;s.inflammation+=.8;}
}
function updateCell(s,c,dt,speed,data){
  c.cooldown=Math.max(0,c.cooldown-dt);
  if(c.kind==='rbc'){
    if(!move(c,speed*1.1,dt))return;
    if(c.cargo){const d=s.districts[c.target];d.oxygen=clamp(d.oxygen+c.cargo);s.stats.oxygen+=c.cargo;c.cargo=0;c.task='폐로 복귀';route(c,vascular(c.target,'lung'));}
    else {
      const targets=DISTRICTS.filter(d=>d.id!=='lung').sort((a,b)=>(s.districts[a.id].oxygen+s.cells.filter(x=>x.kind==='rbc'&&x.cargo&&x.target===a.id).length*30)-(s.districts[b.id].oxygen+s.cells.filter(x=>x.kind==='rbc'&&x.cargo&&x.target===b.id).length*30));
      c.target=targets[0].id;c.cargo=32*(1+(s.districts.lung.level-1)*.25)*output(s,'lung')*(s.weather.id==='dry'?.55:1);c.task=districtDef(c.target).short+' 산소 배송';route(c,vascular('lung',c.target));
    }return;
  }
  if(c.kind==='fibroblast'){
    if(c.path.length&& !move(c,46,dt))return;
    if(c.cooldown>0)return;
    const weakest=DISTRICTS.reduce((a,b)=>s.districts[a.id].hp<s.districts[b.id].hp?a:b);
    if(c.target===weakest.id&&s.districts[weakest.id].hp<98){s.districts[weakest.id].hp=clamp(s.districts[weakest.id].hp+(s.policy==='repair'?3.8:2));c.task='조직 복구';c.cooldown=2;}
    else if(s.resources.food>=1){s.resources.food-=.6;s.resources.materials=Math.min(300,s.resources.materials+1.4*output(s,'marrow')*(1+.2*(s.districts.marrow.level-1)));c.cooldown=4;c.task='자재 생산';}
    c.target=weakest.id;route(c,[{x:weakest.x+25*Math.sin(s.time+c.id),y:weakest.y+38}]);return;
  }
  if(c.kind==='dendritic'){
    if(c.recordId){c.task='림프절로 항원 운반';if(!c.path.length)route(c,[point('heart'),point('lymph')]);if(move(c,63,dt)){s.antigens[c.recordId]=true;log(s,'항원 도착 · 표적 항체 반응 시작');c.recordId=null;c.path=[];c.cooldown=10;}return;}
    const evidence=s.debris.find(e=>!s.antigens[e.recordId])||s.enemies.find(e=>!s.antigens[e.recordId]);
    if(evidence&&c.cooldown===0){c.task='항원 수집';route(c,[evidence]);if(move(c,65,dt)){c.recordId=evidence.recordId;c.path=[];}}
    else {c.task='감시';wander(s,c,dt);}return;
  }
  if(c.kind==='macrophage'&&s.debris.length&&(s.policy==='repair'||!s.enemies.some(e=>!e.dead&&dist(e,c)<80))){
    const debris=s.debris.reduce((a,b)=>dist(a,c)<dist(b,c)?a:b);c.task='잔해 청소';route(c,[debris]);if(move(c,60,dt)){s.debris=s.debris.filter(e=>e.id!==debris.id);s.waste=clamp(s.waste-1.4);s.inflammation=clamp(s.inflammation-1.8);c.cooldown=.8;}return;
  }
  const target=s.enemies.filter(e=>!e.dead).sort((a,b)=>dist(a,c)-dist(b,c))[0];
  if(target&&(dist(target,c)<240||dist(target,point(s.rally))<200)){
    c.task='감염 대응';const range=c.kind==='neutrophil'?66:34;
    if(dist(c,target)>range){route(c,[target]);move(c,c.kind==='neutrophil'?82:56,dt);}
    else if(c.cooldown===0){
      const near=DISTRICTS.reduce((a,b)=>dist(c,a)<dist(c,b)?a:b),d=s.districts[near.id];
      const supply=clamp(d.oxygen/45,.3,1)*(d.food>0?1:.5),base=(c.kind==='macrophage'?8:4)*(s.policy==='defense'?1.3:1)*supply;
      damage(s,target,base,c,JOBS[c.kind].color);
      if(c.kind==='neutrophil'&&d.ammo[s.drug]>=1&&drugActivity(data,target.recordId,s.drug).active){d.ammo[s.drug]--;damage(s,target,8,c,DRUGS.find(d=>d.id===s.drug).color);}
      c.cooldown=c.kind==='macrophage'?1.8:1.3;
    }
  }else{c.task='순찰';wander(s,c,dt);}
}
function wander(s,c,dt){
  if(!c.path.length||c.step>=c.path.length){const d=point(s.rally),phase=s.time*.19+c.id*2.4;route(c,[{x:d.x+Math.cos(phase)*95,y:d.y+Math.sin(phase)*60+25}]);}
  move(c,35,dt);
}
export function tickCity(s,dt,data){
  if(s.status!=='running'||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.25);s.time+=dt;
  if(s.weather.until<=s.time)s.weather={id:'clear',until:0};
  if(s.wave<3&&s.time>=s.nextWave&&!s.enemies.length&&!s.spawn.length)startWave(s);
  s.spawnClock-=dt;
  if(s.spawn.length&&s.spawnClock<=0){s.enemies.push({...s.spawn.shift(),id:++s.serial,x:ENTRANCE.x+(s.serial%3)*8,y:ENTRANCE.y+(s.serial%4)*8,dead:false});s.spawnClock=1.8;}
  const fever=s.weather.id==='fever',speed=(85+(s.districts.heart.level-1)*19)*output(s,'heart')*clamp(1-s.waste/180,.4,1);
  s.resources.food=Math.min(400,s.resources.food+dt*1.8*(1+.35*(s.districts.gut.level-1))*output(s,'gut'));
  s.waste=clamp(s.waste+dt*(.24+(fever?.2:0)+s.enemies.length*.012-.36*(1+.45*(s.districts.kidney.level-1))*output(s,'kidney')));
  s.inflammation=clamp(s.inflammation-dt*.12);
  s.barrier=clamp(s.barrier+dt*.35*s.districts.lung.level);
  for(const def of DISTRICTS){
    const d=s.districts[def.id];
    d.oxygen=clamp(d.oxygen+dt*(def.id==='lung'?10:-1.35-(fever?.55:0)));
    d.food=Math.max(0,d.food-dt*.12);
    const stress=(d.oxygen<15?.7:0)+(d.food<=0?.25:0)+(s.waste>65?.35:0)+(s.inflammation>65?.3:0);
    d.hp=clamp(d.hp+dt*(stress?-stress:d.hp>0?.025:0));
    if(d.building?.remaining!=null){d.building.remaining-=dt*output(s,def.id);if(d.building.remaining<=0){const type=d.building.type;if(type==='upgrade')d.level++;if(type==='tower')d.tower++;if(type==='repair'){d.hp=clamp(d.hp+45);if(def.id==='lung')s.barrier=clamp(s.barrier+55);}d.building=null;log(s,def.short+' '+({upgrade:'시설 확장',tower:'방어 초소 건설',repair:'복구'}[type])+' 완료');}}
    if(d.tower&&s.enemies.length){d.shot=(d.shot||0)-dt;const enemy=s.enemies.find(e=>!e.dead&&dist(e,def)<175);if(enemy&&d.shot<=0){damage(s,enemy,4*d.tower*output(s,def.id),def,'#f1c67c');d.shot=1.2;}}
  }
  s.supplyClock-=dt;s.drugClock-=dt;
  if(s.supplyClock<=0){
    const targets=DISTRICTS.filter(d=>s.districts[d.id].food<22&&!s.shipments.some(x=>x.kind==='food'&&x.to===d.id)).sort((a,b)=>s.districts[a.id].food-s.districts[b.id].food);
    const t=targets[0],amount=6+s.districts.gut.level*2;
    if(t&&s.resources.food>=amount){s.resources.food-=amount;shipment(s,'food',t.id,amount);}s.supplyClock=2.5;
  }
  if(s.drugClock<=0){
    const d=s.districts[s.rally],drug=DRUGS.find(d=>d.id===s.drug);
    if(d.ammo[s.drug]<18&&!s.shipments.some(x=>x.kind==='drug'&&x.to===s.rally&&x.drugId===s.drug)&&s.resources.food>=drug.cost){s.resources.food-=drug.cost;shipment(s,'drug',s.rally,18,{drugId:s.drug});}
    s.drugClock=4;
  }
  for(const sh of [...s.shipments])if(move(sh,speed,dt)){delivery(s,sh);s.shipments=s.shipments.filter(x=>x.id!==sh.id);}
  for(const r of [...s.recruits])if(r.remaining!=null){r.remaining-=dt*output(s,'marrow');if(r.remaining<=0){cell(s,r.kind,279,583);s.recruits=s.recruits.filter(x=>x.id!==r.id);log(s,JOBS[r.kind].name+' 출근');}}
  for(const id of Object.keys(s.antigens))s.antibodies[id]=clamp((s.antibodies[id]||0)+dt*1.5*(1+.4*(s.districts.lymph.level-1))*output(s,'lymph'));
  for(const e of s.enemies){
    if(e.dead)continue;
    const lung=point('lung');
    if(dist(e,ENTRANCE)<160&&s.barrier>0){const p={x:983,y:180},distance=dist(e,p);if(distance>8){e.x+=(p.x-e.x)/distance*20*dt;e.y+=(p.y-e.y)/distance*20*dt;}else{s.barrier=clamp(s.barrier-dt*3);e.hp-=dt*.55*s.districts.lung.level;if(e.hp<=0)damage(s,e,0,e,'#a4cab0');}}
    else {
      const target=s.districts.lung.hp>28?lung:point('heart'),distance=dist(e,target);
      if(distance>38){e.x+=(target.x-e.x)/distance*15*dt;e.y+=(target.y-e.y)/distance*15*dt;}
      else{s.districts[target===lung?'lung':'heart'].hp=clamp(s.districts[target===lung?'lung':'heart'].hp-dt*.7);s.inflammation=clamp(s.inflammation+dt*.12);}
    }
    if((s.antibodies[e.recordId]||0)>=100)e.hp-=dt*1.3;
    if(e.hp<=0&&!e.dead)damage(s,e,0,e,'#c6df9c');
  }
  for(const c of s.cells)updateCell(s,c,dt,speed,data);
  s.enemies=s.enemies.filter(e=>!e.dead);s.debris=s.debris.slice(-80);
  s.effects=s.effects.filter(e=>(e.life-=dt)>0);
  if(s.districts.heart.hp<=0||cityHealth(s)<22){s.status='lost';log(s,'도시 기능 정지');}
  else if(s.wave>=3&&!s.spawn.length&&!s.enemies.length&&!s.endless){s.status='won';log(s,'3차 감염 방어 완료');}
}
export function serializeCity(s){return JSON.stringify({...s,effects:[],nextWave:Number.isFinite(s.nextWave)?s.nextWave:null});}
export function restoreCity(raw){
  try{
    const s=typeof raw==='string'?JSON.parse(raw):raw;
    if(!s||s.schema!==SAVE_VERSION||!['running','won','lost'].includes(s.status)||!['normal','neutropenia'].includes(s.host))return null;
    if(!Number.isFinite(s.time)||s.time<0||!Number.isInteger(s.serial)||!Number.isInteger(s.wave)||s.wave<0||!['balanced','defense','repair'].includes(s.policy)||!districtDef(s.rally)||!DRUGS.some(d=>d.id===s.drug))return null;
    const finite=(v,max=1e7)=>Number.isFinite(v)&&v>=0&&v<=max;
    if(!finite(s.resources?.food,400)||!finite(s.resources?.materials,300)||!finite(s.waste,100)||!finite(s.inflammation,100)||!finite(s.barrier,100))return null;
    for(const def of DISTRICTS){const d=s.districts?.[def.id];if(!d||!finite(d.hp,100)||!finite(d.oxygen,100)||!finite(d.food,40)||!Number.isInteger(d.level)||d.level<1||d.level>4||!finite(d.tower,2)||DRUGS.some(x=>!finite(d.ammo?.[x.id],200)))return null;if(d.building&&(!['upgrade','repair','tower'].includes(d.building.type)||!finite(d.building.duration,10)||d.building.remaining!=null&&!finite(d.building.remaining,10)))return null;}
    for(const k of ['cells','shipments','enemies','debris','recruits','log','spawn'])if(!Array.isArray(s[k])||s[k].length>200)return null;
    for(const c of [...s.cells,...s.shipments])if(!Number.isFinite(c.x)||!Number.isFinite(c.y)||!Array.isArray(c.path)||c.path.length>10||c.path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||!Number.isInteger(c.step)||c.step<0||c.step>c.path.length)return null;
    if(s.cells.some(c=>!JOBS[c.kind]||!districtDef(c.target)||!finite(c.cooldown)||!finite(c.cargo)))return null;
    if(s.shipments.some(c=>!districtDef(c.to)||!['food','drug','materials','recruit'].includes(c.kind)||!finite(c.amount)||c.kind==='drug'&&!DRUGS.some(d=>d.id===c.drugId)))return null;
    if(s.enemies.some(e=>!Number.isFinite(e.x)||!Number.isFinite(e.y)||!finite(e.hp)||!WAVES.some(w=>w.recordId===e.recordId)))return null;
    if(s.spawn.some(e=>!WAVES.some(w=>w.recordId===e.recordId)||!finite(e.hp)||!finite(e.maxHp)))return null;
    if(s.recruits.some(r=>!JOBS[r.kind]||r.remaining!=null&&!finite(r.remaining)))return null;
    if(s.debris.some(e=>!Number.isFinite(e.x)||!Number.isFinite(e.y)||!WAVES.some(w=>w.recordId===e.recordId)))return null;
    if(s.log.some(l=>!finite(l.time)||typeof l.text!=='string'||l.text.length>300))return null;
    if(!s.antigens||!s.antibodies||!s.stats||!s.weather||!['clear','dry','fever'].includes(s.weather.id)||!finite(s.weather.until)||!Number.isFinite(s.supplyClock)||!Number.isFinite(s.drugClock)||!Number.isFinite(s.spawnClock))return null;
    if(['defeated','deliveries','oxygen'].some(k=>!finite(s.stats[k]))||Object.values(s.antibodies).some(v=>!finite(v,100)))return null;
    s.nextWave=s.nextWave??Infinity;s.effects=[];return s;
  }catch{return null;}
}
