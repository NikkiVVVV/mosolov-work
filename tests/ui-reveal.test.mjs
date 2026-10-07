import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMedia,animateExperience,createCaseReveal} from '../site/ui-reveal.js';
function cover(){const classes=new Set();return {classes,classList:{add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x))},setAttribute(k,v){this[k]=v;}};}
test('a poster does not hide video skeleton; first decoded frame reveals it once',()=>{
 globalThis.requestAnimationFrame=f=>f();const c=cover(),v=Object.assign(new EventTarget(),{tagName:'VIDEO',readyState:0});
 prepareMedia(c,v,'poster.jpg');assert.equal(c.classes.has('media-loading'),true);
 v.dispatchEvent(new Event('loadedmetadata'));assert.equal(c.classes.has('media-loading'),true);
 v.dispatchEvent(new Event('loadeddata'));assert.equal(c.classes.has('media-loading'),false);assert.equal(c.classes.has('media-ready'),true);assert.equal(c['aria-busy'],'false');
});
test('a failed media load stops the busy status and keeps a fallback',()=>{
 const c=cover(),v=Object.assign(new EventTarget(),{tagName:'VIDEO',readyState:0});prepareMedia(c,v);
 v.dispatchEvent(new Event('error'));assert.equal(c.classes.has('media-failed'),true);assert.equal(c['aria-busy'],'false');
});
test('experience stays open until closing finishes; rapid reversal uses current height',async()=>{
 globalThis.matchMedia=()=>({matches:false});globalThis.getComputedStyle=()=>({opacity:'0.5'});
 const summary=new EventTarget(),runs=[];const body={style:{},scrollHeight:300,getBoundingClientRect:()=>({height:120}),animate(frames){let resolve;const finished=new Promise(r=>resolve=r);const a={frames,finished,cancel(){},resolve};runs.push(a);return a;}};
 const d={open:false,querySelector:s=>s==='summary'?summary:body};animateExperience(d);
 summary.dispatchEvent(new Event('click',{cancelable:true}));assert.equal(d.open,true);assert.equal(runs[0].frames[0].height,'0px');
 summary.dispatchEvent(new Event('click',{cancelable:true}));assert.equal(d.open,true);assert.equal(runs[1].frames[0].height,'120px');
 runs[0].resolve();await Promise.resolve();assert.equal(d.open,true);
 runs[1].resolve();await Promise.resolve();assert.equal(d.open,false);
});
test('each card fades in once when it enters the viewport',()=>{
 let callback,unobserved;globalThis.IntersectionObserver=class{constructor(f){callback=f;}observe(){}unobserve(c){unobserved=c;}};
 const c=cover();createCaseReveal()(c);assert.equal(c.classes.has('case-entering'),true);
 callback([{target:c,isIntersecting:false}]);assert.equal(c.classes.has('case-visible'),false);
 callback([{target:c,isIntersecting:true}]);assert.equal(c.classes.has('case-visible'),true);assert.equal(unobserved,c);
});
