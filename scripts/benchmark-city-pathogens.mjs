// One bounded CPU/render-instance sample per population; browser FPS is separate.
import {performance} from 'node:perf_hooks';
import {createCity,tickCity,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';
import {groundCoordinate,qualityProfile} from '../src/city-three-layout.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {pathogenDef} from '../src/city-pathogens.mjs';
const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());
const profile=qualityProfile(390),actors=createActors(profile),base=serializeCity(s),p=pathogenDef('SAU-002');
for(const count of [64,128,256]){
 const run=restoreCity(base);
 for(let i=0;i<count;i++){const a=i*2.399963229728653,r=3+i%9;run.enemies.push({id:++run.serial,recordId:p.recordId,hp:1e6,maxHp:1e6,color:p.color,front:'blood',entered:true,site:'heart',...groundCoordinate({x:Math.cos(a)*r,z:2+Math.sin(a)*r})});}
 for(let i=0;i<40;i++)tickCity(run,1/30,null);
 const times=[];for(let i=0;i<180;i++){const t=performance.now();tickCity(run,1/30,null);times.push(performance.now()-t);}times.sort((a,b)=>a-b);
 const t=performance.now();actors.draw(run);const drawMs=performance.now()-t;let triangles=0;actors.root.traverse(m=>{if(m.isInstancedMesh)triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count;});
 console.log(JSON.stringify({pathogens:count,cells:run.cells.length,meanTickMs:+(times.reduce((a,b)=>a+b,0)/times.length).toFixed(3),p95TickMs:+times[Math.floor(times.length*.95)].toFixed(3),instanceUpdateMs:+drawMs.toFixed(2),actorTriangles:triangles,batches:actors.root.children.length}));
}
