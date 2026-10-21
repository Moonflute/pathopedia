import {CITY_CAPS,CITY_SCALE} from './city-world.mjs';
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
// Facility props, paved access lanes and worker destinations share these anchors.
export function workStationPoints(id,role,slot=0,extension=null){
 if(extension){const n=role==='dock'?0:(slot-3)%3,target=role==='oxygen'?{x:extension.x+2.3,z:extension.z-1.2+n*.95}:{x:extension.x-1+n,z:extension.z+1.3};return {target,stand:role==='oxygen'?{x:target.x+.75,z:target.z}:{x:target.x,z:target.z+.75}};}
 const d=SITES[id];let x=d.x,z=d.z,dx=0,dz=.65;
 if(role==='oxygen'){x+=-1.05+(slot%3)*1.05;z-=.6+Math.floor(slot/3)*1.1;}
 if(role==='oxygen'&&id==='kidney'){x=d.x-1.4;z=d.z-.8+(slot%3)*1.05;dx=-.75;dz=0;}
 if(role==='oxygen'&&id==='lymph')x=d.x+(slot%3)*1.05;
 if(role==='dock'){x+=1.7;z-=.2;dx=-1.15;dz=0;}
 if(role==='rest'){x+=-1.2+(slot%3)*1.1;z+=2.1+Math.floor(slot/3)*1.1;dz=.35;}
 if(role==='rest'&&id==='marrow'){x=d.x+2.1;z=d.z+.4+(slot%3)*1.1;dx=.7;dz=0;}
 if(role==='build'||role==='repair'){[x,z]=BUILD_SITES[id];dx=-.75;dz=0;if(role==='repair'){const angle=slot*Math.PI/3;dx=Math.cos(angle)*.75;dz=Math.sin(angle)*.75;}}
 if(role==='produce'){x+=-.6+(slot%3)*1.1;z+=1.1+Math.floor(slot/3)*1.4;dz=.65;}
 if(role==='fabricate'){x+=1.1+(slot%3)*.9;z+=Math.floor(slot/3)*1.4;dz=.65;}
 if(role==='waste'){x=7;z=10;dx=-.75;dz=0;}
 if(role==='spawn'){x=-8.2+(slot%3)*.8;z=10.4+Math.floor(slot/3)*1.1;dz=-.65;}
 return {target:{x,z},stand:{x:x+dx,z:z+dz}};
}
const BUILD_SITES=Object.freeze({heart:[1.25,3.05],lung:[-7,-5.4],gut:[8,-1.2],kidney:[6.7,9.15],marrow:[-5.7,8.65],lymph:[-11.8,3.75]});
export const lymphocyteBay=slot=>({x:SITES.lymph.x+(slot%6)*.7,z:SITES.lymph.z-.35+Math.floor(slot/6)*.65});
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
// Inverse of the continuous sector transform. Working bays are spaced in world
// metres, then converted back to the shared engine's ground coordinates.
export function groundCoordinate(p){
 const x=p.x-target.x,z=p.z-target.z;
 for(const s of sectors){
  const ax=s.a.x-target.x,az=s.a.z-target.z,bx=s.b.x-target.x,bz=s.b.z-target.z,det=ax*bz-az*bx;
  const u=(x*bz-z*bx)/det,v=(ax*z-az*x)/det;
  if(u>=-1e-8&&v>=-1e-8)return {x:origin.x+u*s.ax+v*s.bx,y:origin.y+u*s.ay+v*s.by};
 }
 return {x:origin.x,y:origin.y};
}
export const CITY_ROADS=ROADS.map(r=>({...r,points:r.points.map(groundPoint)}));
export const INTAKE_ROAD=FOOD_ROAD.map(groundPoint);
export const RIVER_PATH=[[16,-27],[14,-19],[15,-10],[13,-1],[14,5],[12,11],[17,19],[20,29]].map(([x,z])=>[x*CITY_SCALE,z*CITY_SCALE]);
export const COTTAGES=[
 // Two staggered streets, a wind-harbour hamlet, and workshops around the square.
 [-4,-1.8,1.55,.4],[-4.8,4.4,1.5,-.3],[-2.8,6.3,1.35,-.5],
 [3.8,2.2,1.6,-1.1],[1.4,6.7,1.5,-.7],
 [-11.7,-7.2,1.5,.5],[-11,-4.3,1.25,.7],[-1.4,-6.6,1.45,-1],
 [5.7,-7,1.35,-.3],[-9.5,6.6,1.25,.6],[-1,11.3,1.2,-1]
];
export function qualityProfile(width,dpr=1,level=0){
 const mobile=width<761,tier=Math.max(0,Math.min(4,Math.floor(level))),base=Math.min(dpr,mobile?1.35:1.75);
 return {mobile,level:tier,dpr:Math.min(base,Math.max(.75,base*[1,.85,.72,.63,.63][tier])),shadow:tier>=3?0:(mobile?512:1024)/(tier>=2?2:1),shadowInterval:tier>=2?400:200,fps:tier===4?30:60,maxCells:CITY_CAPS.cells,maxShipments:CITY_CAPS.shipments,maxEnemies:CITY_CAPS.enemies};
}
// Orthographic zoom changes the ray origins, not camera distance. At overview
// scale the bottom rays must still start above the ground, including portrait.
export function landscapeCameraRange(span,zoom,elevation){
 const half=Math.max(1,span)/(2*Math.max(.0001,zoom)),height=Math.max(.1,Math.min(1,elevation));
 const distance=Math.max(80,(half+24)/height);
 return {distance,far:distance+Math.max(400,half*4),fogNear:distance+140,fogFar:distance+380};
}
