import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameResult,CAT_DURATION,CAT_FADE} from '../site/game-result.js';
function fixture(reducedMotion=false){
 const events={};
 const image={dataset:{},removeAttribute(name){delete this[name];},addEventListener(name,callback){events[name]=callback;}};
 globalThis.document={createElement:()=>image};
 const title={},classes=new Set();
 const container={querySelector:()=>title,prepend(){},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
 const result=createGameResult(container,{reducedMotion});
 return {result,image,title,classes,events};
}
test('both outcomes show the same cat; assets load only when round ends',()=>{
 const {result,image,title,classes}=fixture();assert.equal(image.src,undefined);
 result.show('lost');assert.equal(title.textContent,'YOU LOSE');assert.ok(image.src.includes('result-cat-v83.webp'));assert.ok(classes.has('visible'));
 const first=image.src;result.hide();assert.equal(image.src,undefined);assert.equal(classes.has('visible'),false);
 result.show('won');assert.equal(title.textContent,'ALL TOKENS CLEARED');assert.notEqual(image.src,first);
});
test('offscreen result unloads; reduced motion uses a still',()=>{
 const {result,image}=fixture();result.show('lost');result.pause();assert.equal(image.src,undefined);assert.equal(image.hidden,true);
 result.resume();assert.ok(image.src.includes('.webp'));
 const reduced=fixture(true);reduced.result.show('won');assert.ok(reduced.image.src.endsWith('.png'));
});
test('fade starts during the final 500ms, then unloads without a frozen frame or replay',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {result,image,title,events}=fixture();result.show('lost');events.load();
 t.mock.timers.tick(CAT_DURATION-CAT_FADE-1);assert.equal(image.dataset.phase,'playing');
 t.mock.timers.tick(1);assert.equal(image.dataset.phase,'fading');assert.equal(image.hidden,false);
 t.mock.timers.tick(CAT_FADE);assert.equal(image.hidden,true);assert.equal(image.src,undefined);assert.equal(title.textContent,'YOU LOSE');
 result.pause();result.resume();assert.equal(image.src,undefined);
 result.show('won');assert.equal(image.hidden,false);assert.equal(image.dataset.phase,'playing');
});
test('reset cancels pending timers so they cannot hide the next round cat',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {result,image,events}=fixture();result.show('lost');events.load();
 t.mock.timers.tick(6000);result.hide();result.show('won');events.load();
 t.mock.timers.tick(500);assert.equal(image.hidden,false);assert.equal(image.dataset.phase,'playing');
});
