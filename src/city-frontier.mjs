import {CITY_ENTRIES,CITY_CAPS,shipmentLimit,pathogenLimit,travelScale} from './city-world.mjs';
import {cityDistricts,cityDistrict,localPoint,siteAt,tissueAt,tissuePresent,depotAt,compileLayout} from './city-tile-layout.mjs';
import {DISTRICTS,DRUGS,WAVES,districtDef} from './city-data.mjs';
import {groundPoint,groundCoordinate,SITES} from './city-three-layout.mjs';
import {WALLS,WALL_COVERAGE,FRONTS,WORKSHOP,AIRWAY_PATH,TISSUES,INVESTMENTS,supportCount,districtName,wallState} from './city-frontier-data.mjs';
import {beginActivity,activeActivity,activityProgress,workStation} from './city-activity.mjs';
import {approachWorkplace,releaseWorkplace,facilityState} from './city-workplaces.mjs';
import {infectionLoad,STAGES,pathogenDef} from './city-biology.mjs';
import {pathogenTarget,validatePathogenTarget} from './city-pathogens.mjs';

const clamp=(n,hi=100)=>Math.max(0,Math.min(hi,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(s,id)=>{const d=cityDistrict(s,id);return {x:d.x,y:d.y};};
const shop=s=>localPoint(s,'workshop',{x:WORKSHOP.x+1.1,z:WORKSHOP.z+.5});
export function ensureFrontier(s){
 if(!s.specialists||s.frontier)return;
 s.frontier={version:1,walls:WALLS.map(w=>({hp:100,repair:null,warningUntil:0})),plots:Object.fromEntries(DISTRICTS.map(d=>[d.id,[]])),depots:Object.fromEntries(Object.keys(FRONTS).map(id=>[id,{food:6,materials:0,ammo:{ampicillin:4,oxacillin:0,vancomycin:0}}])),airway:{mucus:0,cleared:0,boostUntil:0},gut:{quarantine:false},waste:{stock:0,processed:0},inbox:[],tissues:TISSUES.map(t=>({hp:100})),woundAt:s.time+70,woundId:11,woundDone:false,warned:false,supplyClock:10};
 s.frontier.rimVersion=1;s.workTicket??=0;
}
export function wallMaximum(s,id){return 100+DISTRICTS.reduce((n,d)=>n+(WALL_COVERAGE[d.id].includes(id)?supportCount(s,d.id,'barrier')*35:0),0);}
export function frontierDestination(sh,s){
 const d=sh.frontDelivery;if(!d)return null;
 const p=d.type==='wall'?WORKSHOP:FRONTS[d.id].depot;
 return localPoint(s,d.type==='wall'?'workshop':d.id==='skin'?'workshop':d.id==='airway'?'lung':'gut',{x:p.x+1.1,z:p.z+.5});
}
export function deliverFrontier(s,sh){
 const job=sh.frontDelivery;if(!job)return false;
 if(job.type==='wall'){
  const repair=s.frontier.walls[job.id]?.repair;
  if(repair)repair.materials=true;else s.frontier.depots.skin.materials=clamp(s.frontier.depots.skin.materials+sh.amount,40);
 }else{
  const d=s.frontier.depots[job.id];if(sh.kind==='drug')d.ammo[sh.drugId]=clamp(d.ammo[sh.drugId]+sh.amount,60);else d[sh.kind]=clamp(d[sh.kind]+sh.amount,40);
 }
 s.stats.deliveries++;return true;
}
function repairOrder(s,id,api){
 const w=s.frontier.walls[id];if(!w)return {ok:false};
 if(w.repair)return {ok:false,text:'보수 진행 중'};
 if(w.hp>=wallMaximum(s,id))return {ok:false,text:'장벽 정상'};
 const stock=s.frontier.depots.skin,local=stock.materials>=8;
 if(!local&&s.resources.materials<8)return {ok:false,text:'복구 자재 8 부족'};
 if(!local&&s.shipments.length>=shipmentLimit(s))return {ok:false,text:'물류 대기열 포화'};
 if(local)stock.materials-=8;else s.resources.materials-=8;
 w.repair={remaining:7,materials:local,delivered:false,assignee:null};
 if(!local)api.shipment(s,'materials','marrow',8,{frontDelivery:{type:'wall',id}});
 api.log(s,WALLS[id].name+' · 보수 주문');return {ok:true,text:local?'보수 인력 배정':'복구 자재 배송 중'};
}
function supplyOrder(s,id,api){
 const front=FRONTS[id];if(!front)return {ok:false};
 const depot=s.frontier.depots[id],cap=12+supportCount(s,front.district,'supply')*8;
 let sent=0;
 for(const kind of ['food','materials','drug']){
  if(kind==='drug'&&s.biology)continue;
  if(s.shipments.length>=shipmentLimit(s))break;
  if(s.shipments.some(sh=>sh.frontDelivery?.type==='depot'&&sh.frontDelivery.id===id&&sh.kind===kind&&(kind!=='drug'||sh.drugId===s.drug)))continue;
  const stock=kind==='drug'?depot.ammo[s.drug]:depot[kind];if(stock>=cap*.65)continue;
  const amount=Math.min(8,cap-stock),cost=kind==='drug'?DRUGS.find(d=>d.id===s.drug).cost:amount,resource=kind==='materials'?'materials':'food';
  if(s.resources[resource]<cost)continue;
  s.resources[resource]-=cost;api.shipment(s,kind,front.district,amount,{drugId:kind==='drug'?s.drug:undefined,frontDelivery:{type:'depot',id}});sent++;
 }
 if(sent)api.log(s,front.name+' 전선 · 보급 '+sent+'건 출고');
 return {ok:sent>0,text:sent?'전선 보급 출발':'재고 충분 · 배송 중 또는 중앙 자원 부족'};
}
export function frontierCommand(s,action,id,api){
 if(!s.frontier)return null;
 if(action==='wall-repair')return repairOrder(s,Number(id),api);
 if(action==='front-supply')return supplyOrder(s,id,api);
 if(action==='airway-clear'){
  if(s.frontier.airway.boostUntil>s.time)return {ok:false,text:'섬모 배출 강화 중'};
  if(s.resources.food<4)return {ok:false,text:'영양분 4 부족'};
  s.resources.food-=4;s.frontier.airway.boostUntil=s.time+15;api.log(s,'호흡기 · 섬모 배출 강화');return {ok:true};
 }
 if(action==='gut-quarantine'){s.frontier.gut.quarantine=!s.frontier.gut.quarantine;api.log(s,'소화기 · 식재료 검역 '+(s.frontier.gut.quarantine?'ON':'OFF'));return {ok:true};}
 if(action==='skin-wound'){
  const index=Number(id);if(!WALLS[index])return {ok:false};
  if(s.enemies.length+s.spawn.length>pathogenLimit(s)-4)return {ok:false,text:'현재 감염 대응 중'};
  openWound(s,index,api);return {ok:true};
 }
 if(action==='invest'){
  const [site,kind]=id.split(':'),choice=INVESTMENTS[kind],d=s.districts[site];if(!choice||!d)return {ok:false};
  if(d.building)return {ok:false,text:'시설 작업 진행 중'};
  if(s.frontier.plots[site].length>=2)return {ok:false,text:'증설 자리 2칸 사용 중'};
  if(s.resources.materials<choice.cost)return {ok:false,text:'건축 자재 부족'};
  s.resources.materials-=choice.cost;d.building={type:'plot',choice:kind,duration:9,remaining:null};api.shipment(s,'materials',site,choice.cost);return {ok:true,text:choice.name+' 자재 배송 중'};
 }
 return null;
}
export function completeInvestment(s,id,building){
 if(building.type!=='plot')return;
 s.frontier.plots[id].push(building.choice);
 if(building.choice==='barrier')for(const [i,w] of s.frontier.walls.entries())if(WALL_COVERAGE[id].includes(i)&&w.hp>0)w.hp=Math.min(wallMaximum(s,i),w.hp+35);
}
function openWound(s,id,api){
 const f=s.frontier,w=f.walls[id];w.hp=0;w.warningUntil=s.time+20;
 const source=WAVES[1];for(let n=0;n<3;n++)s.spawn.push({recordId:source.recordId,hp:source.hp,maxHp:source.hp,color:source.color,tag:source.tag,front:'skin',wall:id});
 api.log(s,WALLS[id].name+' 파손 · 보수 필요');
}
export function assignFronts(s){
 if(!s.frontier)return;
 const variety=[['SPN-105','SPN-105','GNX-225','KPN-011'],['SAU-001','SPY-101','SAU-001','CPE-122'],['SAU-002','PAE-013','GNX-220','CDF-121']][Math.min(2,Math.max(0,s.wave-1))];
 s.spawn.forEach((e,i)=>{
  const p=pathogenDef(variety[i%variety.length]);Object.assign(e,{recordId:p.recordId,hp:p.hp,maxHp:p.hp,color:p.color,tag:p.tag});
  const preferred=s.wave===1?'airway':s.wave===2?'skin':['airway','skin','gut'][i%3];e.front=p.routes.includes(preferred)?preferred:p.routes[0];
  if(e.front==='skin'){e.wall=(s.wave*4+Math.floor(i/3))%WALLS.length;s.frontier.walls[e.wall].warningUntil=s.time+30;}
 });
}
export function spawnAtFront(s,e){
 if(!s.frontier)return e;
 e.front||='airway';if(e.front==='skin')e.wall??=11;
 const p=e.front==='blood'?point(s,'heart'):e.front==='skin'?WALLS[e.wall??11].outside:e.front==='gut'?groundCoordinate(CITY_ENTRIES.gut.start):AIRWAY_PATH[0];
 if(e.front==='blood'){e.entered=true;e.site='heart';}
 if(s.enemies.length+s.spawn.length>=64){
  const world=groundPoint(p),a=e.id*2.399963229728653,lane=(e.id%7-3)*.27;
  const offset=e.front==='blood'?{x:Math.cos(a)*(1.5+e.id%5*.3),z:Math.sin(a)*(1.5+e.id%5*.3)}:e.front==='airway'?{x:lane,z:0}:e.front==='gut'?{x:0,z:lane}:{x:-WALLS[e.wall].nz*lane,z:WALLS[e.wall].nx*lane};
  Object.assign(e,groundCoordinate({x:world.x+offset.x,z:world.z+offset.z}));
 }else Object.assign(e,{x:p.x+(e.id%2)*3,y:p.y+(e.id%3)*3});return e;
}
function walk(e,p,speed,dt){const d=distance(e,p);if(d<=speed*dt){e.x=p.x;e.y=p.y;return true;}e.x+=(p.x-e.x)/d*speed*dt;e.y+=(p.y-e.y)/d*speed*dt;return false;}
function entryWalk(s,e,front,speed,dt){if(!s.layout)return walk(e,front==='gut'?point(s,'gut'):AIRWAY_PATH.at(-1),speed,dt);const path=compileLayout(s.layout).entries[front];e.entryStep??=front==='airway'?3:1;const target=path[Math.min(e.entryStep,path.length-1)];if(walk(e,groundCoordinate(target),speed,dt))e.entryStep++;return e.entryStep>=path.length;}
export function tickFrontierEnemy(s,e,dt,api){
 const f=s.frontier;if(!f||!e.front)return false;
 if(e.front==='skin'&&!e.entered){
  e.action='breach';
  const def=WALLS[e.wall],w=f.walls[e.wall];
  if(w.hp>0){if(walk(e,def.outside,24,dt)){w.hp=clamp(w.hp-dt*2.6,wallMaximum(s,e.wall));if(w.hp===0)api.log(s,def.name+' 파손 · 침입 가능');}return true;}
  walk(e,def.inside,28,dt);const p=groundPoint(e);
  if((p.x-def.x)*def.nx+(p.z-def.z)*def.nz<-.1)e.entered=true;
  return true;
 }
 if(e.front==='airway'&&!e.entered){
  e.action=e.expelled?'expelled':e.caughtUntil?'trapped':'approach';
  if(e.expelled){if(walk(e,AIRWAY_PATH[0],65,dt)){f.airway.cleared++;api.damage(s,e,e.hp,e,'#9bc9bb');}return true;}
  if(e.caughtUntil){if(s.time>=e.caughtUntil){e.expelled=true;e.caughtUntil=null;}return true;}
  if(!e.screened){if(!walk(e,AIRWAY_PATH[2],24,dt))return true;e.screened=true;
   const cap=Math.max(1,Math.floor((3+s.districts.lung.level)*s.barrier/100*(s.weather.id==='dry'?.5:1)));
   if(f.airway.mucus<cap){f.airway.mucus++;e.caughtUntil=s.time+(f.airway.boostUntil>s.time?.7:2.4);return true;}
  }
  if(entryWalk(s,e,'airway',22,dt))e.entered=true;
  s.barrier=clamp(s.barrier-dt*.15);return true;
 }
 if(e.front==='gut'&&!e.entered){
  e.action='approach';
  if(f.gut.quarantine){api.damage(s,e,dt*4,e,'#d7bd79');if(e.dead)return true;}
  if(entryWalk(s,e,'gut',f.gut.quarantine?12:24,dt))e.entered=true;return true;
 }
 const target=pathogenTarget(s,e),profile=pathogenDef(e.recordId);
 if(e.attackTarget?.kind!==target.kind||e.attackTarget?.id!==target.id||e.attackX!==target.point.x||e.attackY!==target.point.y){
  e.attackTarget={kind:target.kind,id:target.id};e.attackX=target.point.x;e.attackY=target.point.y;e.site=target.site;
  const length=distance(e,target.point)||1,stand={x:target.point.x+(e.x-target.point.x)/length*12,y:target.point.y+(e.y-target.point.y)/length*12};
  if(api.route)api.route(e,[stand]);else e.attackStand=stand;
 }
 e.action='approach';
 if(api.move?!api.move(e,16*travelScale(s),dt):!walk(e,e.attackStand||target.point,16,dt))return true;
 e.action='attack';api.seed?.(s,e,target.site,dt);
 const rate=profile?.damage??.65,organ=s.districts[target.site];
 if(target.kind==='tissue'){
  f.tissues[target.id].hp=clamp(f.tissues[target.id].hp-dt*rate*(profile?.anaerobic&&organ.oxygen<40?1.6:1));
  if(profile?.localSpread)for(const t of TISSUES)if(t.id!==target.id&&tissuePresent(s,t)&&distance(tissueAt(s,t).point,target.point)<300)f.tissues[t.id].hp=clamp(f.tissues[t.id].hp-dt*rate*.2);
 }else organ.hp=clamp(organ.hp-dt*rate);
 if(target.site==='lung'&&profile?.oxygen){organ.oxygen=clamp(organ.oxygen-dt*profile.oxygen);s.barrier=clamp(s.barrier-dt*profile.oxygen*.3);}
 s.inflammation=clamp(s.inflammation+dt*.12*(profile?.inflammation||1));return true;
}
export function receiveAntigen(s,id,api){
 if(!s.frontier){s.antigens[id]=true;return;}
 if(s.antigens[id]||s.frontier.inbox.some(x=>x.recordId===id))return;
 s.frontier.inbox.push({recordId:id,remaining:4,stage:'접수'});api.log(s,'림프절 · 항원 접수');
}
export function frontierCell(s,c,dt,api){
 const f=s.frontier;if(!f)return false;
 if(c.kind==='platelet')return patchSkin(s,c,dt,api);
 if(c.kind==='macrophage'&&c.debrisCargo>0&&(c.debrisCargo>=3||!s.debris.length||c.wasteTrip)){
  if(activeActivity(c,s.time)?.kind==='collect')return true;
  c.wasteTrip=true;c.target='kidney';c.nextTask='집하장 하역 → 여과 처리';
  const bay=approachWorkplace(s,c,'kidney','waste',dt,api.move,api.route,60);
  c.task=bay.arrived?'잔해 하역':'잔해 집하장 이동';if(!bay.arrived)return true;
  if(f.waste.stock+c.debrisCargo>24){c.task='집하장 대기';c.waitReason='잔해 처리 적체';return true;}
  if(c.activity?.kind!=='unload'){beginActivity(s,c,'unload',.8,bay.target,'kidney');return true;}
  if(activityProgress(c.activity,s.time)<1)return true;
  f.waste.stock+=c.debrisCargo;c.debrisCargo=0;c.wasteTrip=false;c.activity=null;c.path=[];c.step=0;releaseWorkplace(c);return true;
 }
 if(c.kind!=='fibroblast'||c.buildSite)return false;
 if(c.logisticsJob!=null)return prepareSupply(s,c,dt,api);
 let wall=c.frontJob==null?null:f.walls[c.frontJob];
 if(wall&&!wall.repair){c.frontJob=null;c.frontStage=null;c.materialCargo=0;c.path=[];c.step=0;wall=null;}
 if(!wall){const index=f.walls.findIndex(w=>w.repair&&w.repair.assignee==null);if(index<0)return repairTissue(s,c,dt,api)||prepareSupply(s,c,dt,api);if(c.tissueJob!=null){c.tissueJob=null;c.activity=null;}c.frontJob=index;wall=f.walls[index];wall.repair.assignee=c.id;c.frontStage=wall.repair.delivered?'field':'shop';c.assignment=null;releaseWorkplace(c);api.route(c,[wall.repair.delivered?WALLS[index].inside:shop(s)]);}
 const def=WALLS[c.frontJob],repair=wall.repair;c.target=def.district;c.nextTask=c.frontStage==='shop'?'자재 운반 → 장벽 보수':'장벽 보수 → 공방 복귀';
 if(c.frontStage==='shop'){
  c.task='피부 보수 공방 이동';if(!api.move(c,62*travelScale(s),dt))return true;
  if(!repair.materials){c.task='복구 자재 대기';c.waitReason='공방으로 자재 배송 중';return true;}
  c.materialCargo=8;c.frontStage='field';api.route(c,[def.inside]);
 }
 if(c.frontStage==='field'){
  c.task='장벽 자재 운반';if(!api.move(c,58*travelScale(s),dt))return true;
  repair.delivered=true;c.materialCargo=0;c.frontStage='repair';
 }
 c.task='피부장벽 보수';if(!activeActivity(c,s.time))beginActivity(s,c,'repair',.95,def.point,def.district);
 const work=dt*Math.max(.35,api.output(s,'marrow'));repair.remaining=Math.max(0,repair.remaining-work);
 const maximum=wallMaximum(s,c.frontJob);
 if(wall.hp<maximum*.98)wall.hp=Math.min(maximum*.98,wall.hp+work*maximum/7);
 if(repair.remaining===0){wall.hp=wallMaximum(s,c.frontJob);wall.repair=null;api.log(s,def.name+' 복구 · 침입 차단');c.frontJob=null;c.frontStage=null;c.path=[];c.step=0;c.activity=null;c.assignment=null;}
 return true;
}
function patchSkin(s,c,dt,api){
 const f=s.frontier;
 if(c.patchWall!=null&&(f.walls[c.patchWall].hp>=25||f.walls[c.patchWall].repair?.delivered)){c.patchWall=null;c.path=[];c.step=0;c.assignment=null;c.activity=null;}
 if(c.patchWall==null){
  const target=WALLS.filter(w=>f.walls[w.id].hp<15&&!f.walls[w.id].repair?.delivered&&!s.cells.some(a=>a!==c&&a.patchWall===w.id)).sort((a,b)=>distance(c,a.inside)-distance(c,b.inside))[0];
  if(!target)return false;
  c.patchWall=target.id;c.assignment=null;releaseWorkplace(c);api.route(c,[target.inside]);
 }
 const def=WALLS[c.patchWall],w=f.walls[c.patchWall];c.target=def.district;c.task='피부 상처로 이동';c.nextTask='응급 봉합 → 장벽 재건';
 if(!api.move(c,78*travelScale(s),dt))return true;
 c.task='피부 응급 봉합';
 if(c.cooldown===0){w.hp=Math.min(25,w.hp+4);c.cooldown=1.5;s.stats.clots++;beginActivity(s,c,'patch',.85,def.point,def.district);}
 return true;
}
function prepareSupply(s,c,dt,api){
 let sh=s.shipments.find(x=>x.id===c.logisticsJob);
 if(!sh){sh=s.shipments.find(x=>x.frontDelivery?.type==='depot'&&!x.prepared&&x.preparer==null);if(!sh){c.logisticsJob=null;return false;}sh.preparer=c.id;c.logisticsJob=sh.id;releaseWorkplace(c);}
 c.target='gut';c.task='전선 보급 출고 준비';c.nextTask='적재 → 운반원 인계';
 const bench=approachWorkplace(s,c,'gut','fabricate',dt,api.move,api.route,60);
 if(!bench.arrived)return true;
 if(c.activity?.kind!=='load'){beginActivity(s,c,'load',2,bench.target,'gut');return true;}
 if(activityProgress(c.activity,s.time)<1)return true;
 sh.prepared=true;c.logisticsJob=null;c.activity=null;c.path=[];c.step=0;releaseWorkplace(c);return true;
}
function repairTissue(s,c,dt,api){
 const f=s.frontier;if(c.tissueJob==null){const index=f.tissues.findIndex((t,i)=>tissuePresent(s,TISSUES[i])&&t.hp<88&&!s.cells.some(a=>a.tissueJob===i));if(index<0||s.resources.materials<3)return false;s.resources.materials-=3;c.tissueJob=index;releaseWorkplace(c);api.route(c,[tissueAt(s,TISSUES[index]).point]);}
 const index=c.tissueJob,t=f.tissues[index];c.target=TISSUES[index].district;c.task='조직 블록 복구';c.nextTask='조직 안정화';
 if(!api.move(c,56*travelScale(s),dt))return true;
 if(!activeActivity(c,s.time))beginActivity(s,c,'repair',.95,tissueAt(s,TISSUES[index]).point,c.target);
 t.hp=clamp(t.hp+dt*4);if(t.hp>=95){c.tissueJob=null;c.activity=null;c.path=[];c.step=0;}return true;
}
export function frontDepot(s,c){
 if(!s.frontier)return null;const p=groundPoint(c);let best=null,range=5.8;
 for(const [id,front] of Object.entries(FRONTS)){const d=Math.hypot(p.x-depotAt(s,id).x,p.z-depotAt(s,id).z);if(d<range){best=s.frontier.depots[id];range=d;}}
 return best;
}
export function tickFrontier(s,dt,api){
 const f=s.frontier;if(!f)return;
 if(!f.woundDone){const lead=10+Object.values(f.plots).flat().filter(x=>x==='sensor').length*5;
  if(s.time>=f.woundAt-lead&&!f.warned){f.warned=true;f.walls[f.woundId].warningUntil=f.woundAt+20;api.log(s,WALLS[f.woundId].name+' · 상처 위험 감지');}
  if(s.time>=f.woundAt){f.woundDone=true;openWound(s,f.woundId,api);}
 }
 for(const sh of s.shipments)if(sh.preparer!=null&&!s.cells.some(c=>c.id===sh.preparer))sh.preparer=null;
 for(const w of f.walls)if(w.repair?.assignee!=null&&!s.cells.some(c=>c.id===w.repair.assignee)){w.repair.assignee=null;}
 f.repairClock=(f.repairClock??0)-dt;
 if(f.repairClock<=0){
  f.repairClock=2;
  if(s.cells.some(c=>c.kind==='fibroblast')&&f.walls.filter(w=>w.repair).length<(s.policy==='repair'?3:2)){
   const damaged=WALLS.filter(w=>f.walls[w.id].hp<(s.policy==='repair'?95:75)&&!f.walls[w.id].repair).sort((a,b)=>f.walls[a.id].hp-f.walls[b.id].hp)[0];
   if(damaged)repairOrder(s,damaged.id,api);
  }
 }
 f.supplyClock-=dt;if(f.supplyClock<=0){const id=Object.keys(FRONTS)[Math.floor(s.time/14)%3];supplyOrder(s,id,api);f.supplyClock=14;}
 f.airway.mucus=clamp(f.airway.mucus-dt*(f.airway.boostUntil>s.time?1:.14),12);
 const amount=Math.min(f.waste.stock,dt*.6*api.output(s,'kidney'));f.waste.stock-=amount;f.waste.processed+=amount;s.waste=clamp(s.waste-amount*1.4);s.inflammation=clamp(s.inflammation-amount*1.8);
 for(const item of f.inbox){item.remaining=Math.max(0,item.remaining-dt*api.output(s,'lymph')*(1+.2*(s.districts.lymph.level-1)));item.stage=item.remaining>2.6?'접수':'반응 준비';if(item.remaining===0){s.antigens[item.recordId]=true;api.log(s,'림프절 · 표적 반응 준비 완료');}}
 f.inbox=f.inbox.filter(x=>x.remaining>0);
 for(const [i,t] of f.tissues.entries()){const d=s.districts[TISSUES[i].district],stress=d.food<.3||d.oxygen<20;t.hp=clamp(t.hp+dt*(stress?-.18:.018));}
 for(const [id,d] of Object.entries(f.depots)){const p=groundCoordinate(depotAt(s,id)),fighters=s.cells.filter(c=>['neutrophil','macrophage'].includes(c.kind)&&distance(c,p)<150).length;d.food=Math.max(0,d.food-dt*fighters*.015);}
 const used=new Set(s.recruits.filter(r=>r.bay!=null).map(r=>r.bay));for(const r of s.recruits)if(r.bay==null){let slot=0;while(used.has(slot))slot++;r.bay=slot;used.add(slot);if(r.remaining!=null)r.duration??=r.remaining;}
}
export function frontierAlerts(s){
 if(!s.frontier)return [];const f=s.frontier,out=[];
 for(const [id,w] of f.walls.entries())if(w.hp===0||w.warningUntil>s.time||w.hp<50)out.push({kind:'skin',id,point:WALLS[id],text:WALLS[id].name+' · '+(w.hp===0?(w.repair?'파손 · 보수 중':'파손 · 침입 위험'):w.warningUntil>s.time?'접근 감지':'손상')});
 for(const [id,front] of Object.entries(FRONTS)){const d=f.depots[id],enemies=s.enemies.filter(e=>e.front===id&&!e.dead).length;if(enemies)out.push({kind:id,point:front,text:front.name+' 전선 · 감염 '+enemies+(d.food<1?' · 영양 부족':!s.biology&&d.ammo[s.drug]<1?' · 약품 부족':'')});}
 if(s.biology)for(const d of DISTRICTS){const bio=s.biology.sites[d.id];if(infectionLoad(bio)>=12)out.push({kind:'district',id:d.id,point:siteAt(s.layout,d.id),text:d.short+' · '+STAGES[bio.stage]});}
 for(const d of DISTRICTS){const state=facilityState(s,d.id);if(state.id!=='normal')out.push({kind:'district',id:d.id,point:siteAt(s.layout,d.id),text:d.short+' · '+state.name});}
 return out.slice(0,8);
}
export function validateFrontier(s){
 const f=s.frontier;if(!f)return true;
 const n=(v,max=1e7)=>Number.isFinite(v)&&v>=0&&v<=max;
 if(!s.specialists||f.version!==1||!Array.isArray(f.walls)||f.walls.length!==WALLS.length||!f.walls.every(w=>n(w.hp,520)&&n(w.warningUntil)&&(!w.repair||n(w.repair.remaining,7)&&typeof w.repair.materials==='boolean'&&typeof w.repair.delivered==='boolean'&&(w.repair.assignee==null||n(w.repair.assignee)))))return false;
 if(!f.plots||DISTRICTS.some(d=>!Array.isArray(f.plots[d.id])||f.plots[d.id].length>2||f.plots[d.id].some(p=>!INVESTMENTS[p])))return false;
 if(!f.depots||Object.keys(FRONTS).some(id=>!f.depots[id]||!n(f.depots[id].food,40)||!n(f.depots[id].materials,40)||DRUGS.some(d=>!n(f.depots[id].ammo?.[d.id],60))))return false;
 if(!f.airway||!n(f.airway.mucus,12)||!n(f.airway.cleared)||!n(f.airway.boostUntil)||typeof f.gut?.quarantine!=='boolean'||!n(f.waste?.stock,24)||!n(f.waste?.processed))return false;
 if(!Array.isArray(f.inbox)||f.inbox.length>12||f.inbox.some(x=>!pathogenDef(x.recordId)||!n(x.remaining,4)))return false;
 if(!Array.isArray(f.tissues)||![4,TISSUES.length].includes(f.tissues.length)||f.tissues.some(t=>!n(t.hp,100))||!n(f.woundAt)||!Number.isInteger(f.woundId)||!WALLS[f.woundId]||typeof f.woundDone!=='boolean'||typeof f.warned!=='boolean'||!Number.isFinite(f.supplyClock))return false;
 for(const c of [...s.cells,...s.shipments]){const w=c.workplace;if(w&&(!districtDef(w.site)||!['oxygen','dock','produce','fabricate','waste','repair','rest'].includes(w.role)||w.key!==w.site+':'+w.role||!n(w.ticket)||w.slot!=null&&(!Number.isInteger(w.slot)||!n(w.slot,CITY_CAPS.workSlots-1))))return false;if(c.frontJob!=null&&!WALLS[c.frontJob]||c.tissueJob!=null&&!TISSUES[c.tissueJob]||c.debrisCargo!=null&&!n(c.debrisCargo,3)||c.materialCargo!=null&&!n(c.materialCargo,8))return false;}
 for(const sh of s.shipments){const d=sh.frontDelivery;if(d&&!(d.type==='wall'&&WALLS[d.id]||d.type==='depot'&&FRONTS[d.id]))return false;}
 for(const c of s.cells)if(c.patchWall!=null&&!WALLS[c.patchWall]||c.alertKind!=null&&!['threat','repair'].includes(c.alertKind)||c.alertUntil!=null&&!n(c.alertUntil))return false;
 for(const e of [...s.enemies,...s.spawn])if(e.front&&!FRONTS[e.front]&&e.front!=='blood'||e.front==='skin'&&!WALLS[e.wall]||e.caughtUntil!=null&&!n(e.caughtUntil)||e.entryStep!=null&&(!Number.isInteger(e.entryStep)||!n(e.entryStep,CITY_CAPS.path))||!validatePathogenTarget(e)||e.path&&(!Array.isArray(e.path)||e.path.length>CITY_CAPS.path||e.path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||!Number.isInteger(e.step)||e.step<0||e.step>e.path.length))return false;
 for(const d of Object.values(s.districts))if(d.building?.type==='plot'&&!INVESTMENTS[d.building.choice])return false;
 const slots=new Set();for(const c of [...s.cells,...s.shipments])if(c.workplace?.slot!=null){const key=c.workplace.key+':'+c.workplace.slot;if(slots.has(key))return false;slots.add(key);}
 return n(s.workTicket||0);
}
