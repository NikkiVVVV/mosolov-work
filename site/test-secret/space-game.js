// One bounded Canvas 2D scene shared across filters; no assets or game engine.
export function createSpaceGame(){
const root=document.createElement('div');root.className='space-game';
root.innerHTML='<canvas tabindex="0"></canvas><div class="space-score">SCORE <span>0000</span></div><div class="space-message"><span>YOU LOSE</span></div><span class="sr-only" role="status" aria-live="polite"></span>';
const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
const scoreEl=root.querySelector('.space-score span'),message=root.querySelector('.space-message'),status=root.querySelector('[role=status]');
let width=320,height=400,ship=.5,target=.5,score=0,bullets=[],enemies=[],enemyShots=[],running=false,lost=false,visible=true,frame=0,last=0,shotClock=0,spawnClock=0,enemyClock=0,time=0;
let ink='',muted='',lang='ru';
const shipPixels=['0001000','0011100','0011100','1111111','1101011'];
const alienPixels=['0100010','0011100','0111110','1101011','1011101'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function colors(){const css=getComputedStyle(root);ink=css.color;muted=ink;}
function sprite(pattern,x,y,size,color){ctx.fillStyle=color;pattern.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')ctx.fillRect(Math.round(x+(i-3.5)*size),Math.round(y+j*size),size,size);}));}
function draw(){
 ctx.clearRect(0,0,width,height);
 ctx.fillStyle=muted;ctx.globalAlpha=.3;
 for(let i=0;i<22;i++)ctx.fillRect((i*83+19)%width,45+(i*137)%(height-85),1,1);
 ctx.globalAlpha=1;
 enemies.forEach(e=>sprite(alienPixels,e.x*width,e.y,3,ink));
 ctx.fillStyle=ink;bullets.forEach(b=>ctx.fillRect(b.x*width-1,b.y,2,8));
 ctx.fillStyle=muted;enemyShots.forEach(b=>ctx.fillRect(b.x*width-1,b.y,3,7));
 sprite(shipPixels,ship*width,height-38,3,ink);
}
function reset(){score=0;scoreEl.textContent='0000';ship=target=.5;bullets=[];enemyShots=[];enemies=Array.from({length:6},(_,i)=>({x:.2+(i%3)*.3,y:65+Math.floor(i/3)*40,phase:i}));shotClock=spawnClock=enemyClock=time=0;lost=false;message.classList.remove('visible');status.textContent=lang==='en'?'New game':'Новая игра';}
function stop(){running=false;root.dataset.running='false';cancelAnimationFrame(frame);frame=0;last=0;}
function lose(){stop();lost=true;message.classList.add('visible');status.textContent=(lang==='en'?'Game over. Score ':'Игра окончена. Счёт ')+score;draw();}
function tick(now){
 if(!running||!visible||document.hidden){stop();return;}
 frame=requestAnimationFrame(tick);
 if(last&&now-last<1000/30)return;
 const dt=last?Math.min((now-last)/1000,.06):1/30;last=now;time+=dt;
 ship+=(target-ship)*Math.min(1,dt*18);shotClock+=dt;spawnClock+=dt;enemyClock+=dt;
 if(shotClock>.25){shotClock=0;if(bullets.length<30)bullets.push({x:ship,y:height-42});}
 if(spawnClock>1.6&&enemies.length<16){spawnClock=0;enemies.push({x:.1+Math.random()*.8,y:50,phase:time});}
 if(enemyClock>1.8&&enemies.length&&enemyShots.length<12){enemyClock=0;const e=enemies[Math.floor(Math.random()*enemies.length)];enemyShots.push({x:e.x,y:e.y+18});}
 bullets.forEach(b=>b.y-=250*dt);enemyShots.forEach(b=>b.y+=95*dt);
 enemies.forEach(e=>{e.y+=(12+Math.min(score/40,18))*dt;e.x=clamp(e.x+Math.sin(time+e.phase)*dt*.025,.06,.94);});
 for(const b of bullets)for(const e of enemies)if(!b.hit&&!e.hit&&Math.abs((b.x-e.x)*width)<13&&b.y<e.y+17&&b.y+8>e.y){b.hit=e.hit=true;score+=10;scoreEl.textContent=String(score).padStart(4,'0');}
 bullets=bullets.filter(b=>b.y>-10&&!b.hit);enemies=enemies.filter(e=>!e.hit);enemyShots=enemyShots.filter(b=>b.y<height);
 if(enemies.some(e=>e.y>height-58)||enemyShots.some(b=>Math.abs((b.x-ship)*width)<12&&b.y>height-40&&b.y<height-18)){lose();return;}
 draw();
}
function start(){if(lost)reset();if(!running&&visible&&!document.hidden){running=true;root.dataset.running='true';last=0;frame=requestAnimationFrame(tick);}}
function move(e){const r=canvas.getBoundingClientRect();target=clamp((e.clientX-r.left)/r.width,14/width,1-14/width);}
canvas.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){move(e);start();}});
canvas.addEventListener('pointermove',move);
canvas.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')stop();});
canvas.addEventListener('pointerdown',e=>{if(lost)reset();move(e);canvas.setPointerCapture(e.pointerId);start();});
canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')stop();});
canvas.addEventListener('pointercancel',stop);
root.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();target=clamp(target+(e.key==='ArrowLeft'?-.08:.08),.05,.95);start();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();},{threshold:.1});observer.observe(canvas);
const resize=new ResizeObserver(()=>{const old=height,r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);if(old)enemies.forEach(e=>e.y*=height/old);colors();draw();});resize.observe(canvas);
new MutationObserver(()=>{colors();draw();}).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
function setLanguage(value){
 lang=value;
 canvas.setAttribute('aria-label',lang==='en'?'Space game. Move the ship with the pointer, touch or arrow keys. Automatic fire.':'Космическая игра. Двигай корабль мышкой, пальцем или стрелками. Стрельба автоматическая.');
 root.setAttribute('aria-label',lang==='en'?'Space game':'Космическая игра');
}
colors();reset();draw();setLanguage('ru');
return {element:root,pause:stop,setLanguage};
}
