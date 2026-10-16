import { replyOrb } from './reply-orb.js';

export function createCollectionTour(trigger) {
  const modal = document.createElement('dialog');
  modal.className = 'collection-preview collection-tour';
  modal.setAttribute('aria-labelledby','collection-preview-title');
  modal.innerHTML = `<button class="preview-close" type="button" aria-label="Закрыть анонс">×</button><div class="tour-visual"><div class="tour-stage" aria-label="Как работает личная коллекция"></div><span class="tour-travel-file" aria-hidden="true"><svg class="tour-file-icon" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M8 2h16l12 12v30a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M24 2v12h12M13 26h16M13 33h12"/></svg><span>bookmarks.html<small>Закладки Chrome</small></span></span></div><div class="tour-copy"><h2 id="collection-preview-title">Наведи порядок<br>в своих закладках.</h2><p>Добавим описания и теги, сгруппируем сайты по смыслу — чтобы нужное легко находилось.</p></div><div class="tour-controls"><div class="tour-actions"></div><p class="preview-status" role="status" aria-live="polite"></p></div>`;
  document.body.append(modal);
  const stage = modal.querySelector('.tour-stage');
  const actions = modal.querySelector('.tour-actions');
  const visual = modal.querySelector('.tour-visual');
  const status = modal.querySelector('.preview-status');
  const scenes = [
    `<div class="tour-launch"><svg class="tour-chrome-logo" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46" fill="#ea4335"/><path d="M48 48 87 25a46 46 0 0 1-39 69Z" fill="#fbbc05"/><path d="m48 48 0 46A46 46 0 0 1 8 25Z" fill="#34a853"/><circle cx="48" cy="48" r="22" fill="#4285f4" stroke="#fff" stroke-width="5"/></svg><div class="tour-export-menu"><span>Закладки Chrome</span><strong>Скачать закладки <span>↓</span></strong></div><svg class="tour-export-pointer" viewBox="0 0 24 32" aria-hidden="true"><path d="M3 2v24l6-6 5 10 4-2-5-10h9L3 2Z" fill="white" stroke="#191a1b" stroke-width="1.5"/></svg></div>`,
    `<div class="tour-upload"><div class="tour-upload-zone"><span>↓</span><strong>Перетащи файл закладок</strong></div></div>`,
    `<div class="tour-markup"><div class="tour-attachment"><svg class="tour-file-icon" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M8 2h16l12 12v30a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M24 2v12h12M13 26h16M13 33h12"/></svg><span>bookmarks.html<small>Закладки из Chrome</small></span></div><div class="tour-markup-orb">${replyOrb()}<span class="tour-assistant-copy"><span style="--message:0">Читаю названия и содержимое сайтов.</span><span style="--message:1">Добавляю короткие описания: что здесь полезного.</span><span style="--message:2">Подбираю теги: 3D, дизайн, шрифты, анимация.</span><span style="--message:3">Готово</span></span></div><div class="tour-table"><div class="tour-table-header"><span>Сайт</span><span>Описание</span></div>${[['blender.org','Редактор 3D-моделей и анимации','3D · анимация'],['figma.com','Дизайн интерфейсов и прототипы','дизайн · прототипы'],['fonts.google.com','Шрифты для проектов','шрифты · типографика'],['spline.design','3D-сцены в браузере','3D · инструменты'],['unsplash.com','Фотографии для проектов','фото · материалы'],['coolors.co','Цветовые палитры','цвет · палитры'],['rive.app','Интерактивная анимация','анимация · интерактив'],['excalidraw.com','Схемы и наброски','схемы · наброски']].map(([name,note,tag],i)=>`<div class="tour-table-row" style="--row:${i}"><span>${name}</span><span><i class="tour-note-skeleton"></i><span class="tour-note">${note}<small class="tour-row-tags">${tag}</small></span></span></div>`).join('')}</div></div>`,
    `<div class="tour-grouping"><div class="tour-markup-orb">${replyOrb()}<span>Собираю похожие сайты в подборки</span></div><div class="tour-topic" style="--row:0"><strong>3D и анимация</strong><span>blender.org · spline.design · rive.app</span></div><div class="tour-topic" style="--row:1"><strong>Дизайн и материалы</strong><span>figma.com · unsplash.com · coolors.co</span></div><div class="tour-topic" style="--row:2"><strong>Шрифты</strong><span>fonts.google.com</span></div></div>`,
    `<div class="tour-library"><div class="tour-mini-search">✦ <span class="tour-typed">Шрифтовые пары</span></div><div class="tour-mini-tags"><span>Все</span><span class="selected">Шрифты</span><span>Подборки</span></div><div class="tour-search-skeleton"><i></i><i></i><i></i></div><div class="tour-results-window"><div class="tour-results-stream"><div class="tour-result-item" style="--result:0"><strong><a href="https://fontpair.co/" target="_blank" rel="noopener noreferrer">fontpair.co</a></strong><span>Шрифты · подборки</span><p>Готовые сочетания шрифтов</p></div><div class="tour-result-item" style="--result:1"><strong><a href="https://fontjoy.com/" target="_blank" rel="noopener noreferrer">fontjoy.com</a></strong><span>Шрифты · генератор</span><p>Подбор шрифтовых пар</p></div><div class="tour-result-item" style="--result:2"><strong><a href="https://typ.io/" target="_blank" rel="noopener noreferrer">typ.io</a></strong><span>Шрифты · референсы</span><p>Шрифтовые сочетания на реальных сайтах</p></div></div></div></div>`
  ];
  let step = 0;
  let sending = false;
  let timer;
  let finished = false;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const toast=document.createElement('div');toast.className='collection-feedback-toast';toast.setAttribute('role','status');toast.hidden=true;document.body.append(toast);
  let toastTimer;
  const stop = () => clearTimeout(timer);
  function schedule() {
    stop();
    timer=setTimeout(()=>{
      if(!modal.open)return;
      if(step===scenes.length-1){finished=true;renderActions();return;}
      step++;render();schedule();
    },[8000,2800,15500,3600,6000][step]);
  }
  function render() {
    const previous=stage.firstElementChild;
    const next=document.createElement('div');next.className='tour-slide';next.innerHTML=scenes[step];stage.append(next);
    if(previous) {
      previous.setAttribute('aria-hidden','true');
      if(reducedMotion.matches)previous.remove();
      else {previous.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-20px)'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'}).onfinish=()=>previous.remove();}
    }
    if(!reducedMotion.matches)next.animate([{opacity:0,transform:'translateX(20px)'},{opacity:1,transform:'translateX(0)'}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)'});
    stage.dataset.step = String(step);
    visual.dataset.step=String(step);
    renderActions();
    status.textContent='';
  }
  function renderActions() {
    modal.classList.toggle('has-actions',finished);
    if(!finished)actions.replaceChildren();
    else if(!actions.querySelector('[data-vote]')) {
      actions.innerHTML='<button type="button" data-vote="no">Не пригодится</button><button type="button" data-vote="yes">Мне пригодится</button>';
      actions.querySelector('[data-vote=yes]').addEventListener('click',()=>send('yes'));
      actions.querySelector('[data-vote=no]').addEventListener('click',reasonStep);
    }
  }
  function reasonStep() {
    stop();visual.dataset.step="reason";modal.classList.add('is-reason');status.textContent='';
    stage.innerHTML='<form id="tour-reason-form" class="tour-reason"><label id="collection-reason-title" for="collection-reason">Почему не пригодится?</label><textarea id="collection-reason" maxlength="500" placeholder="Расскажи своими словами. Необязательно."></textarea></form>';
    modal.setAttribute('aria-labelledby','collection-reason-title');
    actions.innerHTML='<button type="button" class="tour-back">Закрыть</button><button type="submit" form="tour-reason-form">Отправить</button>';
    actions.querySelector('.tour-back').addEventListener('click',()=>modal.close());
    stage.querySelector('form').addEventListener('submit',event=>{event.preventDefault();send('no',stage.querySelector('textarea').value);});
    stage.querySelector('textarea').focus();
  }
  async function send(answer, reason='') {
    if(sending)return;
    const base=document.documentElement.dataset.surveyBase;
    if(!base){if(answer==='yes'){modal.close();toast.textContent='Не удалось отправить отзыв. Попробуй позже.';toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},5000);}else status.textContent='Не удалось отправить. Попробуй позже.';return;}
    stop();
    if(answer==='yes')modal.close();
    sending=true;actions.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='';
    try {
      const response=await fetch(`${base}/api/collection-interest`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(answer==='no'?{answer,reason:reason.trim()}:{answer}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();
      if(!response.ok||!['sent','duplicate'].includes(data.status))throw Error();
      modal.close();toast.textContent='Спасибо за отзыв';toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},4500);
    }catch{if(answer==='yes'){toast.textContent='Не удалось отправить отзыв. Попробуй ещё раз.';toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},5000);}else status.textContent='Не удалось отправить. Попробуй ещё раз.';actions.querySelectorAll('button').forEach(b=>b.disabled=false);}
    finally{sending=false;}
  }
  modal.querySelector('.preview-close').addEventListener('click',()=>modal.close());
  modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
  modal.addEventListener('close',()=>{stop();trigger.focus({preventScroll:true});});
  trigger.addEventListener('click',()=>{step=0;finished=false;modal.setAttribute('aria-labelledby','collection-preview-title');modal.classList.remove('is-reason');stage.replaceChildren();render();modal.showModal();schedule();});
}
