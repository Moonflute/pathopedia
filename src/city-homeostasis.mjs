import {HOME_ORGANS,HOME_LOOPS,HOME_SIGNALS,HOME_ACTIONS,HOME_ACTION_LOOPS,homeOrgan} from './city-homeostasis-data.mjs';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const approach=(v,target,dt,tau)=>v+(target-v)*(1-Math.exp(-dt/tau));
export function ensureHomeostasis(s){
 if(!s.specialists||!s.layout)return null;
 if(s.homeostasis)return s.homeostasis;
 const hormones=Object.fromEntries(Object.keys(HOME_SIGNALS).map(k=>[k,['tsh','ventilation'].includes(k)?1:0]));
 return s.homeostasis={version:1,glucose:94,water:100,sodiumMass:140,sodium:140,potassium:4.2,co2:40,bicarbonate:24,ph:7.4,temperature:37,calcium:9.5,glycogen:72,fat:100,boneMineral:100,iron:8,urea:3,thyroid:1,metabolism:1,ventilation:1,pulse:72,pressure:95,urine:.02,urineConcentration:1,sweat:0,shiver:0,skinFlow:1,absorption:100,ambient:22,exercise:0,exerciseUntil:0,fastUntil:0,pendingMeal:0,autoDrink:true,drinkAt:0,signalAt:0,packetSerial:0,packets:[],events:[],hormones:{...hormones},effectors:{...hormones},organs:Object.fromEntries(HOME_ORGANS.map(o=>[o.id,{oxygen:85,hp:100,function:1}])),loops:Object.fromEntries(HOME_LOOPS.map(l=>[l.id,{phase:'stable',since:s.time,peak:0,cycles:0,error:0}])),digestive:{bile:20,bileStore:40,enzymes:1,nutrients:0,absorbed:0,meal:0,secretionAt:0},recycling:{retired:0,processed:0,born:0,pending:0},stats:{signals:0,deliveries:0,water:0,co2:0,calcium:0},cooldowns:{}};
}
function event(s,loop,text,site){const h=s.homeostasis;h.events.unshift({at:s.time,loop,text,site});h.events.length=Math.min(h.events.length,24);}
function disturb(s,id,amount=1){const q=s.homeostasis.loops[id];if(q.phase==='stable'||q.phase==='recovering'){q.phase='sensing';q.since=s.time;q.peak=amount;delete q.actingAt;delete q.signaledAt;event(s,id,'① 감지',HOME_LOOPS.find(l=>l.id===id).sites[0]);}}
// Packets are saved physical transfers. Effectors change only on arrival.
export function sendHomePacket(s,kind,from,to,amount,loop){
 const h=s.homeostasis;if(!h||h.packets.length>=80||!Number.isFinite(amount))return false;
 h.packets.push({id:++h.packetSerial,kind,from,to,amount,loop,started:s.time,progress:0,duration:0});return true;
}
function receive(s,p){
 const h=s.homeostasis;h.stats.deliveries++;
 if(HOME_SIGNALS[p.kind]){h.effectors[p.kind]=p.amount;h.stats.signals++;}
 else if(p.kind==='nutrient'){h.glucose=clamp(h.glucose+p.amount,35,230);h.digestive.absorbed+=p.amount;h.digestive.nutrients=Math.max(0,h.digestive.nutrients-p.amount);}
 else if(p.kind==='bile')h.digestive.bile=clamp(h.digestive.bile+p.amount,0,40);
 else if(p.kind==='enzyme')h.digestive.enzymes=p.amount;
 else if(p.kind==='water'){h.water=clamp(h.water+p.amount,65,115);h.stats.water+=p.amount;}
 else if(p.kind==='calcium'){h.calcium=clamp(h.calcium+p.amount,6,13);h.stats.calcium+=p.amount;}
 else if(p.kind==='heme'){h.recycling.processed++;sendHomePacket(s,'iron','liver','marrow',1,'recycling');}
 else if(p.kind==='iron'){h.iron=Math.min(40,h.iron+p.amount);h.recycling.pending++;}
 const q=h.loops[p.loop];if(q?.phase==='signaling'&&s.time-(q.signaledAt||q.since)>=1.3&&p.started>=q.since){q.phase='acting';q.actingAt=s.time;event(s,p.loop,'③ '+(HOME_SIGNALS[p.kind]?.name||{nutrient:'영양 흡수',water:'수분 흡수',calcium:'칼슘 흡수',heme:'철 분리',iron:'골수 도착',bile:'담즙 도착',enzyme:'효소 도착'}[p.kind]),p.to);}
}
export function tickHomePackets(s,dt,pathLength=()=>18){
 const h=s.homeostasis;if(!h)return;
 const arrived=[];for(const p of h.packets){if(!p.duration)p.duration=HOME_SIGNALS[p.kind]?.neural?1.5:clamp(pathLength(p)/8,3,18);p.progress=Math.min(1,p.progress+dt/p.duration);if(p.progress>=1)arrived.push(p);}
 h.packets=h.packets.filter(p=>p.progress<1);for(const p of arrived)receive(s,p);
}
export function homeostasisCommand(s,action,id){
 if(action!=='home-action'&&action!=='home-function')return null;const h=ensureHomeostasis(s);if(!h)return {ok:false};
 if(action==='home-function'){
  const organ=h.organs[id];if(!organ)return {ok:false};organ.function=organ.function===1?.4:1;const loop=homeOrgan(id).loop;disturb(s,loop,2);event(s,loop,homeOrgan(id).name+' · 가동 '+Math.round(organ.function*100)+'%',id);return {ok:true};
 }
 if(!HOME_ACTIONS[id])return {ok:false};if((h.cooldowns[id]||0)>s.time)return {ok:false,text:'반응 진행 중'};
 h.cooldowns[id]=s.time+8;const loop=HOME_ACTION_LOOPS[id];disturb(s,loop,1);
 if(id==='meal'){h.fastUntil=0;h.pendingMeal=Math.min(60,h.pendingMeal+28);s.intakeClock=0;}
 if(id==='fast'){h.fastUntil=s.time+120;h.pendingMeal=0;}
 if(id==='drink'){sendHomePacket(s,'water','outside','gut',5,'water');h.drinkAt=s.time+14;}
 if(id==='dehydrate'){h.water=Math.max(72,h.water-12);h.autoDrink=false;}
 if(id==='salt')h.sodiumMass=Math.min(165,h.sodiumMass+6);
 if(id==='exercise'){h.exercise=1;h.exerciseUntil=s.time+75;}
 if(id==='rest'){h.exercise=0;h.exerciseUntil=0;}
 if(id==='heat')h.ambient=36;
 if(id==='cold')h.ambient=7;
 if(id==='neutral'){h.ambient=22;h.exercise=0;h.autoDrink=true;}
 if(id==='calcium')sendHomePacket(s,'calcium','gut','bone',.8,'calcium');
 if(id==='lowcalcium')h.calcium=Math.max(7,h.calcium-1.2);
 if(id==='aging'){const cells=s.cells.filter(c=>c.kind==='rbc'&&!c.recycling).sort((a,b)=>b.age-a.age).slice(0,3);for(const c of cells)c.age=c.life;h.recycling.selected=(h.recycling.selected||0)+cells.length;}
 event(s,loop,HOME_ACTIONS[id],HOME_LOOPS.find(l=>l.id===loop).sites[0]);return {ok:true,text:HOME_ACTIONS[id]};
}
export function homeFoodFactor(s){const h=s.homeostasis;if(!h)return 1;return h.fastUntil>s.time?0:clamp(h.digestive.enzymes*(.4+.6*clamp(h.digestive.bile/8)),.05,1.2);}
export function homeMealArrival(s,amount,extra=0){const h=s.homeostasis;if(!h)return;h.digestive.meal=Math.min(80,h.digestive.meal+extra);if(extra){disturb(s,'digestion');event(s,'digestion','입항 · 소화 시작','gut');}}
export function homeDigestion(s,processed,dt){
 const h=s.homeostasis;if(!h)return;const meal=Math.min(h.digestive.meal,processed*1.8);h.digestive.meal-=meal;
 h.digestive.bile=clamp(h.digestive.bile-processed*.13,0,60);
 h.digestive.nutrients+=processed*.13+meal*.95;
 h.urea=clamp(h.urea+processed*.035,0,100);
 if(h.digestive.nutrients>=2&&!h.packets.some(p=>p.kind==='nutrient'))sendHomePacket(s,'nutrient','gut','liver',Math.min(6,h.digestive.nutrients),'digestion');
}
export function recycleHomeRbc(s){const h=s.homeostasis;if(!h)return;h.recycling.retired++;disturb(s,'recycling');sendHomePacket(s,'heme','spleen','liver',1,'recycling');event(s,'recycling','적혈구 포식 · 철 회수','spleen');}
export function homeostasisOutput(s,id){
 const h=s.homeostasis;if(!h)return 1;
 return clamp(h.glucose/65,.55,1)*clamp(h.water/90,.65,1)*clamp(1-Math.abs(h.temperature-37)*.08,.6,1)*clamp(1-Math.abs(h.ph-7.4)*.7,.6,1)*clamp(h.calcium/8.3,.65,1)*(id==='heart'?clamp(h.pressure/85,.6,1):1);
}
export function tickHomeostasis(s,dt,api={}){
 const h=ensureHomeostasis(s);if(!h)return;
 tickHomePackets(s,dt,api.pathLength);
 const renal=clamp((s.districts.kidney.hp/100)*(s.districts.kidney.oxygen/50),.1,1),organ=id=>h.organs[id].function*(1+((h.organs[id].level||1)-1)*.15)*clamp(h.organs[id].oxygen/45,.3,1)*h.organs[id].hp/100;
 if(s.time>=h.exerciseUntil)h.exercise=0;
 const e=h.effectors;
 h.metabolism=clamp(.65+.35*h.thyroid,.6,1.8);
 const demand=h.metabolism*(1+h.exercise*1.8+h.shiver*.6);
 h.hormones.insulin=clamp((h.glucose-88)/32)*organ('pancreas');h.hormones.glucagon=clamp((90-h.glucose)/25)*organ('pancreas');
 h.hormones.adh=clamp((100-h.water)*.13+(h.sodium-141)*.1)*organ('brain');
 h.hormones.aldosterone=clamp((99-h.water)*.09+(h.potassium-4.2)*.5)*organ('adrenal');
 h.hormones.ventilation=clamp(1+(h.co2-40)*.13+h.exercise*.35+(7.4-h.ph)*.8,.65,3)*organ('brain');
 h.hormones.cooling=clamp((h.temperature-37)*1.8,0,2)*organ('brain');h.hormones.shivering=clamp((36.9-h.temperature)*1.7,0,2)*organ('brain');
 h.hormones.tsh=clamp(1+(1-h.thyroid)*3,.1,3)*organ('brain');h.hormones.pth=clamp((9.5-h.calcium)*1.4,0,2)*clamp(h.organs.thyroid.oxygen/45,.3,1)*h.organs.thyroid.hp/100;
 if(s.time>=h.signalAt){h.signalAt=s.time+5;
  for(const [key,signal] of Object.entries(HOME_SIGNALS)){
   const amount=h.hormones[key];sendHomePacket(s,key,signal.from,signal.to,amount,signal.loop);
   const q=h.loops[signal.loop];if(q.phase==='sensing'&&s.time-q.since>=2){q.phase='signaling';q.signaledAt=s.time;event(s,signal.loop,'② '+signal.name,signal.from);}
  }
 }
 // The liver supplies blood glucose; muscle glycogen is kept for local work.
 const release=Math.min(h.glycogen,dt*(e.glucagon*.8+clamp((82-h.glucose)/20)*.18)*organ('liver'));
 const store=Math.min(Math.max(0,h.glucose-84),dt*e.insulin*.8*organ('liver'),Math.max(0,120-h.glycogen));
 const fatUse=Math.min(h.fat,dt*clamp((85-h.glucose)/25)*.15*organ('fat'));
 const uptake=dt*(.19*demand+.25*e.insulin),fatStore=dt*e.insulin*.045;
 h.glycogen+=store-release;h.fat=clamp(h.fat+fatStore-fatUse,0,160);
 h.glucose=clamp(h.glucose+release-store-uptake+fatUse*.15,35,230);
 h.digestive.bileStore=clamp(h.digestive.bileStore+dt*.28*organ('liver'),0,60);
 h.digestive.enzymes=Math.max(.05,h.digestive.enzymes-dt*.004);
 if(s.time>=h.digestive.secretionAt&&(s.rawFood>0||h.digestive.meal>0)){
  h.digestive.secretionAt=s.time+6;const bile=Math.min(h.digestive.bileStore,2*organ('liver'));h.digestive.bileStore-=bile;sendHomePacket(s,'bile','liver','gut',bile,'digestion');sendHomePacket(s,'enzyme','pancreas','gut',organ('pancreas'),'digestion');
 }
 h.absorption=100*homeFoodFactor(s);
 h.ventilation=approach(h.ventilation,e.ventilation,dt,3);
 const ventilation=h.ventilation*clamp(s.districts.lung.hp/100,.08,1);
 const produced=dt*.24*demand,expired=dt*.24*ventilation*(h.co2/40);
 h.co2=clamp(h.co2+produced-expired,20,90);h.stats.co2+=expired;
 h.bicarbonate=approach(h.bicarbonate,24+(h.co2-40)*.4,dt,80/renal);h.bicarbonate=clamp(h.bicarbonate,16,36);
 h.ph=clamp(6.1+Math.log10(h.bicarbonate/(.03*h.co2)),6.8,7.8);
 h.sweat=approach(h.sweat,e.cooling,dt,5);h.shiver=approach(h.shiver,e.shivering,dt,5);h.skinFlow=clamp(1+h.sweat*.7-h.shiver*.3,.4,2.4);
 h.temperature=clamp(h.temperature+dt*(.016*(demand-1)+.003*(h.ambient-22)-h.sweat*.048+h.shiver*.036-(h.temperature-37)*.012),34,41);
 h.urine=renal*(.018*(1-.8*clamp(e.adh))+.04*Math.max(0,h.water-100)+.0007*Math.max(0,h.sodiumMass-140)*(1-.8*clamp(e.adh)));
 h.urineConcentration=clamp(1+e.adh*2+(100-h.water)*.04,.4,4);
 h.water=clamp(h.water+dt*(.018-h.urine-.018*h.exercise-.028*h.sweat),65,115);
 h.sodiumMass=clamp(h.sodiumMass-dt*renal*(Math.max(0,h.sodiumMass-140)*.03*(1-.5*e.aldosterone)),110,165);h.sodium=h.sodiumMass*100/h.water;
 h.potassium=clamp(h.potassium+dt*(h.exercise*.009-renal*(h.potassium-4.2)*.025-renal*e.aldosterone*.008),2.8,6.5);
 h.pressure=approach(h.pressure,95+(h.water-100)*1.4+(h.pulse-72)*.2,dt,6);h.pulse=approach(h.pulse,72+34*h.exercise+Math.max(0,98-h.water)*1.3+Math.max(0,h.temperature-37)*8,dt,4);
 if(h.autoDrink&&h.water<97&&s.time>=h.drinkAt&&!h.packets.some(p=>p.kind==='water')){sendHomePacket(s,'water','outside','gut',4,'water');h.drinkAt=s.time+20;}
 h.urea=clamp(h.urea-dt*renal*(.03+h.urea*.012),0,100);
 h.thyroid=approach(h.thyroid,e.tsh*organ('thyroid'),dt,45);
 const mineral=Math.min(h.boneMineral,dt*e.pth*.035*organ('bone'));
 const formation=Math.min(Math.max(0,h.calcium-9.5),dt*.025,Math.max(0,120-h.boneMineral));
 h.boneMineral+=formation-mineral;h.calcium=clamp(h.calcium+mineral-formation+dt*(.005*h.absorption/100-.005*demand+.009*e.pth*renal),6,13);
 // Recovered iron reaches marrow before a replacement can be commissioned.
 if(h.recycling.pending&&h.iron>=1&&s.resources.food>=4&&api.recruit?.()){
  h.iron--;h.recycling.pending--;h.recycling.born++;s.resources.food-=4;event(s,'recycling','철 재사용 · 조혈','marrow');
 }
 for(const o of HOME_ORGANS){const a=h.organs[o.id];a.oxygen=clamp(a.oxygen-dt*.22*(o.id==='muscle'?demand:1),0,100);const stress=(a.oxygen<12?.025:0)+(h.glucose<50?.02:0);a.hp=clamp(a.hp+dt*(stress?-stress:.012),0,100);}
 const errors={glucose:Math.abs(h.glucose-94)/20,water:Math.max(Math.abs(h.water-100)/4,Math.abs(h.sodium-140)/5),respiration:Math.max(Math.abs(h.co2-40)/5,h.exercise),temperature:Math.abs(h.temperature-37)/.35,digestion:h.digestive.meal>1||h.pendingMeal>0||s.shipments?.some(p=>p.homeMeal>0)||h.packets.some(p=>p.kind==='nutrient')?1:Math.max(0,80-h.absorption)/35,thyroid:Math.abs(h.thyroid-1)/.2,calcium:Math.abs(h.calcium-9.5)/.4,recycling:h.packets.some(p=>['heme','iron'].includes(p.kind))||h.recycling.pending?1:0};
 for(const l of HOME_LOOPS){const q=h.loops[l.id],error=errors[l.id];q.error=error;q.peak=Math.max(q.peak,error);
  if(error>.8&&q.phase==='stable')disturb(s,l.id,error);
  if(q.phase==='sensing'&&s.time-q.since>5&&!Object.values(HOME_SIGNALS).some(k=>k.loop===l.id)){q.phase='signaling';q.signaledAt=s.time;event(s,l.id,'② 전달',l.sites[0]);}
  if(q.phase==='signaling'&&s.time-q.since>10){q.phase='acting';q.actingAt=s.time;event(s,l.id,'③ 반응',l.sites.at(-1));}
  if(q.phase==='acting'&&s.time-q.actingAt>=3&&error<Math.max(.35,q.peak*.55)&&s.time-q.since>10){q.phase='recovering';event(s,l.id,'④ 회복',l.sites.at(-1));}
  if(q.phase==='recovering'&&error<.35&&s.time-q.since>22){q.phase='stable';q.cycles++;q.peak=0;event(s,l.id,'균형 회복',l.sites[0]);}
 }
}
export function validateHomeostasis(s){
 const h=s.homeostasis;if(h==null)return true;if(h.version!==1||!Array.isArray(h.packets)||h.packets.length>80||!Array.isArray(h.events)||h.events.length>24)return false;
 const finiteTree=(value,depth=0)=>depth<10&&(typeof value==='number'?Number.isFinite(value)&&Math.abs(value)<=1e9:typeof value==='string'?value.length<140:typeof value==='boolean'||value===null?true:typeof value==='object'&&Object.keys(value).length<160&&Object.values(value).every(v=>finiteTree(v,depth+1)));
 const numbers=(o,keys)=>!!o&&keys.every(k=>Number.isFinite(o[k]));
 const between=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
 if(!finiteTree(h))return false;
 if(HOME_ORGANS.some(o=>!between(h.organs?.[o.id]?.oxygen,0,100)||!between(h.organs[o.id].hp,0,100)||![.4,1].includes(h.organs[o.id].function)))return false;
 if(HOME_LOOPS.some(l=>!['stable','sensing','signaling','acting','recovering'].includes(h.loops?.[l.id]?.phase)||!numbers(h.loops[l.id],['since','peak','cycles','error'])))return false;
 if(Object.keys(HOME_SIGNALS).some(k=>!between(h.hormones?.[k],0,4)||!between(h.effectors?.[k],0,4)))return false;
 const points=new Set([...HOME_ORGANS.map(o=>o.id),'heart','lung','gut','kidney','marrow','lymph','outside']),loops=new Set(HOME_LOOPS.map(l=>l.id));
 if(h.packets.some(p=>!points.has(p.from)||!points.has(p.to)||!['nutrient','water','calcium','heme','iron','bile','enzyme',...Object.keys(HOME_SIGNALS)].includes(p.kind)||!numbers(p,['id','started','amount'])||!between(p.amount,0,80)||!between(p.progress,0,1)||!between(p.duration,0,20)||!loops.has(p.loop)))return false;
 if(h.events.some(e=>!Number.isFinite(e.at)||!loops.has(e.loop)||!points.has(e.site)||typeof e.text!=='string'))return false;
 if(!h.cooldowns||Object.entries(h.cooldowns).some(([k,v])=>!HOME_ACTIONS[k]||!Number.isFinite(v))||typeof h.autoDrink!=='boolean')return false;
 return numbers(h,['glucose','water','sodiumMass','sodium','potassium','co2','bicarbonate','ph','temperature','calcium','glycogen','fat','boneMineral','iron','urea','thyroid','metabolism','ventilation','pulse','pressure','urine','urineConcentration','sweat','shiver','skinFlow','absorption','ambient','exercise','exerciseUntil','fastUntil','pendingMeal','drinkAt','signalAt','packetSerial'])&&numbers(h.digestive,['bile','bileStore','enzymes','nutrients','absorbed','meal','secretionAt'])&&numbers(h.recycling,['retired','processed','born','pending'])&&numbers(h.stats,['signals','deliveries','water','co2','calcium']);
}
