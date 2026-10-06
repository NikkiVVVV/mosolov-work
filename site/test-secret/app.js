import { createMobileMenu } from './mobile-menu.js?v=138';
import { createProfileFit } from './profile-fit.js?v=90';
import { createProjectBento } from './project-bento.js?v=138';
import { track, bindAnalytics } from './portfolio-analytics.js?v=63';
import { projects } from './projects.js?v=feed138';
import { createSpaceGame } from './space-game.js?v=86';
import { englishProjects } from './locale.js?v=feed138';
import { features } from './features.js';
import { createProjectVideos } from './project-videos.js?v=feed138';

const projectVideos = createProjectVideos();
const spaceGame = createSpaceGame();
bindAnalytics();
document.querySelector('#back-to-top').addEventListener('click',event=>{
  if(event.detail===0){
    // Keyboard/assistive activation moves focus; pointer activation only scrolls.
    const heading=document.querySelector('.profile-heading h1');
    heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
    heading.addEventListener('blur',()=>heading.removeAttribute('tabindex'),{once:true});
  }else{
    event.currentTarget.blur();
  }
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
});

const ProjectSphere = features.panorama ? (await import('./sphere.js')).ProjectSphere : null;

const grid = document.querySelector('#grid');
const bento = createProjectBento(grid);
const panel = document.querySelector('#sphere-panel');
const dialog = document.querySelector('#project-preview');
const contactDialog=document.querySelector('#contact-dialog');
const contactMobile=()=>matchMedia('(max-width:640px), (hover:none) and (pointer:coarse) and (max-height:640px)').matches;
const contactReduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
let contactClosing=false,contactDrag=null,contactOverflow=null;
function closeContact(){
  if(!contactDialog.open||contactClosing)return;
  contactClosing=true;
  const from=getComputedStyle(contactDialog).transform;
  contactDialog.getAnimations().forEach(animation=>animation.cancel());
  if(contactMobile()&&!contactReduced()){
    contactDialog.animate([{transform:from==='none'?'translateY(0)':from},{transform:'translateY(100%)'}],{duration:220,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}).finished.then(()=>contactDialog.close()).catch(()=>{});
  }else contactDialog.close();
}
document.querySelector('#open-contact').addEventListener('click',()=>{
  contactClosing=false;contactDialog.style.transform='';
  contactOverflow=[document.documentElement.style.overflow,document.body.style.overflow];
  document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  contactDialog.showModal();
});
document.querySelector('#close-contact').addEventListener('click',closeContact);
contactDialog.addEventListener('cancel',e=>{e.preventDefault();closeContact();});
contactDialog.addEventListener('close',()=>{
  contactDialog.getAnimations().forEach(animation=>animation.cancel());
  contactDialog.style.transform='';contactDrag=null;contactClosing=false;
  if(contactOverflow){[document.documentElement.style.overflow,document.body.style.overflow]=contactOverflow;contactOverflow=null;}
});
contactDialog.addEventListener('click',e=>{const r=contactDialog.getBoundingClientRect();if(e.target===contactDialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))closeContact();});
contactDialog.addEventListener('pointerdown',e=>{
  if(!contactMobile()||contactClosing||e.button!==0||e.target.closest('button,a')||!e.target.closest('.contact-grabber,.dialog-header'))return;
  contactDialog.getAnimations().forEach(animation=>animation.cancel());
  contactDrag={id:e.pointerId,y:e.clientY,offset:0};contactDialog.setPointerCapture(e.pointerId);
});
contactDialog.addEventListener('pointermove',e=>{
  if(!contactDrag||e.pointerId!==contactDrag.id)return;
  contactDrag.offset=Math.max(0,e.clientY-contactDrag.y);
  contactDialog.style.transform=`translateY(${contactDrag.offset}px)`;
});
function releaseContact(e){
  if(!contactDrag||e.pointerId!==contactDrag.id)return;
  const offset=contactDrag.offset;contactDrag=null;
  if(contactDialog.hasPointerCapture(e.pointerId))contactDialog.releasePointerCapture(e.pointerId);
  if(e.type==='pointerup'&&offset>64){closeContact();return;}
  contactDialog.style.transform='';
  if(!contactReduced())contactDialog.animate([{transform:`translateY(${offset}px)`},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
}
contactDialog.addEventListener('pointerup',releaseContact);
contactDialog.addEventListener('pointercancel',releaseContact);
contactDialog.addEventListener('lostpointercapture',releaseContact);
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
  spaceGame.pause();spaceGame.setLanguage(language);
  const selected = projects.filter(p => !p.hidden && (p.alwaysVisible || category === 'all' || p.category === category)).map(p=>language==='en'?{...p,...(p.game?{title:'Token game'}:englishProjects[p.id])}:p);
  grid.replaceChildren(...selected.map(project => {
    const card = document.createElement('article');
    card.className = 'project-card';
    if(project.wide || project.game)card.classList.add('project-card-wide');
    card.dataset.projectId=project.id;
    card.setAttribute('aria-label', project.title);
    const cover = document.createElement('div');
    cover.className = 'project-cover';
    cover.style.aspectRatio=project.coverRatio||(project.video?`${project.videoWidth}/${project.videoHeight}`:'4/3');
    if(project.game){
      cover.style.removeProperty('aspect-ratio');
      cover.classList.add('space-game-cover');cover.append(spaceGame.element);
    }else if(project.video){
      cover.classList.add('has-video');
      cover.append(projectVideos.attach(project,card));
    }else if(project.image){
      const image=document.createElement('img');
      image.src=project.image;image.alt=project.imageAlt||project.title;image.loading='lazy';
      cover.append(image);
    }
    if(project.href){
      const link=document.createElement('a');
      link.className='project-link';link.href=project.href;link.target='_blank';link.rel='noopener noreferrer';
      link.setAttribute('aria-label',language==='en'?`Open ${project.title}`:`Открыть «${project.title}»`);
      link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
      cover.append(link);
    }
    card.append(cover);
    // Captions are shown only when explicitly requested for the card.
    if(project.description && project.showDescription===true){
      const description=document.createElement('p');
      description.className='project-description';description.textContent=project.description;
      card.append(description);
    }
    if(project.mobileDescription){
      const description=document.createElement('p');
      description.className='project-description project-description-mobile';
      description.textContent=project.mobileDescription;card.append(description);
    }
    return card;
  }));
  bento.refresh();
  projectVideos.sync();
  sphere?.setProjects(selected);
  status.textContent = language==='en'?`Projects: ${selected.length}.`:`Карточек: ${selected.length}.`;
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
  track('filter_change',{filter:category});
  document.querySelectorAll('[data-filter]').forEach(b => {b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1;});
  document.querySelector('#work-panel').setAttribute('aria-labelledby',button.id);
  positionFilterIndicator();
  renderProjects();
  filterAnimation?.cancel();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)filterAnimation=grid.animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
updateMotion(); setView(view, !features.panorama);

const themeButton=document.querySelector('#theme-toggle');
const languageButton=document.querySelector('#language-toggle');
let language='ru';
try{language=localStorage.getItem('portfolio-language')==='en'?'en':'ru';}catch{}
function updateThemeButtons(){
  const dark=document.documentElement.dataset.theme==='dark';
  const label=language==='en'?(dark?'Switch to light theme':'Switch to dark theme'):(dark?'Включить светлую тему':'Включить тёмную тему');
  themeButton.setAttribute('aria-label',label);themeButton.title=label;
}
let themeTransition,themeSequence=0;
function applyTheme(next){
  document.documentElement.dataset.theme=next;
  updateThemeButtons();
  document.dispatchEvent(new Event('portfolio:theme'));
}
themeButton.addEventListener('click',async()=>{
  const menuTheme=document.querySelector('[data-menu-theme]');
  const button=menuTheme?.getClientRects().length?menuTheme:themeButton;
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  track('theme_change',{theme:next});
  const sequence=++themeSequence;
  themeTransition?.skipTransition();
  if(document.querySelector('.mobile-menu')?.dataset.open==='true'||!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){applyTheme(next);return;}
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
});
updateThemeButtons();


const translatedNodes=[
  ['h1','Nikita Mosolov'],
  ['#current-avito','Avito'],
  ['#current-avito-team','[Auto]'],['#current-mazik','Mazik'],['#current-radar','Idea Radar'],
  ['#current-mazik-type','[mini app]'],['#current-radar-type','[service]'],
  ['#experience-title','Experience & projects'],['#resume-pdf-label','Resume PDF'],['#resume-md-label','Resume MD'],
  ['.skip-link','View projects'],
  ['#workplaces-title','Workplaces'],
  ['#tab-all','All'],['#tab-work','Work'],['#tab-pet','Side projects'],['#tab-publication','Publications'],
  ['#open-contact','Contact'],['#contact-title','Contact'],['#close-preview','Close ×'],
].map(([selector,en])=>{const element=document.querySelector(selector);return {element,en,ru:element.textContent};});
const translatedLabels=[
  ['#current-mazik-link','Visit Mazik'],['#current-avito-link','Visit the Avito project'],['#current-radar-link','Visit idea radar'],
  ['.current-projects','Current projects'],['.profile','About me'],['#portfolio','Projects'],['.filters','Project category'],
  ['.theme-switch','Theme, language and bookmarks'],['#bookmarks-link','Favorite bookmarks — opens in a new tab'],['.mobile-topbar','Menu and contact'],
  ['#close-contact','Close contacts'],['#close-preview','Close'],['.contact-links','Contact Nikita'],
].map(([selector,en])=>{const element=document.querySelector(selector);return {element,en,ru:element.getAttribute('aria-label')};});
const teamNames=[...document.querySelectorAll('.workplace-team')].map(element=>({element,ru:element.textContent,en:({'[Онлайн]':'[Online]','[Друг]':'[Drug]'})[element.textContent]||element.textContent}));
const companyNames=[...document.querySelectorAll('.workplaces li>span:first-child')].map(element=>({element,ru:element.textContent,en:({'Сбер':'Sber','Авито':'Avito'})[element.textContent]||element.textContent}));
function applyLanguage(){
  document.documentElement.lang=language;
  document.querySelector('#footer-channel-label').textContent=language==='en'?'Telegram channel':'Telegram-канал';
  document.querySelector('#footer-top-label').textContent=language==='en'?'Back to top':'Наверх';
  document.title=(language==='en'?'Nikita Mosolov':'Никита Мосолов')+' — Design Engineer';
  [...translatedNodes,...teamNames,...companyNames].forEach(item=>item.element.textContent=item[language]);
  const intro=document.querySelector('.profile-heading p');
  if(language==='ru'){
    const lineBreak=document.createElement('br');lineBreak.className='mobile-copy-break';
    intro.replaceChildren('Design Engineer. Создаю эмоциональные',lineBreak,' цифровые продукты.');
  }else intro.textContent='Design Engineer. I create digital products that evoke emotion.';
  translatedLabels.forEach(item=>item.element.setAttribute('aria-label',item[language]));
  languageButton.querySelector('span').textContent=language==='ru'?'EN':'RU';
  languageButton.title=language==='ru'?'Switch to English':'Переключить на русский';
  languageButton.setAttribute('aria-label',languageButton.title);
  updateThemeButtons();renderProjects();positionFilterIndicator();
  document.dispatchEvent(new Event('portfolio:language'));
}
languageButton.addEventListener('click',()=>{
  language=language==='ru'?'en':'ru';
  track('language_change',{language});
  try{localStorage.setItem('portfolio-language',language);}catch{}
  applyLanguage();
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
    languageButton.querySelector('span').animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});
  }
});
applyLanguage();

// Move the same controls across the breakpoint, preserving focus, state and handlers.
const mobileLayout=matchMedia('(max-width:640px), (hover:none) and (pointer:coarse) and (max-height:640px)');
const contactButton=document.querySelector('#open-contact');
const contactAnchor=document.createComment('desktop contact position');
contactButton.before(contactAnchor);
const themeSwitch=document.querySelector('.theme-switch');
function placeResponsiveControls(){
  if(mobileLayout.matches){
    document.querySelector('.mobile-contact-slot').append(contactButton);
    document.querySelector('.mobile-theme-slot').append(themeSwitch);
  }else{
    contactAnchor.after(contactButton);document.querySelector('.profile').append(themeSwitch);
  }
  syncProfileHeight();positionFilterIndicator();
}
const profile=document.querySelector('.profile');
const syncProfileHeight=createProfileFit(profile,mobileLayout);
mobileLayout.addEventListener('change',placeResponsiveControls);
placeResponsiveControls();
createMobileMenu(document.querySelector('.mobile-menu'),mobileLayout);

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
