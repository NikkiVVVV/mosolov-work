import { parseChromeHTML } from './personal-library.js';
import { replyOrb } from './reply-orb.js';
const KEY = 'bookmark-personal-library-v1';
const complete = item => item.annotationStatus === 'ready' && Boolean(item.aiCategory);

export function initPersonalLibrary({onChange}) {
  const root = document.querySelector('#personal-library');
  const zone = root.querySelector('.import-dropzone');
  const input = root.querySelector('input[type=file]');
  const message = root.querySelector('[role=status]');
  const progress = document.createElement('div');
  progress.className = 'annotation-progress';
  progress.innerHTML = `${replyOrb()}<div><strong>Готовлю библиотеку</strong><p></p><progress max="1" value="0" aria-label="Прогресс разметки"></progress></div>`;
  const actions = document.createElement('div');
  actions.className = 'library-actions';
  const add = document.createElement('button');
  add.type = 'button'; add.textContent = 'Добавить файл';
  add.addEventListener('click', () => input.click());
  const retry = document.createElement('button');
  retry.type = 'button'; retry.textContent = 'Продолжить разметку';
  actions.append(add, retry);
  message.before(progress, actions);
  let saved = {version:1,items:[]};
  let busy = false;
  let current = '';
  let controller;
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (data?.version === 1 && Array.isArray(data.items)) saved = data;
  } catch { message.textContent = 'Не удалось прочитать сохранённую библиотеку.'; }
  const persist = () => localStorage.setItem(KEY, JSON.stringify(saved));
  function update(activate = false) {
    const total = saved.items.length;
    const ready = saved.items.filter(complete).length;
    const errors = saved.items.filter(x => x.annotationStatus === 'error').length;
    zone.hidden = total > 0;
    actions.hidden = !total;
    progress.hidden = !total;
    retry.hidden = busy || ready === total;
    add.disabled = busy;
    progress.classList.toggle('is-working', busy);
    progress.querySelector('strong').textContent = busy ? 'Размечаю закладки' : ready === total ? 'Библиотека готова' : 'Разметка приостановлена';
    progress.querySelector('p').textContent = `${ready} из ${total} готово${current ? ' · ' + current : ''}${errors ? ' · Не удалось: ' + errors : ''}`;
    progress.querySelector('progress').max = total || 1;
    progress.querySelector('progress').value = ready;
    onChange(saved.items, {activate});
  }
  async function annotate() {
    if (busy || !saved.items.length) return;
    busy = true;
    message.textContent = '';
    update();
    try {
      for (const item of saved.items) {
        if (complete(item)) continue;
        current = item.domain;
        item.annotationStatus = 'processing';
        update();
        controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
          const base = document.documentElement.dataset.annotationBase || '';
          const response = await fetch(`${base}/api/annotate`, {
            method:'POST', credentials:'omit', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({url:item.url,title:item.title,description:item.description}), signal:controller.signal
          });
          const data = await response.json();
          if (!response.ok) {
            if ([429,503].includes(response.status)) throw Object.assign(new Error(data.error || 'Сервер временно недоступен.'), {stop:true});
            throw new Error(data.error || 'Не удалось прочитать страницу.');
          }
          if (typeof data.aiNote !== 'string' || !Array.isArray(data.aiTags) || typeof data.aiCategory !== 'string') throw new Error('Сервер вернул неполную разметку.');
          Object.assign(item, data, {annotationStatus:'ready',annotationError:''});
        } catch (error) {
          item.annotationStatus = error.stop ? 'pending' : 'error';
          item.annotationError = error.name === 'AbortError' ? 'Страница отвечает слишком долго.' : error.message;
          if (error.stop) throw error;
        } finally { clearTimeout(timeout); }
        persist();
        update();
      }
    } catch(error) {
      message.textContent = error.message;
    } finally {
      busy = false; current = '';
      try { persist(); } catch { message.textContent = 'В браузере не хватило места. Не закрывайте страницу: библиотека пока не сохранена.'; }
      update();
    }
  }
  retry.addEventListener('click', annotate);
  async function importFile(file) {
    if (!file || busy) return;
    message.textContent = 'Читаю файл…';
    try {
      if (file.size > 10_000_000) throw new Error('Максимум 10 МБ.');
      const result = parseChromeHTML(await file.text());
      const merged = new Map(saved.items.map(item => [item.url,item]));
      for (const item of result.items) if (!merged.has(item.url)) merged.set(item.url,item);
      if (merged.size > 5000) throw new Error('Максимум 5000 закладок в библиотеке.');
      const previous = saved;
      saved = {version:1,items:[...merged.values()]};
      try { persist(); } catch(error) { saved = previous; throw new Error('Не хватило места в браузере. Файл не импортирован.'); }
      update(true);
      await annotate();
    } catch(error) { message.textContent = error.message; }
    finally { input.value = ''; }
  }
  input.addEventListener('change', () => importFile(input.files[0]));
  zone.addEventListener('dragover', event => {event.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  document.addEventListener('drop', event => {
    if (document.body.dataset.library !== 'personal') return;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    event.preventDefault(); zone.classList.remove('drag-over'); importFile(file);
  });
  document.addEventListener('dragover', event => {
    if (document.body.dataset.library === 'personal' && event.dataTransfer?.types.includes('Files')) event.preventDefault();
  });
  document.addEventListener('paste', event => {
    if (document.body.dataset.library !== 'personal' || event.target.closest('input:not([type=file]),textarea,[contenteditable=true]')) return;
    const file = event.clipboardData?.files?.[0];
    if (!file) return;
    event.preventDefault(); importFile(file);
  });
  update();
}
