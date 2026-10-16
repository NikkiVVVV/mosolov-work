const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Both saved and web results use the same visual and URL safety boundary.
export function siteCard({url, title, category, note, source}) {
  let parsed;
  try {parsed = new URL(url);} catch {return '';}
  if (!['https:','http:'].includes(parsed.protocol) || parsed.username || parsed.password) return '';
  return `<article class="result-site-card"><header><a href="${escape(parsed.href)}" target="_blank" rel="noopener noreferrer">${escape(title || parsed.hostname.replace(/^www\./,''))}</a><span class="result-site-category">${escape(category || 'Сайт')}</span></header><p>${escape(note)}</p>${source ? `<span class="result-site-source">${escape(source)}</span>` : ''}</article>`;
}

export function quickReplies(query) {
  const topics = [
    [/шрифт|типограф|font/i, ['С поддержкой кириллицы','Бесплатные шрифты']],
    [/анимац|animation|motion/i, ['Анимация интерфейсов','Библиотеки анимации']],
    [/3d|3д|модел|blender/i, ['3D в браузере','Бесплатные 3D-инструменты']],
    [/цвет|палитр|color/i, ['Готовые палитры','Проверка контраста']],
    [/икон|icon/i, ['SVG-иконки','Бесплатные наборы иконок']],
    [/фото|изображ|photo/i, ['Бесплатные фотографии','Редакторы изображений']],
    [/референс|вдохнов|дизайн|design/i, ['Примеры интерфейсов','Инструменты для дизайна']]
  ];
  const pair=topics.find(([pattern])=>pattern.test(query))?.[1] || ['Покажи инструменты','Покажи примеры'];
  return pair.map(label=>({label,query:`${query}. ${label}`}));
}
