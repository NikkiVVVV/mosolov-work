// Ignore tiny scroll jitter and clamp elastic overscroll before deciding direction.
export function headerScrollState(previous,current,hidden){
 if(current<=8)return {anchor:current,hidden:false};
 const delta=current-previous;
 if(delta>=12)return {anchor:current,hidden:true};
 if(delta<=-8)return {anchor:current,hidden:false};
 return {anchor:previous,hidden};
}
export function createMobileHeader(header,mobile){
 let anchor=0,hidden=false,frame=0;
 function sync(){
  frame=0;
  if(!mobile.matches){hidden=false;anchor=scrollY;header.removeAttribute('data-scroll-hidden');header.removeAttribute('data-scrolled');header.inert=false;return;}
  const y=Math.max(0,Math.min(scrollY,document.documentElement.scrollHeight-innerHeight));
  const state=headerScrollState(anchor,y,hidden);anchor=state.anchor;hidden=state.hidden;
  if(header.querySelector(':focus-visible'))hidden=false;
  header.dataset.scrollHidden=String(hidden);header.dataset.scrolled=String(y>8);header.inert=hidden;
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 mobile.addEventListener('change',()=>{anchor=scrollY;hidden=false;schedule();});
 sync();
}
