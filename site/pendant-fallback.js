// Download the PNG only after 3D fails; no WebGL or animation loop is needed.
export async function showPendantFallback(block,{reduced=false,documentRef=document}={}){
  const host=block.querySelector('[data-pendant]');
  if(host.querySelector('.pendant-fallback'))return;
  const image=documentRef.createElement('img');
  image.className='pendant-fallback';image.alt='Никита Мосолов в подвеске';
  image.width=600;image.height=900;image.decoding='async';
  image.style.visibility='hidden';
  image.src='assets/pendant/pendant-fallback-v186.png';
  host.append(image);block.hidden=false;
  try{await image.decode();}catch{
    image.remove();block.hidden=true;
    documentRef.dispatchEvent(new CustomEvent('portfolio:pendant-unavailable'));
    return;
  }
  block.dataset.fallback='true';image.style.visibility='';
  documentRef.dispatchEvent(new CustomEvent('portfolio:pendant-unavailable'));
  if(!image.animate)return;
  const frames=reduced?[{opacity:0},{opacity:1}]:[
    {transform:'translate(-50%,-120vh) rotate(0deg)',offset:0,easing:'cubic-bezier(.42,0,.9,.65)'},
    {transform:'translate(-50%,12px) rotate(2deg)',offset:.6},
    {transform:'translate(-50%,-7px) rotate(-1.4deg)',offset:.78},
    {transform:'translate(-50%,3px) rotate(.7deg)',offset:.9},
    {transform:'translate(-50%,0) rotate(0deg)',offset:1}
  ];
  const animation=image.animate(frames,{delay:400,duration:reduced?120:1300,fill:'both',easing:'ease-out'});
  animation.finished.then(()=>animation.cancel()).catch(()=>{});
}
