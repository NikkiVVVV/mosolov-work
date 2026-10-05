// Stable, deliberately muted placeholders — not official site logos.
const colors = ['#394047', '#414048', '#39443f', '#47413c', '#3c414a', '#464047', '#41443b', '#424344'];
export function siteMonogram(domain) {
  const name = String(domain || '').toLowerCase().replace(/^www\./, '');
  const letters = Array.from(name.split('.')[0].replace(/[^\p{L}\p{N}]/gu, '')).slice(0, 2).join('').toUpperCase() || '·';
  let hash = 0;
  for (const char of name) hash = (Math.imul(hash, 31) + char.codePointAt(0)) >>> 0;
  return {letters, color: colors[hash % colors.length]};
}
