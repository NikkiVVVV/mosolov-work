// Shared finish presentation for both outcomes. No asset requests before a result.
const animation=new URL('./assets/game/result-cat-v83.webp',import.meta.url).href;
const still=new URL('./assets/game/result-cat-still-v83.png',import.meta.url).href;
export const CAT_DURATION=6468;
export const CAT_FADE=500;
export function createGameResult(container,{reducedMotion=false}={}){
 const image=document.createElement('img');
 image.className='space-result-cat';image.alt='';image.width=294;image.height=480;
 image.decoding='async';image.draggable=false;image.hidden=true;
 const title=container.querySelector('span');title.className='space-result-title';
 container.prepend(image);
 let shown=false,ended=false,paused=false,serial=0,fadeTimer,endTimer;
 function clearTimers(){clearTimeout(fadeTimer);clearTimeout(endTimer);}
 function play(){
  clearTimers();image.hidden=false;image.dataset.phase='playing';
  image.src=reducedMotion?still:`${animation}#play-${++serial}`;
 }
 image.addEventListener('load',()=>{
  if(!shown||paused||ended)return;
  clearTimers();
  fadeTimer=setTimeout(()=>{image.dataset.phase='fading';},CAT_DURATION-CAT_FADE);
  endTimer=setTimeout(()=>{
   ended=true;image.hidden=true;image.removeAttribute('src');image.dataset.phase='ended';
  },CAT_DURATION);
 });
 image.addEventListener('error',()=>{if(shown&&!paused&&!ended&&image.src!==still)image.src=still;});
 return {
  show(outcome){shown=true;ended=paused=false;title.textContent=outcome==='lost'?'YOU LOSE':'ALL TOKENS CLEARED';play();container.classList.add('visible');},
  hide(){shown=false;clearTimers();container.classList.remove('visible');image.hidden=true;image.removeAttribute('src');},
  pause(){if(shown&&!ended){paused=true;clearTimers();image.hidden=true;image.removeAttribute('src');}},
  resume(){if(shown&&!ended&&paused){paused=false;play();}}
 };
}
