import {ensureFrontier,frontierCommand,deliverFrontier,frontierDestination,assignFronts,spawnAtFront,tickFrontierEnemy,tickFrontier,frontierCell,receiveAntigen,completeInvestment,frontDepot,validateFrontier} from './city-frontier.mjs';
import {supportCount} from './city-frontier-data.mjs';
import {groundCoordinate,SITES} from './city-three-layout.mjs';
import {approachWorkplace,releaseWorkplace} from './city-workplaces.mjs';
import {DISTRICTS,JOBS,CELL_JOBS,cityJobs,cellCap,DRUGS,WAVES,ENTRANCE,SCENARIOS,districtDef} from './city-data.mjs';
import {vascularRoute,FOOD_ENTRY,FOOD_ROAD} from './city-map.mjs';
import {workStation,beginActivity,activityProgress,activeActivity,ACTIVITY_KINDS} from './city-activity.mjs';
import {ensureBiology,biologyCommand,tickBiology,seedInfection,combatDestination,updateCombatCondition,combatEffort,cleanLocalDebris,localInfection,antibodySupport,medicineOrder,pathogenDef,validateBiology,antigenEvidence} from './city-biology.mjs';

export const SAVE_VERSION=1;
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=id=>{const {x,y}=districtDef(id);return {x,y};};
const avg=items=>items.reduce((a,b)=>a+b,0)/items.length;
export const cityHealth=s=>avg(Object.values(s.districts).map(d=>d.hp))*(s.frontier?.8:1)+(s.frontier?avg(s.frontier.tissues.map(t=>t.hp))*.2:0);
export const cityOxygen=s=>avg(Object.values(s.districts).map(d=>d.oxygen));
export const upgradeCost=(s,id)=>22+s.districts[id].level*16;
export const counts=(s,kind)=>s.cells.filter(c=>c.kind===kind).length;
export const output=(s,id)=>{
  const d=s.districts[id];
  return clamp(d.hp/100,.12,1)*clamp(d.oxygen/45,.25,1)*(d.food>0?1:.3)*(s.biology?.sites[id].isolated?.65:1);
};
function log(s,text){s.log.unshift({time:Math.floor(s.time),text});s.log.length=Math.min(s.log.length,s.specialists?24:6);}
const frontierAPI={route,move,log,shipment,output,damage,seed:seedInfection};
function cell(s,kind,x,y){
  const c={id:++s.serial,kind,x,y,age:0,life:CELL_JOBS[kind].life,home:'marrow',target:'lung',path:[],step:0,cooldown:0,cargo:0,recordId:null,task:CELL_JOBS[kind].task};
  if(kind==='rbc')route(c,vascularRoute('marrow','lung'));
  s.cells.push(c);return c;
}
function route(c,points){c.path=points.map(p=>({...p}));c.step=0;}
function move(c,speed,dt){
  let budget=speed*dt;
  while(c.step<c.path.length){const p=c.path[c.step],d=dist(c,p);if(d>budget){c.x+=(p.x-c.x)/d*budget;c.y+=(p.y-c.y)/d*budget;return false;}c.x=p.x;c.y=p.y;c.step++;budget-=d;}
  return true;
}
const vascular=vascularRoute;
export function createCity(host='normal',scenario='legacy',options={}){
  const preset=SCENARIOS[scenario];if(preset)host=preset.host;
  const s={schema:SAVE_VERSION,time:0,serial:0,host:host==='neutropenia'?host:'normal',status:'running',endless:false,policy:'balanced',rally:'lung',drug:'ampicillin',resources:{food:110,materials:65},waste:12,inflammation:0,barrier:100,wave:0,nextWave:45,spawn:[],spawnClock:0,weather:{id:'clear',until:0},districts:{},cells:[],shipments:[],enemies:[],debris:[],effects:[],antigens:{},antibodies:{},recruits:[],log:[],stats:{defeated:0,deliveries:0,oxygen:0},supplyClock:0,drugClock:0};
  Object.assign(s,{scenario:preset?scenario:'legacy',workCrews:options.workCrews===true,specialists:false,lifecycle:false,turnover:{},rawFood:24,intakeClock:0,breach:0,recovered:0,endReason:''});s.stats.born=0;s.stats.retired=0;s.stats.signals=0;s.stats.antibodyBatches=0;s.stats.clots=0;
  for(const d of DISTRICTS)s.districts[d.id]={level:1,hp:100,oxygen:85,food:12,ammo:{ampicillin:0,oxacillin:0,vancomycin:0},tower:0,building:null};
  s.districts.lung.ammo.ampicillin=18;
  for(let i=0;i<9;i++){const c=cell(s,'rbc',575+(i%3)*13,359+Math.floor(i/3)*9);c.target=DISTRICTS[i%6].id;route(c,[point('lung')]);}
  for(let i=0;i<(s.host==='neutropenia'?2:4);i++)cell(s,'neutrophil',784+i*18,298+i%2*22);
  for(let i=0;i<2;i++)cell(s,'macrophage',795+i*45,340);
  for(let i=0;i<2;i++)cell(s,'fibroblast',265+i*24,575);
  cell(s,'dendritic',821,284);
  if(preset){
    for(let i=9;i<22;i++)cell(s,'rbc',575,359);
    for(let i=0;i<(s.host==='neutropenia'?2:4);i++)cell(s,'neutrophil',770+i*22,340);
    for(let i=0;i<2;i++){cell(s,'macrophage',740+i*45,390);cell(s,'fibroblast',255+i*25,570);}
    cell(s,'dendritic',295,270);
    let i=0;for(const c of s.cells){c.age=(c.id%7)*c.life*.035;if(c.kind!=='rbc')continue;
      c.target=DISTRICTS.filter(d=>d.id!=='lung')[i%5].id;c.cargo=i%2?18:0;
      route(c,c.cargo?vascular('lung',c.target):vascular(c.target,'lung'));
      const step=(i*3)%Math.max(1,c.path.length-1);Object.assign(c,c.path[step]);c.step=step+1;i++;
    }
    s.nextWave=preset.waves[0]??Infinity;
    if(scenario==='recovery'){
      for(const d of DISTRICTS){s.districts[d.id].hp=d.id==='lung'?45:62;s.districts[d.id].oxygen=58;}
      s.waste=58;s.barrier=25;s.resources.materials=95;startWave(s);
      for(let n=0;n<4;n++)s.enemies.push({...s.spawn.shift(),id:++s.serial,x:875+n*14,y:295+n*10,dead:false});
    }
  }
  if(options.specialists)upgradeVillage(s);
  log(s,preset?preset.name+' · 운영 시작':'도시 운영 시작 · 첫 감염까지 45초');return s;
}
// One-time upgrade keeps the saved clock, objectives, buildings and deliveries.
export function upgradeVillage(s){
  if(s.specialists){ensureFrontier(s);ensureBiology(s);return s;}
  s.specialists=true;s.workCrews=true;
  const red=s.cells.filter(c=>c.kind==='rbc'),removeCount=Math.round(red.length*.2),remove=new Set((removeCount?red.slice(-removeCount):[]).map(c=>c.id));
  s.cells=s.cells.filter(c=>!remove.has(c.id));
  const roster={neutrophil:s.host==='neutropenia'?4:10,macrophage:6,fibroblast:6,dendritic:4,helperT:3,plasma:3,platelet:4};
  for(const [kind,total] of Object.entries(roster))for(let n=counts(s,kind);n<total&&s.cells.length<96;n++){
    const home=kind==='plasma'||kind==='helperT'?'lymph':kind==='platelet'?'heart':'marrow',p=point(home);
    const c=cell(s,kind,p.x+(n%3-1)*22,p.y+12+Math.floor(n/3)*15);c.target=home;
  }
  s.stats.signals??=0;s.stats.antibodyBatches??=0;s.stats.clots??=0;
  ensureFrontier(s);assignFronts(s);
  ensureBiology(s);
  return s;
}
export function objectiveState(s){
  const p=SCENARIOS[s.scenario];if(!p)return {title:'기존 도시 · 감염 3회 방어',detail:`${Math.min(s.wave,3)} / 3`,progress:s.wave/3};
  if(p.kind==='sandbox')return {title:'면역·감염 시뮬레이션',detail:'직접 유입 · 보급 · 경로 관찰',progress:0};
  const remaining=Math.max(0,Math.ceil(p.duration-s.time)),timer=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
  return {title:p.goal,detail:s.breach>0?`기준 이탈 · ${Math.ceil(15-s.breach)}초 유예`:p.kind==='restore'?(s.recovered>0?`복구 안정화 ${Math.ceil(15-s.recovered)}초`:`제한 ${timer} · 노폐물 ≤${p.waste}%`): `남은 ${timer} · 노폐물 ≤${p.waste}%`,progress:p.kind==='hold'?Math.min(1,s.time/p.duration):Math.min(s.wave/3,Math.min(...Object.values(s.districts).map(d=>d.hp))/p.health,1)};
}
export function drugActivity(data,recordId,drugId){
  const result=data?.records?.find(r=>r.id===recordId)?.susceptibility?.[drugId];
  // Only unqualified susceptible results enable this prototype's drug weapon.
  const active=result?.category==='S'&&!result.applicability;
  return {category:result?.category||'—',active};
}
function shipment(s,kind,to,amount,extra={}){
  const sh={id:++s.serial,kind,from:'gut',to,amount,...point('gut'),path:vascular('gut',to),step:0,...extra};
  if(s.specialists){sh.phase='pickup';route(sh,[workStation('gut','dock').stand]);}
  s.shipments.push(sh);return sh;
}
export function command(s,action,id,data){
  if(s.status!=='running'&&action!=='continue')return {ok:false,text:'도시를 다시 시작해 주세요.'};
  const bio=biologyCommand(s,action,id,data,frontierAPI);if(bio)return bio;
  if(s.specialists&&s.shipments.length>=48&&['upgrade','repair','tower','recruit'].includes(action))return {ok:false,text:'물류 대기열 포화'};
  const d=s.districts[id],front=frontierCommand(s,action,id,frontierAPI);if(front)return front;
  if(action==='lifecycle'){s.lifecycle=!s.lifecycle;return {ok:true};}
  if(action==='policy'&&['balanced','defense','repair'].includes(id)){s.policy=id;return {ok:true};}
  if(action==='rally'&&d){s.rally=id;log(s,districtDef(id).short+' 방어 집결');return {ok:true};}
  if(action==='drug'&&DRUGS.some(x=>x.id===id)){s.drug=id;log(s,DRUGS.find(x=>x.id===id).name+' 보급 요청');return {ok:true};}
  if(action==='continue'&&s.status==='won'){s.status='running';s.endless=true;log(s,'방어 완료 · 자유 운영 시작');return {ok:true};}
  if(action==='wave'){
    if(s.scenario==='simulation')return {ok:false,text:'실험 패널에서 유입 조건 선택'};
    if(s.spawn.length||s.enemies.length)return {ok:false,text:'현재 감염을 먼저 정리해 주세요.'};
    if(s.wave>=3&&!s.endless)return {ok:false,text:'모든 침입을 막았습니다.'};
    startWave(s);return {ok:true};
  }
  if(action==='weather'){
    if(s.weather.until>s.time)return {ok:false,text:'현재 환경 변화가 끝난 뒤 사용할 수 있습니다.'};
    s.weather={id:'dry',until:s.time+35};log(s,'건조한 공기 · 35초 동안 폐 산소 공급 감소');return {ok:true};
  }
  if(action==='recruit'&&cityJobs(s)[id]){
    const job=cityJobs(s)[id];
    if(s.specialists&&s.cells.length+s.recruits.length>=96)return {ok:false,text:'도시 인력 정원에 도달했습니다.'};
    if(counts(s,id)+s.recruits.filter(r=>r.kind===id).length>=cellCap(s,id))return {ok:false,text:'이 직업의 정원에 도달했습니다.'};
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
  const w=WAVES[Math.min(s.wave,2)];s.wave++;s.spawn=Array.from({length:w.count},()=>({recordId:w.recordId,hp:w.hp,maxHp:w.hp,color:w.color,tag:w.tag}));s.spawnClock=0;s.nextWave=SCENARIOS[s.scenario]?.waves[s.wave]??(s.scenario==='legacy'?WAVES[s.wave]?.at:Infinity)??Infinity;
  log(s,`${Math.min(s.wave,3)}/3차 감염 · ${w.name}`);
  assignFronts(s);
  if(s.wave===2)s.weather={id:'fever',until:s.time+40};
}
function delivery(s,sh){
  if(deliverFrontier(s,sh))return;
  const d=s.districts[sh.to];
  if(sh.kind==='raw')s.rawFood=Math.min(80,s.rawFood+sh.amount);
  if(sh.kind==='food')d.food=Math.min(40+supportCount(s,sh.to,'supply')*8,d.food+sh.amount);
  if(sh.kind==='drug'){d.ammo[sh.drugId]=Math.min(200,d.ammo[sh.drugId]+sh.amount);if(s.biology)s.biology.stats.medicine+=sh.amount;}
  if(sh.kind==='materials'&&d.building)d.building.remaining=d.building.duration;
  if(sh.kind==='recruit'){const r=s.recruits.find(r=>r.id===sh.recruitId);if(r){r.remaining=(s.host==='neutropenia'&&r.kind==='neutrophil'?22:8)/s.districts.marrow.level;r.duration=r.remaining;}}
  s.stats.deliveries++;
}
function damage(s,e,amount,from,color){
  e.hp-=amount;s.effects.push({x:from.x,y:from.y,tx:e.x,ty:e.y,color,life:s.specialists?.42:.18,kind:from.kind==='macrophage'||s.biology&&from.kind==='neutrophil'?'engulf':'shot'});
  if(e.hp<=0&&!e.dead){e.dead=true;s.stats.defeated++;s.debris.push({id:++s.serial,x:e.x,y:e.y,recordId:e.recordId});s.waste=clamp(s.waste+.5);s.inflammation=clamp(s.inflammation+.8);}
}
function station(c,id,tag,dx,dy,dt,speed=58){
  if(c.assignment!==tag){
    const from=DISTRICTS.reduce((a,b)=>dist(c,a)<dist(c,b)?a:b),p=point(id);
    c.target=id;c.assignment=tag;route(c,[point(from.id),...vascular(from.id,id),{x:p.x+dx,y:p.y+dy}]);
  }
  return move(c,speed,dt);
}
function specialist(s,c,dt){
  const slot=c.id%3;
  if(c.kind==='plasma'){
    c.target='lymph';c.nextTask='항체 생산 → 다음 표적';
    const bench=approachWorkplace(s,c,'lymph','produce',dt,move,route);c.workSlot=bench.slot;
    if(!bench.arrived){c.task=bench.ready?'항체 공방 이동':'항체 작업대 대기';return true;}
    if(c.activity?.kind==='produce'){
      if(activityProgress(c.activity,s.time)<1){c.task='항체 생산';return true;}
      s.antibodies[c.recordId]=clamp((s.antibodies[c.recordId]||0)+(1+.4*(s.districts.lymph.level-1))*output(s,'lymph'));
      s.stats.antibodyBatches++;c.activity=null;c.cooldown=.8;releaseWorkplace(c);
    }
    const antigen=Object.keys(s.antigens).filter(id=>s.antigens[id]&&(s.antibodies[id]||0)<100).sort((a,b)=>(s.antibodies[a]||0)-(s.antibodies[b]||0))[0];
    c.task=!antigen?'항원 정보 대기':s.districts.lymph.food<.2?'영양분 대기':'작업대 정리';c.recordId=antigen||null;c.waitReason=!antigen?(s.frontier.inbox.length?'항원 접수·반응 준비 중':'새 항원 정보 없음'):s.districts.lymph.food<.2?'림프절 영양분 부족':c.cooldown>0?'생산 주기 정리':'';
    if(antigen&&c.cooldown===0&&s.districts.lymph.food>=.2){
      s.districts.lymph.food-=.2;beginActivity(s,c,'produce',1.2,bench.target,'lymph');c.task='항체 생산';
    }
    return true;
  }
  if(c.kind==='helperT'){
    if(!c.recordId){
      c.task='항원 확인';if(station(c,'lymph','helper:lymph',32,slot*18,dt)&&c.cooldown===0){
        const id=Object.keys(s.antigens).find(id=>s.antigens[id]);if(id){c.recordId=id;c.assignment=null;}
      }
    }else{
      c.task='방어 신호 전달';if(station(c,s.rally,'helper:'+s.rally,-26,slot*18,dt,64)){
        s.districts[s.rally].supportUntil=s.time+15;s.stats.signals++;c.recordId=null;c.assignment=null;c.cooldown=6;c.task='지원 신호 발신';beginActivity(s,c,'signal',.9,point(s.rally),s.rally);
      }
    }
    return true;
  }
  if(c.kind==='platelet'){
    const damaged=s.barrier<92?districtDef('lung'):DISTRICTS.filter(d=>s.districts[d.id].hp<92).sort((a,b)=>s.districts[a.id].hp-s.districts[b.id].hp)[0];
    if(damaged){
      const barrier=damaged.id==='lung'&&s.barrier<92;c.task='손상 부위 이동';
      if(station(c,damaged.id,'clot:'+damaged.id,barrier?85:24+slot*10,barrier?-48:28,dt,70)){
        c.task='응급 봉합';if(c.cooldown===0){if(barrier)s.barrier=clamp(s.barrier+.45);else s.districts[damaged.id].hp=clamp(s.districts[damaged.id].hp+.3);c.cooldown=2;s.stats.clots++;beginActivity(s,c,'patch',.85,{x:c.x+12,y:c.y},damaged.id);}
      }
    }else{
      const id=['heart','lung','marrow'][(Math.floor(s.time/18)+c.id)%3];c.task='봉합 순찰';station(c,id,'rest:'+id,12,slot*12,dt,52);
    }
    return true;
  }
  return false;
}
function updateCell(s,c,dt,speed,data){
  c.cooldown=Math.max(0,c.cooldown-dt);c.waitReason='';c.nextTask='';
  if(updateCombatCondition(s,c,dt,frontierAPI))return;
  if(s.specialists&&frontierCell(s,c,dt,frontierAPI))return;
  if(s.specialists&&['signal','shoot','engulf','collect'].includes(activeActivity(c,s.time)?.kind))return;
  if(s.specialists&&specialist(s,c,dt))return;
  if(c.kind==='rbc'){
    if(s.specialists){updateOxygen(s,c,dt,speed);return;}
    if(!move(c,speed*1.1,dt))return;
    if(c.cargo){const d=s.districts[c.target];d.oxygen=clamp(d.oxygen+c.cargo);s.stats.oxygen+=c.cargo;c.cargo=0;c.task='폐로 복귀';route(c,vascular(c.target,'lung'));}
    else {
      const inbound={};for(const other of s.cells)if(other.kind==='rbc'&&other.cargo)inbound[other.target]=(inbound[other.target]||0)+1;
      let best=null,bestScore=Infinity;for(const d of DISTRICTS)if(d.id!=='lung'){const score=s.districts[d.id].oxygen+(inbound[d.id]||0)*30;if(score<bestScore){best=d;bestScore=score;}}
      c.target=best.id;c.cargo=32*(1+(s.districts.lung.level-1)*.25)*output(s,'lung')*(s.weather.id==='dry'?.55:1);c.task=districtDef(c.target).short+' 산소 배송';route(c,vascular('lung',c.target));
    }return;
  }
  if(c.kind==='fibroblast'){
    // The 3D pilot assigns actual cells to construction. Existing cities retain
    // their original timed construction unless this saved option is enabled.
    if(s.workCrews){
      if(c.buildSite&&!s.districts[c.buildSite]?.building){c.buildSite=null;c.path=[];c.assignment=null;c.activity=null;}
      if(!c.buildSite){
        const site=DISTRICTS.filter(d=>s.districts[d.id].building&&!s.cells.some(other=>other!==c&&other.buildSite===d.id)).sort((a,b)=>dist(c,a)-dist(c,b))[0];
        if(site){releaseWorkplace(c);const from=DISTRICTS.reduce((a,b)=>dist(c,a)<dist(c,b)?a:b);c.buildSite=site.id;c.target=site.id;c.assignment=null;route(c,[point(from.id),...vascular(from.id,site.id),{x:site.x+25,y:site.y+38}]);}
      }
      if(c.buildSite){
        const work=workStation(c.buildSite,'build'),d=point(c.buildSite);
        const arrived=s.specialists?station(c,c.buildSite,'build:'+c.buildSite,work.stand.x-d.x,work.stand.y-d.y,dt,60):move(c,60,dt);c.task=!arrived?'공사장 이동':s.districts[c.buildSite].building.remaining==null?'자재 도착 대기':'시설 건설';
        c.nextTask='시설 완공 → 다음 작업';if(c.task==='자재 도착 대기')c.waitReason='시설 자재 배송 중';
        if(s.specialists){if(c.task==='시설 건설'){if(!activeActivity(c,s.time)||c.activity.kind!=='build')beginActivity(s,c,'build',.95,workStation(c.buildSite,'build').target,c.buildSite);}else c.activity=null;}
        return;
      }
    }
    if(s.specialists){updateCraftsman(s,c,dt);return;}
    if(c.path.length&& !move(c,46,dt))return;
    if(c.cooldown>0)return;
    const weakest=DISTRICTS.reduce((a,b)=>s.districts[a.id].hp<s.districts[b.id].hp?a:b);
    if(c.target===weakest.id&&s.districts[weakest.id].hp<98){s.districts[weakest.id].hp=clamp(s.districts[weakest.id].hp+(s.policy==='repair'?3.8:2));c.task='조직 복구';c.cooldown=2;}
    else if(s.resources.food>=1){s.resources.food-=.6;s.resources.materials=Math.min(300,s.resources.materials+1.4*output(s,'marrow')*(1+.2*(s.districts.marrow.level-1)));c.cooldown=4;c.task='자재 생산';}
    c.target=weakest.id;route(c,[{x:weakest.x+25*Math.sin(s.time+c.id),y:weakest.y+38}]);return;
  }
  if(c.kind==='dendritic'){
    if(c.recordId){c.task='림프절로 항원 운반';if(!c.path.length)route(c,[point('heart'),point('lymph')]);if(move(c,63,dt)){receiveAntigen(s,c.recordId,frontierAPI);log(s,'항원 도착 · 접수 진행');c.recordId=null;c.path=[];c.cooldown=10;}return;}
    const evidence=s.debris.find(e=>e.recordId&&!s.antigens[e.recordId])||s.enemies.find(e=>!e.dead&&!s.antigens[e.recordId])||antigenEvidence(s);
    if(evidence&&c.cooldown===0){c.task='항원 수집';route(c,[evidence]);if(move(c,65,dt)){c.recordId=evidence.recordId;c.path=[];}}
    else {c.task='감시';wander(s,c,dt);}return;
  }
  if(c.kind==='macrophage'&&s.debris.length&&(s.policy==='repair'||!s.enemies.some(e=>!e.dead&&dist(e,c)<80))){
    if(s.specialists&&activeActivity(c,s.time)?.kind==='collect')return;
    const debris=s.debris.reduce((a,b)=>dist(a,c)<dist(b,c)?a:b);c.task=debris.cellKind?'사멸 세포 수거':'잔해 청소';route(c,[debris]);if(move(c,60,dt)){cleanLocalDebris(s,debris);s.debris=s.debris.filter(e=>e.id!==debris.id);if(s.specialists)c.debrisCargo=(c.debrisCargo||0)+1;else{s.waste=clamp(s.waste-1.4);s.inflammation=clamp(s.inflammation-1.8);}c.cooldown=.8;if(s.specialists)beginActivity(s,c,'collect',.7,debris);}return;
  }
  const assigned=combatDestination(s,c),hold=s.biology?.order.mode==='hold';
  let target=null,nearest=Infinity;for(const e of s.enemies)if(!e.dead&&(!s.biology||!e.front||e.entered)&&(!hold||dist(e,assigned)<180)){const distance=(e.x-c.x)**2+(e.y-c.y)**2;if(distance<nearest){nearest=distance;target=e;}}
  if(target&&(dist(target,c)<(hold?160:240)||dist(target,assigned)<200)){
    c.task='감염 대응';const range=c.kind==='neutrophil'&&!s.biology?66:34;
    if(dist(c,target)>range){route(c,[target]);move(c,c.kind==='neutrophil'?82:56,dt);}
    else if(c.cooldown===0){
      const near=DISTRICTS.reduce((a,b)=>dist(c,a)<dist(c,b)?a:b),d=s.districts[near.id];
      const depot=frontDepot(s,c),supply=clamp(d.oxygen/45,.3,1)*((depot?depot.food:d.food)>0?1:.5),base=(c.kind==='macrophage'?8:4)*(s.policy==='defense'?1.3:1)*supply*(d.supportUntil>s.time?1.15:1);
      const support=s.biology&&target.entered?1+antibodySupport(s,target.recordId,near.id)*.85:1;
      damage(s,target,base*support*(s.biology?clamp(c.energy/65,.35,1):1),c,JOBS[c.kind].color);combatEffort(c);
      if(!s.biology&&c.kind==='neutrophil'&&(depot||d).ammo[s.drug]>=1&&drugActivity(data,target.recordId,s.drug).active){(depot||d).ammo[s.drug]--;damage(s,target,8,c,DRUGS.find(d=>d.id===s.drug).color);}
      if(s.specialists)beginActivity(s,c,c.kind==='macrophage'||s.biology?'engulf':'shoot',.55,target);
      c.cooldown=c.kind==='macrophage'?1.8:1.3;
    }
  }else{c.task='순찰';wander(s,c,dt);}
}
function updateOxygen(s,c,dt,speed){
  if(!c.dock&&!move(c,speed*1.1,dt))return;
  const site=c.cargo?c.target:'lung';c.dock=site;c.nextTask=c.cargo?'산소 하역 → 폐 복귀':'산소 충전 → 산소 배송';
  const dock=approachWorkplace(s,c,site,'oxygen',dt,move,route,speed*1.1);
  if(!dock.arrived){c.task=dock.ready?(c.cargo?'산소 하역대 이동':'산소 충전대 이동'):'산소 접안 대기';return;}
  if(!c.activity||!['load','unload'].includes(c.activity.kind)){beginActivity(s,c,c.cargo?'unload':'load',.75,dock.target,site);c.task=c.cargo?'산소 하역':'산소 충전';return;}
  if(activityProgress(c.activity,s.time)<1)return;
  if(c.cargo){const d=s.districts[c.target];d.oxygen=clamp(d.oxygen+c.cargo);s.stats.oxygen+=c.cargo;c.cargo=0;c.task='폐로 복귀';route(c,[point(c.target),...vascular(c.target,'lung')]);}
  else{
    const inbound={};for(const other of s.cells)if(other.kind==='rbc'&&other.cargo)inbound[other.target]=(inbound[other.target]||0)+1;
    const best=DISTRICTS.filter(d=>d.id!=='lung').sort((a,b)=>s.districts[a.id].oxygen+(inbound[a.id]||0)*30-s.districts[b.id].oxygen-(inbound[b.id]||0)*30)[0];
    c.target=best.id;c.cargo=32*(1+(s.districts.lung.level-1)*.25)*output(s,'lung')*(s.weather.id==='dry'?.55:1);c.task=best.short+' 산소 배송';route(c,[point('lung'),...vascular('lung',c.target)]);
  }
  c.activity=null;c.dock=null;releaseWorkplace(c);
}
function updateCraftsman(s,c,dt){
  if(['repair','fabricate'].includes(activeActivity(c,s.time)?.kind))return;
  if(c.activity&&['repair','fabricate'].includes(c.activity.kind)){c.activity=null;releaseWorkplace(c);}
  const current=c.assignment?.startsWith('craft:')&&s.districts[c.target].hp<98?districtDef(c.target):null;
  const assigned=id=>s.cells.filter(other=>other!==c&&other.kind==='fibroblast'&&other.target===id).length;
  const weak=current||DISTRICTS.filter(d=>s.districts[d.id].hp<98).sort((a,b)=>s.districts[a.id].hp+assigned(a.id)*8-s.districts[b.id].hp-assigned(b.id)*8)[0];
  const id=weak?.id||'marrow',kind=weak?'repair':'fabricate';c.target=id;c.assignment='craft:'+id+':'+kind;c.nextTask=weak?'조직 복구':'자재 생산';
  const work=approachWorkplace(s,c,id,kind,dt,move,route,56);
  if(!work.arrived){c.task=work.ready?(weak?'복구 현장 이동':'자재 작업대 이동'):'작업대 대기';c.activity=null;return;}
  c.task=weak?'복구 준비':s.resources.food>=1?'자재 작업대':'영양분 대기';
  if(c.cooldown>0){c.waitReason='공구 정비 중';return;}
  if(!weak&&s.resources.food<1)c.waitReason='중앙 영양분 부족';
  if(weak){s.districts[id].hp=clamp(s.districts[id].hp+(s.policy==='repair'?3.8:2));c.cooldown=2;c.task='조직 복구';}
  else if(s.resources.food>=1){s.resources.food-=.6;s.resources.materials=Math.min(300,s.resources.materials+1.4*output(s,'marrow')*(1+.2*(s.districts.marrow.level-1)));c.cooldown=4;c.task='자재 생산';}
  else return;
  beginActivity(s,c,kind,.95,work.target,id);
}
function updateShipment(s,sh,dt,speed){
  if(!s.specialists){if(move(sh,speed,dt)){delivery(s,sh);return true;}return false;}
  sh.waitReason='';sh.nextTask=sh.phase==='pickup'?'물자 적재 → 배송':sh.phase==='leaving'?'운반 종료':'현장 하역';
  sh.phase||='transit';
  if(sh.phase==='leaving')return move(sh,speed,dt);
  if(!sh.workplace&&!move(sh,speed,dt))return false;
  const pickup=sh.phase==='pickup',site=pickup?'gut':sh.to;
  if(pickup&&sh.frontDelivery?.type==='depot'&&!sh.prepared){
    if(!sh.staged){releaseWorkplace(sh);const slot=['skin','airway','gut'].indexOf(sh.frontDelivery.id)*3+['food','materials','drug'].indexOf(sh.kind);route(sh,[groundCoordinate({x:SITES.gut.x+3.5+(slot%3)*.85,z:SITES.gut.z+2+Math.floor(slot/3)*.85})]);sh.staged=true;}
    move(sh,speed,dt);sh.waitReason='보급 출고 인력 작업 중';return false;
  }
  const dock=approachWorkplace(s,sh,site,'dock',dt,move,route,speed,pickup?null:frontierDestination(sh));
  if(!dock.arrived)return false;
  if(!sh.activity){beginActivity(s,sh,pickup?'load':'unload',.85,dock.target,site);return false;}
  if(activityProgress(sh.activity,s.time)<1)return false;
  sh.activity=null;releaseWorkplace(sh);
  if(pickup){sh.phase='transit';route(sh,[point('gut'),...vascular('gut',sh.to),frontierDestination(sh)||point(sh.to)]);}
  else{delivery(s,sh);sh.phase='leaving';route(sh,[point(sh.to)]);}
  return false;
}
function wander(s,c,dt){
  const destination=s.biology&&['neutrophil','macrophage'].includes(c.kind)?combatDestination(s,c):point(s.rally);
  if(!c.path.length||c.step>=c.path.length){const d=destination,phase=s.time*.19+c.id*2.4;route(c,[{x:d.x+Math.cos(phase)*95,y:d.y+Math.sin(phase)*60+25}]);}
  move(c,35,dt);
}
export function tickCity(s,dt,data){
  if(s.status!=='running'||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.25);s.time+=dt;
  if(s.weather.until<=s.time)s.weather={id:'clear',until:0};
  if(s.scenario!=='simulation'&&s.wave<3&&s.time>=s.nextWave&&!s.enemies.length&&!s.spawn.length)startWave(s);
  s.spawnClock-=dt;
  if(s.spawn.length&&s.spawnClock<=0){s.enemies.push(spawnAtFront(s,{...s.spawn.shift(),id:++s.serial,x:ENTRANCE.x+(s.serial%3)*8,y:ENTRANCE.y+(s.serial%4)*8,dead:false}));s.spawnClock=1.8;}
  if(s.frontier)tickFrontier(s,dt,frontierAPI);
  tickBiology(s,dt,data,frontierAPI);
  const fever=s.weather.id==='fever',speed=(85+(s.districts.heart.level-1)*19)*output(s,'heart')*clamp(1-s.waste/180,.4,1);
  s.intakeClock-=dt;if(s.intakeClock<=0){if(!s.specialists||s.shipments.length<48)s.shipments.push({id:++s.serial,kind:'raw',from:'outside',to:'gut',amount:16+s.districts.gut.level*6,...FOOD_ENTRY,path:FOOD_ROAD.map(p=>({...p})),step:0});s.intakeClock=8;}
  const processed=Math.min(s.rawFood,dt*1.8*(1+.35*(s.districts.gut.level-1))*output(s,'gut')*(s.frontier?.gut.quarantine?.55:1));
  s.rawFood-=processed;s.resources.food=Math.min(400,s.resources.food+processed);
  s.waste=clamp(s.waste+dt*(.24+(fever?.2:0)+s.enemies.length*.012-.36*(1+.45*(s.districts.kidney.level-1))*output(s,'kidney')));
  s.inflammation=clamp(s.inflammation-dt*.12);
  s.barrier=clamp(s.barrier+dt*.35*s.districts.lung.level);
  for(const def of DISTRICTS){
    const d=s.districts[def.id];
    d.oxygen=clamp(d.oxygen+dt*(def.id==='lung'?10:-1.35-(fever?.55:0)));
    d.food=Math.max(0,d.food-dt*.12);
    const stress=(d.oxygen<15?.7:0)+(d.food<=0?.25:0)+(s.waste>65?.35:0)+(s.inflammation>65?.3:0);
    d.hp=clamp(d.hp+dt*(stress?-stress:d.hp>0?.025:0));
    if(d.building?.remaining!=null&&(!s.workCrews||s.cells.some(c=>c.buildSite===def.id&&c.task==='시설 건설'))){d.building.remaining-=dt*output(s,def.id);if(d.building.remaining<=0){const type=d.building.type;if(type==='upgrade')d.level++;if(type==='tower')d.tower++;if(type==='repair'){d.hp=clamp(d.hp+45);if(def.id==='lung')s.barrier=clamp(s.barrier+55);}if(s.frontier)completeInvestment(s,def.id,d.building);d.building=null;log(s,def.short+' '+({upgrade:'시설 확장',tower:'방어 초소 건설',repair:'복구',plot:'증설'}[type])+' 완료');}}
    if(d.tower&&s.enemies.length){d.shot=(d.shot||0)-dt;const enemy=s.enemies.find(e=>!e.dead&&(!s.biology||!e.front||e.entered)&&dist(e,def)<175);if(enemy&&d.shot<=0){damage(s,enemy,4*d.tower*output(s,def.id),def,'#f1c67c');d.shot=1.2;}}
  }
  s.supplyClock-=dt;s.drugClock-=dt;
  if(s.supplyClock<=0){
    const targets=DISTRICTS.filter(d=>s.districts[d.id].food<22+supportCount(s,d.id,'supply')*8&&!s.shipments.some(x=>x.kind==='food'&&x.to===d.id)).sort((a,b)=>s.districts[a.id].food-s.districts[b.id].food);
    const t=targets[0],amount=6+s.districts.gut.level*2+(t?supportCount(s,t.id,'supply')*4:0);
    if(t&&s.resources.food>=amount&&(!s.specialists||s.shipments.length<48)){s.resources.food-=amount;shipment(s,'food',t.id,amount);}s.supplyClock=2.5;
  }
  if(s.drugClock<=0){
    const d=s.districts[s.rally],drug=DRUGS.find(d=>d.id===s.drug);
    if(s.biology){if(s.biology.autoMedicine&&s.districts.heart.ammo[s.drug]<10&&!s.shipments.some(x=>x.kind==='drug'&&x.drugId===s.drug&&x.phase!=='leaving'))medicineOrder(s,s.drug,'iv',1,frontierAPI);}
    else if(d.ammo[s.drug]<18&&!s.shipments.some(x=>x.kind==='drug'&&x.to===s.rally&&x.drugId===s.drug)&&s.resources.food>=drug.cost&&(!s.specialists||s.shipments.length<48)){s.resources.food-=drug.cost;shipment(s,'drug',s.rally,18,{drugId:s.drug});}
    s.drugClock=4;
  }
  s.shipments=s.shipments.filter(sh=>!updateShipment(s,sh,dt,speed));
  for(const r of [...s.recruits])if(r.remaining!=null){r.remaining-=dt*output(s,'marrow');if(r.remaining<=0){const spawn=s.specialists?workStation('marrow','spawn',r.bay||0).stand:{x:279,y:583};const born=cell(s,r.kind,spawn.x,spawn.y);born.bornAt=s.time;s.stats.born++;s.recruits=s.recruits.filter(x=>x.id!==r.id);log(s,CELL_JOBS[r.kind].name+' · 골수에서 출동');}}
  if(s.lifecycle){
    for(const c of s.cells)c.age+=dt;
    const retired=s.cells.filter(c=>c.age>=c.life);
    for(const c of retired){s.turnover[c.kind]=(s.turnover[c.kind]||0)+1;s.stats.retired++;}
    if(retired.length){s.cells=s.cells.filter(c=>c.age<c.life);log(s,retired.length+'개 세포 수명 종료 · 골수 보충 대기');}
    if(s.recruits.length<3)for(const [kind,count] of Object.entries(s.turnover))if(count>0){
      if(counts(s,kind)+s.recruits.filter(r=>r.kind===kind).length>=cellCap(s,kind)){s.turnover[kind]=0;continue;}
      if(s.specialists&&s.cells.length+s.recruits.length>=96)break;
      if(s.districts.marrow.food>=4){s.districts.marrow.food-=4;s.turnover[kind]--;s.recruits.push({id:++s.serial,kind,remaining:s.host==='neutropenia'&&kind==='neutrophil'?22:8,automatic:true});}break;
    }
  }
  if(!s.specialists)for(const id of Object.keys(s.antigens))s.antibodies[id]=clamp((s.antibodies[id]||0)+dt*1.5*(1+.4*(s.districts.lymph.level-1))*output(s,'lymph'));
  for(const e of s.enemies){
    if(e.dead)continue;
    if(s.frontier&&tickFrontierEnemy(s,e,dt,frontierAPI)){if(!s.biology&&!e.dead&&(s.antibodies[e.recordId]||0)>=100)damage(s,e,dt*1.3,e,'#c6df9c');continue;}
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
  if(s.biology){for(const c of s.cells.filter(c=>c.lost)){s.biology.stats.losses++;s.debris.push({id:++s.serial,x:c.x,y:c.y,recordId:null,cellKind:c.kind});log(s,CELL_JOBS[c.kind].name+' · 사멸');}s.cells=s.cells.filter(c=>!c.lost);}
  s.enemies=s.enemies.filter(e=>!e.dead);s.debris=s.debris.slice(-80);
  s.effects=s.effects.filter(e=>(e.life-=dt)>0);
  const preset=SCENARIOS[s.scenario];
  if(s.scenario==='simulation')return;
  if(s.districts.heart.hp<=0||cityHealth(s)<22){s.status='lost';s.endReason='도시 기능 정지';}
  else if(!s.endless&&preset){
    if(preset.kind==='hold'){
      s.breach=cityHealth(s)<preset.health||s.waste>preset.waste?s.breach+dt:0;
      if(s.breach>=15){s.status='lost';s.endReason='유지 기준 이탈';}
      else if(s.time>=preset.duration&&s.breach===0)s.status='won';
    }else{
      const restored=s.wave>=3&&!s.spawn.length&&!s.enemies.length&&localInfection(s)<1&&Object.values(s.districts).every(d=>d.hp>=preset.health)&&s.waste<=preset.waste&&(!s.biology||Object.values(s.biology.sites).every(d=>d.inflammation<8&&d.toxin<2));
      s.recovered=restored?s.recovered+dt:0;
      if(s.recovered>=15)s.status='won';
      else if(s.time>=preset.duration){s.status='lost';s.endReason='복구 제한 시간 초과';}
    }
  }else if(s.wave>=3&&!s.spawn.length&&!s.enemies.length&&!s.endless)s.status='won';
  if(s.status!=='running')log(s,s.status==='won'?'시나리오 목표 달성':s.endReason);
}
export function serializeCity(s){return JSON.stringify({...s,effects:[],nextWave:Number.isFinite(s.nextWave)?s.nextWave:null});}
export function restoreCity(raw){
  try{
    const s=typeof raw==='string'?JSON.parse(raw):raw;
    if(!s||s.schema!==SAVE_VERSION||!['running','won','lost'].includes(s.status)||!['normal','neutropenia'].includes(s.host))return null;
    if(!Number.isFinite(s.time)||s.time<0||!Number.isInteger(s.serial)||!Number.isInteger(s.wave)||s.wave<0||!['balanced','defense','repair'].includes(s.policy)||!districtDef(s.rally)||!DRUGS.some(d=>d.id===s.drug))return null;
    const finite=(v,max=1e7)=>Number.isFinite(v)&&v>=0&&v<=max;
    if(!finite(s.resources?.food,400)||!finite(s.resources?.materials,300)||!finite(s.waste,100)||!finite(s.inflammation,100)||!finite(s.barrier,100))return null;
    for(const def of DISTRICTS){const d=s.districts?.[def.id];if(!d||!finite(d.hp,100)||!finite(d.oxygen,100)||!finite(d.food,56)||!Number.isInteger(d.level)||d.level<1||d.level>4||!finite(d.tower,2)||DRUGS.some(x=>!finite(d.ammo?.[x.id],200)))return null;if(d.building&&(!['upgrade','repair','tower','plot'].includes(d.building.type)||!finite(d.building.duration,10)||d.building.remaining!=null&&!finite(d.building.remaining,10)))return null;}
    for(const k of ['cells','shipments','enemies','debris','recruits','log','spawn'])if(!Array.isArray(s[k])||s[k].length>200)return null;
    for(const c of [...s.cells,...s.shipments])if(!Number.isFinite(c.x)||!Number.isFinite(c.y)||!Array.isArray(c.path)||c.path.length>64||c.path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||!Number.isInteger(c.step)||c.step<0||c.step>c.path.length)return null;
    s.specialists??=false;if(typeof s.specialists!=='boolean')return null;
    if(s.cells.some(c=>!cityJobs(s)[c.kind]||!districtDef(c.target)||!finite(c.cooldown)||!finite(c.cargo)))return null;
    if(s.shipments.some(c=>!districtDef(c.to)||!['raw','food','drug','materials','recruit'].includes(c.kind)||!finite(c.amount)||c.kind==='drug'&&!DRUGS.some(d=>d.id===c.drugId)))return null;
    for(const c of [...s.cells,...s.shipments]){
      const a=c.activity;if(a&&(!ACTIVITY_KINDS.includes(a.kind)||!finite(a.started)||a.started>s.time||!finite(a.duration,4)||a.duration===0||!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.site!=null&&!districtDef(a.site)))return null;
      if(c.workSlot!=null&&(!Number.isInteger(c.workSlot)||!finite(c.workSlot,5))||c.dock!=null&&!districtDef(c.dock))return null;
      if(c.kind==='plasma'&&a?.kind==='produce'&&(typeof c.recordId!=='string'||!s.antigens?.[c.recordId]))return null;
    }
    if(s.shipments.some(sh=>sh.phase!=null&&!['pickup','transit','leaving'].includes(sh.phase)))return null;
    if(s.enemies.some(e=>!Number.isFinite(e.x)||!Number.isFinite(e.y)||!finite(e.hp)||!pathogenDef(e.recordId)||e.site!=null&&!districtDef(e.site)))return null;
    if(s.spawn.some(e=>!pathogenDef(e.recordId)||!finite(e.hp)||!finite(e.maxHp)))return null;
    if(s.recruits.some(r=>!cityJobs(s)[r.kind]||r.remaining!=null&&!finite(r.remaining)))return null;
    if(s.debris.some(e=>!Number.isFinite(e.x)||!Number.isFinite(e.y)||!pathogenDef(e.recordId)&&!(e.recordId===null&&['neutrophil','macrophage'].includes(e.cellKind))))return null;
    if(s.log.some(l=>!finite(l.time)||typeof l.text!=='string'||l.text.length>300))return null;
    if(!s.antigens||!s.antibodies||!s.stats||!s.weather||!['clear','dry','fever'].includes(s.weather.id)||!finite(s.weather.until)||!Number.isFinite(s.supplyClock)||!Number.isFinite(s.drugClock)||!Number.isFinite(s.spawnClock))return null;
    if(['defeated','deliveries','oxygen'].some(k=>!finite(s.stats[k]))||Object.values(s.antibodies).some(v=>!finite(v,100)))return null;
    s.scenario??='legacy';if(s.scenario!=='legacy'&&!SCENARIOS[s.scenario])return null;
    s.workCrews??=false;if(typeof s.workCrews!=='boolean'||s.cells.some(c=>c.buildSite&&!districtDef(c.buildSite)))return null;
    s.lifecycle??=false;s.turnover??={};s.rawFood??=24;s.intakeClock??=0;s.breach??=0;s.recovered??=0;s.endReason??='';s.stats.born??=0;s.stats.retired??=0;
    if(typeof s.lifecycle!=='boolean'||!finite(s.rawFood,80)||!finite(s.breach,16)||!finite(s.recovered,16)||!Number.isFinite(s.intakeClock)||typeof s.endReason!=='string'||!finite(s.stats.born)||!finite(s.stats.retired)||!s.turnover||Array.isArray(s.turnover)||Object.entries(s.turnover).some(([k,v])=>!cityJobs(s)[k]||!Number.isInteger(v)||!finite(v,200)))return null;
    for(const key of ['signals','antibodyBatches','clots']){s.stats[key]??=0;if(!finite(s.stats[key]))return null;}
    for(const d of Object.values(s.districts))if(d.supportUntil!=null&&!finite(d.supportUntil))return null;
    for(const c of s.cells){c.age??=0;c.life??=CELL_JOBS[c.kind].life;if(!finite(c.age,2000)||!finite(c.life,2000)||c.life<=0)return null;}
    if(!validateFrontier(s)||!validateBiology(s))return null;
    s.nextWave=s.nextWave??Infinity;s.effects=[];return s;
  }catch{return null;}
}
