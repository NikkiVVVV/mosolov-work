import { replyOrb } from './reply-orb.js';

export function initSearchDiscovery(form) {
  const modes = document.createElement('div');
  modes.className = 'search-modes';
  modes.setAttribute('role','group');
  modes.setAttribute('aria-label','Где искать');
  modes.innerHTML = '<button type="button" aria-pressed="true">Все</button><button type="button" aria-haspopup="dialog">Моя коллекция</button>';
  form.append(modes);
  const modal = document.createElement('dialog');
  modal.className = 'collection-preview';
  modal.setAttribute('aria-labelledby','collection-preview-title');
  modal.innerHTML = `<button class="preview-close" type="button" aria-label="Закрыть анонс">×</button><span class="preview-label">Идея новой функции</span><h2 id="collection-preview-title">Свои закладки.<br>Поиск по смыслу.</h2><p>Загружаешь экспорт из Chrome — AI разбирается, что на каждом сайте, добавляет описания и категории. Потом ищешь своими словами.</p><div class="collection-demo" role="img" aria-label="Демонстрация: HTML-файл превращается в размеченную библиотеку, затем поиск находит сайты"><div class="demo-file">▤ bookmarks.html</div><div class="demo-analysis">${replyOrb()}<span>Разбираю сайты…</span></div><div class="demo-results"><span>Инструменты для 3D</span><div>blender.org <small>3D · Редактор моделей</small></div><div>sketchfab.com <small>3D · Библиотека моделей</small></div></div></div><p class="preview-disclaimer">Это демонстрация. Личную коллекцию пока нельзя создать здесь.</p><h3>Пригодилась бы тебе такая функция?</h3><div class="preview-votes"><button type="button" data-vote="yes">Да, пригодилась бы</button><button type="button" data-vote="no">Пока нет</button></div><p class="preview-status" role="status" aria-live="polite"></p>`;
  document.body.append(modal);
  const close = () => modal.close();
  modal.querySelector('.preview-close').addEventListener('click',close);
  modal.addEventListener('click',event=>{if(event.target===modal)close();});
  modes.querySelectorAll('button')[1].addEventListener('click',()=>modal.showModal());
  modal.addEventListener('close',()=>modes.querySelectorAll('button')[1].focus({preventScroll:true}));
  const base = document.documentElement.dataset.surveyBase;
  const status = modal.querySelector('.preview-status');
  for(const button of modal.querySelectorAll('[data-vote]')) button.addEventListener('click',async()=>{
    if(!base){status.textContent='Отправка опроса пока не подключена. Ответ не сохранён.';return;}
    const buttons=modal.querySelectorAll('[data-vote]');
    buttons.forEach(b=>b.disabled=true);status.textContent='Отправляю…';
    try {
      const response=await fetch(`${base}/api/collection-interest`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({answer:button.dataset.vote}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();
      if(!response.ok||!['sent','duplicate'].includes(data.status))throw Error();
      status.textContent='Спасибо! Ответ отправлен владельцу проекта.';
    }catch{status.textContent='Не удалось отправить. Попробуй ещё раз.';buttons.forEach(b=>b.disabled=false);}
  });
}
