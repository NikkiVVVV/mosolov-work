const KEY = 'bookmark-personal-library-v1';
export function parseChromeHTML(html) {
  if (html.length > 10_000_000) throw new Error('Файл слишком большой. Максимум 10 МБ.');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const unique = new Map();
  let skipped = 0, duplicates = 0;
  for (const a of doc.querySelectorAll('a[href]')) {
    let url;
    try { url = new URL(a.getAttribute('href')); } catch { skipped++; continue; }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) { skipped++; continue; }
    url.hash = '';
    if (unique.has(url.href)) { duplicates++; continue; }
    const folderPaths = [];
    for (let parent = a.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DL') {
        const heading = parent.previousElementSibling;
        if (heading?.tagName === 'H3') folderPaths.unshift(heading.textContent.trim());
      }
    }
    const dd = a.parentElement?.nextElementSibling;
    const description = dd?.tagName === 'DD' ? dd.textContent.trim() : '';
    unique.set(url.href, {id: url.href, url:url.href, domain:url.hostname,
      title:a.textContent.trim() || url.hostname, bookmarkTitles:[a.textContent.trim()],
      folderPaths, description, ownerNote:'', tags:[], annotationStatus:'pending',
      reviewHint:'curated', privacyHint:'personal', status:'kept'});
  }
  if (!unique.size) throw new Error('Не нашёл HTTP-ссылок. Выберите HTML-экспорт закладок Chrome.');
  if (unique.size > 5000) throw new Error('Пока можно импортировать до 5000 закладок.');
  return {items:[...unique.values()], skipped, duplicates};
}
export function initPersonalLibrary({onChange}) {
  const root = document.querySelector('#personal-library');
  const message = root.querySelector('[role=status]');
  let generation = 0;
  const action = document.createElement('button');
  action.type = 'button'; action.textContent = 'Разметить сайты'; action.hidden = true;
  const consent = document.createElement('label');
  consent.className = 'annotation-consent';
  consent.innerHTML = '<input type="checkbox"> Разрешаю серверу прочитать публичные страницы и передать их текст, URL и название в SiliconFlow для разметки. Личные заметки не передаются.';
  consent.hidden = true;
  message.before(consent, action);
  const persist = () => localStorage.setItem(KEY, JSON.stringify({version:1,items:saved.items}));
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
  if (saved?.version === 1 && Array.isArray(saved.items)) {onChange(saved.items); action.hidden=false;consent.hidden=false;}
  action.addEventListener('click', async () => {
    if (!saved || action.disabled) return;
    if (!consent.querySelector('input').checked) {message.textContent='Для AI-разметки подтвердите передачу данных выше.';return;}
    const run=++generation;
    action.disabled=true;
    let done=0;
    try {
      for (const item of saved.items) {
        if (run!==generation) break;
        if (item.annotationStatus==='ready') continue;
        message.textContent=`Разметка: ${++done}. Всего ссылок: ${saved.items.length}.`;
        try {
          const base=document.documentElement.dataset.annotationBase || '';
          const response=await fetch(`${base}/api/annotate`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:item.url,title:item.title,description:item.description}),signal:AbortSignal.timeout(60000)});
          const data=await response.json();
          if (run!==generation) break;
          if (!response.ok) {
            if ([429,503].includes(response.status)) throw Object.assign(new Error(data.error),{stop:true});
            throw new Error(data.error || 'Ошибка разметки');
          }
          if (typeof data.aiNote!=='string' || !Array.isArray(data.aiTags)) throw new Error('Некорректный ответ сервера');
          Object.assign(item,{aiNote:data.aiNote,aiTags:data.aiTags,annotationStatus:'ready',annotationError:''});
        } catch(error) {
          if (error.stop) throw error;
          item.annotationStatus='error';item.annotationError=error.message;
        }
        persist();onChange(saved.items);
      }
      message.textContent=`Размечено: ${saved.items.filter(x=>x.annotationStatus==='ready').length} из ${saved.items.length}. Остальные можно обработать повторно.`;
    } catch(error) {message.textContent=error.message;}
    finally {action.disabled=false;action.textContent='Продолжить разметку';}
  });
  const input = root.querySelector('input');
  const zone = root.querySelector('.import-dropzone');
  zone.addEventListener('dragover', event => {event.preventDefault();zone.classList.add('drag-over');});
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', event => {
    event.preventDefault();zone.classList.remove('drag-over');
    importFile(event.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => importFile(input.files[0]));
  async function importFile(file) {
    try {
      if (!file) return;
      if (file.size > 10_000_000) throw new Error('Максимум 10 МБ.');
      const result = parseChromeHTML(await file.text());
      if (saved?.items?.length) {
        const existing = new Map(saved.items.map(item => [item.url,item]));
        for (const item of result.items) if (!existing.has(item.url)) existing.set(item.url,item);
        result.items = [...existing.values()];
      }
      localStorage.setItem(KEY, JSON.stringify({version:1,items:result.items}));
      saved = result;
      generation++;
      action.hidden=false;
      consent.hidden=false;
      onChange(result.items);
      message.textContent = `В библиотеке: ${result.items.length}. Дубли: ${result.duplicates}. Пропущено: ${result.skipped}. Нажмите «Разметить сайты».`;
    } catch (error) { message.textContent = error.message; }
    finally { input.value = ''; }
  }
}
