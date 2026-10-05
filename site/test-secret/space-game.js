// Bounded Canvas2D, no textures or engine. Pauses when hidden/offscreen.
import { createGameVisibility } from './game-visibility.js?v=85';
import { createGameResult } from './game-result.js?v=84';
import { track } from './portfolio-analytics.js?v=63';
import { createTokens, strikeTokens, roundOutcome, TOKEN_COLUMNS } from './token-game-model.js?v=82';
export function createSpaceGame(){
 const root=document.createElement('div');root.className='space-game';
 root.innerHTML='<canvas tabindex="0"></canvas><div class="space-score"><span class="space-score-label">TOKENS</span><span class="space-score-value">0</span></div><div class="space-onboarding" aria-hidden="true"><svg viewBox="0 0 88 48" fill="none"><g class="space-hint-arrows"><path d="M20 16H4m0 0 6-6M4 16l6 6m58-6h16m0 0-6-6m6 6-6 6"/></g><g class="space-hint-hand"><path d="M36 29V9a4 4 0 0 1 8 0v15-6a4 4 0 0 1 8 0v7-3a4 4 0 0 1 8 0v10c0 8-5 12-12 12h-4c-4 0-7-2-9-5l-9-12a4 4 0 0 1 6-5l4 7Z"/></g></svg><span>Двигай влево-вправо</span></div><div class="space-message"><span>YOU LOSE</span></div><span class="sr-only" role="status" aria-live="polite"></span>';
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
 const scoreEl=root.querySelector('.space-score-value'),label=root.querySelector('.space-score-label'),message=root.querySelector('.space-message'),status=root.querySelector('[role=status]');
 let width=320,height=420,ship=.5,target=.5,score=0,bullets=[],tokens=[],particles=[],popups=[];
 let running=false,finished=false,visible=false,frame=0,last=0,shotClock=0,descent=0,roundStarted=false,lang='ru';
 let ink='#eee',gray='#3b3d3e';
 const blues=['',null,'#174e79','#087dcb','#169fff'];
 const shipPixels=['0001000','0011100','0011100','1111111','1101011'];
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const mobile=matchMedia('(max-width:640px), (hover:none) and (pointer:coarse)');
 const hint=root.querySelector('.space-onboarding');
 let hintTimer,pointer=null;
 function hideHint(){clearTimeout(hintTimer);hint.classList.remove('visible');}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const result=createGameResult(message,{reducedMotion:reduced});
 function colors(){const css=getComputedStyle(root);ink=css.color;gray=css.getPropertyValue('--token-gray').trim()||'#3b3d3e';}
 function geometry(t){
   const pitch=Math.min(36,(width-48)/TOKEN_COLUMNS),size=pitch-6;
   return {x:width/2+(t.col-(TOKEN_COLUMNS-1)/2)*pitch,y:76+t.row*pitch+descent,size};
 }
 function draw(){
   ctx.clearRect(0,0,width,height);
   ctx.fillStyle=ink;ctx.globalAlpha=.15;
   for(let i=0;i<14;i++)ctx.fillRect((i*83+19)%width,60+(i*137)%(height-100),1,1);
   ctx.globalAlpha=1;
   for(const t of tokens){
     const {x,y,size}=geometry(t);ctx.fillStyle=t.flash>0?ink:t.hp===1?gray:blues[t.hp];
     ctx.beginPath();ctx.roundRect(Math.round(x-size/2),Math.round(y),size,size,4);ctx.fill();
   }
   ctx.fillStyle=ink;bullets.forEach(b=>ctx.fillRect(Math.round(b.x*width)-1,b.y,2,9));
   for(const p of particles){ctx.globalAlpha=p.life/.3;ctx.fillStyle=p.color;ctx.fillRect(p.x*width,p.y,3,3);}
   ctx.fillStyle=ink;ctx.font='12px Werkzeug, monospace';ctx.textAlign='center';
   for(const p of popups){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillText('+'+p.value,p.x*width,p.y);}
   ctx.globalAlpha=1;ctx.fillStyle=ink;
   shipPixels.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')ctx.fillRect(Math.round(ship*width+(i-3.5)*3),height-42+j*3,3,3);}));
 }
 function reset(){
   score=0;scoreEl.textContent='0';ship=target=.5;bullets=[];particles=[];popups=[];
   descent=shotClock=0;tokens=createTokens();finished=false;
   delete root.dataset.outcome;result.hide();status.textContent=lang==='en'?'New game':'Новая игра';
 }
 function stop(){running=false;root.dataset.running='false';cancelAnimationFrame(frame);frame=0;last=0;}
 function finish(outcome){
   stop();hideHint();finished=true;roundStarted=false;bullets=[];particles=[];popups=[];
   track('game_over',{score,game:'tokens'});
   result.show(outcome);root.dataset.outcome=outcome;
   status.textContent=(outcome==='lost'?'YOU LOSE. ':'ALL TOKENS CLEARED. ')+'TOKENS: '+score;draw();
 }
 function tick(now){
   if(!running||!visible||document.hidden){stop();return;}
   frame=requestAnimationFrame(tick);
   if(last&&now-last<1000/30)return;
   const dt=last?Math.min((now-last)/1000,.06):1/30;last=now;
   ship+=(target-ship)*Math.min(1,dt*18);shotClock+=dt;descent+=4*dt;
   if(shotClock>=.2){shotClock=0;if(bullets.length<24)bullets.push({x:ship,y:height-46});}
   tokens.forEach(t=>t.flash=Math.max(0,t.flash-dt));
   for(const b of bullets){
     const previousY=b.y;b.y-=360*dt;
     const hit=strikeTokens({x:b.x*width,y:b.y,previousY},tokens,geometry);
     if(!hit)continue;
     b.hit=true;
     if(hit.points){
       score+=hit.points;scoreEl.textContent=score.toLocaleString(lang==='en'?'en-US':'ru-RU');
       if(!reduced){
         if(popups.length<6)popups.push({x:hit.x/width,y:hit.y,value:hit.points,life:.6});
         if(particles.length<44)for(let i=0;i<4;i++)particles.push({x:hit.x/width,y:hit.y+hit.size/2,vx:(i%2?1:-1)*25,vy:(i<2?-1:1)*25,life:.3,color:hit.token.value===128?gray:'#169fff'});
       }
     }
   }
   bullets=bullets.filter(b=>b.y>-10&&!b.hit);tokens=tokens.filter(t=>t.hp>0);
   particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt/width;p.y+=p.vy*dt;});particles=particles.filter(p=>p.life>0);
   popups.forEach(p=>{p.life-=dt;p.y-=18*dt;});popups=popups.filter(p=>p.life>0);
   const outcome=roundOutcome(tokens,geometry,height-42);
   if(outcome){finish(outcome);return;}
   draw();
 }
 function start(replay=false){if(finished){if(!replay)return;reset();}if(!running&&visible&&!document.hidden){if(!roundStarted){roundStarted=true;track('game_start',{game:'tokens'});}running=true;root.dataset.running='true';last=0;frame=requestAnimationFrame(tick);}}
 function move(e){const r=canvas.getBoundingClientRect();target=clamp((e.clientX-r.left)/r.width,14/width,1-14/width);}
 canvas.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')move(e);});
 canvas.addEventListener('pointermove',e=>{
   if(e.pointerType==='mouse'){move(e);hideHint();return;}
   if(!pointer||pointer.id!==e.pointerId)return;
   const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
   if(!pointer.axis&&Math.max(Math.abs(dx),Math.abs(dy))>6)pointer.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
   if(pointer.axis==='x'){move(e);hideHint();}
 });
 canvas.addEventListener('pointerdown',e=>{
   pointer={id:e.pointerId,x:e.clientX,y:e.clientY,axis:null};
   if(e.pointerType==='mouse')move(e);
   canvas.setPointerCapture(e.pointerId);start(true);
 });
 canvas.addEventListener('pointerup',()=>{pointer=null;});
 canvas.addEventListener('pointercancel',()=>{pointer=null;});
 root.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();hideHint();target=clamp(target+(e.key==='ArrowLeft'?-.08:.08),.05,.95);start(true);});
 const visibility=createGameVisibility({target:canvas,mobile,
   onPause(){visible=false;stop();hideHint();result.pause();},
   onResume(){visible=true;result.resume();start();},
   onHint(){if(finished)return;hint.classList.add('visible');hintTimer=setTimeout(hideHint,3000);}
 });
 const resize=new ResizeObserver(()=>{
   const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
   const oldHeight=height;width=r.width;height=r.height;
   // A responsive reflow must not push the current formation into the ship.
   descent=Math.min(descent,Math.max(0,height-80-(76+5*Math.min(36,(width-48)/TOKEN_COLUMNS))));
   bullets.forEach(b=>b.y*=height/oldHeight);particles=[];popups=[];
   const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);colors();draw();
 });resize.observe(canvas);
 new MutationObserver(()=>{colors();draw();}).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
 function setLanguage(value){
   lang=value;label.textContent='TOKENS';
   hint.querySelector('span').textContent=lang==='en'?'Move left and right':'Двигай влево-вправо';
   scoreEl.textContent=score.toLocaleString(lang==='en'?'en-US':'ru-RU');
   canvas.setAttribute('aria-label',lang==='en'?'Burn tokens. Move the ship with the pointer, touch or arrow keys. Gray: one hit. Blue: two to four hits. Automatic fire.':'Выбивай токены. Двигай корабль мышкой, пальцем или стрелками. Серый — одно попадание, синие — от двух до четырёх. Стрельба автоматическая.');
   root.setAttribute('aria-label',lang==='en'?'Token game':'Игра с токенами');
 }
 colors();reset();draw();setLanguage('ru');
 return {element:root,pause(){stop();hideHint();result.pause();visibility.refresh();},setLanguage};
}
