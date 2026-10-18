// CPU-only simulation budget. This does not measure mobile GPU or canvas frame rate.
import {performance} from 'node:perf_hooks';
import {createCity,tickCity} from '../src/city-engine.mjs';
import {JOBS,WAVES} from '../src/city-data.mjs';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
for(const size of [40,96,160]){
  const s=createCity('normal','steady');s.endless=true;s.nextWave=Infinity;s.lifecycle=true;
  const templates=s.cells.map(c=>structuredClone(c));s.cells=[];
  const kinds=size===40?templates.map(c=>c.kind):Object.entries(JOBS).flatMap(([kind,job])=>Array(Math.floor(job.cap*size/96)).fill(kind));
  while(kinds.length<size)kinds.push('neutrophil');
  for(let i=0;i<size;i++){const kind=kinds[i],pool=templates.filter(c=>c.kind===kind),c=structuredClone(pool[i%pool.length]);c.id=++s.serial;c.x+=(i%5)*3;c.y+=(i%7)*2;c.age=0;s.cells.push(c);}
  s.enemies=Array.from({length:24},(_,i)=>({id:++s.serial,...WAVES[2],hp:1e8,maxHp:1e8,x:800+i%6*16,y:280+Math.floor(i/6)*19,dead:false}));
  const times=[];
  for(let i=0;i<1400;i++){
    for(const d of Object.values(s.districts)){d.hp=100;d.oxygen=100;d.food=20;}s.waste=12;s.inflammation=0;
    const before=performance.now();tickCity(s,.05,data);const elapsed=performance.now()-before;if(i>=200)times.push(elapsed);
  }
  times.sort((a,b)=>a-b);
  console.log(JSON.stringify({cells:size,enemies:24,lifetimes:true,samples:times.length,meanMs:+(times.reduce((a,b)=>a+b)/times.length).toFixed(3),p95Ms:+times[Math.floor(times.length*.95)].toFixed(3),maxMs:+times.at(-1).toFixed(3),productionCap:Object.values(JOBS).reduce((n,j)=>n+j.cap,0)}));
}
