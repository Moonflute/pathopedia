// Waterfront infill is scenery compiled around the saved town. It yields to
// every real footprint, loading bay and navigable channel when the town changes.
import {siteAt,layoutPlaceables,occupiedTiles} from './city-tile-layout.mjs';
import {CITY_ENTRIES,storedPlacement} from './city-world.mjs';

const STEP=.5,key=(x,z)=>x+','+z;
export function compileCanalBlocks(layout,network,channels,land,outlet){
 const reserved=new Set(),frontages=[],gardens=[],tissues=[],lung=[];
 for(const [points,radius] of [...Object.values(network.entries).map(points=>[points,1.8]),...(outlet?[[outlet.points,.65]]:[])])for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2);for(let j=0;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};for(let x=Math.floor((p.x-radius)/STEP);x<=Math.floor((p.x+radius)/STEP);x++)for(let z=Math.floor((p.z-radius)/STEP);z<=Math.floor((p.z+radius)/STEP);z++)reserved.add(key(x,z));}}
 for(const d of layoutPlaceables(layout))if(!storedPlacement(layout.items[d.id]))for(const p of occupiedTiles(d.id,layout.items[d.id])){
  for(let x=Math.floor((p.col-.8)/STEP);x<=Math.floor((p.col+.8)/STEP);x++)for(let z=Math.floor((p.row-.8)/STEP);z<=Math.floor((p.row+.8)/STEP);z++)reserved.add(key(x,z));
 }
 const centres=['heart','lung','gut','kidney','marrow','lymph'].map(id=>({...siteAt(layout,id),radius:id==='heart'?6:4.3}));
 const clear=p=>!centres.some(c=>Math.hypot(c.x-p.x,c.z-p.z)<c.radius)&&Object.values(CITY_ENTRIES).every(e=>Math.hypot(e.portal.x-p.x,e.portal.z-p.z)>4)&&(!outlet||Math.hypot(outlet.portal.x-p.x,outlet.portal.z-p.z)>4);
 function cells(p,w,d,angle){
  const horizontal=Math.abs(Math.sin(angle))<.5,hx=(horizontal?w:d)/2+.12,hz=(horizontal?d:w)/2+.12,result=[];
  for(let x=Math.floor((p.x-hx)/STEP);x<=Math.floor((p.x+hx)/STEP);x++)for(let z=Math.floor((p.z-hz)/STEP);z<=Math.floor((p.z+hz)/STEP);z++){
   const k=key(x,z),cx=(x+.5)*STEP,cz=(z+.5)*STEP;
   const cell=key(Math.round(cx),Math.round(cz));if(!land.has(k)||reserved.has(k)||network.roadCells.has(cell)||network.occupied.has(cell))return null;result.push(k);
  }
  return result;
 }
 // Reserve a larger working wind garden before ordinary infill is placed.
 const lungCentre=siteAt(layout,'lung');
 const lungLots=[];for(let dz=-14;dz<=5;dz+=3.2)for(let dx=-14;dx<=14;dx+=3.2)if(Math.hypot(dx,dz)<15&&Math.hypot(dx,dz)>5)lungLots.push([dx,dz]);lungLots.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
 for(const [dx,dz] of [[-1,-11],[-4,-11],[2,-11],[-7,-9],[5,-9],[-8,-5],[6,-5],[-5,-8],[2,-8],[5,2],...lungLots]){
  const p={x:lungCentre.x+dx,z:lungCentre.z+dz},footprint=cells(p,2.6,2.8,0);if(!footprint)continue;
  footprint.forEach(k=>reserved.add(k));lung.push({...p,variant:lung.length});if(lung.length===6)break;
 }
 const segments=[];
 for(const channel of channels)for(let i=1;i<channel.points.length;i++){
  const a=channel.points[i-1],b=channel.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
  if(length<5||Math.abs(a.x-b.x)>.01&&Math.abs(a.z-b.z)>.01)continue;
  segments.push({a,b,length,width:channel.width});
 }
 // Long banks form connected rows. Short local service branches stay open.
 segments.sort((a,b)=>b.length-a.length);
 for(const {a,b,length,width} of segments){
  const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length,slots=Math.floor(length/3.1),spacing=length/slots;
  for(let n=0;n<slots;n++)for(const side of [-1,1]){
   if(frontages.length>=108)break;
   const w=Math.min(2.7,spacing-.3),d=2.3,offset=width/2+d/2+.8,t=(n+.5)/slots;
   const p={x:a.x+(b.x-a.x)*t-dz*offset*side,z:a.z+(b.z-a.z)*t+dx*offset*side},angle=Math.atan2(dz*side,-dx*side);
   if(!clear(p))continue;const footprint=cells(p,w,d,angle);if(!footprint)continue;
   footprint.forEach(k=>reserved.add(k));const variant=Math.abs(Math.round(p.x*13+p.z*19));
   frontages.push({...p,w,d,angle,variant,cells:footprint});
  }
 }
 // Quiet courts give the dense waterfront a few deliberate breaks.
 for(let z=-29;z<=30;z+=6)for(let x=-34;x<=32;x+=6){
  const p={x:x+(Math.round(z)%2)*.5,z};if(gardens.length>=16||!clear(p)||gardens.some(g=>Math.hypot(g.x-p.x,g.z-p.z)<8))continue;
  const footprint=cells(p,3.5,3.5,0);if(!footprint)continue;
  footprint.forEach(k=>reserved.add(k));gardens.push({...p,variant:gardens.length,cells:footprint});
  if(gardens.length>=16)break;
 }
 for(let z=-41;z<=41;z+=2.2)for(let x=-41;x<=41;x+=2.2){
  const p={x,z};if(!clear(p)||tissues.length>=320)continue;const footprint=cells(p,1.35,1.35,0);if(!footprint)continue;
  footprint.forEach(k=>reserved.add(k));tissues.push({...p,variant:tissues.length});
 }
 return {frontages,gardens,tissues,lung};
}
