import {CITY_SCALE,CITY_ENTRIES} from './city-world.mjs';
import {DISTRICTS} from './city-data.mjs';
import {groundCoordinate,SITES,COTTAGES} from './city-three-layout.mjs';

export const PERIMETER=[[-18,-12],[-12,-17],[-5,-18],[4,-16],[13,-12],[18,-5],[19,4],[16,13],[7,17],[-3,18],[-13,16],[-19,9],[-21,1],[-21,-6]].map(([x,z])=>[x*CITY_SCALE,z*CITY_SCALE]);
export const WALLS=PERIMETER.map(([x,z],i)=>{
 const [bx,bz]=PERIMETER[(i+1)%PERIMETER.length],mx=(x+bx)/2,mz=(z+bz)/2,length=Math.hypot(mx,mz),nx=mx/length,nz=mz/length;
 const district=Object.entries(SITES).reduce((a,b)=>Math.hypot(a[1].x-mx,a[1].z-mz)<Math.hypot(b[1].x-mx,b[1].z-mz)?a:b)[0];
 return {id:i,name:'피부 '+String(i+1).padStart(2,'0'),a:{x,z},b:{x:bx,z:bz},x:mx,z:mz,nx,nz,district,point:groundCoordinate({x:mx,z:mz}),inside:groundCoordinate({x:mx-nx*1.6,z:mz-nz*1.6}),outside:groundCoordinate({x:mx+nx*1.2,z:mz+nz*1.2})};
});
export const WALL_COVERAGE=Object.fromEntries(Object.entries(SITES).map(([id,p])=>[id,[...WALLS].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,3).map(w=>w.id)]));
export const WORKSHOP={x:-16,z:8};
export const AIRWAY=CITY_ENTRIES.airway.portal;
export const AIRWAY_PATH=[CITY_ENTRIES.airway.start,AIRWAY,CITY_ENTRIES.airway.screen,CITY_ENTRIES.airway.gate,{x:-6,z:-7}].map(groundCoordinate);
export const FRONTS={
 skin:{name:'피부',district:'marrow',x:-16,z:8,depot:{x:-15,z:10}},
 airway:{name:'호흡기',district:'lung',...CITY_ENTRIES.airway.gate,depot:{x:-3.4,z:-11.8}},
 gut:{name:'소화기',district:'gut',...CITY_ENTRIES.gut.portal,depot:{x:11.7,z:-.2}}
};
export const TISSUES=[0,4,7,9].map((index,i)=>{const [x,z]=COTTAGES[index],district=Object.entries(SITES).reduce((a,b)=>Math.hypot(a[1].x-x,a[1].z-z)<Math.hypot(b[1].x-x,b[1].z-z)?a:b)[0];return {id:i,index,x,z,district,point:groundCoordinate({x,z:z+1.4}),name:'조직 '+(i+1)};});
export const INVESTMENTS={barrier:{name:'장벽 보강',cost:26},sensor:{name:'감지 초소',cost:24},supply:{name:'보급 확장',cost:28},production:{name:'생산칸',cost:32}};
export const supportCount=(s,id,kind)=>s.frontier?.plots[id]?.filter(p=>p===kind).length||0;
export const wallState=(w,max=100)=>w.repair?'복구':w.hp===0?'파손':w.hp<max*.75?'손상':'정상';
export const districtName=id=>DISTRICTS.find(d=>d.id===id)?.short||'';
