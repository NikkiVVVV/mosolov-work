import { initSearchG2 } from './search-g2.js?v=20261016r';
import { initPersonalLibrary } from './personal-library-v2.js?v=20261016b';
import { initSearchDiscovery } from './search-discovery.js?v=20261016q';
import { createTabGroup } from './tab-group.js';
import { replyOrb } from './reply-orb.js';
import { siteCard, quickReplies } from './site-card.js?v=20261016q';
import { initSearchMotion } from './search-motion.js?v=195';
import { siteMonogram } from './site-icon.js';
import { mergeResults, keywordSearchMessage, compareSiteNames } from './search-results.js?v=221';

initSearchG2();
const $ = selector => document.querySelector(selector);
const list = $('#bookmark-list');
const filters = $('#filters');
const tabGroup = createTabGroup(filters, value => {
  state.filter = value;
  render();
});
const queryInput = $('#search');
const form = $('#search-form');
initSearchDiscovery(form);
const apiBase = document.documentElement.dataset.apiBase || '';
const notifyBase = document.documentElement.dataset.notifyBase || '';
const status = $('#list-status');
const state = { items: [], icons: {}, filter: 'all', query: '', loaded: false, chatting: false, aiEnabled: false, history: [] };
let personalItems = null;
let publicItems = [];
let library = 'public';
let publicAIEnabled = false;
function selectLibrary(next) {
  cancelPendingSearch();
  library = next;
  state.items = library === 'personal' ? (personalItems || []) : publicItems;
  state.aiEnabled = library === 'public' && publicAIEnabled;
  state.filter = 'all';
  state.history = [];
  chat.replaceChildren();
  queryInput.value = '';

  document.body.dataset.library = library;
  $('#personal-library').hidden = library !== 'personal';
  const empty = library === 'personal' && !state.items.length;
  form.hidden = empty;
  filters.hidden = empty;
  $('#catalog > .table-wrap').hidden = empty;
  document.querySelectorAll('.library-tabs button[data-library]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.library === library)));
  positionLibraryHighlight();
  if (state.loaded) render();
  renderForm();
}
document.querySelector('.library-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-library]');
  if (button) selectLibrary(button.dataset.library);
});
function positionLibraryHighlight() {
  if (document.querySelector('.library-tabs').hidden) return;
  const active = document.querySelector('.library-tabs button[aria-pressed="true"]');
  const highlight = document.querySelector('.library-highlight');
  highlight.style.width = `${active.offsetWidth}px`;
  highlight.style.transform = `translateX(${active.offsetLeft}px)`;
}
requestAnimationFrame(positionLibraryHighlight);
document.fonts.ready.then(positionLibraryHighlight);
window.addEventListener('resize', positionLibraryHighlight);
const chat = $('#chat');
const modal = $('#chat-modal');
const formHome = document.createComment('search-form-home');
form.before(formHome);
let pendingSearch = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
initSearchMotion($('#search-wave'), form, queryInput);
const stopwords = new Set([
  'тот', 'та', 'то', 'те', 'самый', 'был', 'была', 'было', 'есть', 'который', 'которые',
  'с', 'со', 'и', 'а', 'в', 'во', 'на', 'для', 'по', 'из', 'про', 'как', 'где', 'найди', 'найти', 'покажи', 'мне',
  'сайт', 'сайты', 'сайтов', 'сайта', 'find', 'show', 'me', 'the', 'a', 'an', 'with', 'for', 'and', 'websites', 'sites'
]);

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const normalize = value => String(value ?? '').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const stem = word => /^[а-я]+$/.test(word) && word.length > 5 ? word.slice(0, 5) : word;
const wordsFor = query => {
  const words = normalize(query).split(/\s+/).filter(word => word && !stopwords.has(word));
  return words.length ? words : [normalize(query)].filter(Boolean);
};
const isReady = item => ['ready', 'curated'].includes(item.reviewHint) && item.privacyHint !== 'restricted';
const isVisible = item => item.status !== 'hidden';
const displayTitle = item => item.bookmarkTitle || item.title || item.pageTitle || item.bookmarkTitles?.[0] || item.domain;
const cleanDomain = domain => String(domain || '').replace(/^www\./, '');

function categoryIds(item) {
  const text = normalize([
    ...(item.folderPaths || []),
    ...(item.tags || []),
    ...(item.figmaCategories || [])
  ].join(' '));
  const ids = new Set();
  if (/(реф|референс|reference)/.test(text) || item.tags?.length) ids.add('refs');
  if (text.includes('дизайн')) ids.add('design');
  if (text.includes('инструмент')) ids.add('tools');
  if (text.includes('медиа')) ids.add('media');
  if (/(^|\s)(ai|ии)(\s|$)/.test(text)) ids.add('ai');
  return ids;
}

function displayType(item) {
  if (item.tags?.length) return item.tags[0];
  const categories = categoryIds(item);
  if (categories.has('tools')) return 'Инструмент';
  if (categories.has('media')) return 'Медиа';
  if (categories.has('ai')) return 'AI';
  if (categories.has('refs')) return 'Референс';
  if (categories.has('design')) return 'Дизайн';
  return 'Сайт';
}

function matchesFilter(item, filter = state.filter) {
  if (!isReady(item) || !isVisible(item)) return false;
  if (filter === 'all') return true;
  return categoryLabel(item) === filter;
}

function searchScore(item, query) {
  const words = wordsFor(query);
  if (!words.length) return 1;
  const fields = [
    [item.ownerNote, 9],
    [item.aiNote, 8],
    [item.aiCategory, 8],
    [(item.aiTags || []).join(' '), 8],
    [(item.tags || []).join(' '), 8],
    [displayTitle(item), 7],
    [(item.bookmarkTitles || []).join(' '), 6],
    [item.domain, 5],
    [item.pageTitle, 4],
    [(item.folderPaths || []).join(' '), 3],
    [item.description, 3],
    [item.excerpt, 1]
  ].map(([value, weight]) => [normalize(value), weight]);
  const wordScores = words.map(word => {
    const needle = stem(word);
    return fields.reduce((sum, [text, weight]) => sum + (text.includes(needle) ? weight : 0), 0);
  });
  return wordScores.every(Boolean) ? wordScores.reduce((sum, score) => sum + score, 0) : 0;
}

function filteredItems() {
  const selected = state.items.filter(item => matchesFilter(item));
  if (!state.query) return selected.sort(compareSiteNames);
  return selected
    .map((item, index) => ({ item, index, score: searchScore(item, state.query) }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || compareSiteNames(left.item, right.item) || left.index - right.index)
    .map(result => result.item);
}


const shortCategories = {
  'Анимация': 'Анимация',
  'Видео': 'Видео',
  'Звуки и хаптики': 'Звук',
  'Скролл': 'Скролл',
  'Акселерометр или гироскоп': 'Наклон',
  'Интерактивы': 'Интерактив',
  'Курсор': 'Курсор',
  'Контекст реального мира': 'Контекст',
  'ПАСХАЛКИ И приколы': 'Пасхалки',
  'Базовые места вдохновения': 'Подборки'
};

function categoryLabel(item) {
  if (item.privacyHint === 'personal') return item.aiCategory || 'Без категории';
  if (['Рефы', 'Инструменты', 'Медиа', 'AI', 'Дизайн'].includes(item.tags?.[0])) return item.tags[0];
  return shortCategories[item.tags?.[0]] || ({
    'Референс': 'Рефы', 'Инструмент': 'Инструменты'
  }[displayType(item)] || (item.tags?.length ? 'Рефы' : displayType(item)));
}

function row(item) {
  // A domain identifies the site without repeating a note or its SEO page title.
  const title = cleanDomain(item.domain);
  const note = (item.privacyHint === 'personal' ? [item.ownerNote,item.aiNote || item.description].filter(Boolean).join(' · ') : item.ownerNote || '').replace('Перетекание одной гонки в другую.', 'Перетекание одной в другую.');
  const icon = state.icons[item.domain];
  const monogram = siteMonogram(item.domain);
  const favicon = `<span class="site-icon${icon ? ' has-icon' : ''}" style="--icon-color:${monogram.color}" aria-hidden="true"><span class="site-monogram">${escapeHTML(monogram.letters)}</span>${icon ? `<img src="${escapeHTML(icon)}" alt="" width="20" height="20" loading="lazy">` : ''}</span>`;
  const pending = item.privacyHint === 'personal' && ['pending','processing'].includes(item.annotationStatus) && !item.aiNote;
  const category = pending ? '<span class="annotation-skeleton short" aria-label="Категория определяется"></span>' : escapeHTML(categoryLabel(item));
  const details = pending ? '<span class="annotation-skeleton" aria-label="Описание готовится"></span><span class="annotation-skeleton medium" aria-hidden="true"></span>' : `${escapeHTML(note)}${item.privacyHint === 'personal' ? `<span class="bookmark-tags">${(item.aiTags || []).map(escapeHTML).join(' · ')}</span>${item.annotationStatus === 'error' ? `<span class="annotation-error">${escapeHTML(item.annotationError || 'Не удалось разметить')}</span>` : ''}` : ''}`;
  return `<tr><td><a class="site-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}">${favicon}<span>${escapeHTML(title)}</span></a></td><td>${category}</td><td>${details}</td></tr>`;
}

function resultTable(body, loading = false) {
  return `<div class="table-wrap${loading ? ' loading-table' : ''}"${loading ? ' aria-hidden="true"' : ' tabindex="0" role="region" aria-label="Найденные ссылки, таблица с горизонтальной прокруткой"'}><table><caption class="sr-only">Найденные ссылки</caption><colgroup><col class="site-column"><col class="category-column"><col></colgroup><thead><tr><th scope="col">Сайт</th><th scope="col">Категория</th><th scope="col">Заметка</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function assistantReply(message, {loading = false, retry = false, sources = ''} = {}) {
  return `<div class="assistant-message"><div class="assistant-bubble"><p class="chat-response">${escapeHTML(message)}</p>${loading ? '<p class="search-loading-label" role="status"><span class="loading-dot" aria-hidden="true"></span>Ищу по смыслу…</p>' : ''}${sources ? `<p class="search-sources">${escapeHTML(sources)}</p>` : ''}${retry ? '<button class="retry-search" type="button">Повторить AI-поиск</button>' : ''}</div></div>`;
}

function showAnswer(answer, message, items, options = {}) {
  if(!answer.querySelector('.assistant-message')) {
    answer.innerHTML=assistantReply(message,options)+'<div class="chat-site-results"></div><div class="chat-quick-replies"></div>';
    answer.querySelector('.assistant-message').insertAdjacentHTML('afterbegin',replyOrb());
  } else {
    const template=document.createElement('template');template.innerHTML=assistantReply(message,options);
    answer.querySelector('.assistant-bubble').replaceWith(template.content.querySelector('.assistant-bubble'));
  }
  answer.querySelector('.chat-site-results').innerHTML=items.map(item=>siteCard({url:item.url,title:cleanDomain(item.domain),category:categoryLabel(item),note:item.ownerNote||item.aiNote||item.description,source:'Из коллекции',icon:state.icons[item.domain]||state.icons['www.'+item.domain]})).join('');
  answer.querySelector('.chat-quick-replies').replaceChildren();
}

function showQuickReplies(answer,query) {
  const container=answer.querySelector('.chat-quick-replies');
  for(const item of [...quickReplies(query),{label:'Найти в интернете',query,web:true}]) {
    const button=document.createElement('button');button.type='button';button.textContent=item.label;
    button.addEventListener('click',()=>{queryInput.value=item.query;form.dataset.webSearch=String(Boolean(item.web));form.requestSubmit();});
    container.append(button);
  }
}

function cancelPendingSearch() {
  if (!pendingSearch) return;
  pendingSearch.controller?.abort();
  pendingSearch.answer.setAttribute('aria-busy', 'false');
  clearTimeout(pendingSearch.slowTimer);
  showAnswer(pendingSearch.answer, 'AI-поиск остановлен. Совпадения по словам сохранены.', pendingSearch.keyword);
  pendingSearch = null;
}

async function answerQuery(query, answer, history, keyword, web = false) {
  if (!state.aiEnabled) {
    answer.setAttribute('aria-busy', 'true');
    showAnswer(answer, 'Ищу…', []);
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (!answer.isConnected) return;
    answer.setAttribute('aria-busy', 'false');
    showAnswer(answer, keywordSearchMessage(keyword.length), keyword);
    showQuickReplies(answer,query);
    return;
  }
  const controller = new AbortController();
  const job = {controller, answer, keyword};
  pendingSearch = job;
  answer.setAttribute('aria-busy', 'true');
  showAnswer(answer, keyword.length ? `По словам уже нашёл ${keyword.length}. Проверяю, что ещё подходит по смыслу.` : 'Ищу подходящие сайты в твоих закладках.', keyword, {loading: state.aiEnabled});
  let timeout;
  try {
    if (state.aiEnabled) {
      timeout = setTimeout(() => controller.abort('timeout'), 45000);
      job.slowTimer = setTimeout(() => {
        if (pendingSearch === job) showAnswer(answer, 'AI отвечает дольше обычного. Продолжаю искать; совпадения по словам уже доступны.', keyword, {loading:true});
      }, 8000);
      const response = await fetch(`${apiBase}/api/search`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({query, history, web}), signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI-поиск недоступен.');
      if (pendingSearch !== job) return;
      if (!Array.isArray(data.ids) || typeof data.message !== 'string') throw new Error('Некорректный ответ поиска.');
      const itemsById = new Map(state.items.map(item => [item.id, item]));
      const semantic = [...new Set(data.ids)].map(id => itemsById.get(id)).filter(item => item && isReady(item) && isVisible(item));
      const items = mergeResults(semantic, keyword);
      showAnswer(answer, data.message, items);
      const external = (Array.isArray(data.external) ? data.external : []).filter(item => {
        try {const u=new URL(item.url);return u.protocol==='https:'&&!u.username&&!u.password&&!items.some(x=>x.url===item.url);}catch{return false;}
      }).slice(0,3);
      if(external.length) answer.querySelector('.chat-site-results').insertAdjacentHTML('beforeend',external.map(item=>siteCard({url:item.url,title:cleanDomain(new URL(item.url).hostname),category:item.category||'Медиа',note:item.description||item.title,source:'Из интернета'})).join(''));
      else if(data.webStatus === 'unavailable' || data.webStatus === 'limit') answer.insertAdjacentHTML('beforeend','<p class="search-sources">Веб-поиск сейчас недоступен. Выше — результаты из коллекции.</p>');
      if (data.intent !== 'offtopic') state.history = [...history, query].slice(-4);
      if(data.intent!=='offtopic')showQuickReplies(answer,query);
    }
  } catch (error) {
    if (pendingSearch !== job) return;
    const notice = controller.signal.aborted ? 'AI не успел ответить.' : error.message;
    showAnswer(answer, `${notice} ${keyword.length ? 'Совпадения по словам остаются ниже.' : 'По словам совпадений нет. Попробуй более короткий запрос.'}`, keyword, {retry:true});
    showQuickReplies(answer,query);
    answer.querySelector('.retry-search').addEventListener('click', () => {
      cancelPendingSearch();
      answerQuery(query, answer, history, keyword, web);
    }, {once:true});
  } finally {
    clearTimeout(timeout);
    clearTimeout(job.slowTimer);
    if (pendingSearch === job) {
      answer.setAttribute('aria-busy', 'false');
      pendingSearch = null;
    }
  }
}

function renderForm() {
  const hasQuery = Boolean(queryInput.value.trim());
  $('#clear-search').hidden = !hasQuery;
  $('.submit-search').disabled = !hasQuery || !state.loaded;
  form.classList.toggle('has-query', hasQuery);
}

function render() {
  renderForm();
  const categories=[...new Set(state.items.filter(item=>isReady(item)&&isVisible(item)&&!(item.privacyHint==='personal'&&!item.aiCategory)).map(categoryLabel))];
  const categoryOrder = ['Анимация', 'Видео', 'Инструменты', 'Рефы', 'Интерактив', 'Контекст', 'Курсор', 'Медиа', 'AI', 'Наклон', 'Пасхалки', 'Подборки', 'Скролл'];
  const rank = label => categoryOrder.includes(label) ? categoryOrder.indexOf(label) : categoryOrder.length;
  const filterOptions=[{id:'all',label:'Все'},...categories.sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b,'ru')).map(label=>({id:label,label}))];
  tabGroup.render(filterOptions, state.filter);
  const items = filteredItems();
  list.innerHTML = items.map(row).join('');
  status.textContent = items.length ? '' : 'Ничего не найдено. Попробуйте другое слово или фильтр.';
  status.hidden = items.length > 0 || (library === 'personal' && !state.items.length);
}

function resetSearch() {
  state.query = '';
  queryInput.value = '';
  render();
  queryInput.focus();
}

function closeChat() {
  if (!modal.open) return;
  cancelPendingSearch();
  modal.close();
}

modal.addEventListener('close', () => {
  state.chatting = false;
  document.body.classList.remove('chat-mode');
  formHome.after(form);
  state.query = '';
  queryInput.value = '';
  queryInput.placeholder = 'Необычная типографика';
  render();
  queryInput.focus({preventScroll: true});
});
modal.addEventListener('cancel', event => {
  event.preventDefault();
  closeChat();
});
$('#close-chat').addEventListener('click', closeChat);
modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const bounds = modal.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeChat();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!queryInput.value.trim() || !state.loaded) return;
  cancelPendingSearch();
  state.query = queryInput.value.trim();
  const query = state.query;
  const firstTurn = !state.chatting;
  state.chatting = true;
  document.body.classList.add('chat-mode');
  if (firstTurn) {
    $('#chat-composer').append(form);
    modal.showModal();
  }
  const turn = document.createElement('section');
  turn.className = 'chat-turn';
  turn.setAttribute('aria-label', `Поиск: ${state.query}`);
  turn.innerHTML = `<p class="chat-question">${escapeHTML(query)}</p><div class="chat-answer" aria-busy="true"></div>`;
  chat.append(turn);
  const answer = turn.querySelector('.chat-answer');
  const keyword = state.items.filter(item => isReady(item) && isVisible(item))
    .map(item => ({item, score: searchScore(item, query)})).filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || compareSiteNames(a.item, b.item)).map(result => result.item);
  const web=form.dataset.webSearch==='true';
  delete form.dataset.webSearch;
  answerQuery(query, answer, [...state.history], keyword, web);
  if (notifyBase && library === 'public') {
    // Best effort: no retries, no cookies and no dependency of search on Telegram.
    fetch(`${notifyBase}/api/query-event`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'omit',
      body: JSON.stringify({query, resultCount: keyword.length}), signal: AbortSignal.timeout(8000)
    }).catch(() => {});
  }
  queryInput.value = '';
  queryInput.placeholder = 'Что ещё найти?';
  renderForm();
  // Keep the question and the first results visible, even for a long answer.
  chat.scrollTo({ top: Math.max(0, turn.offsetTop - chat.offsetTop - 16), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  queryInput.focus({ preventScroll: true });
});
queryInput.addEventListener('input', () => {
  renderForm();
});
queryInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});
$('#clear-search').addEventListener('click', () => {
  queryInput.value = '';
  renderForm();
  queryInput.focus();
});


async function loadBookmarks() {
  document.body.classList.add('catalog-loading');
  $('#catalog').setAttribute('aria-busy','true');
  list.innerHTML = Array.from({length:6},()=>'<tr aria-hidden="true"><td><span class="annotation-skeleton"></span></td><td><span class="annotation-skeleton short"></span></td><td><span class="annotation-skeleton"></span><span class="annotation-skeleton medium"></span></td></tr>').join('');
  status.textContent = 'Загрузка…';
  status.hidden = false;
  try {
    const response = await fetch(document.documentElement.dataset.catalog || '/api/bookmarks', { cache: 'no-store' });
    if (!response.ok) throw new Error('Каталог недоступен');
    publicItems = (await response.json()).items || [];
    state.items = library === 'personal' ? (personalItems || []) : publicItems;
    state.icons = await fetch('./favicons/manifest.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    if (!document.documentElement.dataset.catalog || apiBase) {
      state.aiEnabled = await fetch(`${apiBase}/api/health`, {cache:'no-store', signal:AbortSignal.timeout(5000)}).then(r => r.json()).then(data => data.aiSearch === true).catch(() => false);
    }
    publicAIEnabled = state.aiEnabled;
    if (library === 'personal') state.aiEnabled = false;
    state.loaded = true;
    render();
    document.body.classList.add('catalog-ready');
  } catch {
    status.textContent = 'Не удалось загрузить ссылки. Обновите страницу.';
    status.hidden = false;
    list.replaceChildren();
  } finally {
    document.body.classList.remove('catalog-loading');
    $('#catalog').setAttribute('aria-busy','false');
  }
}
renderForm();
initPersonalLibrary({onChange(items, {activate = false} = {}) {
  personalItems = items;
  if (state.loaded && (activate || library === 'personal')) {
    if (activate) selectLibrary('personal');
    else {state.items = items; render();}
  }
}});
loadBookmarks();
document.addEventListener('error', event => {
  if (event.target.matches?.('.site-icon img')) {
    event.target.parentElement.classList.remove('has-icon');
    event.target.remove();
  }
}, true);
