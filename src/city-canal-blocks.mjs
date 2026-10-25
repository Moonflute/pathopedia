// Waterfront infill is scenery compiled around the saved town. It yields to
// every real footprint, loading bay and navigable channel when the town changes.
import {siteAt,layoutPlaceables,occupiedTiles} from './city-tile-layout.mjs';
import {CITY_ENTRIES,storedPlacement} from './city-world.mjs';
import {compileVascularLayout} from './city-vascular-layout.mjs';

const STEP=.5,key=(x,z)=>x+','+z;
export function compileCanalBlocks(layout,network,channels,land,outlet){
 const reserved=new Set(),frontages=[],gardens=[],tissues=[],lung=[],walks=[];
 // The common town must leave both theme silhouettes clear before any house
 // is placed, otherwise the square avenue gets pushed into a zigzag slalom.
 const boulevards=compileVascularLayout(layout,'square').vessels.filter(v=>v.id.startsWith('systemic-')).map(v=>[v.points,v.width*.725+.25]);
 for(const [points,radius] of [...Object.values(network.entries).map(points=>[points,1.8]),...(outlet?[[outlet.points,.65]]:[]),...boulevards])for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2);for(let j=0;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};for(let x=Math.floor((p.x-radius)/STEP);x<=Math.floor((p.x+radius)/STEP);x++)for(let z=Math.floor((p.z-radius)/STEP);z<=Math.floor((p.z+radius)/STEP);z++)reserved.add(key(x,z));}}
 for(const d of layoutPlaceables(layout))if(!storedPlacement(layout.items[d.id]))for(const p of occupiedTiles(d.id,layout.items[d.id])){
  for(let x=Math.floor((p.col-.8)/STEP);x<=Math.floor((p.col+.8)/STEP);x++)for(let z=Math.floor((p.row-.8)/STEP);z<=Math.floor((p.row+.8)/STEP);z++)reserved.add(key(x,z));
 }
 const centres=['heart','lung','gut','kidney','marrow','lymph'].map(id=>({id,...siteAt(layout,id),radius:id==='heart'?6:4.3}));
 const nearest=p=>centres.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b);
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
 const reserve=footprint=>footprint.forEach(k=>reserved.add(k));
 // Public space is planned before infill, so each district has a recognisable
 // meeting place instead of inheriting whatever tiny hole the houses leave.
 const roles={heart:'market',lung:'wind',gut:'harvest',kidney:'water',marrow:'workshop',lymph:'cloister'};
 for(const centre of centres){
  const candidates=[];
  for(let dz=-18;dz<=18;dz++)for(let dx=-18;dx<=18;dx++){
   const p={x:centre.x+dx+.25,z:centre.z+dz+.25},distance=Math.hypot(dx,dz);
   if(distance>18||!clear(p)||gardens.some(g=>Math.hypot(g.x-p.x,g.z-p.z)<7))continue;
   // Favour the building's neighbourhood, with the heart's square on its south side.
   candidates.push({...p,score:distance+(nearest(p).id===centre.id?0:8)+(centre.id==='heart'&&dz<0?5:0)});
  }
  candidates.sort((a,b)=>a.score-b.score);
  let court=null,best=Infinity;
  for(const [w,d] of [[5.5,4.5],[4.5,3.5],[3.5,3.5],[2.5,2.5]]){
   const p=candidates.find(p=>cells(p,w,d,0));if(!p)continue;
   const score=p.score+(5.5-w)*1.5;if(score>=best)continue;best=score;
   court={x:p.x,z:p.z,w,d,angle:0,variant:gardens.length,district:centre.id,kind:roles[centre.id],cells:cells(p,w,d,0)};
  }
  if(court){reserve(court.cells);gardens.push(court);}
 }
 // Short courts have fronts on three sides, and one open approach. The same
 // entrances become cottage lanes or stone campi in the two presentations.
 for(const court of gardens){
  const candidates=[[-court.w/2-1.25,-.8,Math.PI/2],[-court.w/2-1.25,1.9,Math.PI/2],[court.w/2+1.25,-.8,-Math.PI/2],[court.w/2+1.25,1.9,-Math.PI/2],[-1.35,-court.d/2-1.25,0],[1.35,-court.d/2-1.25,0]];
  let count=0;
  for(const [dx,dz,angle] of candidates){
   if(count===4)break;const p={x:court.x+dx,z:court.z+dz},w=1.65,d=1.6,footprint=cells(p,w,d,angle);if(!footprint||!clear(p))continue;
   const entry={x:p.x+Math.sin(angle)*(d/2+.15),z:p.z+Math.cos(angle)*(d/2+.15)},end={x:Math.max(court.x-court.w/2,Math.min(court.x+court.w/2,entry.x)),z:Math.max(court.z-court.d/2,Math.min(court.z+court.d/2,entry.z))};
   const length=Math.hypot(end.x-entry.x,end.z-entry.z),lane=[],allowed=new Set([...court.cells,...footprint]);let connected=true;
   for(let n=0;n<=Math.ceil(length*4);n++){
    const t=n/Math.max(1,Math.ceil(length*4)),x=entry.x+(end.x-entry.x)*t,z=entry.z+(end.z-entry.z)*t;
    for(let ix=Math.floor((x-.42)/STEP);ix<=Math.floor((x+.42)/STEP);ix++)for(let iz=Math.floor((z-.42)/STEP);iz<=Math.floor((z+.42)/STEP);iz++){
     const k=key(ix,iz);if(!land.has(k)||reserved.has(k)&&!allowed.has(k))connected=false;lane.push(k);
    }
   }
   if(!connected)continue;reserve(footprint);reserve(lane);count++;
   frontages.push({...p,w,d,angle,variant:frontages.length,district:court.district,court:court.district,cells:footprint});walks.push({points:[entry,end],width:.72,cells:[...new Set(lane)]});
  }
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
   frontages.push({...p,w,d,angle,variant,district:nearest(p).id,cells:footprint});
  }
 }
 // Quiet courts give the dense waterfront a few deliberate breaks.
 for(let z=-29;z<=30;z+=6)for(let x=-34;x<=32;x+=6){
  const p={x:x+(Math.round(z)%2)*.5,z};if(gardens.length>=12||!clear(p)||gardens.some(g=>Math.hypot(g.x-p.x,g.z-p.z)<8))continue;
  const footprint=cells(p,3.5,3.5,0);if(!footprint)continue;
  footprint.forEach(k=>reserved.add(k));gardens.push({...p,w:3.5,d:3.5,kind:'orchard',district:nearest(p).id,variant:gardens.length,cells:footprint});
  if(gardens.length>=12)break;
 }
 // Short bank-side walks give long frontages an address and a dry promenade.
 // They are scenery on existing land, never new bridges or transport edges.
 let promenades=0;
 for(const {a,b,length,width} of segments){
  const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length,angle=Math.abs(dx)>.5?0:Math.PI/2;
  for(let along=3;along<length-2;along+=6)for(const side of [-1,1]){
   if(promenades>=22)break;
   const offset=width/2+1.05,p={x:a.x+dx*along-dz*offset*side,z:a.z+dz*along+dx*offset*side},span=Math.min(4.5,length-2);
   const footprint=cells(p,span,.7,angle);if(!footprint||!clear(p))continue;
   reserve(footprint);promenades++;walks.push({kind:'promenade',width:.7,cells:footprint,points:[{x:p.x-dx*span/2,z:p.z-dz*span/2},{x:p.x+dx*span/2,z:p.z+dz*span/2}]});
  }
 }
 // Alternate quiet corners with housing; garden trees stay off the patrol strip.
 for(let z=-33;z<=33;z+=5.5)for(let x=-33;x<=33;x+=5.5){
  const p={x,z};if(gardens.length>=20||!clear(p)||gardens.some(g=>Math.hypot(g.x-x,g.z-z)<4.5))continue;
  const footprint=cells(p,1.8,1.8,0);if(!footprint)continue;
  reserve(footprint);gardens.push({...p,w:1.8,d:1.8,kind:'grove',district:nearest(p).id,variant:gardens.length,cells:footprint});
 }
 // Small houses form four-home blocks. Shared cross lanes and planted corners
 // replace the old uninterrupted carpet of identical south-facing roofs.
 for(let z=-49;z<=49;z+=4.8)for(let x=-49;x<=49;x+=4.8){
  const centre={x:x+1.1,z:z+1.5},lane=cells(centre,3.6,.6,0),first=tissues.length;
  if(lane)reserve(lane);
  for(const [dx,dz,angle] of [[0,0,0],[2.2,0,0],[0,3,Math.PI],[2.2,3,Math.PI]]){
   const p={x:x+dx,z:z+dz};if(!clear(p)||tissues.length>=300)continue;const footprint=cells(p,1.35,1.35,angle);if(!footprint)continue;
   reserve(footprint);tissues.push({...p,angle,variant:tissues.length,district:nearest(centre).id,neighbourhood:key(x,z)});
  }
  if(lane&&tissues.length-first>=2)walks.push({points:[{x:x-.6,z:centre.z},{x:x+2.8,z:centre.z}],width:.6,cells:lane});
  else if(lane)lane.forEach(k=>reserved.delete(k));
 }
 return {frontages,gardens,tissues,lung,walks};
}
