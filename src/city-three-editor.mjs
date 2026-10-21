import {CITY_BOUNDS} from './city-world.mjs';
import * as T from './vendor/three/three.module.min.js';
import {occupiedTiles,tileAllowed,placementCheck,layoutPlaceables} from './city-tile-layout.mjs';
export function createEditorOverlay(){
 const root=new T.Group(),positions=[];root.visible=false;
 for(let x=CITY_BOUNDS.left;x<=CITY_BOUNDS.right;x++)for(let z=CITY_BOUNDS.top;z<=CITY_BOUNDS.bottom;z++)if(tileAllowed(x,z,'kidney'))for(const [a,b] of [[[-.5,-.5],[.5,-.5]],[[-.5,-.5],[-.5,.5]]])positions.push(x+a[0],.09,z+a[1],x+b[0],.09,z+b[1]);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));const grid=new T.LineSegments(geometry,new T.LineBasicMaterial({color:0x788e84,transparent:true,opacity:.3,depthWrite:false}));root.add(grid);
 const material=new T.MeshBasicMaterial({color:0x7bb994,transparent:true,opacity:.38,side:T.DoubleSide,depthWrite:false}),tiles=new T.InstancedMesh(new T.PlaneGeometry(.94,.94),material,140),dummy=new T.Object3D();tiles.frustumCulled=false;root.add(tiles);
 let last=null,lastId=null,lastPose='';
 return {root,update(e){root.visible=!!e;if(!e)return;const p=e.preview||e.draft.items[e.selected],pose=JSON.stringify(p);if(last===e.draft&&lastId===e.selected&&lastPose===pose)return;last=e.draft;lastId=e.selected;lastPose=pose;material.color.setHex(placementCheck(e.draft,e.selected,p).ok?0x7fb993:0xd98170);tiles.count=0;for(const c of occupiedTiles(e.selected,p)){dummy.position.set(c.col,.105,c.row);dummy.rotation.set(-Math.PI/2,0,0);dummy.updateMatrix();tiles.setMatrixAt(tiles.count++,dummy.matrix);}tiles.instanceMatrix.needsUpdate=true;},pick(e,p){const x=Math.round(p.x),z=Math.round(p.z);return layoutPlaceables(e.draft).reverse().find(d=>occupiedTiles(d.id,e.draft.items[d.id]).some(c=>c.col===x&&c.row===z))?.id;}};
}
