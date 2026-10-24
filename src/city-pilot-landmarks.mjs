import {BoxGeometry,CylinderGeometry,Mesh,MeshStandardMaterial,Group} from './vendor/three/three.module.min.js';
import {siteAt} from './city-tile-layout.mjs';

// Six roof pads reuse existing facility footprints; ground routes stay open.
export function addPilotLandmarks(fixed,layout,surface){
 const root=new Group();root.name='cell-observation-roofs';
 const box=new BoxGeometry(1,1,1),cylinder=new CylinderGeometry(.065,.065,1,8),metal=new MeshStandardMaterial({color:0x5b807d,roughness:.8}),stripe=new MeshStandardMaterial({color:0xefcb7e,roughness:.8});
 for(const id of ['lung','heart','gut','kidney','marrow','lymph']){
  const site=siteAt(layout,id);if(!site?.building)continue;const [x,z]=site.building;
  const hit=surface.trace({x,y:13,z},{x:0,y:-1,z:0},13);if(!hit||hit.y<1)continue;
  const pad=new Mesh(box,metal);pad.position.set(x,hit.y+.04,z);pad.scale.set(1.6,.08,1.25);root.add(pad);
  for(const side of [-1,1]){const post=new Mesh(cylinder,metal);post.position.set(x+side*.65,hit.y+.6,z+.45);post.scale.y=1.1;root.add(post);}
  const bar=new Mesh(box,stripe);bar.position.set(x,hit.y+1.14,z+.45);bar.scale.set(1.45,.14,.16);root.add(bar);
  for(const side of [-1,1]){const marker=new Mesh(box,stripe);marker.position.set(x+side*.68,hit.y+.09,z-.25);marker.scale.set(.12,.025,.7);root.add(marker);}
 }
 if(root.children.length)fixed.add(root);else{box.dispose();cylinder.dispose();metal.dispose();stripe.dispose();}
 return root;
}
