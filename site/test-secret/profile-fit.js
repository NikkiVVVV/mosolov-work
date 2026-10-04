// Compact whitespace first, then lift the anchored profile. Never crop most of the device.
export function profileFit(viewportHeight,naturalHeight){
  const deficit=Math.max(0,68+naturalHeight+24-viewportHeight);
  const compression=Math.min(1,Math.max(0,(deficit-64)/128));
  const lift=Math.max(0,deficit-compression*128);
  return {compression,lift:Math.min(96,lift),scroll:lift>96};
}

export function createProfileFit(profile,mobile){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled=0,lastKey='';
  function sync(){
    cancelAnimationFrame(scheduled);scheduled=0;
    const key=[innerWidth,innerHeight,mobile.matches,document.documentElement.lang,profile.querySelector('details').open].join(':');
    if(key===lastKey)return;lastKey=key;
    let fit={compression:0,lift:0,scroll:false};
    if(!mobile.matches){
      // Measure the natural content once per layout change, never inside the animation loop.
      const copy=profile.cloneNode(true);
      copy.classList.add('profile-measure');copy.removeAttribute('data-scroll');
      copy.style.cssText=`position:fixed;top:0;left:0;width:${profile.offsetWidth}px;min-height:0;height:auto;transform:none;visibility:hidden;pointer-events:none;--profile-lift:0px;--profile-compression:0`;
      copy.inert=true;copy.setAttribute('aria-hidden','true');
      // Avoid duplicate ids even during this synchronous measurement.
      copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      document.body.append(copy);
      const naturalHeight=copy.offsetHeight;copy.remove();
      fit=profileFit(innerHeight,naturalHeight);
    }
    profile.toggleAttribute('data-scroll',fit.scroll);
    profile.style.setProperty('--profile-lift',`${fit.scroll?0:fit.lift}px`);
    profile.style.setProperty('--profile-compression',String(fit.scroll?0:fit.compression));
    document.dispatchEvent(new CustomEvent('portfolio:profile-layout',{detail:{duration:reduced.matches?0:360}}));
  }
  function schedule(){cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(sync);}
  profile.querySelector('details').addEventListener('toggle',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('portfolio:language',schedule);
  document.fonts.ready.then(()=>{lastKey='';schedule();});
  return sync;
}
