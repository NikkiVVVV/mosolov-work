// Reveal media only when actual pixels are ready, never when a poster alone loads.
export function prepareMedia(cover,media){
 cover.classList.add('media-loading');cover.setAttribute('aria-busy','true');
 let revealed=false;
 const reveal=()=>{if(revealed)return;revealed=true;requestAnimationFrame(()=>{
  cover.classList.remove('media-loading','media-failed');cover.classList.add('media-ready');cover.setAttribute('aria-busy','false');
 });};
 const failed=()=>{cover.classList.add('media-failed');cover.setAttribute('aria-busy','false');};
 if(media.tagName==='VIDEO'){
  media.addEventListener('loadeddata',reveal,{once:true});media.addEventListener('error',failed,{once:true});
  if(media.readyState>=2)reveal();
 }else{
  const decoded=()=>media.decode().catch(()=>{}).then(reveal);
  media.addEventListener('load',decoded,{once:true});media.addEventListener('error',failed,{once:true});
  if(media.complete&&media.naturalWidth)decoded();
 }
}
export function animateExperience(details){
 const summary=details.querySelector('summary'),body=details.querySelector('.experience-body');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let animation=null,wanted=details.open;
 summary.addEventListener('click',event=>{
  event.preventDefault();wanted=!wanted;
  const height=details.open?body.getBoundingClientRect().height:0;
  const opacity=details.open?Number(getComputedStyle(body).opacity):0;
  animation?.cancel();animation=null;
  if(reduced.matches){details.open=wanted;body.style.height='';body.style.opacity='';return;}
  if(wanted)details.open=true;
  body.style.height='auto';const target=wanted?body.scrollHeight:0;
  body.style.height=`${height}px`;
  const current=body.animate([{height:`${height}px`,opacity},{height:`${target}px`,opacity:wanted?1:0}],
   {duration:360,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
  animation=current;
  current.finished.then(()=>{
   if(animation!==current)return;
   details.open=wanted;body.style.height='';body.style.opacity='';current.cancel();animation=null;
  }).catch(()=>{});
 });
}
export function createCaseReveal(){
 const observer=new IntersectionObserver(changes=>{
  for(const change of changes)if(change.isIntersecting){change.target.classList.add('case-visible');observer.unobserve(change.target);}
 },{threshold:.01});
 return card=>{card.classList.add('case-entering');observer.observe(card);};
}
