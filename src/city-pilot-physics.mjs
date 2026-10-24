import {Vector3,Matrix4,Triangle,Box3,Ray} from './vendor/three/three.module.min.js';
import {Octree} from './vendor/three/Octree.js';
import {Capsule} from './vendor/three/Capsule.js';

// Three.js r180 / MIT: collide with rendered surfaces, not placement reservations.
// Pavement and tiny fittings are stepped over; moving workers are never walls.
export function createPilotSurface(root,filter=()=>true){
 root.updateMatrixWorld(true);
 const tree=new Octree();tree.maxLevel=6;tree.trianglesPerLeaf=24;
 const interiors=new Map(),matrix=new Matrix4(),instance=new Matrix4(),box=new Box3();let triangles=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh||!filter(mesh))return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;
  const g=mesh.geometry,position=g.getAttribute('position');if(!position)return;
  if(!g.boundingBox)g.computeBoundingBox();
  for(let n=0;n<(mesh.isInstancedMesh?mesh.count:1);n++){
   matrix.copy(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(n,instance);matrix.multiply(instance);}
   box.copy(g.boundingBox).applyMatrix4(matrix);
   const size=box.getSize(new Vector3());
   if(box.max.y<.27||Math.min(size.x,size.z)<.065||Math.max(size.x,size.z)>18)continue;
   // Keep closed low solids out of spawn points, including their hollow interiors.
   if(box.min.y<.5&&size.y>.22){const b=box.clone();for(let x=Math.floor((b.min.x-.14)/2);x<=Math.floor((b.max.x+.14)/2);x++)for(let z=Math.floor((b.min.z-.14)/2);z<=Math.floor((b.max.z+.14)/2);z++){const key=x+','+z;if(!interiors.has(key))interiors.set(key,[]);interiors.get(key).push(b);}}
   const count=g.index?.count??position.count;
   for(let i=0;i<count;i+=3){
    const points=[0,1,2].map(j=>new Vector3().fromBufferAttribute(position,g.index?g.index.getX(i+j):i+j).applyMatrix4(matrix));
    if(Math.max(...points.map(p=>p.y))<.27)continue;
    const triangle=new Triangle(...points);if(triangle.getArea()<.00001)continue;
    tree.addTriangle(triangle);triangles++;
   }
  }
 });
 if(triangles)tree.build();
 const capsule=new Capsule(),normal=new Vector3(),ray=new Ray(),direction=new Vector3();
 function body(p,height=.62,radius=.17){capsule.radius=radius;capsule.start.set(p.x,(p.y||0)+.13+radius,p.z);capsule.end.set(p.x,(p.y||0)+Math.max(.13+radius,height-radius),p.z);return capsule;}
 return {
  triangles,
  blocked(p){
   if((interiors.get(Math.floor(p.x/2)+','+Math.floor(p.z/2))||[]).some(b=>p.x>b.min.x-.14&&p.x<b.max.x+.14&&p.z>b.min.z-.14&&p.z<b.max.z+.14))return true;
   return !!(triangles&&tree.capsuleIntersect(body(p)));
  },
  resolve(p,height){
   if(!triangles)return null;const result=tree.capsuleIntersect(body(p,height));if(!result||result.depth<.00001)return null;
   normal.copy(result.normal);p.x+=normal.x*result.depth;p.y+=normal.y*result.depth;p.z+=normal.z*result.depth;return normal.clone();
  },
  clear(a,b){
   if(!triangles)return true;ray.origin.set(a.x,a.y??.45,a.z);direction.set(b.x,b.y??.45,b.z).sub(ray.origin);const length=direction.length();if(length<.001)return true;
   ray.direction.copy(direction.divideScalar(length));const hit=tree.rayIntersect(ray);return !hit||hit.distance>=length-.06;
  },
  trace(a,d,max=26){
   if(!triangles)return null;ray.origin.set(a.x,a.y,a.z);ray.direction.set(d.x,d.y,d.z).normalize();
   const hit=tree.rayIntersect(ray);if(!hit||hit.distance>max)return null;
   return {x:hit.position.x,y:hit.position.y,z:hit.position.z,distance:hit.distance};
  }
 };
}

export function combinePilotSurfaces(...surfaces){
 return {blocked:p=>surfaces.some(s=>s?.blocked(p)),clear:(a,b)=>surfaces.every(s=>!s||s.clear(a,b)),trace(a,d,max){return surfaces.map(s=>s?.trace?.(a,d,max)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0]||null;},resolve(p,height){let normal=null;for(const s of surfaces){const n=s?.resolve(p,height);if(n)normal=n;}return normal;}};
}
