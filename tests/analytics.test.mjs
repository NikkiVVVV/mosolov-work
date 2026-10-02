import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../site/shared/analytics.js',import.meta.url),'utf8');
function boot(host='mosolov.work',redirect){
 const calls=[],scripts=[],timers=[],listeners={};
 const document={documentElement:{dataset:{analyticsProject:'paket',analyticsRedirect:redirect}},head:{append:s=>scripts.push(s)},createElement:()=>({}),addEventListener:(n,fn)=>listeners[n]=fn};
 const window={ym:(...args)=>calls.push(args)},location={hostname:host,pathname:'/paket/',origin:'https://'+host,href:'https://'+host+'/paket/',replace:url=>calls.push(['redirect',url])};
 vm.runInNewContext(source,{window,document,location,URL,Date,setTimeout:(fn,ms)=>timers.push({fn,ms})});
 return {window,document,calls,scripts,timers,listeners};
}
test('local previews send nothing; production disables replay and queues events without blocking',()=>{
 const local=boot('127.0.0.1');local.window.siteAnalytics.track('photo_open',{photo:'hike'});assert.equal(local.calls.length,0);assert.equal(local.scripts.length,0);
 const p=boot();assert.equal(p.scripts.length,1);assert.equal(p.scripts[0].async,true);assert.equal(p.calls[0][2].webvisor,false);
 p.window.siteAnalytics.track('photo_open',{photo:'hike',email:'not-sent'});
 assert.equal(p.calls[1][2],'photo_open');assert.equal(p.calls[1][3].project,'paket');assert.equal(p.calls[1][3].email,undefined);
 p.window.siteAnalytics.track('photo_open',{photo:'hike'});assert.equal(p.calls.length,2);
 p.window.siteAnalytics.track('unknown');assert.equal(p.calls.length,2);
 p.window.ym=()=>{throw Error('blocked')};assert.doesNotThrow(()=>p.window.siteAnalytics.track('bag_interact'));
});
test('root redirect has a bounded fallback when analytics cannot load',()=>{
 const p=boot('mosolov.work','https://t.me/nikir_public');assert.equal(p.timers[0].ms,600);p.timers[0].fn();
 assert.equal(p.calls.at(-1)[0],'redirect');assert.equal(p.calls.at(-1)[1],'https://t.me/nikir_public');
 const count=p.calls.length;p.timers[0].fn();assert.equal(p.calls.length,count);
});
