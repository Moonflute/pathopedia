import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAppRoute} from '../src/app-routing.mjs';

test('the first entry and home address open the tab selection screen',()=>{
 for(const hash of [undefined,null,'','#','#home']){
  assert.deepEqual(resolveAppRoute(hash),{view:'home',hash:'#home'});
 }
});

test('each selected screen retains its own direct address',()=>{
 for(const view of ['lab','treatment','defense','play','survival','reroll','city']){
  assert.deepEqual(resolveAppRoute('#'+view),{view,hash:'#'+view});
 }
 assert.deepEqual(resolveAppRoute('#cards'),{view:'cards',domain:'all',archiveOnly:false,hash:'#cards'});
});

test('existing collection bookmarks keep their filters while content anchors do not change screens',()=>{
 const routes=[
  ['#library','pathogens',false,'#cards/pathogens'],
  ['#drugs','drugs',false,'#cards/drugs'],
  ['#archive','all',true,'#cards/archive'],
  ['#diseases','diseases',false,'#cards/diseases'],
  ['#cards/archive/fungi','fungi',true,'#cards/archive/fungi']
 ];
 for(const [hash,domain,archiveOnly,canonical] of routes){
  assert.deepEqual(resolveAppRoute(hash),{view:'cards',domain,archiveOnly,hash:canonical});
 }
 for(const hash of ['#main','#unknown','#cards/archive/diseases','#cards/all/extra'])assert.equal(resolveAppRoute(hash),null);
});
