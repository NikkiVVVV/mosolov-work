import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameVisibility} from '../site/test-secret/game-visibility.js';
function fixture(isMobile){
 let enter,docChange;const calls=[];
 globalThis.document={hidden:false,addEventListener:(name,fn)=>{docChange=fn;}};
 globalThis.IntersectionObserver=class{constructor(fn){enter=fn;}observe(){calls.push('observe');}unobserve(){calls.push('unobserve');}};
 const mobile={matches:isMobile,addEventListener(){}};
 const api=createGameVisibility({target:{},mobile,onResume:()=>calls.push('resume'),onPause:()=>calls.push('pause'),onHint:()=>calls.push('hint')});
 return {api,calls,enter:ratio=>enter([{isIntersecting:ratio>0,intersectionRatio:ratio}]),hidden(value){document.hidden=value;docChange();}};
}
for(const mobile of [false,true])test(`viewport autoplay and resume on ${mobile?'mobile':'desktop'}`,()=>{
 const f=fixture(mobile);f.enter(0);assert.equal(f.calls.at(-1),'pause');
 f.enter(.001);assert.equal(f.calls.at(-1),'resume');assert.equal(f.api.visible,true);
 f.enter(0);assert.equal(f.calls.at(-1),'pause');
 f.enter(.5);assert.equal(f.calls.at(-1),'resume');
 f.hidden(true);assert.equal(f.calls.at(-1),'pause');
 f.hidden(false);assert.equal(f.calls.at(-1),'resume');
 f.api.refresh();assert.deepEqual(f.calls.slice(-2),['unobserve','observe']);
});
test('mobile hint waits for readable visibility and shows only once',()=>{
 const f=fixture(true);f.enter(.1);assert.ok(!f.calls.includes('hint'));
 f.enter(.8);assert.equal(f.calls.filter(x=>x==='hint').length,1);
 f.enter(0);f.enter(1);assert.equal(f.calls.filter(x=>x==='hint').length,1);
});
test('desktop does not show a touch hint and hidden document cannot autoplay',()=>{
 const f=fixture(false);f.hidden(true);f.enter(1);assert.equal(f.calls.at(-1),'pause');assert.ok(!f.calls.includes('hint'));
});
