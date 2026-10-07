/** Content-sized, single-selection category group. */
export function createTabGroup(element, onChange) {
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', 'Категории закладок');
  element.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button || !element.contains(button)) return;
    const value = button.dataset.filter;
    onChange(value);
    [...element.querySelectorAll('button')].find(item => item.dataset.filter === value)?.focus({ preventScroll: true });
  });
  return {
    render(options, selected) {
      element.replaceChildren(...options.map(({ id, label }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'filter-button';
        button.dataset.filter = id;
        button.textContent = label;
        button.setAttribute('aria-pressed', String(id === selected));
        return button;
      }));
    }
  };
}
