// One counter for all projects. This script never blocks a site's own interactions.
(()=>{
  const id=113296360,root=document.documentElement;
  const project=root.dataset.analyticsProject||location.pathname.split('/').filter(Boolean)[0]||'home';
  const enabled=['mosolov.work','www.mosolov.work'].includes(location.hostname);
  const allowed=new Set(['photo_open','photo_flip','environment_change','bag_interact','telegram_click','outbound_click','section_view','telegram_redirect']);
  const recent=new Map();
  function track(name,details={},callback){
    if(!enabled||!allowed.has(name))return false;
    const params={project};
    for(const key of ['photo','face','environment','section','link'])if(typeof details[key]==='string')params[key]=details[key].slice(0,100);
    const key=name+JSON.stringify(params),now=Date.now();
    if(now-(recent.get(key)||0)<1100)return false;
    recent.set(key,now);
    try{window.ym(id,'reachGoal',name,params,callback);return true;}catch{return false;}
  }
  window.siteAnalytics={track};
  if(!enabled)return;
  window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments);};window.ym.l=Date.now();
  root.dataset.analytics='loading';
  document.addEventListener('yacounter'+id+'inited',()=>{root.dataset.analytics='ready';},{once:true});
  window.ym(id,'init',{triggerEvent:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false,ecommerce:false,disableYtm:true,params:{project}});
  const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js?id='+id;script.onerror=()=>{root.dataset.analytics='unavailable';};document.head.append(script);
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');if(!link)return;
    const url=new URL(link.href,location.href);
    if(!['http:','https:'].includes(url.protocol)||url.origin===location.origin)return;
    track(url.hostname==='t.me'?'telegram_click':'outbound_click',{link:url.hostname+url.pathname});
  });
  const seen=new Set();
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        const section=entry.target.closest('section')?.id||(entry.target.closest('footer')?'footer':null);
        if(section&&!seen.has(section)){seen.add(section);track('section_view',{section});observer.unobserve(entry.target);}
      }
    },{threshold:.5});
    function observe(){
      document.querySelectorAll('#story h2,#album .photo-card:first-child,.site-footer').forEach(el=>observer.observe(el));
    }
    observe();window.addEventListener('site-sections-ready',observe,{once:true});
  }
  const redirect=root.dataset.analyticsRedirect;
  if(redirect==='https://t.me/nikir_public'){
    let done=false;const finish=()=>{if(!done){done=true;location.replace(redirect);}};
    setTimeout(finish,600);track('telegram_redirect',{},finish);
  }
})();
