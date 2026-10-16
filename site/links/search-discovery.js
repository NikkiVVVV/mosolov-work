import { createCollectionTour } from './collection-tour.js?v=20261016q';
export function initSearchDiscovery(form) {
  const modes = document.createElement('div');
  modes.className = 'search-modes';
  modes.setAttribute('role','group');
  modes.setAttribute('aria-label','Где искать');
  modes.innerHTML = '<button type="button" aria-pressed="true">Все</button><button type="button" aria-haspopup="dialog">Моя коллекция</button>';
  form.append(modes);
  createCollectionTour(modes.querySelectorAll('button')[1]);
}
