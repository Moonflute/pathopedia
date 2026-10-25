import test from 'node:test';
import assert from 'node:assert/strict';
import {Color,InstancedBufferAttribute} from '../src/vendor/three/three.module.min.js';
import {createInstancePalette,markInstanceRange} from '../src/city-three-instances.mjs';

test('instance colors reuse the existing Three.js linear color conversion with bounded retention',()=>{
 const palette=createInstancePalette(3);
 for(const value of [0xdf7363,'#6697bd','rgb(127, 50, 10)']){
  const first=palette(value);assert.deepEqual(first,new Color().set(value));assert.equal(palette(value),first);
 }
 const first=palette(0xdf7363);palette('#ffffff');assert.notEqual(palette(0xdf7363),first);assert.deepEqual(palette(0xdf7363),first);
 const linear=new Color(.2,.3,.4);assert.equal(palette(linear),linear);
});

test('partial instance uploads retain all pending changes until the renderer consumes them',()=>{
 const a=new InstancedBufferAttribute(new Float32Array(160),16);
 markInstanceRange(a,0,8);markInstanceRange(a,6,1);assert.deepEqual(a.updateRanges,[{start:0,count:128}]);
 a.clearUpdateRanges();markInstanceRange(a,6,1);markInstanceRange(a,8,1);assert.deepEqual(a.updateRanges,[{start:96,count:48}]);
 const version=a.version;markInstanceRange(a,0,0);assert.equal(a.version,version);assert.equal(a.updateRanges.length,1);
 a.clearUpdateRanges();markInstanceRange(a,2,1);assert.deepEqual(a.updateRanges,[{start:32,count:16}]);
});
