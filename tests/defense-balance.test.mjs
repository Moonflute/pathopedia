import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES} from '../src/defense-data.mjs';
import {stageSchedule} from '../src/defense-engine.mjs';
import {playStage} from './helpers/defense-player.mjs';
test('all reinforcements are disclosed in the chosen stage and remain deterministic',()=>{
 for(const stage of STAGES){const plan=stageSchedule(stage);assert.ok(plan.every(p=>stage.enemies.includes(p.pathogenId)));assert.deepEqual(plan,stageSchedule(stage));}
});
test('each of the 12 stages can be cleared with a tailored deck and ordinary controls',()=>{
 const results=STAGES.map((_,i)=>playStage(i));
 assert.deepEqual(results.filter(r=>r.status!=='won'),[],JSON.stringify(results));
});
