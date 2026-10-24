const area=points=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.z-q.x*p.z;},0)/2;
function contains(points,p){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return inside;
}
function simplify(points,tolerance=.075){
 function chain(points){
  const a=points[0],b=points.at(-1),dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  let far=tolerance*tolerance,index=0;
  for(let i=1;i<points.length-1;i++){
   const p=points[i],t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
   const distance=(p.x-a.x-dx*t)**2+(p.z-a.z-dz*t)**2;
   if(distance>far){far=distance;index=i;}
  }
  return index?[...chain(points.slice(0,index+1)).slice(0,-1),...chain(points.slice(index))]:[a,b];
 }
 let split=1,distance=0;
 for(let i=1;i<points.length;i++){const d=(points[i].x-points[0].x)**2+(points[i].z-points[0].z)**2;if(d>distance){distance=d;split=i;}}
 return [...chain(points.slice(0,split+1)).slice(0,-1),...chain([...points.slice(split),points[0]]).slice(0,-1)];
}

// Keep the half-tile planning grid, but render one continuous coastline. Edges
// have land on their left; left turns keep corner-touching islands separate.
export function compileCanalShore(edges){
 const starts=new Map(),used=new Set(),loops=[];
 for(let i=0;i<edges.length;i++){
  const [x,z]=edges[i],k=x+','+z;if(!starts.has(k))starts.set(k,[]);starts.get(k).push(i);
 }
 for(let seed=0;seed<edges.length;seed++){
  if(used.has(seed))continue;
  const points=[];let current=seed;
  while(current!=null&&!used.has(current)){
   const [x,z,xx,zz]=edges[current];used.add(current);points.push({x,z});
   const candidates=(starts.get(xx+','+zz)||[]).filter(i=>!used.has(i)||i===seed);
   const turn=i=>{const e=edges[i],dx=e[2]-xx,dz=e[3]-zz;return Math.atan2((xx-x)*dz-(zz-z)*dx,(xx-x)*dx+(zz-z)*dz);};
   current=candidates.sort((a,b)=>turn(b)-turn(a))[0];
   if(current===seed)break;
  }
  if(current!==seed||points.length<4)continue;
  // Two local passes remove grid stair steps within a fraction of a tile.
  // Straight banks stay straight; corners become soft.
  let smooth=points;
  for(let pass=0;pass<2;pass++)smooth=smooth.map((p,i)=>{const a=smooth[(i+smooth.length-1)%smooth.length],b=smooth[(i+1)%smooth.length];return {x:(a.x+2*p.x+b.x)/4,z:(a.z+2*p.z+b.z)/4};});
  const contour=simplify(smooth);
  if(contour.length>=3)loops.push({points:contour,area:area(contour)});
 }
 const islands=loops.filter(loop=>loop.area>0).map(loop=>({...loop,holes:[]}));
 for(const hole of loops.filter(loop=>loop.area<0)){
  const owner=islands.filter(island=>contains(island.points,hole.points[0])).sort((a,b)=>a.area-b.area)[0];
  if(owner)owner.holes.push(hole.points);
 }
 // Query the very same boundary used by the mesh. Scanline buckets keep water
 // checks cheap for swimming cells and the first-person controller.
 const bands=new Map();
 for(const {points} of loops)for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];if(a.z===b.z)continue;
  for(let z=Math.floor(Math.min(a.z,b.z));z<=Math.floor(Math.max(a.z,b.z));z++){
   if(!bands.has(z))bands.set(z,[]);bands.get(z).push([a,b]);
  }
 }
 return {islands,loops:loops.map(loop=>loop.points),isLand(p){
  let inside=false;
  for(const [a,b] of bands.get(Math.floor(p.z))||[])if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  return inside;
 }};
}
