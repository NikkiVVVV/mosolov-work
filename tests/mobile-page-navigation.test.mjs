import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../site/${path}`,import.meta.url),'utf8');
test('mobile pages link to each other in the same tab',()=>{
 assert.match(read('index.html'),/class="mobile-page-link" href="\/links\/" aria-label="Открыть закладки"/);
 assert.match(read('links/index.html'),/class="links-bar-icon" href="\/" aria-label="На главную"/);
 assert.match(read('links/index.html'),/mobile-navigation\.js\?v=\d+/);
});
test('footer uses correct brand and contact destination',()=>{
 const html=read('index.html');
 assert.match(html,/>LinkedIn<\/a>/);
 assert.match(html,/class="footer-top" href="https:\/\/t.me\/nikir_nikir"/);
 assert.doesNotMatch(read('app.js'),/querySelector\('#back-to-top'\)/);
});
