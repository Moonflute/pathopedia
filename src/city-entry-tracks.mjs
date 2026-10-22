const cache=new WeakMap();
export function trackMeasure(points){let m=cache.get(points);if(m)return m;const lengths=[0];for(let n=1;n<points.length;n++)lengths.push(lengths.at(-1)+Math.hypot(points[n].x-points[n-1].x,points[n].z-points[n-1].z));m={lengths,total:lengths.at(-1)};cache.set(points,m);return m;}
export const trackHeight=(distance,total)=>1.65*Math.max(0,Math.min(1,distance/4,(total-distance)/4));
export function entryTrackHeight(points,p){
 if(!points?.length)return 0;const m=trackMeasure(points);let best=Infinity,height=0;
 for(let n=1;n<points.length;n++){const a=points[n-1],b=points[n],dx=b.x-a.x,dz=b.z-a.z,length=m.lengths[n]-m.lengths[n-1];if(!length)continue;const q=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length**2)),d=Math.hypot(p.x-a.x-dx*q,p.z-a.z-dz*q);if(d<best){best=d;height=trackHeight(m.lengths[n-1]+length*q,m.total);}}
 return best<1.4?height:0;
}
export function createEntryTracks({entries,box,cylinder}){
 for(const [id,points] of Object.entries(entries)){
  const m=trackMeasure(points),color=id==='airway'?0x9be3d4:0xe5b464;
  for(let n=1;n<points.length;n++){
   const a=points[n-1],b=points[n],length=m.lengths[n]-m.lengths[n-1];if(length<1e-7)continue;const steps=Math.max(1,Math.ceil(length/1.7)),dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
   for(let j=0;j<steps;j++){
    const q=(j+.5)/steps,x=a.x+(b.x-a.x)*q,z=a.z+(b.z-a.z)*q,d=m.lengths[n-1]+length*q,y=trackHeight(d,m.total),rise=trackHeight(d+length/steps/2,m.total)-trackHeight(d-length/steps/2,m.total),angle=-Math.atan2(dz,dx);
    const deck=box(x,y-.1,z,length/steps+.05,.2,2.3,0xd4c1a0);deck.rotation.set(0,angle,Math.atan2(rise,length/steps));
    const stripe=box(x,y+.018,z,length/steps,.035,1.52,color);stripe.rotation.set(0,angle,Math.atan2(rise,length/steps));
    for(const side of [-1,1]){const px=x-dz*side*1.1,pz=z+dx*side*1.1;cylinder(px,y/2,pz,.07,.12,Math.max(.15,y),0xb29c7b);const rail=box(px,y+.25,pz,length/steps,.12,.1,0xf3e5c7);rail.rotation.y=angle;}
   }
  }
 }
}
