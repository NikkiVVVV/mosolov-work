import {catalogEN} from './catalog-en.js?v=20261029a';

export const dictionary=new Map(Object.entries({
 'Избранные':'Selected','закладки':'bookmarks','Все':'All','Создать подборку':'Create a collection',
 'Навожу порядок в закладках':'Organizing your bookmarks','Ищу в закладках…':'Searching your bookmarks…',
 'Сайт':'Site','Категория':'Category','Заметка':'Note','Описание':'Description',
 'Анимация':'Animation','Видео':'Video','Инструменты':'Tools','Рефы':'References','Интерактив':'Interactive',
 'Контекст':'Context','Курсор':'Cursor','Медиа':'Media','Наклон':'Tilt','Пасхалки':'Easter eggs','Подборки':'Collections','Скролл':'Scroll',
 'Обратная связь':'Feedback','Наверх':'Back to top','Меню':'Menu','Закрыть меню':'Close menu','ТГ-канал':'Telegram channel','Майонез':'Mayonez',
 'Коллекция':'Collection','Мои':'Mine','Из коллекции':'From the collection','Из интернета':'From the web',
 'Опишите сайт, который ищете':'Describe the site you’re looking for','Необычная типографика':'Unusual typography',
 'Что ещё найти?':'What else can I find?','Очистить поиск':'Clear search','Найти сайты':'Find sites',
 'Сайты с необычной типографикой':'Sites with unusual typography','Референсы с интересной анимацией':'Interesting animation references',
 'Инструменты для работы с 3D':'Tools for working with 3D','Инструменты для 3D':'Tools for 3D','Референсы с анимацией':'Animation references',
 'Ничего не нашёл. Попробуй другое слово или название сайта.':'No matches. Try another word or a site name.',
 'Ничего не найдено. Попробуйте другое слово или фильтр.':'No matches. Try another word or filter.',
 'Загрузка…':'Loading…','Не удалось загрузить ссылки. Обновите страницу.':'Could not load the bookmarks. Refresh the page.',
 'Поиск остановлен. Найденные совпадения сохранены.':'Search stopped. Your matches have been kept.',
 'Повторить AI-поиск':'Retry AI search','AI не успел ответить.':'AI search timed out.',
 'Совпадения по словам остаются ниже.':'Keyword matches are still available below.',
 'По словам совпадений нет. Попробуй более короткий запрос.':'No keyword matches. Try a shorter query.',
 'Пейволлы':'Paywalls','Страницы тарифов':'Pricing pages','С поддержкой кириллицы':'With Cyrillic support','Бесплатные шрифты':'Free fonts',
 'Анимация интерфейсов':'Interface animation','Библиотеки анимации':'Animation libraries','3D в браузере':'3D in the browser',
 'Бесплатные 3D-инструменты':'Free 3D tools','Готовые палитры':'Color palettes','Проверка контраста':'Contrast check',
 'SVG-иконки':'SVG icons','Бесплатные наборы иконок':'Free icon sets','Бесплатные фотографии':'Free photos','Редакторы изображений':'Image editors',
 'Примеры интерфейсов':'Interface examples','Инструменты для дизайна':'Design tools','Покажи инструменты':'Show tools','Покажи примеры':'Show examples',
 'Наведи порядок':'Organize','в своих закладках':'your bookmarks',
 'Добавим описания и теги, сгруппируем сайты по смыслу — чтобы нужное легко находилось.':'Add descriptions and tags, and group sites by topic so they’re easy to find.',
 'Закладки Chrome':'Chrome bookmarks','Закладки из Chrome':'Bookmarks from Chrome','Скачать закладки':'Export bookmarks',
 'Перетащи файл закладок':'Drop your bookmarks file','Перетащите файл закладок':'Drop your bookmarks file','Выбрать файл':'Choose a file',
 'Анализирую закладки':'Analyzing bookmarks','Группирую':'Grouping sites','Готовлю описание':'Writing descriptions','Готово':'Done',
 'Шрифтовые пары':'Font pairings','Шрифты':'Fonts','Готовые сочетания шрифтов':'Ready-made font pairings',
 'Подбор шрифтовых пар':'Find font pairings','Шрифтовые сочетания на реальных сайтах':'Font pairings from real websites',
 'типографика · подборки':'typography · collections','типографика · генератор':'typography · generator','типографика · референсы':'typography · references',
 'Не пригодится':'Not for me','Мне пригодится':'I’d use this','Почему не пригодится?':'Why isn’t this useful for you?',
 'Расскажи своими словами. Необязательно.':'Tell us in your own words. Optional.','Закрыть':'Close','Отправить':'Send',
 'Спасибо за отзыв':'Thanks for your feedback','Не удалось отправить. Попробуй позже.':'Could not send. Try again later.',
 'Не удалось отправить отзыв. Попробуй позже.':'Could not send your feedback. Try again later.',
 'Не удалось отправить отзыв. Попробуй ещё раз.':'Could not send your feedback. Please try again.',
 'Не удалось отправить. Попробуй ещё раз.':'Could not send. Please try again.',
 'Добавить файл':'Add a file','Продолжить разметку':'Resume processing','Готовлю библиотеку':'Preparing your library',
 'Размечаю закладки':'Organizing bookmarks','Библиотека готова':'Your library is ready','Разметка приостановлена':'Processing paused',
 'Читаю файл…':'Reading the file…','Максимум 10 МБ.':'Maximum file size: 10 MB.','Максимум 5000 закладок в библиотеке.':'A library can contain up to 5,000 bookmarks.',
 'Не удалось прочитать сохранённую библиотеку.':'Could not read your saved library.',
 'Сервер временно недоступен.':'The server is temporarily unavailable.','Не удалось прочитать страницу.':'Could not read the page.',
 'Сервер вернул неполную разметку.':'The server returned incomplete metadata.','Страница отвечает слишком долго.':'The page is taking too long to respond.',
 'Не хватило места в браузере. Файл не импортирован.':'Not enough browser storage. The file was not imported.',
 'В браузере не хватило места. Не закрывайте страницу: библиотека пока не сохранена.':'Not enough browser storage. Keep this page open: your library has not been saved.',
 'HTML из Chrome: Диспетчер закладок → ⋮ → Экспорт. Можно вставить файл через ⌘V.':'Chrome HTML: Bookmark Manager → ⋮ → Export. You can also paste the file with ⌘V.',
 'Поиск по закладкам':'Search bookmarks','Сохранённые сайты':'Saved sites','Закрыть чат':'Close chat','История поиска':'Search history',
 'Мобильная навигация':'Navigation','Выбор библиотеки':'Choose a library','Где искать':'Search scope','Фильтры':'Filters',
 'Загрузка закладок':'Loading bookmarks','Закрыть анонс':'Close preview','Как работает личная коллекция':'How your personal collection works',
 'Прогресс разметки':'Processing progress','Закладки, таблица с горизонтальной прокруткой':'Bookmarks, horizontally scrollable table',
 'Найденные ссылки, таблица с горизонтальной прокруткой':'Search results, horizontally scrollable table','Найденные ссылки':'Search results'
}));
let language='ru';
export const getLanguage=()=>language;
export function translateText(text,lang=language){
 if(lang==='ru')return text;
 const trimmed=text.trim();
 let translated=dictionary.get(trimmed);
 if(!translated && /^Нашёл ссылок: \d+\.$/.test(trimmed))translated=`Found ${trimmed.match(/\d+/)[0]} sites.`;
 if(!translated && /^Поиск: /.test(trimmed))translated=trimmed.replace('Поиск: ','Search: ');
 if(!translated && /^\d+ из \d+ готово/.test(trimmed))translated=trimmed.replace(/(\d+) из (\d+) готово/,'$1 of $2 ready').replace('Не удалось:','Failed:');
 return translated ? text.replace(trimmed,translated) : text;
}
export function registerCatalog(items){
 for(const item of items){
  item.noteEN=catalogEN[item.id]||'';
  if(item.ownerNote && item.noteEN)dictionary.set(item.ownerNote,item.noteEN);
 }
}

export function initI18n(){
 let labelAnimation;
 const originals=new WeakMap();
 const attributes=new WeakMap();
 const attrs=['placeholder','aria-label','title'];
 function text(node){
  if(node.parentElement?.closest('script,style,.chat-question,[data-no-translate]'))return;
  const value=node.nodeValue;
  const old=originals.get(node);
  const ru=old && value===old.last ? old.ru : value;
  const next=translateText(ru);
  originals.set(node,{ru,last:next});
  if(value!==next)node.nodeValue=next;
 }
 function visit(root){
  if(root.nodeType===3){text(root);return;}
  if(root.nodeType!==1 || root.matches('script,style'))return;
  let saved=attributes.get(root);if(!saved){saved={};attributes.set(root,saved);}
  for(const attr of attrs){
   if(!root.hasAttribute(attr))continue;
   const value=root.getAttribute(attr),old=saved[attr];
   const ru=old&&value===old.last?old.ru:value,next=translateText(ru);
   saved[attr]={ru,last:next};if(value!==next)root.setAttribute(attr,next);
  }
  for(const child of root.childNodes)visit(child);
 }
 const toggle=document.createElement('button');toggle.type='button';toggle.id='language-toggle';toggle.className='links-bar-icon language-switch';toggle.dataset.noTranslate='true';
 toggle.innerHTML='<span>EN</span>';
 document.querySelector('.links-mobile-bar').append(toggle);
 function apply(lang){
  language=lang;document.documentElement.lang=lang;
  document.title=lang==='ru'?'Избранные закладки — Nikita Mosolov':'Selected bookmarks — Nikita Mosolov';
  toggle.lang=lang==='ru'?'en':'ru';
  toggle.querySelector('span').textContent=lang==='ru'?'EN':'RU';
  toggle.setAttribute('aria-label',lang==='ru'?'Switch to English':'Переключить на русский');
  visit(document.body);
 }
 toggle.addEventListener('click',()=>{
  labelAnimation?.cancel();
  apply(language==='ru'?'en':'ru');
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)labelAnimation=toggle.querySelector('span').animate([
   {opacity:0,transform:'translateY(6px) rotateX(-70deg)'},
   {opacity:1,transform:'translateY(-2px) rotateX(8deg)',offset:.7},
   {opacity:1,transform:'translateY(0) rotateX(0)'}
  ],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
 });
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='childList')record.addedNodes.forEach(visit);
   else visit(record.target);
  }
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});
 apply('ru');
}
