import test from 'node:test';
import assert from 'node:assert/strict';
import {projects} from '../site/projects.js';
test('HSE webinar only appears in sharing experience and loops',()=>{
 const webinar=projects.find(p=>p.id==='hse-accessibility');
 assert.equal(webinar.filterOnly,true);
 assert.equal(webinar.category,'publication');
 assert.equal(webinar.videoLoop,true);
 assert.equal(webinar.href,'https://vkvideo.ru/video-41929270_456239163');
});
