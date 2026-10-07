import {headerScrollState} from '../mobile-header.js?v=89';

const bar=document.querySelector('.links-mobile-bar');
const menu=bar.querySelector('details');
const toggle=menu.querySelector('summary');
let anchor=scrollY,hidden=false,frame=0;
function close(){menu.open=false;}
document.addEventListener('click',event=>{if(!menu.contains(event.target))close();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){close();toggle.focus();}});
document.addEventListener('focusin',event=>{if(!bar.contains(event.target))close();});
const backdrop=bar.querySelector('.links-menu-backdrop');
backdrop.addEventListener('click',close);
menu.addEventListener('toggle',()=>{toggle.setAttribute('aria-label',menu.open?'Закрыть меню':'Меню');backdrop.dataset.open=String(menu.open);});
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
function sync(){
 frame=0;
 const y=Math.max(0,Math.min(scrollY,document.documentElement.scrollHeight-innerHeight));
 const state=headerScrollState(anchor,y,hidden);anchor=state.anchor;hidden=state.hidden;
 if(menu.open||bar.querySelector(':focus-visible'))hidden=false;
 bar.dataset.scrollHidden=String(hidden);bar.inert=hidden;
}
window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(sync);},{passive:true});
