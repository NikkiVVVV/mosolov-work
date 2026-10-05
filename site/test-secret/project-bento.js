// Pair similar proportions so both covers have the same height without cropping.
export function planBento(items) {
  const remaining=[...items], rows=[];
  const small=items.filter(item=>!item.wide);
  const solo=small.length%2 ? small.reduce((best,item)=>item.ratio>best.ratio?item:best,small[0]) : null;
  while(remaining.length){
    const first=remaining.shift();
    if(first.wide || first===solo){rows.push([first]);continue;}
    let best=-1,distance=Infinity;
    remaining.forEach((item,index)=>{
      if(item.wide || item===solo)return;
      const delta=Math.abs(Math.log(item.ratio/first.ratio));
      if(delta<distance){best=index;distance=delta;}
    });
    rows.push(best<0?[first]:[first,remaining.splice(best,1)[0]]);
  }
  return rows;
}
export function createProjectBento(grid) {
  return {refresh(){
    const items=[...grid.querySelectorAll('.project-card')].map((card,index)=>{
      const parts=card.querySelector('.project-cover').style.aspectRatio.split('/').map(Number);
      const ratio=parts.length===2 && parts[1]>0 ? parts[0]/parts[1] : 1;
      card.style.order=String(index);
      return {card,ratio,wide:card.classList.contains('project-card-wide'),index};
    });
    const rows=planBento(items).map(items=>{
      const row=document.createElement('div');row.className='project-row';
      row.style.order=String(items[0].index);
      row.style.gridTemplateColumns=items.map(item=>`${item.ratio}fr`).join(' ');
      row.append(...items.map(item=>item.card));return row;
    });
    grid.replaceChildren(...rows);
  }};
}
