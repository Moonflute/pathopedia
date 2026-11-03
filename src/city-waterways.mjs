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

// Round the whole corridor, including joins between separately authored guides.
// Clearance is reserved by the planner so a bend need not hug a building corner.
export function roundWaterway(points,clear,radius=4){
 if(points.length<3)return points;
 const route=simplifyWaterway(points,clear,.12),result=[route[0]];
 for(let i=1;i<route.length-1;i++){
  const p=route[i],before=route[i-1],after=route[i+1],u=unit({x:before.x-p.x,z:before.z-p.z}),v=unit({x:after.x-p.x,z:after.z-p.z});
  let reach=Math.min(radius,distance(before,p)*.48,distance(p,after)*.48),rounded=null;
  while(reach>.06){const start=along(p,u,reach),end=along(p,v,reach),curve=[],steps=Math.max(8,Math.ceil(reach*4));
   for(let n=0;n<=steps;n++){const t=n/steps;curve.push({x:(1-t)**2*start.x+2*(1-t)*t*p.x+t*t*end.x,z:(1-t)**2*start.z+2*(1-t)*t*p.z+t*t*end.z});}
   const check=[result.at(-1),...curve,after];
   if(check.slice(1).every((q,n)=>clear(check[n],q))){rounded=curve;break;}reach*=.7;
  }
  result.push(...(rounded||[p]));
 }
 result.push(route.at(-1));return result;
}

// Relax over a neighbourhood of the path, rather than rounding every tiny
// offset segment on its own. Junction approaches stay fixed on open paths.
export function softenWaterway(points,clear,closed=false){
 if(points.length<3)return points;
 const samples=[],lengths=[0];
 for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i-1],points[i]));
 const length=lengths.at(-1),steps=Math.max(1,Math.ceil(length/.45));let index=1;
 for(let n=0;n<=steps-(closed?1:0);n++){
  const d=length*n/steps;while(index<points.length-1&&lengths[index]<d)index++;
  const a=points[index-1],b=points[index],t=(d-lengths[index-1])/(lengths[index]-lengths[index-1]||1);
  samples.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
 }
 samples[0]=points[0];if(!closed)samples[samples.length-1]=points.at(-1);
 if(samples.length<5)return points;
 if(samples.slice(1).some((p,i)=>!clear(samples[i],p))||closed&&!clear(samples.at(-1),samples[0]))return points;
 for(let pass=0;pass<8;pass++)for(let i=closed?0:2;i<samples.length-(closed?0:2);i++){
  const p=samples[i],before=samples[(i+samples.length-1)%samples.length],after=samples[(i+1)%samples.length];
  const a=samples[(i+samples.length-2)%samples.length],b=samples[(i+2)%samples.length];
  const weight=closed?1:Math.min(1,(i/8)**3,((samples.length-1-i)/8)**3);
  const q={x:p.x+((before.x+after.x)*.2+(a.x+b.x)*.125-p.x*.65)*weight,z:p.z+((before.z+after.z)*.2+(a.z+b.z)*.125-p.z*.65)*weight};
  if(clear(before,q)&&clear(q,after))samples[i]=q;
 }
 if(closed)samples.push(samples[0]);
 return samples;
}

// Try a continuous bend first, then a guide with room for a broad turn.
export function naturalWaterway(a,b,{link,clear,guideClear=clear,startDirection,endDirection}){
 const length=distance(a,b);if(length<.05)return [a,b];
 const clearRoute=points=>points.slice(1).every((p,i)=>clear(points[i],p));
 if(!startDirection&&!endDirection&&clear(a,b))return [a,b];
 const heading=unit({x:b.x-a.x,z:b.z-a.z});
 const start=startDirection?unit(startDirection):heading;
 const end=endDirection?unit(endDirection):heading;
 for(const scale of startDirection||endDirection?[.42,.3,.2,.12]:[]){
  const u=along(a,start,length*scale),v=along(b,end,-length*scale),curve=[],steps=Math.max(8,Math.ceil(length*2.5));
  for(let n=0;n<=steps;n++){const t=n/steps,q=1-t;curve.push({x:q**3*a.x+3*q*q*t*u.x+3*q*t*t*v.x+t**3*b.x,z:q**3*a.z+3*q*q*t*u.z+3*q*t*t*v.z+t**3*b.z});}
  if(clearRoute(curve)){curve[0]=a;curve[curve.length-1]=b;return curve;}
 }
 const raw=link(a,b),route=[a];
 for(let i=0;i<raw.length-1;){let next=i+1;for(let j=raw.length-1;j>i+1;j--)if(guideClear(raw[i],raw[j])){next=j;break;}route.push(raw[next]);i=next;}
 return roundWaterway(route,clear);
}
