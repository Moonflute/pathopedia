// Stable bends follow clear courtyards between buildings. The same polyline
// drives the water cut, flow paint and moving cells; it is never a visual offset.
export function naturalWaterway(a,b,seed,{link,safe,free}){
 const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<5)return link(a,b);
 const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length,side=seed%2?1:-1,spread=Math.min(3.8,length*.17),anchors=[a];
 for(const [t,factor] of [[.32,1],[.68,-.65]]){
  const p={x:a.x+(b.x-a.x)*t-dz*spread*factor*side,z:a.z+(b.z-a.z)*t+dx*spread*factor*side};anchors.push(safe(p));
 }
 anchors.push(b);const route=[];
 for(let i=1;i<anchors.length;i++)route.push(...link(anchors[i-1],anchors[i]).slice(0,-1));route.push(b);
 const result=[route[0]];
 for(let i=1;i<route.length-1;i++){
  const p=route[i],a=route[i-1],b=route[i+1],before=Math.hypot(p.x-a.x,p.z-a.z),after=Math.hypot(b.x-p.x,b.z-p.z),r=Math.min(1.5,before*.32,after*.32);
  if(r<.08){result.push(p);continue;}
  const u={x:p.x+(a.x-p.x)*r/before,z:p.z+(a.z-p.z)*r/before},v={x:p.x+(b.x-p.x)*r/after,z:p.z+(b.z-p.z)*r/after},curve=[];
  for(let n=0;n<=6;n++){const t=n/6;curve.push({x:(1-t)**2*u.x+2*(1-t)*t*p.x+t*t*v.x,z:(1-t)**2*u.z+2*(1-t)*t*p.z+t*t*v.z});}
  if(curve.every(free))result.push(...curve);else result.push(p);
 }
 result.push(b);return result;
}
