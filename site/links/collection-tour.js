import { replyOrb } from './reply-orb.js';

export function createCollectionTour(trigger) {
  const modal = document.createElement('dialog');
  modal.className = 'collection-preview collection-tour';
  modal.setAttribute('aria-labelledby','collection-preview-title');
  modal.innerHTML = `<button class="preview-close" type="button" aria-label="Закрыть анонс">×</button><div class="tour-visual"><div class="tour-stage" aria-label="Как работает личная коллекция"></div><span class="tour-travel-file" aria-hidden="true">▤ bookmarks.html</span></div><div class="tour-copy"><h2 id="collection-preview-title">Наведи порядок<br>в своих закладках.</h2></div><div class="tour-controls"><div class="tour-actions"></div><p class="preview-status" role="status" aria-live="polite"></p></div>`;
  document.body.append(modal);
  const stage = modal.querySelector('.tour-stage');
  const actions = modal.querySelector('.tour-actions');
  const visual = modal.querySelector('.tour-visual');
  const status = modal.querySelector('.preview-status');
  const scenes = [
    `<div class="tour-browser"><div class="tour-browser-bar"><i></i><i></i><i></i><span>Закладки</span></div><div class="tour-chrome-address">← &nbsp; → &nbsp; ⟳ <span>chrome://bookmarks</span></div><div class="tour-chrome-toolbar"><span>☰ &nbsp; Закладки</span><span class="tour-chrome-search">⌕ Поиск закладок</span><b>⋮</b></div><div class="tour-browser-body"><div class="tour-bookmark">◈ Blender</div><div class="tour-bookmark">◈ Figma</div><div class="tour-bookmark">◈ Google Fonts</div><div class="tour-chrome-menu"><span>Сортировать по названию</span><span>Добавить новую закладку</span><span>Добавить папку</span><span>Импортировать закладки</span><strong>Экспортировать закладки</strong></div><span class="tour-cursor" aria-hidden="true">↖</span></div></div>`,
    `<div class="tour-upload"><div class="tour-upload-zone"><span>↓</span><strong>Перетащи файл закладок</strong></div></div>`,
    `<div class="tour-markup"><div class="tour-markup-orb">${replyOrb()}<span class="tour-assistant-copy"><span>Изучаю сайты и добавляю описания</span><span>Выделяю темы и подбираю теги</span></span></div><div class="tour-table"><div class="tour-table-header"><span>Сайт</span><span>Описание</span></div>${[['blender.org','Редактор 3D-моделей и анимации','3D · анимация'],['figma.com','Дизайн интерфейсов и прототипы','дизайн · прототипы'],['fonts.google.com','Шрифты для проектов','шрифты · типографика'],['spline.design','3D-сцены в браузере','3D · инструменты'],['unsplash.com','Фотографии для проектов','фото · материалы'],['coolors.co','Цветовые палитры','цвет · палитры'],['rive.app','Интерактивная анимация','анимация · интерактив'],['excalidraw.com','Схемы и наброски','схемы · наброски']].map(([name,note,tag],i)=>`<div class="tour-table-row" style="--row:${i}"><span>${name}</span><span><i class="tour-note-skeleton"></i><span class="tour-note">${note}<small class="tour-row-tags">${tag}</small></span></span></div>`).join('')}</div></div>`,
    `<div class="tour-grouping"><div class="tour-markup-orb">${replyOrb()}<span>Собираю похожие сайты в группы</span></div><div class="tour-topic" style="--row:0"><strong>3D и анимация</strong><span>blender.org · spline.design · rive.app</span></div><div class="tour-topic" style="--row:1"><strong>Дизайн и материалы</strong><span>figma.com · unsplash.com · coolors.co</span></div><div class="tour-topic" style="--row:2"><strong>Шрифты</strong><span>fonts.google.com</span></div></div>`,
    `<div class="tour-library"><div class="tour-mini-search">✦ <span class="tour-typed">Где сделать 3D-модель?</span></div><div class="tour-mini-tags"><span>Все</span><span class="selected">3D</span><span>Дизайн</span><span>Шрифты</span></div><div class="tour-search-skeleton"><i></i><i></i><i></i></div><div class="tour-found"><strong>blender.org</strong><span>3D</span><p>Редактор 3D-моделей и анимации</p></div></div>`
  ];
  let step = 0;
  let sending = false;
  let timer;
  let finished = false;
  const stop = () => clearTimeout(timer);
  function schedule() {
    stop();
    timer=setTimeout(()=>{if(!modal.open)return;if(step===scenes.length-1)finished=true;step=(step+1)%scenes.length;render();schedule();},5000);
  }
  function render() {
    stage.innerHTML = scenes[step];
    stage.dataset.step = String(step);
    visual.dataset.step=String(step);
    if(!finished)actions.replaceChildren();
    else if(!actions.querySelector('[data-vote]')) {
      actions.innerHTML='<button type="button" data-vote="no">Не пользовался бы</button><button type="button" data-vote="yes">Я бы пользовался</button>';
      actions.querySelector('[data-vote=yes]').addEventListener('click',()=>send('yes'));
      actions.querySelector('[data-vote=no]').addEventListener('click',reasonStep);
    }
    status.textContent='';
  }
  function reasonStep() {
    stop();visual.dataset.step="reason";
    stage.innerHTML='<form id="tour-reason-form" class="tour-reason"><label for="collection-reason">Почему не пользовался бы?</label><textarea id="collection-reason" maxlength="500" placeholder="Расскажи своими словами. Это необязательно."></textarea></form>';
    actions.innerHTML='<button type="button" class="tour-back">Отмена</button><button type="submit" form="tour-reason-form">Отправить ответ</button>';
    actions.querySelector('.tour-back').addEventListener('click',()=>{render();schedule();});
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
  trigger.addEventListener('click',()=>{step=0;finished=false;render();modal.showModal();schedule();});
}
