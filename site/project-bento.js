// Pair similar proportions in two equal columns, preserving uncropped media.
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
  return {refresh(category){
    const items=[...grid.querySelectorAll('.project-card')].map((card,index)=>{
      const parts=card.querySelector('.project-cover').style.aspectRatio.split('/').map(Number);
      const ratio=parts.length===2 && parts[1]>0 ? parts[0]/parts[1] : 1;
      card.style.order=String(index);
      return {id:card.dataset.projectId,card,ratio,wide:card.classList.contains('project-card-wide'),index};
    });
    if(category==='work'){
      const rows=planWork(items).map(items=>{
        const row=document.createElement('div');row.className='project-row';
        if(items.some(item=>item.id==='04')&&items.some(item=>item.id==='18'))row.classList.add('project-tools-pair');
        row.style.gridTemplateColumns=`repeat(${items.length}, minmax(0, 1fr))`;
        row.append(...items.map(item=>item.card));return row;
      });
      grid.replaceChildren(...rows);return;
    }
    if(category==='pet'&&['07','21','10'].every(id=>items.some(item=>item.id===id))){
      const ids=new Set(['07','21','10']);
      const rows=planBento(items.filter(item=>!ids.has(item.id))).map(items=>{
        const row=document.createElement('div');row.className='project-row';
        row.style.gridTemplateColumns=`repeat(${items.length}, minmax(0, 1fr))`;
        row.append(...items.map(item=>item.card));return row;
      });
      const trio=document.createElement('div');trio.className='project-pet-trio';
      const stack=document.createElement('div');stack.className='project-pet-stack';
      stack.append(...['21','10'].map(id=>items.find(item=>item.id===id).card));
      const bag=items.find(item=>item.id==='07').card;stack.style.order='1';
      trio.append(bag,stack);
      grid.replaceChildren(...rows,trio);return;
    }
    const {opening,remaining:afterOpening}=partitionOpening(items);
    const {showcase,remaining:afterShowcase}=partitionShowcase(afterOpening);
    const {tools,remaining}=partitionTools(afterShowcase);
    const blocks=[];
    if(opening.length){
      const group=document.createElement('div');group.className='project-opening';group.style.order='-2';
      for(const [side,ids] of [['left',['01','07']],['right',['11','19']]]){
        const column=document.createElement('div');column.className=`project-opening-column project-opening-${side}`;
        column.append(...ids.map(id=>opening.find(item=>item.id===id).card));group.append(column);
      }
      blocks.push(group);
    }
    if(showcase.length){
      const group=document.createElement('div');group.className='project-showcase';group.style.order='-1';
      const talk=showcase.find(item=>item.id==='16').card;
      const trio=document.createElement('div');trio.className='project-showcase-trio';trio.style.order=String(showcase.find(item=>item.id==='21').index);
      const stack=document.createElement('div');stack.className='project-showcase-stack';stack.style.order=String(showcase.find(item=>item.id==='10').index);
      stack.append(...['10','20'].map(id=>showcase.find(item=>item.id===id).card));
      trio.append(showcase.find(item=>item.id==='21').card,stack);
      group.append(talk,trio);blocks.push(group);
    }
    if(tools.length){
      const group=document.createElement('div');group.className='project-tools';group.style.order=String(tools[0].index);
      const pair=document.createElement('div');pair.className='project-tools-pair';pair.style.order=String(tools[1].index);
      pair.append(...tools.slice(1,3).map(item=>item.card));
      group.append(tools[0].card,pair,tools[3].card);blocks.push(group);
    }
    const rows=planBento(remaining).map(items=>{
      const row=document.createElement('div');row.className='project-row';
      row.style.order=String(items[0].index);
      row.style.gridTemplateColumns=`repeat(${items.length}, minmax(0, 1fr))`;
      row.append(...items.map(item=>item.card));return row;
    });
    grid.replaceChildren(...blocks,...rows);
  }};
}

// Use the authored opening only when all four cases are present (the All tab).
export function partitionOpening(items){
  const ids=['01','11','07','19'];
  if(!ids.every(id=>items.some(item=>item.id===id)))return {opening:[],remaining:items};
  return {opening:ids.map(id=>items.find(item=>item.id===id)),remaining:items.filter(item=>!ids.includes(item.id))};
}

// Keep the next authored quartet together; category tabs fall back to normal rows.
export function partitionShowcase(items){
  const ids=['16','21','10','20'];
  if(!ids.every(id=>items.some(item=>item.id===id)))return {showcase:[],remaining:items};
  return {showcase:ids.map(id=>items.find(item=>item.id===id)),remaining:items.filter(item=>!ids.includes(item.id))};
}

// Leasing, matching-height search/selection cards, then the full-width plugin.
export function partitionTools(items){
  const ids=['09','04','18','17'];
  if(!ids.every(id=>items.some(item=>item.id===id)))return {tools:[],remaining:items};
  return {tools:ids.map(id=>items.find(item=>item.id===id)),remaining:items.filter(item=>!ids.includes(item.id))};
}

// Work has an explicit sequence; category filtering must not rematch unrelated cases.
export function planWork(items){
 const groups=[['01'],['19','20'],['09'],['04','18'],['17']];
 const used=new Set(groups.flat());
 return [...groups.map(ids=>ids.map(id=>items.find(item=>item.id===id)).filter(Boolean)).filter(row=>row.length),...planBento(items.filter(item=>!used.has(item.id)))];
}
