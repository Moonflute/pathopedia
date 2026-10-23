import {workStation} from './city-activity.mjs';
import {groundPoint} from './city-three-layout.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {cityDistricts} from './city-tile-layout.mjs';

// Reuse the actual oxygen fittings, freight crates and antigen workbench.
// Work from their accessible front, even when a building footprint covers a fitting.
const cache=new WeakMap();
export function pilotSites(s){
 if(cache.has(s.layout))return cache.get(s.layout);
 const world=pilotWorld(s.layout,'2'),sites=[];
 for(const d of cityDistricts(s))for(const role of ['oxygen','dock',...(d.id==='lymph'?['produce']:[])]){
  const bay=workStation(d.id,role,role==='oxygen'?1:0,s.layout),target=groundPoint(bay.target),origin=groundPoint(bay.stand);
  const approach=world.safe(origin,'neutrophil',p=>Math.hypot(p.x-target.x,p.z-target.z)>.5&&Math.hypot(p.x-target.x,p.z-target.z)<2.1);
  if(!approach)continue;
  sites.push({key:role+':'+d.id,site:d.id,role,target,approach,height:role==='oxygen'?.72:.48,radius:role==='oxygen'?.34:.48,
   name:d.short+' · '+(role==='oxygen'?(d.id==='lung'?'산소 충전기':'산소 주입구'):role==='produce'?'항원 접수대':d.id==='gut'?'보급 상자':d.id==='kidney'?'집하 상자':'보급·정비대'),
   tool:role==='oxygen'?'oxygen':role==='produce'?'antigen':d.id==='gut'?'nutrient':d.id==='kidney'?'cleanup':'repair'});
 }
 cache.set(s.layout,sites);return sites;
}
export function pilotSite(s,id,tool){return pilotSites(s).find(p=>p.site===id&&p.role===(tool==='oxygen'?'oxygen':tool==='antigen'?'produce':'dock'));}
const fieldCache=new WeakMap();
export function pilotFieldSite(s,target){
 let points=fieldCache.get(s.layout);if(!points){points=new Map();fieldCache.set(s.layout,points);}
 const key=target.x+','+target.z;if(!points.has(key)){const world=pilotWorld(s.layout,'2');points.set(key,world.safe(target,'neutrophil',p=>Math.hypot(p.x-target.x,p.z-target.z)>.8&&Math.hypot(p.x-target.x,p.z-target.z)<2)||target);}
 return {...points.get(key),target};
}
