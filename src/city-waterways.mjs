const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
const unit=p=>{const length=Math.hypot(p.x,p.z)||1;return {x:p.x/length,z:p.z/length};};
const along=(p,d,length)=>({x:p.x+d.x*length,z:p.z+d.z*length});

// Bound curved route storage without dropping the destination from long trips.
export function simplifyWaterway(points,clear,tolerance=.025){
 if(points.length<3)return points;
 const a=points[0],b=points.at(-1),dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;let far=0,index=0;
 for(let n=1;n<points.length-1;n++){const p=points[n],t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0,d=(p.x-a.x-dx*t)**2+(p.z-a.z-dz*t)**2;if(d>far){far=d;index=n;}}
 if(far<=tolerance*tolerance&&clear(a,b))return [a,b];
 if(!index)index=Math.floor(points.length/2);
 return [...simplifyWaterway(points.slice(0,index+1),clear,tolerance).slice(0,-1),...simplifyWaterway(points.slice(index),clear,tolerance)];
}

// Try a continuous bend first. Tight saved blocks fall back to visibility
// shortcuts and collision-checked corner fillets, never a random zigzag.
export function naturalWaterway(a,b,seed,{link,free,startDirection,endDirection}){
 const length=distance(a,b);if(length<.05)return [a,b];
 const heading=unit({x:b.x-a.x,z:b.z-a.z}),side=seed%2?1:-1;
 const start=unit(startDirection||{x:heading.x-heading.z*.18*side,z:heading.z+heading.x*.18*side});
 const end=unit(endDirection||{x:heading.x+heading.z*.18*side,z:heading.z-heading.x*.18*side});
 const clear=points=>points.every(free)&&points.slice(1).every((p,i)=>{
  const q=points[i],steps=Math.max(1,Math.ceil(distance(q,p)*6));
  for(let n=1;n<steps;n++)if(!free({x:q.x+(p.x-q.x)*n/steps,z:q.z+(p.z-q.z)*n/steps}))return false;return true;
 });
 for(const scale of [.42,.3,.2,.12]){
  const u=along(a,start,length*scale),v=along(b,end,-length*scale),curve=[],steps=Math.max(8,Math.ceil(length*2.5));
  for(let n=0;n<=steps;n++){const t=n/steps,q=1-t;curve.push({x:q**3*a.x+3*q*q*t*u.x+3*q*t*t*v.x+t**3*b.x,z:q**3*a.z+3*q*q*t*u.z+3*q*t*t*v.z+t**3*b.z});}
  if(clear(curve)){curve[0]=a;curve[curve.length-1]=b;return curve;}
 }
 const raw=link(a,b),route=[a];
 for(let i=0;i<raw.length-1;){let next=i+1;for(let j=raw.length-1;j>i+1;j--)if(clear([raw[i],raw[j]])){next=j;break;}route.push(raw[next]);i=next;}
 const result=[a];
 for(let i=1;i<route.length-1;i++){
  const p=route[i],before=route[i-1],after=route[i+1],u=unit({x:before.x-p.x,z:before.z-p.z}),v=unit({x:after.x-p.x,z:after.z-p.z});
  let radius=Math.min(3,distance(before,p)*.42,distance(p,after)*.42),rounded=null;
  while(radius>.06){const start=along(p,u,radius),end=along(p,v,radius),curve=[];
   for(let n=0;n<=8;n++){const t=n/8;curve.push({x:(1-t)**2*start.x+2*(1-t)*t*p.x+t*t*end.x,z:(1-t)**2*start.z+2*(1-t)*t*p.z+t*t*end.z});}
   if(clear([result.at(-1),...curve])){rounded=curve;break;}radius*=.6;
  }
  result.push(...(rounded||[p]));
 }
 result.push(b);return result;
}
