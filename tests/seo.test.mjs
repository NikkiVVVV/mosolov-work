import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {projects} from '../site/projects.js';
const html=await readFile(new URL('../site/index.html',import.meta.url),'utf8');
test('portfolio identity, canonical and share assets are present before JS runs',async()=>{
 assert.match(html,/<title>Nikita Mosolov — Design Engineer<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/mosolov.work\/"/);
 assert.match(html,/дизайн-инженер/);
 for(const file of ['portfolio-face-v211.png','portfolio-og-v210.png']){
  assert.ok(html.includes(file));await access(new URL('../site/assets/brand/'+file,import.meta.url));
 }
});
test('each published project has crawlable HTML and an accurate structured entry',()=>{
 const graph=JSON.parse(html.match(/id="portfolio-schema">([\s\S]*?)<\/script>/)[1])['@graph'];
 const list=graph.find(x=>x['@type']==='ItemList').itemListElement;
 const visible=projects.filter(p=>!p.hidden&&!p.game&&!p.filterOnly);
 assert.equal(list.length,visible.length);
 for(const p of visible){
  assert.ok(html.includes(`id="project-${p.id}"`));
  const entry=list.find(x=>x.item['@id'].endsWith('#project-'+p.id));
  assert.equal(entry.item.name,p.title);assert.equal(entry.item.creator['@id'],'https://mosolov.work/#nikita-mosolov');
 }
 for(const p of projects.filter(p=>p.hidden))assert.ok(!list.some(x=>x.item['@id'].endsWith('#project-'+p.id)));
});
test('indexing paths agree with canonical public pages',async()=>{
 const robots=await readFile(new URL('../site/robots.txt',import.meta.url),'utf8');
 assert.match(robots,/Sitemap: https:\/\/mosolov.work\/sitemap.xml/);assert.ok(!robots.includes('Disallow: /\n'));
 const sitemap=await readFile(new URL('../site/sitemap.xml',import.meta.url),'utf8');
 for(const path of ['','links/','paket/'])assert.ok(sitemap.includes(`<loc>https://mosolov.work/${path}</loc>`));
});
