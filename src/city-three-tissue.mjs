import * as T from './vendor/three/three.module.min.js';
import {TISSUES,SKIN_TISSUES} from './city-frontier-data.mjs';
import {tissueAt,tissuePresent,siteAt} from './city-tile-layout.mjs';
import {bundleModel} from './city-three-bundle.mjs';
import {CITY_STYLE} from './city-three-style.mjs';
import {cityThemeObject} from './city-theme.mjs';

// Living neighbourhoods share plaster cottages, tile roofs and small courts.
// Damage belongs to the underlying tissue, not decorative building instances.
export function createTissueScene(layout,patches=[],lungPatches=[],bundle=null,theme='2'){
 const root=new T.Group(),dummy=new T.Object3D(),color=new T.Color(),living=TISSUES.filter(t=>tissuePresent({layout},t)).map(t=>tissueAt({layout},t));
 const meadow=cityThemeObject(theme,'tissue')==='meadow-cottage';root.userData.tissueStyle=cityThemeObject(theme,'tissue');
 const plots=living.length?patches.map(p=>({...p,size:1,tissue:living.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b)})):[];
 for(const t of SKIN_TISSUES.filter(t=>tissuePresent({layout},t)).map(t=>tissueAt({layout},t)))for(const side of [-1,1])plots.push({x:t.x-t.nz*side*.75,z:t.z+t.nx*side*.75,variant:t.id+side,size:1.12,angle:Math.atan2(-t.nx,-t.nz),tissue:t});
 for(const p of lungPatches)plots.push({...p,size:2,lung:true,tissue:living.find(t=>t.district==='lung')||{district:'lung'}});
 const count=plots.length,material=new T.MeshStandardMaterial({color:0xffffff,roughness:.88}),batches={};
 const roof=new T.Shape();roof.moveTo(-.59,0);roof.lineTo(.59,0);roof.lineTo(0,.52);roof.closePath();
 const roofGeometry=new T.ExtrudeGeometry(roof,{depth:1.15,bevelEnabled:false,steps:1});roofGeometry.translate(0,0,-.575);
 function batch(name,geometry,limit,unlit=false){const mesh=new T.InstancedMesh(geometry,unlit?new T.MeshBasicMaterial({color:0xffffff}):material,limit);mesh.name=name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=!unlit;mesh.receiveShadow=!unlit;root.add(mesh);batches[name]=mesh;return mesh;}
 batch('tissue-cottages',new T.BoxGeometry(1,1,1),count*17);batch('tissue-roofs',roofGeometry,count);batch('tissue-repair',new T.TorusGeometry(1,.06,4,16),count,true);
 batch('tissue-fire',new T.ConeGeometry(1,1,5),count*2,true);batch('tissue-smoke',new T.IcosahedronGeometry(1,0),count);
 // The real damage/repair states share bounded pools, independent of plot count.
 const props=[],matrix=new T.Matrix4(),world=new T.Matrix4();
 function propPool(name,limit,height,width){
  const template=bundleModel(bundle,name,height,width);if(!template)return null;template.updateMatrixWorld(true);
  const pool={count:0,limit,parts:[]};
  template.traverse(m=>{if(!m.isMesh)return;const mesh=new T.InstancedMesh(m.geometry,m.material,limit);mesh.count=0;mesh.name='tissue-'+name;mesh.userData.cityAsset=true;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);pool.parts.push({mesh,local:m.matrixWorld.clone()});});props.push(pool);return pool;
 }
 const scaffolds=propPool('repair-scaffold',8,1.25,1.4),rubble=propPool('rubble-rock',12,.35,.7),stones=propPool('rubble-stone',8,.2,.65);
 function putProp(pool,p,x,z){
  if(!pool||pool.count>=pool.limit)return;const angle=p.angle||0,cs=Math.cos(angle),sn=Math.sin(angle),size=p.size;
  dummy.position.set(p.x+(x*cs+z*sn)*size,.04,p.z+(-x*sn+z*cs)*size);dummy.rotation.set(0,angle,0);dummy.scale.setScalar(size);dummy.updateMatrix();world.copy(dummy.matrix);
  for(const {mesh,local} of pool.parts){matrix.multiplyMatrices(world,local);mesh.setMatrixAt(pool.count,matrix);}pool.count++;
 }
 function put(id,p,x,y,z,w,h,d,tint,rx=0,ry=0,rz=0){const m=batches[id],i=m.count;if(i>=m.instanceMatrix.count)return;const angle=p.angle||0,cs=Math.cos(angle),sn=Math.sin(angle),size=p.size;
  dummy.position.set(p.x+(x*cs+z*sn)*size,y*size,p.z+(-x*sn+z*cs)*size);dummy.rotation.set(rx,angle+ry,rz);dummy.scale.set(w*size,h*size,d*size);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);m.setColorAt(i,color.setHex(tint));m.count++;
 }
 let last=-Infinity;
 return {root,update(s){
  if(Math.abs(s.time-last)<.18)return;last=s.time;for(const m of Object.values(batches))m.count=0;for(const pool of props)pool.count=0;
  for(const p of plots){
   const hp=s.frontier?.tissues[p.tissue?.id]?.hp??100,d=s.districts[p.lung?'lung':p.tissue.district],site=siteAt(layout,p.tissue.district),near=Math.hypot(p.x-site.x,p.z-site.z)<10;
   const health=p.lung?d.hp:Math.min(hp,near?d.hp:100),dead=health<15,injured=health<70,repair=s.cells.some(c=>c.tissueJob===p.tissue?.id&&c.task==='조직 블록 복구')||p.lung&&s.cells.some(c=>c.kind==='fibroblast'&&c.target==='lung'&&c.task==='복구 준비');
   const variant=(p.variant%3+3)%3,h=dead?.2:p.lung?.9:(meadow?.9:1.05)+variant*.16,wall=dead?0x756b61:injured?0xc2957a:p.lung?0xe2d7be:(meadow?[CITY_STYLE.plaster,CITY_STYLE.plasterWarm,0xe5e4cc]:[0xecd8b2,0xe7c9a8,0xd4d7bb])[variant],roof=dead?0x635d57:injured?0x9f6049:p.lung?0x6a9e94:(meadow?CITY_STYLE.roofs:[0xb5684c,0xc27f57,0xa95b45])[variant];
   put('tissue-cottages',p,0,.045,0,1.3,.09,1.3,0xc5bba2);put('tissue-cottages',p,0,.1+h/2,0,1,h,1,wall);
   put('tissue-roofs',p,0,.1+h,0,1,dead?.22:1,1,roof,0,0,dead?.13:0);
   put('tissue-cottages',p,0,.3,.51,.24,dead?.16:.43,.035,0x67796b);
   for(const side of [-1,1]){put('tissue-cottages',p,side*.3,h*.66,.515,.21,.25,.035,injured?0xe49b62:0x6f9e9b);put('tissue-cottages',p,side*.3,h*.66+.15,.53,.28,.035,.055,0xf5e5c5);put('tissue-cottages',p,side*.515,h*.62,0,.035,.27,.32,injured?0xb7684c:0x76a4a1);}
   if(!dead){put('tissue-cottages',p,-.3,h+.33,-.25,.15,.43,.17,0xd2b89a);put('tissue-cottages',p,.35,.15,.67,.4,.24,.18,0x9eac7d);}
   if(p.lung&&!dead){const breath=1+Math.sin(s.time*1.6+p.variant)*.045;put('tissue-cottages',p,0,h*.5,-.52,.8,h*.68*breath,.035,injured?0xc27f6c:0xa5d3c6);for(const side of [-1,1])put('tissue-cottages',p,side*.3,h+.27,.57,.035,.47,.04,0xf2e8d1,0,0,s.time*1.6+side*Math.PI/2);}
   if(injured&&!repair){const q=(s.time*.6+p.variant*.19)%1;put('tissue-smoke',p,q*.3,h+.4+q*1.8,0,.16+q*.26,.25+q*.35,.16+q*.26,0x7d7972);if(health<50)for(const side of [-1,1])put('tissue-fire',p,side*.25,h*.7,.3,.2,.55+Math.abs(Math.sin(s.time*8+p.variant+side))*.45,.2,side<0?0xf68e36:0xffcd67);}
   if(repair){const r=.8+(s.time*.45)%1*.4;put('tissue-repair',p,0,.12,0,r,r,r,0x8ce3bb,Math.PI/2);}
   if(repair)putProp(scaffolds,p,.6,0);
   if(dead){putProp(rubble,p,-.35,.65);putProp(stones,p,.45,.6);}
  }
  for(const m of Object.values(batches)){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  for(const pool of props)for(const {mesh} of pool.parts){mesh.count=pool.count;mesh.instanceMatrix.needsUpdate=true;}
 }};
}
