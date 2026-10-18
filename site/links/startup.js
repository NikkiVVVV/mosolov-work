import {g2Dots} from './search-g2.js';

const intro=document.querySelector('#startup');
const phrase=intro?.querySelector('.startup-copy');
if(intro && phrase){
  intro.querySelector('.search-g2-stage').innerHTML=g2Dots().map(style=>`<i class="search-g2-dot" style="${style}"></i>`).join('');
  const messages=['Храните полезные сайты','Находите по смыслу','Собирайте свои подборки'];
  const timers=messages.slice(1).map((message,index)=>setTimeout(()=>{
    phrase.classList.add('is-changing');
    timers.push(setTimeout(()=>{phrase.textContent=message;phrase.classList.remove('is-changing');},120));
  },(index+1)*600));
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const fonts=document.fonts ? Promise.all([
    document.fonts.load('400 16px "Golos Text"'),
    document.fonts.load('500 48px "Golos Text"'),
  ]).catch(()=>{}) : Promise.resolve();
  Promise.all([delay(1800),Promise.race([fonts,delay(4000)])]).finally(()=>{
    timers.forEach(clearTimeout);
    document.documentElement.classList.remove('startup-pending');
    setTimeout(()=>intro.remove(),320);
  });
}
