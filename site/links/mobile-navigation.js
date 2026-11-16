import {headerScrollState} from '../mobile-header.js?v=89';

const bar=document.querySelector('.links-mobile-bar');
let anchor=scrollY,hidden=false,frame=0;
function sync(){
 frame=0;
 const y=Math.max(0,Math.min(scrollY,document.documentElement.scrollHeight-innerHeight));
 const state=headerScrollState(anchor,y,hidden);anchor=state.anchor;hidden=state.hidden;
 bar.dataset.scrollHidden=String(hidden);bar.inert=hidden;bar.hidden=hidden;
}
window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(sync);},{passive:true});
