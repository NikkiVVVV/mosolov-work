export const COUNTER_ID=113296360;
export const GOAL_ID='portfolio_action';
const actions=new Set(['filter_change','project_open','contact_open','contact_link','resume_download','experience_open','theme_change','language_change','pendant_open','pendant_close','pendant_drag','pendant_shape','pendant_color','pendant_apply','game_start','game_over','video_play','video_complete']);
const fields=['filter','project_id','destination','format','theme','language','shape','color','direction','source'];

// Separate from /paket/'s bindings; reuse the same counter without changing that site.
export function createAnalytics({window,document,location,now=Date.now}){
  const enabled=['mosolov.work','www.mosolov.work'].includes(location.hostname);
  const recent=new Map();
  if(enabled){
    window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments);};
    window.ym.l=now();document.documentElement.dataset.analytics='loading';
    document.addEventListener(`yacounter${COUNTER_ID}inited`,()=>{document.documentElement.dataset.analytics='ready';},{once:true});
    try{window.ym(COUNTER_ID,'init',{triggerEvent:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false,ecommerce:false,disableYtm:true,params:{project:'portfolio'}});}catch{}
    const script=document.createElement('script');script.async=true;
    script.src=`https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`;
    script.onerror=()=>{document.documentElement.dataset.analytics='unavailable';};
    document.head.append(script);
  }else document.documentElement.dataset.analytics='disabled';
  return {
    track(action,details={}){
      if(!enabled||!actions.has(action))return false;
      const params={project:'portfolio',action};
      for(const key of fields)if(typeof details[key]==='string')params[key]=details[key].slice(0,64);
      if(Number.isFinite(details.score))params.score=Math.max(0,Math.min(100000,Math.round(details.score)));
      const key=JSON.stringify(params),time=now();
      if(recent.has(key)&&time-recent.get(key)<500)return false;
      recent.set(key,time);
      if(recent.size>100)recent.delete(recent.keys().next().value);
      try{window.ym(COUNTER_ID,'reachGoal',GOAL_ID,params);return true;}catch{return false;}
    },
  };
}
const analytics=typeof window==='undefined'?null:createAnalytics({window,document,location});
export const track=(action,details)=>analytics?.track(action,details)||false;

export function bindAnalytics(){
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('a,button');if(!target)return;
    if(target.id==='open-contact')track('contact_open');
    else if(target.matches('.contact-links a'))track('contact_link',{destination:target.querySelector('.contact-label').textContent.toLowerCase()});
    else if(target.matches('.resume-download'))track('resume_download',{format:target.download.endsWith('.pdf')?'pdf':'md'});
    else if(target.matches('.current-project-link'))track('project_open',{project_id:target.id.replace('current-','').replace('-link',''),source:'profile'});
    else if(target.matches('.project-link'))track('project_open',{project_id:target.closest('.project-card').dataset.projectId,source:'feed'});
    else if(target.matches('[data-shape]'))track('pendant_shape',{shape:target.dataset.shape});
    else if(target.matches('[data-color]'))track('pendant_color',{color:target.dataset.color});
    else if(target.matches('.pendant-config [data-apply]')){
      const dialog=target.closest('dialog');
      track('pendant_apply',{shape:dialog.querySelector('[data-shape][aria-pressed=true]').dataset.shape,color:dialog.querySelector('[data-color][aria-pressed=true]').dataset.color});
    }else if(target.matches('.pendant-config [data-close],.pendant-config [data-dismiss]'))track('pendant_close');
  });
  document.querySelector('.experience').addEventListener('toggle',event=>{if(event.target.open)track('experience_open');});
}
