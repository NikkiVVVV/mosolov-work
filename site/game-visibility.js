// Viewport-driven play on every device; input only steers the ship.
export function createGameVisibility({target,mobile,onResume,onPause,onHint}){
 let visible=false,hintShown=false;
 function sync(){
  if(!visible||document.hidden){onPause();return;}
  onResume();
 }
 const observer=new IntersectionObserver(([entry])=>{
  visible=entry.isIntersecting&&entry.intersectionRatio>0;
  sync();
  // Wait until the lower controls can actually be seen, but gameplay starts at the first visible edge.
  if(visible&&!document.hidden&&mobile.matches&&!hintShown&&entry.intersectionRatio>=.75){hintShown=true;onHint();}
 },{threshold:[0,.75]});
 observer.observe(target);
 document.addEventListener('visibilitychange',sync);
 mobile.addEventListener('change',sync);
 return {
  get visible(){return visible;},
  refresh(){observer.unobserve(target);observer.observe(target);},
 };
}
