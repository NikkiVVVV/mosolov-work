import { albumAdditions } from './album-additions.js?v=20261002-captions';
import { renderGallery } from './gallery.js?v=20261002-metrika';
// Dates and travel count supplied by the owner. Bag age intentionally omitted by agreement.
export const content = {
  showMerch: false, // Keep the assortment for a later return.
  showFacts: false, // Temporarily hidden; keep the data and renderer for restoration.
  story: {
    paragraphs: [
      'Почему этот пакет стал талисманом и собрал 20+ приключений по всему миру? Хз, так исторически сложилось.',
      'Обычный пластиковый пакет с логотипом районной газеты из города Эртиля Воронежской области путешествует с нами с 2016 года.',
      'Его забывали под подушкой в Кутаиси и возвращали почтой. Он был на Камчатке, Мальдивах и в Африке. Он даже пережил нападение медведей на Сергея Абросина на острове Уруп.'
    ],
    newspaper: {text:'районной газеты',url:'https://ok.ru/gazetaertil'},
    photos: []
  },
  facts: [
    {value:'2016',label:'с этого года в пути'},
    {value:'20+',label:'стран за плечами'},
    // Regional development agency: factory settlement formed in 1897.
    {value:'1897',label:'год основания Эртиля',source:'https://investinvrn.ru/region/municipal_districts/ertilskiy-munitsipalnyy-rayon/'},
    {value:'1',label:'пакет на все поездки'},
    {value:'75',label:'лет газете на принте'}
  ],
  // Photo order is stable; places and stories supplied by the owner.
  album: [
    {id:'summit',src:'./assets/album/01-summit.webp',thumbnail:'./assets/album/01-summit-thumb.webp',label:"Шерегеш",alt:'Путешественник с пакетом у заснеженного креста на вершине',caption:"Было очень холодно, но лыжники всё равно гетеросексуалы.",position:'50% 64%'},
    {id:'hike',src:'./assets/album/02-hike.webp',thumbnail:'./assets/album/02-hike-thumb.webp',label:"Архыз",alt:'Пятеро путешественников с пакетом на фоне гор',caption:"Главный урок похода — не брать с собой алкоголь в стекле в горы.",position:'50% 60%'},
    {id:'together',src:'./assets/album/03-together.webp',thumbnail:'./assets/album/03-together-thumb.webp',label:"Пицунда",alt:'Четверо друзей с белым пакетом в помещении',caption:"Повезли туда пакет только из-за названия.",position:'50% 72%'},
    {id:'underwater',src:'./assets/album/04-underwater.webp',thumbnail:'./assets/album/04-underwater-thumb.webp',label:"Мальдивы",alt:'Двое в масках под водой держат пакет «Эртильские новости»',caption:"Плавал с акулами. Кажется, они тоже не ожидали встретить районную газету под водой.",position:'50% 65%'},
    ...albumAdditions
  ],
  // Preview assortment; actual prices, product photos and order URLs are not supplied yet.
  merch: [
    {name:'Стикерпак',kind:'stickers',description:'Пакет всегда с тобой',price:'',orderUrl:''},
    {name:'Брелок',kind:'keyring',description:'Маленький попутчик',price:'',orderUrl:''},
    {name:'Сертификат',kind:'certificate',description:'На что-то пакетное',price:'',orderUrl:''},
    {name:'Футболка',kind:'shirt',description:'С тем самым пакетом',price:'',orderUrl:''}
  ],
};

function image(data) {
  const img = document.createElement('img');
  img.src = data.src; img.alt = data.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
  return img;
}
export function renderSections(data = content) {
  renderFacts(data.showFacts === false ? [] : (data.facts || []));
  renderGallery(data.album);
  if (data.story.paragraphs.length) {
    const section = document.querySelector('#story');
    const layout = document.createElement('div'); layout.className = 'story-layout';
    const copy = document.createElement('div'); copy.className = 'story-copy';
    const heading=document.createElement('h2');heading.className='story-heading';heading.textContent='О пакете';
    for(const rawText of data.story.paragraphs){
      const text=bindShortWords(rawText);
      const p=document.createElement('p'),newspaper=data.story.newspaper;
      const at=newspaper?text.indexOf(newspaper.text):-1;
      if(at>=0){
        const link=document.createElement('a');link.href=newspaper.url;link.textContent=newspaper.text;link.target='_blank';link.rel='noopener noreferrer';
        p.append(text.slice(0,at),link,text.slice(at+newspaper.text.length));
      }else p.textContent=text;
      copy.append(p);
    }
    layout.append(heading,copy); section.replaceChildren(layout); section.hidden = false;
    revealStory(section);
  }
  renderShop(data.showMerch === false ? [] : data.merch);

}

function renderShop(items){
  const section=document.querySelector('#merch');
  if(!items.length){section.hidden=true;return;}
  const heading=document.createElement('h2');heading.className='shop-heading';heading.textContent='Мерч';
  const grid=document.createElement('div');grid.className='merch-grid';
  for(const item of items){
    const card=document.createElement('article');card.className='merch-item';
    const visual=document.createElement('div');visual.className='merch-visual';
    if(item.src)visual.append(image(item));
    else{
      visual.classList.add('merch-preview',`merch-preview-${item.kind}`);
      visual.setAttribute('role','img');visual.setAttribute('aria-label',`Предварительный макет: ${item.name}`);
      const count=item.kind==='stickers'?3:1;
      for(let i=0;i<count;i++){
        const object=document.createElement('span');object.className='merch-object';
        if(item.kind==='certificate')object.innerHTML='<span class="certificate-title">Тот самый пакет</span><span class="certificate-label">Подарочный сертификат</span>';
        else{
          if(item.kind==='shirt')object.innerHTML='<svg class="shirt-silhouette" viewBox="0 0 120 120" aria-hidden="true"><path d="M41 13L21 22 6 47 27 59 34 47 32 110 88 110 86 47 93 59 114 47 99 22 79 13Q60 29 41 13Z"/><path d="M41 13Q60 37 79 13" fill="none"/></svg>';
          object.append(image({src:'./assets/bag-mobile.webp'}));
        }
        visual.append(object);
      }
    }
    const name=document.createElement('h3');name.textContent=item.name;
    const description=document.createElement('p');description.className='merch-description';description.textContent=item.description||'';
    let orderUrl;try{const url=new URL(item.orderUrl);if(url.protocol==='https:')orderUrl=url.href;}catch{}
    const price=document.createElement('p');price.className='merch-price';price.textContent=item.price||'Скоро';
    const order=document.createElement(orderUrl?'a':'button');order.className='order-link';
    if(orderUrl){order.href=orderUrl;order.textContent='Заказать';order.target='_blank';order.rel='noopener noreferrer';}
    else{order.type='button';order.disabled=true;order.textContent='Скоро в продаже';}
    card.append(visual,name,description,price,order);grid.append(card);
  }
  section.replaceChildren(heading,grid);section.hidden=false;
}

function renderFacts(facts){
  const section=document.querySelector('#facts');
  if(!facts.length){section.hidden=true;return;}
  section.hidden=false;
  const viewport=document.createElement('div');viewport.className='facts-window';viewport.tabIndex=0;
  viewport.setAttribute('aria-label','Цифры о пакете. При фокусе движение приостанавливается.');
  const track=document.createElement('div');track.className='facts-track';
  const group=document.createElement('ul');group.className='facts-group';
  for(const fact of facts){
    const item=document.createElement('li');item.className='fact';
    const value=document.createElement('span');value.className='fact-value';value.textContent=fact.value;
    const label=document.createElement('span');label.className='fact-label';label.textContent=fact.label;
    item.append(value,label);group.append(item);
  }
  const repeat=group.cloneNode(true);repeat.setAttribute('aria-hidden','true');
  track.append(group,repeat);viewport.append(track);section.replaceChildren(viewport);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false;
  function sync(){
    const running=visible&&!document.hidden&&!motion.matches;
    section.classList.toggle('is-running',running);
    section.dataset.motion=running?'running':'paused';
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(section);
  document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
}

function bindShortWords(text){
  // Repeat once for chains such as «и в Африке»; works across Cyrillic word boundaries.
  const short=/(^|[\s(«])((?:в|во|на|с|со|из|к|ко|о|об|от|до|по|за|у|для|без|под|над|при|про|и|а|но|не)) +(?=\S)/giu;
  return text.replace(short,'$1$2\u00a0').replace(short,'$1$2\u00a0').replace(/(\d{4}) (года)/g,'$1\u00a0$2').replace('острове Уруп','острове\u00a0Уруп');
}

function revealStory(section){
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  if(motion.matches){section.dataset.reveal='complete';return;}
  section.classList.add('has-reveal');section.dataset.reveal='pending';
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    observer.disconnect();section.classList.add('is-revealed');section.dataset.reveal='running';
  },{threshold:.12});
  const copy=section.querySelector('.story-copy');
  copy.addEventListener('transitionend',event=>{if(event.propertyName==='color')section.dataset.reveal='complete';});
  motion.addEventListener('change',()=>{if(motion.matches){observer.disconnect();section.classList.add('is-revealed');section.dataset.reveal='complete';}});
  function begin(){observer.observe(copy.querySelector('p'));}
  if(document.documentElement.dataset.intro==='done')begin();
  else window.addEventListener('bag-ready',begin,{once:true});
}
