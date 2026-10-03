import {entranceFrame} from './entrance-motion.js?v=intro13';

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
    const f=entranceFrame(elapsed,this.readyAt,reduced);
    this.el.dataset.phase=f.phase;this.el.style.opacity=f.opacity;
    p.pivot.position.y=0;p.pivot.rotation.set(0,0,0);
    p.body.position.y=.55;p.body.rotation.set(0,0,0);
    p.character.root.visible=false;
    p.scene.updateMatrixWorld();p.renderer.render(p.scene,p.camera);
    if(f.done){this.finish();return;}
    if(!document.hidden)p.frame=requestAnimationFrame(t=>p.tick(t));
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
    if(!p.failed){p.arrival.offset=p.reduced.matches?0:8;p.state.angle=.12;p.motion.twist.angle=-.15;p.snapCord=true;p.resize();}
  }
}
