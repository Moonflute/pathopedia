import * as T from './vendor/three/three.module.min.js';

export function createPilotEffects(){
 const root=new T.Group(),beamGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),beamMaterial=new T.LineBasicMaterial({color:0x9cecff,transparent:true,opacity:.9}),beam=new T.Line(beamGeometry,beamMaterial);
 const ringGeometry=new T.TorusGeometry(1,.025,5,40),ringMaterial=new T.MeshBasicMaterial({color:0xd4b6ff,transparent:true,opacity:.8}),ring=new T.Mesh(ringGeometry,ringMaterial);
 const particleGeometry=new T.SphereGeometry(.045,5,4),particleMaterial=new T.MeshBasicMaterial({color:0xb4f8ff}),particles=new T.InstancedMesh(particleGeometry,particleMaterial,12),dummy=new T.Object3D();particles.frustumCulled=false;root.add(beam,ring,particles);
 return {root,update(v,time){
  beam.visible=!!v.beam;particles.count=0;ring.visible=!!v.shock;
  if(v.beam){const {from:a,target:b}=v.beam,positions=beamGeometry.attributes.position;positions.setXYZ(0,a.x,a.y,a.z);positions.setXYZ(1,b.x,b.y,b.z);positions.needsUpdate=true;beamGeometry.computeBoundingSphere();
   for(let i=0;i<12;i++){const t=(time*2+i/12)%1;dummy.position.set(b.x+(a.x-b.x)*t,(b.y??.12)+(a.y-(b.y??.12))*t,b.z+(a.z-b.z)*t);dummy.scale.setScalar(.5+Math.sin(t*Math.PI)*.7);dummy.updateMatrix();particles.setMatrixAt(particles.count++,dummy.matrix);}particles.instanceMatrix.needsUpdate=true;
  }
  if(v.shock){const s=v.shock,d=.3+s.progress*3;ring.position.set(s.from.x+Math.sin(s.yaw)*Math.cos(s.pitch)*d,s.from.y+Math.sin(s.pitch)*d,s.from.z-Math.cos(s.yaw)*Math.cos(s.pitch)*d);ring.rotation.set(s.pitch,-s.yaw,0,'YXZ');ring.scale.setScalar(.2+s.progress*3.5);ringMaterial.opacity=(1-s.progress)*.85;}
 },dispose(){beamGeometry.dispose();beamMaterial.dispose();ringGeometry.dispose();ringMaterial.dispose();particleGeometry.dispose();particleMaterial.dispose();particles.dispose();root.clear();}};
}
