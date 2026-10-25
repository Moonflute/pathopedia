import {compileLayout,layoutPlaceables,occupiedTiles,transformPoint} from './city-tile-layout.mjs';
import {CITY_BOUNDS,storedPlacement} from './city-world.mjs';
import {compileVascularLayout} from './city-vascular-layout.mjs';
import {PERIMETER,WALLS} from './city-frontier-data.mjs';
import {gridPath} from './city-grid-path.mjs';
import {compileCanalBlocks} from './city-canal-blocks.mjs';
import {wallPieces} from './city-boundary.mjs';
import {compileCanalShore} from './city-canal-shore.mjs';

// Main vessels, exchange beds and local service canals cut one continuous city.
const cache=new WeakMap(),STEP=.5;
const key=(x,z)=>x+','+z;
const distance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
function insideBank(x,z){let inside=false;for(let i=0,j=PERIMETER.length-1;i<PERIMETER.length;j=i++){const a=PERIMETER[i],b=PERIMETER[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function kidneyOutlet(layout,network){
 if(storedPlacement(layout.items.kidney))return null;
 const inlet=transformPoint(layout,'kidney',{x:14.1,z:9}),start={col:Math.round(inlet.x),row:Math.round(inlet.z)},candidates=[];
 const allowed=p=>insideBank(p.col,p.row)&&(!network.occupied.has(key(p.col,p.row))||network.occupied.get(key(p.col,p.row))==='kidney');
 for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]])for(const wall of WALLS)for(const {a,b} of wallPieces(wall)){
  const sx=b.x-a.x,sz=b.z-a.z,den=dx*sz-dz*sx;if(Math.abs(den)<1e-6)continue;
  const ax=a.x-inlet.x,az=a.z-inlet.z,t=(ax*sz-az*sx)/den,u=(ax*dz-az*dx)/den;
  if(t<2||u<.08||u>.92||wall.id===1||wall.id===5)continue;
  const portal={x:inlet.x+dx*t,z:inlet.z+dz*t},approach={col:Math.round(portal.x-dx*1.5),row:Math.round(portal.z-dz*1.5)};
  if(!allowed(approach))continue;
  // A dedicated utility pipe avoids buildings and favours dry ground over the
  // blood network. It never becomes a transport edge or an extra blood exit.
  const middle=gridPath(start,approach,allowed,p=>network.roadCells.has(key(p.col,p.row))?5:1);
  if(!middle)continue;
  const end={x:portal.x+dx*2,z:portal.z+dz*2},raw=[inlet,...middle,portal,end];
  const points=raw.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>1e-6).filter((p,i,a)=>!i||i===a.length-1||Math.abs((p.x-a[i-1].x)*(a[i+1].z-p.z)-(p.z-a[i-1].z)*(a[i+1].x-p.x))>1e-6);
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
  const crossings=middle.filter(p=>network.roadCells.has(key(p.x,p.z))).length;
  candidates.push({id:'kidney-outlet',points,lengths,length:lengths.at(-1),portal,end,dx,dz,wallId:wall.id,width:.55,score:lengths.at(-1)+crossings*2});
 }
 return candidates.sort((a,b)=>a.score-b.score)[0]||null;
}
export function compileCanalLayout(layout){
 if(!layout)return null;if(cache.has(layout))return cache.get(layout);
 const network=compileLayout(layout),vascular=compileVascularLayout(layout),channels=[
  ...Object.values(network.entries).map(points=>({points,width:2.1,kind:'entry'})),
  // Local blood beds replace the former theme-1 street grid.
  ...vascular.vessels,
  ...vascular.beds.flatMap(b=>b.branches.map(points=>({points,width:b.width,kind:'capillary'})))
 ];
 const water=new Set();
 for(const {points,width} of channels)for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],r=width/2+.08;
  for(let x=Math.floor((Math.min(a.x,b.x)-r)/STEP);x<=Math.floor((Math.max(a.x,b.x)+r)/STEP);x++)
   for(let z=Math.floor((Math.min(a.z,b.z)-r)/STEP);z<=Math.floor((Math.max(a.z,b.z)+r)/STEP);z++)
    if(distance({x:(x+.5)*STEP,z:(z+.5)*STEP},a,b)<r+STEP*.5)water.add(key(x,z));
 }
 const parcels=layoutPlaceables(layout).filter(d=>!storedPlacement(layout.items[d.id])).map(d=>{
  const tiles=occupiedTiles(d.id,layout.items[d.id]),xs=tiles.map(p=>p.col),zs=tiles.map(p=>p.row);
  return {id:d.id,left:Math.min(...xs)-.5,right:Math.max(...xs)+.5,top:Math.min(...zs)-.5,bottom:Math.max(...zs)+.5};
 });
 const land=new Set(),rows=[];
 const left=Math.floor(CITY_BOUNDS.left/STEP),right=Math.ceil(CITY_BOUNDS.right/STEP),top=Math.floor(CITY_BOUNDS.top/STEP),bottom=Math.ceil(CITY_BOUNDS.bottom/STEP);
 for(let z=top;z<bottom;z++)for(let x=left;x<right;x++){
  const p={x:(x+.5)*STEP,z:(z+.5)*STEP},solid=network.occupied.has(key(Math.round(p.x),Math.round(p.z)));
  // Theme 2 fills the former river setback right up to the city wall. Only real
  // circulation/access channels remain water inside the harbour perimeter.
  if(water.has(key(x,z))&&!solid||!insideBank(p.x-.35,p.z-.35)||!insideBank(p.x+.35,p.z+.35))continue;
  land.add(key(x,z));
 }
 // Remove tiny paving scraps between service canals. Keep larger city blocks
 // intact so the canals have continuous banks and room for existing expansion.
 const visited=new Set();
 for(const seed of land){if(visited.has(seed))continue;const cells=[seed];visited.add(seed);let anchored=false;
  for(let i=0;i<cells.length;i++){const [x,z]=cells[i].split(',').map(Number);anchored ||= network.occupied.has(key(Math.round((x+.5)*STEP),Math.round((z+.5)*STEP)));
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=key(x+dx,z+dz);if(land.has(k)&&!visited.has(k)){visited.add(k);cells.push(k);}}
  }
  if(!anchored&&cells.length<20)for(const k of cells)land.delete(k);
 }
 // Merge contiguous top faces. Boundary faces are emitted only at the waterline.
 for(let z=top;z<bottom;z++)for(let x=left;x<right;){if(!land.has(key(x,z))){x++;continue;}const start=x;while(x<right&&land.has(key(x,z)))x++;rows.push({x:start*STEP,z:z*STEP,w:(x-start)*STEP,d:STEP});}
 const edges=[];
 for(const k of land){const [x,z]=k.split(',').map(Number),a=x*STEP,b=z*STEP;
  if(!land.has(key(x,z-1)))edges.push([a,b,a+STEP,b]);
  if(!land.has(key(x+1,z)))edges.push([a+STEP,b,a+STEP,b+STEP]);
  if(!land.has(key(x,z+1)))edges.push([a+STEP,b+STEP,a,b+STEP]);
  if(!land.has(key(x-1,z)))edges.push([a,b+STEP,a,b]);
 }
 const flows=vascular.vessels.filter(r=>r.length>0);
 const outlet=kidneyOutlet(layout,network),blocks=compileCanalBlocks(layout,network,channels,land,outlet);
 const shore=compileCanalShore(edges);
 const result={channels,parcels,rows,edges,flows,vascular,outlet,blocks,shore,patrol:network.access.filter(r=>r.kind==='patrol'),entries:network.entries,isWater:p=>!shore.isLand(p)};
 cache.set(layout,result);return result;
}
export function canalFlowPoint(flow,progress,side=0){
 const d=((progress%1)+1)%1*flow.length;let i=1;while(i<flow.lengths.length-1&&flow.lengths[i]<d)i++;
 const a=flow.points[i-1],b=flow.points[i],length=flow.lengths[i]-flow.lengths[i-1]||1,t=(d-flow.lengths[i-1])/length,dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
 return {x:a.x+(b.x-a.x)*t-dz*side,z:a.z+(b.z-a.z)*t+dx*side,angle:Math.atan2(dx,dz)};
}
