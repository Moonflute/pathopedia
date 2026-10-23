import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function worker(){
 const handlers={},added=[],stored=new Map(),requests=[];let offline=false;
 const key=r=>typeof r==='string'?r:r.url,cache={addAll:async rs=>added.push(...rs),add:async r=>added.push(r),match:async r=>stored.get(key(r)),put:async(r,response)=>stored.set(key(r),response)};
 vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{URL,Request,caches:{open:async()=>cache},self:{registration:{scope:'https://example.com/pathopedia/'},location:{hostname:'example.com'},addEventListener:(name,fn)=>handlers[name]=fn},fetch:async(r,options)=>{requests.push({url:key(r),cache:options?.cache});if(offline)throw Error('offline');return new Response('current deployment',{status:key(r).includes('morphology')?404:200});}});
 return {handlers,added,stored,requests,setOffline:()=>offline=true};
}
test('new release and optional modules bypass the previous deployment HTTP cache',async()=>{
 const w=worker();let work;w.handlers.install({waitUntil:p=>work=p});await work;assert.ok(w.added.some(r=>r.url.endsWith('/src/app.mjs')));assert.ok(w.added.every(r=>r.cache==='reload'));
 w.handlers.message({data:'CACHE_CITY',waitUntil:p=>work=p});await work;assert.ok(w.added.some(r=>r.url.endsWith('/src/city-engine.mjs')));assert.ok(w.added.every(r=>r.cache==='reload'));
});
test('first city module request revalidates and remains usable offline afterwards',async()=>{
 const w=worker(),request=new Request('https://example.com/pathopedia/src/city-first-person.mjs');let result,pending=[];
 w.handlers.fetch({request,respondWith:p=>result=p,waitUntil:p=>pending.push(p)});assert.equal(await(await result).text(),'current deployment');await Promise.all(pending);assert.equal(w.requests.at(-1).cache,'no-cache');w.setOffline();
 w.handlers.fetch({request,respondWith:p=>result=p,waitUntil:p=>pending.push(p)});assert.equal(await(await result).text(),'current deployment');assert.equal(w.requests.length,1);
});
