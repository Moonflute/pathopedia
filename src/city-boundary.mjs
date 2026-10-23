// Fourteen persistent skin sectors, each rendered as eight short curved pieces.
export const CITY_RADIUS=58;
export const WALL_SECTORS=14;
export const WALL_ARC_STEPS=8;
const step=Math.PI*2/WALL_SECTORS;
const start=Math.atan2(-Math.sqrt(CITY_RADIUS**2-12**2),-12)-step*1.5;
export const rimPoint=(angle,radius=CITY_RADIUS)=>({x:Math.cos(angle)*radius,z:Math.sin(angle)*radius});
export const insideCity=(x,z,margin=0)=>Math.hypot(x,z)<=CITY_RADIUS-margin;
export const RIM_WALLS=Array.from({length:WALL_SECTORS},(_,id)=>{
 const angle=start+(id+.5)*step,points=Array.from({length:WALL_ARC_STEPS+1},(_,n)=>rimPoint(start+(id+n/WALL_ARC_STEPS)*step));
 return {id,angle,points,a:points[0],b:points.at(-1),...rimPoint(angle),nx:Math.cos(angle),nz:Math.sin(angle)};
});
export const RIM_PERIMETER=RIM_WALLS.flatMap(w=>w.points.slice(0,-1).map(p=>[p.x,p.z]));
export const AIRWAY_PORTAL={x:-12,z:-Math.sqrt(CITY_RADIUS**2-12**2)};
export const GUT_PORTAL={x:Math.sqrt(CITY_RADIUS**2-8**2),z:-8};
export function wallPieces(wall){
 return wall.points.slice(1).map((b,i)=>{const a=wall.points[i],x=(a.x+b.x)/2,z=(a.z+b.z)/2;return {a,b,x,z,length:Math.hypot(b.x-a.x,b.z-a.z),angle:-Math.atan2(b.z-a.z,b.x-a.x)};})
  .filter(p=>[AIRWAY_PORTAL,GUT_PORTAL].every(g=>Math.hypot(p.x-g.x,p.z-g.z)>2.25));
}
