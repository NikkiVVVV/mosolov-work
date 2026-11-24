import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compareSiteNames} from '../site/links/search-results.js';
const {items}=JSON.parse(await readFile(new URL('../site/links/bookmarks.json',import.meta.url),'utf8'));
test('DesignBookmark leads the 33 previously selected bookmarks',()=>{
 const sorted=items.slice().sort(compareSiteNames);
 assert.deepEqual(sorted.slice(0,34).map(x=>x.priorityRank),Array.from({length:34},(_,i)=>i+1));
 assert.equal(sorted[0].url,'https://designbookmark.com/motion');
 assert.deepEqual(sorted.slice(1,5).map(x=>x.domain),['bencho.dev','www.typedump.com','kombai.com','demos.gsap.com']);
 assert.equal(sorted[33].url,'https://bricxlabs.com/');
 for(const x of sorted.slice(0,34)){assert.ok(x.ownerNote.trim());assert.ok(x.tags.length);}
 assert.equal(new Set(sorted.slice(0,34).map(x=>x.url)).size,34);
});
test('ordinary bookmarks retain alphabetical and featured ordering',()=>{
 const ordinary=items.filter(x=>!x.priorityRank);
 const collator=new Intl.Collator('ru',{sensitivity:'base',numeric:true});
 const original=(a,b)=>((Number(b.featuredRank)||(b.id==='280151956c0ef706'?1:0))-(Number(a.featuredRank)||(a.id==='280151956c0ef706'?1:0)))||collator.compare(a.domain.replace(/^www\./i,''),b.domain.replace(/^www\./i,''))||collator.compare(a.url,b.url);
 assert.deepEqual(ordinary.slice().sort(compareSiteNames).map(x=>x.id),ordinary.slice().sort(original).map(x=>x.id));
});
