import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../site/links/workshop-filter.js',import.meta.url),'utf8');
const {workshopIds,inWorkshop,workshopFromURL}=await import('data:text/javascript,'+encodeURIComponent(code));
test('all 89 workshop IDs exist exactly once in public catalog',()=>{
 const items=JSON.parse(fs.readFileSync(new URL('../site/links/bookmarks.json',import.meta.url))).items;
 assert.equal(workshopIds.size,89);
 assert.equal(items.filter(inWorkshop).length,89);
 assert.equal(items.filter(i=>inWorkshop(i)&&i.tags.includes('Анимация')).every(inWorkshop),true);
 assert.equal(inWorkshop({id:'other'}),false);
});
test('workshop deep link is opt-in',()=>{
 assert.equal(workshopFromURL('https://links.mosolov.dev/?collection=workshop'),true);
 assert.equal(workshopFromURL('https://links.mosolov.dev/?collection=meetup'),true);
 assert.equal(workshopFromURL('https://links.mosolov.dev/'),false);
});

test('workshop and category combine, All restores full collection',()=>{
 const app=fs.readFileSync(new URL('../site/links/app.js',import.meta.url),'utf8');
 const body=app.match(/function matchesFilter\(item, filter = state.filter\) \{([\s\S]*?)\n\}/)[1];
 const state={filter:'all',workshop:true};
 const matches=new Function('state','inWorkshop','isReady','isVisible','categoryLabel','library','return function(item,filter=state.filter){'+body+'}')(state,inWorkshop,()=>true,()=>true,i=>i.tags[0],'public');
 const id=[...workshopIds][0];const inside={id,tags:['Рефы','Анимация']},outside={id:'outside',tags:['Анимация']};
 assert.equal(matches(inside),true);assert.equal(matches(outside),false);
 state.filter='Анимация';assert.equal(matches(inside),true);assert.equal(matches(outside),false);
 state.workshop=false;state.filter='all';assert.equal(matches(outside),true);
});

test('every presentation reference maps to a visible, described workshop entry',()=>{
 const audit=JSON.parse(fs.readFileSync(new URL('../reports/presentation-links-audit-2026-11-25.json',import.meta.url)));
 const items=JSON.parse(fs.readFileSync(new URL('../site/links/bookmarks.json',import.meta.url))).items;
 assert.equal(audit.mapping.length,89);
 assert.equal(new Set(audit.mapping.map(r=>r.node)).size,89);
 for(const record of audit.mapping){
  const item=items.find(i=>i.id===record.id);
  assert.ok(item,record.sourceURL);assert.ok(inWorkshop(item));
  assert.equal(item.url,record.catalogURL);assert.notEqual(item.status,'hidden');
  assert.ok(['ready','curated'].includes(item.reviewHint));assert.ok(item.ownerNote);
 }
 assert.equal(new Set(items.map(i=>i.id)).size,items.length);
});
