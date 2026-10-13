import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayCatalog,STAGES,createMap} from '../src/play-data.mjs';
import {playCampaign} from './helpers/play-player.mjs';
const catalog=createPlayCatalog(JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8')));
for(const options of [{seed:12},{seed:94,host:'allergy'},{seed:31,hard:true,host:'neutropenia'},{seed:57,host:'renal'}])test('eight-stage Play campaign completes with real movement, coverage and source control: '+JSON.stringify(options),()=>{
 const result=playCampaign(catalog,options);assert.equal(result.status,'won',JSON.stringify(result));assert.equal(result.sources,STAGES.reduce((n,_,i)=>n+createMap(i).sources.length,0));assert.equal(result.kills,STAGES.reduce((n,s)=>n+s.count,0));assert.equal(result.reports.length,7);assert.equal(result.completed,8);assert.ok(result.time<1200);
});
for(let stage=0;stage<STAGES.length;stage++)test('single-stage practice can clear '+STAGES[stage].name,()=>{
 const result=playCampaign(catalog,{seed:14+stage,stage,mission:'single',limit:240});assert.equal(result.status,'won',JSON.stringify(result));assert.equal(result.completed,1);assert.equal(result.kills,STAGES[stage].count);
});
