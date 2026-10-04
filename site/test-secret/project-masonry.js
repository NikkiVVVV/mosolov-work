// Preserve DOM/keyboard order while placing each next card in the shorter column.
export function createProjectMasonry(grid) {
  let frame=0;
  const observer=new ResizeObserver(schedule);
  function schedule(){if(!frame)frame=requestAnimationFrame(layout);}
  function layout(){
    frame=0;
    if(!grid.clientWidth)return;
    const columns=matchMedia('(max-width:640px), (hover:none) and (pointer:coarse) and (max-height:640px)').matches?1:2;
    const rows=Array(columns).fill(0);
    const cards=[...grid.querySelectorAll('.project-card')].map(card=>({card,height:card.offsetHeight}));
    for(const {card,height} of cards){
      const column=rows.indexOf(Math.min(...rows));
      const span=Math.ceil((height+28)/4);
      const columnValue=String(column+1),rowValue=`${rows[column]+1} / span ${span}`;
      if(card.style.gridColumn!==columnValue)card.style.gridColumn=columnValue;
      if(card.style.gridRow!==rowValue)card.style.gridRow=rowValue;
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
