import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,HOSTS} from '../src/defense-data.mjs';
import {playReferenceCampaign} from './helpers/defense-player.mjs';

for(const map of MAPS)for(const host of HOSTS)test('12-wave campaign is clearable with ordinary placements: '+map.id+' / '+host.id,()=>{
 for(const seed of [7,42,108]){
  const result=playReferenceCampaign(map.id,host.id,seed);
  assert.equal(result.status,'won',JSON.stringify(result));
  assert.equal(result.wave,12);assert.ok(result.hp>0);
 }
});
