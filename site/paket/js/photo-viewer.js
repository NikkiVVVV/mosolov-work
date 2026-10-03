import {createTiltInput} from './tilt-input.js?v=20261003-hero-permission';
// A single native dialog: FLIP entrance, a brief front view, then a paper-card turn.
export function createPhotoViewer(){
  const dialog=document.createElement('dialog');dialog.className='photo-viewer';
  dialog.setAttribute('aria-label','Фотография и история путешествия');
  const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='photo-viewer-close';closeButton.setAttribute('aria-label','Закрыть фотографию');
  closeButton.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const stage=document.createElement('div');stage.className='photo-viewer-stage';
  const tiltLayer=document.createElement('div');tiltLayer.className='photo-viewer-tilt';
  const card=document.createElement('button');card.type='button';card.className='photo-viewer-card';
  const front=document.createElement('span');front.className='photo-viewer-face photo-viewer-front photo-card';
  const back=document.createElement('span');back.className='photo-viewer-face photo-viewer-back';
  const heading=document.createElement('span');heading.className='photo-note-heading';
  const note=document.createElement('span');note.className='photo-note-copy';note.id='photo-viewer-note';
  back.append(heading,note);card.append(front,back);tiltLayer.append(card);stage.append(tiltLayer);dialog.append(closeButton,stage);document.body.append(dialog);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let source=null,flipped=false,closing=false,interacted=false,autoFlip=0,entrance=null,turn=null,exit=null,oldOverflow='';
  const tilt=createTiltInput(dialog,(x,y)=>{tiltLayer.style.transform=`translate3d(${x*9}px,${y*7}px,0) rotateX(${-y*13}deg) rotateY(${x*16}deg)`;},{active:()=>dialog.open&&!closing,range:12});
  function clearAuto(){clearTimeout(autoFlip);autoFlip=0;}
  function setFace(value,animate=true){
    flipped=value;
    front.setAttribute('aria-hidden',String(value));back.setAttribute('aria-hidden',String(!value));
    card.setAttribute('aria-label',value?'Показать фотографию':'Прочитать подпись на обороте');
    const from=getComputedStyle(card).transform;
    turn?.cancel();
    card.style.transform=value?'rotateY(180deg)':'rotateY(0deg)';
    if(animate&&!motion.matches){
      turn=card.animate([
        {transform:from},
        {transform:`rotateY(${value?190:-10}deg) rotateZ(${value?-2:2}deg)`,offset:.76},
        {transform:card.style.transform}
      ],{duration:850,easing:'cubic-bezier(.22,.7,.2,1)'});
    }
    if(value)card.setAttribute('aria-describedby',note.id);else card.removeAttribute('aria-describedby');
    dialog.dataset.face=value?'back':'front';
  }
  function originTransform(){
    const target=stage.getBoundingClientRect(),origin=source.getBoundingClientRect();
    return `translate3d(${origin.x+origin.width/2-target.x-target.width/2}px,${origin.y+origin.height/2-target.y-target.height/2}px,0) scale(${origin.width/target.width},${origin.height/target.height})`;
  }
  async function close(){
    if(!dialog.open||closing)return;closing=true;tilt.reset();tilt.sync();clearAuto();entrance?.cancel();turn?.cancel();
    setFace(false,false);dialog.classList.add('is-closing');
    if(!motion.matches){
      exit=stage.animate([{transform:'none',opacity:1},{transform:originTransform(),opacity:.15}],{duration:330,easing:'cubic-bezier(.4,0,.7,.2)',fill:'forwards'});
      await exit.finished.catch(()=>{});
    }
    dialog.close();exit?.cancel();document.documentElement.style.overflow=oldOverflow;
    source?.classList.remove('is-viewing');source?.focus({preventScroll:true});
    document.dispatchEvent(new CustomEvent('photo-viewer-change',{detail:{open:false}}));closing=false;
  }
  card.addEventListener('click',()=>{if(closing)return;interacted=true;clearAuto();setFace(!flipped);window.siteAnalytics?.track('photo_flip',{photo:source.dataset.photoId,face:flipped?'back':'front'});});
  closeButton.addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  motion.addEventListener('change',()=>{if(motion.matches){clearAuto();entrance?.finish();turn?.finish();}});
  return async function open(photo,index,trigger){
    if(dialog.open)return;
    source=trigger;closing=false;interacted=false;dialog.classList.remove('is-closing');
    front.replaceChildren(...[...trigger.children].map(child=>child.cloneNode(true)));
    const image=front.querySelector('img');if(image){image.src=photo.src;image.removeAttribute('srcset');image.removeAttribute('sizes');image.loading='eager';}
    heading.textContent=photo.place||photo.label||'В пути';note.textContent=photo.caption ?? '';
    oldOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
    dialog.showModal();window.siteAnalytics?.track('photo_open',{photo:photo.id});tilt.reset();tilt.sync();setFace(false,false);source.classList.add('is-viewing');
    document.dispatchEvent(new CustomEvent('photo-viewer-change',{detail:{open:true}}));
    card.focus({preventScroll:true});
    if(!motion.matches){
      entrance=stage.animate([
        {transform:originTransform(),opacity:.6},
        {transform:'translate3d(0,-8px,0) scale(1.035) rotate(-5deg)',opacity:1,offset:.65},
        {transform:'translate3d(0,3px,0) scale(.992) rotate(2deg)',offset:.84},
        {transform:'none',opacity:1}
      ],{duration:720,easing:'cubic-bezier(.22,.7,.25,1)'});
      await entrance.finished.catch(()=>{});
      if(dialog.open&&!closing&&!interacted&&!flipped)autoFlip=setTimeout(()=>setFace(true),650);
    }
  };
}
