import * as T from './vendor/three/three.module.min.js';

export function createPilotEffects(){
 const root=new T.Group(),beamGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),beamMaterial=new T.LineBasicMaterial({color:0x9cecff,transparent:true,opacity:.9}),beam=new T.Line(beamGeometry,beamMaterial);
 const particleGeometry=new T.SphereGeometry(.045,5,4),particleMaterial=new T.MeshBasicMaterial({color:0xb4f8ff}),particles=new T.InstancedMesh(particleGeometry,particleMaterial,12),dummy=new T.Object3D();particles.frustumCulled=false;root.add(beam,particles);
 const ropeGeometry=new T.CylinderGeometry(.012,.012,1,5),ropeMaterial=new T.MeshBasicMaterial({color:0xf1d387}),rope=new T.Mesh(ropeGeometry,ropeMaterial),hookGeometry=new T.TorusGeometry(.12,.028,4,9,Math.PI*1.6),hook=new T.Mesh(hookGeometry,ropeMaterial);root.add(rope,hook);
 const pulseGeometry=new T.SphereGeometry(1,6,4),pulseMaterial=new T.MeshBasicMaterial({color:0xf3ffe9,toneMapped:false}),pulses=new T.InstancedMesh(pulseGeometry,pulseMaterial,16),trailGeometry=new T.CylinderGeometry(.018,.045,1,5),trailMaterial=new T.MeshBasicMaterial({color:0x64ffd4,toneMapped:false}),trails=new T.InstancedMesh(trailGeometry,trailMaterial,16);pulses.frustumCulled=trails.frustumCulled=false;root.add(pulses,trails);
 const up=new T.Vector3(0,1,0),direction=new T.Vector3(),head=new T.Vector3(),tail=new T.Vector3();
 return {root,update(v,time){
  beam.visible=!!v.beam;particles.count=0;
  rope.visible=hook.visible=!!v.grapple;
  if(v.grapple){const {from:a,target:b}=v.grapple;direction.set(b.x-a.x,b.y-a.y,b.z-a.z);const length=direction.length();direction.normalize();rope.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);rope.scale.set(1,length,1);rope.quaternion.setFromUnitVectors(up,direction);hook.position.set(b.x,b.y,b.z);hook.quaternion.copy(rope.quaternion);hook.scale.setScalar(v.grapple.phase==='attached'?1.2:1);}
  pulses.count=trails.count=0;let impact=null;
  for(const s of v.projectiles||[]){
   if(s.progress>=1){if(s.impactAge<.14)impact=s;continue;}if(pulses.count>=16)break;
   direction.set(s.target.x-s.from.x,s.target.y-s.from.y,s.target.z-s.from.z);const length=direction.length();direction.normalize();head.set(s.from.x,s.from.y,s.from.z).addScaledVector(direction,length*s.progress);tail.copy(head).addScaledVector(direction,-Math.min(1.1,length*s.progress));
   dummy.position.copy(head);dummy.quaternion.identity();dummy.scale.setScalar(.065);dummy.updateMatrix();pulses.setMatrixAt(pulses.count++,dummy.matrix);
   dummy.position.copy(head).add(tail).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,direction);dummy.scale.set(1,head.distanceTo(tail),1);dummy.updateMatrix();trails.setMatrixAt(trails.count++,dummy.matrix);
  }pulses.instanceMatrix.needsUpdate=trails.instanceMatrix.needsUpdate=true;dummy.quaternion.identity();
  if(v.beam){const {from:a,target:b}=v.beam,positions=beamGeometry.attributes.position;positions.setXYZ(0,a.x,a.y,a.z);positions.setXYZ(1,b.x,b.y,b.z);positions.needsUpdate=true;beamGeometry.computeBoundingSphere();
   for(let i=0;i<12;i++){const t=(time*2+i/12)%1;dummy.position.set(b.x+(a.x-b.x)*t,(b.y??.12)+(a.y-(b.y??.12))*t,b.z+(a.z-b.z)*t);dummy.scale.setScalar(.5+Math.sin(t*Math.PI)*.7);dummy.updateMatrix();particles.setMatrixAt(particles.count++,dummy.matrix);}particles.instanceMatrix.needsUpdate=true;
  }
  if(impact){particleMaterial.color.setHex(impact.hit?0xffcb80:0xa1d9d2);for(let i=0;i<12;i++){const a=i*2.399,t=impact.impactAge/.14,r=t*.36;dummy.position.set(impact.target.x+Math.cos(a)*r,impact.target.y+Math.sin(i*7)*r+.1*t,impact.target.z+Math.sin(a)*r);dummy.scale.setScalar((1-t)*.65);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);}particles.count=12;particles.instanceMatrix.needsUpdate=true;}else particleMaterial.color.setHex(0xb4f8ff);
 },dispose(){beamGeometry.dispose();beamMaterial.dispose();particleGeometry.dispose();particleMaterial.dispose();ropeGeometry.dispose();ropeMaterial.dispose();hookGeometry.dispose();pulseGeometry.dispose();pulseMaterial.dispose();trailGeometry.dispose();trailMaterial.dispose();pulses.dispose();trails.dispose();particles.dispose();root.clear();}};
}
