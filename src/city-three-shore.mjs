import * as T from './vendor/three/three.module.min.js';

// Three.js's bundled Earcut triangulator preserves open water inside islands.
// Top, quay and coping share vertices, so no square paving remains underneath.
export function canalShoreGeometry(shore){
 const positions={top:[],banks:[],rim:[]},uvs={top:[],banks:[],rim:[]};
 function triangle(part,a,b,c){for(const p of [a,b,c]){positions[part].push(...p);uvs[part].push(p[0],p[2]);}}
 function quad(part,a,b,c,d){triangle(part,a,c,b);triangle(part,a,d,c);}
 for(const {points,holes} of shore.islands){
  const contour=points.map(p=>new T.Vector2(p.x,p.z)),cuts=holes.map(h=>h.map(p=>new T.Vector2(p.x,p.z)));
  const all=[...contour,...cuts.flat()];
  for(const [a,b,c] of T.ShapeUtils.triangulateShape(contour,cuts)){
   const p=all[a],q=all[b],r=all[c];
   triangle('top',[p.x,.018,p.y],[r.x,.018,r.y],[q.x,.018,q.y]);
  }
 }
 for(const points of shore.loops){
  const normals=points.map((p,i)=>{const q=points[(i+1)%points.length],length=Math.hypot(q.x-p.x,q.z-p.z);return {x:-(q.z-p.z)/length,z:(q.x-p.x)/length};});
  const inner=points.map((p,i)=>{
   const a=normals[(i+points.length-1)%points.length],b=normals[i],scale=.11/Math.max(.5,1+a.x*b.x+a.z*b.z);
   return {x:p.x+(a.x+b.x)*scale,z:p.z+(a.z+b.z)*scale};
  });
  for(let i=0;i<points.length;i++){
   const j=(i+1)%points.length,a=points[i],b=points[j],c=inner[j],d=inner[i];
   quad('banks',[a.x,-.48,a.z],[b.x,-.48,b.z],[b.x,.018,b.z],[a.x,.018,a.z]);
   quad('rim',[a.x,.035,a.z],[b.x,.035,b.z],[c.x,.035,c.z],[d.x,.035,d.z]);
  }
 }
 return Object.fromEntries(Object.keys(positions).map(part=>{
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions[part],3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs[part],2));geometry.computeVertexNormals();return [part,geometry];
 }));
}
