import * as T from './vendor/three/three.module.min.js';
import {pilotSites} from './city-pilot-sites.mjs';
import {pilotTool} from './city-pilot-state.mjs';

// Small moving fittings sit on the existing CC0 workbenches and oxygen ports.
export function createPilotFixtures(){
 const root=new T.Group(),fittings=new T.Group();root.add(fittings);
 const box=new T.BoxGeometry(1,1,1),ring=new T.TorusGeometry(.18,.03,5,16),sphere=new T.SphereGeometry(.035,5,4),edges=new T.EdgesGeometry(box);
 const materials=new Map(),icons=new Map(),entries=[];let layout=null;
 const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);};
 function mesh(g,geometry,color,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;}
 function icon(kind){
  if(!icons.has(kind)){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=80;const c=canvas.getContext('2d');c.fillStyle='#163f36';c.fillRect(0,0,128,80);c.strokeStyle=kind==='oxygen'?'#9be9e8':kind==='produce'?'#d4b5f6':'#f3d597';c.lineWidth=5;c.strokeRect(3,3,122,74);c.fillStyle=c.strokeStyle;c.font='bold 42px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(kind==='oxygen'?'O₂':kind==='produce'?'Y':'▣',64,42);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;icons.set(kind,new T.SpriteMaterial({map:texture,depthTest:true,transparent:true}));}
  return icons.get(kind);
 }
 const outlineMaterial=new T.LineBasicMaterial({color:0xa4f5cb}),outline=new T.LineSegments(edges,outlineMaterial);root.add(outline);outline.visible=false;
 const meter=mesh(root,box,0xb4f5cc,0,0,0,.7,.045,.04);meter.visible=false;
 const particleMaterial=new T.MeshBasicMaterial({color:0xb5efde}),particles=new T.InstancedMesh(sphere,particleMaterial,12),dummy=new T.Object3D();particles.frustumCulled=false;particles.count=0;root.add(particles);
 function rebuild(s){
  layout=s.layout;fittings.clear();entries.length=0;
  for(const site of pilotSites(s)){
   const g=new T.Group();g.position.set(site.target.x,0,site.target.z);g.rotation.y=Math.atan2(site.approach.x-site.target.x,site.approach.z-site.target.z);fittings.add(g);
   const color=pilotTool(site.tool).color,part=new T.Group();g.add(part);
   if(site.role==='oxygen'){part.position.set(0,.74,.035);mesh(part,ring,color,0,0,0);mesh(part,box,0xf2deb3,0,0,0,.04,.33,.045);mesh(part,box,0xf2deb3,0,0,0,.33,.04,.045);}
   else{part.position.set(0,.46,-.34);mesh(part,box,color,0,0,.34,.69,.07,.68);mesh(part,box,0xf2deb3,0,.045,.34,.10,.025,.65);mesh(part,box,0x335b4e,0,.04,.55,.18,.06,.07);}
   const label=new T.Sprite(icon(site.role));label.position.set(0,site.role==='oxygen'?1.26:1.1,0);label.scale.set(.58,.36,1);g.add(label);entries.push({site,g,part,label,open:0});
  }
 }
 function update(s,v){
  if(layout!==s.layout)rebuild(s);
  const focus=v.interaction,near=entries.map(e=>({...e,d:Math.hypot(e.site.target.x-v.position.x,e.site.target.z-v.position.z)})).sort((a,b)=>a.d-b.d),labels=new Set(near.filter(e=>e.d<14).slice(0,3).map(e=>e.site.key));
  for(const e of entries){const key=e.site.key,working=focus?.key===key&&v.progress>0,pulse=v.workPulse?.key===key?v.workPulse:null;e.g.visible=Math.hypot(e.site.target.x-v.position.x,e.site.target.z-v.position.z)<22;e.label.visible=labels.has(key);const amount=working?Math.max(.35,v.progress):pulse?1-pulse.progress:0;e.open+=(amount-e.open)*.2;if(e.site.role==='oxygen')e.part.rotation.z=(working?s.time*4:e.part.rotation.z);else e.part.rotation.x=-e.open*1.25;}
  outline.visible=!!focus;meter.visible=!!focus&&v.progress>0;
  if(focus){outline.position.set(focus.target.x,focus.height,focus.target.z);outline.scale.setScalar(focus.radius*2.1);outlineMaterial.color.setHex(focus.matching&&focus.near?0xa4f5cb:0xffd589);meter.position.set(focus.target.x-.35+v.progress*.35,focus.height+focus.radius+.18,focus.target.z);meter.scale.x=.7*v.progress;}
  particles.count=0;const pulse=v.workPulse;
  if(pulse){particleMaterial.color.setHex(pilotTool(pulse.tool).color);for(let i=0;i<12;i++){const t=(pulse.progress+i*.045)%1,q=pulse.loading?1-t:t,y=pulse.from.y??.5;dummy.position.set(pulse.from.x+(pulse.target.x-pulse.from.x)*q,y+(pulse.height-y)*q+Math.sin(t*Math.PI)*.22,pulse.from.z+(pulse.target.z-pulse.from.z)*q);dummy.scale.setScalar(Math.sin(t*Math.PI)*(1-pulse.progress));dummy.updateMatrix();particles.setMatrixAt(particles.count++,dummy.matrix);}particles.instanceMatrix.needsUpdate=true;}
 }
 return {root,update,dispose(){box.dispose();ring.dispose();sphere.dispose();edges.dispose();outlineMaterial.dispose();particleMaterial.dispose();for(const m of materials.values())m.dispose();for(const m of icons.values()){m.map.dispose();m.dispose();}root.clear();}};
}
