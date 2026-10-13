import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayCatalog} from '../src/play-data.mjs';
import {playCampaign} from './helpers/play-player.mjs';
const catalog=createPlayCatalog(JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8')));
for(const options of [{seed:12},{seed:94},{seed:31,hard:true,host:'neutropenia'}])test('six-wave Play campaign can finish using movement, real coverage and source control: '+JSON.stringify(options),()=>{
 const result=playCampaign(catalog,options);assert.equal(result.status,'won',JSON.stringify(result));assert.equal(result.sources,3);assert.equal(result.kills,115);assert.equal(result.reports.length,5);assert.ok(result.time>=240&&result.time<600);
});
