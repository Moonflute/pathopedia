import {districtDef} from './city-data.mjs';
import {ROADS,FOOD_ROAD} from './city-map.mjs';

// Presentation coordinates only: the shared simulation and its saves stay unchanged.
// Each district owns a courtyard and a separate building site. Facilities can
// expand around these anchors without changing simulation or save coordinates.
export const CITY_3D_SAVE_KEY='pathopedia:cell-city:3d:v1';
export const SITES=Object.freeze({
 heart:{x:0,z:2,building:[0,-.7],label:'박동 광장',color:0xcf7776,detail:true},
 lung:{x:-6,z:-7,building:[-8.7,-9.7],label:'숨결 항구',color:0x81babb,detail:true},
 gut:{x:8,z:-3,building:[10,-4.8],label:'영양 가공소',color:0xdbb66e,detail:true},
 kidney:{x:8,z:8,building:[10.4,9],label:'정화 수로',color:0xb3a2c7,detail:true},
 marrow:{x:-5,z:10,building:[-6.8,12],label:'조혈 공방',color:0xd39bb4,detail:true},
 lymph:{x:-11,z:1,building:[-13.7,.8],label:'항체 공방',color:0xa6b57c,detail:true}
});
const ring=['lung','gut','kidney','marrow','lymph'];
const origin=districtDef('heart'),target=SITES.heart;
const sectors=ring.map((id,i)=>{
 const a=districtDef(id),b=districtDef(ring[(i+1)%ring.length]);
 const ax=a.x-origin.x,ay=a.y-origin.y,bx=b.x-origin.x,by=b.y-origin.y;
 return {a:SITES[id],b:SITES[b.id],ax,ay,bx,by,det:ax*by-ay*bx};
});
export function groundPoint(p){
 const x=p.x-origin.x,y=p.y-origin.y;
 for(const s of sectors){
  const u=(x*s.by-y*s.bx)/s.det,v=(s.ax*y-s.ay*x)/s.det;
  if(u>=-1e-8&&v>=-1e-8)return {x:target.x+u*(s.a.x-target.x)+v*(s.b.x-target.x),z:target.z+u*(s.a.z-target.z)+v*(s.b.z-target.z)};
 }
 return {...target};
}
export const CITY_ROADS=ROADS.map(r=>({...r,points:r.points.map(groundPoint)}));
export const INTAKE_ROAD=FOOD_ROAD.map(groundPoint);
export const RIVER_PATH=[[16,-27],[14,-19],[15,-10],[13,-1],[14,5],[12,11],[17,19],[20,29]];
export const COTTAGES=[
 // Two staggered streets, a wind-harbour hamlet, and workshops around the square.
 [-4,-1.8,1.55,.4],[-4.8,4.4,1.5,-.3],[-2.8,6.3,1.35,-.5],
 [3.8,2.2,1.6,-1.1],[1.4,6.7,1.5,-.7],
 [-11.7,-7.2,1.5,.5],[-11,-4.3,1.25,.7],[-1.4,-6.6,1.45,-1],
 [5.7,-7,1.35,-.3],[-9.5,6.6,1.25,.6],[-1,11.3,1.2,-1]
];
export function qualityProfile(width,dpr=1){const mobile=width<761;return {mobile,dpr:Math.min(dpr,mobile?1.35:1.75),shadow:mobile?512:1024,fps:mobile?30:60,maxCells:96,maxShipments:48,maxEnemies:32};}
