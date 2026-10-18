import {DISTRICTS,districtDef} from './city-data.mjs';

// Roads and transport use the same precomputed curves; no per-frame path finding.
function curve(points){
  const out=[];
  for(let i=0;i<points.length-1;i++)for(let n=0;n<4;n++){
    const t=n/4,t2=t*t,t3=t2*t,p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
    const axis=k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);
    out.push({x:axis(0),y:axis(1)});
  }
  const last=points.at(-1);out.push({x:last[0],y:last[1]});return out;
}
const heart=districtDef('heart');
const routes={
  lung:[[575,359],[663,316],[765,318],[837,288],[878,240]],
  gut:[[575,359],[656,416],[774,467],[878,478],[897,552]],
  kidney:[[575,359],[542,431],[611,495],[648,558],[590,626]],
  marrow:[[575,359],[479,386],[386,466],[309,484],[279,555]],
  lymph:[[575,359],[463,310],[388,305],[331,257],[281,242]]
};
export const ROADS=Object.entries(routes).map(([id,points])=>({id,points:curve(points),pulmonary:id==='lung'}));
const lane=(points,side)=>points.map((p,i)=>{
  if(i===0||i===points.length-1)return {...p};
  const a=points[i-1],b=points[i+1],length=Math.hypot(b.x-a.x,b.y-a.y)||1;
  return {x:p.x-(b.y-a.y)/length*side*7,y:p.y+(b.x-a.x)/length*side*7};
});
const outward=Object.fromEntries(ROADS.map(r=>[r.id,lane(r.points,1)]));
const inward=Object.fromEntries(ROADS.map(r=>[r.id,lane(r.points,-1).reverse()]));
export function vascularRoute(from,to){
  if(from===to)return [{x:districtDef(to).x,y:districtDef(to).y}];
  return [...(from==='heart'?[]:inward[from]),...(to==='heart'?[{x:heart.x,y:heart.y}]:outward[to])];
}
export const FOOD_ENTRY={x:1170,y:610};
export const FOOD_ROAD=curve([[1170,610],[1075,625],[978,609],[943,570],[897,552]]);
export const RIVER=[[-170,285],[90,325],[283,369],[455,431],[539,483],[537,567],[582,647],[719,744],[837,900]];
export const RIVER_POINTS=curve(RIVER);
export const TOWN_HOUSES=[[443,474],[481,490],[445,513],[696,270],[735,282],[694,311],[1036,365],[1031,407],[171,344],
  [170,387],[200,365],[435,221],[474,233],[503,217],[660,175],[695,190],[728,176],[830,419],[871,428],[908,403],
  [372,590],[405,603],[433,581],[760,626],[798,644],[835,621],[997,505],[1029,527],[1010,555]];
export const TOWN_TREES=Array.from({length:36},(_,i)=>({x:125+(i*157)%925,y:140+(i*83)%530})).filter(p=>DISTRICTS.every(d=>Math.hypot(d.x-p.x,d.y-p.y)>120));
