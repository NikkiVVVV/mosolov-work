import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../site/${path}`,import.meta.url),'utf8');
test('portfolio links to bookmarks; independent product links to channel without home',()=>{
 assert.match(read('index.html'),/class="mobile-page-link" href="\/links\/" aria-label="Открыть закладки"/);
 assert.doesNotMatch(read('links/index.html'),/aria-label="На главную"/);
 assert.match(read('links/index.html'),/class="links-bar-icon channel-avatar" href="https:\/\/t.me\/nikir_public"/);
 assert.doesNotMatch(read('links/index.html'),/<details class="links-bar-menu">/);
 assert.match(read('links/index.html'),/mobile-navigation\.js\?v=\d+/);
});
test('footer uses correct brand and contact destination',()=>{
 const html=read('index.html');
 assert.match(html,/>linkedin<\/a>/);
 assert.match(html,/class="footer-top" href="https:\/\/t.me\/nikir_nikir"/);
 assert.doesNotMatch(read('app.js'),/querySelector\('#back-to-top'\)/);
});
