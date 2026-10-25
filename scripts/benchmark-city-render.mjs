// CPU presentation work only, not browser/GPU FPS. The same live city feeds
// both versions. Optional: node scripts/benchmark-city-render.mjs --baseline=<ref>
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createCity,tickCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';
import {compileThemeLayout} from '../src/city-theme-layout.mjs';
import {qualityProfile} from '../src/city-three-layout.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {createTissueScene} from '../src/city-three-tissue.mjs';

const ref=process.argv.find(v=>v.startsWith('--baseline='))?.slice(11);
async function previous(file){
 const url=new URL('../src/'+file,import.meta.url);
 const source=execFileSync('git',['show',`${ref}:src/${file}`],{encoding:'utf8',maxBuffer:2e6})
  .replace(/from (['"])(\.\.?\/[^'"]+)\1/g,(_,quote,path)=>`from ${quote}${new URL(path,url).href}${quote}`);
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const factories=[{name:'current',createActors,createTissueScene}];
if(ref)factories.unshift({name:ref,...await previous('city-three-actors.mjs'),...await previous('city-three-tissue.mjs')});
const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());
const town=compileThemeLayout(s.layout,'1');
const versions=factories.map(f=>({...f,actors:f.createActors(qualityProfile(390)),tissue:f.createTissueScene(s.layout,town.blocks.tissues,town.blocks.lung,null,'1'),actorMs:[],tissueMs:[],uploads:[],seen:new WeakMap()}));
function consumeUploads(v){
 let bytes=0;for(const m of v.tissue.root.children)for(const a of [m.instanceMatrix,m.instanceColor]){
  if(!a||v.seen.get(a)===a.version)continue;
  bytes+=a.updateRanges.length?a.updateRanges.reduce((n,r)=>n+r.count*a.array.BYTES_PER_ELEMENT,0):a.array.byteLength;
  a.clearUpdateRanges();v.seen.set(a,a.version);
 }return bytes;
}
function compare(a,b){
 assert.equal(a.children.length,b.children.length);
 for(let i=0;i<a.children.length;i++){const x=a.children[i],y=b.children[i];assert.equal(x.name,y.name);assert.equal(x.count,y.count);
  for(const key of ['instanceMatrix','instanceColor'])assert.deepEqual(x[key]?.array.slice(0,x.count*x[key].itemSize),y[key]?.array.slice(0,y.count*y[key].itemSize),x.name+' '+key);
 }
}
for(let frame=0;frame<240;frame++){
 if(frame%2===0)tickCity(s,1/30,null);
 for(const v of frame%2?[...versions].reverse():versions){
  let start=performance.now();v.actors.draw(s);const actors=performance.now()-start;
  start=performance.now();v.tissue.update(s);const tissue=performance.now()-start,bytes=consumeUploads(v);
  if(frame>=40){v.actorMs.push(actors);if(bytes){v.tissueMs.push(tissue);v.uploads.push(bytes);}}
 }
 if(versions.length===2&&(frame===40||frame===239)){compare(versions[0].actors.root,versions[1].actors.root);compare(versions[0].tissue.root,versions[1].tissue.root);}
}
const stats=a=>{a.sort((x,y)=>x-y);return {mean:+(a.reduce((n,v)=>n+v,0)/a.length).toFixed(3),p95:+a[Math.floor(a.length*.95)].toFixed(3)};};
console.log(JSON.stringify({cells:s.cells.length,residents:s.somatic.people.length,plots:town.blocks.tissues.length,comparison:versions.length===2?'instance matrices and colors identical':null,versions:versions.map(v=>({name:v.name,actorsMs:stats(v.actorMs),housingUpdateMs:stats(v.tissueMs),housingUploadBytes:stats(v.uploads),batches:v.actors.root.children.length+v.tissue.root.children.length}))},null,2));
