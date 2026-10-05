// Keep semantic matches first, but never discard ordinary word matches.
export function mergeResults(semantic, keyword) {
  const seen = new Set();
  return [...semantic, ...keyword].filter(item => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
