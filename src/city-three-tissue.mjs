import * as T from './vendor/three/three.module.min.js';
import {TISSUES,SKIN_TISSUES} from './city-frontier-data.mjs';
import {tissueAt,tissuePresent,siteAt} from './city-tile-layout.mjs';
import {bundleModel} from './city-three-bundle.mjs';
import {CITY_STYLE,NEIGHBOURHOOD_ROOFS} from './city-three-style.mjs';
import {cityThemeObject} from './city-theme.mjs';
import {houseDesign,houseSeed,houseRoofGeometry} from './city-three-housing.mjs';
import {createInstancePalette,markInstanceRange} from './city-three-instances.mjs';

// Living neighbourhoods share plaster cottages, tile roofs and small courts.
// Damage belongs to the underlying tissue, not decorative building instances.
export function createTissueScene(layout,patches=[],lungPatches=[],bundle=null,theme='2'){
 const root=new T.Group(),dummy=new T.Object3D(),palette=createInstancePalette(),living=TISSUES.filter(t=>tissuePresent({layout},t)).map(t=>tissueAt({layout},t));
 const meadow=cityThemeObject(theme,'tissue')==='meadow-cottage';root.userData.tissueStyle=cityThemeObject(theme,'tissue');
 const plots=living.length?patches.map(p=>({...p,size:1,tissue:living.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b)})):[];
 for(const t of SKIN_TISSUES.filter(t=>tissuePresent({layout},t)).map(t=>tissueAt({layout},t)))for(const side of [-1,1])plots.push({x:t.x-t.nz*side*.75,z:t.z+t.nx*side*.75,variant:t.id+side,size:1.12,angle:Math.atan2(-t.nx,-t.nz),tissue:t});
 for(const p of lungPatches)plots.push({...p,size:2,lung:true,tissue:living.find(t=>t.district==='lung')||{district:'lung'}});
 for(const p of plots){p.seed=houseSeed(p.x,p.z);p.design=houseDesign(p.lung?'1':theme,p.lung?0:p.seed);const site=siteAt(layout,p.tissue.district);p.near=Math.hypot(p.x-site.x,p.z-site.z)<10;}
 const count=plots.length,material=new T.MeshStandardMaterial({color:0xffffff,roughness:.88}),batches={};
 function batch(name,geometry,limit,unlit=false){const mesh=new T.InstancedMesh(geometry,unlit?new T.MeshBasicMaterial({color:0xffffff}):material,limit);mesh.name=name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=!unlit;mesh.receiveShadow=!unlit;root.add(mesh);batches[name]=mesh;return mesh;}
 batch('tissue-cottages',new T.BoxGeometry(1,1,1),count*32);
 for(const kind of ['gable','hip','shed'])batch('tissue-roofs-'+kind,houseRoofGeometry(kind),count*(kind==='gable'?2:1));
 batch('tissue-repair',new T.TorusGeometry(1,.06,4,16),count,true);
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
 function put(id,p,x,y,z,w,h,d,tint,rx=0,ry=0,rz=0,index=null){const m=batches[id],i=index??m.count;if(i>=m.instanceMatrix.count)return;const angle=p.angle||0,cs=Math.cos(angle),sn=Math.sin(angle),size=p.size;
  dummy.position.set(p.x+(x*cs+z*sn)*size,y*size,p.z+(-x*sn+z*cs)*size);dummy.rotation.set(rx,angle+ry,rz);dummy.scale.set(w*size,h*size,d*size);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);m.setColorAt(i,palette(tint));if(index==null)m.count++;
 }
 const housing=['tissue-cottages','tissue-roofs-gable','tissue-roofs-hip','tissue-roofs-shed'],effects=['tissue-repair','tissue-fire','tissue-smoke'];
 let last=-Infinity,lastRun=null,housingKey=null,collisionKey='',collisionVersion=0;
 return {root,get collisionVersion(){return collisionVersion;},update(s){
  if(lastRun===s&&Math.abs(s.time-last)<.18)return;last=s.time;lastRun=s;
  const repairing=new Set();let lungRepair=false;
  for(const c of s.cells){if(c.task==='조직 블록 복구')repairing.add(c.tissueJob);if(c.kind==='fibroblast'&&c.target==='lung'&&c.task==='복구 준비')lungRepair=true;}
  let nextHousingKey='',nextCollisionKey='';
  for(const p of plots){const hp=s.frontier?.tissues[p.tissue?.id]?.hp??100,d=s.districts[p.lung?'lung':p.tissue.district];p.health=p.lung?d.hp:Math.min(hp,p.near?d.hp:100);nextHousingKey+=p.health<15?'0':p.health<70?'1':'2';nextCollisionKey+=p.health<15?'0':'1';}
  // Walls, roofs and windows change only across damage states. Keep their slots
  // in the existing batches; only the three lung fittings animate between changes.
  const rebuild=nextHousingKey!==housingKey;
  if(rebuild){housingKey=nextHousingKey;for(const id of housing)batches[id].count=0;}
  for(const id of effects)batches[id].count=0;for(const pool of props)pool.count=0;
  for(const p of plots){
   const health=p.health,dead=health<15,injured=health<70,repair=repairing.has(p.tissue?.id)||p.lung&&lungRepair;
   const a=p.design,variant=Math.floor(p.seed/6)%3,upper=!p.lung&&a.height>1.25,h=dead?.2:p.lung?.9:a.height,w=p.lung?1:a.width,depth=p.lung?1:a.depth,front=depth/2+.02;
   const wall=dead?0x756b61:injured?0xc2957a:p.lung?0xe2d7be:(meadow?[CITY_STYLE.plaster,CITY_STYLE.plasterWarm,0xe5e4cc]:[0xecd8b2,0xe7baa4,0xc7d6c5])[variant],roof=dead?0x635d57:injured?0x9f6049:p.lung?0x6a9e94:(meadow?(NEIGHBOURHOOD_ROOFS[p.district||p.tissue.district]||CITY_STYLE.roofs):[0xb5684c,0xc27f57,0xa95b45])[variant];
   const trim=0xf3e2c3,wood=0x8c785c,glass=injured?0xe49b62:0x608e8b;
   const part=(x,y,z,bw,bh,bd,c,rz=0)=>put('tissue-cottages',p,x,y,z,bw,bh,bd,c,0,0,rz);
   if(rebuild){part(0,.045,0,1.3,.09,1.3,0xc5bba2);part(0,.1+h/2,0,w,h,depth,wall);
   put('tissue-roofs-'+a.roof,p,0,.1+h,0,(a.turn?depth:w)+.16,dead?.1:a.rise,(a.turn?w:depth)+.16,roof,0,a.turn*Math.PI/2,dead?.13:0);
   part(0,.3,front,.22,dead?.16:.43,.035,0x67796b);
   if(!dead){
    part(0,.17,0,w+.03,.12,depth+.03,meadow?wood:trim);
    const window=(x,y,z,side=false)=>{part(x,y,z,side?.045:.25,.29,side?.27:.045,trim);part(x+(side?.025:0),y,z+(side?0:.025),side?.025:.18,.21,side?.2:.025,glass);};
    for(const side of [-1,1])window(side*w*.3,upper?h-.28:.62,front);
    window(w/2+.02,.62,-.1,true);
    if(upper){part(0,.86,0,w+.04,.06,depth+.04,trim);for(const side of [-1,1])window(side*w*.3,.55,front);}
    if(a.feature!=='terrace')part(-w*.28,h+.33,-depth*.25,.13,.42,.16,meadow?0xc4b49a:0xd2ad8d);
    if(!p.lung){
     if(a.feature==='porch'||a.feature==='shop'){
      part(0,.8,front+.06,w*.82,.055,.24,a.feature==='shop'?0xa8b58a:roof);
      if(a.feature==='porch')for(const side of [-1,1])part(side*w*.35,.46,front+.15,.04,.66,.04,wood);
      else{part(0,.78,front+.16,w*.82,.12,.035,trim);part(w*.3,.18,front+.04,.24,.2,.18,wood);}
     }else if(a.feature==='dormer'){
      part(-.12,h+.33,.12,.38,.3,.4,wall);part(-.12,h+.34,.33,.2,.2,.025,glass);
      put('tissue-roofs-gable',p,-.12,h+.48,.12,.46,.22,.48,roof);
     }else if(a.feature==='timber'){
      for(const side of [-1,1]){part(side*w*.45,h*.5+.1,front,.045,h,.035,wood);part(side*w*.24,h-.22,front+.01,.045,.5,.035,wood,side*.6);}
     }else if(a.feature==='shutters'){
      for(const side of [-1,1])for(const edge of [-1,1])part(side*w*.3+edge*.14,upper?h-.28:.62,front+.03,.065,.3,.04,0x6c8878);
     }else if(a.feature==='balcony'){
      const y=upper?.92:.42;part(0,y,front+.04,w*.85,.065,.24,trim);part(0,y+.23,front+.14,w*.85,.045,.035,wood);
      for(const x of [-.32,0,.32])part(x*w,y+.12,front+.14,.025,.24,.025,wood);
     }else if(a.feature==='loggia'){
      part(0,h-.32,front+.01,w*.8,.38,.035,glass);
      for(const x of [-.38,0,.38])part(x*w,h-.3,front+.035,.06,.43,.06,trim);
     }else if(a.feature==='terrace'){
      const y=h+.32;part(0,y,0,.78,.06,.68,wood);
      for(const x of [-.35,.35])for(const z of [-.29,.29])part(x,y+.2,z,.035,.4,.035,wood);
      for(const z of [-.29,.29])part(0,y+.39,z,.78,.045,.04,wood);
      part(0,y+.46,0,.84,.045,.7,trim);
     }
     if(a.feature!=='shop')part(-w*.3,.19,front+.04,.28,.2,.18,0x9eac7d);
    }
   }
   }
   if(p.lung&&!dead){
    if(rebuild)p.motionStart=batches['tissue-cottages'].count;
    const start=p.motionStart,breath=1+Math.sin(s.time*1.6+p.variant)*.045;
    put('tissue-cottages',p,0,h*.5,-.52,.8,h*.68*breath,.035,injured?0xc27f6c:0xa5d3c6,0,0,0,rebuild?null:start);
    for(const [i,side] of [-1,1].entries())put('tissue-cottages',p,side*.3,h+.27,.57,.035,.47,.04,0xf2e8d1,0,0,s.time*1.6+side*Math.PI/2,rebuild?null:start+i+1);
    if(!rebuild)markInstanceRange(batches['tissue-cottages'].instanceMatrix,start,3);
   }
   if(injured&&!repair){const q=(s.time*.6+p.variant*.19)%1;put('tissue-smoke',p,q*.3,h+.4+q*1.8,0,.16+q*.26,.25+q*.35,.16+q*.26,0x7d7972);if(health<50)for(const side of [-1,1])put('tissue-fire',p,side*.25,h*.7,.3,.2,.55+Math.abs(Math.sin(s.time*8+p.variant+side))*.45,.2,side<0?0xf68e36:0xffcd67);}
   if(repair){const r=.8+(s.time*.45)%1*.4;put('tissue-repair',p,0,.12,0,r,r,r,0x8ce3bb,Math.PI/2);}
   if(repair)putProp(scaffolds,p,.6,0);
   if(dead){putProp(rubble,p,-.35,.65);putProp(stones,p,.45,.6);}
  }
  if(nextCollisionKey!==collisionKey){collisionKey=nextCollisionKey;collisionVersion++;}
  for(const id of rebuild?[...housing,...effects]:effects){const m=batches[id];markInstanceRange(m.instanceMatrix,0,m.count);markInstanceRange(m.instanceColor,0,m.count);}
  for(const pool of props)for(const {mesh} of pool.parts){mesh.count=pool.count;markInstanceRange(mesh.instanceMatrix,0,mesh.count);}
 }};
}
