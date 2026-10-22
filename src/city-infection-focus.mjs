import {cityDistrict,cityDistricts} from './city-tile-layout.mjs';

// Shared positions for chemotaxis, antigen collection and map alarms. Only
// microbes that have crossed a barrier recruit tissue responders.
const cache=new WeakMap(),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function infectionFoci(s){
 const prior=cache.get(s);if(prior?.time===s.time&&prior.enemies===s.enemies)return prior.list;
 const groups=new Map();
 for(const e of [...s.enemies||[],...(s.immunity?.infected||[]).map(h=>({...h,entered:true,front:'tissue'}))]){
  if(e.dead||!e.entered||e.compartment==='lumen')continue;
  const site=e.site||cityDistricts(s).reduce((a,b)=>distance(a,e)<distance(b,e)?a:b).id,key=e.front==='skin'?'skin:'+e.wall:site+':'+e.recordId;
  let g=groups.get(key);if(!g){g={key,site,wall:e.front==='skin'?e.wall:null,x:0,y:0,count:0,records:new Set()};groups.set(key,g);}
  g.x+=e.x;g.y+=e.y;g.count++;g.records.add(e.recordId);
 }
 const list=[...groups.values()];for(const g of list){g.x/=g.count;g.y/=g.count;}
 cache.set(s,{time:s.time,enemies:s.enemies,list});return list;
}
export function infectionFocus(s,site,recordId=null,from=null){
 const matches=infectionFoci(s).filter(f=>f.site===site&&(!recordId||f.records.has(recordId)));
 return matches.sort((a,b)=>(from?distance(a,from)-distance(b,from):b.count-a.count))[0]||cityDistrict(s,site);
}
