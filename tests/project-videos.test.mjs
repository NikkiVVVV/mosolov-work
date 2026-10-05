import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectVideos } from '../site/test-secret/project-videos.js';

class FakeVideo extends EventTarget {
  constructor() { super(); this.dataset={}; this.currentTime=0; this.paused=true; this.ended=false; this.isConnected=true; }
  setAttribute() {}
  removeAttribute(name) {delete this[name];}
  load() {this.currentTime=0;}
  play() { this.paused=false; this.ended=false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
  pause() { this.paused=true; this.dispatchEvent(new Event('pause')); }
}
const fire = (target, type, props={}) => target.dispatchEvent(Object.assign(new Event(type),props));
async function fixture(shuttle,initiallyVisible=true,extra={},initialStagger=false,mobileView=false) {
  globalThis.document=Object.assign(new EventTarget(),{hidden:false,createElement:()=>new FakeVideo()});
  const media=Object.assign(new EventTarget(),{matches:mobileView});
  globalThis.window={matchMedia:()=>media};
  globalThis.MutationObserver=class { observe() {} disconnect() {} };
  let onVisibility,onProximity;
  globalThis.IntersectionObserver=class { constructor(callback,options){if(options?.rootMargin)onProximity=callback;else onVisibility=callback;} observe() {} };
  const manager=createProjectVideos({classList:{contains:()=>false}},{initialStagger});
  const card=Object.assign(new EventTarget(),{contains:()=>false});
  const video=manager.attach({id:'test',video:'test.mp4',shuttle,...extra},card);
  const setVisible=(value,ratio=value?1:0)=>onVisibility([{target:video,isIntersecting:value,intersectionRatio:ratio}]);
  setVisible(initiallyVisible);
  manager.sync();
  await new Promise(resolve=>setImmediate(resolve));
  const setNear=value=>onProximity([{target:video,isIntersecting:value}]);
  return {manager,card,video,setVisible,setNear,media};
}
test('offscreen clips wait for visibility, then pause and resume without restarting',async()=>{
  const {video,setVisible}=await fixture({forwardEnd:4,reverseStart:109/24},false);
  assert.equal(video.paused,true);assert.equal(video.currentTime,0);
  setVisible(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(video.paused,false);
  video.currentTime=2;setVisible(false);await new Promise(resolve=>setTimeout(resolve,200));assert.equal(video.paused,true);
  setVisible(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(video.paused,false);assert.equal(video.currentTime,2);
  video.currentTime=4;fire(video,'timeupdate');setVisible(false);setVisible(true);
  assert.equal(video.paused,true);assert.equal(video.dataset.held,'true');
});
test('hover and keyboard focus do not restart a running ordinary video',async()=>{
  const {card,video}=await fixture(); video.currentTime=2.3;
  fire(card,'pointerenter',{pointerType:'mouse'});
  fire(card,'focusin',{relatedTarget:null});
  assert.equal(video.currentTime,2.3); assert.equal(video.paused,false);
  video.ended=true; video.pause();
  fire(card,'pointerenter',{pointerType:'mouse'});
  assert.equal(video.currentTime,0); assert.equal(video.paused,false);
});
test('shuttle holds its forward endpoint across visibility and filter changes',async()=>{
  const {manager,video}=await fixture({forwardEnd:4,reverseStart:109/24});
  video.currentTime=4.1; fire(video,'timeupdate');
  assert.equal(video.dataset.held,'true'); assert.equal(video.paused,true);
  document.hidden=true; manager.sync(); document.hidden=false;
  video.isConnected=false; manager.sync(); video.isConnected=true; manager.sync();
  assert.equal(video.paused,true); assert.equal(video.currentTime,4.1);
});
test('hover reverses once, ignores repeated hover while playing, then toggles forward',async()=>{
  const {card,video}=await fixture({forwardEnd:4,reverseStart:109/24});
  video.currentTime=4; fire(video,'timeupdate');
  fire(card,'pointerenter',{pointerType:'mouse'});
  assert.equal(video.dataset.direction,'reverse'); assert.equal(video.currentTime,109/24);
  video.currentTime=6; fire(card,'pointerenter',{pointerType:'mouse'});
  assert.equal(video.currentTime,6);
  await new Promise(resolve=>setImmediate(resolve));
  video.currentTime=8.583333; video.ended=true; video.pause(); fire(video,'ended');
  assert.equal(video.dataset.held,'true');
  fire(card,'pointerenter',{pointerType:'mouse'});
  assert.equal(video.dataset.direction,'forward'); assert.equal(video.currentTime,0);
});
test('interrupted pass resumes without restarting when the page becomes visible',async()=>{
  const {manager,video}=await fixture({forwardEnd:4,reverseStart:109/24});
  video.currentTime=2; document.hidden=true; manager.sync();
  assert.equal(video.paused,true);
  document.hidden=false; manager.sync();
  assert.equal(video.currentTime,2); assert.equal(video.paused,false);
});
test('touch replays the reverse pass, leaving hover rules on normal videos intact',async()=>{
  const {card,video}=await fixture({forwardEnd:4,reverseStart:109/24});
  video.currentTime=4; fire(video,'timeupdate');
  fire(card,'click',{pointerType:'touch'});
  assert.equal(video.dataset.direction,'reverse'); assert.equal(video.paused,false);
});

test('first visible sliver starts muted autoplay without click, and canplay retries a media failure',async()=>{
 const {video,setVisible}=await fixture({forwardEnd:4,reverseStart:109/24},false);
 let calls=0;const play=video.play.bind(video);
 video.play=()=>{calls++;return calls===1?Promise.reject({name:'AbortError'}):play();};
 setVisible(true,.015);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(video.dataset.autoplayState,'AbortError');assert.equal(video.autoplay,true);assert.equal(video.muted,true);
 fire(video,'canplay');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(video.paused,false);assert.equal(video.dataset.autoplayState,'playing');
 setVisible(false);assert.equal(video.autoplay,false);await new Promise(resolve=>setTimeout(resolve,200));assert.equal(video.paused,true);
});

test('far clips do not load; proximity loads without autoplay, visibility starts playback',async()=>{
 const {video,setNear,setVisible}=await fixture(undefined,false);
 assert.equal(video.src,undefined);assert.equal(video.preload,'none');
 setNear(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(video.src,'test.mp4');assert.equal(video.paused,true);
 setVisible(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(video.paused,false);
});
test('brief viewport boundary crossing keeps the same frame and playing decoder',async()=>{
 const {video,setVisible}=await fixture(undefined,true);video.currentTime=2;
 setVisible(false);assert.equal(video.paused,false);
 setVisible(true);await new Promise(resolve=>setTimeout(resolve,200));
 assert.equal(video.paused,false);assert.equal(video.currentTime,2);
});

test('a failed WebM source falls back to MP4 once',async()=>{
 const {video}=await fixture(undefined,true);
 video.dataset.codec='vp9';video.src='test.webm';fire(video,'error');
 assert.equal(video.dataset.codec,'h264');assert.equal(video.src,'test.mp4');
 video.currentTime=1;fire(video,'error');assert.equal(video.currentTime,1);
});

test('primary mouse click reverses a held clip without restarting a running pass',async()=>{
  const {card,video}=await fixture({forwardEnd:4,reverseStart:109/24});
  video.currentTime=2;fire(card,'click',{pointerType:'mouse',button:0});
  assert.equal(video.currentTime,2);
  video.currentTime=4;fire(video,'timeupdate');
  fire(card,'click',{pointerType:'mouse',button:2});
  assert.equal(video.dataset.held,'true');
  card.closest=()=>({});fire(card,'click',{pointerType:'mouse',button:0});
  assert.equal(video.dataset.held,'true');
  card.closest=()=>null;fire(card,'click',{pointerType:'mouse',button:0});
  assert.equal(video.dataset.direction,'reverse');assert.equal(video.paused,false);
  assert.equal(video.currentTime,109/24);
});


test('continuous clips loop and resume without a hover reset after leaving the viewport',async()=>{
  const {video,card,setVisible}=await fixture(undefined,true,{videoLoop:true});
  assert.equal(video.loop,true);
  video.currentTime=5.2;setVisible(false);
  await new Promise(resolve=>setTimeout(resolve,200));assert.equal(video.paused,true);
  fire(card,'pointerenter',{pointerType:'mouse'});assert.equal(video.currentTime,5.2);
  setVisible(true);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(video.paused,false);assert.equal(video.currentTime,5.2);
  fire(card,'pointerenter',{pointerType:'mouse'});assert.equal(video.currentTime,5.2);
});

test('initial entrance starts left first, calories at 4.5s, then other visible videos',async(t)=>{
  t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});
  const first=await fixture(undefined,true,{id:'01'},true);
  const calories=await fixture(undefined,true,{id:'11'},true);
  const other=await fixture(undefined,true,{id:'07'},true);
  assert.equal(first.video.paused,false);
  assert.equal(calories.video.paused,true);assert.equal(other.video.paused,true);
  fire(calories.card,'pointerenter',{pointerType:'mouse'});
  assert.equal(calories.video.paused,true);
  t.mock.timers.tick(4499);assert.equal(calories.video.paused,true);
  t.mock.timers.tick(1);assert.equal(calories.video.paused,false);assert.equal(other.video.paused,true);
  other.setVisible(false);t.mock.timers.tick(1000);assert.equal(other.video.paused,true);
  other.setVisible(true);assert.equal(other.video.paused,false);
  await new Promise(resolve=>setImmediate(resolve));
  calories.video.currentTime=2;calories.setVisible(false);t.mock.timers.tick(200);
  assert.equal(calories.video.paused,true);calories.setVisible(true);
  assert.equal(calories.video.paused,false);assert.equal(calories.video.currentTime,2);
});

test('mobile shuttle runs through both directions without holding and pauses offscreen',async()=>{
 const {video,setVisible}=await fixture({forwardEnd:4,reverseStart:4.5},true,{},false,true);
 assert.equal(video.loop,true);
 video.currentTime=4;fire(video,'timeupdate');
 assert.equal(video.currentTime,4.5);assert.equal(video.paused,false);
 assert.equal(video.dataset.held,'false');assert.equal(video.dataset.direction,'reverse');
 video.currentTime=.1;fire(video,'timeupdate');assert.equal(video.dataset.direction,'forward');
 setVisible(false);await new Promise(resolve=>setTimeout(resolve,200));assert.equal(video.paused,true);
 setVisible(true);assert.equal(video.paused,false);assert.equal(video.currentTime,.1);
});
test('mobile alternate uses the palindrome while desktop keeps the original source and hold',async()=>{
 const {video,media}=await fixture(undefined,true,{mobileVideo:{video:'mobile.mp4'}},false,true);
 assert.equal(video.src,'mobile.mp4');assert.equal(video.loop,true);
 media.matches=false;fire(media,'change');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(video.src,'test.mp4');assert.equal(video.loop,false);
 media.matches=true;fire(media,'change');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(video.src,'mobile.mp4');assert.equal(video.loop,true);
});
test('changing to mobile releases an already held shuttle endpoint',async()=>{
 const {video,media}=await fixture({forwardEnd:4,reverseStart:4.5});
 video.currentTime=4;fire(video,'timeupdate');assert.equal(video.paused,true);
 media.matches=true;fire(media,'change');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(video.currentTime,4.5);assert.equal(video.paused,false);assert.equal(video.loop,true);
 media.matches=false;fire(media,'change');assert.equal(video.loop,false);
});
