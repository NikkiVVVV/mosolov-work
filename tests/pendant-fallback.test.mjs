import test from 'node:test';
import assert from 'node:assert/strict';
import {showPendantFallback} from '../site/test-secret/pendant-fallback.js';
function fixture(fail=false){
 const state={events:[],removed:false};let child;
 const image={style:{},async decode(){if(fail)throw Error('network');},remove(){state.removed=true;child=null;},animate(frames,options){state.frames=frames;state.options=options;return {finished:Promise.resolve(),cancel(){state.cancelled=true;}};}};
 const host={querySelector:()=>child,append(node){child=node;}};
 const block={hidden:true,dataset:{},querySelector:()=>host};
 const documentRef={createElement:()=>image,dispatchEvent(event){state.events.push(event.type);}};
 return {image,block,documentRef,state};
}
test('fallback waits for PNG, falls from above with settling, and does not duplicate itself',async()=>{
 const f=fixture();await showPendantFallback(f.block,f);await Promise.resolve();
 assert.equal(f.block.hidden,false);assert.equal(f.block.dataset.fallback,'true');
 assert.match(f.image.src,/\.png$/);assert.equal(f.image.style.visibility,'');
 assert.match(f.state.frames[0].transform,/-120vh/);assert.match(f.state.frames.at(-1).transform,/rotate\(0deg\)/);
 assert.equal(f.state.options.delay,400);assert.equal(f.state.cancelled,true);
 await showPendantFallback(f.block,f);assert.equal(f.state.events.length,1);
});
test('reduced motion fades without falling',async()=>{
 const f=fixture();await showPendantFallback(f.block,{...f,reduced:true});
 assert.deepEqual(f.state.frames,[{opacity:0},{opacity:1}]);assert.equal(f.state.options.duration,120);
});
test('a missing PNG does not leave a broken image or empty device slot',async()=>{
 const f=fixture(true);await showPendantFallback(f.block,f);
 assert.equal(f.state.removed,true);assert.equal(f.block.hidden,true);assert.equal(f.state.frames,undefined);
 assert.deepEqual(f.state.events,['portfolio:pendant-unavailable']);
});
