import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionFold} from '../site/paket/js/motion-fold.js';
import {PlasticSheet} from '../site/paket/js/plastic.js';
import {screenGravity,normalizedTilt} from '../site/paket/js/tilt-input.js';
const near=(a,b,epsilon=.0001)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const settle=(fold,frames=120,dt=1/60)=>{for(let i=0;i<frames;i++)fold.apply(dt);};
function fixture(){const sheet=new PlasticSheet(3.15,4.2,18,24,12);return {sheet,fold:new MotionFold(sheet)};}

test('absolute posture distinguishes table, upright and left/right including screen rotation',()=>{
  near(screenGravity(0,0).x,0);near(screenGravity(0,0).y,0);
  near(screenGravity(90,0).y,1);
  near(screenGravity(0,-30).x,-.5);near(screenGravity(0,30).x,.5);
  near(screenGravity(90,0,90).x,1);near(screenGravity(90,0,90).y,0);
  near(normalizedTilt(36,16,{beta:30,gamma:10},0,12).x,.5);
});

test('upright folds lower edge backward and flat restores the whole sheet without accumulation',()=>{
  const {sheet,fold}=fixture();fold.setGravity(screenGravity(90,0));settle(fold);
  const bottom=sheet.rows*(sheet.columns+1)*3;
  assert.ok(sheet.positions[bottom+1]>sheet.rest[bottom+1]+1);
  assert.ok(sheet.positions[bottom+2]<sheet.rest[bottom+2]-.3);
  near(sheet.positions[1],sheet.rest[1]);
  const held=sheet.positions.slice();settle(fold);
  held.forEach((v,i)=>near(sheet.positions[i],v));
  fold.setGravity(screenGravity(0,0));settle(fold);
  sheet.positions.forEach((v,i)=>near(v,sheet.rest[i]));
});

test('opposite edge folds inward symmetrically; no fold while dragging or reduced motion',()=>{
  const left=fixture(),right=fixture();left.fold.setGravity({x:-1,y:0});right.fold.setGravity({x:1,y:0});
  settle(left.fold);settle(right.fold);
  const end=left.sheet.columns*3;
  near(left.sheet.positions[0],left.sheet.rest[0]);
  assert.ok(left.sheet.positions[end]<left.sheet.rest[end]-.8);
  assert.ok(right.sheet.positions[0]>right.sheet.rest[0]+.8);
  near(left.sheet.positions[end],-right.sheet.positions[0]);
  const before=left.sheet.positions.slice();left.sheet.grabs.set('test',{});left.fold.setGravity({x:1,y:1});settle(left.fold);
  assert.deepEqual(left.sheet.positions,before);
  left.sheet.grabs.clear();left.sheet.reducedMotion=true;settle(left.fold);assert.deepEqual(left.sheet.positions,before);
});

test('smoothing is frame-rate independent and finite at maximum combined tilt',()=>{
  const a=fixture(),b=fixture();a.fold.setGravity({x:1,y:-1});b.fold.setGravity({x:1,y:-1});
  settle(a.fold,30,1/30);settle(b.fold,60,1/60);
  a.sheet.positions.forEach((v,i)=>{assert.ok(Number.isFinite(v));near(v,b.sheet.positions[i]);});
});
