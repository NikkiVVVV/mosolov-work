import test from 'node:test';
import assert from 'node:assert/strict';
import {PlasticSheet} from '../site/paket/js/plastic.js';
import {MotionFold} from '../site/paket/js/motion-fold.js';
import {ScrollPull} from '../site/paket/js/scroll-pull.js';
const sheet=()=>new PlasticSheet(3.15,4.2,6,8,4);
const run=(seconds,step)=>{for(let i=0;i<Math.round(seconds*60);i++)step(1/60);};
const error=s=>s.positions.reduce((sum,v,i)=>sum+Math.abs(v-s.rest[i]),0);
function crumple(s){for(let i=0;i<s.positions.length;i+=3){s.positions[i]*=.6;s.positions[i+1]*=.6;s.positions[i+2]+=.2;}s.rememberPose();}

test('manual folds relax slowly with a sensor enabled; changes of tilt preserve those folds',()=>{
 const s=sheet(),motion=new MotionFold(s);motion.setGravity({x:0,y:1});run(2,dt=>motion.apply(dt));
 const vertex=3;s.positions[vertex]+=.5;s.rememberPose();
 run(.5,dt=>motion.apply(dt));assert.ok(s.positions[vertex]-s.rest[vertex]>.49,'release must not snap to the sensor pose');
 motion.setGravity({x:0,y:0});run(2,dt=>motion.apply(dt));
 assert.ok(s.positions[vertex]-s.rest[vertex]>.44,'laying the phone flat keeps the manual crease');
 run(24,dt=>motion.apply(dt));const remaining=s.positions[vertex]-s.rest[vertex];
 assert.ok(remaining>.1&&remaining<.2,'crease decays on the plastic timescale');
});

test('plain and space unfold gradually; sea keeps its existing faster relaxation',()=>{
 for(const mode of ['plain','space','sea']){
  const s=sheet();s.setSurface(null,mode);crumple(s);const start=error(s);
  run(.5,dt=>s.relax(dt));if(mode!=='sea')assert.ok(error(s)>start*.99);
  run(12,dt=>s.relax(dt));const fraction=error(s)/start;
  if(mode==='sea')assert.ok(fraction<.02);else assert.ok(fraction>.5&&fraction<.7);
 }
});

test('rocks continue unfolding after landing, without going below the surface',()=>{
 const s=sheet(),surface=(x,y)=>.04*Math.sin(x*2)+.03*Math.cos(y);
 s.setSurface(surface,'rocks');crumple(s);let elapsed=0;
 while(s.surfaceSettling&&elapsed<5){s.relax(1/60);elapsed+=1/60;}
 assert.equal(s.surfaceSettling,false);assert.equal(s.relaxing,true);
 const landed=error(s);run(24,dt=>s.relax(dt));assert.ok(error(s)<landed*.65);
 for(let i=0;i<s.positions.length;i+=3)assert.ok(s.positions[i+2]>=surface(s.positions[i],s.positions[i+1])-.00001);
});

test('baking a scroll at zero releases its stored pose for slow relaxation',()=>{
 const s=sheet();crumple(s);const pull=new ScrollPull(s);
 pull.setScroll(40,40,100);pull.apply();pull.setScroll(0,-40,100);pull.apply();
 pull.bake(100);assert.equal(pull.active,false);assert.equal(s.relaxing,true);
 const before=error(s);run(12,dt=>s.relax(dt));assert.ok(error(s)<before*.7);
});


test('deactivating sensors removes their layer without freezing the sheet',()=>{
 const s=sheet(),motion=new MotionFold(s);motion.setGravity({x:0,y:1});run(3,dt=>motion.apply(dt));
 motion.setGravity(null);assert.equal(motion.active,true);run(3,dt=>motion.apply(dt));
 assert.ok(error(s)<.01);assert.equal(motion.active,false);
});
