import test from 'node:test';
import assert from 'node:assert/strict';
import {planBento} from '../site/test-secret/project-bento.js';
import {projects} from '../site/test-secret/projects.js';
const ratio=p=>p.video?p.videoWidth/p.videoHeight:p.coverRatio?.split('/').map(Number).reduce((a,b)=>a/b)||1;
for(const category of ['all','work','pet','publication'])test(`balanced ${category} rows contain each visible card exactly once`,()=>{
 const items=projects.filter(p=>!p.hidden&&(p.alwaysVisible||category==='all'||p.category===category)).map(p=>({id:p.id,wide:p.wide||p.game,ratio:ratio(p)}));
 const rows=planBento(items),flat=rows.flat();
 assert.deepEqual(flat.map(x=>x.id).sort(),items.map(x=>x.id).sort());
 assert.ok(rows.every(row=>row.length===1||row.length===2));
 assert.ok(rows.every(row=>!row.some(x=>x.wide)||row.length===1));
 assert.equal(rows.filter(row=>row.length===1&&!row[0].wide).length,items.filter(x=>!x.wide).length%2);
 for(const row of rows.filter(row=>row.length===2)){
  const available=496,total=row[0].ratio+row[1].ratio;
  const heights=row.map(item=>(available*item.ratio/total)/item.ratio);
  assert.ok(Math.abs(heights[0]-heights[1])<1e-8);
 }
});
test('a wide card never leaves an isolated narrow card before it',()=>{
 const portrait={id:'a',ratio:.75},wide={id:'w',wide:true,ratio:1.5},portrait2={id:'b',ratio:.8};
 assert.deepEqual(planBento([portrait,wide,portrait2]),[[portrait,portrait2],[wide]]);
});
