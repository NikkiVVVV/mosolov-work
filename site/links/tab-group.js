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
      element.replaceChildren(...options.map(({ id, label, featured }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'filter-button';
        button.dataset.filter = id;
        button.textContent = label;
        if (featured) {
          button.classList.add('workshop-filter');
          const star=document.createElement('span'); star.className='workshop-spark'; star.textContent='✦'; star.setAttribute('aria-hidden','true'); button.append(star);
        }
        button.setAttribute('aria-pressed', String(Array.isArray(selected) ? selected.includes(id) : id === selected));
        return button;
      }));
    }
  };
}
