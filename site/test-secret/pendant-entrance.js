import {entranceFrame} from './entrance-motion.js?v=permission26';

export class PendantEntrance {
  constructor(pendant){
    this.p=pendant;this.el=document.querySelector('.site-loader');this.active=Boolean(this.el&&document.documentElement.classList.contains('is-loading'));
    if(!this.active)return;
    this.started=performance.now();this.readyAt=null;this.pageReady=false;this.fontProgress=0;this.pageProgress=0;this.displayed=[0,0,0];
    Promise.all([document.fonts.load('16px Werkzeug'),document.fonts.load('14px "IBM Plex Sans"')].map(task=>task.then(()=>{this.fontProgress+=.5;}))).then(()=>document.fonts.ready).then(()=>{this.fontProgress=1;});
    const appReady=document.documentElement.dataset.appReady==='true'?Promise.resolve():new Promise(resolve=>document.addEventListener('portfolio:ready',resolve,{once:true}));
    appReady.then(async()=>{
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('.layout img:not(.pendant-poster)')].map(img=>img.decode?.().catch(()=>{})));
      this.pageProgress=1;this.pageReady=true;pendant.wake();
    });
    this.watchdog=setTimeout(()=>this.finish(),11000);
  }
  mount(){
    if(!this.active)return;
    const p=this.p;
    this.previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    document.querySelector('.layout').inert=true;
    this.el.querySelector('[data-loader-slot]').append(p.host);p.overlay.attach(this.el);
    p.hitSurface.hidden=true;p.overlay.layer.style.visibility='';
    for(const part of [p.cord.mesh,p.cord.knot,p.cord.tail,p.attachmentEye])part.visible=false;
    this.el.dataset.webgl='true';
  }
  tick(dt,reduced){
    const p=this.p,elapsed=(performance.now()-this.started)/1000;
    const targets=[this.fontProgress,(p.character.loaded||0)/p.character.totalTextures,this.pageProgress];
    targets.forEach((target,i)=>{this.displayed[i]=Math.min(target,this.displayed[i]+dt*.6);});
    const progress=this.displayed.reduce((sum,x)=>sum+x,0)/3;
    const bar=this.el.querySelector('.loader-progress');
    bar.setAttribute('aria-valuenow',String(Math.round(targets.reduce((sum,x)=>sum+x,0)/3*100)));
    bar.querySelectorAll('i').forEach((segment,i)=>segment.classList.toggle('filled',progress>=(i+1)/5-.001));
    if(p.ready&&this.pageReady&&this.fontProgress===1&&this.displayed.every(x=>x>=1)&&this.readyAt===null)this.readyAt=elapsed;
    let f=entranceFrame(elapsed,this.readyAt,reduced,this.permissionPending);
    if(f.phase==='exit'&&!this.permissionHandled){
      this.permissionHandled=true;
      if(!reduced&&matchMedia('(max-width:640px)').matches&&isSecureContext&&window.DeviceOrientationEvent){
        this.askTiltPermission();
        f=entranceFrame(elapsed,this.readyAt,reduced,true);
      }
    }
    this.el.dataset.phase=f.phase;this.el.style.opacity=f.opacity;
    p.pivot.position.y=0;p.pivot.rotation.set(0,0,0);
    p.body.position.y=.55;p.body.rotation.set(0,0,0);
    p.character.root.visible=false;
    p.scene.updateMatrixWorld();p.renderer.render(p.scene,p.camera);
    if(f.done){this.finish();return;}
    if(!document.hidden&&!this.permissionPending)p.frame=requestAnimationFrame(t=>p.tick(t));
  }
  askTiltPermission(){
    this.permissionPending=true;
    // Loading is complete. User choice must not be bypassed by a boot watchdog.
    clearTimeout(this.watchdog);clearTimeout(window.portfolioBootTimeout);
    // Try the native prompt directly. Safari may require the next real touch;
    // in that case reveal the page and arm one gesture, with no custom prompt UI.
    this.p.requestTiltOnEntry().finally(()=>{
      if(!this.active)return;
      this.permissionPending=false;
      this.readyAt=(performance.now()-this.started)/1000;
      this.p.wake();
    });
  }

  finish(){
    if(!this.active)return;
    this.active=false;clearTimeout(this.watchdog);clearTimeout(window.portfolioBootTimeout);
    const p=this.p;
    p.returnAnchor.after(p.host);p.overlay?.attach();
    if(p.character){p.character.root.visible=p.ready;p.character.interruptIdle();}
    for(const part of [p.cord?.mesh,p.cord?.knot,p.cord?.tail,p.attachmentEye])if(part)part.visible=true;
    if(p.hitSurface)p.hitSurface.hidden=false;
    document.querySelector('.layout').inert=false;
    document.body.style.overflow=this.previousOverflow||'';
    document.documentElement.classList.remove('is-loading');this.el.remove();
    if(!p.failed){
      p.arrival={offset:0,velocity:0};p.state.angle=0;p.state.velocity=0;
      p.motion.twist.angle=0;p.motion.twist.velocity=0;p.snapCord=true;p.resize();
      // Render the settled home pose before fading it in; no second drop after boot.
      p.overlay.layer.animate([{opacity:0},{opacity:1}],{duration:p.reduced.matches?0:600,easing:'ease-out'});
    }
    for(const element of document.querySelectorAll('.layout,.theme-switch,.mobile-topbar')){
      element.animate([{opacity:0},{opacity:1}],{duration:p.reduced.matches?0:600,easing:'ease-out'});
    }
  }
}
