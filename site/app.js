import {prepareMedia,animateExperience,createCaseReveal} from './ui-reveal.js?v=167';
import { createMobileMenu } from './mobile-menu.js?v=196';
import { createProfileFit } from './profile-fit.js?v=90';
import { createProjectBento } from './project-bento.js?v=200';
import { track, bindAnalytics } from './portfolio-analytics.js?v=63';
import { projects } from './projects.js?v=hse218';
import { createSpaceGame } from './space-game.js?v=86';
import { englishProjects } from './locale.js?v=hse218';
import { features } from './features.js';
import { createProjectVideos } from './project-videos.js?v=feed168';

const projectVideos = createProjectVideos();
const spaceGame = createSpaceGame();
bindAnalytics();

const ProjectSphere = features.panorama ? (await import('./sphere.js')).ProjectSphere : null;

const grid = document.querySelector('#grid');
const bento = createProjectBento(grid);
const panel = document.querySelector('#sphere-panel');
const dialog = document.querySelector('#project-preview');
const contactDialog=document.querySelector('#contact-dialog');
const contactMobile=()=>matchMedia('(max-width:640px), (hover:none) and (pointer:coarse) and (max-height:640px)').matches;
const contactReduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const contactMenuButton=document.querySelector('#open-contact');
const contactBackdrop=document.querySelector('#contact-menu-backdrop');
let contactOpen=false;
function placeContact(){
 const rect=contactMenuButton.getBoundingClientRect();
 contactDialog.style.top=`${rect.bottom+12}px`;
 contactDialog.style.right=`${Math.max(20,innerWidth-rect.right)}px`;
}
function closeContact(focus=false){
 contactOpen=false;contactDialog.dataset.open='false';contactDialog.inert=true;
 contactBackdrop.dataset.open='false';contactMenuButton.setAttribute('aria-expanded','false');
 if(focus)contactMenuButton.focus({preventScroll:true});
}
contactMenuButton.setAttribute('aria-haspopup','menu');contactMenuButton.setAttribute('aria-controls','contact-dialog');contactMenuButton.setAttribute('aria-expanded','false');
contactMenuButton.addEventListener('click',()=>{
 if(contactOpen){closeContact();return;}
 const menu=document.querySelector('.mobile-menu');
 if(menu?.dataset.open==='true')document.querySelector('#mobile-menu-toggle').click();
 placeContact();contactOpen=true;contactDialog.dataset.open='true';contactDialog.inert=false;
 contactBackdrop.dataset.open='true';contactMenuButton.setAttribute('aria-expanded','true');
});
contactBackdrop.addEventListener('click',()=>closeContact(true));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&contactOpen){closeContact(true);e.preventDefault();}});
contactDialog.addEventListener('click',e=>{if(e.target.closest('a'))closeContact();});
document.querySelector('#mobile-menu-toggle').addEventListener('click',()=>closeContact());
window.addEventListener('resize',()=>{if(contactOpen)placeContact();});
window.addEventListener('scroll',()=>{if(contactOpen)placeContact();},{passive:true});
closeContact();
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

const revealCase=createCaseReveal();
animateExperience(document.querySelector('.experience'));

function renderProjects() {
  spaceGame.pause();spaceGame.setLanguage(language);
  const selected = projects.filter(p => !p.hidden && (category === 'all' ? !p.filterOnly : (!p.homeOnly && p.category === category))).map(p=>language==='en'?{...p,...(p.game?{title:'Token game'}:englishProjects[p.id])}:p);
  grid.replaceChildren(...selected.map(project => {
    const card = document.createElement('article');
    card.className = 'project-card';
    if(project.wide || project.game)card.classList.add('project-card-wide');
    card.dataset.projectId=project.id;card.id='project-'+project.id;
    const heading=document.createElement('h2');heading.className='sr-only';heading.textContent=project.title;card.append(heading);
    card.setAttribute('aria-label', project.title);
    const cover = document.createElement('div');
    cover.className = 'project-cover';
    cover.style.aspectRatio=project.coverRatio||(project.video?`${project.videoWidth}/${project.videoHeight}`:'4/3');
    if(project.game){
      cover.style.removeProperty('aspect-ratio');
      cover.classList.add('space-game-cover');cover.append(spaceGame.element);
    }else if(project.video){
      cover.classList.add('has-video');
      const video=projectVideos.attach(project,card);
      prepareMedia(cover,video,project.poster);cover.append(video);
    }else if(project.image){
      const image=document.createElement('img');
      image.src=project.image;image.alt=project.imageAlt||project.title;image.loading='lazy';
      prepareMedia(cover,image);cover.append(image);
    }
    if(project.href){
      const link=document.createElement('a');
      link.className='project-link';link.href=contactMobile()&&project.mobileHref?project.mobileHref:project.href;link.target='_blank';link.rel='noopener noreferrer';
      if(project.mobileHref)link.addEventListener('click',()=>{link.href=contactMobile()?project.mobileHref:project.href;});
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
    if(!project.showDescription){const copy=document.createElement('p');copy.className='sr-only';copy.textContent=project.description||project.mobileDescription||project.detail||project.title;card.append(copy);}
    if(project.mobileDescription){
      const description=document.createElement('p');
      description.className='project-description project-description-mobile';
      description.textContent=project.mobileDescription;card.append(description);
    }
    revealCase(card);return card;
  }));
  bento.refresh(category);
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
  ['#experience-title','Experience & projects'],
  ['.skip-link','View projects'],
  ['#workplaces-title','Workplaces'],
  ['#tab-all','All'],['#tab-work','Work'],['#tab-pet','Side projects'],['#tab-publication','Sharing experience'],
  ['#open-contact','Contact'],['#contact-title','Contact'],['#close-preview','Close ×'],
].map(([selector,en])=>{const element=document.querySelector(selector);return {element,en,ru:element.textContent};});
const translatedLabels=[
  ['#current-mazik-link','Visit Mazik'],['#current-radar-link','Visit idea radar'],
  ['.current-projects','Current projects'],['.profile','About me'],['#portfolio','Projects'],['.filters','Project category'],
  ['.theme-switch','Theme, language and bookmarks'],['#bookmarks-link','Favorite bookmarks — opens in a new tab'],['.mobile-topbar','Menu and contact'],
  ['#close-preview','Close'],['#contact-dialog','Contact Nikita'],
].map(([selector,en])=>{const element=document.querySelector(selector);return {element,en,ru:element.getAttribute('aria-label')};});
const teamNames=[...document.querySelectorAll('.workplace-team')].map(element=>({element,ru:element.textContent,en:({'[Онлайн]':'[Online]','[Друг]':'[Drug]'})[element.textContent]||element.textContent}));
const companyNames=[...document.querySelectorAll('.workplaces li>span:first-child')].map(element=>({element,ru:element.textContent,en:({'Сбер':'Sber','Авито':'Avito'})[element.textContent]||element.textContent}));
function applyLanguage(){
  document.documentElement.lang=language;
  document.querySelector('#footer-channel-label').textContent=language==='en'?'telegram channel':'канал в тг';
  document.querySelector('#footer-top-label').textContent=language==='en'?'message me':'написать';
  document.title='Nikita Mosolov — Design Engineer';
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

// One gentle mobile hint, three seconds after the entrance has finished.
{
 const experience=document.querySelector('.experience');
 let interacted=false;
 experience.querySelector('summary').addEventListener('pointerdown',()=>{interacted=true;experience.classList.remove('experience-hint')},{once:true});
 experience.addEventListener('toggle',()=>experience.classList.remove('experience-hint'));
 const start=()=>setTimeout(()=>{
  if(interacted||experience.open||!contactMobile()||contactReduced())return;
  experience.classList.add('experience-hint');
  setTimeout(()=>experience.classList.remove('experience-hint'),1100);
 },3000);
 if(document.documentElement.classList.contains('is-loading')){
  const observer=new MutationObserver(()=>{
   if(!document.documentElement.classList.contains('is-loading')){observer.disconnect();start();}
  });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 }else start();
}
