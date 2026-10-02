import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {normalizedTilt, createTiltInput} from '../site/paket/js/tilt-input.js';

const event=(type,props={})=>Object.assign(new Event(type),props);

test('tilt is bounded and follows screen rotation',()=>{
  assert.deepEqual(normalizedTilt(30,10,{beta:30,gamma:10}),{x:0,y:0});
  assert.deepEqual(normalizedTilt(42,22,{beta:30,gamma:10}),{x:.5,y:.5});
  const landscape=normalizedTilt(54,10,{beta:30,gamma:10},90);
  assert.ok(Math.abs(landscape.x-1)<1e-6);
  assert.ok(Math.abs(landscape.y)<1e-6);
  const large=normalizedTilt(150,80,{beta:0,gamma:0});
  assert.equal(large.x,1);assert.equal(large.y,1);
});

test('one permission activates all visible consumers; touch leave preserves calibration',async()=>{
  class Element extends EventTarget {
    children=[];
    append(child){this.children.push(child);}
    setAttribute(){}
  }
  const win=new EventTarget(),doc=new EventTarget(),reduced=new EventTarget();
  let requests=0;
  reduced.matches=false;doc.hidden=false;doc.createElement=()=>new Element();
  win.isSecureContext=true;
  win.DeviceOrientationEvent={requestPermission:async()=>{requests++;return 'granted';}};
  const observers=[];
  const globals={window:win,document:doc,screen:{orientation:{angle:0}},matchMedia:()=>reduced,
    navigator:{maxTouchPoints:1},IntersectionObserver:class{
      constructor(callback){this.callback=callback;observers.push(this);}
      observe(){}
    }};
  const original=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true});
  try{
    const roots=[new Element(),new Element(),new Element()];
    const values=roots.map(()=>[]);
    const postures=[];
    roots.forEach((root,i)=>createTiltInput(root,(x,y,gravity)=>{values[i].push({x,y});postures.push(gravity);}));
    observers.forEach(observer=>observer.callback([{isIntersecting:true}]));
    roots[0].children[0].dispatchEvent(event('click'));
    await new Promise(resolve=>setImmediate(resolve));
    win.dispatchEvent(event('deviceorientation',{beta:30,gamma:10}));
    assert.equal(postures.length,3); // First absolute sample must arrive even at relative neutral.
    assert.ok(postures[0].y>.49);
    win.dispatchEvent(event('deviceorientation',{beta:42,gamma:22}));
    assert.equal(requests,1);
    values.forEach(v=>assert.deepEqual(v.at(-1),{x:.5,y:.5}));
    roots[0].dispatchEvent(event('pointerleave',{pointerType:'touch'}));
    win.dispatchEvent(event('deviceorientation',{beta:48,gamma:28}));
    assert.ok(Math.abs(values[0].at(-1).x-.75)<1e-6);
    reduced.matches=true;reduced.dispatchEvent(event('change'));
    values.forEach(v=>assert.deepEqual(v.at(-1),{x:0,y:0}));
    const counts=values.map(v=>v.length);
    win.dispatchEvent(event('deviceorientation',{beta:70,gamma:40}));
    assert.deepEqual(values.map(v=>v.length),counts);
  }finally{
    for(const [key,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});

test('first-open viewport waits for DOM and remeasures after intro and toolbar resize',async()=>{
  const source=await readFile(new URL('../site/paket/js/viewport.js',import.meta.url),'utf8');
  const win=new EventTarget(),doc=new EventTarget(),viewport=new EventTarget();
  const frames=[];const heights=[];
  viewport.height=999;viewport.scale=1;win.visualViewport=viewport;win.innerHeight=999;
  doc.readyState='loading';doc.documentElement={style:{setProperty:(_,value)=>heights.push(value)}};
  const flush=()=>{for(let i=0;frames.length&&i<10;i++)frames.splice(0).forEach(fn=>fn());};
  vm.runInNewContext(source,{window:win,document:doc,requestAnimationFrame:fn=>(frames.push(fn),frames.length)});
  assert.deepEqual(heights,[]);
  viewport.height=740;doc.dispatchEvent(event('DOMContentLoaded'));flush();
  assert.equal(heights.at(-1),'740px');
  viewport.height=700;win.dispatchEvent(event('bag-ready'));flush();
  assert.equal(heights.at(-1),'700px');
  viewport.height=820;viewport.dispatchEvent(event('resize'));flush();
  assert.equal(heights.at(-1),'820px');
  viewport.scale=2;viewport.height=410;viewport.dispatchEvent(event('resize'));flush();
  assert.equal(heights.at(-1),'820px');
  viewport.scale=1;viewport.height=568;win.dispatchEvent(event('pageshow'));flush();
  assert.equal(heights.at(-1),'568px');
});
