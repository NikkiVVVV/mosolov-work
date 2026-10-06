import {headerScrollState} from './mobile-header.js?v=89';

export function createMobileMenu(root,mobile){
 const header=document.querySelector('.mobile-topbar');
 const toggle=root.querySelector('#mobile-menu-toggle');
 const panel=root.querySelector('#mobile-menu-panel');
 const backdrop=document.querySelector('#mobile-menu-backdrop');
 const theme=root.querySelector('[data-menu-theme]');
 const language=root.querySelector('[data-menu-language]');
 let open=false,anchor=scrollY,hidden=false,frame=0;
 const en=()=>document.documentElement.lang==='en';
 function labels(){
  toggle.querySelector('span').textContent=open?(en()?'Close':'Закрыть'):(en()?'Menu':'Меню');
  root.setAttribute('aria-label',en()?'Navigation':'Навигация');
  root.querySelector('[data-menu-bookmarks] span').textContent=en()?'Favorites':'Избранное';
  root.querySelector('[data-menu-skin] span').textContent=en()?'Change skin':'Изменить скин';
  root.querySelector('[data-menu-mayonez] > span:last-child').textContent=en()?'Mayonez':'Майонез';
  root.querySelector('[data-menu-channel] span').textContent=en()?'Telegram channel':'ТГ-канал';
  theme.querySelector('span').textContent=document.documentElement.dataset.theme==='dark'?(en()?'Light theme':'Светлая тема'):(en()?'Dark theme':'Тёмная тема');
  const icon=document.querySelector(document.documentElement.dataset.theme==='dark'?'.theme-sun':'.theme-moon').cloneNode(true);
  icon.removeAttribute('class');theme.querySelector('svg').replaceWith(icon);
  language.textContent=en()?'RU':'EN';
  language.setAttribute('aria-label',en()?'Переключить на русский':'Switch to English');
 }
 function setOpen(value,focus=false){
  open=value;root.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));
  panel.inert=!open;panel.setAttribute('aria-hidden',String(!open));
  backdrop.dataset.open=String(open);
  if(open){hidden=false;root.dataset.scrollHidden='false';root.inert=false;header.dataset.scrollHidden='false';header.inert=false;}
  else if(focus)toggle.focus({preventScroll:true});
  labels();
 }
 toggle.addEventListener('click',event=>{setOpen(!open);if(open&&event.detail===0)panel.querySelector('a,button').focus();else if(!open&&event.detail!==0)toggle.blur();});
 backdrop.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&open){setOpen(false,true);event.preventDefault();}});
 document.addEventListener('focusin',event=>{if(open&&!root.contains(event.target))setOpen(false);});
 theme.addEventListener('click',()=>document.querySelector('#theme-toggle').click());
 language.addEventListener('click',()=>document.querySelector('#language-toggle').click());
 root.querySelector('[data-menu-skin]').addEventListener('click',()=>{
  setOpen(false);
  const action=document.querySelector('[data-action="zoom"]');
  action?.click();
 });
 root.addEventListener('click',event=>{
  const action=event.target.closest('a,#open-contact');
  if(!action)return;
  setOpen(false,true);

 },true);
 function sync(){
  frame=0;
  if(!mobile.matches){hidden=false;anchor=scrollY;root.inert=false;root.dataset.scrollHidden='false';header.inert=false;header.removeAttribute('data-scroll-hidden');header.removeAttribute('data-scrolled');return;}
  const y=Math.max(0,Math.min(scrollY,document.documentElement.scrollHeight-innerHeight));
  const state=headerScrollState(anchor,y,hidden);anchor=state.anchor;hidden=state.hidden;
  if(open||root.querySelector(':focus-visible')||header.querySelector(':focus-visible'))hidden=false;
  const next=String(hidden),scrolled=String(y>8);
  if(root.dataset.scrollHidden!==next){root.dataset.scrollHidden=next;root.inert=hidden;}
  if(header.dataset.scrollHidden!==next){header.dataset.scrollHidden=next;header.inert=hidden;}
  if(header.dataset.scrolled!==scrolled)header.dataset.scrolled=scrolled;
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 mobile.addEventListener('change',()=>{anchor=scrollY;hidden=false;setOpen(false);schedule();});
 document.addEventListener('portfolio:language',labels);
 document.addEventListener('portfolio:theme',labels);
 setOpen(false);sync();
}
