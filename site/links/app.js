import { initSearchMotion } from './search-motion.js';
import { siteMonogram } from './site-icon.js';
import { mergeResults } from './search-results.js';

const $ = selector => document.querySelector(selector);
const list = $('#bookmark-list');
const filters = $('#filters');
const queryInput = $('#search');
const form = $('#search-form');
const apiBase = document.documentElement.dataset.apiBase || '';
const status = $('#list-status');
const filterOptions = [
  { id: 'all', label: 'Все' },
  { id: 'refs', label: 'Рефы' },
  { id: 'design', label: 'Дизайн' },
  { id: 'tools', label: 'Инструменты' },
  { id: 'media', label: 'Медиа' },
  { id: 'ai', label: 'AI' }
];
const state = { items: [], icons: {}, filter: 'all', query: '', loaded: false, chatting: false, aiEnabled: false, history: [] };
const chat = $('#chat');
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
  return categoryIds(item).has(filter);
}

function searchScore(item, query) {
  const words = wordsFor(query);
  if (!words.length) return 1;
  const fields = [
    [item.ownerNote, 9],
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
  if (!state.query) return selected;
  return selected
    .map((item, index) => ({ item, index, score: searchScore(item, state.query) }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
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
  return shortCategories[item.tags?.[0]] || ({
    'Референс': 'Рефы', 'Инструмент': 'Инструменты'
  }[displayType(item)] || (item.tags?.length ? 'Рефы' : displayType(item)));
}

function row(item) {
  // A domain identifies the site without repeating a note or its SEO page title.
  const title = cleanDomain(item.domain);
  const note = (item.ownerNote || '').replace('Перетекание одной гонки в другую.', 'Перетекание одной в другую.');
  const icon = state.icons[item.domain];
  const monogram = siteMonogram(item.domain);
  const favicon = `<span class="site-icon${icon ? ' has-icon' : ''}" style="--icon-color:${monogram.color}" aria-hidden="true"><span class="site-monogram">${escapeHTML(monogram.letters)}</span>${icon ? `<img src="${escapeHTML(icon)}" alt="" width="20" height="20" loading="lazy">` : ''}</span>`;
  const shortTitle = Array.from(title).length > 15 ? Array.from(title).slice(0, 15).join('') + '…' : title;
  return `<tr><td><a class="site-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}">${favicon}<span>${escapeHTML(shortTitle)}</span></a></td><td>${escapeHTML(categoryLabel(item))}</td><td>${escapeHTML(note)}</td></tr>`;
}

function resultTable(body, loading = false) {
  return `<div class="table-wrap${loading ? ' loading-table' : ''}"${loading ? ' aria-hidden="true"' : ' tabindex="0" role="region" aria-label="Найденные ссылки, таблица с горизонтальной прокруткой"'}><table><caption class="sr-only">Найденные ссылки</caption><colgroup><col class="site-column"><col class="category-column"><col></colgroup><thead><tr><th scope="col">Сайт</th><th scope="col">Категория</th><th scope="col">Заметка</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function assistantReply(message, {loading = false, retry = false, sources = ''} = {}) {
  return `<div class="assistant-message"><span class="assistant-label">Поиск по закладкам</span><p class="chat-response">${escapeHTML(message)}</p>${loading ? '<p class="search-loading-label" role="status"><span class="loading-dot" aria-hidden="true"></span>Ищу по смыслу…</p>' : ''}${sources ? `<p class="search-sources">${escapeHTML(sources)}</p>` : ''}${retry ? '<button class="retry-search" type="button">Повторить AI-поиск</button>' : ''}</div>`;
}

function showAnswer(answer, message, items, options = {}) {
  answer.innerHTML = assistantReply(message, options) + (items.length ? resultTable(items.map(row).join('')) : '');
}

function cancelPendingSearch() {
  if (!pendingSearch) return;
  pendingSearch.controller?.abort();
  pendingSearch.answer.setAttribute('aria-busy', 'false');
  clearTimeout(pendingSearch.slowTimer);
  showAnswer(pendingSearch.answer, 'AI-поиск остановлен. Совпадения по словам сохранены.', pendingSearch.keyword);
  pendingSearch = null;
}

async function answerQuery(query, answer, history, keyword) {
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
        body: JSON.stringify({query, history}), signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI-поиск недоступен.');
      if (pendingSearch !== job) return;
      if (!Array.isArray(data.ids) || typeof data.message !== 'string') throw new Error('Некорректный ответ поиска.');
      const itemsById = new Map(state.items.map(item => [item.id, item]));
      const semantic = [...new Set(data.ids)].map(id => itemsById.get(id)).filter(item => item && isReady(item) && isVisible(item));
      const items = mergeResults(semantic, keyword);
      showAnswer(answer, data.message, items, {sources: `По словам: ${keyword.length} · По смыслу: ${semantic.length} · Без повторов: ${items.length}`});
      if (data.intent !== 'offtopic') state.history = [...history, query].slice(-4);
    } else {
      showAnswer(answer, keyword.length ? `Нашёл ${keyword.length} по словам. В этой версии AI пока не подключён.` : 'По словам ничего не нашёл. Попробуй «градиенты», «портфолио» или название сайта. В этой версии AI пока не подключён.', keyword);
    }
  } catch (error) {
    if (pendingSearch !== job) return;
    const notice = controller.signal.aborted ? 'AI не успел ответить.' : error.message;
    showAnswer(answer, `${notice} ${keyword.length ? 'Совпадения по словам остаются ниже.' : 'По словам совпадений нет. Попробуй более короткий запрос.'}`, keyword, {retry:true});
    answer.querySelector('.retry-search').addEventListener('click', () => {
      cancelPendingSearch();
      answerQuery(query, answer, history, keyword);
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
  filters.innerHTML = filterOptions.map(option =>
    `<button class="filter-button" data-filter="${option.id}" type="button" aria-pressed="${state.filter === option.id}">${option.label}</button>`
  ).join('');
  const items = filteredItems();
  list.innerHTML = items.map(row).join('');
  status.textContent = items.length ? '' : 'Ничего не найдено. Попробуйте другое слово или фильтр.';
  status.hidden = items.length > 0;
}

function resetSearch() {
  state.query = '';
  queryInput.value = '';
  render();
  queryInput.focus();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!queryInput.value.trim() || !state.loaded) return;
  const before = form.getBoundingClientRect();
  cancelPendingSearch();
  state.query = queryInput.value.trim();
  state.filter = 'all';
  const query = state.query;
  const firstTurn = !state.chatting;
  state.chatting = true;
  document.body.classList.add('chat-mode');
  $('#catalog').hidden = true;
  $('#back-to-library').hidden = false;
  chat.hidden = false;
  const turn = document.createElement('section');
  turn.className = 'chat-turn';
  turn.setAttribute('aria-label', `Поиск: ${state.query}`);
  turn.innerHTML = `<p class="chat-question">${escapeHTML(query)}</p><div class="chat-answer" aria-busy="true"></div>`;
  chat.append(turn);
  const answer = turn.querySelector('.chat-answer');
  answerQuery(query, answer, [...state.history], filteredItems());
  queryInput.value = '';
  queryInput.placeholder = 'Что ещё найти?';
  renderForm();
  if (firstTurn) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const after = form.getBoundingClientRect();
    if (!reducedMotion.matches) form.animate([
      { transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scaleX(${before.width / after.width})` },
      { transform: 'none' }
    ], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  // Keep the question and the first results visible, even for a long answer.
  chat.scrollTo({ top: turn.offsetTop - chat.offsetTop, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
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
$('#back-to-library').addEventListener('click', () => {
  cancelPendingSearch();
  state.chatting = false;
  state.history = [];
  document.body.classList.remove('chat-mode');
  $('#catalog').hidden = false;
  $('#back-to-library').hidden = true;
  chat.hidden = true;
  chat.replaceChildren();
  queryInput.placeholder = 'Сайты с необычной типографикой';
  resetSearch();
});
$('#clear-search').addEventListener('click', () => {
  queryInput.value = '';
  renderForm();
  queryInput.focus();
});
filters.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  state.filter = button.dataset.filter;
  render();
});

async function loadBookmarks() {
  status.textContent = 'Загрузка…';
  status.hidden = false;
  try {
    const response = await fetch(document.documentElement.dataset.catalog || '/api/bookmarks', { cache: 'no-store' });
    if (!response.ok) throw new Error('Каталог недоступен');
    state.items = (await response.json()).items || [];
    state.icons = await fetch('./favicons/manifest.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    if (!document.documentElement.dataset.catalog || apiBase) {
      state.aiEnabled = await fetch(`${apiBase}/api/health`, {cache:'no-store', signal:AbortSignal.timeout(5000)}).then(r => r.json()).then(data => data.aiSearch === true).catch(() => false);
    }
    state.loaded = true;
    render();
  } catch {
    status.textContent = 'Не удалось загрузить ссылки. Обновите страницу.';
    status.hidden = false;
  }
}
renderForm();
loadBookmarks();
document.addEventListener('error', event => {
  if (event.target.matches?.('.site-icon img')) {
    event.target.parentElement.classList.remove('has-icon');
    event.target.remove();
  }
}, true);
