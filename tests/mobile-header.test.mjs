import test from 'node:test';
import assert from 'node:assert/strict';
import {headerScrollState} from '../site/mobile-header.js';
test('down hides and up reveals with direction thresholds',()=>{
 assert.deepEqual(headerScrollState(100,112,false),{anchor:112,hidden:true});
 assert.deepEqual(headerScrollState(112,104,true),{anchor:104,hidden:false});
 assert.deepEqual(headerScrollState(104,116,false),{anchor:116,hidden:true});
});
test('tiny jitter retains visibility; top always reveals',()=>{
 assert.deepEqual(headerScrollState(100,103,true),{anchor:100,hidden:true});
 assert.deepEqual(headerScrollState(100,97,false),{anchor:100,hidden:false});
 assert.deepEqual(headerScrollState(100,0,true),{anchor:0,hidden:false});
});
