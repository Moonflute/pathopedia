// Waterfront infill is scenery compiled around the saved town. It yields to
// every real footprint, loading bay and navigable channel when the town changes.
import {siteAt,layoutPlaceables,occupiedTiles} from './city-tile-layout.mjs';
import {CITY_ENTRIES,storedPlacement} from './city-world.mjs';
import {compileVascularLayout} from './city-vascular-layout.mjs';
import {gridPath} from './city-grid-path.mjs';

const STEP=.5,key=(x,z)=>x+','+z;
// Frontage spacing follows distance along the bank, not curve tessellation.
function bankSections(channel){
 const points=channel.points,lengths=[0],sections=[];
 for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
 let index=1;
 const at=d=>{while(index<points.length-1&&lengths[index]<d)index++;const a=points[index-1],b=points[index],t=(d-lengths[index-1])/(lengths[index]-lengths[index-1]||1);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};};
 for(let d=0;d+3.1<lengths.at(-1);d+=6.4){
  const a=at(d),b=at(Math.min(d+6.4,lengths.at(-1))),length=Math.hypot(b.x-a.x,b.z-a.z);
  if(length>=3.1)sections.push({a,b,length,width:channel.width});
 }
 return sections;
}
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
 const architecture={heart:'hall',lung:'merchant',gut:'warehouse',kidney:'cloister',marrow:'guildhall',lymph:'cloister'};
 const dryRoads=[...network.roadCells.keys()].map(k=>{const [x,z]=k.split(',').map(Number);return {x,z};}).filter(p=>land.has(key(Math.floor(p.x/STEP),Math.floor(p.z/STEP)))&&!network.occupied.has(key(p.x,p.z)));
 function approach(start,plot,building){
  const own=new Set(plot),solid=new Set(building);
  const free=p=>{
   for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
    const x=p.col+dx,z=p.row+dz,k=key(x,z),cell=key(Math.round((x+.5)*STEP),Math.round((z+.5)*STEP));
    if(!land.has(k)||solid.has(k)||network.occupied.has(cell)||reserved.has(k)&&!own.has(k)&&!network.roadCells.has(cell))return false;
   }return true;
  };
  const targets=dryRoads.filter(p=>Math.hypot(p.x-start.x,p.z-start.z)<12).sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));
  for(const p of targets.slice(0,6)){
   const path=gridPath({col:Math.floor(start.x/STEP),row:Math.floor(start.z/STEP)},{col:Math.floor(p.x/STEP),row:Math.floor(p.z/STEP)},free,()=>1,1800);
   if(!path)continue;
   const points=path.map(p=>({x:(p.x+.5)*STEP,z:(p.z+.5)*STEP})),footprint=new Set();
   for(const p of path)for(const dx of [-1,0,1])for(const dz of [-1,0,1])footprint.add(key(p.x+dx,p.z+dz));
   return {kind:'district-lane',points:points.filter((p,i)=>!i||i===points.length-1||(p.x-points[i-1].x)*(points[i+1].z-p.z)!==(p.z-points[i-1].z)*(points[i+1].x-p.x)),width:1.05,cells:[...footprint]};
  }
  return null;
 }
 for(const centre of centres){
  const candidates=[];
  for(let dz=-27;dz<=27;dz++)for(let dx=-27;dx<=27;dx++){
   const p={x:centre.x+dx+.25,z:centre.z+dz+.25},distance=Math.hypot(dx,dz);
   if(distance>27||!clear(p)||gardens.some(g=>Math.hypot(g.x-p.x,g.z-p.z)<8))continue;
   // Favour the building's neighbourhood, with the heart's square on its south side.
   candidates.push({...p,score:distance+(nearest(p).id===centre.id?0:8)+(centre.id==='heart'&&dz<0?5:0)});
  }
  candidates.sort((a,b)=>a.score-b.score);
  // Give a large civic frontage and its square one complete dry plot before
  // tiny infill consumes it. Both themes and the pilot use these same bounds.
  let estate=null;
  for(const [w,d] of [[8,8.5],[7,7],[6,6]]){
   if(estate)break;
   for(const p of candidates){
    const plot=cells(p,w,d,0);if(!plot)continue;
    const hall={x:p.x,z:p.z-d*.26,w:w-.45,d:d*.44,angle:0,variant:frontages.length,district:centre.id,architecture:architecture[centre.id],height:centre.id==='heart'?5.4:4.5+(frontages.length%2)*.55};
    const square={x:p.x,z:p.z+d*.24,w:w-.45,d:d*.46,angle:0,variant:gardens.length,district:centre.id,kind:roles[centre.id],estate:true};
    hall.cells=cells(hall,hall.w,hall.d,0);square.cells=cells(square,square.w,square.d,0);if(!hall.cells||!square.cells)continue;
    const lane=approach({x:square.x,z:square.z},plot,hall.cells);if(!lane)continue;
    estate={hall,square,plot,lane};break;
   }
  }
  if(estate){
   reserve(estate.plot);reserve(estate.lane.cells);frontages.push(estate.hall);gardens.push(estate.square);walks.push(estate.lane);
   continue;
  }
  let court=null,best=Infinity;
  for(const [w,d] of [[7.5,5.5],[5.5,4.5],[4.5,3.5],[3.5,3.5],[2.5,2.5]]){
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
 const frontageGuides=[...channels,...Object.values(network.entries).map(points=>({points,width:2.2}))];
 for(const channel of frontageGuides)for(let i=1;i<channel.points.length;i++){
  const a=channel.points[i-1],b=channel.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
  if(length<5||Math.abs(a.x-b.x)>.01&&Math.abs(a.z-b.z)>.01)continue;
  segments.push({a,b,length,width:channel.width});
 }
 // Long banks and dry duct corridors form connected rows.
 segments.sort((a,b)=>b.length-a.length);
 const ringLots=channels.filter(channel=>channel.id?.startsWith('systemic-')).flatMap(bankSections);
 for(const {a,b,length,width} of [...segments,...ringLots]){
  const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length,slots=Math.floor(length/3.1),spacing=length/slots;
  for(let n=0;n<slots;n++)for(const side of [-1,1]){
   if(frontages.length>=108)break;
   const w=Math.min(2.7,spacing-.3),d=2.3,t=(n+.5)/slots;
   const angle=Math.round(Math.atan2(dz*side,-dx*side)/(Math.PI/2))*Math.PI/2;
   const reach=Math.abs(dx*Math.sin(angle)+dz*Math.cos(angle))*w/2+Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle))*d/2;
   const offset=width/2+reach+.8;
   const p={x:a.x+(b.x-a.x)*t-dz*offset*side,z:a.z+(b.z-a.z)*t+dx*offset*side};
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
 for(const {a,b,length,width} of [...segments,...ringLots]){
  const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
  for(let along=3;along<length-2;along+=6)for(const side of [-1,1]){
   if(promenades>=22)break;
   let walk=null;
   for(const span of [Math.min(4.5,length-2),2.4])for(const setback of [1.05,1.5,2.1]){
    const offset=width/2+setback,p={x:a.x+dx*along-dz*offset*side,z:a.z+dz*along+dx*offset*side};
    const footprint=cells(p,Math.abs(dx)*span+.7,Math.abs(dz)*span+.7,0);if(walk||!footprint||!clear(p))continue;
    walk={kind:'promenade',width:.7,cells:footprint,points:[{x:p.x-dx*span/2,z:p.z-dz*span/2},{x:p.x+dx*span/2,z:p.z+dz*span/2}]};
   }
   if(walk){reserve(walk.cells);promenades++;walks.push(walk);}
  }
 }
 // Alternate quiet corners with housing; garden trees stay off the patrol strip.
 for(let z=-33;z<=33;z+=5.5)for(let x=-33;x<=33;x+=5.5){
  const p={x,z};if(gardens.length>=20||!clear(p)||gardens.some(g=>Math.hypot(g.x-x,g.z-z)<4.5))continue;
  const footprint=cells(p,1.8,1.8,0);if(!footprint)continue;
  reserve(footprint);gardens.push({...p,w:1.8,d:1.8,kind:'grove',district:nearest(p).id,variant:gardens.length,cells:footprint});
 }
 // Joined two-bay houses frame a narrow alley. Cap their count and reserve
 // the entire dry block before filling the remaining space with tiny homes.
 const terraceCandidates=[];
 for(let z=-47;z<=47;z+=1.5)for(let x=-47;x<=47;x+=1.5){const p={x:x+.25,z:z+.25};if(clear(p)){const district=nearest(p);terraceCandidates.push({...p,district:district.id,score:Math.hypot(p.x-district.x,p.z-district.z)});}}
 terraceCandidates.sort((a,b)=>a.score-b.score);
 let terraces=0;
 for(const centre of terraceCandidates){
  if(terraces===8)break;const plot=cells(centre,3.8,4.2,0);if(!plot)continue;
  const rows=[-1,1].map((side,n)=>({x:centre.x,z:centre.z+side*1.25,w:3.4,d:1.4,height:2.5+(terraces%3)*.3,angle:n?Math.PI:0,architecture:'terrace',district:centre.district,variant:frontages.length+n}));
  for(const row of rows)row.cells=cells(row,row.w,row.d,row.angle);
  if(rows.some(r=>!r.cells))continue;
  const cross=cells(centre,3.8,.9,0);if(!cross)continue;
  reserve(plot);frontages.push(...rows);terraces++;
  walks.push({kind:'residential-alley',width:.9,points:[{x:centre.x-1.8,z:centre.z},{x:centre.x+1.8,z:centre.z}],cells:cross});
 }
 // Smaller four-home groups keep opposite front doors facing a shared lane.
 for(let z=-49;z<=49;z+=4.8)for(let x=-49;x<=49;x+=4.8){
  const centre={x:x+1.1,z:z+1.5};
  const lane=cells(centre,3.6,.6,0),first=tissues.length;
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
