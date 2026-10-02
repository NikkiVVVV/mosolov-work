// Approximate centres of places named by the owner, not photo GPS coordinates.
export const places=[
  {name:'Эртиль',lat:51.84,lon:40.51,flag:'🇷🇺',country:'Россия'},
  {name:'Кутаиси · Грузия',lat:42.27,lon:42.70,flag:'🇬🇪',country:'Грузия'},
  {name:'Степанцминда · Грузия',lat:42.66,lon:44.64,flag:'🇬🇪',country:'Грузия'},
  {name:'Ереван · Армения',lat:40.18,lon:44.51,flag:'🇦🇲',country:'Армения'},
  {name:'Сахалин',lat:50.50,lon:143.00,flag:'🇷🇺',country:'Россия'},
  {name:'Бухта Тихая',lat:48.04,lon:142.54,flag:'🇷🇺',country:'Россия'},
  {name:'Озеро Буссе',lat:46.54,lon:143.30,flag:'🇷🇺',country:'Россия'},
  {name:'Остров Шкота',lat:42.81,lon:131.86,flag:'🇷🇺',country:'Россия'},
  {name:'Камчатка',lat:56.00,lon:160.00,flag:'🇷🇺',country:'Россия'},
  {name:'Шерегеш',lat:52.92,lon:87.98,flag:'🇷🇺',country:'Россия'},
  {name:'Сочи',lat:43.60,lon:39.73,flag:'🇷🇺',country:'Россия'},
  {name:'Красная Поляна',lat:43.68,lon:40.20,flag:'🇷🇺',country:'Россия'},
  {name:'Архыз',lat:43.57,lon:41.28,flag:'🇷🇺',country:'Россия'},
  {name:'Озеро Рица · Абхазия',lat:43.48,lon:40.54,flag:'🇬🇪',country:'Грузия'},
  {name:'Санкт-Петербург',lat:59.94,lon:30.31,flag:'🇷🇺',country:'Россия'},
  {name:'Дагестан',lat:43.00,lon:47.00,flag:'🇷🇺',country:'Россия'},
  {name:'Стамбул · Турция',lat:41.01,lon:28.98,flag:'🇹🇷',country:'Турция'},
  {name:'Каш · Турция',lat:36.20,lon:29.64,flag:'🇹🇷',country:'Турция'},
  {name:'Мальдивы',lat:3.20,lon:73.20,flag:'🇲🇻',country:'Мальдивы'},
  {name:'Шанхай',lat:31.23,lon:121.47,flag:'🇨🇳',country:'Китай'},
  {name:'Пекин',lat:39.90,lon:116.41,flag:'🇨🇳',country:'Китай'},
  {name:'Лимасол',lat:34.68,lon:33.05,flag:'🇨🇾',country:'Кипр'},
  {name:'Бали',lat:-8.40,lon:115.19,flag:'🇮🇩',country:'Индонезия'},
  {name:'Куала-Лумпур',lat:3.14,lon:101.69,flag:'🇲🇾',country:'Малайзия'},
  {name:'Алматы',lat:43.24,lon:76.89,flag:'🇰🇿',country:'Казахстан'},
  {name:'Египет',lat:27.00,lon:30.00,flag:'🇪🇬',country:'Египет'},
  {name:'Испания',lat:40.00,lon:-4.00,flag:'🇪🇸',country:'Испания'},
  {name:'Италия',lat:42.50,lon:12.50,flag:'🇮🇹',country:'Италия'},
  {name:'Франция',lat:47.00,lon:2.00,flag:'🇫🇷',country:'Франция'},
  {name:'Будапешт · Венгрия',lat:47.50,lon:19.04,flag:'🇭🇺',country:'Венгрия'},
  {name:'Германия',lat:51.00,lon:10.00,flag:'🇩🇪',country:'Германия'},
  {name:'Чехия',lat:49.80,lon:15.50,flag:'🇨🇿',country:'Чехия'},
  {name:'Иркутск',lat:52.29,lon:104.28,flag:'🇷🇺',country:'Россия'},
  {name:'Оман',lat:21.00,lon:57.00,flag:'🇴🇲',country:'Оман'},
  {name:'Владивосток',lat:43.12,lon:131.89,flag:'🇷🇺',country:'Россия'},
  // Approximate island centre: https://www.wikidata.org/wiki/Q847281
  {name:'Уруп',lat:45.96,lon:150.03,flag:'🇷🇺',country:'Россия'}
];
export function createTravelMap(panel){
  panel.className='album-map';
  const viewport=document.createElement('div');viewport.className='map-viewport';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Карта путешествий. Прокручивайте влево и вправо.');
  const world=document.createElement('div');world.className='map-world';
  const image=document.createElement('img');image.className='map-land';image.src='./assets/map/world-admin.svg';image.alt='';image.draggable=false;image.loading='lazy';world.append(image);
  const selection=document.createElement('div');selection.className='map-selection';selection.hidden=true;selection.setAttribute('role','status');
  let pins=[];
  function renderPins(){
    if(!world.clientWidth)return;
    pins.forEach(pin=>pin.remove());pins=[];selection.hidden=true;
    // Every visit gets its own marker; no count clusters.
    const groups=places.map(place=>({x:(place.lon+180)/360*world.clientWidth,y:(66-place.lat)/78*world.clientHeight,places:[place]}));
    // Keep crowded visits separate; the bags have no leader lines.
    const placed=[];
    for(const group of groups){
      const originalX=group.x,originalY=group.y;
      let best={x:originalX,y:originalY};
      search:for(let ring=0;ring<8;ring++){
        for(let step=0;step<(ring?16:1);step++){
          const angle=step*Math.PI/8;
          const x=originalX+Math.cos(angle)*ring*18,y=originalY+Math.sin(angle)*ring*18;
          if(y<40||y>world.clientHeight-20||x<20||x>world.clientWidth-20)continue;
          if(placed.every(p=>Math.abs(p.x-x)>31||Math.abs(p.y-y)>37)){best={x,y};break search;}
        }
      }
      group.x=best.x;group.y=best.y;placed.push(best);
      const pin=document.createElement('button');pin.type='button';pin.className='map-pin';pin.style.left=`${group.x}px`;pin.style.top=`${group.y}px`;
      const names=group.places.map(place=>place.name);
      pin.setAttribute('aria-label',names.join(', '));pin.setAttribute('aria-pressed','false');
      const bag=document.createElement('img');bag.src='./assets/bag-mobile.webp';bag.alt='';bag.draggable=false;pin.append(bag);

      pins.push(pin);world.append(pin);
      pin.addEventListener('click',()=>{
        const next=pin.getAttribute('aria-pressed')!=='true';
        for(const item of pins.filter(item=>item.matches('button')))item.setAttribute('aria-pressed',String(item===pin&&next));
        selection.replaceChildren(...group.places.map(place=>{
          const label=document.createElement('span');label.className='map-place-label';
          const flag=document.createElement('span');flag.className='map-country-flag';flag.textContent=place.flag;flag.setAttribute('role','img');flag.setAttribute('aria-label',place.country);
          label.append(flag,document.createTextNode(place.name));return label;
        }));selection.hidden=!next;
      });
    }
  }
  viewport.append(world);panel.append(viewport,selection);
  new ResizeObserver(renderPins).observe(world);
  // Native momentum scrolling on touch; mouse drag only changes scrollLeft.
  let drag=null,suppressClick=false;
  viewport.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0)return;
    suppressClick=false;drag={id:event.pointerId,x:event.clientX,left:viewport.scrollLeft,moved:false};
  });
  viewport.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x;
    if(!drag.moved&&Math.abs(dx)>5){drag.moved=true;viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');}
    if(drag.moved){event.preventDefault();viewport.scrollLeft=drag.left-dx;}
  });
  function end(event){if(!drag||event.pointerId!==drag.id)return;suppressClick=drag.moved;drag=null;viewport.classList.remove('is-dragging');if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);}
  viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('lostpointercapture',end);
  viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
  viewport.addEventListener('keydown',event=>{
    if(event.target!==viewport||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();viewport.scrollTo({left:event.key==='Home'?0:event.key==='End'?world.clientWidth:event.key==='ArrowRight'?viewport.scrollLeft+viewport.clientWidth*.65:viewport.scrollLeft-viewport.clientWidth*.65,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  let positioned=false;
  return {show(){if(positioned)return;requestAnimationFrame(()=>{if(!viewport.clientWidth)return;viewport.scrollLeft=world.clientWidth*(265/360)-viewport.clientWidth/2;positioned=true;});}};
}
