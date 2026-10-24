import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCanalShore} from '../src/city-canal-shore.mjs';
import {canalShoreGeometry} from '../src/city-three-shore.mjs';
import {createTileLayout} from '../src/city-tile-layout.mjs';
import {compileCanalLayout} from '../src/city-canal-layout.mjs';

function edgesOf(cells){
 const occupied=new Set(cells.map(([x,z])=>x+','+z)),edges=[];
 for(const [x,z] of cells){
  const a=x*.5,b=z*.5;
  if(!occupied.has(x+','+(z-1)))edges.push([a,b,a+.5,b]);
  if(!occupied.has((x+1)+','+z))edges.push([a+.5,b,a+.5,b+.5]);
  if(!occupied.has(x+','+(z+1)))edges.push([a+.5,b+.5,a,b+.5]);
  if(!occupied.has((x-1)+','+z))edges.push([a,b+.5,a,b]);
 }
 return edges;
}
const area=points=>points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p.x*q.z-q.x*p.z;},0)/2;

test('diagonal shoreline loses its staircase while straight banks remain straight',()=>{
 const cells=[];for(let x=0;x<30;x++)for(let z=x;z<x+6;z++)cells.push([x,z]);
 const edges=edgesOf(cells),shore=compileCanalShore(edges),points=shore.loops[0];
 assert.equal(shore.islands.length,1);
 assert.ok(points.length<edges.length/4,'collinear steps collapse to long diagonal banks');
 assert.ok(points.some((p,i)=>{const q=points[(i+1)%points.length];return Math.abs(q.x-p.x)>8&&Math.abs(q.z-p.z)>8;}));
 for(let x=1;x<14;x+=.25){assert.equal(shore.isLand({x,z:x+1.5}),true);assert.equal(shore.isLand({x,z:x-1}),false);}
 const rectangle=[];for(let x=0;x<16;x++)for(let z=0;z<8;z++)rectangle.push([x,z]);
 const bank=compileCanalShore(edgesOf(rectangle));
 assert.ok(bank.loops[0].some((p,i)=>{const q=bank.loops[0][(i+1)%bank.loops[0].length];return Math.abs(p.z)<.04&&Math.abs(q.z)<.04&&Math.abs(q.x-p.x)>6;}),'a long straight bank stays within 0.04 of its original line');
});

test('water holes and corner-touching islands remain separate after smoothing',()=>{
 const cells=[];for(let x=0;x<12;x++)for(let z=0;z<12;z++)if(x<3||z<3||x>=9||z>=9)cells.push([x,z]);
 cells.push([12,12]);
 const shore=compileCanalShore(edgesOf(cells));
 assert.equal(shore.islands.length,2);assert.equal(shore.islands.reduce((s,p)=>s+p.holes.length,0),1);
 assert.equal(shore.isLand({x:3,z:3}),false);assert.equal(shore.isLand({x:1,z:3}),true);
 assert.equal(shore.isLand({x:6,z:6}),false);assert.equal(shore.isLand({x:6.25,z:6.25}),true);
 const mesh=canalShoreGeometry(shore),p=mesh.top.attributes.position;
 let surfaceArea=0;
 for(let i=0;i<p.count;i+=3){
  surfaceArea+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getZ(i+1)-p.getZ(i))*(p.getX(i+2)-p.getX(i)))/2;
  assert.equal(shore.isLand({x:(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z:(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3}),true,'top never fills a water hole');
 }
 assert.ok(Math.abs(surfaceArea-shore.loops.reduce((sum,loop)=>sum+area(loop),0))<1e-6);
 Object.values(mesh).forEach(g=>g.dispose());
});

test('city quays share the top boundary and use fewer triangles without changing the save',()=>{
 const layout=createTileLayout(),save=JSON.stringify(layout),canals=compileCanalLayout(layout),shore=canals.shore,mesh=canalShoreGeometry(shore);
 const p=mesh.top.attributes.position,n=mesh.top.attributes.normal;
 let surfaceArea=0;
 for(let i=0;i<p.count;i+=3){
  surfaceArea+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getZ(i+1)-p.getZ(i))*(p.getX(i+2)-p.getX(i)))/2;
  assert.ok(n.getY(i)>.99,'land faces the camera');
 }
 assert.ok(Math.abs(surfaceArea-shore.loops.reduce((sum,loop)=>sum+area(loop),0))<.001);
 const boundary=shore.loops.flat(),bank=mesh.banks.attributes.position,rim=mesh.rim.attributes.position;
 for(let i=0;i<boundary.length;i++)for(const edge of [bank,rim]){
  assert.ok(Math.abs(edge.getX(i*6)-boundary[i].x)<1e-5);assert.ok(Math.abs(edge.getZ(i*6)-boundary[i].z)<1e-5);
 }
 const oldTriangles=canals.rows.length*2+canals.edges.length*4,newTriangles=Object.values(mesh).reduce((sum,g)=>sum+g.attributes.position.count/3,0);
 assert.ok(newTriangles<oldTriangles/2,'smooth edges must not inflate terrain geometry');
 assert.equal(compileCanalLayout(layout).shore,shore,'reuse the compiled shoreline');assert.equal(JSON.stringify(layout),save);
 Object.values(mesh).forEach(g=>g.dispose());
});
