import * as T from './vendor/three/three.module.min.js';

const cache=new WeakMap();
export function trackMeasure(points){let m=cache.get(points);if(m)return m;const lengths=[0];for(let n=1;n<points.length;n++)lengths.push(lengths.at(-1)+Math.hypot(points[n].x-points[n-1].x,points[n].z-points[n-1].z));m={lengths,total:lengths.at(-1)};cache.set(points,m);return m;}
export const trackHeight=(distance,total)=>1.65*Math.max(0,Math.min(1,distance/4,(total-distance)/4));
export function entryTrackHeight(points,p){
 if(!points?.length)return 0;const m=trackMeasure(points);let best=Infinity,height=0;
 for(let n=1;n<points.length;n++){const a=points[n-1],b=points[n],dx=b.x-a.x,dz=b.z-a.z,length=m.lengths[n]-m.lengths[n-1];if(!length)continue;const q=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length**2)),d=Math.hypot(p.x-a.x-dx*q,p.z-a.z-dz*q);if(d<best){best=d;height=trackHeight(m.lengths[n-1]+length*q,m.total);}}
 return best<1.4?height:0;
}
export function entryFlowPoint(points,progress){
 if(!points?.length)return null;
 if(points.length===1)return {...points[0],dx:0,dz:1};
 const {lengths,total}=trackMeasure(points),distance=Math.max(0,Math.min(1,progress))*total;
 let lo=1,hi=points.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(lengths[mid]<distance)lo=mid+1;else hi=mid;}
 const a=points[lo-1],b=points[lo],length=lengths[lo]-lengths[lo-1]||1,t=(distance-lengths[lo-1])/length;
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/length,dz:(b.z-a.z)/length};
}

const DUCT_STYLE={
 airway:{width:1.04,rim:.5,wall:0xe1d7bb,floor:0x6f9087,band:0xc1dbcc,spacing:2.9,arch:1},
 gut:{width:.98,rim:.42,wall:0xbd795e,floor:0xa65948,band:0xe5bb89,spacing:4.4,arch:.55}
};
const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);

function ductSections(points,measure,last){
 const sections=[];
 for(let i=0;i<last;i++){
  const a=points[i],b=points[i+1],length=distance(a,b);
  if(length<1e-7)continue;
  const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
  let nx=-dz,nz=dx,miter=1;
  if(i>0){
   const prev=points[i-1],before=distance(prev,a);
   const x=nx-(a.z-prev.z)/(before||1),z=nz+(a.x-prev.x)/(before||1),size=Math.hypot(x,z);
   if(size>1e-6){nx=x/size;nz=z/size;miter=Math.min(1.38,1/Math.max(.1,nx*-dz+nz*dx));}
  }
  sections.push({...a,nx:nx*miter,nz:nz*miter,y:trackHeight(measure.lengths[i],measure.total)});
  const steps=Math.ceil(length/1.3);
  for(let n=1;n<steps;n++){
   const travel=length*n/steps;
   sections.push({x:a.x+dx*travel,z:a.z+dz*travel,nx:-dz,nz:dx,y:trackHeight(measure.lengths[i]+travel,measure.total)});
  }
  if(i===last-1)sections.push({...b,nx:-dz,nz:dx,y:trackHeight(measure.lengths[last],measure.total)});
 }
 return sections;
}

function ductGeometry(sections,profile,closed){
 const positions=[],indices=[],width=profile.length;
 for(const p of sections)for(const [offset,y] of profile)positions.push(p.x+p.nx*offset,p.y+y,p.z+p.nz*offset);
 for(let i=1;i<sections.length;i++)for(let j=0;j<(closed?width:width-1);j++){
  const a=(i-1)*width+j,b=(i-1)*width+(j+1)%width;
  indices.push(a,b,a+width,b,b+width,a+width);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function createEntryTracks({entries,make,cylinder,isWater}){
 for(const [id,points] of Object.entries(entries)){
  const style=DUCT_STYLE[id];
  if(!style||points.length<2)continue;
  const measure=trackMeasure(points);
  let last=points.length-1;
  // The final dock approach can retrace its loading apron. Build the shared
  // conduit once so overlapping triangles do not flicker.
  if(last>1){
   const a=points[last-2],b=points[last-1],end=points[last];
   if(Math.abs(distance(a,end)+distance(end,b)-distance(a,b))<1e-6)last--;
  }
  const sections=ductSections(points,measure,last);
  if(sections.length<2)continue;
  const {width,rim}=style,inside=width-.13,floor=width*.53;
  const profile=[[-width,-.16],[-width,rim],[-inside,rim],[-floor,0],[floor,0],[inside,rim],[width,rim],[width,-.16]];
  make(ductGeometry(sections,profile,true),style.wall,0,0,0).name=id==='airway'?'bronchial-duct':'esophageal-duct';
  const lining=make(ductGeometry(sections,[[-floor,.012],[floor,.012]],false),style.floor,0,0,0);
  lining.castShadow=false;
  const end=measure.lengths[last];
  const bandDistances=[0];
  for(let d=style.spacing;d<end-.5;d+=style.spacing)bandDistances.push(d);
  bandDistances.push(end);
  for(const [index,d] of bandDistances.entries()){
   const p=entryFlowPoint(points,d/measure.total),y=trackHeight(d,measure.total),collar=index===0||index===bandDistances.length-1;
   const ring=make(new T.TorusGeometry(inside+.035,collar?.16:.086,5,14,Math.PI),style.band,p.x,y+rim,p.z);
   ring.rotation.y=Math.atan2(p.dx,p.dz);ring.scale.y=style.arch;
   if(y<.35||index%2)continue;
   for(const side of [-1,1]){
    const foot={x:p.x-p.dz*side*inside,z:p.z+p.dx*side*inside};
    if(!isWater?.(foot))cylinder(foot.x,y/2,foot.z,.1,.17,y,style.wall);
   }
  }
 }
}
