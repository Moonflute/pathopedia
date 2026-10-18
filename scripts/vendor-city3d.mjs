// Reproducible, opt-in asset import. Archives stay in memory; no Blender/build tools.
import {inflateRawSync,gunzipSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='https://kenney.nl/media/pages/assets/fantasy-town-kit/efe948d309-1754222374/kenney_fantasy-town-kit_2.0.zip';
const version='0.180.0';
const names=['wall','wall-window-glass','wall-wood-door','wall-wood-window-shutters','roof-gable','roof-gable-end','roof','roof-point','chimney','windmill','blade','tree','tree-high-round','tree-crooked','rock-large','rock-small','stall-red','stall-green','cart','fence','fence-gate','lantern','banner-red','banner-green','watermill'];
async function download(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);return Buffer.from(await r.arrayBuffer());}
function unzip(b){let end=b.length-22;while(end>=0&&b.readUInt32LE(end)!==0x06054b50)end--;if(end<0)throw Error('Invalid ZIP');const files=new Map();let at=b.readUInt32LE(end+16);while(b.readUInt32LE(at)===0x02014b50){const n=b.readUInt16LE(at+28),extra=b.readUInt16LE(at+30),comment=b.readUInt16LE(at+32),local=b.readUInt32LE(at+42),size=b.readUInt32LE(at+20),name=b.subarray(at+46,at+46+n).toString();const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28),raw=b.subarray(start,start+size),method=b.readUInt16LE(at+10);if(!name.endsWith('/'))files.set(name,method===8?inflateRawSync(raw):raw);at+=46+n+extra+comment;}return files;}
function untar(b){const files=new Map();for(let at=0;at+512<b.length;){const name=b.subarray(at,at+100).toString().replace(/\0.*$/s,''),size=parseInt(b.subarray(at+124,at+136).toString(),8)||0;if(!name)break;files.set(name,b.subarray(at+512,at+512+size));at+=512+Math.ceil(size/512)*512;}return files;}
const zip=await download(source),assets=unzip(zip),dir='assets/city3d/kenney';await mkdir(dir,{recursive:true});
for(const name of names){const file=assets.get(`Models/GLB format/${name}.glb`);if(!file)throw Error(name);await writeFile(`${dir}/${name}.glb`,file);}
await writeFile(`${dir}/License.txt`,assets.get('License.txt'));
await mkdir(`${dir}/Textures`,{recursive:true});
const palette=assets.get('Models/GLB format/Textures/colormap.png');if(!palette)throw Error('Missing model palette');
await writeFile(`${dir}/Textures/colormap.png`,palette);
const tar=await download(`https://registry.npmjs.org/three/-/three-${version}.tgz`),three=untar(gunzipSync(tar)),vendor='src/vendor/three';await mkdir(vendor,{recursive:true});
for(const name of ['three.core.min.js','three.module.min.js'])await writeFile(`${vendor}/${name}`,three.get(`package/build/${name}`));
for(const [from,to] of [['controls/OrbitControls.js','OrbitControls.js'],['loaders/GLTFLoader.js','GLTFLoader.js'],['utils/BufferGeometryUtils.js','BufferGeometryUtils.js']]){
 const text=three.get('package/examples/jsm/'+from).toString().replaceAll("from 'three'","from './three.module.min.js'").replaceAll("'../utils/BufferGeometryUtils.js'","'./BufferGeometryUtils.js'");await writeFile(`${vendor}/${to}`,text);
}
await writeFile(`${vendor}/LICENSE`,three.get('package/LICENSE'));
const manifest={kenney:{pack:'Fantasy Town Kit 2.0',page:'https://kenney.nl/assets/fantasy-town-kit',license:'CC0-1.0',source,archiveSha256:createHash('sha256').update(zip).digest('hex'),models:names},three:{version,license:'MIT',source:`https://registry.npmjs.org/three/-/three-${version}.tgz`,archiveSha256:createHash('sha256').update(tar).digest('hex')}};
await writeFile('assets/city3d/sources.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Vendored ${names.length} Kenney models and Three.js ${version}`);
