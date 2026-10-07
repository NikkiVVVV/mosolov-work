const siteNameCollator = new Intl.Collator('ru', {sensitivity: 'base', numeric: true});
const siteName = item => String(item.domain || '').replace(/^www\./i, '');

// Sort by the name displayed in the site column, ignoring the www prefix.
export function compareSiteNames(left, right) {
  const featured = item => item.id === '280151956c0ef706' ? 1 : 0;
  return featured(right) - featured(left) || siteNameCollator.compare(siteName(left), siteName(right))
    || siteNameCollator.compare(String(left.url || ''), String(right.url || ''));
}

export function keywordSearchMessage(count) {
  return count > 0
    ? `Нашёл ссылок: ${count}.`
    : 'Ничего не нашёл. Попробуй другое слово или название сайта.';
}

// Keep semantic matches first, but never discard ordinary word matches.
export function mergeResults(semantic, keyword) {
  const seen = new Set();
  return [...semantic, ...keyword].filter(item => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
