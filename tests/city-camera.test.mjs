import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityCamera} from '../src/city-camera.mjs';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} ≈ ${expected}`);
const samePoint=(a,b)=>{close(a.x,b.x);close(a.y,b.y);};
function camera(){const view=createCityCamera();view.setViewport(390,600);return view;}

test('wheel zoom keeps the world point under the cursor and can return to the overview',()=>{
  const view=camera(),cursor={x:275,y:260},anchor=view.world(cursor),initial=view.info().scale;
  view.zoomAt(2,cursor);samePoint(view.world(cursor),anchor);close(view.info().scale,initial*2);
  view.zoomAt(.5,cursor);samePoint(view.world(cursor),anchor);close(view.info().scale,initial);
  view.zoomAt(100);close(view.info().scale,view.info().max);
  view.fit();assert.ok(view.info().scale<initial);assert.equal(view.info().overview,true);
  view.zoomAt(.01);close(view.info().scale,view.info().min);
});

test('two fingers zoom and move the same scene point with their midpoint',()=>{
  const view=camera(),anchor=view.world({x:195,y:300}),scale=view.info().scale;
  view.down(1,{x:145,y:300});view.down(2,{x:245,y:300});
  view.move(1,{x:130,y:330});view.move(2,{x:330,y:330});
  samePoint(view.world({x:230,y:330}),anchor);close(view.info().scale,scale*2);
  assert.equal(view.up(2,{x:330,y:330}),null);
  const next=view.world({x:130,y:330});view.move(1,{x:140,y:340});
  samePoint(view.world({x:140,y:340}),next);
  assert.equal(view.up(1,{x:140,y:340}),null);
});

test('tap selects, while a drag, cancellation or interrupted gesture never selects',()=>{
  const view=camera(),point={x:195,y:300};
  view.down(1,point);samePoint(view.up(1,point),view.world(point));
  view.down(2,point);view.move(2,{x:225,y:300});assert.equal(view.up(2,{x:225,y:300}),null);
  view.down(3,point);assert.equal(view.up(3,point,true),null);
  view.down(4,point);view.clear();assert.equal(view.up(4,point),null);
});

test('opening a mobile panel or rotating preserves the chosen magnification',()=>{
  const view=camera();view.zoomAt(1.7);const scale=view.info().scale;
  view.setViewport(390,600,308);close(view.info().scale,scale);
  view.setViewport(844,250);close(view.info().scale,scale);
  view.setViewport(390,600);close(view.info().scale,scale);
});
