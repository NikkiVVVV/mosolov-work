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
          const icon=document.createElement('span'); icon.className='workshop-icon'; icon.setAttribute('aria-hidden','true');
          const card=document.createElement('span'); card.className='workshop-icon-card';
          for (const side of ['front','back']) {
            const image=document.createElement('img'); image.className='workshop-icon-face '+side;
            image.src='./assets/workshop-citydrive.png'; image.alt=''; image.width=18; image.height=18; image.draggable=false;
            card.append(image);
          }
          for (const side of ['left','right','top','bottom']) {
            const edge=document.createElement('span'); edge.className='workshop-icon-edge '+side; card.append(edge);
          }
          const gloss=document.createElement('span'); gloss.className='workshop-icon-gloss'; card.append(gloss);
          icon.append(card); button.append(icon);
        }
        button.setAttribute('aria-pressed', String(Array.isArray(selected) ? selected.includes(id) : id === selected));
        return button;
      }));
    }
  };
}
