import { projects } from './projects.js?v=alive17';
import { features } from './features.js';

const ProjectSphere = features.panorama ? (await import('./sphere.js')).ProjectSphere : null;

const grid = document.querySelector('#grid');
const panel = document.querySelector('#sphere-panel');
const dialog = document.querySelector('#project-preview');
const contactDialog=document.querySelector('#contact-dialog');
document.querySelector('#open-contact').addEventListener('click',()=>contactDialog.showModal());
document.querySelector('#close-contact').addEventListener('click',()=>contactDialog.close());
contactDialog.addEventListener('click',e=>{const r=contactDialog.getBoundingClientRect();if(e.target===contactDialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))contactDialog.close();});
const motion = document.querySelector('#motion-toggle');
const status = document.querySelector('#result-status');
let category = 'all';
let view = features.panorama && new URL(location.href).searchParams.get('view') === 'sphere' ? 'sphere' : 'grid';
document.querySelector('.view-toggle').hidden = !features.panorama;

function openProject(project) {
  document.querySelector('#preview-title').textContent = project.title;
  document.querySelector('#preview-index').textContent = '';
  document.querySelector('#preview-meta').textContent=project.meta;
  document.querySelector('#preview-description').textContent=project.detail;
  sphere?.setActive(false);
  dialog.showModal();
}

const sphere = features.panorama ? new ProjectSphere(document.querySelector('#sphere-stage'), openProject) : null;
function updateMotion() {
  if (!sphere) return;
  motion.hidden = sphere.reduced.matches;
  motion.textContent = sphere.paused ? 'Вращать' : 'Пауза';
  motion.setAttribute('aria-pressed', String(sphere.paused));
  motion.setAttribute('aria-label', sphere.paused ? 'Включить автоматическое вращение' : 'Приостановить автоматическое вращение');
}
if (sphere) sphere.onMotionChange = updateMotion;
motion.addEventListener('click', () => { if (!sphere) return; sphere.setPaused(!sphere.paused); updateMotion(); });
document.querySelector('#close-preview').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => {
  const r = dialog.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('close', () => sphere?.setActive(view === 'sphere'));

function renderProjects() {
  const selected = projects.filter(p => category === 'all' || p.category === category);
  grid.replaceChildren(...selected.map(project => {
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'project-card';
    card.setAttribute('aria-label', project.title);
    const cover = document.createElement('span');
    cover.className = 'project-cover'; cover.setAttribute('aria-hidden','true');
    const caption = document.createElement('span');
    caption.className='project-caption';
    const title=document.createElement('span');title.className='project-title';title.textContent=project.title;
    const heading=document.createElement('span');heading.className='project-heading';heading.append(title);
    if(project.year){const date=document.createElement('span');date.className='project-date';date.textContent=project.year;heading.append(date);}
    const description=document.createElement('span');description.className='project-description';description.textContent=project.description;
    caption.append(heading,description);
    card.append(cover, caption); card.addEventListener('click', () => openProject(project));
    return card;
  }));
  if(!selected.length){const empty=document.createElement('p');empty.className='meta';empty.textContent='Публикации появятся здесь.';grid.append(empty);}
  sphere?.setProjects(selected);
  status.textContent = `Карточек: ${selected.length}. Режим: ${view === 'grid' ? 'сетка' : 'панорама'}.`;
}

function setView(next, updateURL = true) {
  view = features.panorama ? next : 'grid';
  grid.hidden = view !== 'grid'; panel.hidden = view !== 'sphere';
  grid.classList.toggle('reveal', view === 'grid');
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  sphere?.setActive(view === 'sphere');
  if (updateURL) {
    const url = new URL(location.href);
    if (view === 'sphere') url.searchParams.set('view', 'sphere'); else url.searchParams.delete('view');
    history.replaceState(null, '', url);
  }
  status.textContent = `Режим: ${view === 'grid' ? 'сетка' : 'панорама'}.`;
}

const filterBar=document.querySelector('.filters');
function positionFilterIndicator(){
  const active=filterBar.querySelector('[aria-selected=true]');
  filterBar.style.setProperty('--tab-x',`${active.offsetLeft}px`);
  filterBar.style.setProperty('--tab-width',`${active.offsetWidth}px`);
}
new ResizeObserver(positionFilterIndicator).observe(filterBar);
document.fonts.ready.then(positionFilterIndicator);
let filterAnimation;
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  if(category===button.dataset.filter)return;
  category = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b => {b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1;});
  document.querySelector('#work-panel').setAttribute('aria-labelledby',button.id);
  positionFilterIndicator();
  renderProjects();
  filterAnimation?.cancel();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)filterAnimation=grid.animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
renderProjects(); updateMotion(); setView(view, !features.panorama);

const themeChoices=document.querySelectorAll('[data-theme-choice]');
function updateThemeButtons(){
  const theme=document.documentElement.dataset.theme||'light';
  themeChoices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));
}
let themeTransition,themeSequence=0;
function applyTheme(next){
  document.documentElement.dataset.theme=next;
  try{localStorage.setItem('portfolio-theme',next);}catch{}
  updateThemeButtons();
  document.dispatchEvent(new Event('portfolio:theme'));
}
themeChoices.forEach(button=>button.addEventListener('click',async()=>{
  const next=button.dataset.themeChoice;
  if(next===(document.documentElement.dataset.theme||'light'))return;
  const sequence=++themeSequence;
  themeTransition?.skipTransition();
  if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){applyTheme(next);return;}
  const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  const root=document.documentElement;
  root.style.setProperty('--wave-x',`${x}px`);root.style.setProperty('--wave-y',`${y}px`);
  root.dataset.themeWave='active';
  try{
    themeTransition=document.startViewTransition(()=>applyTheme(next));
    await themeTransition.ready;
    await root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]},
      {duration:480,easing:'cubic-bezier(.25,.7,.3,1)',fill:'forwards',pseudoElement:'::view-transition-new(root)'}).finished;
    await themeTransition.finished;
  }catch{if(sequence===themeSequence)applyTheme(next);}
  finally{if(sequence===themeSequence){delete root.dataset.themeWave;themeTransition=null;}}
}));
updateThemeButtons();

// Move the same controls across the breakpoint, preserving focus, state and handlers.
const mobileLayout=matchMedia('(max-width:640px)');
const contactButton=document.querySelector('#open-contact');
const contactAnchor=document.createComment('desktop contact position');
contactButton.before(contactAnchor);
const themeSwitch=document.querySelector('.theme-switch');
const themeAnchor=document.createComment('desktop theme position');
themeSwitch.before(themeAnchor);
function placeResponsiveControls(){
  if(mobileLayout.matches){
    document.querySelector('.mobile-contact-slot').append(contactButton);
    document.querySelector('.mobile-theme-slot').append(themeSwitch);
  }else{
    contactAnchor.after(contactButton);themeAnchor.after(themeSwitch);
  }
  positionFilterIndicator();
}
mobileLayout.addEventListener('change',placeResponsiveControls);
placeResponsiveControls();

document.documentElement.dataset.appReady='true';
document.dispatchEvent(new Event('portfolio:ready'));

document.querySelector('.filters').addEventListener('keydown',e=>{
  const tabs=[...document.querySelectorAll('[data-filter]')];let i=tabs.indexOf(document.activeElement);
  if(i<0)return;
  if(e.key==='ArrowRight')i=(i+1)%tabs.length;
  else if(e.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;
  else if(e.key==='Home')i=0;
  else if(e.key==='End')i=tabs.length-1;
  else return;
  e.preventDefault();tabs[i].focus();tabs[i].click();
});
