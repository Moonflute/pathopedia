import * as T from './vendor/three/three.module.min.js';
import {TISSUES} from './city-frontier-data.mjs';
import {tissueAt,tissuePresent,siteAt} from './city-tile-layout.mjs';

// Actual housing tissue health also drives the surrounding tissue parenchyma.
export function createTissueScene(layout,patches=[]){
 const root=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),living=TISSUES.filter(t=>tissuePresent({layout},t)).map(t=>tissueAt({layout},t));
 const plots=living.length?patches.map(p=>({...p,tissue:living.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b)})):[];
 const count=plots.length*4,material=new T.MeshStandardMaterial({color:0xffffff,roughness:.88});
 const cells=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,6),material,count),nuclei=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),material,count),rings=new T.InstancedMesh(new T.TorusGeometry(1,.08,4,12),new T.MeshBasicMaterial({color:0x8ce3bb}),plots.length);
 for(const [name,m] of [['normal-tissue',cells],['tissue-nuclei',nuclei],['tissue-repair',rings]]){m.name=name;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(m);}
 let last=-Infinity;
 return {root,update(s){
  if(Math.abs(s.time-last)<.18)return;last=s.time;let k=0,r=0;
  for(const p of plots){
   const hp=s.frontier?.tissues[p.tissue.id]?.hp??100,d=s.districts[p.tissue.district],site=siteAt(layout,p.tissue.district),load=Object.values(s.biology?.sites[p.tissue.district]?.strains||{}).reduce((a,b)=>a+b,0),near=Math.hypot(p.x-site.x,p.z-site.z)<10;
   const health=Math.min(hp,near?d.hp:100),injured=health<70,dead=health<15,repair=s.cells.some(c=>c.tissueJob===p.tissue.id&&c.task==='조직 블록 복구')||near&&s.cells.some(c=>c.kind==='fibroblast'&&c.target===p.tissue.district&&c.task==='복구 준비');
   for(let n=0;n<4;n++){
    const x=p.x+(n%2-.5)*.67,z=p.z+(Math.floor(n/2)-.5)*.67,h=dead?.1:.35+health*.003+Math.sin(s.time*1.5+p.variant+n)*.035;
    dummy.position.set(x,h/2+.05,z);dummy.rotation.set(dead?.22:0,n*.7,dead?.3:0);dummy.scale.set(.4,h,.4);dummy.updateMatrix();cells.setMatrixAt(k,dummy.matrix);
    cells.setColorAt(k,color.setHex(dead?0x6c5851:repair?0x99d5ae:injured?0xce806a:d.oxygen<25?0xb1a6bb:[0xb8c8a1,0xccd5b1,0xa9c6af][p.variant%3]));
    dummy.position.y=h+.08;dummy.rotation.set(0,0,0);dummy.scale.set(.15,.09,.15);dummy.updateMatrix();nuclei.setMatrixAt(k,dummy.matrix);nuclei.setColorAt(k,color.setHex(dead?0x3d3837:injured||near&&load>8?0xc65342:0x5e9180));k++;
   }
   if(repair){dummy.position.set(p.x,.12,p.z);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(.7+(s.time*.6+p.variant*.1)%1*.4);dummy.updateMatrix();rings.setMatrixAt(r++,dummy.matrix);}
  }
  cells.count=nuclei.count=k;rings.count=r;for(const m of [cells,nuclei,rings]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
 }};
}
