import test from 'node:test';
import assert from 'node:assert/strict';
import {planBento,partitionOpening,partitionShowcase,partitionTools} from '../site/project-bento.js';
import {projects} from '../site/projects.js';
const ratio=p=>p.video?p.videoWidth/p.videoHeight:p.coverRatio?.split('/').map(Number).reduce((a,b)=>a/b)||1;
for(const category of ['all','work','pet','publication'])test(`balanced ${category} rows contain each visible card exactly once`,()=>{
 const items=projects.filter(p=>!p.hidden&&(p.alwaysVisible||category==='all'||p.category===category)).map(p=>({id:p.id,wide:p.wide||p.game,ratio:ratio(p)}));
 const {opening,remaining:afterOpening}=partitionOpening(items);
 const {showcase,remaining:afterShowcase}=partitionShowcase(afterOpening);
 const {tools,remaining}=partitionTools(afterShowcase);
 const rows=planBento(remaining),flat=[...opening,...showcase,...tools,...rows.flat()];
 assert.deepEqual(flat.map(x=>x.id).sort(),items.map(x=>x.id).sort());
 assert.ok(rows.every(row=>row.length===1||row.length===2));
 assert.ok(rows.every(row=>!row.some(x=>x.wide)||row.length===1));
 assert.equal(rows.filter(row=>row.length===1&&!row[0].wide).length,remaining.filter(x=>!x.wide).length%2);

});
test('a wide card never leaves an isolated narrow card before it',()=>{
 const portrait={id:'a',ratio:.75},wide={id:'w',wide:true,ratio:1.5},portrait2={id:'b',ratio:.8};
 assert.deepEqual(planBento([portrait,wide,portrait2]),[[portrait,portrait2],[wide]]);
});

test('authored opening has exact cards and missing cards use the normal grid',()=>{
 const items=['09','01','19','11','07','08'].map(id=>({id}));
 const {opening,remaining}=partitionOpening(items);
 assert.deepEqual(opening.map(x=>x.id),['01','11','07','19']);
 assert.deepEqual(remaining.map(x=>x.id),['09','08']);
 const filtered=items.filter(x=>x.id!=='11');
 assert.deepEqual(partitionOpening(filtered),{opening:[],remaining:filtered});
});

test('second quartet follows the reference and leaves filtered tabs intact',()=>{
 const items=['09','20','16','10','21','08'].map(id=>({id}));
 const {showcase,remaining}=partitionShowcase(items);
 assert.deepEqual(showcase.map(x=>x.id),['16','21','10','20']);
 assert.deepEqual(remaining.map(x=>x.id),['09','08']);
 const filtered=items.filter(x=>x.id!=='21');
 assert.deepEqual(partitionShowcase(filtered),{showcase:[],remaining:filtered});
});

test('leasing group preserves authored sequence and degrades without missing cards',()=>{
 const items=['17','14','09','18','04','08'].map(id=>({id}));
 const {tools,remaining}=partitionTools(items);
 assert.deepEqual(tools.map(x=>x.id),['09','04','18','17']);
 assert.deepEqual(remaining.map(x=>x.id),['14','08']);
 const filtered=items.filter(x=>x.id!=='09');
 assert.deepEqual(partitionTools(filtered),{tools:[],remaining:filtered});
});
