// Small, calibrated orientation input; no sensor data is stored or transmitted.
export const clampTilt=value=>Math.max(-1,Math.min(1,value));
export function normalizedTilt(beta,gamma,base,angle=0,range=24){
  const b=Math.atan2(Math.sin((beta-base.beta)*Math.PI/180),Math.cos((beta-base.beta)*Math.PI/180))*180/Math.PI/range;
  const g=(gamma-base.gamma)/range,a=angle*Math.PI/180;
  return {x:clampTilt(g*Math.cos(a)+b*Math.sin(a)),y:clampTilt(b*Math.cos(a)-g*Math.sin(a))};
}
// Gravity projected onto the screen: face-up on a table is zero, upright is y=1.
export function screenGravity(beta,gamma,angle=0){
  const b=beta*Math.PI/180,g=gamma*Math.PI/180,a=angle*Math.PI/180;
  const x=Math.cos(b)*Math.sin(g),y=Math.sin(b);
  return {x:clampTilt(x*Math.cos(a)+y*Math.sin(a)),y:clampTilt(y*Math.cos(a)-x*Math.sin(a))};
}
let granted=false,permissionAttempted=false;
export function createTiltInput(root,onChange,{active=()=>true,buttonHost=root,range=24,requestPermission=false}={}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const Device=window.DeviceOrientationEvent;
  const secure=window.isSecureContext;
  const asks=secure&&typeof Device?.requestPermission==='function';
  let base=null,visible=false,listening=false,lastX=0,lastY=0,lastGravity=null;
  const usable=()=>visible&&active()&&!document.hidden&&!reduced.matches;
  function emit(x,y,gravity=null){
    const postureChanged=!!gravity!==!!lastGravity||(gravity&&lastGravity&&Math.abs(gravity.x-lastGravity.x)+Math.abs(gravity.y-lastGravity.y)>.002);
    if(!postureChanged&&Math.abs(x-lastX)+Math.abs(y-lastY)<.003)return;
    lastX=x;lastY=y;lastGravity=gravity;onChange(x,y,gravity);
  }
  function reset(){base=null;emit(0,0);}
  function orientation(event){
    if(!usable()||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
    if(!base)base={beta:event.beta,gamma:event.gamma};
    const angle=screen.orientation?.angle||0;
    const p=normalizedTilt(event.beta,event.gamma,base,angle,range);
    emit(p.x,p.y,screenGravity(event.beta,event.gamma,angle));
  }
  function sync(){
    const next=usable()&&secure&&!!Device&&(!asks||granted);
    if(next&&!listening)window.addEventListener('deviceorientation',orientation,{passive:true});
    if(!next&&listening)window.removeEventListener('deviceorientation',orientation);
    listening=next;
    if(!usable())reset();
    if(button)button.hidden=reduced.matches||granted||permissionAttempted;
  }
  let button;
  if(requestPermission&&asks&&(navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches)){
    button=document.createElement('button');button.type='button';button.className='motion-enable';button.setAttribute('aria-label','Включить наклон от движения телефона');button.title='Включить наклон телефона';
    button.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true"><rect x="8" y="4" width="8" height="16" rx="2" stroke="currentColor" stroke-width="1.5" transform="rotate(12 12 12)"/><path d="M4 8 2 12l3 3m15-7 2 4-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    button.addEventListener('click',async()=>{
      if(permissionAttempted||granted)return;
      permissionAttempted=true;sync();
      try{granted=(await Device.requestPermission())==='granted';}catch{granted=false;}
      window.dispatchEvent(new Event('tilt-permission'));
      sync();
    });buttonHost.append(button);
  }
  root.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||!usable()||event.buttons)return;
    const r=root.getBoundingClientRect();emit(clampTilt((event.clientX-r.left)/r.width*2-1),clampTilt((event.clientY-r.top)/r.height*2-1));
  },{passive:true});
  root.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')reset();},{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(root);
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  window.addEventListener('tilt-permission',sync);window.addEventListener('bag-ready',sync);window.addEventListener('orientationchange',reset);
  return {reset,sync};
}
