// Preserve DOM/keyboard order while placing each next card in the shorter column.
export function createProjectMasonry(grid) {
  let frame=0;
  const observer=new ResizeObserver(schedule);
  function schedule(){if(!frame)frame=requestAnimationFrame(layout);}
  function layout(){
    frame=0;
    if(!grid.clientWidth)return;
    const columns=matchMedia('(max-width:640px)').matches?1:2;
    const rows=Array(columns).fill(0);
    for(const card of grid.querySelectorAll('.project-card')){
      const column=rows.indexOf(Math.min(...rows));
      const span=Math.ceil((card.offsetHeight+28)/4);
      card.style.gridColumn=String(column+1);
      card.style.gridRow=`${rows[column]+1} / span ${span}`;
      rows[column]+=span;
    }
  }
  document.fonts.ready.then(schedule);
  return {refresh(){
    observer.disconnect();observer.observe(grid);
    grid.querySelectorAll('.project-card').forEach(card=>observer.observe(card));
    schedule();
  }};
}
