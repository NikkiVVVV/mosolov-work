import { replyOrb } from './reply-orb.js';

export function createCollectionTour(trigger) {
  const modal = document.createElement('dialog');
  modal.className = 'collection-preview collection-tour';
  modal.setAttribute('aria-labelledby','collection-preview-title');
  modal.innerHTML = `<button class="preview-close" type="button" aria-label="Закрыть анонс">×</button><div class="tour-visual"><div class="tour-stage" aria-label="Как работает личная коллекция"></div><div class="tour-pagination" role="group" aria-label="Шаги демонстрации"></div></div><div class="tour-copy"><h2 id="collection-preview-title">Твои закладки.<br>С умным поиском.</h2><p>Загрузи закладки из Chrome. Получи описания и категории. Находи нужное по смыслу.</p></div><div class="tour-controls"><div class="tour-actions"></div><p class="preview-status" role="status" aria-live="polite"></p></div>`;
  document.body.append(modal);
  const stage = modal.querySelector('.tour-stage');
  const actions = modal.querySelector('.tour-actions');
  const pagination = modal.querySelector('.tour-pagination');
  const status = modal.querySelector('.preview-status');
  const scenes = [
    `<div class="tour-browser"><div class="tour-browser-bar"><i></i><i></i><i></i><span>Закладки</span></div><div class="tour-chrome-address">← &nbsp; → &nbsp; ⟳ <span>chrome://bookmarks</span></div><div class="tour-chrome-toolbar"><span>☰ &nbsp; Закладки</span><span class="tour-chrome-search">⌕ Поиск закладок</span><b>⋮</b></div><div class="tour-browser-body"><div class="tour-bookmark">◈ Blender</div><div class="tour-bookmark">◈ Figma</div><div class="tour-bookmark">◈ Google Fonts</div><div class="tour-chrome-menu"><span>Сортировать по названию</span><span>Добавить новую закладку</span><span>Добавить папку</span><span>Импортировать закладки</span><strong>Экспортировать закладки</strong></div><span class="tour-cursor" aria-hidden="true">↖</span><div class="tour-download">▤ bookmarks.html <span>✓</span></div></div></div>`,
    `<div class="tour-upload"><span class="tour-upload-file">▤ bookmarks.html</span><div class="tour-upload-zone"><span>↓</span><strong>Перетащи файл закладок</strong></div><span class="tour-upload-check">✓ Файл загружен</span></div>`,
    `<div class="tour-markup"><div class="tour-markup-orb">${replyOrb()}<span>Размечаю закладки</span></div><div class="tour-table"><div class="tour-table-header"><span>Сайт</span><span>Описание</span></div>${[['blender.org','Редактор 3D-моделей и анимации'],['figma.com','Дизайн интерфейсов и прототипы'],['fonts.google.com','Шрифты для проектов'],['spline.design','3D-сцены в браузере'],['unsplash.com','Фотографии для проектов'],['coolors.co','Цветовые палитры'],['rive.app','Интерактивная анимация'],['excalidraw.com','Схемы и наброски']].map(([name,note],i)=>`<div class="tour-table-row" style="--row:${i}"><span>${name}</span><span><i class="tour-note-skeleton"></i><span class="tour-note">${note}</span></span></div>`).join('')}</div></div>`,
    `<div class="tour-library"><div class="tour-mini-search">✦ <span class="tour-typed">Где сделать 3D-модель?</span></div><div class="tour-mini-tags"><span>Все</span><span class="selected">3D</span><span>Дизайн</span><span>Шрифты</span></div><div class="tour-search-skeleton"><i></i><i></i><i></i></div><div class="tour-found"><strong>blender.org</strong><span>3D</span><p>Редактор 3D-моделей и анимации</p></div></div>`
  ];
  let step = 0;
  let furthest = 0;
  let sending = false;
  let timer;
  let finished = false;
  const stop = () => clearTimeout(timer);
  function schedule() {
    stop();
    timer=setTimeout(()=>{if(!modal.open)return;if(step===3)finished=true;step=(step+1)%4;furthest=Math.max(furthest,step);render();schedule();},3500);
  }
  function render() {
    stage.innerHTML = scenes[step];
    stage.dataset.step = String(step);
    pagination.replaceChildren();
    for(let i=0;i<4;i++) {
      const dot=document.createElement('button');
      dot.type='button';dot.setAttribute('aria-label',`Шаг ${i+1}`);dot.setAttribute('aria-pressed',String(i===step));
      dot.addEventListener('click',()=>{step=i;render();schedule();});pagination.append(dot);
    }
    if(!finished)actions.replaceChildren();
    else if(!actions.querySelector('[data-vote]')) {
      actions.innerHTML='<button type="button" data-vote="no">Не пользовался бы</button><button type="button" data-vote="yes">Я бы пользовался</button>';
      actions.querySelector('[data-vote=yes]').addEventListener('click',()=>send('yes'));
      actions.querySelector('[data-vote=no]').addEventListener('click',reasonStep);
    }
    status.textContent='';
  }
  function reasonStep() {
    stop();pagination.hidden=true;
    stage.innerHTML='<form id="tour-reason-form" class="tour-reason"><label for="collection-reason">Почему не пользовался бы?</label><textarea id="collection-reason" maxlength="500" placeholder="Расскажи своими словами. Это необязательно."></textarea></form>';
    actions.innerHTML='<button type="button" class="tour-back">Отмена</button><button type="submit" form="tour-reason-form">Отправить ответ</button>';
    actions.querySelector('.tour-back').addEventListener('click',()=>{pagination.hidden=false;render();schedule();});
    stage.querySelector('form').addEventListener('submit',event=>{event.preventDefault();send('no',stage.querySelector('textarea').value);});
    stage.querySelector('textarea').focus();
  }
  async function send(answer, reason='') {
    if(sending)return;
    const base=document.documentElement.dataset.surveyBase;
    if(!base){status.textContent='Не удалось отправить. Попробуй позже.';return;}
    stop();
    sending=true;actions.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Отправляю…';
    try {
      const response=await fetch(`${base}/api/collection-interest`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(answer==='no'?{answer,reason:reason.trim()}:{answer}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();
      if(!response.ok||!['sent','duplicate'].includes(data.status))throw Error();
      actions.innerHTML='<strong class="tour-thanks">Спасибо за ответ!</strong>';status.textContent='';
    }catch{status.textContent='Не удалось отправить. Попробуй ещё раз.';actions.querySelectorAll('button').forEach(b=>b.disabled=false);}
    finally{sending=false;}
  }
  modal.querySelector('.preview-close').addEventListener('click',()=>modal.close());
  modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
  modal.addEventListener('close',()=>{stop();trigger.focus({preventScroll:true});});
  trigger.addEventListener('click',()=>{step=0;furthest=0;finished=false;pagination.hidden=false;render();modal.showModal();schedule();});
}
