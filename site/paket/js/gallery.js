import { createAlbumBag } from './album-bag.js?v=20261002-bag-hint';
import { createTravelMap } from './travel-map.js?v=20261003-uzbekistan';
import { createPhotoViewer } from './photo-viewer.js?v=20261003-hero-permission';
import { createTiltInput } from './tilt-input.js?v=20261003-hero-permission';
function photoSurface(photo,index){
  const media=document.createElement('div');media.className='photo-surface';
  if(photo.src){
    const img=document.createElement('img');img.src=photo.thumbnail||photo.src;
    if(photo.thumbnail){img.srcset=`${photo.thumbnail} 1x, ${photo.src} 2x`;}
    img.alt=photo.alt||photo.place||`Фото ${index+1}`;
    img.loading=index<2?'eager':'lazy';img.decoding='async';img.draggable=false;img.style.objectPosition=photo.position||'50% 50%';media.append(img);
  }else{
    media.classList.add('is-placeholder');
    const number=document.createElement('span');number.className='photo-number';
    number.textContent=String(index+1).padStart(2,'0');media.append(number);
  }
  return media;
}

export function renderGallery(photos){
  const section=document.querySelector('#album');
  const openPhoto=createPhotoViewer();
  const grid=document.createElement('div');grid.className='album-grid';
  for(const [index,photo] of photos.entries()){
    const card=document.createElement('button');card.type='button';card.className='photo-card';card.dataset.photoId=photo.id;
    card.setAttribute('aria-label',`Открыть фото: ${photo.place||photo.label||index+1}`);
    card.setAttribute('aria-haspopup','dialog');
    card.addEventListener('click',()=>openPhoto(photo,index,card));
    const media=photoSurface(photo,index);media.style.setProperty('--placeholder-tone',['#e9e9e5','#dfdfda','#eeede9','#e4e5e2'][index%4]);
    const label=document.createElement('span');label.className='photo-card-label';label.textContent=photo.place||photo.label||`Фото ${String(index+1).padStart(2,'0')}`;
    card.append(media,label);grid.append(card);
  }
  grid.append(createAlbumBag());
  const galleryPanel=document.createElement('div');galleryPanel.id='album-gallery';galleryPanel.append(grid);
  const mapPanel=document.createElement('div');mapPanel.id='album-map';mapPanel.className='album-map';
  section.replaceChildren(galleryPanel,mapPanel);
  let viewerOpen=false;
  const tilt=createTiltInput(grid,(x,y)=>{
    grid.style.setProperty('--album-tilt-x',`${-y*7}deg`);
    grid.style.setProperty('--album-tilt-y',`${x*9}deg`);
    grid.style.setProperty('--album-tilt-z',`${x*2}deg`);
  },{active:()=>!viewerOpen,buttonHost:section,range:12});
  document.addEventListener('photo-viewer-change',event=>{
    viewerOpen=event.detail.open;tilt.reset();tilt.sync();
  });
  const travelMap=createTravelMap(mapPanel);
  travelMap.show();
}
